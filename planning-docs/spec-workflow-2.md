# Workflow 2: Dynamic Quotation & Documentation - Specification

## Overview
This workflow automates the generation, approval, and distribution of fee proposals. It utilizes **Google Gemini** within Zapier to calculate risk-adjusted fees based on client data, stores the quote in the application database, and manages a human approval loop.

## Trigger
*   **Source:** Temporal Workflow (Stage 2)
*   **Event:** `QUOTATION_GENERATED`
*   **Webhook URL:** `WEBHOOK_ZAP_QUOTATION_TRIGGER`
*   **Payload:**
    ```json
    {
      "event": "QUOTATION_GENERATED",
      "leadId": 123,
      "workflowId": 456,
      "companyName": "Acme Corp",
      "estimatedVolume": "500000",
      "industry": "Mining",
      "email": "manager@acme.com"
    }
    ```

## Step-by-Step Configuration (Zapier)

### Step 1: Trigger (Webhooks by Zapier)
*   **Event:** `Catch Hook`
*   **Use:** The `WEBHOOK_ZAP_QUOTATION_TRIGGER` URL.

### Step 2: AI Calculation (Gemini / ChatGPT)
*   **Prompt:**
    > "Act as a Commercial Risk Analyst. Analyze this client:
    > Company: {{1.companyName}}
    > Industry: {{1.industry}}
    > Volume: {{1.estimatedVolume}}
    > Notes: {{1.leadNotes}}
    >
    > Calculate two fees:
    > 1. Base Fee (Standard): 1.50% (150 basis points)
    > 2. Risk Adjusted Fee: Based on industry risk AND qualitative notes.
    >    - High Risk (Mining/Construction OR bad history notes): +50bps
    >    - Med Risk (Retail OR neutral notes): +20bps
    >    - Low Risk (Tech/Services OR positive notes): +0bps
    >
    > Output ONLY JSON:
    > { "baseFeePercent": 150, "adjustedFeePercent": 200, "amount": 750000, "rationale": "Mining sector carries higher volatility." }"

### Step 3: Save Quote (Webhooks by Zapier)
*   **Method:** `POST`
*   **URL:** `[Your Base URL]/api/quotes`
*   **Headers:** `Content-Type: application/json`
*   **Body:**
    ```json
    {
      "workflowId": "{{1.workflowId}}",
      "amount": "{{2.amount}}",
      "baseFeePercent": "{{2.baseFeePercent}}",
      "generatedBy": "gemini"
    }
    ```
*   **Context:** This "locks in" the draft quote in your database.

### Step 4: Notify for Approval (Gmail)
*   **To:** [Your Internal Risk Manager Email]
*   **Subject:** "Approval Needed: Quote for {{1.companyName}}"
*   **Body:**
    > Lead: {{1.companyName}}
    > Proposed Fee: {{2.adjustedFeePercent}} bps
    > Rationale: {{2.rationale}}
    >
    > Link to Approve: [Your Dashboard URL]/dashboard/workflows/{{1.workflowId}}

## Clarifying Answers

1.  **Quote Storage:** We use the new `quotes` table in your SQLite/Turso DB.
    *   **Fields:** `id`, `workflowId`, `amount`, `baseFeePercent`, `adjustedFeePercent`, `status`.
2.  **Trigger Context:** Automatic. The Temporal workflow moves from Stage 1 -> Stage 2 immediately and fires the `QUOTATION_GENERATED` webhook.
3.  **Fee Approvers:** For this phase, we will implement a **Single Manager Approval** step via email notification to keep it simpler than a dual-branching setup initially, but the schema supports dual verification later.
4.  **Zaps Needed:**
    *   **Zap 2 (This one):** Generate & Notify.
    *   **Zap 3 (Approval):** Triggered when Manager clicks "Approve" (handled via app UI or separate webhook). For now, start with Zap 2 doing the Generation.

## Action Plan
1.  **Build Zap 2** following the steps above.
2.  **Test** using the Dashboard "Test Webhook" button (Select `QUOTATION_GENERATED`).
