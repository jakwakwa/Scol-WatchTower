"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
	RiShieldCheckLine,
	RiAlertLine,
	RiUserLine,
	RiTimeLine,
	RiCheckLine,
	RiCloseLine,
	RiFileTextLine,
	RiBankLine,
	RiBuilding2Line,
	RiPercentLine,
	RiDownloadLine,
	RiExternalLinkLine,
	RiHistoryLine,
	RiEyeLine,
} from "@remixicon/react";
import type { RiskReviewItem } from "./risk-review-queue";

// ============================================
// Types
// ============================================

interface RiskReviewDetailProps {
	item: RiskReviewItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onApprove: (id: number, reason?: string) => Promise<void>;
	onReject: (id: number, reason: string) => Promise<void>;
}

interface TimelineEvent {
	id: string;
	type:
		| "stage_change"
		| "agent_dispatch"
		| "agent_callback"
		| "human_override"
		| "error";
	title: string;
	description: string;
	timestamp: Date;
	actor?: string;
}

// ============================================
// Helper Functions
// ============================================

function getSeverityColor(severity: string): string {
	switch (severity) {
		case "LOW":
			return "bg-blue-500/10 text-blue-400 border-blue-500/20";
		case "MEDIUM":
			return "bg-warning/50 text-warning-foreground border-warning";
		case "HIGH":
			return "bg-orange-500/10 text-orange-400 border-orange-500/20";
		case "CRITICAL":
			return "bg-red-500/10 text-red-400 border-red-500/20";
		default:
			return "bg-secondary/10 text-muted-foreground";
	}
}

function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("en-ZA", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

// ============================================
// Metric Card Component
// ============================================

function MetricCard({
	icon: Icon,
	label,
	value,
	status,
}: {
	icon: React.ElementType;
	label: string;
	value: React.ReactNode;
	status?: "good" | "warning" | "danger" | "neutral";
}) {
	const statusColors = {
		good: "text-emerald-400",
		warning: "text-warning-foreground",
		danger: "text-red-400",
		neutral: "text-muted-foreground",
	};

	return (
		<div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/5 border border-secondary/10">
			<div className="p-2 rounded-lg bg-secondary/10">
				<Icon className="h-4 w-4 text-muted-foreground" />
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-[10px] uppercase tracking-wider text-muted-foreground">
					{label}
				</p>
				<p
					className={cn(
						"text-sm font-semibold",
						status && statusColors[status],
					)}
				>
					{value}
				</p>
			</div>
		</div>
	);
}

// ============================================
// Document Card Component
// ============================================

function DocumentCard({
	name,
	type,
	verified,
	uploadDate,
	onView,
}: {
	name: string;
	type: string;
	verified: boolean;
	uploadDate?: Date;
	onView?: () => void;
}) {
	return (
		<div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/5 border border-secondary/10 hover:bg-secondary/10 transition-colors">
			<div
				className={cn(
					"p-2 rounded-lg",
					verified ? "bg-emerald-500/10" : "bg-warning/50",
				)}
			>
				<RiFileTextLine
					className={cn(
						"h-5 w-5",
						verified ? "text-emerald-400" : "text-warning-foreground",
					)}
				/>
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium truncate">{name}</p>
				<div className="flex items-center gap-2 text-[10px] text-muted-foreground">
					<span>{type}</span>
					{uploadDate && (
						<>
							<span>•</span>
							<span>{formatDate(uploadDate)}</span>
						</>
					)}
				</div>
			</div>
			<div className="flex items-center gap-2">
				{verified ? (
					<Badge
						variant="outline"
						className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]"
					>
						Verified
					</Badge>
				) : (
					<Badge
						variant="outline"
						className="bg-warning/50 text-warning-foreground border-warning text-[10px]"
					>
						Pending
					</Badge>
				)}
				{onView && (
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						onClick={onView}
					>
						<RiEyeLine className="h-3.5 w-3.5" />
					</Button>
				)}
			</div>
		</div>
	);
}

// ============================================
// Timeline Event Component
// ============================================

