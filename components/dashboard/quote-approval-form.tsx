"use client";

import { useMemo, useState } from "react";
import { RiLoader4Line } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/dashboard";

interface QuoteApprovalFormProps {
	applicantId: number;
	workflowId: number;
	quoteId: number;
	status: string;
	initialAmount?: number | null;
	initialBaseFeePercent?: number | null;
	initialAdjustedFeePercent?: number | null;
	initialRationale?: string | null;
	details?: string | null;
}

interface QuoteFormErrors {
	amount?: string;
	baseFeePercent?: string;
	adjustedFeePercent?: string;
	rationale?: string;
}

export function QuoteApprovalForm({
	quoteId,
	status,
	initialAmount,
	initialBaseFeePercent,
	initialAdjustedFeePercent,
	initialRationale,
	details,
}: QuoteApprovalFormProps) {
	const [currentStatus, setCurrentStatus] = useState(status);
	const [amount, setAmount] = useState(
		initialAmount !== null && initialAmount !== undefined
			? String(initialAmount)
			: "",
	);
	const [baseFeePercent, setBaseFeePercent] = useState(
		initialBaseFeePercent !== null && initialBaseFeePercent !== undefined
			? String(initialBaseFeePercent)
			: "",
	);
	const [adjustedFeePercent, setAdjustedFeePercent] = useState(
		initialAdjustedFeePercent !== null &&
			initialAdjustedFeePercent !== undefined
			? String(initialAdjustedFeePercent)
			: "",
	);
	const [rationale, setRationale] = useState(initialRationale || "");
	const [errors, setErrors] = useState<QuoteFormErrors>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitMessage, setSubmitMessage] = useState<string | null>(null);

	const parsedDetails = useMemo(() => {
		if (!details) return null;
		try {
			return JSON.parse(details) as {
				riskFactors?: string[];
				recommendation?: string;
			};
		} catch {
			return null;
		}
	}, [details]);

	const isLocked =
		currentStatus === "pending_approval" || currentStatus === "approved";

	const validate = () => {
		const nextErrors: QuoteFormErrors = {};

		if (!amount || Number(amount) <= 0) {
			nextErrors.amount = "Amount is required.";
		}

		if (!baseFeePercent || Number(baseFeePercent) <= 0) {
			nextErrors.baseFeePercent = "Base fee is required.";
		}

		if (!adjustedFeePercent || Number(adjustedFeePercent) <= 0) {
			nextErrors.adjustedFeePercent = "Adjusted fee is required.";
		}

		if (!rationale.trim()) {
			nextErrors.rationale = "Rationale is required.";
		}

		setErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	};

	const handleApprove = async () => {
		if (!validate()) return;
		setIsSubmitting(true);
		setSubmitMessage(null);

		try {
			const updateResponse = await fetch(`/api/quotes/${quoteId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					amount: Number(amount),
					baseFeePercent: Number(baseFeePercent),
					adjustedFeePercent: Number(adjustedFeePercent),
					rationale,
				}),
			});

			if (!updateResponse.ok) {
				const payload = await updateResponse.json().catch(() => ({}));
				throw new Error(payload?.error || "Failed to update quote");
			}

			const approveResponse = await fetch(`/api/quotes/${quoteId}/approve`, {
				method: "POST",
			});

			if (!approveResponse.ok) {
				const payload = await approveResponse.json().catch(() => ({}));
				throw new Error(payload?.error || "Failed to approve quote");
			}

			setCurrentStatus("pending_approval");
			setSubmitMessage("Quote approved and sent to client.");
		} catch (error) {
			setSubmitMessage(
				error instanceof Error ? error.message : "Approval failed",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="space-y-6">
			<GlassCard className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-lg font-semibold">Quote details</h3>
						<p className="text-sm text-muted-foreground">
							Values are stored in cents and basis points.
						</p>
					</div>
					<Badge variant="outline" className="text-xs uppercase">
						{currentStatus}
					</Badge>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="space-y-2">
						<Label htmlFor="quote-amount">Amount (cents)</Label>
						<Input
							id="quote-amount"
							type="number"
							value={amount}
							onChange={(event) => setAmount(event.target.value)}
							disabled={isLocked}
						/>
						{errors.amount ? (
							<p className="text-xs text-destructive">{errors.amount}</p>
						) : null}
					</div>

					<div className="space-y-2">
						<Label htmlFor="quote-base-fee">Base fee (bps)</Label>
						<Input
							id="quote-base-fee"
							type="number"
							value={baseFeePercent}
							onChange={(event) => setBaseFeePercent(event.target.value)}
							disabled={isLocked}
						/>
						{errors.baseFeePercent ? (
							<p className="text-xs text-destructive">
								{errors.baseFeePercent}
							</p>
						) : null}
					</div>

					<div className="space-y-2">
						<Label htmlFor="quote-adjusted-fee">Adjusted fee (bps)</Label>
						<Input
							id="quote-adjusted-fee"
							type="number"
							value={adjustedFeePercent}
							onChange={(event) => setAdjustedFeePercent(event.target.value)}
							disabled={isLocked}
						/>
						{errors.adjustedFeePercent ? (
							<p className="text-xs text-destructive">
								{errors.adjustedFeePercent}
							</p>
						) : null}
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="quote-rationale">AI rationale</Label>
					<Textarea
						id="quote-rationale"
						value={rationale}
						onChange={(event) => setRationale(event.target.value)}
						disabled={isLocked}
						rows={5}
					/>
					{errors.rationale ? (
						<p className="text-xs text-destructive">{errors.rationale}</p>
					) : null}
				</div>

				{parsedDetails ? (
					<div className="space-y-2 text-sm text-muted-foreground">
						<p className="font-medium text-foreground">AI signals</p>
						<div className="flex flex-wrap gap-2">
							<Badge variant="secondary">
								Recommendation: {parsedDetails.recommendation || "N/A"}
							</Badge>
							{parsedDetails.riskFactors?.length
								? parsedDetails.riskFactors.map((factor) => (
										<Badge key={factor} variant="outline">
											{factor}
										</Badge>
									))
								: null}
						</div>
					</div>
				) : null}
			</GlassCard>

			<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<p className="text-sm text-muted-foreground">
					{submitMessage || "Review the quote before sending to the client."}
				</p>
				<Button
					onClick={handleApprove}
					disabled={isSubmitting || isLocked}
					className="gap-2"
				>
					{isSubmitting ? (
						<>
							<RiLoader4Line className="h-4 w-4 animate-spin" />
							Sending...
						</>
					) : (
						"Approve & Send to Client"
					)}
				</Button>
			</div>
		</div>
	);
}
