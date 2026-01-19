import Link from "next/link";
import { RiUserAddLine } from "@remixicon/react";
import {
	DashboardLayout,
	DashboardSection,
	GlassCard,
	LeadsTable,
} from "@/components/dashboard";
import { Button } from "@/components/ui/button";
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
	qualified: { label: "Qualified", color: "bg-stone-500/20 text-stone-400" },
	proposal: { label: "Proposal", color: "bg-stone-500/20 text-stone-400" },
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
					<Button className="gap-2 bg-gradient-to-r from-stone-500 to-stone-500 hover:from-stone-600 hover:to-stone-600">
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
				<LeadsTable leads={mockLeads} />
			</DashboardSection>
		</DashboardLayout>
	);
}
