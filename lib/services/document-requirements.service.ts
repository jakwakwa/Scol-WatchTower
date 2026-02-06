/**
 * Document Requirements Service - Conditional Document Logic
 *
 * This service determines which documents are required for each applicant
 * based on their business type and structure. This is a PRD-critical requirement
 * to ensure applicants only receive relevant documentation requests.
 *
 * Business Types:
 * - NPO: Non-Profit Organization
 * - PROPRIETOR: Sole Proprietor / Individual
 * - COMPANY: Registered Company (Pty Ltd)
 * - TRUST: Trust Structure
 * - BODY_CORPORATE: Body Corporate / Strata
 * - PARTNERSHIP: Partnership Structure
 */

import { z } from "zod";

// ============================================
// Business Type Schema
// ============================================

export const BusinessTypeSchema = z.enum([
	"NPO",
	"PROPRIETOR",
	"COMPANY",
	"TRUST",
	"BODY_CORPORATE",
	"PARTNERSHIP",
	"CLOSE_CORPORATION",
]);

export type BusinessType = z.infer<typeof BusinessTypeSchema>;

// ============================================
// Document Categories
// ============================================

export const DocumentCategorySchema = z.enum([
	"IDENTITY", // Personal identification
	"ENTITY", // Entity registration
	"FINANCIAL", // Bank statements, financial records
	"ADDRESS", // Proof of address
	"GOVERNANCE", // Board resolutions, authority letters
	"REGULATORY", // Industry-specific certifications
	"FICA", // FICA compliance documents
]);

export type DocumentCategory = z.infer<typeof DocumentCategorySchema>;

// ============================================
// Document Requirement Types
// ============================================

export interface DocumentRequirement {
	id: string;
	name: string;
	description: string;
	category: DocumentCategory;
	required: boolean;
	acceptedFormats: string[];
	maxSizeMB: number;
	expiryMonths?: number; // For documents that expire
}

export interface MandateDocumentRequirements {
	businessType: BusinessType;
	totalRequired: number;
	totalOptional: number;
	documents: DocumentRequirement[];
}

// ============================================
// Base Document Requirements (All Business Types)
// ============================================

const BASE_REQUIREMENTS: DocumentRequirement[] = [
	{
		id: "BANK_STATEMENT_3_MONTH",
		name: "3-Month Bank Statement",
		description: "Recent bank statements covering the last 3 months",
		category: "FINANCIAL",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 10,
	},
	{
		id: "PROOF_OF_ADDRESS",
		name: "Proof of Business Address",
		description:
			"Recent utility bill, lease agreement, or official correspondence (not older than 3 months)",
		category: "ADDRESS",
		required: true,
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMB: 5,
		expiryMonths: 3,
	},
];

// ============================================
// Business-Type Specific Requirements
// ============================================

const NPO_REQUIREMENTS: DocumentRequirement[] = [
	{
		id: "NPO_REGISTRATION",
		name: "NPO Registration Certificate",
		description: "Registration certificate from Department of Social Development",
		category: "ENTITY",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "NPO_CONSTITUTION",
		name: "NPO Constitution",
		description: "Organisation's founding constitution document",
		category: "GOVERNANCE",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 10,
	},
	{
		id: "NPO_RESOLUTION",
		name: "Board Resolution",
		description:
			"Resolution authorising the application and signatories for banking purposes",
		category: "GOVERNANCE",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "NPO_BOARD_LIST",
		name: "List of Board Members",
		description: "Current list of all board members with their ID numbers",
		category: "GOVERNANCE",
		required: true,
		acceptedFormats: ["pdf", "docx"],
		maxSizeMB: 5,
	},
	{
		id: "TAX_EXEMPTION",
		name: "Tax Exemption Certificate",
		description: "Section 18A or PBO exemption certificate (if applicable)",
		category: "REGULATORY",
		required: false,
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "AUTHORIZED_SIGNATORY_ID",
		name: "Authorised Signatory ID",
		description: "ID document of the authorised signatory",
		category: "IDENTITY",
		required: true,
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMB: 5,
	},
];

