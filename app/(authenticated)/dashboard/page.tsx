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
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Demo data - will be replaced with real data from DB
const mockStats = {
	activeWorkflows: 12,
	pendingApprovals: 4,
	leadsToday: 8,
	completionRate: 94,
};

const mockWorkflows = [
	{
		id: 1,
		clientName: "TechCorp SA",
		stage: 3 as const,
		stageName: "verification",
		status: "awaiting_human" as const,
		currentAgent: "zapier_risk_agent_v2",
		startedAt: new Date(Date.now() - 3600000 * 2),
		payload: {
			riskScore: 85,
			anomalies: ["Blurred Transaction Line", "Sanctions Partial Match"],
			documentLinks: ["https://storage.googleapis.com/..."],
		},
	},
	{
		id: 2,
		clientName: "Financial Solutions Ltd",
		stage: 2 as const,
		stageName: "dynamic_quotation",
		status: "in_progress" as const,
		currentAgent: "zapier_doc_agent_v1",
		startedAt: new Date(Date.now() - 3600000 * 5),
		payload: { quoteId: "Q-2024-001", amount: 250000 },
	},
	{
		id: 3,
		clientName: "Mining Resources PTY",
		stage: 4 as const,
		stageName: "integration",
		status: "completed" as const,
		currentAgent: undefined,
		startedAt: new Date(Date.now() - 86400000),
		payload: { syncedAt: new Date().toISOString(), v24Status: "success" },
	},
	{
		id: 4,
		clientName: "Retail Holdings",
		stage: 1 as const,
		stageName: "lead_capture",
		status: "pending" as const,
		currentAgent: "zapier_doc_agent_v1",
		startedAt: new Date(Date.now() - 1800000),
		payload: { formSent: true, signatureRequested: true },
	},
];

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
	{
		id: 3,
		workflowId: 3,
		clientName: "Mining Resources PTY",
		eventType: "agent_callback" as const,
		description: "V24 sync completed successfully",
		timestamp: new Date(Date.now() - 7200000),
		actorType: "agent" as const,
		actorId: "zapier_sync_agent_v1",
	},
	{
		id: 4,
		workflowId: 1,
		clientName: "TechCorp SA",
		eventType: "human_override" as const,
		description: "Risk score manually adjusted by manager",
		timestamp: new Date(Date.now() - 14400000),
		actorType: "user" as const,
		actorId: "risk_manager@company.co.za",
	},
];

export default function DashboardPage() {
	return (
		<DashboardLayout
			title="Control Tower"
			description="Monitor your onboarding workflows in real-time"
			actions={
				<Link href="/dashboard/leads/new">
					<Button className="gap-2 bg-gradient-to-r from-stone-500 to-stone-500 hover:from-stone-600 hover:to-stone-600">
						<RiUserAddLine className="h-4 w-4" />
						New Lead
					</Button>
				</Link>
			}
		>
			{/* Stats Grid */}
			<DashboardGrid columns={4} className="mb-8">
				<StatsCard
					title="Active Workflows"
					value={mockStats.activeWorkflows}
					change={{ value: 12, trend: "up" }}
					icon={RiFlowChart}
					iconColor="amber"
				/>
				<StatsCard
					title="Pending Approvals"
					value={mockStats.pendingApprovals}
					change={{ value: 2, trend: "down" }}
					icon={RiTimeLine}
					iconColor="purple"
				/>
				<StatsCard
					title="Leads Today"
					value={mockStats.leadsToday}
					change={{ value: 25, trend: "up" }}
					icon={RiUserAddLine}
					iconColor="blue"
				/>
				<StatsCard
					title="Completion Rate"
					value={`${mockStats.completionRate}%`}
					change={{ value: 3, trend: "up" }}
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
						<WorkflowTable workflows={mockWorkflows} />
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
