import Link from "next/link";
import { RiUserAddLine } from "@remixicon/react";
import {
	DashboardLayout,
	DashboardSection,
	LeadsTable,
} from "@/components/dashboard";
import type { LeadRow } from "@/components/dashboard/leads-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDatabaseClient } from "@/app/utils";
import { leads, quotes, workflows } from "@/db/schema";
import { desc } from "drizzle-orm";
import type { WorkflowNotification } from "@/components/dashboard/notifications-panel";

const statusConfig = {
	new: { label: "New", color: "bg-blue-500/20 text-blue-400" },
	contacted: { label: "Contacted", color: "bg-purple-500/20 text-purple-400" },
	qualified: { label: "Qualified", color: "bg-stone-500/20 text-stone-400" },
	proposal: { label: "Proposal", color: "bg-stone-500/20 text-stone-400" },
	negotiation: { label: "Negotiation", color: "bg-pink-500/20 text-pink-400" },
	won: { label: "Won", color: "bg-teal-500/40 text-emerald-600/80" },
	lost: { label: "Lost", color: "bg-red-500/20 text-red-400" },
} as const;

export default async function LeadsPage(
	{ workflowNotifications }: { workflowNotifications: WorkflowNotification[] }
) {
	const db = getDatabaseClient();
	let allLeads: LeadRow[] = [];

	if (db) {
		try {
			const leadRows = await db
				.select()
				.from(leads)
				.orderBy(desc(leads.createdAt));

			const workflowRows = await db.select().from(workflows);
			const quoteRows = await db.select().from(quotes);

			const workflowsByLead = new Map<number, typeof workflows.$inferSelect>();
			for (const workflow of workflowRows.sort((a, b) => {
				const aTime = new Date(a.startedAt || 0).getTime();
				const bTime = new Date(b.startedAt || 0).getTime();
				return bTime - aTime;
			})) {
				if (!workflowsByLead.has(workflow.leadId)) {
					workflowsByLead.set(workflow.leadId, workflow);
				}
			}

			const quotesByWorkflow = new Map<number, typeof quotes.$inferSelect>();
			for (const quote of quoteRows.sort((a, b) => {
				const aTime = new Date(a.createdAt || 0).getTime();
				const bTime = new Date(b.createdAt || 0).getTime();
				return bTime - aTime;
			})) {
				if (!quotesByWorkflow.has(quote.workflowId)) {
					quotesByWorkflow.set(quote.workflowId, quote);
				}
			}

			allLeads = leadRows.map(lead => {
				const workflow = workflowsByLead.get(lead.id);
				const quote = workflow ? quotesByWorkflow.get(workflow.id) : null;
				return {
					...lead,
					workflowId: workflow?.id ?? null,
					workflowStage: workflow?.stage ?? null,
					hasQuote: !!quote,
				};
			});
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

					<Button variant="secondary">
						<RiUserAddLine />
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
								"rounded-xl bg-secondary/2 border border-sidebar-border p-4 text-center",
								"transition-colors hover:bg-secondary/4",
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
