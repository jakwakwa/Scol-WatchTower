import type { DocumentCategory, DocumentType } from "@/lib/types";

export interface DocumentRequirement {
	type: DocumentType;
	label: string;
	category: DocumentCategory;
	required: boolean;
	description?: string;
}

export interface DocumentRequirementContext {
	entityType?: "company" | "trust" | "npo" | "body_corporate";
	industry?: string;
	productTypes?: string[];
	isExistingUser?: boolean;
	saleOfBusiness?: boolean;
	needsBankGuarantee?: boolean;
	riskBased?: boolean;
}

const standardApplicationRequirements: DocumentRequirement[] = [
	{
		type: "INVOICE",
		label: "Last 3 invoices (if applicable)",
		category: "standard_application",
		required: false,
	},
	{
		type: "EXISTING_MANDATE",
		label: "Existing mandates (if applicable)",
		category: "standard_application",
		required: false,
	},
	{
		type: "BANK_GUARANTEE",
		label: "Bank guarantee (if option selected)",
		category: "standard_application",
		required: false,
	},
];

const standardFicaEntityRequirements: DocumentRequirement[] = [
	{
		type: "COMPANY_REGISTRATION",
		label: "Company registration documents",
		category: "fica_entity",
		required: true,
	},
	{
		type: "TRUST_DEED",
		label: "Trust deed (if applicable)",
		category: "fica_entity",
		required: false,
	},
	{
		type: "NPO_CERTIFICATE",
		label: "NPO certificate (if applicable)",
		category: "fica_entity",
		required: false,
	},
	{
		type: "TAX_VAT",
		label: "Tax and VAT documents",
		category: "fica_entity",
		required: true,
	},
	{
		type: "SERVICE_DESCRIPTION",
		label: "Full description of services",
		category: "fica_entity",
		required: true,
	},
];

const standardFicaIndividualsRequirements: DocumentRequirement[] = [
	{
		type: "DIRECTOR_ID",
		label: "Copy of ID (directors/shareholders/owners)",
		category: "fica_individual",
		required: true,
	},
	{
		type: "PROOF_OF_RESIDENCE",
		label: "Proof of residential address (max 3 months)",
		category: "fica_individual",
		required: true,
	},
];

const standardFicaBusinessRequirements: DocumentRequirement[] = [
	{
		type: "BUSINESS_PREMISES_PROOF",
		label: "Proof of business premises address (max 3 months)",
		category: "fica_business",
		required: true,
	},
	{
		type: "BANK_STATEMENT",
		label: "Latest 3-month bank statement",
		category: "fica_business",
		required: true,
	},
	{
		type: "ACCOUNTING_OFFICER_LETTER",
		label: "Confirmation of accounting officer letter",
		category: "fica_business",
		required: false,
	},
	{
		type: "THIRD_PARTY_CONFIRMATION_LETTER",
		label: "3rd-party confirmation letter",
		category: "fica_business",
		required: false,
	},
];

const productSpecificRequirements: DocumentRequirement[] = [
	{
		type: "INTERMEDIARY_AGREEMENT",
		label: "Intermediary agreement",
		category: "product_specific",
		required: false,
	},
	{
		type: "COLMS_APPLICATION",
		label: "COLMS application (compulsory for call centre)",
		category: "product_specific",
		required: false,
	},
	{
		type: "SERVICE_AGREEMENT",
		label: "Service agreement",
		category: "product_specific",
		required: false,
	},
	{
		type: "PRODUCT_DESCRIPTION",
		label: "Product description",
		category: "product_specific",
		required: false,
	},
	{
		type: "SUPPLIER_CONTACT_INFO",
		label: "Supplier contact information",
		category: "product_specific",
		required: false,
	},
	{
		type: "CALL_SCRIPT",
		label: "Call script",
		category: "product_specific",
		required: false,
	},
];

const industrySpecificRequirements: DocumentRequirement[] = [
	{ type: "NPO_CONSTITUTION", label: "NPO constitution", category: "industry_specific", required: false },
	{ type: "NPO_RESOLUTION", label: "NPO resolution", category: "industry_specific", required: false },
	{ type: "NPO_BOARD_LIST", label: "List of board members", category: "industry_specific", required: false },
	{ type: "TRUST_LETTER_OF_AUTHORITY", label: "Letter of authority", category: "industry_specific", required: false },
	{ type: "TRUST_BENEFICIARY_IDS", label: "Beneficiary IDs", category: "industry_specific", required: false },
	{ type: "TRUST_BENEFICIARY_ADDRESSES", label: "Beneficiary addresses", category: "industry_specific", required: false },
	{ type: "TRUST_ORGANOGRAM", label: "Organogram (on request)", category: "industry_specific", required: false },
	{
		type: "BODY_CORPORATE_RESOLUTION",
		label: "Body corporate resolution",
		category: "industry_specific",
		required: false,
	},
	{
		type: "BODY_CORPORATE_BOARD_LIST",
		label: "Body corporate board list",
		category: "industry_specific",
		required: false,
	},
	{ type: "INSURANCE_FSCA_CERT", label: "FSCA certificate", category: "industry_specific", required: false },
	{ type: "SECURITY_PSIRA_CERT", label: "PSIRA certificate", category: "industry_specific", required: false },
	{ type: "FIC_REGISTRATION", label: "FIC registration number", category: "industry_specific", required: false },
	{ type: "NCR_CERTIFICATE", label: "NCR certificate", category: "industry_specific", required: false },
];

