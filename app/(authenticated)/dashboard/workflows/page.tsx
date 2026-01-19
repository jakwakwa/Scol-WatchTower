import { RiFlowChart, RiFilterLine, RiDownloadLine } from "@remixicon/react";
import {
	DashboardLayout,
	DashboardSection,
	DashboardGrid,
	StatsCard,
	WorkflowTable,
} from "@/components/dashboard";
import { Button } from "@/components/ui/button";

// Extended mock data for the full workflows page
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
	{
		id: 5,
		clientName: "Logistics Partners",
		stage: 2 as const,
		stageName: "dynamic_quotation",
		status: "in_progress" as const,
		currentAgent: "zapier_doc_agent_v1",
		startedAt: new Date(Date.now() - 3600000 * 8),
		payload: { quoteId: "Q-2024-002", amount: 180000 },
	},
	{
		id: 6,
		clientName: "Healthcare Inc",
		stage: 3 as const,
		stageName: "verification",
		status: "in_progress" as const,
		currentAgent: "zapier_risk_agent_v2",
		startedAt: new Date(Date.now() - 3600000 * 12),
		payload: { riskScore: 42, anomalies: [] },
	},
	{
		id: 7,
		clientName: "Education Corp",
		stage: 1 as const,
		stageName: "lead_capture",
		status: "timeout" as const,
		currentAgent: "zapier_doc_agent_v1",
		startedAt: new Date(Date.now() - 86400000 * 3),
		payload: { formSent: true, signatureRequested: true, escalated: true },
	},
];

const stageStats = {
	lead_capture: mockWorkflows.filter((w) => w.stage === 1).length,
	quotation: mockWorkflows.filter((w) => w.stage === 2).length,
	verification: mockWorkflows.filter((w) => w.stage === 3).length,
	integration: mockWorkflows.filter((w) => w.stage === 4).length,
};

export default function WorkflowsPage() {
	return (
		<DashboardLayout
			title="Workflows"
			description="All onboarding workflows across all stages"
			actions={
				<div className="flex items-center gap-3">
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
					title="Lead Capture"
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
				<WorkflowTable workflows={mockWorkflows} />
			</DashboardSection>
		</DashboardLayout>
	);
}
