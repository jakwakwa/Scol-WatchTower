import Link from "next/link";
import { RiUserAddLine, RiArrowRightLine, RiMoreLine } from "@remixicon/react";
import {
	DashboardLayout,
	DashboardSection,
	GlassCard,
} from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Mock data - will be replaced with real data from DB
const mockLeads = [
	{
		id: 1,
		companyName: "TechCorp SA",
		contactName: "John Smith",
		email: "john@techcorp.co.za",
		status: "qualified",
		industry: "Technology",
		employeeCount: 250,
		createdAt: new Date(Date.now() - 86400000 * 2),
	},
	{
		id: 2,
		companyName: "Financial Solutions Ltd",
		contactName: "Sarah Johnson",
		email: "sarah@finsol.co.za",
		status: "proposal",
		industry: "Financial Services",
		employeeCount: 120,
		createdAt: new Date(Date.now() - 86400000 * 5),
	},
	{
		id: 3,
		companyName: "Mining Resources PTY",
		contactName: "Peter Williams",
		email: "peter@mining.co.za",
		status: "won",
		industry: "Mining",
		employeeCount: 800,
		createdAt: new Date(Date.now() - 86400000 * 10),
	},
	{
		id: 4,
		companyName: "Retail Holdings",
		contactName: "Mary Brown",
		email: "mary@retail.co.za",
		status: "new",
		industry: "Retail",
		employeeCount: 450,
		createdAt: new Date(Date.now() - 3600000 * 6),
	},
	{
		id: 5,
		companyName: "Logistics Partners",
		contactName: "David Lee",
		email: "david@logistics.co.za",
		status: "contacted",
		industry: "Logistics",
		employeeCount: 180,
		createdAt: new Date(Date.now() - 86400000),
	},
];

const statusConfig = {
	new: { label: "New", color: "bg-blue-500/20 text-blue-400" },
	contacted: { label: "Contacted", color: "bg-purple-500/20 text-purple-400" },
	qualified: { label: "Qualified", color: "bg-amber-500/20 text-amber-400" },
	proposal: { label: "Proposal", color: "bg-orange-500/20 text-orange-400" },
	negotiation: { label: "Negotiation", color: "bg-pink-500/20 text-pink-400" },
	won: { label: "Won", color: "bg-emerald-500/20 text-emerald-400" },
	lost: { label: "Lost", color: "bg-red-500/20 text-red-400" },
} as const;

export default function LeadsPage() {
	return (
		<DashboardLayout
			title="Leads"
			description="Manage your potential clients"
			actions={
				<Link href="/dashboard/leads/new">
					<Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
						<RiUserAddLine className="h-4 w-4" />
						New Lead
					</Button>
				</Link>
			}
		>
			{/* Pipeline Stats */}
			<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
				{Object.entries(statusConfig).map(([status, config]) => {
					const count = mockLeads.filter((l) => l.status === status).length;
					return (
						<div
							key={status}
							className={cn(
								"rounded-xl bg-white/[0.02] border border-white/5 p-4 text-center",
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
				<div className="rounded-2xl border border-white/5 bg-card/50 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-white/5 bg-white/[0.02]">
									<th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Company
									</th>
									<th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Contact
									</th>
									<th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Industry
									</th>
									<th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Employees
									</th>
									<th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Status
									</th>
									<th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{mockLeads.map((lead) => {
									const config =
										statusConfig[lead.status as keyof typeof statusConfig];
									return (
										<tr
											key={lead.id}
											className="transition-colors hover:bg-white/[0.02]"
										>
											<td className="px-6 py-4">
												<div className="font-medium">{lead.companyName}</div>
											</td>
											<td className="px-6 py-4">
												<div className="text-sm">{lead.contactName}</div>
												<div className="text-xs text-muted-foreground">
													{lead.email}
												</div>
											</td>
											<td className="px-6 py-4 text-sm text-muted-foreground">
												{lead.industry}
											</td>
											<td className="px-6 py-4 text-sm">
												{lead.employeeCount.toLocaleString()}
											</td>
											<td className="px-6 py-4">
												<span
													className={cn(
														"inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
														config.color,
													)}
												>
													{config.label}
												</span>
											</td>
											<td className="px-6 py-4 text-right">
												<div className="flex items-center justify-end gap-2">
													<Button variant="ghost" size="sm" className="gap-1.5">
														Start Workflow
														<RiArrowRightLine className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8"
													>
														<RiMoreLine className="h-4 w-4" />
													</Button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			</DashboardSection>
		</DashboardLayout>
	);
}
