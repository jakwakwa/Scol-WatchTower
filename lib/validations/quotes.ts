import { z } from "zod";

// Helper to handle both camelCase and snake_case inputs (e.g. from agent)
export const createQuoteSchema = z.preprocess(
	(val) => {
		if (typeof val !== "object" || val === null) return val;
		const v = val as Record<string, unknown>;
		return {
			workflowId: v.workflowId ?? v.workflow_id,
			leadId: v.leadId ?? v.lead_id,
			amount: v.amount,
			baseFeePercent: v.baseFeePercent ?? v.base_fee_percent,
			adjustedFeePercent: v.adjustedFeePercent ?? v.adjusted_fee_percent,
			rationale: v.rationale,
			details: v.details,
			generatedBy: v.generatedBy ?? v.generated_by,
		};
	},
	z.object({
		workflowId: z.coerce.number().int().positive(),
		leadId: z.coerce.number().int().positive().optional(),
		amount: z.coerce.number().int().positive(), // Cents
		baseFeePercent: z.coerce.number().int().positive(), // Basis points
		adjustedFeePercent: z.coerce.number().int().positive().optional(), // Basis points
		details: z.string().optional(),
		rationale: z.string().optional(),
		generatedBy: z.enum(["platform", "gemini"]).optional(),
	}),
);

export const quoteGenerationSchema = z.object({
	amount: z.number().int().positive(),
	baseFeePercent: z.number().int().min(50).max(500),
	adjustedFeePercent: z.number().int().min(50).max(500),
	rationale: z.string().min(50).max(1200),
	riskFactors: z.array(z.string()).default([]),
	recommendation: z.enum(["STANDARD", "PREMIUM", "HIGH_RISK"]),
});

export type QuoteGenerationResult = z.infer<typeof quoteGenerationSchema>;

export const updateQuoteSchema = z.object({
	amount: z.coerce.number().int().positive().optional(),
	baseFeePercent: z.coerce.number().int().positive().optional(),
	adjustedFeePercent: z.coerce.number().int().positive().optional(),
	rationale: z.string().optional(),
	details: z.string().optional(),
	status: z
		.enum(["draft", "pending_approval", "approved", "rejected"])
		.optional(),
});
