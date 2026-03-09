const controllers = new Set<ReadableStreamDefaultController<Uint8Array>>();
const encoder = new TextEncoder();

export function addController(controller: ReadableStreamDefaultController<Uint8Array>) {
	controllers.add(controller);
}

export function removeController(controller: ReadableStreamDefaultController<Uint8Array>) {
	controllers.delete(controller);
}

export async function broadcast(event: { type: string; notificationId?: number }) {
	const data = `data: ${JSON.stringify(event)}\n\n`;
	for (const controller of controllers) {
		try {
			controller.enqueue(encoder.encode(data));
		} catch (_enqueueError) {
			// Controller is already closed; drop it from the active set
			controllers.delete(controller);
		}
	}
}
