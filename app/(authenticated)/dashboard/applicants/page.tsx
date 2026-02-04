import { RiUserAddLine } from "@remixicon/react";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { getDatabaseClient } from "@/app/utils";
import { ApplicantsTable, type ApplicantRow } from "@/components/dashboard/applicants-table";
import { DashboardLayout, DashboardSection } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { applicants, quotes, workflows } from "@/db/schema";
import { cn } from "@/lib/utils";

const statusConfig = {
	new: { label: "New", color: "bg-blue-500/20 text-blue-400" },
	contacted: { label: "Contacted", color: "bg-purple-500/20 text-purple-400" },
	qualified: { label: "Qualified", color: "bg-stone-500/20 text-stone-400" },
	proposal: { label: "Proposal", color: "bg-stone-500/20 text-stone-400" },
	negotiation: { label: "Negotiation", color: "bg-pink-500/20 text-pink-400" },
	won: { label: "Won", color: "bg-teal-500/40 text-emerald-600/80" },
	lost: { label: "Lost", color: "bg-red-500/20 text-red-400" },
} as const;

export default async function ApplicantsPage() {
	const db = getDatabaseClient();
	let allApplicants: ApplicantRow[] = [];

	if (db) {
		try {
			const applicantRows = await db
				.select()
				.from(applicants)
				.orderBy(desc(applicants.createdAt));

			const workflowRows = await db.select().from(workflows);
			const quoteRows = await db.select().from(quotes);

			const workflowsByApplicant = new Map<number, (typeof workflows.$inferSelect)>();
			for (const workflow of workflowRows.sort((a, b) => {
				const aTime = new Date(a.startedAt || 0).getTime();
				const bTime = new Date(b.startedAt || 0).getTime();
				return bTime - aTime;
			})) {
				if (!workflowsByApplicant.has(workflow.applicantId)) {
					workflowsByApplicant.set(workflow.applicantId, workflow);
				}
			}

			const quotesByWorkflow = new Map<number, (typeof quotes.$inferSelect)>();
			for (const quote of quoteRows.sort((a, b) => {
				const aTime = new Date(a.createdAt || 0).getTime();
				const bTime = new Date(b.createdAt || 0).getTime();
				return bTime - aTime;
			})) {
				if (!quotesByWorkflow.has(quote.workflowId)) {
					quotesByWorkflow.set(quote.workflowId, quote);
				}
			}

			allApplicants = applicantRows.map(applicant => {
				const workflow = workflowsByApplicant.get(applicant.id);
				const quote = workflow ? quotesByWorkflow.get(workflow.id) : null;
				return {
					id: applicant.id,
					companyName: applicant.companyName,
					contactName: applicant.contactName,
					email: applicant.email,
					status: applicant.status,
					industry: applicant.industry || "",
					employeeCount: applicant.employeeCount || 0,
					createdAt: applicant.createdAt,
					workflowId: workflow?.id ?? null,
					workflowStage: workflow?.stage ?? null,
					hasQuote: !!quote,
				};
			});
		} catch (error) {
			console.error("Failed to fetch applicants:", error);
		}
	}

	return (
		<DashboardLayout
			title="Applicants"
			description="Manage your applicants and their onboarding"
			actions={
				<Link href="/dashboard/applicants/new">
					<Button variant="secondary">
						<RiUserAddLine />
						New Applicant
					</Button>
				</Link>
			}>
			{/* Pipeline Stats */}
			<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
				{Object.entries(statusConfig).map(([status, config]) => {
					const count = allApplicants.filter(l => l.status === status).length;
					return (
						<div
							key={status}
							className={cn(
								"rounded-xl bg-secondary/2 border border-sidebar-border p-4 text-center",
								"transition-colors hover:bg-secondary/4"
							)}>
							<p className="text-2xl font-bold">{count}</p>
							<p className="text-xs text-muted-foreground">{config.label}</p>
						</div>
					);
				})}
			</div>

			{/* Applicants Table */}
			<DashboardSection title="All Applicants">
				<ApplicantsTable applicants={allApplicants} />
			</DashboardSection>
		</DashboardLayout>
	);
}
