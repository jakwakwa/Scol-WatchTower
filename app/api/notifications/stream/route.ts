import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { addController, removeController } from "@/lib/notification-broadcaster";

const encoder = new TextEncoder();
const STREAM_NAMESPACE = "[Notifications Stream]";

function safelyCloseController(
	controller: ReadableStreamDefaultController<Uint8Array>,
	context: string
) {
	try {
		controller.close();
	} catch (closeError) {
		console.warn(`${STREAM_NAMESPACE} close failed during ${context}`, closeError);
	}
}

export async function GET(request: NextRequest) {
	const { userId } = await auth();

	if (!userId) {
		return new Response("Unauthorized", { status: 401 });
	}

	// Hoisted so both start() and cancel() can access them
	let keepAliveInterval: ReturnType<typeof setInterval> | undefined;
	let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			streamController = controller;
			addController(controller);

			// Send a keep-alive comment every 15 seconds to prevent proxy timeouts
			keepAliveInterval = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(":\n\n"));
				} catch (_enqueueError) {
					// enqueue failed — the controller is dead; clean up fully
					if (keepAliveInterval !== undefined) {
						clearInterval(keepAliveInterval);
						keepAliveInterval = undefined;
					}
					removeController(controller);
					safelyCloseController(controller, "keep-alive enqueue failure");
				}
			}, 15000);

			// Cleanup when the request is aborted (client disconnects)
			request.signal.addEventListener("abort", () => {
				if (keepAliveInterval !== undefined) {
					clearInterval(keepAliveInterval);
					keepAliveInterval = undefined;
				}
				removeController(controller);
				safelyCloseController(controller, "request aborted");
			});
		},
		cancel() {
			// Called when the consumer cancels the stream; ensure full cleanup
			if (keepAliveInterval !== undefined) {
				clearInterval(keepAliveInterval);
				keepAliveInterval = undefined;
			}
			if (streamController) {
				removeController(streamController);
			}
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
			"X-Accel-Buffering": "no", // For nginx
		},
	});
}
