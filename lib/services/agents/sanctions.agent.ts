/**
 * Sanctions Agent - Mock Implementation (Phase 1)
 *
 * This agent performs sanctions and compliance checking including:
 * - UN Sanctions list checking
 * - PEP (Politically Exposed Person) screening
 * - Adverse media scanning
 * - Regulatory watch list verification
 *
 * NOTE: This is a mock implementation for Phase 1.
 * Real implementation will integrate with actual sanctions databases.
 */

import { z } from "zod";

// ============================================
// Types & Schemas
// ============================================

export const SanctionsCheckResultSchema = z.object({
	// UN Sanctions Check
	unSanctions: z.object({
		checked: z.boolean().describe("Whether UN sanctions list was checked"),
		matchFound: z.boolean().describe("Whether a match was found"),
		matchDetails: z
			.array(
				z.object({
					listName: z.string(),
					matchType: z.enum(["EXACT", "PARTIAL", "FUZZY"]),
					matchedName: z.string(),
					confidence: z.number().min(0).max(100),
					sanctionType: z.string().optional(),
					sanctionDate: z.string().optional(),
				})
			)
			.describe("Details of any matches found"),
		lastChecked: z.string().describe("ISO timestamp of last check"),
	}),

	// PEP Screening
	pepScreening: z.object({
		checked: z.boolean().describe("Whether PEP screening was performed"),
		isPEP: z.boolean().describe("Whether person is a PEP"),
		pepDetails: z
			.object({
				category: z.enum(["DOMESTIC", "FOREIGN", "INTERNATIONAL_ORG", "FAMILY_CLOSE_ASSOCIATE"]).optional(),
				position: z.string().optional(),
				country: z.string().optional(),
				riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
			})
			.optional()
			.describe("PEP details if identified"),
		familyAssociates: z
			.array(
				z.object({
					name: z.string(),
					relationship: z.string(),
					isPEP: z.boolean(),
				})
			)
			.describe("Known family/associates who are PEPs"),
	}),

	// Adverse Media
	adverseMedia: z.object({
		checked: z.boolean().describe("Whether adverse media scan was performed"),
		alertsFound: z.number().describe("Number of adverse media alerts"),
		alerts: z
			.array(
				z.object({
					source: z.string(),
					headline: z.string(),
					date: z.string(),
					severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
					category: z
						.enum([
							"FINANCIAL_CRIME",
							"FRAUD",
							"CORRUPTION",
							"MONEY_LAUNDERING",
							"TAX_EVASION",
							"REGULATORY_VIOLATION",
							"OTHER",
						])
						.optional(),
					url: z.string().optional(),
				})
			)
			.describe("Adverse media alerts found"),
	}),

	// Regulatory Watch Lists
	watchLists: z.object({
		checked: z.boolean().describe("Whether watch lists were checked"),
		listsChecked: z.array(z.string()).describe("Names of watch lists checked"),
		matchesFound: z.number().describe("Number of matches found"),
		matches: z
			.array(
				z.object({
					listName: z.string(),
					matchedEntity: z.string(),
					matchConfidence: z.number().min(0).max(100),
					reason: z.string().optional(),
				})
			)
			.describe("Watch list matches"),
	}),

	// Overall Assessment
	overall: z.object({
		riskLevel: z
			.enum(["CLEAR", "LOW", "MEDIUM", "HIGH", "BLOCKED"])
			.describe("Overall sanctions risk level"),
		passed: z.boolean().describe("Whether screening passed (no blockers)"),
		requiresEDD: z.boolean().describe("Whether Enhanced Due Diligence is required"),
		recommendation: z
			.enum(["PROCEED", "PROCEED_WITH_MONITORING", "EDD_REQUIRED", "BLOCK", "MANUAL_REVIEW"])
			.describe("Recommended action"),
		reasoning: z.string().describe("Detailed reasoning"),
		reviewRequired: z.boolean().describe("Whether human review is required"),
	}),

	// Metadata
	metadata: z.object({
		checkId: z.string().describe("Unique check identifier"),
		checkedAt: z.string().describe("ISO timestamp of check"),
		expiresAt: z.string().describe("ISO timestamp when check expires"),
		dataSource: z.string().describe("Data source version"),
	}),
});

export type SanctionsCheckResult = z.infer<typeof SanctionsCheckResultSchema>;

export interface SanctionsCheckInput {
	applicantId: number;
	workflowId: number;
	entityName: string;
	entityType: "INDIVIDUAL" | "COMPANY" | "TRUST" | "OTHER";
	countryCode: string;
	directors?: Array<{
		name: string;
		idNumber?: string;
		nationality?: string;
	}>;
	registrationNumber?: string;
}

