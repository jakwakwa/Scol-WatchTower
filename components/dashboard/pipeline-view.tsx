"use client";

import {
	RiCheckboxCircleLine,
	RiCheckLine,
	RiContractLine,
	RiEditLine,
	RiFileTextLine,
	RiFlowChart,
	RiMoneyDollarCircleLine,
	RiMoreLine,
	RiRobot2Line,
	RiUserLine,
} from "@remixicon/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { RiskBadge } from "../ui/status-badge";

export type PipelineWorkflow = {
	id: number | string;
	stage: string;
	status?: string;
	clientName?: string;
	applicantId?: number;
	hasQuote?: boolean;
	payload?: {
		riskLevel?: string;
		registrationNumber?: string;
		mandateType?: string;
	};
	startedAt?: string | Date;
};

/**
 * V2 Workflow Pipeline Stages (6-stage system)
 * Maps to the workflow stage numbers: 1-6
 */
const PIPELINE_STAGES = [
	{
		id: "entry_quote",
		stageNumber: 1,
		title: "Entry & Quote",
		color: "border-t-blue-400",
		icon: RiMoneyDollarCircleLine,
		shortTitle: "Entry",
	},
	{
		id: "quote_signing",
		stageNumber: 2,
		title: "Quote Signing",
		color: "border-t-indigo-400",
		icon: RiEditLine,
		shortTitle: "Signing",
	},
	{
		id: "mandate_processing",
		stageNumber: 3,
		title: "Mandate Processing",
		color: "border-t-purple-400",
		icon: RiFileTextLine,
		shortTitle: "Mandate",
	},
	{
		id: "ai_analysis",
		stageNumber: 4,
		title: "AI Analysis",
		color: "border-t-amber-400",
		icon: RiRobot2Line,
		shortTitle: "Analysis",
	},
	{
		id: "contract_forms",
		stageNumber: 5,
		title: "Contract & Forms",
		color: "border-t-orange-400",
		icon: RiContractLine,
		shortTitle: "Contract",
	},
	{
		id: "completion",
		stageNumber: 6,
		title: "Completion",
		color: "border-t-emerald-400",
		icon: RiCheckboxCircleLine,
		shortTitle: "Complete",
	},
];

