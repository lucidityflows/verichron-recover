# Quick Start: Cloud Run Staging Deployment

**For**: Verichron Recover Staging Environment
**Target**: GCP Cloud Run in `verichron-recover-staging` project
**Time**: ~4-6 hours total (mostly waiting for GCP resources)

---

## Prerequisites

1. **GCP Account Setup**
   - [ ] GCP project created: `verichron-recover-staging`
   - [ ] Billing enabled
   - [ ] You have Owner/Editor permissions

2. **Local Tools Installed**
   ```bash
   # Install gcloud CLI
   curl https://sdk.cloud.google.com | bash

   # Initialize and authenticate
   gcloud init
   gcloud auth login
   gcloud auth application-default login

   # Install Docker
   # See: https://docs.docker.com/get-docker/
   ```

3. **MongoDB Atlas Account**
   - Create account at: https://cloud.mongodb.com
   - You'll create the cluster in Step 2 below

---

## Step 1: Setup Infrastructure (Run Once)

```bash
# Navigate to project root
cd .

# Run infrastructure setup script
./scripts/setup-infrastructure-staging.sh
```

This creates:
- ✅ Cloud SQL PostgreSQL instance (10 minutes)
- ✅ Memorystore Redis instance (10 minutes)
- ✅ GCS Buckets for documents
- ✅ Pub/Sub topics for events
- ✅ Secret Manager for env vars
- ✅ Artifact Registry for Docker images

**⏱️ Expected Time**: 20-30 minutes

**⚠️ IMPORTANT**: Save the passwords output by the script!

---

## Step 2: Setup MongoDB Atlas

1. Go to https://cloud.mongodb.com
2. Create **M2 Shared Tier** cluster:
   - **Cloud Provider**: Google Cloud
   - **Region**: Iowa (us-central1)
   - **Cluster Name**: verichron-recover-stage
3. **Database Access**: Create user `verichron-stage-user` with password
4. **Network Access**: Add IP `0.0.0.0/0` (Cloud Run uses dynamic IPs)
5. **Get Connection String**: Click "Connect" → "Connect your application"
   - Format: `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority`

**⏱️ Expected Time**: 10-15 minutes

---

## Step 3: Update .env.stage File

Update `./.env.stage` with infrastructure values:

```bash
# From Step 1 output:
DATABASE_URL=postgresql://verichron_stage:YOUR_PASSWORD@/verichron_stage_db?host=/cloudsql/verichron-recover-staging:us-central1:verichron-recover
REDIS_HOST=10.xxx.xxx.xxx  # IP from script output

# From Step 2:
MONGODB_URI=mongodb+srv://verichron-stage-user:YOUR_PASSWORD@verichron-recover-stage.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### Upload updated secret to GCP:
```bash
gcloud secrets versions add env-stage \
  --data-file=.env.stage \
  --project=verichron-recover-staging
```

**⏱️ Expected Time**: 5 minutes

---

## Step 4: Build Docker Images

```bash
# Build all 10 microservices and push to Artifact Registry
./scripts/build-and-push-staging.sh

# Or build specific version:
./scripts/build-and-push-staging.sh v1.0.0
```

This builds:
- api-users, api-organizations, api-debts, api-debtors, api-transactions
- api-communications, api-collectors, api-voice, api-workflows, api-automations

**⏱️ Expected Time**: 30-45 minutes (first build, cached after)

---

## Step 5: Deploy to Cloud Run

```bash
# Deploy all services
./scripts/deploy-all-staging.sh

# Or deploy specific version:
./scripts/deploy-all-staging.sh v1.0.0
```

This deploys all 10 services to Cloud Run.

**⏱️ Expected Time**: 10-15 minutes

---

## Step 6: Run Database Migrations

### Option A: Automated (Recommended)
```bash
# Run all migrations automatically
./scripts/run-migrations-staging.sh
```

This script will:
- Install Cloud SQL Proxy if needed
- Start the proxy automatically
- Run migrations for all 9 services
- Stop the proxy when done

### Option B: Manual
```bash
# Install Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# Start proxy
./cloud-sql-proxy verichron-recover-staging:us-central1:verichron-recover &

# Set DATABASE_URL for local connection
export DATABASE_URL="postgresql://verichron_stage:YOUR_PASSWORD@localhost:5432/verichron_stage_db"

# Run migrations for each service
cd apps/api-users && pnpm run migration:run && cd ../..
cd apps/api-organizations && pnpm run migration:run && cd ../..
cd apps/api-debts && pnpm run migration:run && cd ../..
cd apps/api-debtors && pnpm run migration:run && cd ../..
cd apps/api-transactions && pnpm run migration:run && cd ../..
cd apps/api-communications && pnpm run migration:run && cd ../..
cd apps/api-collectors && pnpm run migration:run && cd ../..
cd apps/api-voice && pnpm run migration:run && cd ../..
cd apps/api-workflows && pnpm run migration:run && cd ../..

# Kill proxy
pkill cloud-sql-proxy
```

**⏱️ Expected Time**: 10-15 minutes

---

## Step 7: Update Service URLs

After deployment, update `.env.stage` with actual Cloud Run service URLs:

### Option A: Automated (Recommended)
```bash
# Automatically fetch and update all service URLs
./scripts/update-service-urls-staging.sh
```

This script will:
- Fetch all Cloud Run service URLs
- Update `.env.stage` with actual URLs
- Create a backup of the original file

Then upload the updated secret and re-deploy:
```bash
# Upload updated secret to GCP
gcloud secrets versions add env-stage \
  --data-file=.env.stage \
  --project=verichron-recover-staging

