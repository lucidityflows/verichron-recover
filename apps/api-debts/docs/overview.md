# API-Debts Microservice: Architectural Overview

This document provides a high-level overview and a table of contents for the detailed architectural documentation of the `api-debts` microservice.

## Architecture

The `api-debts` service is organized into several feature modules plus a Redis Read Model for high-performance debtor queries. Each component has its own detailed documentation.

### Feature Modules
- [Debts Module](./modules/debts.md)
- [Portfolios Module](./modules/portfolios.md)
- [History Module](./modules/history.md)
- [Imports Module](./modules/imports.md)
- [Redis Read Model](./modules/redis-read-model.md)

### Core Concepts & Specifications
- [Data Model](./data-model.md)
- [API Endpoints (High-Level)](./api-endpoints.md)
- [Eventing Strategy](./events.md)
- [Technical Stack](./tech-stack.md)
- [Development Status](./dev-status.md)
- [Critical Architectural Notes](./critical-notes.md)
- [Security & Compliance](./security.md)
- [Glossary](./glossary.md)
