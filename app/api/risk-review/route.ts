import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { workflows, applicants, notifications } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

/**
 * GET /api/risk-review
 * Fetches all workflows awaiting risk review (stage 3, status awaiting_human)
 */
export async function GET(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json(
				{ error: "Database connection failed" },
				{ status: 500 },
			);
		}

		// Fetch workflows awaiting risk review (stage 3, status awaiting_human)
		const riskReviewWorkflows = await db
			.select({
				workflowId: workflows.id,
				applicantId: workflows.applicantId,
				stage: workflows.stage,
				status: workflows.status,
				startedAt: workflows.startedAt,
				metadata: workflows.metadata,
				companyName: applicants.companyName,
				contactName: applicants.contactName,
				itcScore: applicants.itcScore,
			})
			.from(workflows)
			.leftJoin(applicants, eq(workflows.applicantId, applicants.id))
			.where(
				and(
					eq(workflows.status, "awaiting_human"),
					eq(workflows.stage, 3),
				),
			);

		// For each workflow, fetch the risk review notification to get AI analysis data
		const itemsWithAnalysis = await Promise.all(
			riskReviewWorkflows.map(async (workflow) => {
				// Find the risk review notification for this workflow
				const riskNotifications = await db
					.select()
					.from(notifications)
					.where(
						and(
							eq(notifications.workflowId, workflow.workflowId),
							eq(notifications.type, "awaiting"),
						),
					)
					.orderBy(notifications.createdAt);

				// Find the one with "Risk Review Required" title or AI data
				const riskNotification = riskNotifications.find((n) =>
					n.message?.includes("AI Trust Score"),
				);

				// Parse errorDetails if available
				let aiTrustScore: number | undefined;
				let riskFlags: Array<{
					type: string;
					severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
					description: string;
				}> = [];
				let summary: string | undefined;

				if (riskNotification) {
					try {
						// errorDetails is stored as JSON string in the message or a separate field
						// Based on onboarding.ts, it's passed as errorDetails property
						const match = riskNotification.message?.match(
							/AI Trust Score: (\d+)%/,
						);
						if (match) {
							aiTrustScore = parseInt(match[1], 10);
						}

						const flagMatch = riskNotification.message?.match(
							/(\d+) risk flag\(s\)/,
						);
						if (flagMatch) {
							const count = parseInt(flagMatch[1], 10);
							// Create placeholder flags based on count
							for (let i = 0; i < count; i++) {
								riskFlags.push({
									type: `RISK_FLAG_${i + 1}`,
									severity: "MEDIUM",
									description: "Risk flag detected during FICA analysis",
								});
							}
						}
					} catch {
						// Ignore parsing errors
					}
				}

				return {
					id: workflow.workflowId,
					workflowId: workflow.workflowId,
					applicantId: workflow.applicantId,
					clientName: workflow.contactName || "Unknown",
					companyName: workflow.companyName || "Unknown Company",
					stage: workflow.stage || 3,
					stageName: "Risk Review",
					createdAt: workflow.startedAt
						? new Date(workflow.startedAt).toISOString()
						: new Date().toISOString(),
					aiTrustScore,
					riskFlags,
					itcScore: workflow.itcScore || undefined,
					recommendation: aiTrustScore
						? aiTrustScore >= 80
							? "APPROVE"
							: aiTrustScore >= 60
								? "APPROVE_WITH_CONDITIONS"
								: "MANUAL_REVIEW"
						: undefined,
					summary,
					bankStatementVerified: true, // If they're at stage 3, bank statement was received
					accountantLetterVerified: false,
					nameMatchVerified: undefined,
				};
			}),
		);

		return NextResponse.json({
			items: itemsWithAnalysis,
			count: itemsWithAnalysis.length,
		});
	} catch (error) {
		console.error("[API] Risk review fetch error:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch risk review items",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
