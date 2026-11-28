# 🛡️ Communication Compliance Strategy: "Block, Don't Flag"

**Date:** December 27, 2025
**Scope:** `api-communications`, `api-organizations`, `ui-organizations`
**Status:** Approved for Implementation (Week 1 Roadmap)

---

## 1. Executive Summary

We are fundamentally shifting the Verichron platform from a **Reactive** compliance model (logging violations after they occur) to a **Proactive** model (making violations technically impossible).

This strategy defines the **"Block, Don't Flag"** architecture:
If a collector attempts a compliant action, the system executes it. If they attempt a non-compliant action (e.g., calling at 9:01 PM), the system **physically disables the interface** and rejects the API request.

### The "5 Iron Rules" of Enforcement
Every communication attempt must pass these five checks before dispatch:

1.  **Time Zone (FDCPA):** Is it 08:00–21:00 in the *debtor's* local time?
2.  **Frequency (Reg F):** Have we contacted them < 7 times in the last 7 days?
3.  **Cease & Desist:** Is the `doNotContact` flag active?
4.  **Channel Consent:** Did they opt-out of this specific channel (e.g., SMS)?
5.  **State Restrictions:** Are there stricter state-level overrides (e.g., MA)?

---

## 2. Architectural Responsibilities

To ensure performance and data locality, responsibilities are split between the "Brain" (Config) and the "Bouncer" (Enforcement).

### The Brain: Configuration (`api-organizations`)
*   **Role:** Policy Management.
*   **Responsibility:** Allows managers to define *stricter* rules than the legal minimum (e.g., "Max 2 calls/week" instead of 7).
*   **Output:** Publishes `OrganizationComplianceSettingsChanged` events.
*   **Context:** Owning the UI for the "Compliance Hub".

### The Bouncer: Enforcement (`api-communications`)
*   **Role:** Runtime Gatekeeper.
*   **Responsibility:** Validates every single dispatch request against the 5 Iron Rules.
*   **Data Access:** Has direct, zero-latency access to `DebtorPreferences` and `CommunicationLogs`.
*   **Action:** Returns `403 Forbidden` if a rule is violated.

---

## 3. Technical Specifications

### 3.1 New Endpoint: The "Pre-Flight" Check
We introduce a dedicated endpoint for the UI to proactively check permission before a user even clicks a button.

**`POST /compliance/check`**
*   **Service:** `api-communications`
*   **Payload:**
    ```json
    {
      "debtorId": "uuid",
      "channel": "VOICE | SMS | EMAIL",
      "mockTimestamp": "ISO-8601" (Optional, for testing)
    }
    ```
*   **Response (Allowed):**
    ```json
    {
      "allowed": true,
      "checks": { "time": true, "frequency": true, "consent": true }
    }
    ```
*   **Response (Blocked):**
    ```json
    {
      "allowed": false,
      "blockReason": "TIME_RESTRICTION",
      "message": "It is 09:15 PM in Chicago (CST). Allowed: 08:00-21:00.",
      "meta": { "debtorLocalTime": "21:15" }
    }
    ```

### 3.2 The `ComplianceService` Logic (Pseudocode)

```typescript
async validateDispatch(context: DispatchContext): Promise<Result> {
  // 1. Data Hydration (Parallel Fetch)
  const [prefs, history, rules] = await Promise.all([
    preferencesService.get(context.debtorId),
    logsService.getRecent(context.debtorId, days=7),
    rulesService.get(context.orgId)
  ]);

  // 2. Iron Rule: Cease & Desist
  if (prefs.doNotContact) return Block("CEASE_AND_DESIST");

  // 3. Iron Rule: Channel Consent
  if (prefs.optedOutChannels.includes(context.channel)) return Block("OPT_OUT");

  // 4. Iron Rule: Time Zone (The hard one)
  const localTime = TimezoneUtil.toLocal(now(), prefs.timezone || 'UTC');
  if (!isBetween(localTime, '08:00', '21:00')) return Block("TIME_RESTRICTION");

  // 5. Iron Rule: Frequency (7-in-7)
  const count = history.filter(log => log.date > daysAgo(7)).length;
  const limit = rules.maxContactsPerWeek || 7;
  if (count >= limit) return Block("FREQUENCY_CAP");

  return Allow();
}
```

---

## 4. Frontend Integration (`ui-organizations`)

### The `useComplianceCheck` Hook
A custom React hook that "polls" the compliance status when a debtor profile is open, ensuring the UI updates in real-time (e.g., as the clock strikes 9 PM).

```typescript
const { isAllowed, blockReason, message } = useComplianceCheck({
  debtorId: currentDebtor.id,
  channel: 'VOICE',
  refreshInterval: 60000 // Check every minute
});

// UI Implementation
<Button disabled={!isAllowed}>
  {isAllowed ? "Call Debtor" : `Blocked: ${blockReason}`}
</Button>
```

---

## 5. Implementation Roadmap (Week 1)

| Day | Component | Task |
| :--- | :--- | :--- |
| **Mon** | `api-communications` | Implement `TimeOfDayRule` using `moment-timezone`. |
| **Tue** | `api-communications` | Implement `FrequencyLimitRule` using `logs` aggregation. |
| **Wed** | `api-communications` | Build `POST /compliance/check` endpoint. |
| **Thu** | `ui-organizations` | Build `useComplianceCheck` hook and wire to Debtor Profile. |
| **Fri** | `ui-organizations` | Build "Prevention Dashboard" widget (Violations Avoided). |

---

## 6. Success Metrics

1.  **Zero Violations:** Number of successful dispatches outside 08:00-21:00 is exactly **0**.
2.  **User Trust:** Collectors report the "Blocked" tooltip is helpful, not annoying.
3.  **Audit Proof:** Every blocked attempt is logged as `PREVENTED_VIOLATION` for SOC 2 audits.
