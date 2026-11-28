# Cloud Run Deployment Scripts

This document describes the automation scripts available for deploying Verichron Recover to Google Cloud Run staging environment.

---

## Quick Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `setup-infrastructure-staging.sh` | Create all GCP infrastructure | **Once** before first deployment |
| `build-and-push-staging.sh` | Build and push Docker images | Every code change |
| `deploy-all-staging.sh` | Deploy services to Cloud Run | After building images |
| `run-migrations-staging.sh` | Run database migrations | After first deployment or schema changes |
| `update-service-urls-staging.sh` | Update service URLs in .env.stage | After initial deployment |
| `verify-deployment-staging.sh` | Verify all services are healthy | After any deployment |

---

## 1. setup-infrastructure-staging.sh

**Purpose**: One-time setup of all required GCP infrastructure

**Location**: `/scripts/setup-infrastructure-staging.sh`

**When to Run**:
- Once before first deployment
- After infrastructure is deleted and needs to be recreated

**What It Does**:
- ✅ Enables required GCP APIs (Cloud Run, Cloud SQL, Pub/Sub, etc.)
- ✅ Creates Artifact Registry repository for Docker images
- ✅ Creates Cloud SQL PostgreSQL instance (db-f1-micro)
- ✅ Creates Cloud SQL database and staging user with password
- ✅ Creates Memorystore Redis instance (1GB Standard tier)
- ✅ Creates GCS buckets for documents storage
- ✅ Creates Pub/Sub topics for event-driven architecture
- ✅ Creates Secret Manager secret for environment variables

**Usage**:
```bash
cd .
./scripts/setup-infrastructure-staging.sh
```

**Output**:
- Cloud SQL connection name
- Cloud SQL staging user password (⚠️ SAVE THIS!)
- Redis host IP address

**Time**: ~20-30 minutes (mostly waiting for Cloud SQL and Redis provisioning)

**Prerequisites**:
- GCP project `verichron-recover-staging` created
- Billing enabled
- `gcloud` CLI authenticated with Owner/Editor permissions

---

## 2. build-and-push-staging.sh

**Purpose**: Build Docker images for all microservices and push to Artifact Registry

**Location**: `/scripts/build-and-push-staging.sh`

**When to Run**:
- After code changes before deploying
- When creating a new version/release

**What It Does**:
- ✅ Authenticates to Artifact Registry
- ✅ Builds production Docker images for 10 services
- ✅ Tags images with version (default: `latest`) and git SHA
- ✅ Pushes both tags to Artifact Registry

**Usage**:
```bash
# Build with 'latest' tag
./scripts/build-and-push-staging.sh

# Build with specific version tag
./scripts/build-and-push-staging.sh v1.2.0
```

**Services Built**:
- api-users
- api-organizations
- api-debts
- api-debtors
- api-transactions
- api-communications
- api-collectors
- api-voice
- api-workflows
- api-automations

**Time**:
- First build: ~30-45 minutes (no cache)
- Subsequent builds: ~10-15 minutes (cached layers)

**Prerequisites**:
- Docker installed and running
- `gcloud` CLI authenticated
- Artifact Registry repository created (done by `setup-infrastructure-staging.sh`)

---

## 3. deploy-all-staging.sh

**Purpose**: Deploy all microservices to Cloud Run

**Location**: `/scripts/deploy-all-staging.sh`

**When to Run**:
- After building and pushing Docker images
- When updating environment variables
- After updating service URLs

**What It Does**:
- ✅ Creates VPC connector if not exists
- ✅ Deploys 10 microservices to Cloud Run
- ✅ Configures each service with:
  - Image from Artifact Registry
  - Environment variables (NODE_ENV=staging, LOG_LEVEL=info)
  - Secrets from Secret Manager (env-stage secret)
  - Cloud SQL connection
  - VPC connector for Redis access
  - Resource limits (512Mi memory, 1 CPU)
  - Scaling (0-10 instances)
  - 5-minute timeout
- ✅ Tests health endpoint for each service
- ✅ Displays all service URLs

**Usage**:
```bash
# Deploy with 'latest' tag
./scripts/deploy-all-staging.sh

# Deploy specific version
./scripts/deploy-all-staging.sh v1.2.0
```

**Time**: ~10-15 minutes

**Prerequisites**:
- Docker images built and pushed
- Infrastructure created
- `.env.stage` uploaded to Secret Manager

---

## 4. run-migrations-staging.sh

**Purpose**: Run TypeORM migrations for all services against Cloud SQL staging database

**Location**: `/scripts/run-migrations-staging.sh`

