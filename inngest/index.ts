/**
 * Inngest exports - client and all functions
 * Import this in the API route to serve functions
 */
export { inngest } from "./client";
export { onboardingWorkflow } from "./functions/onboarding";

// Export all functions as array for serve()
import { onboardingWorkflow } from "./functions/onboarding";
export const functions = [onboardingWorkflow];