function TimelineEventCard({ event }: { event: TimelineEvent }) {
	const typeConfig = {
		stage_change: {
			icon: RiHistoryLine,
			color: "text-blue-400",
			bg: "bg-blue-500/10",
		},
		agent_dispatch: {
			icon: RiExternalLinkLine,
			color: "text-purple-400",
			bg: "bg-purple-500/10",
		},
		agent_callback: {
			icon: RiCheckLine,
			color: "text-emerald-400",
			bg: "bg-emerald-500/10",
		},
		human_override: {
			icon: RiUserLine,
			color: "text-warning-foreground",
			bg: "bg-warning/50",
		},
		error: { icon: RiAlertLine, color: "text-red-400", bg: "bg-red-500/10" },
	};

	const config = typeConfig[event.type];
	const Icon = config.icon;

	return (
		<div className="flex gap-3">
			<div className={cn("p-1.5 rounded-lg h-fit", config.bg)}>
				<Icon className={cn("h-3.5 w-3.5", config.color)} />
			</div>
			<div className="flex-1 min-w-0 pb-4">
				<div className="flex items-start justify-between gap-2">
					<p className="text-sm font-medium">{event.title}</p>
					<span className="text-[10px] text-muted-foreground whitespace-nowrap">
						{formatDate(event.timestamp)}
					</span>
				</div>
				<p className="text-xs text-muted-foreground mt-0.5">
					{event.description}
				</p>
				{event.actor && (
					<p className="text-[10px] text-muted-foreground/70 mt-1">
						By: {event.actor}
					</p>
				)}
			</div>
		</div>
	);
}

// ============================================
// Risk Review Detail Sheet
// ============================================

