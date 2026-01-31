import {
	RiFlowChart,
	RiUserAddLine,
	RiTimeLine,
	RiCheckDoubleLine,
	RiAddLine,
	RiFileTextLine,
	RiCheckboxCircleLine,
	RiShieldCheckLine,
} from "@remixicon/react";
import {
	DashboardLayout,
	DashboardGrid,
	DashboardSection,
	StatsCard,
	ActivityFeed,
} from "@/components/dashboard";
import { PipelineView } from "@/components/dashboard/pipeline-view";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getDatabaseClient } from "@/app/utils";
import { workflows, applicants, workflowEvents, notifications } from "@/db/schema";
import { desc, eq, count } from "drizzle-orm";
import { DynamicWorkflowTable as WorkflowTable } from "@/components/dashboard/dynamic-components";

export default async function DashboardPage() {
	const db = getDatabaseClient();
	let activeWorkflows: any[] = [];
	let recentActivity: any[] = [];
	let workflowsCount = 0;
	let applicantsCount = 0;

	if (db) {
		try {
			// Fetch Workflows with applicant data
			const result = await db
				.select({
					id: workflows.id,
					applicantId: workflows.applicantId,
					stage: applicants.status, // Use applicant status for pipeline view
					status: workflows.status,
					startedAt: workflows.startedAt,
					metadata: workflows.metadata,
					clientName: applicants.companyName,
				})
				.from(workflows)
				.leftJoin(applicants, eq(workflows.applicantId, applicants.id))
				.orderBy(desc(workflows.startedAt))
				.limit(10);

			activeWorkflows = result.map((w) => ({
				...w,
				// Parse metadata if it exists, otherwise use empty object
				payload: w.metadata ? JSON.parse(w.metadata) : {},
			}));

			// Fetch Recent Activity
			const activityResult = await db
				.select({
					id: workflowEvents.id,
					workflowId: workflowEvents.workflowId,
					eventType: workflowEvents.eventType,
					timestamp: workflowEvents.timestamp,
					actorType: workflowEvents.actorType,
					actorId: workflowEvents.actorId,
					clientName: applicants.companyName,
					payload: workflowEvents.payload,
				})
				.from(workflowEvents)
				.innerJoin(workflows, eq(workflowEvents.workflowId, workflows.id))
				.innerJoin(applicants, eq(workflows.applicantId, applicants.id))
				.orderBy(desc(workflowEvents.timestamp))
				.limit(10);

			recentActivity = activityResult.map((event) => {
				let description = "Event occurred";
				const payload = event.payload ? JSON.parse(event.payload) : {};

				switch (event.eventType) {
					case "stage_change":
						description = `Workflow advanced to ${payload.toStage || "next stage"}`;
						break;
					case "agent_dispatch":
						description = `Agent ${event.actorId || "platform"} dispatched`;
						break;
					case "agent_callback":
						description = `Agent response received`;
						break;
					case "human_override":
						description = `Manual override applied`;
						break;
					case "error":
						description = `Error: ${payload.error || "Workflow error detected"}`;
						break;
					case "timeout":
						description = `Workflow stage timed out`;
						break;
				}

				return {
					...event,
					description,
				};
			});

			const wfCountResult = await db.select({ count: count() }).from(workflows);
			workflowsCount = wfCountResult[0]?.count || 0;

			const applicantsCountResult = await db
				.select({ count: count() })
				.from(applicants);
			applicantsCount = applicantsCountResult[0]?.count || 0;
		} catch (error) {
			console.error("Failed to fetch dashboard data:", error);
		}
	}

	// Fetch notifications
	let workflowNotifications: any[] = [];
	if (db) {
		try {
			// Change import of notifications at top first!
			// Dynamic import or separate fetch call not possible inside ReplaceFileContent easily without adding imports
			// I will fetch notifications here assuming update of imports below

			const notificationsResult = await db
				.select({
					id: notifications.id,
					workflowId: notifications.workflowId,
					type: notifications.type,
					message: notifications.message,
					read: notifications.read,
					actionable: notifications.actionable,
					createdAt: notifications.createdAt,
					clientName: applicants.companyName,
				})
				.from(notifications)
				.leftJoin(applicants, eq(notifications.applicantId, applicants.id))
				.orderBy(desc(notifications.createdAt))
				.limit(20);

			workflowNotifications = notificationsResult.map((n) => ({
				id: n.id.toString(),
				workflowId: n.workflowId,
				clientName: n.clientName || "Unknown",
				type: n.type as any,
				message: n.message,
				timestamp: n.createdAt,
				read: n.read,
				actionable: n.actionable,
			}));
		} catch (error) {
			console.error("Failed to fetch notifications:", error);
		}
	}

	// ... Imports
	return (
		<DashboardLayout
			title="Onboarding Pipeline"
			description="Track and manage client applications through the onboarding process"
			actions={
				<Link href="/dashboard/applicants/new">
					<Button variant="secondary">
						<RiUserAddLine color="var(--color-teal-200)" />
						New Applicant
					</Button>
				</Link>
			}
			notifications={workflowNotifications}
		>
			{/* Stats Grid - StratCol Style */}
			<DashboardGrid columns={4} className="mb-8">
				<StatsCard
					title="Total Applications"
					value={workflowsCount}
					change={{ value: 12, trend: "up" }}
					icon={RiFileTextLine}
					iconColor="blue"
				/>
				<StatsCard
					title="In Progress"
					value={
						activeWorkflows.filter(
							(w) => !["won", "lost", "completed"].includes(w.stage),
						).length
					}
					change={{ value: 5, trend: "up" }}
					icon={RiTimeLine}
					iconColor="amber" // Used cyan in screenshot, mapping to StratCol palette
				/>
				<StatsCard
					title="Completed"
					value={
						activeWorkflows.filter((w) =>
							["won", "activation"].includes(w.stage),
						).length
					}
					change={{ value: 18, trend: "up" }}
					icon={RiCheckboxCircleLine}
					iconColor="green"
				/>
				<StatsCard
					title="High Risk"
					value={1}
					change={{ value: 8, trend: "down" }}
					icon={RiShieldCheckLine}
					iconColor="red"
				/>
			</DashboardGrid>

			{/* Pipeline View - Full Width */}
			<div className="w-full">
				<PipelineView workflows={activeWorkflows} />
			</div>
		</DashboardLayout>
	);
}
