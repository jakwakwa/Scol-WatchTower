import FormShell from "@/components/forms/form-shell";
import UploadView from "./upload-view";
import { getAllDocumentRequirements } from "@/config/document-requirements";
import {
	getFormInstanceByToken,
	markFormInstanceStatus,
} from "@/lib/services/form.service";

interface UploadPageProps {
	params: Promise<{ token: string }>;
}

export default async function UploadPage({ params }: UploadPageProps) {
	const { token } = await params;
	const formInstance = await getFormInstanceByToken(token);

	if (!formInstance || formInstance.formType !== "DOCUMENT_UPLOADS") {
		return (
			<FormShell
				title="Upload link invalid"
				description="The upload link is invalid or no longer available.">
				<p className="text-sm text-muted-foreground">
					Please contact StratCol to request a new upload link.
				</p>
			</FormShell>
		);
	}

	if (formInstance.expiresAt && new Date(formInstance.expiresAt) < new Date()) {
		return (
			<FormShell title="Upload link expired" description="This link has expired.">
				<p className="text-sm text-muted-foreground">
					Please contact StratCol to request a fresh link.
				</p>
			</FormShell>
		);
	}

	if (formInstance.status === "sent" || formInstance.status === "pending") {
		await markFormInstanceStatus(formInstance.id, "viewed");
	}

	const requirements = getAllDocumentRequirements();

	return (
		<FormShell
			title="Document Uploads"
			description="Upload supporting documents for StratCol onboarding.">
			<UploadView token={token} requirements={requirements} />
		</FormShell>
	);
}
