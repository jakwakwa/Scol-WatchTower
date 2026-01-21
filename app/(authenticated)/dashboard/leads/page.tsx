import Link from "next/link";
import { RiUserAddLine } from "@remixicon/react";
import {
	DashboardLayout,
	DashboardSection,
	LeadsTable,
} from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDatabaseClient } from "@/app/utils";
import { leads } from "@/db/schema";
import { desc } from "drizzle-orm";
import type { WorkflowNotification } from "@/components/dashboard/notifications-panel";

const statusConfig = {
	new: { label: "New", color: "bg-blue-500/20 text-blue-400" },
	contacted: { label: "Contacted", color: "bg-purple-500/20 text-purple-400" },
	qualified: { label: "Qualified", color: "bg-stone-500/20 text-stone-400" },
	proposal: { label: "Proposal", color: "bg-stone-500/20 text-stone-400" },
	negotiation: { label: "Negotiation", color: "bg-pink-500/20 text-pink-400" },
	won: { label: "Won", color: "bg-emerald-500/20 text-emerald-400" },
	lost: { label: "Lost", color: "bg-red-500/20 text-red-400" },
} as const;

export default async function LeadsPage(
	{ workflowNotifications }: { workflowNotifications: WorkflowNotification[] }
) {
	const db = getDatabaseClient();
	let allLeads: any[] = [];

	if (db) {
		try {
			allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
		} catch (error) {
			console.error("Failed to fetch leads:", error);
		}
	}

	return (
		<DashboardLayout
			title="Leads"
			description="Manage your potential clients"
			actions={

				<Link href="/dashboard/leads/new">
					<Button className="gap-2 bg-linear-to-r from-stone-500 to-stone-500 hover:from-stone-600 hover:to-stone-600">
						<RiUserAddLine className="h-4 w-4" />
						New Lead
					</Button>
				</Link>

			}
			notifications={workflowNotifications}
		>
			{/* Pipeline Stats */}
			<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
				{Object.entries(statusConfig).map(([status, config]) => {
					// @ts-ignore - status match
					const count = allLeads.filter((l) => l.status === status).length;
					return (
						<div
							key={status}
							className={cn(
								"rounded-xl bg-white/[0.02] border border-sidebar-border p-4 text-center",
								"transition-colors hover:bg-white/[0.04]",
							)}
						>
							<p className="text-2xl font-bold">{count}</p>
							<p className="text-xs text-muted-foreground">{config.label}</p>
						</div>
					);
				})}
			</div>

			{/* Leads Table */}
			<DashboardSection title="All Leads">
				<LeadsTable leads={allLeads} />
			</DashboardSection>
		</DashboardLayout>
	);
}
