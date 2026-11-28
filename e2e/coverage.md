# E2E Test Coverage Summary

This document provides a high-level overview of the E2E test suite's coverage against the documented system rules. This information is crucial for tracking progress and planning future testing efforts.

---

## Current Test Status Summary

| Metric                           | Value      |
|----------------------------------|------------|
| Total System Rules Documented    | 63         |
| Implemented Test Cases (Rules)   | 35         |
| Pending Test Cases (Rules)       | 26         |
| Blocked Test Cases (Rules)       | 9          |
| **System Rules Proven by Tests** | **25**     |

*As of the last test run, 35 rules have corresponding test implementations. Of those, 25 are passing. 1 rule (`R-ORG-005`) has a failing test and is not considered "proven". The remaining 9 new test cases are pending implementation.*

---

## Priority Distribution of Outlined Test Cases

This table shows the distribution of test cases by their assigned priority, based on the tags in `e2e/test-specs/`. The addition of new specs may cause temporary inconsistencies with the summary above until all files are fully accounted for.

| Priority | Total Outlined | Implemented (✅) | Pending (⏳) | Blocked (🚫) |
|----------|----------------|------------------|--------------|--------------|
| **P0 (Critical)** | 25             | 22               | 5            | 4            |
| **P1 (High)**    | 25             | 12 (1 Failing)   | 14           | 2            |
| **P2 (Medium)**  | 8              | 0                | 6            | 2            |
| **P3 (Low)**     | 1              | 0                | 0            | 1            |
| **Total**        | **59**         | **34**           | **25**       | **9**        |

*Note: The total rule count here (59) differs from the documented rules (63) because not all rules have a corresponding test spec file yet. The counts in this table are based on specs, while the summary above is based on the `system-rules.md` file.*

---

## Feature Coverage Overview

This section provides a high-level view of test coverage across different microservices and major features.

| Feature Area / Microservice | Total Outlined | Implemented (✅) | Pending (⏳) | Blocked (🚫) |
|-----------------------------|----------------|------------------|--------------|--------------|
| Event-Driven Architecture   | 3              | 3                | 0            | 0            |
| Data Consistency            | 1              | 1                | 0            | 0            |
| Onboarding & Provisioning   | 3              | 2                | 0            | 1            |
| Organization Management     | 6              | 3 (1 Failing)    | 2            | 0            |
| Settings Management         | 2              | 0                | 2            | 0            |
| Authentication & AuthZ      | 12             | 10               | 2            | 0            |
| RBAC & Permissions          | 3              | 1                | 2            | 0            |
| User Management             | 5              | 2                | 3            | 0            |
| Debtor Invitation & Linking | 4              | 3                | 1            | 1            |
| Debtor Data Access          | 3              | 0                | 0            | 3            |
| Debtor Guards               | 2              | 0                | 1            | 1            |
| Debtor Import (`api-debtors`) | 2              | 2                | 2            | 0            |
| Debtor Data Model (`api-debtors`)| 1              | 1                | 1            | 0            |
| Debtor Profile API (`api-debtors`)| 1              | 1                | 1            | 0            |
| Debtor Compliance           | 4              | 1                | 2            | 2            |
| Debtor Documents (`api-debtors`)| 1              | 1                | 0            | 1            |
| Debtor PII Access (`api-debtors`)| 1              | 1                | 1            | 0            |
| Debtor Verification (`api-debtors`)| 1              | 1                | 1            | 0            |
| Debtor Edge Cases           | 3              | 0                | 3            | 0            |
| Security & Access Control   | 5              | 3                | 2            | 0            |
| **Total**                   | **63**         | **35**           | **26**       | **9**        |

*Note: The "Implemented" column reflects the number of rules with a corresponding test file, not the pass/fail status.*