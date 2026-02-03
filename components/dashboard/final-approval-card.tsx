"use client";

import { useState } from "react";
import {
	RiCheckLine,
	RiCheckboxCircleLine,
	RiLoader4Line,
	RiCheckboxBlankCircleLine,
	RiFileTextLine,
	RiContractLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

interface FinalApprovalProps {
	workflowId: number;
	applicantId: number;
	/** Whether the contract has been signed */
	contractSigned: boolean;
	/** Whether the Absa 6995 form is complete */
	absaFormComplete: boolean;
	/** Current workflow status */
	workflowStatus?: string;
	/** Callback when approval is successful */
	onApprovalComplete?: () => void;
}

interface ChecklistItem {
	id: string;
	label: string;
	description: string;
	checked: boolean;
	icon: React.ElementType;
}

// ============================================
// Checklist Item Component
// ============================================

function ChecklistItemRow({
	item,
	isLast,
}: {
	item: ChecklistItem;
	isLast: boolean;
}) {
	const Icon = item.icon;
	const CheckIcon = item.checked
		? RiCheckboxCircleLine
		: RiCheckboxBlankCircleLine;

	return (
		<div
			className={cn(
				"flex items-start gap-3 py-3",
				!isLast && "border-b border-secondary/10"
			)}>
			<div
				className={cn(
					"p-2 rounded-lg shrink-0",
					item.checked ? "bg-emerald-500/10" : "bg-muted"
				)}>
				<Icon
					className={cn(
						"h-4 w-4",
						item.checked ? "text-emerald-400" : "text-muted-foreground"
					)}
				/>
			</div>
			<div className="flex-1 min-w-0">
				<p
					className={cn(
						"text-sm font-medium",
						item.checked ? "text-foreground" : "text-muted-foreground"
					)}>
					{item.label}
				</p>
				<p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
			</div>
			<CheckIcon
				className={cn(
					"h-5 w-5 shrink-0",
					item.checked ? "text-emerald-400" : "text-muted-foreground/40"
				)}
			/>
		</div>
	);
}

// ============================================
// Final Approval Card Component
// ============================================

/**
 * FinalApprovalCard - Displayed in Stage 5 when awaiting human approval
 * 
 * Shows a checklist of required items before final onboarding completion:
 * - Contract Signed
 * - Absa 6995 Form Complete
 * 
 * Calls POST /api/onboarding/approve to trigger the final approval event
 */
export function FinalApprovalCard({
	workflowId,
	applicantId,
	contractSigned,
	absaFormComplete,
	workflowStatus,
	onApprovalComplete,
}: FinalApprovalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	/** All checklist items must be complete to enable approval */
	const canApprove = contractSigned && absaFormComplete;

	/** Checklist items for display */
	const checklistItems: ChecklistItem[] = [
		{
			id: "contract",
			label: "Contract Signed",
			description: "The service agreement has been signed by all parties",
			checked: contractSigned,
			icon: RiContractLine,
		},
		{
			id: "absa_form",
			label: "Absa 6995 Form Complete",
			description: "Bank integration form has been completed and verified",
			checked: absaFormComplete,
			icon: RiFileTextLine,
		},
	];

	/** Count of completed items */
	const completedCount = checklistItems.filter((item) => item.checked).length;

	/**
	 * Handle final approval submission
	 * Triggers POST /api/onboarding/approve which sends the final-approval.received event
	 */
	const handleApprove = async () => {
		if (!canApprove) return;

		setIsSubmitting(true);
		setError(null);

		try {
			const response = await fetch("/api/onboarding/approve", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workflowId,
					applicantId,
					checklist: {
						contractSigned,
						absaFormComplete,
					},
				}),
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error || "Failed to complete onboarding");
			}

			setSuccess(true);
			onApprovalComplete?.();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unexpected error occurred");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Already completed state
	if (success || workflowStatus === "completed") {
		return (
			<Card className="bg-emerald-500/5 border-emerald-500/20">
				<CardContent className="pt-6">
					<div className="flex flex-col items-center text-center gap-3 py-4">
						<div className="p-3 rounded-full bg-emerald-500/10">
							<RiCheckLine className="h-8 w-8 text-emerald-400" />
						</div>
						<div>
							<h3 className="text-lg font-semibold text-emerald-400">
								Onboarding Complete
							</h3>
							<p className="text-sm text-muted-foreground mt-1">
								This applicant has been successfully onboarded
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="bg-card/50 border-border">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-lg flex items-center gap-2">
							<RiCheckboxCircleLine className="h-5 w-5 text-primary" />
							Final Approval
						</CardTitle>
						<CardDescription>
							Complete the checklist to finalize onboarding
						</CardDescription>
					</div>
					<div className="text-right">
						<p className="text-2xl font-bold text-foreground">
							{completedCount}/{checklistItems.length}
						</p>
						<p className="text-[10px] text-muted-foreground uppercase tracking-wide">
							Completed
						</p>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Progress Bar */}
				<div className="h-2 rounded-full bg-secondary/10 overflow-hidden">
					<div
						className={cn(
							"h-full transition-all duration-500 rounded-full",
							canApprove ? "bg-emerald-500" : "bg-primary"
						)}
						style={{
							width: `${(completedCount / checklistItems.length) * 100}%`,
						}}
					/>
				</div>

				{/* Checklist */}
				<div className="rounded-lg border border-secondary/10 p-3">
					{checklistItems.map((item, index) => (
						<ChecklistItemRow
							key={item.id}
							item={item}
							isLast={index === checklistItems.length - 1}
						/>
					))}
				</div>

				{/* Error Message */}
				{error && (
					<div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
						<p className="text-sm text-red-400">{error}</p>
					</div>
				)}

				{/* Action Button */}
				<Button
					className={cn(
						"w-full gap-2",
						canApprove && "bg-emerald-600 hover:bg-emerald-700"
					)}
					disabled={!canApprove || isSubmitting}
					onClick={handleApprove}>
					{isSubmitting ? (
						<>
							<RiLoader4Line className="h-4 w-4 animate-spin" />
							Processing...
						</>
					) : canApprove ? (
						<>
							<RiCheckLine className="h-4 w-4" />
							Complete Onboarding
						</>
					) : (
						<>
							<RiCheckboxBlankCircleLine className="h-4 w-4" />
							Complete Checklist to Continue
						</>
					)}
				</Button>

				{/* Helper Text */}
				{!canApprove && (
					<p className="text-xs text-muted-foreground text-center">
						All items must be completed before final approval
					</p>
				)}
			</CardContent>
		</Card>
	);
}

export default FinalApprovalCard;
