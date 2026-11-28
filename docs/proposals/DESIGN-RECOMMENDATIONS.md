# Verichron Recover: Strategic Architectural Recommendations

**Status:** Draft / Proposal  
**Scope:** Post-MVP Architectural Hardening  
**Target:** Engineering / DevOps

---

## Introduction
This document outlines a roadmap for evolving the Verichron Recover microservices architecture from its current "Functional Staging" phase into a "Production-Grade Enterprise OS." These recommendations focus on standardization, security, and the transition from deterministic evidence to agentic intelligence.

---

## 1. Unified Service Bootstrapping (`@verichron/nest-bootstrap`)

### Observation
Currently, global configurations (ValidationPipes, CORS, GlobalPrefixes, ExceptionFilters) are manually synchronized across 12+ `main.ts` files. This creates maintenance overhead and "config drift" risk.

### Recommendation
Extract the boilerplate into a shared workspace package: `@verichron/nest-bootstrap`.

### Key Features
- **Deterministic Bootstrap:** A single `bootstrapApp(AppModule, options)` function.
- **Parity by Default:** Ensures 100% identical handling of `class-validator` transforms and `GlobalHttpExceptionFilter`.
- **Namespace Awareness:** Automatically handles `app.setGlobalPrefix` based on the service name, preventing the "Greedy Path Rule" issue encountered in Load Balancer routing.

---

## 2. Zero-Trust Service Identity (OIDC over Shared Secrets)

### Observation
Service-to-service communication currently relies on shared `SERVICE_KEY` secrets and Load Balancer path hiding.

### Recommendation
Transition to **GCP OIDC (OpenID Connect) Service-to-Service Authentication**.

### Implementation
- **Cloud Run Identity:** Services should run as dedicated Service Accounts (e.g., `api-debts-sa`).
- **Identity Tokens:** Requesting services fetch a Google-signed OIDC token.
- **Verification:** Receiving services verify the token using standard NestJS `Passport-JWT` strategies pointing to Google’s public keys.
- **Benefit:** Eliminates the risk of "Secret Sprawl" and fulfills enterprise SOC 2 "Zero Trust" requirements.

---

## 3. Global Traceability & Correlation (Distributed Tracing)

### Observation
In a 12-service event-driven loop, identifying the root cause of a failed downstream action (e.g., "Why didn't this debt import trigger an email?") is difficult without a unified trace.

### Recommendation
Implement explicit **Correlation ID Propagation** across the entire mesh.

### Implementation
- **Ingress:** The UI or API Gateway generates a unique `x-correlation-id` for every request.
- **Propagation:** Every HTTP call and every Pub/Sub event envelope MUST include this ID.
- **Persistence:** `api-audits` already captures this in metadata; this should be standardized so a single ID can be used to query logs across all 12 services in Google Cloud Logging.

---

## 4. Agentic Compliance (Passive Evidence to Active Intelligence)

### Observation
The current Audit service is an "Evidence" layer (Deterministic record-keeping). The "Vertical AI" strategy requires an "Intelligence" layer.

### Recommendation
Trigger **Gemini-powered Forensic Watchdogs** on audit log creation.

### Implementation
- **Trigger:** Cloud Function triggered by new entries in `audits_db`.
- **Analysis:** Pass the `changes` (delta) and `actorSnapshot` to Gemini 1.5 Flash.
- **Task:** "Evaluate this delta against the agency's historical strategy. Is this an anomaly or a compliance risk (e.g., an unauthorized settlement floor change)?"
- **Outcome:** Turns the audit trail from a graveyard of data into a real-time risk mitigation engine.

---

## 5. Configuration as Code (Shell to Node-driven Config)

### Observation
Infrastructure scripts (`setup-load-balancer-staging.sh`) are becoming large, complex, and prone to "Greedy Rule" errors due to manual YAML string manipulation.

### Recommendation
Move Load Balancer and Infrastructure logic into a **Node-driven Configuration Engine** within `vops.js`.

### Implementation
- **Source of Truth:** A single `services.config.ts` defining namespaces, ports, and routing priority.
- **Generator:** A Node script that programmatically builds the `url-map.yaml`.
- **Validation:** Automated checks to ensure sub-paths (e.g., `/organizations/*/debts`) are always prioritized over parent paths.

---

## Conclusion
By addressing these five pillars, Verichron Recover will satisfy the technical requirements of Tier-1 Enterprise customers and regulatory auditors while maintaining the agility of a high-growth startup. 

**Next Steps:**
1.  Complete the current Auditability Loop (UI-Ops integration).
2.  Begin "Recommendation 1" (Bootstrap Standardization) to simplify future service deployments.
