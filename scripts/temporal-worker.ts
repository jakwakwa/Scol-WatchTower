import { Worker, NativeConnection } from "@temporalio/worker";
import * as activities from "../temporal/activities";

async function run() {
	console.log(
		`[Worker] Starting... DATABASE_URL present: ${!!process.env.DATABASE_URL}`,
	);
	console.log(
		`[Worker] Starting... ZAPIER_CATCH_HOOK_URL present: ${!!process.env.ZAPIER_CATCH_HOOK_URL}`,
	);

	// Worker needs NativeConnection
	const connection = await NativeConnection.connect({
		address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
	});

	const worker = await Worker.create({
		workflowsPath: require.resolve("../temporal/workflows"),
		activities,
		taskQueue: "onboarding-queue",
		connection,
	});

	console.log("Worker connection successfully established");
	console.log("Worker started on queue: onboarding-queue");

	await worker.run();
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
