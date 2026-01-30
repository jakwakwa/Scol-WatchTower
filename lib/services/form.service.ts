import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { formInstances, formSubmissions } from "@/db/schema";
import type { FormType, FormInstanceStatus } from "@/lib/types";

interface CreateFormInstanceOptions {
	leadId: number;
	workflowId?: number;
	formType: FormType;
	expiresInDays?: number;
}

interface CreateFormInstanceResult {
	id: number;
	token: string;
}

const TOKEN_BYTES = 32;

export function hashToken(token: string) {
	return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createFormInstance(
	options: CreateFormInstanceOptions,
): Promise<CreateFormInstanceResult> {
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
	}

	const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
	const tokenHash = hashToken(token);
	const tokenPrefix = token.slice(0, 6);
	const expiresAt =
		options.expiresInDays !== undefined
			? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
			: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

	const [created] = await db
		.insert(formInstances)
		.values([
			{
				leadId: options.leadId,
				workflowId: options.workflowId,
				formType: options.formType,
				status: "sent",
				tokenHash,
				tokenPrefix,
				sentAt: new Date(),
				expiresAt,
				createdAt: new Date(),
			},
		])
		.returning();

	if (!created) {
		throw new Error("Failed to create form instance");
	}

	return { id: created.id, token };
}

export async function getFormInstanceByToken(token: string) {
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
	}

	const tokenHash = hashToken(token);
	const result = await db
		.select()
		.from(formInstances)
		.where(eq(formInstances.tokenHash, tokenHash));

	return result[0] ?? null;
}

export async function markFormInstanceStatus(
	formInstanceId: number,
	status: FormInstanceStatus,
) {
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
	}

	await db
		.update(formInstances)
		.set({
			status,
			viewedAt: status === "viewed" ? new Date() : undefined,
			submittedAt: status === "submitted" ? new Date() : undefined,
		})
		.where(eq(formInstances.id, formInstanceId));
}

export async function recordFormSubmission(options: {
	formInstanceId: number;
	leadId: number;
	workflowId?: number | null;
	formType: FormType;
	data: Record<string, unknown>;
	submittedBy?: string;
}) {
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
	}

	await db.insert(formSubmissions).values([
		{
			formInstanceId: options.formInstanceId,
			leadId: options.leadId,
			workflowId: options.workflowId ?? null,
			formType: options.formType,
			data: JSON.stringify(options.data),
			submittedBy: options.submittedBy,
			submittedAt: new Date(),
		},
	]);

	await markFormInstanceStatus(options.formInstanceId, "submitted");
}