export function PipelineView({
	workflows,
}: {
	workflows: PipelineWorkflow[];
}) {
	const [columns, setColumns] = useState<Record<string, PipelineWorkflow[]> | null>(null);

	useEffect(() => {
		const cols = PIPELINE_STAGES.reduce(
			(acc, stage) => {
				acc[stage.id] = workflows.filter(workflow => {
					// Handle both string stage names and numeric stage numbers
					const stageValue = workflow.stage;

					// Numeric stage matching (V2 workflow)
					if (typeof stageValue === "number" || !Number.isNaN(Number(stageValue))) {
						return Number(stageValue) === stage.stageNumber;
					}

					// Legacy string-based stage matching for backwards compatibility
					const stageString = String(stageValue).toLowerCase();
					switch (stage.id) {
						case "entry_quote":
							return [
								"new",
								"contacted",
								"qualified",
								"lead_capture",
								"entry",
							].includes(stageString);
						case "quote_signing":
							return ["proposal", "quotation", "quote_signing", "signing"].includes(
								stageString
							);
						case "mandate_processing":
							return [
								"negotiation",
								"mandate",
								"mandate_processing",
								"verification",
							].includes(stageString);
						case "ai_analysis":
							return ["review", "fica_review", "ai_analysis", "analysis"].includes(
								stageString
							);
						case "contract_forms":
							return ["contract", "contract_forms", "absa_form", "forms"].includes(
								stageString
							);
						case "completion":
							return [
								"won",
								"activation",
								"completed",
								"integration",
								"completion",
							].includes(stageString);
						default:
							return false;
					}
				});
				return acc;
			},
			{} as Record<string, PipelineWorkflow[]>
		);
		setColumns(cols || {});
	}, [workflows]);

	if (!columns) return <div>Loading pipeline...</div>;

	return (
		<div className="h-full overflow-x-auto pb-4">
			{/* 6-column layout with reduced gaps for smaller screens */}
			<div className="flex gap-3 lg:gap-4 min-w-[1200px]">
				{PIPELINE_STAGES.map(stage => (
					<div
						key={stage.id}
						className="flex-1 min-w-[180px] max-w-[240px] flex flex-col gap-3">
						{/* Column Header */}
						<div
							className={cn(
								"flex items-center justify-between p-4 rounded-xl shadow-sm border border-t-4 backdrop-blur-md",
								"bg-card/50 border-sidebar-border",
								stage.color
							)}>
							<div className="flex items-center gap-2">
								<stage.icon className="h-5 w-5 text-muted-foreground" />
								<h3 className="font-bold text-foreground">{stage.title}</h3>
							</div>
							<span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary/20 text-xs font-bold text-muted-foreground border border-sidebar-border">
								{columns[stage.id]?.length || 0}
							</span>
						</div>

						{/* Static Card List (drag-and-drop disabled) */}
						<div className="flex-1 flex flex-col gap-3 rounded-xl min-h-[100px]">
							{columns[stage.id]?.map(workflow => (
								<PipelineCard key={workflow.id.toString()} workflow={workflow} />
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function formatRelativeTime(date?: string | Date): string {
	if (!date) return "Just now";
	const now = new Date();
	const d = typeof date === "string" ? new Date(date) : date;
	const diff = now.getTime() - d.getTime();
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	return `${days}d ago`;
}

function PipelineCard({ workflow }: { workflow: PipelineWorkflow }) {
	const stageNumber =
		typeof workflow.stage === "number"
			? workflow.stage
			: Number.isNaN(Number(workflow.stage))
				? 1
				: Number(workflow.stage);
	const canViewQuote = stageNumber >= 2 && workflow.hasQuote;

	return (
		<div className="bg-card/80 backdrop-blur-sm p-4 rounded-xl border border-sidebar-border shadow-sm hover:shadow-md transition-all group relative hover:border-primary/20">
			{/* Header: Company Name & Risk if applicable */}
			<div className="flex justify-between items-start mb-2">
				<h4 className="font-bold text-foreground text-sm leading-tight line-clamp-2 pr-6">
					{workflow.clientName || "Unknown Company"}
				</h4>
				{workflow.payload?.riskLevel && <RiskBadge level={workflow.payload.riskLevel} />}
			</div>

			{/* Subtitle: Registration Number */}
			<p className="text-xs text-muted-foreground font-mono mb-4">
				{workflow.payload?.registrationNumber || "No Reg #"}
			</p>

			{/* Footer: Details & Time */}
			<div className="flex items-center justify-between pt-3 border-t border-sidebar-border/50 mt-2">
				<div className="flex flex-col">
					<span className="text-[10px] text-muted-foreground uppercase tracking-wide">
						Mandate
					</span>
					<span className="text-xs font-medium text-foreground/80">
						{workflow.payload?.mandateType || "Debit Order"}
					</span>
				</div>

				<div className="flex flex-col items-end">
					<span className="text-[10px] text-muted-foreground uppercase tracking-wide">
						Updated
					</span>
					<span className="text-xs text-muted-foreground">
						{formatRelativeTime(workflow.startedAt)}
					</span>
				</div>
			</div>

			{/* Action Menu (Hidden until Hover) */}
			<div className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6 text-muted-foreground hover:text-primary">
							<RiMoreLine className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-[180px]">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						{workflow.applicantId && (
							<DropdownMenuItem asChild>
								<Link
									href={`/dashboard/applicants/${workflow.applicantId}`}
									className="cursor-pointer flex items-center">
									<RiUserLine className="mr-2 h-4 w-4" />
									View Applicant
								</Link>
							</DropdownMenuItem>
						)}
						<DropdownMenuItem asChild>
							<Link
								href={`/dashboard/workflows/${workflow.id}`}
								className="cursor-pointer flex items-center">
								<RiFlowChart className="mr-2 h-4 w-4" />
								View Workflow
							</Link>
						</DropdownMenuItem>
						{canViewQuote && workflow.applicantId && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<Link
										href={`/dashboard/applicants/${workflow.applicantId}/quote`}
										className="cursor-pointer flex items-center">
										<RiCheckLine className="mr-2 h-4 w-4" />
										View Quote
									</Link>
								</DropdownMenuItem>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