const PROPRIETOR_REQUIREMENTS: DocumentRequirement[] = [
	{
		id: "PROPRIETOR_ID",
		name: "Identity Document",
		description: "SA ID card/book or valid passport for the proprietor",
		category: "IDENTITY",
		required: true,
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMB: 5,
	},
	{
		id: "PROPRIETOR_RESIDENCE",
		name: "Proof of Residence",
		description: "Recent utility bill or bank statement showing residential address",
		category: "ADDRESS",
		required: true,
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMB: 5,
		expiryMonths: 3,
	},
	{
		id: "BUSINESS_REGISTRATION",
		name: "Business Registration",
		description: "CIPC registration or proof of trading name registration",
		category: "ENTITY",
		required: false,
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "TAX_CLEARANCE",
		name: "Tax Clearance Certificate",
		description: "Valid SARS tax clearance certificate",
		category: "REGULATORY",
		required: false,
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
		expiryMonths: 12,
	},
];

const COMPANY_REQUIREMENTS: DocumentRequirement[] = [
	{
		id: "CIPC_REGISTRATION",
		name: "CIPC Registration Certificate",
		description: "Company registration certificate (COR14.3 or equivalent)",
		category: "ENTITY",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "COMPANY_DIRECTORS",
		name: "Director Details (COR39)",
		description: "Most recent COR39 showing current directors",
		category: "ENTITY",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "DIRECTOR_ID",
		name: "Director ID Documents",
		description: "ID documents for all directors (or at least 2 main directors)",
		category: "IDENTITY",
		required: true,
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMB: 10,
	},
	{
		id: "SHARE_CERTIFICATE",
		name: "Share Certificate / Shareholders",
		description:
			"Share certificates or shareholder agreement showing ownership structure",
		category: "GOVERNANCE",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "COMPANY_RESOLUTION",
		name: "Board Resolution",
		description:
			"Resolution authorising the application and nominating authorised signatories",
		category: "GOVERNANCE",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "FINANCIAL_STATEMENTS",
		name: "Financial Statements",
		description: "Latest annual financial statements (if available)",
		category: "FINANCIAL",
		required: false,
		acceptedFormats: ["pdf"],
		maxSizeMB: 20,
	},
];

const TRUST_REQUIREMENTS: DocumentRequirement[] = [
	{
		id: "TRUST_DEED",
		name: "Trust Deed",
		description: "Certified copy of the trust deed",
		category: "ENTITY",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 20,
	},
	{
		id: "TRUST_LETTER_OF_AUTHORITY",
		name: "Letter of Authority",
		description: "Master of High Court letter of authority for trustees",
		category: "GOVERNANCE",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "TRUSTEE_IDS",
		name: "Trustee ID Documents",
		description: "ID documents for all trustees",
		category: "IDENTITY",
		required: true,
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMB: 10,
	},
	{
		id: "BENEFICIARY_DETAILS",
		name: "Beneficiary Information",
		description: "List of beneficiaries with their ID numbers and contact details",
		category: "GOVERNANCE",
		required: true,
		acceptedFormats: ["pdf", "docx"],
		maxSizeMB: 5,
	},
	{
		id: "TRUST_RESOLUTION",
		name: "Trustee Resolution",
		description: "Resolution authorising the application",
		category: "GOVERNANCE",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "TRUST_ORGANOGRAM",
		name: "Trust Structure Diagram",
		description: "Organogram showing trust structure and relationships",
		category: "GOVERNANCE",
		required: false,
		acceptedFormats: ["pdf", "png", "jpg"],
		maxSizeMB: 5,
	},
];

const BODY_CORPORATE_REQUIREMENTS: DocumentRequirement[] = [
	{
		id: "BC_REGISTRATION",
		name: "Body Corporate Registration",
		description: "Sectional title registration or scheme rules",
		category: "ENTITY",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 10,
	},
	{
		id: "BC_RESOLUTION",
		name: "Managing Agent Appointment",
		description:
			"Resolution appointing managing agent or authorising signatories",
		category: "GOVERNANCE",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "BC_TRUSTEE_LIST",
		name: "List of Trustees",
		description: "Current list of body corporate trustees",
		category: "GOVERNANCE",
		required: true,
		acceptedFormats: ["pdf", "docx"],
		maxSizeMB: 5,
	},
	{
		id: "BC_MINUTES",
		name: "AGM Minutes",
		description: "Most recent AGM minutes",
		category: "GOVERNANCE",
		required: false,
		acceptedFormats: ["pdf"],
		maxSizeMB: 10,
	},
];

