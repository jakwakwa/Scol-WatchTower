import { DashboardLayout } from "@/components/dashboard";
import { LeadForm } from "@/components/dashboard/lead-form";

export default function NewLeadPage() {
	return (
		<DashboardLayout
			title="New Lead"
			description="Create a new potential client to begin the onboarding process"
		>
			<div className="max-w-3xl">
				<LeadForm />
			</div>
		</DashboardLayout>
	);
}
