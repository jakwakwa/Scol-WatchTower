## Step 1: Define StratCol Domain Models (`src/lib/types.ts`)

Create Zod schemas for:

- `FacilityApplication`: (Company Name, Registration Number, VAT Number, Directors).
- `MandateType`: Enum (EFT, Naedo, DebiCheck, AVSR).
- `FicaDocumentAnalysis`: The structured output expected from the AI when reading a bank statement (must extract `accountHolderName`, `accountNumber`, `riskFlags` like "bounced debits").

## Step 2: The "Onboarding Saga" Workflow (`src/inngest/functions/onboarding.ts`)

Create a multi-step Inngest function `stratcol-client-onboarding`.

- **Trigger:** `crm/applicant.created`
- **Step 1 `run-itc-check`:** Mock an API call to a credit bureau. If score < 600, throw a "Auto-Decline" error or route to manual review.
- **Step 2 `generate-legal-pack`:** Mock the generation of Facility App & Quote.
- **Step 3 `wait-for-documents`:** Use `step.waitForEvent` to pause execution until the event `upload/fica.received` is fired. Timeout: 14 days.
- **Step 4 `ai-fica-verification`:** Use Vercel AI SDK (`google-vertex` or `openai` provider) to analyze the uploaded documents against the `FacilityApplication` data.
- **Step 5 `human-risk-review`:**
- If `aiTrustScore` is High: Auto-approve.
- If `aiTrustScore` is Low: Pause via `waitForEvent('risk/decision.received')` for the Risk Manager (Paula).

## Step 3: The "Control Tower" API (`src/app/api/risk-decision/route.ts`)

A Next.js Route Handler that allows the Risk Manager to approve/reject a client.

- This must validate the decision payload.
- It must send the `risk/decision.received` event to Inngest to resume the Saga.

## Step 4: V24 Integration (`src/lib/v24.ts`)

Create a mock service that simulates the final handoff:

- `createV24ClientProfile(data)`
- `scheduleTrainingSession(email)`

# Code Style

- Use `step.run` for all side effects.
- Use strict TypeScript.
- Comments should explain _business logic_ (e.g., "Waiting for PASA mandate approval").

---
