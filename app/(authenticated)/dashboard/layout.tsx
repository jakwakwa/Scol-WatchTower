import { getDatabaseClient } from "@/app/utils";
import { notifications, workflows, leads } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function DashboardRootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { userId } = await auth();

	if (!userId) {
		redirect("/sign-in");
	}

	const db = getDatabaseClient();
	let workflowNotifications: any[] = [];

	if (db) {
		try {
			const notificationsResult = await db
				.select({
					id: notifications.id,
					workflowId: notifications.workflowId,
					type: notifications.type,
					message: notifications.message,
					read: notifications.read,
					actionable: notifications.actionable,
					createdAt: notifications.createdAt,
					clientName: leads.companyName,
				})
				.from(notifications)
				.leftJoin(workflows, eq(notifications.workflowId, workflows.id))
				.leftJoin(leads, eq(workflows.leadId, leads.id))
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

	return (
		<DashboardShell notifications={workflowNotifications}>
			{children}
		</DashboardShell>
	);
}