// ============================================
// Sanctions Agent Implementation (Mock)
// ============================================

/**
 * Perform sanctions and compliance checks
 *
 * NOTE: This is a mock implementation for Phase 1.
 */
export async function performSanctionsCheck(
	input: SanctionsCheckInput
): Promise<SanctionsCheckResult> {
	console.log(
		`[SanctionsAgent] Checking ${input.entityName} for workflow ${input.workflowId}`
	);

	// Simulate API delay
	await new Promise(resolve => setTimeout(resolve, 800));

	// Generate mock results
	const mockResult = generateMockSanctionsResult(input);

	console.log(
		`[SanctionsAgent] Check complete - Risk level: ${mockResult.overall.riskLevel}, Passed: ${mockResult.overall.passed}`
	);

	return mockResult;
}

/**
 * Generate mock sanctions check results
 */
function generateMockSanctionsResult(
	input: SanctionsCheckInput
): SanctionsCheckResult {
	const seed = simpleHash(input.entityName + input.applicantId);
	const now = new Date();
	const checkId = `SCK-${input.workflowId}-${Date.now()}`;

	// Determine if this is a "clear" result (most common case)
	// Only ~5% of checks should flag anything
	const isClear = seed % 20 !== 0;

	// High-risk country check
	const highRiskCountries = ["KP", "IR", "SY", "CU", "RU"];
	const isHighRiskCountry = highRiskCountries.includes(input.countryCode);

	// Generate results based on clear/not clear
	const unSanctionsMatch = !isClear && seed % 5 === 0;
	const isPEP = !isClear && seed % 7 === 0;
	const hasAdverseMedia = !isClear && seed % 4 === 0;
	const hasWatchListMatch = !isClear && seed % 6 === 0;

	// Calculate overall risk
	let riskLevel: "CLEAR" | "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";
	let passed = true;
	let requiresEDD = false;
	let recommendation: "PROCEED" | "PROCEED_WITH_MONITORING" | "EDD_REQUIRED" | "BLOCK" | "MANUAL_REVIEW";

	if (unSanctionsMatch) {
		riskLevel = "BLOCKED";
		passed = false;
		recommendation = "BLOCK";
	} else if (isHighRiskCountry) {
		riskLevel = "HIGH";
		passed = true;
		requiresEDD = true;
		recommendation = "EDD_REQUIRED";
	} else if (isPEP) {
		riskLevel = "MEDIUM";
		passed = true;
		requiresEDD = true;
		recommendation = "PROCEED_WITH_MONITORING";
	} else if (hasAdverseMedia || hasWatchListMatch) {
		riskLevel = "LOW";
		passed = true;
		recommendation = "MANUAL_REVIEW";
	} else {
		riskLevel = "CLEAR";
		passed = true;
		recommendation = "PROCEED";
	}

	return {
		unSanctions: {
			checked: true,
			matchFound: unSanctionsMatch,
			matchDetails: unSanctionsMatch
				? [
						{
							listName: "UN Security Council Consolidated List",
							matchType: "PARTIAL" as const,
							matchedName: input.entityName.split(" ")[0] + " Industries",
							confidence: 45,
							sanctionType: "Trade Restrictions",
							sanctionDate: "2022-03-15",
						},
					]
				: [],
			lastChecked: now.toISOString(),
		},

		pepScreening: {
			checked: true,
			isPEP,
			pepDetails: isPEP
				? {
						category: "DOMESTIC" as const,
						position: "Former Deputy Minister",
						country: "ZA",
						riskLevel: "MEDIUM" as const,
					}
				: undefined,
			familyAssociates: isPEP && seed % 2 === 0
				? [
						{
							name: "Associate Name",
							relationship: "Business Partner",
							isPEP: true,
						},
					]
				: [],
		},

		adverseMedia: {
			checked: true,
			alertsFound: hasAdverseMedia ? 1 : 0,
			alerts: hasAdverseMedia
				? [
						{
							source: "Financial Times",
							headline: `${input.entityName} mentioned in regulatory investigation`,
							date: new Date(
								now.getTime() - (seed % 365) * 24 * 60 * 60 * 1000
							).toISOString().split("T")[0],
							severity: "LOW" as const,
							category: "REGULATORY_VIOLATION" as const,
							url: "https://example.com/news/article",
						},
					]
				: [],
		},

		watchLists: {
			checked: true,
			listsChecked: [
				"OFAC SDN List",
				"EU Consolidated List",
				"UK Sanctions List",
				"SARB Watchlist",
				"FIC Targeted Financial Sanctions",
			],
			matchesFound: hasWatchListMatch ? 1 : 0,
			matches: hasWatchListMatch
				? [
						{
							listName: "SARB Watchlist",
							matchedEntity: `${input.entityName.split(" ")[0]} Corp`,
							matchConfidence: 35,
							reason: "Partial name match - likely false positive",
						},
					]
				: [],
		},

		overall: {
			riskLevel,
			passed,
			requiresEDD,
			recommendation,
			reasoning: generateSanctionsReasoning(
				riskLevel,
				unSanctionsMatch,
				isPEP,
				hasAdverseMedia,
				hasWatchListMatch,
				isHighRiskCountry
			),
			reviewRequired: !isClear,
		},

		metadata: {
			checkId,
			checkedAt: now.toISOString(),
			expiresAt: new Date(
				now.getTime() + 30 * 24 * 60 * 60 * 1000
			).toISOString(), // 30 days
			dataSource: "Mock Sanctions Database v1.0",
		},
	};
}

