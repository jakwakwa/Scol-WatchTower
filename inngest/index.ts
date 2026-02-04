/**
 * Inngest exports - client and all functions
 * Import this in the API route to serve functions
 */
export { inngest } from "./client";
export { onboardingWorkflowV2 } from "./functions/onboarding-v2";
export { controlTowerWorkflow, killSwitchHandler } from "./functions/control-tower-workflow";

// Export all functions as array for serve()
import { onboardingWorkflowV2 } from "./functions/onboarding-v2";
import { documentAggregator } from "./functions/document-aggregator";
import { controlTowerWorkflow, killSwitchHandler } from "./functions/control-tower-workflow";

export const functions = [
	onboardingWorkflowV2,
	documentAggregator,
	controlTowerWorkflow,
	killSwitchHandler,
];
