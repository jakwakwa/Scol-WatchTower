import {
	RiRobot2Line,
	RiCheckDoubleLine,
	RiAlertLine,
	RiTimeLine,
} from "@remixicon/react";
import {
	DashboardLayout,
	DashboardSection,
	DashboardGrid,
	StatsCard,
	AgentStatusCard,
} from "@/components/dashboard";
import { NotificationsPanel, type WorkflowNotification } from "@/components/dashboard/notifications-panel";

// Mock agents data
const mockAgents = [
	{
		id: "1",
		agentId: "xt_doc_agent_v1",
		name: "Document Generator",
		taskType: "document_generation",
		status: "active" as const,
		lastCallbackAt: new Date(Date.now() - 1800000),
		callbackCount: 142,
		errorCount: 2,
	},
	{
		id: "2",
		agentId: "xt_esign_agent_v1",
		name: "E-Signature Handler",
		taskType: "electronic_signature",
		status: "active" as const,
		lastCallbackAt: new Date(Date.now() - 3600000),
		callbackCount: 89,
		errorCount: 0,
	},
	{
		id: "3",
		agentId: "xt_risk_agent_v2",
		name: "Risk Verification",
		taskType: "risk_verification",
		status: "active" as const,
		lastCallbackAt: new Date(Date.now() - 900000),
		callbackCount: 156,
		errorCount: 5,
	},
	{
		id: "4",
		agentId: "xt_sync_agent_v1",
		name: "V24/V27 Sync",
		taskType: "data_sync",
		status: "inactive" as const,
		lastCallbackAt: new Date(Date.now() - 86400000),
		callbackCount: 234,
		errorCount: 1,
	},
	{
		id: "5",
		agentId: "xt_notify_agent_v1",
		name: "Notification Handler",
		taskType: "notification",
		status: "active" as const,
		lastCallbackAt: new Date(Date.now() - 600000),
		callbackCount: 312,
		errorCount: 0,
	},
	{
		id: "6",
		agentId: "xt_escalation_agent_v1",
		name: "Escalation Manager",
		taskType: "notification",
		status: "error" as const,
		lastCallbackAt: new Date(Date.now() - 7200000),
		callbackCount: 45,
		errorCount: 8,
	},
];

const stats = {
	totalAgents: mockAgents.length,
	activeAgents: mockAgents.filter((a) => a.status === "active").length,
	totalCallbacks: mockAgents.reduce((acc, a) => acc + a.callbackCount, 0),
	totalErrors: mockAgents.reduce((acc, a) => acc + a.errorCount, 0),
};

export default function AgentsPage(
	{ workflowNotifications }: { workflowNotifications: WorkflowNotification[] }
) {
	return (
		<DashboardLayout
			title="Agents"
			description="Monitor your external agent fleet"
			notifications={workflowNotifications}
		>

			{/* Agent Stats */}
			<DashboardGrid columns={4} className="mb-8">
				<StatsCard
					title="Total Agents"
					value={stats.totalAgents}
					icon={RiRobot2Line}
					iconColor="amber"
				/>
				<StatsCard
					title="Active"
					value={stats.activeAgents}
					change={{ value: 0, trend: "neutral" }}
					icon={RiCheckDoubleLine}
					iconColor="green"
				/>
				<StatsCard
					title="Total Callbacks"
					value={stats.totalCallbacks}
					change={{ value: 15, trend: "up" }}
					icon={RiTimeLine}
					iconColor="blue"
				/>
				<StatsCard
					title="Errors"
					value={stats.totalErrors}
					change={{ value: 2, trend: "down" }}
					icon={RiAlertLine}
					iconColor="red"
				/>
			</DashboardGrid>

			{/* Agent Grid */}
			<DashboardSection title="Agent Fleet">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{mockAgents.map((agent) => (
						<AgentStatusCard key={agent.id} agent={agent} />
					))}
				</div>
			</DashboardSection>
		</DashboardLayout>
	);
}
