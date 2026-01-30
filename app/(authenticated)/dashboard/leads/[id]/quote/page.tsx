import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { DashboardLayout } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { QuoteApprovalForm } from "@/components/dashboard/quote-approval-form";
import { getDatabaseClient } from "@/app/utils";
import { leads, workflows, quotes } from "@/db/schema";

export default async function LeadQuotePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const leadId = Number(id);

	if (!Number.isFinite(leadId)) {
		notFound();
	}

	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
	}

	const leadResults = await db.select().from(leads).where(eq(leads.id, leadId));

	if (leadResults.length === 0) {
		notFound();
	}

	const [lead] = leadResults;

	const workflowResults = await db
		.select()
		.from(workflows)
		.where(eq(workflows.leadId, leadId))
		.orderBy(desc(workflows.startedAt))
		.limit(1);

	const workflow = workflowResults[0];

	if (!workflow) {
		return (
			<DashboardLayout
				title="Quote Review"
				description="No workflow found for this lead."
				actions={
					<Link href={`/dashboard/leads/${leadId}`}>
						<Button variant="outline" size="sm">
							Back to lead
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
				description={`Lead: ${lead.companyName}`}
				actions={
					<Link href={`/dashboard/leads/${leadId}`}>
						<Button variant="outline" size="sm">
							Back to lead
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
			description={`Lead: ${lead.companyName}`}
			actions={
				<div className="flex flex-wrap gap-2">
					<Link href={`/dashboard/leads/${leadId}`}>
						<Button variant="outline" size="sm">
							Back to lead
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
				leadId={lead.id}
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