# Re-deploy all services with updated URLs
./scripts/deploy-all-staging.sh
```

### Option B: Manual
```bash
# Get all service URLs
for service in api-users api-organizations api-debts api-debtors api-transactions api-communications api-collectors api-voice api-workflows api-automations; do
  URL=$(gcloud run services describe $service \
    --region=us-central1 \
    --project=verichron-recover-staging \
    --format='value(status.url)')
  echo "${service^^}_URL=$URL"
done
```

Copy the output and manually update these variables in `.env.stage`:
- `API_USERS_URL`
- `API_ORGANIZATIONS_URL`
- `API_DEBTS_URL`
- etc.

Then re-upload secret and re-deploy:
```bash
gcloud secrets versions add env-stage \
  --data-file=.env.stage \
  --project=verichron-recover-staging

./scripts/deploy-all-staging.sh
```

**⏱️ Expected Time**: 15-20 minutes

---

## Step 8: Verify Deployment

### Option A: Automated (Recommended)
```bash
# Run comprehensive verification of all services and infrastructure
./scripts/verify-deployment-staging.sh
```

This script will:
- Test all service health endpoints
- Verify Cloud SQL, Redis, GCS, and Pub/Sub status
- Show service resource usage and revisions
- Display detailed logs for any failing services

### Option B: Manual
```bash
# Test each service health endpoint
SERVICES=(api-users api-organizations api-debts api-debtors api-transactions api-communications api-collectors api-voice api-workflows api-automations)

for SERVICE in "${SERVICES[@]}"; do
  URL=$(gcloud run services describe $SERVICE \
    --region=us-central1 \
    --project=verichron-recover-staging \
    --format='value(status.url)')

  echo "Testing $SERVICE..."
  curl -f $URL/health && echo " ✅" || echo " ❌"
done
```

**⏱️ Expected Time**: 5 minutes

---

## Step 9: Configure Domains (Optional)

### Option A: Use Cloud Run URLs directly
- Services are accessible at: `https://api-users-xxxxx-uc.a.run.app`
- Update frontend apps to use these URLs

### Option B: Setup custom domains
See: [CLOUD-RUN-STAGING-DEPLOYMENT.md](./CLOUD-RUN-STAGING-DEPLOYMENT.md#phase-4-domain--load-balancer-setup-1-hour)

---

## Deployment Summary

Once complete, you'll have:

✅ **10 microservices** running on Cloud Run
✅ **PostgreSQL database** on Cloud SQL
✅ **Redis cache** on Memorystore
✅ **MongoDB** on Atlas
✅ **Event-driven architecture** with Pub/Sub
✅ **Document storage** on GCS
✅ **AI capabilities** via Vertex AI & Document AI

---

## Common Commands

### View logs
```bash
gcloud run services logs read api-users \
  --region=us-central1 \
  --project=verichron-recover-staging \
  --limit=100
```

### Rollback a service
```bash
# List revisions
gcloud run revisions list \
  --service=api-users \
  --region=us-central1 \
  --project=verichron-recover-staging

# Rollback to previous revision
gcloud run services update-traffic api-users \
  --to-revisions=api-users-00001-abc=100 \
  --region=us-central1 \
  --project=verichron-recover-staging
```

### Update environment variables
```bash
# Update .env.stage locally
nano .env.stage

# Upload new version
gcloud secrets versions add env-stage \
  --data-file=.env.stage \
  --project=verichron-recover-staging

# Re-deploy service to pick up changes
gcloud run services update api-users \
  --region=us-central1 \
  --project=verichron-recover-staging
```

### Scale a service
```bash
# Set min instances (reduces cold starts)
gcloud run services update api-users \
  --min-instances=1 \
  --region=us-central1 \
  --project=verichron-recover-staging

# Increase max instances
gcloud run services update api-users \
  --max-instances=50 \
  --region=us-central1 \
  --project=verichron-recover-staging
```

---

## Estimated Costs

**Monthly staging costs**: $66-104/month

See: [Cost breakdown](./CLOUD-RUN-STAGING-DEPLOYMENT.md#cost-estimate)

---

## Troubleshooting

### "Permission denied" errors
```bash
# Ensure you're authenticated
gcloud auth login
gcloud auth application-default login

# Set active project
gcloud config set project verichron-recover-staging
```

### Services can't connect to Cloud SQL
- Ensure VPC connector is created and attached
- Check Cloud SQL connection name is correct in .env.stage

### Out of memory errors
```bash
# Increase memory for a service
gcloud run services update api-users \
  --memory=1Gi \
  --region=us-central1 \
  --project=verichron-recover-staging
```

### Service not starting
```bash
# Check logs
gcloud run services logs read api-users \
  --region=us-central1 \
  --project=verichron-recover-staging \
  --limit=50
```

---

## Next Steps

After staging is deployed:
1. **Test thoroughly** - Smoke test all major features
2. **Monitor costs** - Set up budget alerts in GCP Console
3. **Setup CI/CD** - Automate deployments with GitHub Actions or Cloud Build
4. **Configure domains** - Map staging.verichroninc.com subdomains
5. **Enable monitoring** - Set up alerting and uptime checks

---

## Support

Full documentation: [CLOUD-RUN-STAGING-DEPLOYMENT.md](./CLOUD-RUN-STAGING-DEPLOYMENT.md)

For issues:
- Check logs: `gcloud run services logs read SERVICE_NAME`
- GCP Console: https://console.cloud.google.com/run?project=verichron-recover-staging
