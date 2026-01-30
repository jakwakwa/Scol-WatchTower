"use client";

import { useDashboardStore } from "@/lib/dashboard-store";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard"; // Using wrapper for consistency
import { GlassCard } from "@/components/dashboard";
import {
	RiShieldCheckLine,
	RiAlertLine,
	RiCheckboxCircleLine,
	RiTimeLine,
	RiSearchLine,
	RiFilter3Line,
} from "@remixicon/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RiskBadge, StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { PageMeta } from "@/components/dashboard/page-meta"; // Ensure metadata is set

// Mock data until API is wired
const MOCK_RISK_ASSESSMENTS = [
	{
		id: "1",
		companyName: "Durban Logistics Holdings",
		regNumber: "2024/009012/07",
		riskLevel: "medium",
		score: 65,
		flaggedItems: ["Directors Mismatch", "Bank Account Verification Pending"],
		status: "pending_review",
		date: "2024-05-15",
	},
	{
		id: "2",
		companyName: "Cape Trade Solutions",
		regNumber: "2024/001234/07",
		riskLevel: "low",
		score: 92,
		flaggedItems: [],
		status: "approved",
		date: "2024-05-14",
	},
	{
		id: "3",
		companyName: "Garden Route Trading",
		regNumber: "2024/011223/07",
		riskLevel: "high",
		score: 35,
		flaggedItems: ["CIPC Status Inactive", "Judgments Found"],
		status: "rejected",
		date: "2024-05-12",
	},
];

export default function RiskReviewPage() {
	const [searchTerm, setSearchTerm] = useState("");

	// In a real implementation, we would fetch data here using server actions or SWR
	// const { data } = useSWR('/api/risk-assessments', fetcher);

	return (
		<DashboardLayout
			title="Risk Review"
			description="Manage and approve high-risk client applications"
			actions={
				<Button variant="outline" className="gap-2">
					<RiFilter3Line className="h-4 w-4" />
					Filters
				</Button>
			}
		>
			{/* Search and Stats Bar */}
			<div className="flex flex-col md:flex-row gap-4 mb-6">
				<div className="relative flex-1">
					<RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search company, registration number..."
						className="pl-10 bg-card"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
				<div className="flex gap-4">
					<div className="flex items-center gap-2 px-4 py-2 bg-destructive/20 border border-rose-500/20 rounded-lg text-destructive-foreground">
						<RiAlertLine className="h-4 w-4" />
						<span className="text-sm font-bold">3 High Risk</span>
					</div>
					<div className="flex items-center gap-2 px-4 py-2 bg-warning/50 border border-warning rounded-lg text-warning-foreground">
						<RiTimeLine className="h-4 w-4" />
						<span className="text-sm font-bold">5 Pending</span>
					</div>
				</div>
			</div>

			{/* Risk Assessments Table/Cards */}
			<div className="space-y-4">
				{MOCK_RISK_ASSESSMENTS.map((assessment) => (
					<GlassCard
						key={assessment.id}
						className="group hover:border-primary/30 transition-all cursor-pointer"
					>
						<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
							{/* Company Info */}
							<div className="flex items-start gap-4">
								<div
									className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
										assessment.riskLevel === "high"
											? "bg-rose-100 text-destructive-foreground"
											: assessment.riskLevel === "medium"
												? "bg-warning text-warning-foreground"
												: "bg-emerald-100 text-emerald-600"
									}`}
								>
									<RiShieldCheckLine className="h-6 w-6" />
								</div>
								<div>
									<h3 className="font-semibold text-muted-foreground group-hover:text-muted-foreground/70 transition-colors leading-normal">
										{assessment.companyName}
									</h3>
									<p className="text-sm text-muted-foreground font-mono">
										{assessment.regNumber}
									</p>
								</div>
							</div>

							{/* Risk Indicators */}
							<div className="flex flex-col md:items-end gap-1">
								<div className="flex items-center gap-2">
									<span className="text-sm text-muted-foreground">
										Risk Score:
									</span>
									<span
										className={`font-mono font-bold text-lg ${
											assessment.score < 50
												? "text-destructive-foreground"
												: assessment.score < 80
													? "text-warning-foreground"
													: "text-emerald-500"
										}`}
									>
										{assessment.score}/100
									</span>
								</div>
								<div className="flex items-center gap-2">
									<RiskBadge level={assessment.riskLevel} />
									<StatusBadge
										status={
											assessment.status === "approved"
												? "success"
												: assessment.status === "rejected"
													? "error"
													: "warning"
										}
									>
										{assessment.status.replace("_", " ")}
									</StatusBadge>
								</div>
							</div>

							{/* Action Button */}
							<div className="flex items-center gap-2 md:border-l border-border md:pl-6">
								<Link href={`/dashboard/leads/${assessment.id}?tab=risk`}>
									<Button size="sm" variant="secondary">
										Review
									</Button>
								</Link>
							</div>
						</div>

						{/* Flagged Items Footer */}
						{assessment.flaggedItems.length > 0 && (
							<div className="mt-4 pt-4 border-t border-border/50">
								<div className="flex flex-wrap gap-2">
									{assessment.flaggedItems.map((item) => (
										<span
											key={`${assessment.id}-${item}`}
											className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/5 border border-rose-500/10 text-destructive-foreground text-xs"
										>
											<RiAlertLine className="h-3 w-3" />
											{item}
										</span>
									))}
								</div>
							</div>
						)}
					</GlassCard>
				))}
			</div>
		</DashboardLayout>
	);
}
