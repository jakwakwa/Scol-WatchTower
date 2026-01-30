import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest";
import type { FormType } from "@/lib/types";
import { getDatabaseClient } from "@/app/utils";
import { quotes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {
	absa6995Schema,
	facilityApplicationSchema,
	signedQuotationSchema,
	stratcolContractSchema,
} from "@/lib/validations/forms";
import {
	getFormInstanceByToken,
	recordFormSubmission,
} from "@/lib/services/form.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";

const formSubmissionSchema = z.object({
	token: z.string().min(10),
	formType: z.enum([
		"FACILITY_APPLICATION",
		"SIGNED_QUOTATION",
		"STRATCOL_CONTRACT",
		"ABSA_6995",
	]),
	data: z.record(z.string(), z.unknown()),
});

const formSchemaMap: Record<FormType, z.ZodSchema> = {
	FACILITY_APPLICATION: facilityApplicationSchema,
	SIGNED_QUOTATION: signedQuotationSchema,
	STRATCOL_CONTRACT: stratcolContractSchema,
	ABSA_6995: absa6995Schema,
	DOCUMENT_UPLOADS: z.any(),
};

const extractSubmittedBy = (
	formType: FormType,
	data: Record<string, unknown>,
) => {
	if (formType === "SIGNED_QUOTATION" || formType === "STRATCOL_CONTRACT") {
		return typeof data.signatureName === "string"
			? data.signatureName
			: undefined;
	}

	if (formType === "ABSA_6995") {
		const signatures = data.signatures as { clientName?: string } | undefined;
		return signatures?.clientName;
	}

	return undefined;
};

export async function POST(request: NextRequest) {
	try {
		const payload = await request.json();
		const parsed = formSubmissionSchema.safeParse(payload);

		if (!parsed.success) {
			return NextResponse.json(
				{
					error: "Invalid submission payload",
					details: parsed.error.flatten(),
				},
				{ status: 400 },
			);
		}

		const { token, formType, data } = parsed.data;
		const formInstance = await getFormInstanceByToken(token);

		if (!formInstance) {
			return NextResponse.json(
				{ error: "Form link is invalid" },
				{ status: 404 },
			);
		}

		if (formInstance.formType !== formType) {
			return NextResponse.json(
				{ error: "Form type mismatch" },
				{ status: 400 },
			);
		}

		if (formInstance.status === "submitted") {
			return NextResponse.json(
				{ error: "Form already submitted" },
				{ status: 409 },
			);
		}

		if (formInstance.status === "revoked") {
			return NextResponse.json(
				{ error: "Form link has been revoked" },
				{ status: 410 },
			);
		}

		if (
			formInstance.expiresAt &&
			new Date(formInstance.expiresAt) < new Date()
		) {
			return NextResponse.json(
				{ error: "Form link has expired" },
				{ status: 410 },
			);
		}

		const schema = formSchemaMap[formType];
		const validation = schema.safeParse(data);

		if (!validation.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: validation.error.flatten() },
				{ status: 400 },
			);
		}

		let latestQuoteId: number | null = null;
		let quoteDb = null as Awaited<ReturnType<typeof getDatabaseClient>> | null;

		if (formType === "SIGNED_QUOTATION" && formInstance.workflowId) {
			quoteDb = await getDatabaseClient();

			if (!quoteDb) {
				return NextResponse.json(
					{ error: "Database connection failed" },
					{ status: 500 },
				);
			}

			const quoteResults = await quoteDb
				.select()
				.from(quotes)
				.where(eq(quotes.workflowId, formInstance.workflowId))
				.orderBy(desc(quotes.createdAt))
				.limit(1);

			if (quoteResults.length === 0) {
				return NextResponse.json(
					{ error: "No quote available for this workflow" },
					{ status: 404 },
				);
			}

			latestQuoteId = quoteResults[0].id;
		}

		await recordFormSubmission({
			applicantMagiclinkFormId: formInstance.id,
			applicantId: formInstance.applicantId,
			workflowId: formInstance.workflowId,
			formType,
			data: validation.data as Record<string, unknown>,
			submittedBy: extractSubmittedBy(
				formType,
				validation.data as Record<string, unknown>,
			),
		});

		if (formInstance.workflowId) {
			await logWorkflowEvent({
				workflowId: formInstance.workflowId,
				eventType: "stage_change",
				payload: {
					step: "form-submitted",
					formType,
					applicantMagiclinkFormId: formInstance.id,
				},
			});

			await createWorkflowNotification({
				workflowId: formInstance.workflowId,
				applicantId: formInstance.applicantId,
				type: "completed",
				title: "Form submitted",
				message: `${formType.replace(/_/g, " ")} submitted successfully.`,
				actionable: false,
			});
		}

		if (formInstance.workflowId) {
			await inngest.send({
				name: "form/submitted",
				data: {
					workflowId: formInstance.workflowId,
					applicantId: formInstance.applicantId,
					formType,
					applicantMagiclinkFormId: formInstance.id,
					submittedAt: new Date().toISOString(),
				},
			});

			if (formType === "STRATCOL_CONTRACT") {
				await inngest.send({
					name: "contract/signed",
					data: {
						workflowId: formInstance.workflowId,
						signedAt: new Date().toISOString(),
					},
				});
			}

			if (formType === "SIGNED_QUOTATION" && formInstance.workflowId) {
				const db = quoteDb ?? (await getDatabaseClient());

				if (!db) {
					console.error(
						"[FormSubmit] Database connection failed for quote update",
					);
				} else {
					const updateResults = latestQuoteId
						? await db
								.update(quotes)
								.set({ status: "approved", updatedAt: new Date() })
								.where(eq(quotes.id, latestQuoteId))
								.returning()
						: [];

					const resolvedQuoteId = updateResults[0]?.id ?? latestQuoteId;

					if (resolvedQuoteId) {
						await inngest.send({
							name: "quote/signed",
							data: {
								workflowId: formInstance.workflowId,
								applicantId: formInstance.applicantId,
								quoteId: resolvedQuoteId,
								signedAt: new Date().toISOString(),
							},
						});
					}
				}
			}
		}

		return NextResponse.json({
			success: true,
			message: "Form submitted successfully",
		});
	} catch (error) {
		console.error("[FormSubmit] Error:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