**When to Run**:
- After first deployment (to create database schema)
- After schema changes that require migrations

**What It Does**:
- ✅ Installs Cloud SQL Proxy if not present
- ✅ Starts Cloud SQL Proxy in background
- ✅ Parses DATABASE_URL from `.env.stage`
- ✅ Tests database connection
- ✅ Runs `pnpm run migration:run` for each service:
  - api-users
  - api-organizations
  - api-debts
  - api-debtors
  - api-transactions
  - api-communications
  - api-collectors
  - api-voice
  - api-workflows
- ✅ Stops Cloud SQL Proxy when done
- ✅ Provides summary of successes/failures

**Usage**:
```bash
cd .
./scripts/run-migrations-staging.sh
```

**Time**: ~10-15 minutes

**Prerequisites**:
- Cloud SQL instance created and running
- `.env.stage` file exists with correct DATABASE_URL
- `pnpm` dependencies installed

**Manual Alternative**:
See Step 6 Option B in [QUICK-START-STAGING.md](./QUICK-START-STAGING.md#step-6-run-database-migrations)

---

## 5. update-service-urls-staging.sh

**Purpose**: Automatically fetch Cloud Run service URLs and update .env.stage

**Location**: `/scripts/update-service-urls-staging.sh`

**When to Run**:
- After initial deployment (services get random URLs)
- Anytime service URLs change

**What It Does**:
- ✅ Creates backup of `.env.stage`
- ✅ Fetches Cloud Run URLs for all 10 services
- ✅ Updates environment variables in `.env.stage`:
  - `API_USERS_URL`
  - `API_ORGANIZATIONS_URL`
  - `API_DEBTS_URL`
  - `API_DEBTORS_URL`
  - `API_TRANSACTIONS_URL`
  - `API_COMMUNICATIONS_URL`
  - `API_COLLECTORS_URL`
  - `API_VOICE_URL`
  - `API_WORKFLOWS_URL`
  - `API_AUTOMATIONS_URL`
- ✅ Displays all updated URLs
- ✅ Provides instructions for uploading updated secret and re-deploying

**Usage**:
```bash
cd .
./scripts/update-service-urls-staging.sh

# Then upload updated secret
gcloud secrets versions add env-stage \
  --data-file=.env.stage \
  --project=verichron-recover-staging

# Then re-deploy services
./scripts/deploy-all-staging.sh
```

**Time**: ~2-3 minutes

**Prerequisites**:
- Services deployed to Cloud Run
- `.env.stage` file exists

**Manual Alternative**:
See Step 7 Option B in [QUICK-START-STAGING.md](./QUICK-START-STAGING.md#step-7-update-service-urls)

---

## 6. verify-deployment-staging.sh

**Purpose**: Comprehensive verification of all deployed services and infrastructure

**Location**: `/scripts/verify-deployment-staging.sh`

**When to Run**:
- After deployment to verify everything is working
- Periodically to check service health
- When troubleshooting issues

**What It Does**:
- ✅ Tests health endpoints for all 10 services
- ✅ Shows HTTP response codes and JSON responses
- ✅ Displays recent logs for any failing services
- ✅ Shows resource configuration (memory, CPU)
- ✅ Shows latest revision name for each service
- ✅ Tests OpenAPI documentation endpoint
- ✅ Checks infrastructure status:
  - Cloud SQL instance state
  - Memorystore Redis state
  - GCS bucket listing
  - Pub/Sub topic listing
- ✅ Provides detailed summary with pass/fail counts

**Usage**:
```bash
cd .
./scripts/verify-deployment-staging.sh
```

**Time**: ~5 minutes

**Prerequisites**:
- Services deployed to Cloud Run
- Infrastructure created

**Manual Alternative**:
See Step 8 Option B in [QUICK-START-STAGING.md](./QUICK-START-STAGING.md#step-8-verify-deployment)

---

## Deployment Workflow

### Initial Deployment (First Time)

```bash
# 1. Setup infrastructure (run once)
./scripts/setup-infrastructure-staging.sh

# 2. Create MongoDB Atlas cluster manually (see QUICK-START-STAGING.md Step 2)

# 3. Update .env.stage with infrastructure values
nano .env.stage

# 4. Upload .env.stage to Secret Manager
gcloud secrets versions add env-stage \
  --data-file=.env.stage \
  --project=verichron-recover-staging

# 5. Build Docker images
./scripts/build-and-push-staging.sh

# 6. Deploy services to Cloud Run
./scripts/deploy-all-staging.sh

# 7. Run database migrations
./scripts/run-migrations-staging.sh

# 8. Update service URLs in .env.stage
./scripts/update-service-urls-staging.sh

# 9. Upload updated .env.stage
gcloud secrets versions add env-stage \
  --data-file=.env.stage \
  --project=verichron-recover-staging

# 10. Re-deploy with updated URLs
./scripts/deploy-all-staging.sh

# 11. Verify deployment
./scripts/verify-deployment-staging.sh
```

**Total Time**: ~4-6 hours (mostly waiting for GCP resources)

---

### Subsequent Deployments (Code Updates)

```bash
# 1. Build new images
./scripts/build-and-push-staging.sh v1.2.0

# 2. Deploy updated services
./scripts/deploy-all-staging.sh v1.2.0

# 3. Run new migrations (if schema changed)
./scripts/run-migrations-staging.sh

# 4. Verify deployment
./scripts/verify-deployment-staging.sh
```

**Total Time**: ~15-20 minutes

---

### Environment Variable Updates

```bash
# 1. Edit .env.stage
nano .env.stage

# 2. Upload to Secret Manager
gcloud secrets versions add env-stage \
  --data-file=.env.stage \
  --project=verichron-recover-staging

# 3. Re-deploy services to pick up changes
./scripts/deploy-all-staging.sh

# 4. Verify
./scripts/verify-deployment-staging.sh
```

**Total Time**: ~10-15 minutes

---

## Troubleshooting

### Script Fails with "Permission denied"

**Solution**: Make scripts executable
```bash
chmod +x scripts/*.sh
```

### "gcloud: command not found"

**Solution**: Install and authenticate gcloud CLI
```bash
curl https://sdk.cloud.google.com | bash
gcloud init
gcloud auth login
gcloud auth application-default login
```

### Docker build fails with "no space left on device"

**Solution**: Clean up Docker images
```bash
docker system prune -a
```

### Cloud SQL Proxy connection fails

**Solution**: Check firewall rules and instance state
```bash
# Check instance is running
gcloud sql instances describe verichron-recover \
  --project=verichron-recover-staging

# Restart if needed
gcloud sql instances restart verichron-recover \
  --project=verichron-recover-staging
```

### Services fail health checks

**Solution**: Check logs for errors
```bash
gcloud run services logs read api-users \
  --region=us-central1 \
  --project=verichron-recover-staging \
  --limit=50
```

Common issues:
- Missing environment variables (check Secret Manager)
- Cannot connect to Cloud SQL (check VPC connector)
- Cannot connect to Redis (check VPC connector and Redis host IP)
- Cannot connect to MongoDB (check MongoDB Atlas network access)

---

## Cost Optimization

All scripts are designed with cost optimization in mind:

- **Min instances = 0**: Services scale to zero when not in use (no cost)
- **Max instances = 10**: Prevents runaway costs from traffic spikes
- **db-f1-micro**: Smallest Cloud SQL tier (~$7/month)
- **1GB Redis**: Smallest Memorystore tier (~$50/month)
- **Standard storage**: For GCS buckets (cheaper than multi-region)

**Estimated monthly cost**: $66-104
- Cloud Run: $0-20 (usage-based)
- Cloud SQL: $7
- Memorystore Redis: $50
- MongoDB Atlas: $9 (M2 tier)
- Pub/Sub: $0-5
- GCS: $0-3
- Vertex AI: $0-10 (usage-based)

---

## Security Best Practices

1. **Never commit `.env.stage`** to version control (already in `.gitignore`)

2. **Rotate secrets regularly**: Use `openssl rand -base64 64` to generate new secrets

3. **Use Secret Manager**: All production secrets stored in GCP Secret Manager

4. **Least privilege IAM**: Use service accounts with minimal permissions

5. **VPC connector**: Services use VPC for secure communication with Cloud SQL and Redis

6. **HTTPS only**: Cloud Run enforces HTTPS for all traffic

7. **Authentication**: All API endpoints protected by JWT authentication

---

## Next Steps

After successful deployment:

1. **Configure custom domains**: Map staging.verichroninc.com subdomains
2. **Setup monitoring**: Cloud Monitoring alerts and dashboards
3. **Setup CI/CD**: Automate deployments with GitHub Actions or Cloud Build
4. **Load testing**: Test autoscaling behavior under load
5. **Backup verification**: Verify Cloud SQL automated backups are working

See [CLOUD-RUN-STAGING-DEPLOYMENT.md](./CLOUD-RUN-STAGING-DEPLOYMENT.md) for detailed guidance.
