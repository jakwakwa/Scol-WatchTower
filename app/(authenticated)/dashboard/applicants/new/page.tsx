import { DashboardLayout } from "@/components/dashboard";
import { ApplicantForm } from "@/components/dashboard/applicant-form";

export default function NewApplicantPage() {
	return (
		<DashboardLayout
			title="New Applicant"
			description="Create a new applicant to begin the onboarding process"
		>
			<div className="max-w-3xl">
				<ApplicantForm />
			</div>
		</DashboardLayout>
	);
}
