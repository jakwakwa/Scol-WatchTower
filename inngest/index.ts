/**
 * Inngest exports - client and all functions
 * Import this in the API route to serve functions
 */
export { inngest } from "./client";
export { onboardingWorkflow } from "./functions/onboarding";
export { onboardingWorkflowV2 } from "./functions/onboarding-v2";

// Export all functions as array for serve()
import { onboardingWorkflow } from "./functions/onboarding";
import { onboardingWorkflowV2 } from "./functions/onboarding-v2";
import { documentAggregator } from "./functions/document-aggregator";

export const functions = [onboardingWorkflow, onboardingWorkflowV2, documentAggregator];
