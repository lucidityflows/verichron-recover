# Verichron Master Event List

## Event Naming Standards

1. **Facts (Publisher First)**: `<SERVICE_NAME>.<ENTITY>.<PAST_TENSE>`
   - *Example*: `USERS.USER.CREATED`, `COMMUNICATIONS.EMAIL.DISPATCHED`
2. **Commands (Instruction First)**: `COMMAND.<TARGET_SERVICE>.<ACTION>.<PHASE>`
   - Phases: `EXECUTE`, `COMPLETE`, `FAILED`
   - *Example*: `COMMAND.COMMUNICATIONS.SEND_EMAIL.EXECUTE`
3. **Orchestration**: `ORCH.<WORKFLOW_NAME>.<STATUS>`
   - *Example*: `ORCH.ONBOARDING.COMPLETED`
4. **Websockets**: `WS.<DOMAIN>.<EVENT>`
   - *Example*: `WS.DASHBOARD.PAYMENT_RECEIVED`

---

## 1. Domain Facts (Published by Service)

| Service | Event Constant | String Value | Purpose |
| :--- | :--- | :--- | :--- |
| **Users** | `USERS_USER_CREATED` | `USERS.USER.CREATED` | User record finalized |
| **Debtors** | `DEBTORS_PROFILE_CREATED` | `DEBTORS.PROFILE.CREATED` | Org-debtor link created |
| **Debts** | `DEBTS_PORTFOLIO_IMPORT_STARTED` | `DEBTS.PORTFOLIO_IMPORT.STARTED` | Job began |
| **Communications**| `COMMUNICATIONS_EMAIL_DISPATCHED`| `COMMUNICATIONS.EMAIL.DISPATCHED` | Email left the gateway |

## 2. Command Requests (Target-Based)

| Target Service | Event Constant | String Value | Subscriber |
| :--- | :--- | :--- | :--- |
| **Communications**| `COMMAND_COMMUNICATIONS_SEND_EMAIL` | `COMMAND.COMMUNICATIONS.SEND_EMAIL.EXECUTE` | `api-communications` |
| **Automations** | `COMMAND_AUTOMATIONS_ASSIGN_DEBT` | `COMMAND.AUTOMATIONS.ASSIGN_DEBT.EXECUTE` | `api-automations` |
| **Users** | `COMMAND_USERS_PROVISION_ADMIN` | `COMMAND.USERS.PROVISION_ADMIN.EXECUTE` | `api-users` |

## 3. Websocket Events (Frontend Broadcasts)

| Domain | Event Constant | String Value | Logic Source |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `WS_DASHBOARD_PAYMENT_RECEIVED` | `WS.DASHBOARD.PAYMENT_RECEIVED` | `api-organizations` |
| **Workstation** | `WS_WORKSTATION_ITEM_ASSIGNED` | `WS.WORKSTATION.ITEM_ASSIGNED` | `api-organizations` |

---

## Multi-Service Lifecycle Documentation

### A. Debtor Invitation Lifecycle
1. **Debtors** -> `DEBTORS.INVITATION.REQUESTED` (Fact: Request logged)
2. **Users** -> `USERS.DEBTOR_USER.CREATED` (Fact: Identity ready)
3. **Workflows** -> `COMMAND.COMMUNICATIONS.SEND_EMAIL.EXECUTE` (Command: Send invite)
4. **Communications** -> `COMMUNICATIONS.EMAIL.DISPATCHED` (Fact: Sent)
5. **Communications** -> `COMMAND.COMMUNICATIONS.SEND_EMAIL.COMPLETE` (Fact: Command done)

### B. Portfolio Import Lifecycle
1. **Debts** -> `DEBTS.PORTFOLIO_IMPORT.STARTED`
2. **Debts** -> `DEBTS.DEBTOR_BATCH.READY`
3. **Debtors** -> `DEBTORS.IMPORT_BATCH.COMPLETED`
4. **Debts** -> `DEBTS.DEBT.CREATED`