const riskBasedRequirements: DocumentRequirement[] = [
	{
		type: "INSTRUCTION_LETTER_CHANGES",
		label: "Instruction letter for changes (existing users)",
		category: "risk_based",
		required: false,
	},
	{
		type: "SALES_AGREEMENT",
		label: "Sales agreement (sale of business)",
		category: "risk_based",
		required: false,
	},
	{
		type: "FINANCIAL_STATEMENTS",
		label: "Financial statements (on request)",
		category: "risk_based",
		required: false,
	},
	{
		type: "CONSENT_FORM",
		label: "Usage of consent form (if applicable)",
		category: "risk_based",
		required: false,
	},
];

const hasIndustry = (industry: string | undefined, token: string) => {
	if (!industry) return false;
	return industry.toLowerCase().includes(token.toLowerCase());
};

export function getDocumentRequirements(context: DocumentRequirementContext) {
	const requirements: DocumentRequirement[] = [
		...standardApplicationRequirements,
		...standardFicaEntityRequirements,
		...standardFicaIndividualsRequirements,
		...standardFicaBusinessRequirements,
	];

	if (context.needsBankGuarantee) {
		requirements.push({
			type: "BANK_GUARANTEE",
			label: "Bank guarantee",
			category: "standard_application",
			required: true,
		});
	}

	if (context.productTypes?.some(type => type.toLowerCase().includes("premium"))) {
		requirements.push({
			type: "INTERMEDIARY_AGREEMENT",
			label: "Intermediary agreement",
			category: "product_specific",
			required: true,
		});
	}

	if (context.productTypes?.some(type => type.toLowerCase().includes("call centre"))) {
		requirements.push(
			{ type: "COLMS_APPLICATION", label: "COLMS application", category: "product_specific", required: true },
			{ type: "SERVICE_AGREEMENT", label: "Service agreement", category: "product_specific", required: true },
			{ type: "PRODUCT_DESCRIPTION", label: "Product description", category: "product_specific", required: true },
			{ type: "SUPPLIER_CONTACT_INFO", label: "Supplier contact information", category: "product_specific", required: true },
			{ type: "CALL_SCRIPT", label: "Call script", category: "product_specific", required: true },
		);
	}

	if (context.entityType === "npo" || hasIndustry(context.industry, "npo")) {
		requirements.push(
			{ type: "NPO_CONSTITUTION", label: "NPO constitution", category: "industry_specific", required: true },
			{ type: "NPO_RESOLUTION", label: "NPO resolution", category: "industry_specific", required: true },
			{ type: "NPO_BOARD_LIST", label: "List of board members", category: "industry_specific", required: true },
		);
	}

	if (context.entityType === "trust" || hasIndustry(context.industry, "trust")) {
		requirements.push(
			{ type: "TRUST_LETTER_OF_AUTHORITY", label: "Letter of authority", category: "industry_specific", required: true },
			{ type: "TRUST_BENEFICIARY_IDS", label: "Beneficiary IDs", category: "industry_specific", required: true },
			{ type: "TRUST_BENEFICIARY_ADDRESSES", label: "Beneficiary addresses", category: "industry_specific", required: true },
			{ type: "TRUST_ORGANOGRAM", label: "Organogram", category: "industry_specific", required: false },
		);
	}

	if (context.entityType === "body_corporate" || hasIndustry(context.industry, "body corporate")) {
		requirements.push(
			{ type: "BODY_CORPORATE_RESOLUTION", label: "Body corporate resolution", category: "industry_specific", required: true },
			{ type: "BODY_CORPORATE_BOARD_LIST", label: "List of board members", category: "industry_specific", required: true },
		);
	}

	if (hasIndustry(context.industry, "insurance")) {
		requirements.push({
			type: "INSURANCE_FSCA_CERT",
			label: "FSCA certificate",
			category: "industry_specific",
			required: true,
		});
	}

	if (hasIndustry(context.industry, "security")) {
		requirements.push({
			type: "SECURITY_PSIRA_CERT",
			label: "PSIRA certificate",
			category: "industry_specific",
			required: true,
		});
	}

	if (hasIndustry(context.industry, "fic")) {
		requirements.push({
			type: "FIC_REGISTRATION",
			label: "FIC registration number",
			category: "industry_specific",
			required: true,
		});
	}

	if (hasIndustry(context.industry, "loan") || hasIndustry(context.industry, "debt")) {
		requirements.push({
			type: "NCR_CERTIFICATE",
			label: "NCR certificate",
			category: "industry_specific",
			required: true,
		});
	}

	if (context.isExistingUser) {
		requirements.push({
			type: "INSTRUCTION_LETTER_CHANGES",
			label: "Instruction letter for changes",
			category: "risk_based",
			required: true,
		});
	}

	if (context.saleOfBusiness) {
		requirements.push({
			type: "SALES_AGREEMENT",
			label: "Sales agreement",
			category: "risk_based",
			required: true,
		});
	}

	if (context.riskBased) {
		requirements.push(
			{
				type: "FINANCIAL_STATEMENTS",
				label: "Financial statements",
				category: "risk_based",
				required: true,
			},
			{
				type: "CONSENT_FORM",
				label: "Usage of consent form",
				category: "risk_based",
				required: true,
			},
		);
	}

	return requirements;
}

export function getAllDocumentRequirements() {
	return [
		...standardApplicationRequirements,
		...standardFicaEntityRequirements,
		...standardFicaIndividualsRequirements,
		...standardFicaBusinessRequirements,
		...productSpecificRequirements,
		...industrySpecificRequirements,
		...riskBasedRequirements,
	];
}
