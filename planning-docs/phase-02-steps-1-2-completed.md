Temporal Integration Walkthrough
Overview
We have successfully implemented the core orchestration layer using Temporal.io. This enables the "Financial Onboarding" workflow to run as a reliable, long-running process that survives server restarts and manages state automatically.

Changes Implemented
1. Infrastructure Setup
Dependencies: Installed @temporalio/client, @temporalio/worker, etc.
Client: Created 
lib/temporal.ts
 to manage the connection to the Temporal Service.
Worker: Created 
scripts/temporal-worker.ts
 to execute workflows and activities.
2. Core Workflow Logic (temporal/)
Activities (
activities.ts
):
sendZapierWebhook
: Placeholder for sending callbacks to Zapier.
updateDbStatus
: Real-time updates to the local workflows database table using Drizzle ORM.
Workflows (
workflows.ts
):
onboardingWorkflow
: Implements the 4-stage lifecycle (Lead Capture -> Quotation -> Verification -> Integration).
3. API Integration
app/api/workflows/route.ts
: Modified the creation endpoint to automatically trigger the Temporal workflow when a new workflow record is created in the database.
Lazy Initialization: Implemented 
getTemporalClient()
 in 
lib/temporal.ts
 to ensure the Temporal connection is only established at runtime, preventing build failures when the Temporal server is offline.
Verification
Build: bun run build passed successfully.
Worker: The worker script is ready to run via bun run scripts/temporal-worker.ts.
Workflow Trigger: Creating a new workflow via the Dashboard or API will now initiate the Temporal process.
Next Steps
Run the Temporal server locally (temporal server start-dev).
Run the worker (bun run scripts/temporal-worker.ts).
Test the end-to-end flow by creating a new Lead/Workflow.