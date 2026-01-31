import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { DashboardLayout } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { QuoteApprovalForm } from "@/components/dashboard/quote-approval-form";
import { getDatabaseClient } from "@/app/utils";
import { applicants, workflows, quotes } from "@/db/schema";

export default async function ApplicantQuotePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const applicantId = Number(id);

	if (!Number.isFinite(applicantId)) {
		notFound();
	}

	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
	}

	const applicantResults = await db
		.select()
		.from(applicants)
		.where(eq(applicants.id, applicantId));

	if (applicantResults.length === 0) {
		notFound();
	}

	const [applicant] = applicantResults;

	const workflowResults = await db
		.select()
		.from(workflows)
		.where(eq(workflows.applicantId, applicantId))
		.orderBy(desc(workflows.startedAt))
		.limit(1);

	const workflow = workflowResults[0];

	if (!workflow) {
		return (
			<DashboardLayout
				title="Quote Review"
				description="No workflow found for this applicant."
				actions={
					<Link href={`/dashboard/applicants/${applicantId}`}>
						<Button variant="outline" size="sm">
							Back to applicant
						</Button>
					</Link>
				}
			>
				<p className="text-sm text-muted-foreground">
					Create a workflow before generating quotes.
				</p>
			</DashboardLayout>
		);
	}

	const quoteResults = await db
		.select()
		.from(quotes)
		.where(eq(quotes.workflowId, workflow.id))
		.orderBy(desc(quotes.createdAt))
		.limit(1);

	const quote = quoteResults[0];

	if (!quote) {
		return (
			<DashboardLayout
				title="Quote Review"
				description={`Applicant: ${applicant.companyName}`}
				actions={
					<Link href={`/dashboard/applicants/${applicantId}`}>
						<Button variant="outline" size="sm">
							Back to applicant
						</Button>
					</Link>
				}
			>
				<p className="text-sm text-muted-foreground">
					No quote has been generated for this workflow yet.
				</p>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout
			title="Quote Review"
			description={`Applicant: ${applicant.companyName}`}
			actions={
				<div className="flex flex-wrap gap-2">
					<Link href={`/dashboard/applicants/${applicantId}`}>
						<Button variant="outline" size="sm">
							Back to applicant
						</Button>
					</Link>
					<Link href={`/dashboard/workflows/${workflow.id}`}>
						<Button variant="secondary" size="sm">
							View workflow
						</Button>
					</Link>
				</div>
			}
		>
			<QuoteApprovalForm
				applicantId={applicant.id}
				workflowId={workflow.id}
				quoteId={quote.id}
				status={quote.status}
				initialAmount={quote.amount}
				initialBaseFeePercent={quote.baseFeePercent}
				initialAdjustedFeePercent={quote.adjustedFeePercent}
				initialRationale={quote.rationale}
				details={quote.details}
			/>
		</DashboardLayout>
	);
}
