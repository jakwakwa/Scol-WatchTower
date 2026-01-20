import {
	RiFlowChart,
	RiUserAddLine,
	RiTimeLine,
	RiCheckDoubleLine,
} from "@remixicon/react";
import {
	DashboardLayout,
	DashboardGrid,
	DashboardSection,
	StatsCard,
	WorkflowTable,
	ActivityFeed,
} from "@/components/dashboard";
import { WebhookTester } from "@/components/dashboard/webhook-tester";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getDatabaseClient } from "@/app/utils";
import { workflows, leads } from "@/db/schema";
import { desc, eq, count } from "drizzle-orm";

// Demo activity data - can be replaced with real events later
const mockActivity = [
	{
		id: 1,
		workflowId: 1,
		clientName: "TechCorp SA",
		eventType: "agent_dispatch" as const,
		description: "Risk verification task dispatched to Zapier agent",
		timestamp: new Date(Date.now() - 1800000),
		actorType: "system" as const,
		actorId: "zapier_risk_agent_v2",
	},
	{
		id: 2,
		workflowId: 2,
		clientName: "Financial Solutions Ltd",
		eventType: "stage_change" as const,
		description: "Progressed to Dynamic Quotation stage",
		timestamp: new Date(Date.now() - 3600000),
		actorType: "system" as const,
	},
];

export default async function DashboardPage() {
	const db = getDatabaseClient();
	let activeWorkflows: any[] = [];
	let workflowsCount = 0;
	let leadsCount = 0;

	if (db) {
		try {
			// Fetch Workflows with Lead data
			const result = await db
				.select({
					id: workflows.id,
					stage: workflows.stage,
					stageName: workflows.stageName,
					status: workflows.status,
					currentAgent: workflows.currentAgent,
					startedAt: workflows.startedAt,
					metadata: workflows.metadata,
					clientName: leads.companyName,
				})
				.from(workflows)
				.leftJoin(leads, eq(workflows.leadId, leads.id))
				.orderBy(desc(workflows.startedAt))
				.limit(10);

			activeWorkflows = result.map((w) => ({
				...w,
				// Parse metadata if it exists, otherwise use empty object
				payload: w.metadata ? JSON.parse(w.metadata) : {},
			}));

			// Get counts
			const wfCountResult = await db.select({ count: count() }).from(workflows);
			workflowsCount = wfCountResult[0]?.count || 0;

			const leadsCountResult = await db.select({ count: count() }).from(leads);
			leadsCount = leadsCountResult[0]?.count || 0;
		} catch (error) {
			console.error("Failed to fetch dashboard data:", error);
		}
	}

	return (
		<DashboardLayout
			title="Control Tower"
			description="Monitor your onboarding workflows in real-time"
			actions={
				<div className="flex items-center gap-4">
					{process.env.TEST_HOOK === "1" && <WebhookTester />}
					<Link href="/dashboard/leads/new">
						<Button className="gap-2 bg-gradient-to-r from-stone-500 to-stone-500 hover:from-stone-600 hover:to-stone-600">
							<RiUserAddLine className="h-4 w-4" />
							New Lead
						</Button>
					</Link>
				</div>
			}
		>
			{/* Stats Grid */}
			<DashboardGrid columns={4} className="mb-8">
				<StatsCard
					title="Active Workflows"
					value={workflowsCount}
					change={{ value: 0, trend: "neutral" }}
					icon={RiFlowChart}
					iconColor="amber"
				/>
				<StatsCard
					title="Pending Approvals"
					value={0} // TODO: Count 'awaiting_human' status
					change={{ value: 0, trend: "neutral" }}
					icon={RiTimeLine}
					iconColor="purple"
				/>
				<StatsCard
					title="Total Leads"
					value={leadsCount}
					change={{ value: 0, trend: "neutral" }}
					icon={RiUserAddLine}
					iconColor="blue"
				/>
				<StatsCard
					title="Completion Rate"
					value="-"
					change={{ value: 0, trend: "neutral" }}
					icon={RiCheckDoubleLine}
					iconColor="green"
				/>
			</DashboardGrid>

			{/* Main content grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Workflows Table - spans 2 columns */}
				<div className="lg:col-span-2">
					<DashboardSection
						title="Active Workflows"
						description="Real-time status of onboarding workflows"
						action={
							<Link href="/dashboard/workflows">
								<Button variant="ghost" size="sm">
									View All
								</Button>
							</Link>
						}
					>
						<WorkflowTable workflows={activeWorkflows} />
					</DashboardSection>
				</div>

				{/* Activity Feed */}
				<div className="lg:col-span-1">
					<DashboardSection title="Recent Activity">
						<div className="rounded-2xl border border-sidebar-border bg-card/50 p-4">
							<ActivityFeed events={mockActivity} maxItems={5} />
						</div>
					</DashboardSection>
				</div>
			</div>
		</DashboardLayout>
	);
}
