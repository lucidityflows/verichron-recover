[<-- Back to Architectural Overview](../overview.md)

## Security & Compliance

- **Tenant Isolation**: All queries are filtered by `organizationId` to enforce multi-tenancy. Denormalized `organizationId` on both Portfolio and Debt enables efficient tenant checks.
- **Two-Layered Authorization**: Every debt access is protected by both JWT permission checks (Layer 1) and portfolio permission checks (Layer 2).
- **Immutable Financial Data**: Core financial fields (`principalAmount`, `originalDebtDate`) are immutable after creation to prevent fraud and maintain audit integrity.
- **Immutable Ownership History**: The chain of title is append-only and cannot be tampered with, ensuring legal compliance.
- **Import Validation**: All import files are validated for required fields, data types, and duplicates before processing.
- **Transactional Integrity**: Import failures trigger full rollback to prevent data corruption.
- **File Security**: Uploaded files are stored in GCS with restricted access. Only the import processor can read from the staging bucket.
- **Audit Logging**: (Future) All debt status changes, portfolio transfers, and permission grants will be logged for compliance.
