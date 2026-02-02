"use client";

import type { DropResult } from "@hello-pangea/dnd";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
	RiCheckboxCircleLine,
	RiFileTextLine,
	RiMoreLine,
	RiShieldCheckLine,
} from "@remixicon/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { RiskBadge } from "../ui/status-badge";

export type PipelineWorkflow = {
	id: number | string;
	stage: string;
	clientName?: string;
	payload?: {
		riskLevel?: string;
		registrationNumber?: string;
		mandateType?: string;
	};
	startedAt?: string | Date;
};

// Define Pipeline Stages based on screenshot
const PIPELINE_STAGES = [
	{
		id: "new",
		title: "Applicant Engagement",
		color: "border-t-blue-400",
		icon: RiFileTextLine,
	},
	{
		id: "contracting",
		title: "Contracting",
		color: "border-t-purple-400",
		icon: RiFileTextLine,
	},
	{
		id: "fica_review",
		title: "FICA Review",
		color: "border-t-amber-400",
		icon: RiShieldCheckLine,
	},
	{
		id: "activation",
		title: "Activation",
		color: "border-t-emerald-400",
		icon: RiCheckboxCircleLine,
	},
];

export function PipelineView({
	workflows,
	onDragEnd,
}: {
	workflows: PipelineWorkflow[];
	onDragEnd?: (result: DropResult) => void;
}) {
	const [columns, setColumns] = useState<Record<string, PipelineWorkflow[]> | null>(null);

	useEffect(() => {
		const cols = PIPELINE_STAGES.reduce(
			(acc, stage) => {
				acc[stage.id] = workflows.filter(workflow => {
					const stageValue = workflow.stage;
					if (
						stage.id === "new" &&
						["new", "contacted", "qualified"].includes(stageValue)
					)
						return true;
					if (
						stage.id === "contracting" &&
						["proposal", "negotiation"].includes(stageValue)
					)
						return true;
					if (
						stage.id === "fica_review" &&
						["review", "fica_review"].includes(stageValue)
					)
						return true;
					if (stage.id === "activation" && ["won", "activation"].includes(stageValue))
						return true;
					return false;
				});
				return acc;
			},
			{} as Record<string, PipelineWorkflow[]>
		);
		setColumns(cols || {});
	}, [workflows]);

	if (!columns) return <div>Loading pipeline...</div>;

	const handleDragEnd = (result: DropResult) => {
		if (!result.destination) return;
		if (onDragEnd) onDragEnd(result);
	};

	return (
		<div className="h-full overflow-x-auto pb-4">
			<DragDropContext onDragEnd={handleDragEnd}>
				<div className="flex gap-6 min-w-[1000px]">
					{PIPELINE_STAGES.map(stage => (
						<div key={stage.id} className="flex-1 min-w-[280px] flex flex-col gap-4">
							{/* Column Header */}
							<div
								className={cn(
									"flex items-center justify-between p-4 rounded-xl shadow-sm border border-t-4 backdrop-blur-md",
									"bg-card/50 border-sidebar-border", // Dark mode friendly styling
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

							{/* Droppable Area */}
							<Droppable droppableId={stage.id}>
								{(provided, snapshot) => (
									<div
										{...provided.droppableProps}
										ref={provided.innerRef}
										className={cn(
											"flex-1 flex flex-col gap-3 transition-colors rounded-xl min-h-[100px]",
											snapshot.isDraggingOver ? "bg-secondary/10" : ""
										)}>
										{columns[stage.id]?.map((workflow, index) => (
											<Draggable
												key={workflow.id.toString()}
												draggableId={workflow.id.toString()}
												index={index}>
												{provided => (
													<div
														ref={provided.innerRef}
														{...provided.draggableProps}
														{...provided.dragHandleProps}
														style={{ ...provided.draggableProps.style }}>
														<PipelineCard workflow={workflow} />
													</div>
												)}
											</Draggable>
										))}
										{provided.placeholder}
									</div>
								)}
							</Droppable>
						</div>
					))}
				</div>
			</DragDropContext>
		</div>
	);
}

function PipelineCard({ workflow }: { workflow: PipelineWorkflow }) {
	return (
		<div className="bg-card/80 backdrop-blur-sm p-4 rounded-xl border border-sidebar-border shadow-sm hover:shadow-md transition-all group cursor-pointer relative hover:border-primary/20">
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
						{workflow.startedAt ? "2 days ago" : "Just now"}
					</span>
				</div>
			</div>

			{/* Action Menu (Hidden until Hover) */}
			<div className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6 text-muted-foreground hover:text-primary">
					<RiMoreLine className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
