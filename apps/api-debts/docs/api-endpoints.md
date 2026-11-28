[<-- Back to Architectural Overview](../overview.md)

# API-Debts Microservice: API Endpoints Specification

This document details the high-level REST API endpoints exposed by the `api-debts` microservice. All endpoints require authentication and enforce organization-scoped access via the platform's standard authorization pipeline.

## API Endpoints (High-Level)

### Debts Module
- `GET /debts` - List debts (organization-scoped, with filters, pagination)
- `GET /debts/{id}` - Get debt details
- `GET /debts/my-debts` - List debts for authenticated DEBTOR user (Redis-powered, <50ms)
- `POST /debts` - Create debt manually

- `PATCH /debts/{id}` - Partial update of debt
- `DELETE /debts/{id}` - Soft delete debt

### Portfolios Module
- `GET /portfolios` - List portfolios (organization-scoped, with filters, pagination)
- `GET /portfolios/{id}` - Get portfolio details
- `POST /portfolios` - Create portfolio manually

- `PATCH /portfolios/{id}` - Partial update of portfolio
- `DELETE /portfolios/{id}` - Soft delete portfolio
- `POST /portfolios/{id}/users` - Assign user access to portfolio
- `DELETE /portfolios/{id}/users/{userId}` - Revoke user access from portfolio
- `GET /portfolios/{id}/users` - List users with access to portfolio
- `POST /portfolios/{id}/transfer` - Transfer portfolio to another organization

### History Module
- `GET /debts/{id}/ownership-history` - Get complete ownership history for a debt
- `GET /portfolios/{id}/ownership-history` - (Future) Get aggregated history for all debts in a portfolio

### Imports Module
- `POST /imports` - Initiate a new bulk import job
- `GET /imports/{id}` - Check status of an import job
- `GET /imports` - List all import jobs for the organization

### Internal Analytics Module (Service-to-Service)
- `GET /internal/analytics/dashboard-summary/{organizationId}` - Aggregates metrics for the main dashboard.
- `GET /internal/analytics/recovery-trends/{organizationId}` - Provides time-series data for recovery trend charts.
- `GET /internal/analytics/portfolio-performance/{organizationId}` - Provides debt metrics grouped by portfolio.
- `GET /internal/analytics/flow/{organizationId}` - Provides data for Sankey flow diagrams.
- `GET /internal/analytics/debt-portfolio-map/{organizationId}` - A lightweight map of `debtId` to `portfolioId`.
- `GET /internal/analytics/geographic/debts-by-state/{organizationId}` - Aggregates debt metrics by debtor for geographic analysis.
- `GET /internal/analytics/geographic/creditors/{organizationId}` - (Placeholder) Aggregates creditor metrics by location.
- `GET /internal/analytics/debtor-focus/{organizationId}/{debtorProfileId}` - Retrieves all debts for a single debtor profile.
