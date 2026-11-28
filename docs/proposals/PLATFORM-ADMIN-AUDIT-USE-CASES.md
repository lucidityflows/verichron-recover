# Platform Admin Audit Strategy: Use Cases & Compliance

**Status:** Implementation In-Progress
**Context:** Defining the scope, security, and necessity of Platform Admin access to tenant Audit Logs.

---

## 1. Core Philosophy: "Trust but Verify" vs. "Surveillance"

The Platform Admin (Ops) role exists to ensure the **integrity, security, and reliability** of the SaaS platform. It does **not** exist to monitor the business operations of tenants.

Any access to tenant data must pass the **"Least Privilege & Legitimate Purpose"** test.

### The "Compelling WHY"
Why should a Platform Admin ever see a tenant's audit log?
1.  **System Integrity Verification:** Proving to a tenant (or auditor) that the immutable ledger hasn't been tampered with.
2.  **Security Incident Response:** Tracing the blast radius of a compromised user account.
3.  **Billing & Usage Verification:** Validating that usage metrics match the actual event log.
4.  **Support & Debugging:** diagnosing "Why did this record change?" when explicitly authorized by the tenant.

If we cannot map a feature to one of these pillars, **we should not build it.**

---

## 2. Specific Use Cases & Implementation Strategy

### Use Case A: "Is the Audit System Working?" (Health Check)
**The Need:** Admins need to know if logs are being ingested and if the chain is intact.
**The Solution:** **Aggregated Metrics (No PII)**.
*   **What they see:** "Org A generated 50k logs today. Last hash verification: SUCCESS."
*   **Implementation:** `GET /audits/ops/stats`.

### Use Case B: "A Tenant requests proof of immutability" (Compliance Support)
**The Need:** A tenant is undergoing a SOC2 audit and asks for proof.
**The Solution:** **Chain Verification Tool**.
*   **Mechanism (V1):** **Hash Chain**. Each record contains a SHA-256 hash of the previous record (`prevHash`).
*   **Mechanism (V2 Target):** **Merkle Tree**. Batched hashing for O(log n) verification and Certificate Transparency compliance (RFC 6962). *Deferred for scale.*
*   **Implementation:** `GET /audits/ops/verify/:orgId`. Returns `{ valid: boolean, verifiedRecords: number, brokenLinks: [...] }`.

### Use Case C: "Cross-Tenant Security Incident" (Forensics)
**The Need:** We detect a malicious IP address iterating through organizations.
**The Solution:** **BigQuery Ad-Hoc Analysis**.
*   **Decision:** We will **NOT** build a `GET /search` endpoint. It is high-liability and rarely used.
*   **Process:** Security Engineers query the immutable BigQuery sink directly via GCP Console, subject to IAM approval and GCP Audit Logging.

### Use Case D: "Support Request" (Impersonation)
**The Need:** A tenant admin claims data vanished.
**The Solution:** **Impersonated Access**.
*   **Mechanism:** The Platform Admin uses "Impersonate User" to log in *as* the Tenant Admin and view the logs through the Tenant Portal.

---

## 3. Data Sanitization & Protection Rules

### 3.1 No "Global Firehose"
There shall be no endpoint that returns `SELECT * FROM audits`.

### 3.2 Audit of the Auditor (The Sink)
Queries to the Audit API are themselves audited.
*   **Storage:** These meta-logs must NOT be stored in the same database they monitor.
*   **Requirement:** Ship `api-audits` logs to **Google Cloud Logging** (and subsequently to a locked-down BigQuery dataset) to ensure an external, immutable record of admin access.

### 3.3 Explicit Sentinel for System Events
We will not use `NULL` to denote "System Events".
*   **Standard:** Use a dedicated UUID: `PLATFORM_SYSTEM_ORG_ID` (`00000000-0000-0000-0000-000000000000`).
*   **Benefit:** explicit querying (`WHERE organizationId = '...'`) and no ambiguity between "System Event" and "Bug".

### 3.4 Multi-Tenancy Boundary Clarity
The use of `PLATFORM_SYSTEM_ORG_ID` does **NOT** imply that the Platform Admin user belongs to an organization.
*   **User Identity:** Platform Admins remain org-agnostic (`organizationId: NULL`). This preserves the strict separation of concerns required for true multi-tenancy.
*   **Data Scoping:** The `PLATFORM_SYSTEM_ORG_ID` is strictly a **data scoping mechanism** for Audit Logs. It assigns ownership of *events* (like "System Reboot", "Global Config Change") to the System Entity, ensuring they are not orphaned or leaked into tenant views.

---

## 4. Architecture & Routing

**Controller:** `PlatformAuditsController`
**Prefix:** `/audits/ops`

| Endpoint | Purpose | Details | Status |
| :--- | :--- | :--- | :--- |
| `GET /platform-logs` | System Events | Returns logs where `organizationId = PLATFORM_SYSTEM_ORG_ID`. | ✅ **Implemented** |
| `GET /verify/:orgId` | Compliance Proof | Triggers `AuditHashService.verifyChain`. | ✅ **Implemented** |
| `GET /stats` | System Health | Counts, throughput, verification status. | ⚠️ **Partial** (Placeholder) |
| `GET /export/:orgId` | Compliance | Generate CSV/PDF for external auditors. | 📅 **Roadmap** |

---

## 5. Enterprise Compliance Gap Analysis (Roadmap)

To be "Enterprise Ready", we must address:

1.  **Retention Policy:**
    *   **Default:** 7 Years (Financial Standard).
    *   **Action:** Document this policy and implement automated partitioning/archival in Postgres/BigQuery.
2.  **Export Capability:**
    *   **Requirement:** `GET /export` is a sales deal-breaker.
    *   **Priority:** Build when the first enterprise prospect requests it.
3.  **GDPR/CCPA:**
    *   **Legal Basis:** "Legitimate Interest" (Security/Fraud prevention) typically exempts audit logs from erasure, but this must be documented in the Privacy Policy.

---

## 6. Implementation Status & Next Steps

### Completed Actions
- [x] **Platform Event Log:** Implemented `PlatformAuditsController.findPlatformLogs` and integrated into `ui-ops`.
- [x] **System Sentinel:** Defined `PLATFORM_ORG_ID` in contracts and applied to system log queries.
- [x] **Integrity Verification:** Implemented `AuditHashService.verifyChain` and exposed via Ops API.
- [x] **Routing Refactor:** Cleaned up namespace routing (`/audits/ops/...`) to avoid collisions.

### Pending Items (Immediate Priority)
1.  **Stats Endpoint Implementation:** Replace the placeholder in `AuditsOpsService.getSystemStats` with real DB queries (count of logs today, last broken link check).
2.  **BigQuery Sink Configuration:** Set up Cloud Logging export for `api-audits` to BigQuery to satisfy "Audit of Auditor".

### Roadmap Items (Deferred)
- [ ] **Merkle Tree Migration:** V2 crypto architecture for scale.
- [ ] **Export Feature:** CSV/PDF generation.
- [ ] **Retention Automation:** Postgres partitioning policy.
