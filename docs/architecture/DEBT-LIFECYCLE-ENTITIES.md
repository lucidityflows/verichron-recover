# Debt Lifecycle Entity Architecture

## Overview
This document defines the core entity architecture for debt lifecycle management, spanning `api-debts` and `api-transactions`. The architecture is designed to support complex legal and financial states while maintaining a full audit trail of occurrences.

---

## Core Entities

### 1. Creditor (`api-debts`)
Master data entity for original creditors. Enables geographic flows analytics and entity resolution.

*   **Key Features:**
    *   **EIN-based deduplication:** Uses Employer Identification Number as a unique identifier.
    *   **Fuzzy matching:** Normalized name matching for resolution when EIN is unavailable.
    *   **Standardized address:** Consistent address shape (street1-3, city, state, postalCode, lat/long).
    *   **Master data pattern:** Supports `isMasterRecord` and `masterCreditorId` for merge/duplicate handling.

### 2. Debt Updates (`api-debts`)
The core `Debt` entity has been extended with critical analytics and compliance fields.

*   **Analytics Dates:** `firstDelinquencyDate`, `placementDate`, `chargeOffDate` (denormalized), `lastTransactionDate`, `lastContactDate`.
*   **Compliance:** `statuteOfLimitationsDate`, `statuteOfLimitationsState`, `isDisputed`.
*   **References:** `creditorId`, `importBatchId`.

### 3. SettlementOffer (`api-transactions`)
Tracks negotiation history and binding settlement agreements.

*   **Logic:** Supports multiple offers per debt (negotiation history).
*   **Structure:** Tracks `offeredBy` (CREDITOR/DEBTOR), payment structure (LUMP_SUM/INSTALLMENT), and status (PENDING, ACCEPTED, COMPLETED, etc.).
*   **Documentation:** Direct FK linkage to `Document` entity for settlement agreements.

### 4. BankruptcyFiling (`api-transactions`)
Critical for FDCPA compliance and enforcement of the automatic stay.

*   **Chapters:** CHAPTER_7, CHAPTER_11, CHAPTER_13.
*   **Workflow:** FILED → PENDING → DISCHARGED/DISMISSED.
*   **Automatic Stay:** Collection must stop immediately upon a `FILED` status.

### 5. ChargeOffHistory (`api-debts`)
Tracks the accounting lifecycle of a debt being written off by the original creditor.

*   **Audit Trail:** Supports multiple charge-offs and recovery events.
*   **Reporting:** Tracks principal/interest/fees at time of loss and credit bureau reporting status.

---

## Specialized Services

### StatuteCalculatorService (`api-debts`)
Auto-calculates Statute of Limitations (SOL) for all 50 states + DC.
*   **Logic:** Maps debt categories (Credit Card, Auto Loan) to contract types (Open Account, Written).
*   **State Priority:** Determines applicable law based on contract state, debtor state, and creditor state.

### CreditorResolutionService (`api-debts`)
Handles the "Find or Create" logic for creditors during debt imports.
*   **Strategy:** EIN Match → Fuzzy Name Match (85% Levenshtein threshold) → Address Verification → Manual Review.

---

## Design Patterns

### Bounded Context Separation
*   **api-debts:** Owns the debt lifecycle, creditor master data, and charge-off accounting.
*   **api-transactions:** Owns legal proceedings (Bankruptcy), complex financial agreements (Settlements), and document storage.

### Multiple Occurrences Strategy
We assume complex events (Settlements, Bankruptcies, Charge-offs) can happen multiple times.
*   **History Tables:** Store every occurrence.
*   **Denormalized Current State:** The `Debt` entity stores the most recent values for high-performance querying and indexing.

### Address Standardization
All entities (Debtor, User, Org, Creditor) use a unified address shape:
```typescript
{
  street1, street2, street3,
  city, state, postalCode,
  country, latitude, longitude
}
```
*Note: We use `postalCode` as the system-wide standard instead of `zipCode`.*
