import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema";

function sleep(milliseconds: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export async function waitForDatabaseReady(
	connectionString: string,
	options?: {
		attempts?: number;
		delayMs?: number;
		label?: string;
	}
): Promise<void> {
	const attempts = options?.attempts ?? 20;
	const delayMs = options?.delayMs ?? 1000;
	const label = options?.label ?? "Database";
	let lastError: unknown;

	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		const pool = new Pool({ connectionString, max: 1 });

		try {
			await pool.query("select 1");
			await pool.end();
			return;
		} catch (error) {
			lastError = error;
			await pool.end().catch(() => undefined);

			if (attempt < attempts) {
				await sleep(delayMs);
			}
		}
	}

	throw new Error(
		`${label} did not become ready after ${attempts} attempts${lastError instanceof Error ? `: ${lastError.message}` : ""}`
	);
}

export async function runMockDashboardSmokeChecks(connectionString: string): Promise<void> {
	const pool = new Pool({ connectionString });
	const db = drizzle(pool, { schema });

	try {
		const workflowRows = await db
			.select({
				id: schema.workflows.id,
				applicantId: schema.workflows.applicantId,
				stage: schema.workflows.stage,
				status: schema.workflows.status,
				startedAt: schema.workflows.startedAt,
				metadata: schema.workflows.metadata,
				clientName: schema.applicants.companyName,
				registrationNumber: schema.applicants.registrationNumber,
				mandateType: schema.applicants.mandateType,
				riskLevel: schema.applicants.riskLevel,
			})
			.from(schema.workflows)
			.leftJoin(schema.applicants, eq(schema.workflows.applicantId, schema.applicants.id))
			.orderBy(desc(schema.workflows.startedAt))
			.limit(20);

		const workflowNotifications = await db
			.select({
				id: schema.notifications.id,
				workflowId: schema.notifications.workflowId,
				applicantId: schema.notifications.applicantId,
				type: schema.notifications.type,
				message: schema.notifications.message,
				read: schema.notifications.read,
				actionable: schema.notifications.actionable,
				createdAt: schema.notifications.createdAt,
				clientName: schema.applicants.companyName,
			})
			.from(schema.notifications)
			.leftJoin(schema.workflows, eq(schema.notifications.workflowId, schema.workflows.id))
			.leftJoin(schema.applicants, eq(schema.workflows.applicantId, schema.applicants.id))
			.orderBy(desc(schema.notifications.createdAt))
			.limit(20);

		const applicantNotifications = await db
			.select({
				id: schema.notifications.id,
				workflowId: schema.notifications.workflowId,
				applicantId: schema.notifications.applicantId,
				type: schema.notifications.type,
				message: schema.notifications.message,
				read: schema.notifications.read,
				actionable: schema.notifications.actionable,
				createdAt: schema.notifications.createdAt,
				clientName: schema.applicants.companyName,
			})
			.from(schema.notifications)
			.leftJoin(schema.applicants, eq(schema.notifications.applicantId, schema.applicants.id))
			.orderBy(desc(schema.notifications.createdAt))
			.limit(20);

		if (workflowRows.length === 0) {
			throw new Error("Dashboard workflow smoke check returned no rows");
		}

		if (workflowNotifications.length === 0 || applicantNotifications.length === 0) {
			throw new Error("Dashboard notification smoke check returned no rows");
		}
	} finally {
		await pool.end();
	}
}