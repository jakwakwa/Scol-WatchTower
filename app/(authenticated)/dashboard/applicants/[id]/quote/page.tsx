import { redirect } from "next/navigation";

/**
 * Redirect /dashboard/applicants/[id]/quote to /dashboard/applicants/[id]?tab=reviews
 * Quote review is now handled in the Reviews tab on the applicant detail page.
 */
export default async function ApplicantQuotePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	redirect(`/dashboard/applicants/${id}?tab=reviews`);
}