const PARTNERSHIP_REQUIREMENTS: DocumentRequirement[] = [
	{
		id: "PARTNERSHIP_AGREEMENT",
		name: "Partnership Agreement",
		description: "Signed partnership agreement between all partners",
		category: "ENTITY",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 10,
	},
	{
		id: "PARTNER_IDS",
		name: "Partner ID Documents",
		description: "ID documents for all partners",
		category: "IDENTITY",
		required: true,
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMB: 10,
	},
	{
		id: "PARTNER_AUTHORITY",
		name: "Partner Authority Letter",
		description: "Letter authorising the applying partner to act on behalf of all",
		category: "GOVERNANCE",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
];

const CLOSE_CORPORATION_REQUIREMENTS: DocumentRequirement[] = [
	{
		id: "CC_FOUNDING_STATEMENT",
		name: "CK1 Founding Statement",
		description: "Close Corporation founding statement",
		category: "ENTITY",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "CC_MEMBERS",
		name: "Member Certificate",
		description: "Certificate showing current members and their interests",
		category: "ENTITY",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
	{
		id: "MEMBER_IDS",
		name: "Member ID Documents",
		description: "ID documents for all members",
		category: "IDENTITY",
		required: true,
		acceptedFormats: ["pdf", "jpg", "png"],
		maxSizeMB: 10,
	},
	{
		id: "CC_RESOLUTION",
		name: "Member Resolution",
		description: "Resolution authorising the application",
		category: "GOVERNANCE",
		required: true,
		acceptedFormats: ["pdf"],
		maxSizeMB: 5,
	},
];

// ============================================
// Industry-Specific Additional Requirements
// ============================================

export const INDUSTRY_REQUIREMENTS: Record<string, DocumentRequirement[]> = {
	INSURANCE: [
		{
			id: "FSCA_CERTIFICATE",
			name: "FSCA Registration Certificate",
			description: "Financial Sector Conduct Authority registration",
			category: "REGULATORY",
			required: true,
			acceptedFormats: ["pdf"],
			maxSizeMB: 5,
		},
	],
	SECURITY: [
		{
			id: "PSIRA_CERTIFICATE",
			name: "PSIRA Registration",
			description: "Private Security Industry Regulatory Authority certificate",
			category: "REGULATORY",
			required: true,
			acceptedFormats: ["pdf"],
			maxSizeMB: 5,
		},
	],
	CREDIT_PROVIDER: [
		{
			id: "NCR_CERTIFICATE",
			name: "NCR Registration",
			description: "National Credit Regulator registration certificate",
			category: "REGULATORY",
			required: true,
			acceptedFormats: ["pdf"],
			maxSizeMB: 5,
		},
	],
	ACCOUNTABLE_INSTITUTION: [
		{
			id: "FIC_REGISTRATION",
			name: "FIC Registration",
			description: "Financial Intelligence Centre registration",
			category: "REGULATORY",
			required: true,
			acceptedFormats: ["pdf"],
			maxSizeMB: 5,
		},
	],
};

// ============================================
// Main Service Functions
// ============================================

/**
 * Resolve business type from either explicit entityType (DB) or derived businessType
 */
export function resolveBusinessType(
	entityType?: string | null,
	businessType?: BusinessType | string | null
): BusinessType {
	// Prefer explicit entityType from DB
	if (entityType) {
		const mapped = determineBusinessType({ entityType });
		return mapped;
	}
	// Fallback to derived businessType
	if (businessType) {
		const parsed = BusinessTypeSchema.safeParse(businessType);
		if (parsed.success) return parsed.data;
	}
	return "COMPANY";
}

/**
 * Get document requirements based on business type
 */
export function getDocumentRequirements(
	businessType: BusinessType,
	industry?: string
): MandateDocumentRequirements {
	const typeRequirements = getBusinessTypeRequirements(businessType);
	const industryRequirements = industry
		? INDUSTRY_REQUIREMENTS[industry.toUpperCase()] || []
		: [];

	const allDocuments = [
		...BASE_REQUIREMENTS,
		...typeRequirements,
		...industryRequirements,
	];

	const required = allDocuments.filter(d => d.required);
	const optional = allDocuments.filter(d => !d.required);

	return {
		businessType,
		totalRequired: required.length,
		totalOptional: optional.length,
		documents: allDocuments,
	};
}

/**
 * Get requirements for a specific business type
 */
function getBusinessTypeRequirements(
	businessType: BusinessType
): DocumentRequirement[] {
	const requirementsMap: Record<BusinessType, DocumentRequirement[]> = {
		NPO: NPO_REQUIREMENTS,
		PROPRIETOR: PROPRIETOR_REQUIREMENTS,
		COMPANY: COMPANY_REQUIREMENTS,
		TRUST: TRUST_REQUIREMENTS,
		BODY_CORPORATE: BODY_CORPORATE_REQUIREMENTS,
		PARTNERSHIP: PARTNERSHIP_REQUIREMENTS,
		CLOSE_CORPORATION: CLOSE_CORPORATION_REQUIREMENTS,
	};

	return requirementsMap[businessType] || COMPANY_REQUIREMENTS;
}

/**
 * Validate if all required documents are present
 */
export function validateDocumentCompleteness(
	businessType: BusinessType,
	uploadedDocumentIds: string[],
	industry?: string
): {
	complete: boolean;
	missing: DocumentRequirement[];
	percentage: number;
} {
	const requirements = getDocumentRequirements(businessType, industry);
	const requiredDocs = requirements.documents.filter(d => d.required);

	const uploadedSet = new Set(uploadedDocumentIds);
	const missing = requiredDocs.filter(doc => !uploadedSet.has(doc.id));

	const percentage =
		requiredDocs.length > 0
			? Math.round(
					((requiredDocs.length - missing.length) / requiredDocs.length) * 100
				)
			: 100;

	return {
		complete: missing.length === 0,
		missing,
		percentage,
	};
}

/**
 * Get summary of requirements for display
 */
export function getRequirementsSummary(businessType: BusinessType): {
	label: string;
	description: string;
	requiredCount: number;
	categories: DocumentCategory[];
} {
	const requirements = getDocumentRequirements(businessType);
	const categories = [
		...new Set(requirements.documents.map(d => d.category)),
	] as DocumentCategory[];

	const labels: Record<BusinessType, string> = {
		NPO: "Non-Profit Organisation",
		PROPRIETOR: "Sole Proprietor",
		COMPANY: "Company (Pty Ltd)",
		TRUST: "Trust",
		BODY_CORPORATE: "Body Corporate",
		PARTNERSHIP: "Partnership",
		CLOSE_CORPORATION: "Close Corporation",
	};

	const descriptions: Record<BusinessType, string> = {
		NPO: "Registration, constitution, board resolution, and board member details required",
		PROPRIETOR: "Personal identification and proof of residence required",
		COMPANY: "CIPC registration, director details, share certificates, and board resolution required",
		TRUST: "Trust deed, letter of authority, trustee IDs, and beneficiary information required",
		BODY_CORPORATE: "Registration, managing agent appointment, and trustee list required",
		PARTNERSHIP: "Partnership agreement, partner IDs, and authority letter required",
		CLOSE_CORPORATION: "CK1 founding statement, member certificate, and resolution required",
	};

	return {
		label: labels[businessType],
		description: descriptions[businessType],
		requiredCount: requirements.totalRequired,
		categories,
	};
}

/**
 * Determine business type from facility application data
 */
export function determineBusinessType(
	facilityData: Record<string, unknown>
): BusinessType {
	const entityType = (
		(facilityData.entityType as string) ||
		(facilityData.businessType as string) ||
		""
	)
		.toUpperCase()
		.replace(/\s+/g, "_");

	// Map common variations to our standard types
	const typeMapping: Record<string, BusinessType> = {
		NPO: "NPO",
		"NON-PROFIT": "NPO",
		NONPROFIT: "NPO",
		"NON_PROFIT": "NPO",
		PROPRIETOR: "PROPRIETOR",
		SOLE_PROPRIETOR: "PROPRIETOR",
		INDIVIDUAL: "PROPRIETOR",
		SOLE_TRADER: "PROPRIETOR",
		COMPANY: "COMPANY",
		PTY_LTD: "COMPANY",
		"(PTY)_LTD": "COMPANY",
		PRIVATE_COMPANY: "COMPANY",
		TRUST: "TRUST",
		FAMILY_TRUST: "TRUST",
		BUSINESS_TRUST: "TRUST",
		BODY_CORPORATE: "BODY_CORPORATE",
		SECTIONAL_TITLE: "BODY_CORPORATE",
		HOA: "BODY_CORPORATE",
		PARTNERSHIP: "PARTNERSHIP",
		GENERAL_PARTNERSHIP: "PARTNERSHIP",
		CC: "CLOSE_CORPORATION",
		CLOSE_CORPORATION: "CLOSE_CORPORATION",
	};

	return typeMapping[entityType] || "COMPANY";
}
