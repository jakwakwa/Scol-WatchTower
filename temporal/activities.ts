import { getDatabaseClient } from "@/app/utils";
import { workflows } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function sendZapierWebhook(payload: any): Promise<void> {
	const { leadId, stage } = payload;
	console.log(
		`[Activity] Sending Zapier Webhook for Lead ${leadId} at Stage ${stage}`,
	);

	// TODO: Real implementation with fetch
	// const zapierUrl = process.env.ZAPIER_CATCH_HOOK_URL;
	// if (!zapierUrl) throw new Error('ZAPIER_CATCH_HOOK_URL not set');

	// await fetch(zapierUrl, {
	//   method: 'POST',
	//   body: JSON.stringify(payload),
	//   headers: { 'Content-Type': 'application/json' },
	// });

	// Simulate delay
	await new Promise((resolve) => setTimeout(resolve, 1000));
}

export async function updateDbStatus(
	workflowId: number,
	status: string,
	stage: number,
): Promise<void> {
	console.log(
		`[Activity] Updating DB for Workflow ${workflowId}: Status=${status}, Stage=${stage}`,
	);

	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Failed to get database client in activity");
	}

	// We need to cast status to the specific enum type if TypeScript complains,
	// or just pass it if the string matches.

	await db
		.update(workflows)
		.set({
			status: status as any,
			stage,
		})
		.where(eq(workflows.id, workflowId));
}