export function RiskReviewDetail({
	item,
	open,
	onOpenChange,
	onApprove,
	onReject,
}: RiskReviewDetailProps) {
	const [activeTab, setActiveTab] = React.useState("overview");

	// Mock timeline events - in production, fetch from API
	const mockTimeline: TimelineEvent[] = item
		? [
				{
					id: "1",
					type: "stage_change",
					title: "Workflow Started",
					description: "Applicant captured and workflow initiated",
					timestamp: item.createdAt,
					actor: "System",
				},
				{
					id: "2",
					type: "agent_dispatch",
					title: "ITC Check Initiated",
					description: `Credit score returned: ${item.itcScore || "Pending"}`,
					timestamp: new Date(item.createdAt.getTime() + 60000),
					actor: "ITC Service",
				},
				{
					id: "3",
					type: "stage_change",
					title: "FICA Documents Received",
					description: "Bank statement and accountant letter uploaded",
					timestamp: new Date(item.createdAt.getTime() + 3600000),
				},
				{
					id: "4",
					type: "agent_callback",
					title: "AI FICA Analysis Complete",
					description: `Trust score: ${item.aiTrustScore}%. Recommendation: ${item.recommendation || "Manual Review"}`,
					timestamp: new Date(item.createdAt.getTime() + 3660000),
					actor: "FICA AI Agent",
				},
				{
					id: "5",
					type: "human_override",
					title: "Awaiting Risk Manager Decision",
					description: "Workflow paused for human review",
					timestamp: new Date(),
				},
			]
		: [];

	if (!item) return null;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full sm:max-w-xl border-secondary/20 bg-zinc-900/95 backdrop-blur-xl overflow-y-auto">
				<SheetHeader className="pb-4">
					<div className="flex items-start justify-between">
						<div>
							<SheetTitle className="text-xl">{item.clientName}</SheetTitle>
							<SheetDescription className="flex items-center gap-2 mt-1">
								<RiBuilding2Line className="h-3.5 w-3.5" />
								{item.companyName}
								<span className="text-muted-foreground">•</span>
								<Badge variant="secondary" className="text-[10px]">
									WF-{item.workflowId}
								</Badge>
							</SheetDescription>
						</div>
						<div
							className={cn(
								"px-3 py-1.5 rounded-lg text-center",
								item.aiTrustScore && item.aiTrustScore >= 80
									? "bg-emerald-500/10"
									: item.aiTrustScore && item.aiTrustScore >= 60
										? "bg-warning/50"
										: "bg-red-500/10",
							)}
						>
							<p className="text-2xl font-bold">{item.aiTrustScore || "?"}</p>
							<p className="text-[10px] text-muted-foreground">AI Score</p>
						</div>
					</div>
				</SheetHeader>

				<Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
					<TabsList className="w-full bg-secondary/10">
						<TabsTrigger value="overview" className="flex-1 text-xs">
							Overview
						</TabsTrigger>
						<TabsTrigger value="documents" className="flex-1 text-xs">
							Documents
						</TabsTrigger>
						<TabsTrigger value="risks" className="flex-1 text-xs">
							Risk Flags
						</TabsTrigger>
						<TabsTrigger value="timeline" className="flex-1 text-xs">
							Timeline
						</TabsTrigger>
					</TabsList>

					{/* Overview Tab */}
					<TabsContent value="overview" className="mt-4 space-y-4">
						{/* Key Metrics */}
						<div className="grid grid-cols-2 gap-3">
							<MetricCard
								icon={RiPercentLine}
								label="AI Trust Score"
								value={`${item.aiTrustScore || 0}%`}
								status={
									(item.aiTrustScore || 0) >= 80
										? "good"
										: (item.aiTrustScore || 0) >= 60
											? "warning"
											: "danger"
								}
							/>
							<MetricCard
								icon={RiBankLine}
								label="ITC Credit Score"
								value={item.itcScore || "N/A"}
								status={
									(item.itcScore || 0) >= 700
										? "good"
										: (item.itcScore || 0) >= 600
											? "warning"
											: "danger"
								}
							/>
							<MetricCard
								icon={RiAlertLine}
								label="Risk Flags"
								value={item.riskFlags?.length || 0}
								status={
									(item.riskFlags?.length || 0) === 0 ? "good" : "warning"
								}
							/>
							<MetricCard
								icon={RiShieldCheckLine}
								label="Name Match"
								value={item.nameMatchVerified ? "Verified" : "Mismatch"}
								status={item.nameMatchVerified ? "good" : "danger"}
							/>
						</div>

						{/* AI Summary */}
						{item.summary && (
							<div className="p-4 rounded-lg bg-secondary/5 border border-secondary/10">
								<h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
									<RiShieldCheckLine className="h-4 w-4 text-primary" />
									AI Analysis Summary
								</h4>
								<p className="text-sm text-muted-foreground leading-relaxed">
									{item.summary}
								</p>
							</div>
						)}

						{/* Recommendation */}
						<div className="p-4 rounded-lg bg-secondary/5 border border-secondary/10">
							<h4 className="text-sm font-semibold mb-2">Recommendation</h4>
							<Badge
								className={cn(
									"text-xs",
									item.recommendation === "APPROVE"
										? "bg-emerald-500/10 text-emerald-400"
										: item.recommendation === "MANUAL_REVIEW"
											? "bg-warning/50 text-warning-foreground"
											: "bg-red-500/10 text-red-400",
								)}
							>
								{item.recommendation || "Manual Review Required"}
							</Badge>
						</div>
					</TabsContent>

					{/* Documents Tab */}
					<TabsContent value="documents" className="mt-4 space-y-3">
						<DocumentCard
							name="Bank Statement - Jan to Mar 2026"
							type="Bank Statement"
							verified={item.bankStatementVerified || false}
							uploadDate={item.createdAt}
						/>
						<DocumentCard
							name="Accountant Letter"
							type="Verification Letter"
							verified={item.accountantLetterVerified || false}
							uploadDate={item.createdAt}
						/>
						<DocumentCard
							name="Company Registration"
							type="CIPC Document"
							verified={true}
							uploadDate={item.createdAt}
						/>
					</TabsContent>

					{/* Risk Flags Tab */}
					<TabsContent value="risks" className="mt-4 space-y-3">
						{item.riskFlags && item.riskFlags.length > 0 ? (
							item.riskFlags.map((flag, idx) => (
								<div
									key={idx}
									className="p-4 rounded-lg bg-secondary/5 border border-secondary/10"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex-1">
											<div className="flex items-center gap-2">
												<Badge
													variant="outline"
													className={cn(
														"text-[10px]",
														getSeverityColor(flag.severity),
													)}
												>
													{flag.severity}
												</Badge>
												<h4 className="text-sm font-semibold">
													{flag.type.replace(/_/g, " ")}
												</h4>
											</div>
											<p className="text-sm text-muted-foreground mt-2">
												{flag.description}
											</p>
										</div>
									</div>
								</div>
							))
						) : (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<div className="p-3 rounded-full bg-emerald-500/10 mb-3">
									<RiCheckLine className="h-6 w-6 text-emerald-400" />
								</div>
								<p className="text-sm font-medium">No Risk Flags</p>
								<p className="text-xs text-muted-foreground mt-1">
									No concerning patterns detected
								</p>
							</div>
						)}
					</TabsContent>

					{/* Timeline Tab */}
					<TabsContent value="timeline" className="mt-4">
						<div className="relative pl-2 border-l border-secondary/20 ml-2">
							{mockTimeline.map((event) => (
								<TimelineEventCard key={event.id} event={event} />
							))}
						</div>
					</TabsContent>
				</Tabs>

				{/* Action Buttons - Always visible */}
				<Separator className="my-6 bg-secondary/10" />
				<div className="flex gap-3">
					<Button
						variant="outline"
						className="flex-1 border-red-500/20 text-red-400 hover:bg-red-500/10"
						onClick={() => {
							// Would open reject dialog
						}}
					>
						<RiCloseLine className="h-4 w-4 mr-2" />
						Reject
					</Button>
					<Button
						className="flex-1 bg-emerald-600 hover:bg-emerald-700"
						onClick={() => {
							// Would open approve dialog
						}}
					>
						<RiCheckLine className="h-4 w-4 mr-2" />
						Approve
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}

export default RiskReviewDetail;
