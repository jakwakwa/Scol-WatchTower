# Event-Driven Intelligence Layer: Process Flow

This document visualizes the "Agentic" architecture implemented in Phase 2. The system decouples state management (Temporal) from task execution (Next.js/Zapier), using signals to coordinate handoffs.

## 1. Process Diagram

```mermaid
sequenceDiagram
    autonumber
    participant UI as Next.js UI (Control Tower)
    participant API as Next.js API
    participant T as Temporal Workflow
    participant AI as Internal AI Engine (Mock)
    participant Z as Zapier (External Agents)

    Note over UI, Z: Stage 1: Lead Capture
    UI->>API: POST /api/workflows (New Lead)
    API->>T: Start Workflow (Lead Captured)
    T->>T: Update DB Status: Stages 1 -> 2

    Note over UI, Z: Stage 2: Dynamic Quotation
    T->>AI: Generate Quote (Mock Activity)
    AI-->>T: Quote Details
    T->>T: Status: Awaiting Quality Gate
    
    Note right of UI: Human/Logic Validates Data
    UI->>API: POST /api/workflows/:id/signal
    API->>T: SIG: qualityGatePassed
    
    T->>T: Gate Passed. Proceed to Stage 3.

    Note over UI, Z: Stage 3: Intelligent Verification
    T->>AI: AI Risk Analysis (Mock Activity)
    AI-->>T: Risk Score & Anomalies
    
    T->>Z: Dispatch "RISK_VERIFICATION" Webhook
    T->>T: Status: Awaiting Agent Callback
    
    Note right of Z: Zapier Agent / Human Review
    Z->>API: POST /api/callbacks/zapier
    API->>T: SIG: agentCallbackReceived
    
    alt Outcome = REJECTED
        T->>T: Status: FAILED
        T->>Z: Notify Rejection
    else Outcome = APPROVED
        T->>T: Status: COMPLETED
        T->>Z: Sync Integration
    end
```

## 2. Step-by-Step Process Summary

### Stage 1: Initialization
- **Action**: User creates a lead in the dashboard.
- **System**: Next.js API creates a DB record and immediately starts the Temporal Workflow.
- **State**: Workflow enters `Stage 1` (Lead Capture).

### Stage 2: Dynamic Quotation & Quality Gate
- **Quotation**: The workflow automatically calls the internal Pricing Engine (mocked) to generate a quote.
- **Quality Gate**: The workflow **pauses** execution. It enters a sleep state, waiting for the `qualityGatePassed` signal.
- **Validation**:
  - The Next.js UI/Backend validates the "Facility Application" data (e.g., compulsory fields, Zod schema).
  - Once valid, the API sends the `qualityGatePassed` signal to Temporal.
- **Result**: Workflow wakes up and proceeds to Stage 3.

### Stage 3: Intelligent Verification (The "Agentic" Shift)
- **AI Analysis**: The workflow runs an internal pre-screening (Mock AI) to detect fraud or anomalies in documents.
- **Zapier Dispatch**: The workflow sends a rich payload (Risk Score, Anomalies, Quote) to a specific Zapier Webhook URL.
- **Async Wait**: The workflow **pauses** again, waiting for the `agentCallbackReceived` signal.
- **External Action**:
  - Zapier processes the data.
  - An External Agent (Code or Human) reviews the risk.
  - Zapier posts the result back to `/api/callbacks/zapier`.
- **Callback**: The Next.js API receives the Zapier payload, validates it, and signals the workflow.

### Stage 4: Integration
- **Decision Logic**: The workflow evaluates the Agent's decision.
  - **If Rejected**: Marks workflow as Failed and sends rejection notification.
  - **If Approved**: Marks workflow as Completed and performs final sync.
