/**
 * ITC Credit Bureau Service
 *
 * Integrates with Experian Business Credit API for real credit checks.
 * Falls back to mock implementation when credentials not configured.
 *
 * Business Logic:
 * - Score >= AUTO_APPROVE: fast-track approval
 * - Score >= MANUAL_REVIEW: manual review required
 * - Score < AUTO_DECLINE: automatic decline
 */

import { getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
	type ITCCheckResult,
	ITCCheckResultSchema,
	ITC_THRESHOLDS,
} from "@/lib/types";
import {
	type ExperianBusinessCreditResponse,
	type ExperianTokenResponse,
	mapExperianScore,
	mapExperianRiskCategory,
} from "./experian.types";

// ============================================
// Configuration
// ============================================

const EXPERIAN_CONFIG = {
	clientId: process.env.EXPERIAN_CLIENT_ID,
	clientSecret: process.env.EXPERIAN_CLIENT_SECRET,
	apiUrl: process.env.EXPERIAN_API_URL || "https://us-api.experian.com",
};

const MOCKAROO_CONFIG = {
	enabled: process.env.USE_MOCKAROO_CREDIT_CHECK === "true",
	apiKey: process.env.MOCKAROO_API_KEY || "dd521040",
	apiUrl:
		process.env.MOCKAROO_API_URL ||
		"https://my.api.mockaroo.com/stratcol_mock_cpi",
};

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

// ============================================
// Types
// ============================================

export interface ITCCheckOptions {
	/** Applicant ID to check */
	applicantId: number;
	/** Workflow ID for tracking */
	workflowId: number;
	/** Company registration number (optional, fetched from applicant if not provided) */
	registrationNumber?: string;
	/** Force a specific score for testing */
	forceScore?: number;
}

// ============================================
// Main Function
// ============================================

/**
 * Perform ITC credit check for an applicant
 */
export async function performITCCheck(
	options: ITCCheckOptions,
): Promise<ITCCheckResult> {
	const { applicantId, workflowId, forceScore } = options;

	console.log(
		`[ITCService] Performing credit check for Applicant ${applicantId}, Workflow ${workflowId}`,
	);

	// Fetch applicant data
	const db = getDatabaseClient();
	let applicantData = null;

	if (db) {
		try {
			const applicantResults = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, applicantId));
			if (applicantResults.length > 0) {
				applicantData = applicantResults[0];
			}
		} catch (err) {
			console.error("[ITCService] Failed to fetch applicant:", err);
			throw new Error(
				`Failed to fetch applicant data: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	if (!applicantData) {
		throw new Error(`[ITCService] Applicant ${applicantId} not found`);
	}

	// Check if Experian is configured
	if (isExperianConfigured()) {
		try {
			const registrationNumber =
				options.registrationNumber || extractRegistrationNumber(applicantData);
			if (registrationNumber) {
				return await performExperianCheck(registrationNumber, applicantId);
			}
			console.warn(
				"[ITCService] No registration number found, falling back to mock",
			);
		} catch (err) {
			console.error("[ITCService] Experian API failed:", err);
			// Fall through to mock
		}
	}

	// Check if external webhook is configured (legacy)
	const itcServiceUrl = process.env.WEBHOOK_ZAP_ITC_CHECK;
	if (itcServiceUrl) {
		try {
			const response = await fetch(itcServiceUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					applicantId,
					workflowId,
					companyName: applicantData.companyName,
					registrationNumber: applicantData.notes,
					callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/callbacks/itc`,
				}),
			});

			if (response.ok) {
				const result = await response.json();
				return ITCCheckResultSchema.parse({
					creditScore: result.creditScore,
					riskCategory: categorizeRisk(result.creditScore),
					passed: result.creditScore >= ITC_THRESHOLDS.AUTO_DECLINE,
					recommendation: getRecommendation(result.creditScore),
					adverseListings: result.adverseListings || [],
					checkedAt: new Date(),
					referenceNumber: result.referenceNumber,
					rawResponse: result,
				});
			}
		} catch (err) {
			console.warn("[ITCService] External service failed, falling back:", err);
		}
	}

	// Check if Mockaroo is enabled (fallback API for testing)
	if (MOCKAROO_CONFIG.enabled) {
		try {
			const registrationNumber =
				options.registrationNumber ||
				extractRegistrationNumber(applicantData) ||
				"2023/000001/07";
			return await performMockarooCheck(
				registrationNumber,
				applicantData.companyName,
				applicantId,
			);
		} catch (err) {
			console.warn(
				"[ITCService] Mockaroo API failed, falling back to mock:",
				err,
			);
		}
	}

	// Mock ITC check (fallback)
	return generateMockITCResult(applicantData, applicantId, forceScore);
}

// ============================================
// Experian Integration
// ============================================

