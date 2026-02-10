# Workflow & Agent Audit Report

**Date:** 2026-02-08
**Project:** Scol-WatchTower (Onboarding Control Tower)

## 1. Executive Summary

The codebase contains a sophisticated, event-driven onboarding workflow powered by Inngest. The architecture currently supports a "Phase 1" implementation which mixes real logic (flow control, form handling, document aggregation) with mock implementations for complex AI agents (Risk, Sanctions). The Validation Agent is "AI-ready" with a fallback to mocks.

## 2. Workflows (`inngest/functions`)

### 2.1 StratCol Control Tower Onboarding
**File:** `inngest/functions/control-tower-workflow.ts`
**ID:** `stratcol-control-tower`
**Status:** 🟢 **Active** (PRD-Aligned)

**Key Phases:**
| Phase | Description | Implementation Status |
| :--- | :--- | :--- |
| **Phase 1** | Application, ITC, Quote | ✅ Real Logic (Form links, DB updates, Quote generation) |
| **Phase 2** | Quote Signing | ✅ Real Logic (Wait for signature event) |
| **Phase 3** | Parallel Processing | ✅ Real Logic (Procurement & Doc Collection run in parallel) |
| **Kill Switch** | Immediate Termination | ✅ Implemented (Checks at every step) |
| **Phase 4** | AI Analysis & Review | ⚠️ Mixed (Flow is real, but Agents are mocks) |

**Observations:**
-   **Parallelism:** Uses `Promise.all` for true parallel execution of Stream A (Procurement) and Stream B (Documents).
-   **Safety:** Implements `guardKillSwitch` pattern to prevent execution of cancelled workflows.
-   **Events:** Emits business events (`onboarding/business-type.determined`, `agent/analysis.aggregated`) for external consumers.

### 2.2 FICA Document Aggregator
**File:** `inngest/functions/document-aggregator.ts`
**ID:** `fica-document-aggregator`
**Status:** 🟢 **Active**

**Logic:**
-   Listens for `document/uploaded`.
-   Checks if all required docs (Bank Statement, Accountant Letter) are present.
-   Emits `upload/fica.received` to resume the main workflow.

---

## 3. Agents (`lib/services/agents`)

### 3.1 Risk Agent
**File:** `lib/services/agents/risk.agent.ts`
**Status:** 🚧 **Mock (Phase 1)**

-   **Logic:** Generates deterministic risk scores based on `applicantId`.
-   **Simulations:** Simulates bank analysis (balance, volatility), cash flow, and financial stability.
-   **AI Integration:** None currently. Purely algorithmic mock.

### 3.2 Sanctions Agent
**File:** `lib/services/agents/sanctions.agent.ts`
**Status:** 🚧 **Mock (Phase 1)**

-   **Logic:** Generates deterministic hits based on a hash of the entity name.
-   **Simulations:** Simulates UN Sanctions, PEP hits, Adverse Media, and Watchlist matches.
-   **AI Integration:** None currently. Purely algorithmic mock.

### 3.3 Validation Agent
**File:** `lib/services/agents/validation.agent.ts`
**Status:** 🟡 **Hybrid (Real AI + Mock Fallback)**

-   **Logic:**
    1.  Checks `isAIConfigured()`.
    2.  **If Configured:** Uses `generateObject` (Vercel AI SDK) with a "Thinking Model" (Gemini) to analyze document content.
    3.  **Fallback:** Uses `generateMockValidation` (deterministic mock) if AI is missing or fails.
-   **Capabilities:** Authenticity checks, data integrity, date validation, cross-referencing.

---

## 4. Services & TODOs

### 4.1 Risk Service (`lib/services/risk.service.ts`)
-   **Status:** Sandbox Integration.
-   **Logic:** Integrates with `ProcureCheck` (Test Vendor/Sandbox).
-   **Notes:** Has fallback logic for API failures. Real-world integration would need to switch to production endpoints and likely async polling.

### 4.2 Notification Service (`lib/services/notification.service.ts`)
-   **Status:** Internal Logging.
-   **TODOs:**
    -   `escalateToManagement`: "TODO: Create internal notification for management" (Line 73). Currently just logs to console.
    -   Webhooks (Zapier) have been removed in favor of direct Inngest events/logging.

---

## 5. Audit Checklist

| Component | Item | Status | Action Required |
| :--- | :--- | :--- | :--- |
| **Workflow** | Control Tower Flow | ✅ Complete | None |
| **Agent** | Risk Analysis | 🚧 Mock | Implement real financial data API / LLM analysis |
| **Agent** | Sanctions Check | 🚧 Mock | Integrate real Sanctions API (e.g. LexisNexis/Refinitiv) |
| **Agent** | Doc Validation | 🟡 Hybrid | Ensure Gemini API key is set in production |
| **Service** | Management Alerts | 🔴 TODO | Implement email/Slack notification in `escalateToManagement` |
| **Service** | ProcureCheck | 🟡 Sandbox | Switch to production credentials when ready |
