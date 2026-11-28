[<-- Back to Architectural Overview](../overview.md)

## Technical Stack

- **Framework**: NestJS
- **ORM**: TypeORM
- **Database**: PostgreSQL (`debts_db`) - Source of truth for debts, portfolios, history
- **Cache/Read Model**: Redis - High-performance debtor query indexes (CQRS pattern)
- **File Storage**: Local filesystem (MVP) → Google Cloud Storage (future)
- **File Parsing**: Google Cloud Document AI Form Parser (production) or Mock fixtures (local development)
- **Event Queue**: GCP Pub/Sub for event-driven architecture
- **Import Processing**: Async background processing within NestJS app
- **Deployment**: GCP (Cloud Run or GKE)
