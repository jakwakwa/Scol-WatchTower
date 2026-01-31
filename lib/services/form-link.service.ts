import { createFormInstance } from "@/lib/services/form.service";
import type { FormType } from "@/lib/types";

export interface FormLink {
	formType: FormType;
	url: string;
}

export interface FormLinkBundle {
	links: FormLink[];
}

export async function generateFormLinks(options: {
	applicantId: number;
	workflowId: number;
}) {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

	const formTypes: FormType[] = [
		"FACILITY_APPLICATION",
		"SIGNED_QUOTATION",
		"STRATCOL_CONTRACT",
		"ABSA_6995",
		"DOCUMENT_UPLOADS",
	];

	const links: FormLink[] = [];

	for (const formType of formTypes) {
		const { token } = await createFormInstance({
			applicantId: options.applicantId,
			workflowId: options.workflowId,
			formType,
		});

		const url =
			formType === "DOCUMENT_UPLOADS"
				? `${baseUrl}/uploads/${token}`
				: `${baseUrl}/forms/${token}`;

		links.push({ formType, url });
	}

	return { links };
}

export async function sendFormLinksEmail(options: {
	email: string;
	contactName?: string;
	links: FormLink[];
}) {
	const resendApiKey = process.env.RESEND_API_KEY;
	const intro = options.contactName ? `Hi ${options.contactName},` : "Hello,";

	const linkHtml = options.links
		.map(
			(link) =>
				`<li><strong>${link.formType.replace(/_/g, " ")}</strong>: <a href="${link.url}">${link.url}</a></li>`,
		)
		.join("");

	const html = `
		<p>${intro}</p>
		<p>Please complete the following onboarding forms:</p>
		<ul>${linkHtml}</ul>
		<p>If you have any questions, reply to this email.</p>
	`;

	if (resendApiKey) {
		try {
			const { Resend } = await import("resend");
			const resend = new Resend(resendApiKey);
			const { data, error } = await resend.emails.send({
				from: "StratCol Onboarding <onboarding@stratcol.co.za>",
				to: options.email,
				subject: "StratCol onboarding forms",
				html,
			});

			if (error) {
				return { success: false, error: error.message };
			}

			return { success: true, messageId: data?.id };
		} catch (err) {
			console.warn("[FormLinks] Resend API failed, using mock:", err);
		}
	}

	console.log("[FormLinks] Mock email sent", {
		to: options.email,
		links: options.links,
	});

	return { success: true, messageId: `mock-${Date.now()}` };
}
