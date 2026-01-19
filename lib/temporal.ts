import { Connection, Client } from "@temporalio/client";

let client: Client | undefined;

export async function getTemporalClient() {
	if (client) return client;

	// Use a try-catch or ensure env is set, but for now standard connect
	const connection = await Connection.connect({
		address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
	});

	client = new Client({
		connection,
	});

	return client;
}