/**
 * Generate reasoning text for sanctions check
 */
function generateSanctionsReasoning(
	riskLevel: string,
	unSanctionsMatch: boolean,
	isPEP: boolean,
	hasAdverseMedia: boolean,
	hasWatchListMatch: boolean,
	isHighRiskCountry: boolean
): string {
	const parts: string[] = [];

	parts.push(`Sanctions screening completed with ${riskLevel} risk level.`);

	if (unSanctionsMatch) {
		parts.push(
			"CRITICAL: Potential match found on UN Sanctions list. Immediate review required."
		);
	}

	if (isPEP) {
		parts.push(
			"Entity or associated individual identified as Politically Exposed Person. Enhanced Due Diligence recommended."
		);
	}

	if (hasAdverseMedia) {
		parts.push(
			"Adverse media alerts found. Review articles to assess relevance and severity."
		);
	}

	if (hasWatchListMatch) {
		parts.push(
			"Partial match found on regulatory watchlist. May be false positive - verification recommended."
		);
	}

	if (isHighRiskCountry) {
		parts.push(
			"Entity associated with high-risk jurisdiction. Enhanced monitoring required per FICA regulations."
		);
	}

	if (riskLevel === "CLEAR") {
		parts.push(
			"No significant sanctions or compliance concerns identified. Standard onboarding may proceed."
		);
	}

	return parts.join(" ");
}

/**
 * Simple hash function for deterministic mock results
 */
function simpleHash(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash);
}

// ============================================
// Batch Screening
// ============================================

export interface BatchSanctionsInput {
	workflowId: number;
	entities: Array<{
		name: string;
		type: "INDIVIDUAL" | "COMPANY" | "TRUST" | "OTHER";
		idNumber?: string;
	}>;
	countryCode: string;
}

export interface BatchSanctionsResult {
	results: Array<{
		entityName: string;
		result: SanctionsCheckResult;
	}>;
	summary: {
		totalChecked: number;
		cleared: number;
		flagged: number;
		blocked: number;
		overallPassed: boolean;
	};
}

/**
 * Screen multiple entities (useful for checking all directors)
 */
export async function performBatchSanctionsCheck(
	input: BatchSanctionsInput
): Promise<BatchSanctionsResult> {
	console.log(
		`[SanctionsAgent] Batch screening ${input.entities.length} entities for workflow ${input.workflowId}`
	);

	const results = await Promise.all(
		input.entities.map(async (entity, index) => ({
			entityName: entity.name,
			result: await performSanctionsCheck({
				applicantId: input.workflowId * 100 + index,
				workflowId: input.workflowId,
				entityName: entity.name,
				entityType: entity.type,
				countryCode: input.countryCode,
			}),
		}))
	);

	const cleared = results.filter(r => r.result.overall.riskLevel === "CLEAR").length;
	const blocked = results.filter(r => r.result.overall.riskLevel === "BLOCKED").length;
	const flagged = results.length - cleared - blocked;

	return {
		results,
		summary: {
			totalChecked: results.length,
			cleared,
			flagged,
			blocked,
			overallPassed: blocked === 0,
		},
	};
}

// ============================================
// Risk Level Utilities
// ============================================

/**
 * Check if sanctions result allows auto-approval
 */
export function canAutoApprove(result: SanctionsCheckResult): boolean {
	return (
		result.overall.riskLevel === "CLEAR" &&
		!result.pepScreening.isPEP &&
		result.adverseMedia.alertsFound === 0
	);
}

/**
 * Check if sanctions result blocks proceeding
 */
export function isBlocked(result: SanctionsCheckResult): boolean {
	return (
		result.overall.riskLevel === "BLOCKED" ||
		result.unSanctions.matchFound
	);
}
