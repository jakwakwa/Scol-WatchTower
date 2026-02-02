import Link from "next/link";
import {
	RiFlowChart,
	RiFilterLine,
	RiDownloadLine,
	RiUserAddLine,
} from "@remixicon/react";
import {
	DashboardLayout,
	DashboardSection,
	DashboardGrid,
	StatsCard,
	WorkflowTable,
} from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { getDatabaseClient } from "@/app/utils";
import { workflows, applicants, quotes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
// Type import needed for WorkflowTable props
// ensuring we match the expected shape

export default async function WorkflowsPage() {
	const db = getDatabaseClient();
	let allWorkflows: any[] = [];
	let stageStats = {
		lead_capture: 0,
		quotation: 0,
		verification: 0,
		integration: 0,
	};

	if (db) {
		try {
			// Fetch all workflows with applicant data
			const workflowRows = await db
				.select({
					id: workflows.id,
					applicantId: workflows.applicantId,
					stage: workflows.stage,
					status: workflows.status,
					startedAt: workflows.startedAt,
					metadata: workflows.metadata,
					clientName: applicants.companyName,
				})
				.from(workflows)
				.leftJoin(applicants, eq(workflows.applicantId, applicants.id))
				.orderBy(desc(workflows.startedAt));

			const quoteRows = await db.select().from(quotes);
			const quotesByWorkflow = new Map<number, typeof quotes.$inferSelect>();

			for (const quote of quoteRows) {
				if (!quotesByWorkflow.has(quote.workflowId)) {
					quotesByWorkflow.set(quote.workflowId, quote);
				}
			}

			allWorkflows = workflowRows.map((w) => ({
				...w,
				// Parse metadata if it exists, otherwise use empty object
				payload: w.metadata ? JSON.parse(w.metadata) : {},
				hasQuote: quotesByWorkflow.has(w.id),
			}));

			// Calculate stats
			stageStats = {
				lead_capture: allWorkflows.filter((w) => w.stage === 1).length,
				quotation: allWorkflows.filter((w) => w.stage === 2).length,
				verification: allWorkflows.filter((w) => w.stage === 3).length,
				integration: allWorkflows.filter((w) => w.stage === 4).length,
			};
		} catch (error) {
			console.error("Failed to fetch workflows:", error);
		}
	}

	return (
		<DashboardLayout
			title="Workflows"
			description="All onboarding workflows across all stages"
			actions={
				<div className="flex items-center gap-3">
					<Link href="/dashboard/applicants/new">
						<Button variant="secondary">
							<RiUserAddLine className="mr-2 h-4 w-4" />
							New Applicant
						</Button>
					</Link>
					<Button variant="outline" className="gap-2">
						<RiFilterLine className="h-4 w-4" />
						Filter
					</Button>
					<Button variant="outline" className="gap-2">
						<RiDownloadLine className="h-4 w-4" />
						Export
					</Button>
				</div>
			}
		>
			{/* Stage distribution */}
			<DashboardGrid columns={4} className="mb-8">
				<StatsCard
					title="Applicant Capture"
					value={stageStats.lead_capture}
					icon={RiFlowChart}
					iconColor="blue"
				/>
				<StatsCard
					title="Quotation"
					value={stageStats.quotation}
					icon={RiFlowChart}
					iconColor="purple"
				/>
				<StatsCard
					title="Verification"
					value={stageStats.verification}
					icon={RiFlowChart}
					iconColor="amber"
				/>
				<StatsCard
					title="Integration"
					value={stageStats.integration}
					icon={RiFlowChart}
					iconColor="green"
				/>
			</DashboardGrid>

			{/* Full workflows table */}
			<DashboardSection title="All Workflows">
				<WorkflowTable workflows={allWorkflows} />
			</DashboardSection>
		</DashboardLayout>
	);
}
