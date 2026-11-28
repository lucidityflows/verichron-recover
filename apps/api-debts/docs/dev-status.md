[<-- Back to Architectural Overview](../overview.md)

## Development Status

### Completed
- ✅ Module structure and organization (debts, portfolios, history, imports, redis-read-model, core, events, internal)
- ✅ Architectural design and bounded context definition
- ✅ Data model design (Debt, Portfolio, History, ImportJob entities)
- ✅ Two-layered authorization guards (JWT + OrgContext + Role + Permissions)
- ✅ Debts module (CRUD, status management, business rules, state machine validation)
- ✅ Portfolios module (CRUD, user permission assignment, transfer workflow)
- ✅ History module (ownership tracking and audit log)
- ✅ All core event publications (DebtStatusChanged, PortfolioCreated, etc.)
- ✅ **Redis Read Model - Complete CQRS Implementation**:
  - Redis connection and module setup (RedisService, RedisModule)
  - DebtIndexService with sorted sets and hashes for fast queries
  - DebtorUserLinkedListener for initial index building from `api-debtors` events
  - DebtCreatedListener for incremental index updates from local events
  - `GET /debts/my-debts` endpoint for DEBTOR users (<50ms response time)
  - DebtsService.findMyDebts() method with Redis fast-path and PostgreSQL fallback
- ✅ **Imports Module - Core Infrastructure**:
  - ImportJob entity with status tracking
  - File upload and job creation/status endpoints
  - Parser abstraction (`IImportParser`) with Mock and Vertex AI service setup
  - Async "fire-and-forget" processing
  - Row validation (within-file duplicates, data types)
  - All-or-nothing transaction for creating Portfolio, Debts, History, and Debt-Debtor links
  - Detailed error reporting on failed jobs

### In Progress
- 🔄 **Event Publishing from Imports**: The code to publish `DebtorInformationReceived` and `ImportCompleted` events exists in `imports.processor.ts`, but is marked as a `TODO` in older documentation, suggesting it may not be fully tested or enabled end-to-end.
- 🔄 **Redis Read Model Testing**: Unit tests are in place, but full integration and E2E tests are marked as pending.

### Imports Module - Remaining Work
- ⏳ **Document AI Field Extraction**: `VertexAiParserService.extractPortfolioData()` is a **TODO** placeholder and needs to be implemented. (HIGH PRIORITY)
- ⏳ **Database `accountNumber` Uniqueness Check**: The validation logic needs to be updated to check against the database for existing account numbers, not just within the file. (HIGH PRIORITY)
- ⏳ **Migrate to GCS File Storage**: Currently uses the local filesystem. (MEDIUM PRIORITY)
- ⏳ **Migrate to Robust Queue for Async Processing**: The current "fire-and-forget" async call should be replaced with a proper message queue (e.g., BullMQ) for reliability and scalability. (MEDIUM PRIORITY)
- ⏳ **Dedicated Parsers**: Implement dedicated `CsvParserService` and `ExcelParserService` to improve performance and features over the generic Document AI approach for those formats.
- ⏳ **Advanced AI Parsing**: Implement custom Document AI models or integrate Gemini for more complex documents.
- ⏳ **Streaming File Processing**: For very large files, process them in chunks instead of loading the entire file into memory.

### Other Future Work
- ⏳ **Redis Read Model Enhancements**:
  - Add `DebtUpdated` event listener to keep Redis summaries in sync.
  - Add `PortfolioSold` event listener to move debts between organization indexes in Redis.
  - Store total debt count in Redis for accurate pagination on `/my-debts`.
- ⏳ **Granular Portfolio Permissions**: Enhance the `UserPortfolioPermission` entity to support different access levels (e.g., `READ_ONLY` vs. `COLLECTOR`).
- ⏳ **Individual Debt Assignment**: If business requirements change, add the ability to assign debts to individual collectors directly.
