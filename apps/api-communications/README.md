# API-Communications Microservice

## Overview

The `api-communications` microservice owns the **Communication & Notification** bounded context within our debt collection SaaS platform. This service is responsible for managing all outbound communications to debtors, including emails, SMS messages, and generated letters. It handles template management, dispatch orchestration, tracking of communication events (delivery, opens, clicks), and enforcement of contact compliance rules.

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- MongoDB 6+
- Redis 7+
- SendGrid API Key
- Twilio Account SID and Auth Token
- GCP Project with Pub/Sub enabled

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations (PostgreSQL)
pnpm --filter @verichron/api-communications migration:run

# Seed default templates
pnpm --filter @verichron/api-communications seed

# Start development server
pnpm --filter @verichron/api-communications dev
```

### Environment Variables

```env
# Server
NODE_ENV=development
PORT=3003

# PostgreSQL (Templates, Preferences)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=communications_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# MongoDB (Communication Logs)
MONGODB_URI=mongodb://localhost:27017/communications

# Redis (Caching, Rate Limiting)
REDIS_HOST=localhost
REDIS_PORT=6379

# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM_ADDRESS=noreply@debtluciditysolutions.com

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
SMS_FROM_NUMBER=+1234567890

# GCP Pub/Sub
GCP_PROJECT_ID=your_gcp_project
GCP_PUBSUB_ENABLED=true

# Feature Flags
EMAIL_PROVIDER=sendgrid  # or 'mock' for testing
SMS_PROVIDER=twilio      # or 'mock' for testing

# App Config
APP_URL=https://app.debtluciditysolutions.com
JWT_SECRET=your_jwt_secret
```

### Database Setup

```bash
# Start PostgreSQL (if using Docker)
docker-compose up -d postgres

# Create database
createdb communications_db

# Run migrations
pnpm --filter @verichron/api-communications migration:run
```

### Start GCP Pub/Sub Emulator

```bash
# Install emulator (one-time)
gcloud components install pubsub-emulator

# Start emulator
gcloud beta emulators pubsub start --host-port=localhost:8085
```

### Run Development Server

```bash
# Start with hot reload
pnpm --filter @verichron/api-communications dev

# Server runs on http://localhost:3003
# Swagger docs at http://localhost:3003/api
```

### Verify Setup

```bash
# Health check
curl http://localhost:3003/health

# Swagger UI
open http://localhost:3003/api
```

---

## Further Documentation

For a comprehensive understanding of this microservice, its architecture, and developer patterns, please refer to the following documents:

*   **High-Level Overviews**:
    *   [Feature Overview and System Context](docs/feature-overview.md)
    *   [Architectural Overview](docs/architecture/overview.md)
    *   [Events Overview](docs/events/overview.md)

*   **Developer Guide**:
    *   [Coding Patterns](docs/developer-guide/coding-patterns.md)
    *   [Testing Philosophy](docs/testing/testing-philosophy.md)
    *   [Error Handling Strategy](docs/technical-details/error-handling.md)
    *   [Implementation Roadmap](docs/development/roadmap.md)

*   **API Specifications**:
    *   [High-Level API Endpoints](docs/api/endpoints.md)

*   **MVP Gaps**:
    *   [Identified MVP Gaps and Inconsistencies](api-communications-mvp-gaps.md)