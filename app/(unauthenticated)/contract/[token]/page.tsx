import ExternalStatusCard from "@/components/forms/external/external-status-card";
import {
	getFormInstanceByToken,
	markFormInstanceStatus,
} from "@/lib/services/form.service";
import ContractForm from "./contract-form";

interface ContractPageProps {
	params: Promise<{ token: string }>;
}

export default async function ContractPage({ params }: ContractPageProps) {
	const { token } = await params;
	const formInstance = await getFormInstanceByToken(token);

	if (!formInstance) {
		return (
			<div className="min-h-screen">
				<ExternalStatusCard
					title="Link invalid"
					description="The contract link is invalid or no longer available. Please contact StratCol to request a new link."
					variant="error"
				/>
			</div>
		);
	}

	if (formInstance.expiresAt && new Date(formInstance.expiresAt) < new Date()) {
		return (
			<div className="min-h-screen">
				<ExternalStatusCard
					title="Link expired"
					description="This contract link has expired. Please contact StratCol to request a fresh link."
					variant="error"
				/>
			</div>
		);
	}

	if (formInstance.status === "submitted") {
		return (
			<div className="min-h-screen">
				<ExternalStatusCard
					title="Contract Already Submitted"
					description="This contract has already been submitted. No further action is required. Thank you."
				/>
			</div>
		);
	}

	// Mark as viewed
	if (formInstance.status === "sent" || formInstance.status === "pending") {
		await markFormInstanceStatus(formInstance.id, "viewed");
	}

	return (
		<ContractForm
			token={token}
			applicantId={formInstance.applicantId}
			workflowId={formInstance.workflowId}
		/>
	);
}
