# Staging Deployment Configuration

This reference maps each microservice to its specific database connection string for the Staging environment.
Use these values when deploying via `gcloud run deploy` or configuring `cloudbuild.yaml`.

**Instance Connection Name:** `verichron-recover-staging:us-central1:verichron-recover`
**DB User:** `verichron_stage`
**DB Password:** `<REDACTED_DB_PASSWORD>`

## Service Database Map

When deploying each service, override the `DATABASE_URL` environment variable with the specific value below.

### 1. api-users
**Database:** `users_db`
```bash
DATABASE_URL="postgresql://verichron_stage:<REDACTED_DB_PASSWORD>@/users_db?host=/cloudsql/verichron-recover-staging:us-central1:verichron-recover"
```

### 2. api-organizations
**Database:** `organizations_db`
```bash
DATABASE_URL="postgresql://verichron_stage:<REDACTED_DB_PASSWORD>@/organizations_db?host=/cloudsql/verichron-recover-staging:us-central1:verichron-recover"
```

### 3. api-debts
**Database:** `debts_db`
```bash
DATABASE_URL="postgresql://verichron_stage:<REDACTED_DB_PASSWORD>@/debts_db?host=/cloudsql/verichron-recover-staging:us-central1:verichron-recover"
```

### 4. api-debtors
**Database:** `debtors_db`
```bash
DATABASE_URL="postgresql://verichron_stage:<REDACTED_DB_PASSWORD>@/debtors_db?host=/cloudsql/verichron-recover-staging:us-central1:verichron-recover"
```

### 5. api-transactions
**Database:** `transactions_db`
```bash
DATABASE_URL="postgresql://verichron_stage:<REDACTED_DB_PASSWORD>@/transactions_db?host=/cloudsql/verichron-recover-staging:us-central1:verichron-recover"
```

### 6. api-communications
**Database:** `communications_db`
```bash
DATABASE_URL="postgresql://verichron_stage:<REDACTED_DB_PASSWORD>@/communications_db?host=/cloudsql/verichron-recover-staging:us-central1:verichron-recover"
```

### 7. api-collectors
**Database:** `collectors_db`
```bash
DATABASE_URL="postgresql://verichron_stage:<REDACTED_DB_PASSWORD>@/collectors_db?host=/cloudsql/verichron-recover-staging:us-central1:verichron-recover"
```

### 8. api-voice
**Database:** `voice_db`
```bash
DATABASE_URL="postgresql://verichron_stage:<REDACTED_DB_PASSWORD>@/voice_db?host=/cloudsql/verichron-recover-staging:us-central1:verichron-recover"
```

### 9. api-workflows
**Database:** `workflows_db`
```bash
DATABASE_URL="postgresql://verichron_stage:<REDACTED_DB_PASSWORD>@/workflows_db?host=/cloudsql/verichron-recover-staging:us-central1:verichron-recover"
```

### 10. api-automations
**Database:** N/A (Does not use SQL)
```bash
# No DATABASE_URL required
```

## Local Seeding via Proxy

If you are running the `create-staging-admin.ts` script locally via `cloud-sql-proxy`, use this connection string format (ensure proxy is running on port 5432):

**Target:** `api-users` (users_db)
```bash
export DATABASE_URL="postgresql://verichron_stage:<REDACTED_DB_PASSWORD>@localhost:5432/users_db"
```