/**
 * Check if Experian API is configured
 */
function isExperianConfigured(): boolean {
	return !!(EXPERIAN_CONFIG.clientId && EXPERIAN_CONFIG.clientSecret);
}

/**
 * Get Experian OAuth2 token
 */
async function getExperianToken(): Promise<string> {
	// Return cached token if valid
	if (cachedToken && cachedToken.expiresAt > Date.now()) {
		return cachedToken.token;
	}

	const response = await fetch(`${EXPERIAN_CONFIG.apiUrl}/oauth2/v1/token`, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			grant_type: "client_credentials",
			client_id: EXPERIAN_CONFIG.clientId!,
			client_secret: EXPERIAN_CONFIG.clientSecret!,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Experian auth failed: ${response.status} - ${error}`);
	}

	const data = (await response.json()) as ExperianTokenResponse;

	// Cache token (with 5 minute buffer)
	cachedToken = {
		token: data.access_token,
		expiresAt: Date.now() + (data.expires_in - 300) * 1000,
	};

	return data.access_token;
}

/**
 * Perform real Experian credit check
 */
async function performExperianCheck(
	registrationNumber: string,
	applicantId: number,
): Promise<ITCCheckResult> {
	console.log(
		`[ITCService] Calling Experian API for registration: ${registrationNumber}`,
	);

	const token = await getExperianToken();

	const response = await fetch(`${EXPERIAN_CONFIG.apiUrl}/business/v1/credit`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			registrationNumber,
			country: "ZA",
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(
			`Experian credit check failed: ${response.status} - ${error}`,
		);
	}

	const data = (await response.json()) as ExperianBusinessCreditResponse;

	// Map Experian response to our ITCCheckResult
	const creditScore = mapExperianScore(data.creditProfile.score);
	const riskCategory = mapExperianRiskCategory(data.creditProfile.riskCategory);

	const result: ITCCheckResult = {
		creditScore,
		riskCategory,
		passed: creditScore >= ITC_THRESHOLDS.AUTO_DECLINE,
		recommendation: getRecommendation(creditScore),
		adverseListings: data.adverseListings.map((listing) => ({
			type: listing.type,
			amount: listing.amount,
			date: listing.date,
			creditor: listing.creditor || "Unknown",
		})),
		checkedAt: new Date(),
		referenceNumber: `EXP-${data.requestId}-${applicantId}`,
		rawResponse: data,
	};

	console.log(`[ITCService] Experian check complete:`, {
		registrationNumber,
		experianScore: data.creditProfile.score,
		mappedScore: creditScore,
		riskCategory,
		recommendation: result.recommendation,
	});

	return result;
}

/**
 * Extract registration number from applicant data
 */
function extractRegistrationNumber(applicantData: {
	registrationNumber?: string | null;
	notes?: string | null;
}): string | null {
	// First check the dedicated registrationNumber field
	if (applicantData.registrationNumber) {
		return applicantData.registrationNumber;
	}
	// Fallback: check notes field for registration number pattern
	if (applicantData.notes) {
		const regMatch = applicantData.notes.match(/\d{4}\/\d+\/\d{2}/);
		if (regMatch) {
			return regMatch[0];
		}
	}
	return null;
}

// ============================================
// Mockaroo Integration (Test/Fallback)
// ============================================

interface MockarooDirector {
	name: string;
	id_number: string;
	verification_status: "VERIFIED" | "UNVERIFIED";
}

interface MockarooResponse {
	registration_number: string;
	company_name: string;
	status: string;
	credit_score: number;
	risk_band: string;
	cipc_annual_returns_compliant: boolean;
	judgements: number;
	directors: MockarooDirector[];
	latency_simulation?: number;
}

/**
 * Perform credit check via Mockaroo API (for testing/fallback)
 */
async function performMockarooCheck(
	registrationNumber: string,
	companyName: string,
	applicantId: number,
): Promise<ITCCheckResult> {
	console.log(
		`[ITCService] Calling Mockaroo API for registration: ${registrationNumber}`,
	);

	const url = `${MOCKAROO_CONFIG.apiUrl}/`;
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"X-API-Key": MOCKAROO_CONFIG.apiKey,
		},
		body: JSON.stringify({ registrationNumber, loanAmount: 1000000 }),
	});

	if (!response.ok) {
		throw new Error(`Mockaroo API failed: ${response.status}`);
	}

	const data = (await response.json()) as MockarooResponse;

	// Map Mockaroo response to ITCCheckResult
	const creditScore = data.credit_score;
	const riskCategory = mapMockarooRiskBand(data.risk_band);

	const result: ITCCheckResult = {
		creditScore,
		riskCategory,
		passed: creditScore >= ITC_THRESHOLDS.AUTO_DECLINE,
		recommendation: getRecommendation(creditScore),
		adverseListings: [],
		checkedAt: new Date(),
		referenceNumber: `MOC-${Date.now()}-${applicantId}`,
		rawResponse: data,
	};

	console.log(`[ITCService] Mockaroo check complete:`, {
		registrationNumber,
		companyName: data.company_name,
		status: data.status,
		creditScore,
		riskCategory,
		recommendation: result.recommendation,
	});

	return result;
}

/**
 * Map Mockaroo risk_band to our risk category
 */
function mapMockarooRiskBand(
	riskBand: string,
): "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" {
	switch (riskBand?.toUpperCase()) {
		case "LOW_RISK":
			return "LOW";
		case "MEDIUM_RISK":
			return "MEDIUM";
		case "HIGH_RISK":
			return "HIGH";
		case "VERY_HIGH_RISK":
			return "VERY_HIGH";
		default:
			return "MEDIUM";
	}
}

// ============================================
// Mock Implementation
// ============================================

/**
 * Generate mock ITC result for testing/development
 */
function generateMockITCResult(
	applicantData: { companyName: string },
	applicantId: number,
	forceScore?: number,
): ITCCheckResult {
	const mockScore = forceScore ?? generateMockScore(applicantData);

	const result: ITCCheckResult = {
		creditScore: mockScore,
		riskCategory: categorizeRisk(mockScore),
		passed: mockScore >= ITC_THRESHOLDS.AUTO_DECLINE,
		recommendation: getRecommendation(mockScore),
		adverseListings: mockScore < 650 ? generateMockAdverseListings() : [],
		checkedAt: new Date(),
		referenceNumber: `MOCK-${Date.now()}-${applicantId}`,
	};

	console.log(`[ITCService] Mock credit check complete:`, {
		applicantId,
		score: result.creditScore,
		category: result.riskCategory,
		recommendation: result.recommendation,
	});

	return result;
}

/**
 * Generate mock credit score based on applicant data
 */
function generateMockScore(applicantData: { companyName: string }): number {
	let hash = 0;
	const name = applicantData.companyName.toLowerCase();
	for (let i = 0; i < name.length; i++) {
		hash = (hash << 5) - hash + name.charCodeAt(i);
		hash = hash & hash;
	}

	const normalizedScore = Math.abs(hash % 400) + 450;

	// Test cases
	if (name.includes("badcredit") || name.includes("decline")) return 520;
	if (name.includes("review") || name.includes("manual")) return 650;
	if (name.includes("goodcredit") || name.includes("approve")) return 780;

	return normalizedScore;
}

/**
 * Generate mock adverse listings
 */
function generateMockAdverseListings() {
	return [
		{
			type: "Judgement",
			amount: 15000_00,
			date: "2024-06-15",
			creditor: "ABC Collections",
		},
		{
			type: "Default",
			amount: 8500_00,
			date: "2024-03-22",
			creditor: "XYZ Finance",
		},
	];
}

// ============================================
// Utility Functions
// ============================================

function categorizeRisk(
	score: number,
): "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" {
	if (score >= 750) return "LOW";
	if (score >= 650) return "MEDIUM";
	if (score >= 550) return "HIGH";
	return "VERY_HIGH";
}

function getRecommendation(
	score: number,
):
	| "AUTO_APPROVE"
	| "MANUAL_REVIEW"
	| "AUTO_DECLINE"
	| "ENHANCED_DUE_DILIGENCE" {
	if (score >= ITC_THRESHOLDS.AUTO_APPROVE) return "AUTO_APPROVE";
	if (score >= ITC_THRESHOLDS.MANUAL_REVIEW) return "MANUAL_REVIEW";
	if (score >= ITC_THRESHOLDS.AUTO_DECLINE) return "ENHANCED_DUE_DILIGENCE";
	return "AUTO_DECLINE";
}

// ============================================
// Result Helpers (for Inngest serialization)
// ============================================

type SerializedITCResult = {
	creditScore: number;
	recommendation:
		| "AUTO_APPROVE"
		| "MANUAL_REVIEW"
		| "AUTO_DECLINE"
		| "ENHANCED_DUE_DILIGENCE";
};

export function canAutoApprove(result: SerializedITCResult): boolean {
	return (
		result.recommendation === "AUTO_APPROVE" &&
		result.creditScore >= ITC_THRESHOLDS.AUTO_APPROVE
	);
}

export function requiresManualReview(result: SerializedITCResult): boolean {
	return (
		result.recommendation === "MANUAL_REVIEW" ||
		result.recommendation === "ENHANCED_DUE_DILIGENCE"
	);
}

export function shouldAutoDecline(result: SerializedITCResult): boolean {
	return (
		result.recommendation === "AUTO_DECLINE" ||
		result.creditScore < ITC_THRESHOLDS.AUTO_DECLINE
	);
}
