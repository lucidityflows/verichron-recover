# UI Managers Dunning Feature Strategy

**Status:** In Progress (Phase 1 & 2 Core Complete)
**Target:** MVP
**Feature:** Dunning Sequence Builder (WorkflowBuilder)

## 1. Executive Summary

The `ui-managers` WorkflowBuilder allows users to design timeline-based communication sequences (e.g., "Send Email immediately", "Wait 3 days", "Send Task").

**Current Progress:**
*   **Temporal Logic (BACKEND):** ✅ COMPLETE. The `api-workflows` engine now respects `delayDays` and uses BullMQ/Redis to schedule future actions.
*   **UI Integration:** ✅ COMPLETE. The `WorkflowBuilder.tsx` is now live and connected to the `api-workflows` and `api-communications` services.
*   **Type Safety:** ✅ COMPLETE. Restored production-grade type safety by implementing strongly-typed Action Config DTOs and polymorphic OpenAPI schemas.

---

## 2. Architecture Alignment

### The Data Model
The UI's "Workflow" maps to the backend `WorkflowRule`.

| UI Concept | Backend Entity | Notes |
| :--- | :--- | :--- |
| **Workflow Strategy** | `WorkflowRule` | The container for the sequence. |
| **Trigger** | `WorkflowRule.triggerType` | Supports `DEBT_CREATED`, `TIME_BASED`, `PAYMENT_PROMISE_BROKEN`, etc. |
| **Step / Node** | `WorkflowAction` | Now strongly typed using specific Config DTOs (Email, Task, etc.). |
| **Delay / Timer** | `WorkflowAction.config.delayDays` | ✅ **Now enforced by Engine via BullMQ.** |

---

## 3. Implementation Status

### ✅ Phase 1: Enable Temporal Execution (Backend)
1.  **Modify `SchedulerService`:** Added `addWorkflowActionJob` method.
2.  **Update `SchedulerProcessor`:** Added `execute-workflow-action` handler.
3.  **Refactor `EngineService`:** `executeActions` now splits immediate actions from delayed actions, scheduling the latter via BullMQ.
4.  **Strong Typing:** Created specific DTOs (`SendEmailConfigDto`, `CreateTaskConfigDto`, etc.) to replace generic `Record<string, any>`.

### ✅ Phase 2: Connect the UI (Frontend)
1.  **API Hooks:** Replaced mock data with Orval-generated hooks (`useWorkflowRulesControllerFindAll`, `useWorkflowRulesControllerUpdate`, etc.).
2.  **Trigger Selection:** Added UI for changing the `triggerType` per workflow.
3.  **Task Configuration:** Implemented high-fidelity inspector forms for `CREATE_TASK` using standard `ActionType` and `WorkflowPriority` enums.
4.  **Template Picker:** Connected to `api-communications` to browse and select live message templates.

### ⏳ Phase 3: Validation & Cleanup (Remaining Gaps)
1.  **Stop-Work Logic:** Implement the "is debt paid?" check inside the `SchedulerProcessor` before firing a delayed action.
2.  **Status Changed Listener:** Implement `DEBTS_STATUS_CHANGED` listener to allow for more complex workflow terminations.
3.  **Audit Drawer:** Enhance the `AuditActionDrawer` to dynamically calculate changes between the original rule and the edited state.

---

## 4. Current Blockers / Risks

*   **Orval Union Types:** While the backend is now strongly typed, the generated `WorkflowActionDtoConfig` in the frontend is still showing as `unknown` in some environments. This requires a refresh of the OpenAPI JSON and a re-run of the Orval generator to pick up the new `oneOf` schemas.
*   **SMS Support:** The `WorkflowActionDtoType` enum currently lacks an explicit `SEND_SMS` type (defaults to `SEND_EMAIL` or `CREATE_TASK` for now).

## 5. Recommendation

The core infrastructure is now **Live**. Managers can define sequences and they will fire at the correct times. We should focus the next 2 hours on **Logic Gate Verification**: ensuring that if a debtor pays on Day 2, the Day 7 and Day 14 emails are automatically suppressed.