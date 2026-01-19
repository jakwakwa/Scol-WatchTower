"use client";

import { useState } from "react";
import {
	RiCheckLine,
	RiTimeLine,
	RiUserLine,
	RiAlertLine,
	RiExpandUpDownLine,
	RiCloseLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Types
interface WorkflowRow {
	id: number;
	clientName: string;
	stage: 1 | 2 | 3 | 4;
	stageName: string;
	status:
		| "pending"
		| "in_progress"
		| "awaiting_human"
		| "completed"
		| "failed"
		| "timeout";
	currentAgent?: string;
	startedAt: Date;
	payload?: Record<string, unknown>;
}

const stageLabels = {
	1: "Lead Capture",
	2: "Quotation",
	3: "Verification",
	4: "Integration",
};

const statusConfig = {
	pending: { label: "Pending", color: "secondary", icon: RiTimeLine },
	in_progress: {
		label: "In Progress",
		color: "default",
		icon: RiTimeLine,
		pulse: true,
	},
	awaiting_human: {
		label: "Awaiting Human",
		color: "warning",
		icon: RiUserLine,
		pulse: true,
	},
	completed: { label: "Completed", color: "success", icon: RiCheckLine },
	failed: { label: "Failed", color: "destructive", icon: RiAlertLine },
	timeout: { label: "Timeout", color: "destructive", icon: RiAlertLine },
} as const;

// Workflow Stage Indicator
interface WorkflowStageIndicatorProps {
	currentStage: 1 | 2 | 3 | 4;
	compact?: boolean;
}

export function WorkflowStageIndicator({
	currentStage,
	compact = false,
}: WorkflowStageIndicatorProps) {
	const stages = [1, 2, 3, 4] as const;

	return (
		<div className="flex items-center gap-1">
			{stages.map((stage, index) => (
				<div key={stage} className="flex items-center">
					<div
						className={cn(
							"flex items-center justify-center rounded-full font-medium transition-all",
							compact ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm",
							stage < currentStage && "bg-emerald-500/20 text-emerald-400",
							stage === currentStage &&
								"bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/30",
							stage > currentStage && "bg-white/5 text-muted-foreground",
						)}
					>
						{stage < currentStage ? (
							<RiCheckLine className={compact ? "h-3 w-3" : "h-4 w-4"} />
						) : (
							stage
						)}
					</div>
					{index < stages.length - 1 && (
						<div
							className={cn(
								"h-0.5 transition-colors",
								compact ? "w-3" : "w-6",
								stage < currentStage ? "bg-emerald-500/40" : "bg-white/10",
							)}
						/>
					)}
				</div>
			))}
		</div>
	);
}

// Status Badge with optional pulse animation
interface StatusBadgeProps {
	status: keyof typeof statusConfig;
}

export function StatusBadge({ status }: StatusBadgeProps) {
	const config = statusConfig[status];
	const Icon = config.icon;
	const hasPulse = "pulse" in config && config.pulse;

	return (
		<Badge
			variant={
				config.color as "default" | "secondary" | "destructive" | "outline"
			}
			className={cn("gap-1.5", hasPulse && "animate-pulse")}
		>
			<Icon className="h-3 w-3" />
			{config.label}
		</Badge>
	);
}

// Main Workflow Table
interface WorkflowTableProps {
	workflows: WorkflowRow[];
	onViewPayload?: (workflow: WorkflowRow) => void;
}

export function WorkflowTable({
	workflows,
	onViewPayload,
}: WorkflowTableProps) {
	const [expandedId, setExpandedId] = useState<number | null>(null);

	if (workflows.length === 0) {
		return (
			<div className="rounded-2xl border border-white/5 bg-card/50 p-12 text-center">
				<RiFlowChart className="mx-auto h-12 w-12 text-muted-foreground/50" />
				<h3 className="mt-4 text-lg font-medium">No workflows yet</h3>
				<p className="mt-2 text-sm text-muted-foreground">
					Create a new lead to start an onboarding workflow.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-white/5 bg-card/50 overflow-hidden">
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-b border-white/5 bg-white/[0.02]">
							<th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Client
							</th>
							<th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Progress
							</th>
							<th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Status
							</th>
							<th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Agent
							</th>
							<th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Started
							</th>
							<th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/5">
						{workflows.map((workflow) => (
							<>
								<tr
									key={workflow.id}
									className={cn(
										"transition-colors hover:bg-white/[0.02]",
										expandedId === workflow.id && "bg-white/[0.02]",
									)}
								>
									<td className="px-6 py-4">
										<div className="font-medium">{workflow.clientName}</div>
										<div className="text-sm text-muted-foreground">
											#{workflow.id}
										</div>
									</td>
									<td className="px-6 py-4">
										<WorkflowStageIndicator
											currentStage={workflow.stage}
											compact
										/>
									</td>
									<td className="px-6 py-4">
										<StatusBadge status={workflow.status} />
									</td>
									<td className="px-6 py-4">
										<code className="rounded bg-white/5 px-2 py-1 text-xs text-muted-foreground">
											{workflow.currentAgent || "—"}
										</code>
									</td>
									<td className="px-6 py-4 text-sm text-muted-foreground">
										{formatRelativeTime(workflow.startedAt)}
									</td>
									<td className="px-6 py-4 text-right">
										<button
											onClick={() =>
												setExpandedId(
													expandedId === workflow.id ? null : workflow.id,
												)
											}
											className={cn(
												"inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
												"text-muted-foreground hover:bg-white/5 hover:text-foreground",
											)}
										>
											<RiExpandUpDownLine className="h-4 w-4" />
										</button>
									</td>
								</tr>

								{/* Expanded row with JSON payload */}
								{expandedId === workflow.id && workflow.payload && (
									<tr key={`${workflow.id}-expanded`}>
										<td colSpan={6} className="bg-black/20 px-6 py-4">
											<div className="flex items-start justify-between">
												<div>
													<h4 className="text-sm font-medium mb-2">
														Workflow Payload
													</h4>
													<pre className="rounded-lg bg-black/40 p-4 text-xs text-muted-foreground overflow-x-auto">
														{JSON.stringify(workflow.payload, null, 2)}
													</pre>
												</div>
												<button
													onClick={() => setExpandedId(null)}
													className="text-muted-foreground hover:text-foreground"
												>
													<RiCloseLine className="h-5 w-5" />
												</button>
											</div>
										</td>
									</tr>
								)}
							</>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

// Import the icon we forgot
import { RiFlowChart } from "@remixicon/react";

// Helper function
function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	return `${days}d ago`;
}
