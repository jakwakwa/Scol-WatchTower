import { inngest } from "../client";
import { getDatabaseClient } from "@/app/utils";
import { documents } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * FICA Document Aggregator
 *
 * Listens for individual document uploads and checks if the full set
 * of required FICA documents is present for an applicant.
 *
 * If all required documents are found, it gathers them and emits
 * 'upload/fica.received' to wake up the main onboarding workflow.
 */
export const documentAggregator = inngest.createFunction(
	{ id: "fica-document-aggregator", name: "FICA Document Aggregator" },
	{ event: "document/uploaded" },
	async ({ event, step }) => {
		const { applicantId, workflowId, documentType } = event.data;

		console.log(
			`[Aggregator] Document uploaded: ${documentType} for Applicant ${applicantId}`
		);

		// 1. Fetch all documents for this applicant
		const applicantDocs = await step.run("fetch-all-documents", async () => {
			const db = getDatabaseClient();
			if (!db) throw new Error("Database connection failed");

			return await db
				.select()
				.from(documents)
				.where(eq(documents.applicantId, applicantId));
		});

		// 2. Check for required documents
		// Based on onboarding.ts requirement: Bank Statement + Accountant Letter
		const requirements = ["BANK_STATEMENT"];
		const uploadedTypes = applicantDocs.map(d => d.type);

		const missing = requirements.filter(req => !uploadedTypes.includes(req));

		if (missing.length > 0) {
			console.log(`[Aggregator] Still missing documents: ${missing.join(", ")}`);
			return {
				status: "pending",
				missing,
				uploadedCount: applicantDocs.length,
			};
		}

		console.log(`[Aggregator] All FICA documents received! Triggering workflow resume.`);

		// 3. Emit the bundle event expected by onboarding.ts
		// Map db documents to the shape expected by onboarding.ts event
		const payloadDocuments = applicantDocs.map(d => ({
			type: d.type as any, // Cast to match enum
			filename: d.fileName || "unknown",
			url: d.storageUrl || "",
			uploadedAt: d.uploadedAt
				? new Date(d.uploadedAt).toISOString()
				: new Date().toISOString(),
		}));

		await step.run("emit-fica-received", async () => {
			await inngest.send({
				name: "upload/fica.received",
				data: {
					workflowId,
					applicantId,
					documents: payloadDocuments,
					uploadedBy: "client", // or system/aggregator
				},
			});
		});

		return {
			status: "complete",
			emittedEvent: "upload/fica.received",
			documentCount: payloadDocuments.length,
		};
	}
);
