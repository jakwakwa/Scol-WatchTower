/**
 * Inngest exports - client and all functions
 * Import this in the API route to serve functions
 */
export { inngest } from "./client";
export { onboardingWorkflowV2 } from "./functions/onboarding-v2";

// Export all functions as array for serve()
import { onboardingWorkflowV2 } from "./functions/onboarding-v2";
import { documentAggregator } from "./functions/document-aggregator";

export const functions = [onboardingWorkflowV2, documentAggregator];
