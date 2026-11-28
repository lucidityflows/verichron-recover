# Cloud Run Staging Deployment Guide
**Project**: Verichron Recover
**Environment**: Staging
**GCP Project**: verichron-recover-staging
**Domain**: *.staging.verichroninc.com
**Last Updated**: 2026-01-12

---

## Prerequisites Checklist

### 1. GCP Project Setup
- [ ] GCP Project created: `verichron-recover-staging`
- [ ] Billing enabled on the project
- [ ] Project owner/editor access configured

### 2. Required GCP APIs to Enable
```bash
# Enable all required APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com \
  artifactregistry.googleapis.com \
  pubsub.googleapis.com \
  aiplatform.googleapis.com \
  documentai.googleapis.com \
  --project=verichron-recover-staging
```

### 3. Infrastructure Components Needed
- [ ] Cloud SQL PostgreSQL instance (db-f1-micro)
- [ ] Memorystore Redis instance (1GB Standard Tier)
- [ ] MongoDB Atlas cluster (M2 Shared Tier, GCP us-central1)
- [ ] GCS Buckets for documents
- [ ] Pub/Sub topics for events
- [ ] Secret Manager secrets for env vars

### 4. Domain Setup
- [ ] Domain ownership verified: verichroninc.com
- [ ] DNS configured for *.staging.verichroninc.com
- [ ] SSL certificates provisioned (Cloud Run automatic)

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (TBD)                      │
│              api.staging.verichroninc.com                   │
└───────────────┬─────────────────────────────────────────────┘
                │
    ┌───────────┴────────────┐
    │   Cloud Run Services   │
    │   (10 microservices)   │
    │                        │
    │  ┌──────────────────┐  │
    │  │ api-users        │  │
    │  │ api-organizations│  │
    │  │ api-debts        │  │
    │  │ api-debtors      │  │
    │  │ api-transactions │  │
    │  │ api-communications│ │
    │  │ api-collectors   │  │
    │  │ api-voice        │  │
    │  │ api-workflows    │  │
    │  │ api-automations  │  │
    │  └──────────────────┘  │
    └───────────┬────────────┘
                │
    ┌───────────┴────────────┐
    │  Infrastructure Layer   │
    │                        │
    │  • Cloud SQL (PostgreSQL)│
    │  • Memorystore (Redis)  │
    │  • MongoDB Atlas        │
    │  • Pub/Sub Topics       │
    │  • GCS Buckets          │
    │  • Secret Manager       │
    └────────────────────────┘
```

---

## Phase 1: Infrastructure Setup (2-3 hours)

### Step 1.1: Create Cloud SQL Instance
```bash
# Create PostgreSQL instance
gcloud sql instances create verichron-recover \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --network=default \
  --enable-bin-log=false \
  --backup-start-time=03:00 \
  --backup-location=us \
  --retained-backups-count=7 \
  --project=verichron-recover-staging

# Set root password
gcloud sql users set-password postgres \
  --instance=verichron-recover \
  --password="$(openssl rand -base64 32)" \
  --project=verichron-recover-staging

# Create staging database user
gcloud sql users create verichron_stage \
  --instance=verichron-recover \
  --password="$(openssl rand -base64 32)" \
  --project=verichron-recover-staging

# Create staging database
gcloud sql databases create verichron_stage_db \
  --instance=verichron-recover \
  --project=verichron-recover-staging

# Get connection name for later
gcloud sql instances describe verichron-recover \
  --project=verichron-recover-staging \
  --format='value(connectionName)'
```

**Save the output**: You'll need the connection name for DATABASE_URL

### Step 1.2: Create Memorystore Redis Instance
```bash
# Create Redis instance
gcloud redis instances create verichron-recover-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=standard \
  --project=verichron-recover-staging

# Get Redis IP address
gcloud redis instances describe verichron-recover-redis \
  --region=us-central1 \
  --project=verichron-recover-staging \
  --format='value(host)'
```

**Save the output**: You'll need the IP for REDIS_HOST

### Step 1.3: Create MongoDB Atlas Cluster
1. Go to MongoDB Atlas: https://cloud.mongodb.com
2. Create M2 Shared Tier cluster in GCP us-central1
3. Create database user: `verichron-stage-user`
4. Whitelist IP: `0.0.0.0/0` (Cloud Run dynamic IPs)
5. Get connection string for MONGODB_URI

### Step 1.4: Create GCS Buckets
```bash
# Debtors documents bucket
gsutil mb -p verichron-recover-staging \
  -c STANDARD \
  -l us-central1 \
  gs://verichron-debtors-documents-staging

# Payments documents bucket
gsutil mb -p verichron-recover-staging \
  -c STANDARD \
  -l us-central1 \
  gs://verichron-payments-docs-staging

# Set appropriate IAM policies
gsutil iam ch allUsers:objectViewer \
  gs://verichron-debtors-documents-staging

gsutil iam ch allUsers:objectViewer \
  gs://verichron-payments-docs-staging
```

### Step 1.5: Create Pub/Sub Topics
```bash
# Event topics for each service
for topic in \
  users-events \
  organizations-events \
  debts-events \
  debtors-events \
  transactions-events \
  communications-events \
  collectors-events \
  voice-events \
  workflows-events \
  automations-events
do
  gcloud pubsub topics create $topic \
    --project=verichron-recover-staging
done

# Create subscriptions (push subscriptions to Cloud Run endpoints)
# These will be created by services on first run
```

### Step 1.6: Create Secret Manager Secrets
```bash
# Store the entire .env.stage file as a secret
gcloud secrets create env-stage \
  --data-file=./.env.stage \
  --replication-policy="automatic" \
  --project=verichron-recover-staging

# Individual critical secrets (alternative approach)
gcloud secrets create jwt-secret \
  --data-file=<(grep JWT_SECRET .env.stage | cut -d= -f2) \
  --replication-policy="automatic" \
  --project=verichron-recover-staging

# Grant Cloud Run service account access to secrets
gcloud secrets add-iam-policy-binding env-stage \
  --member="serviceAccount:verichron-recover-staging@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=verichron-recover-staging
```

---

## Phase 2: Container Registry Setup (30 minutes)

### Step 2.1: Configure Artifact Registry
```bash
# Create Docker repository
gcloud artifacts repositories create verichron-services \
  --repository-format=docker \
  --location=us-central1 \
  --description="Verichron Recover microservices" \
  --project=verichron-recover-staging

# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev \
  --project=verichron-recover-staging
```

### Step 2.2: Build and Push Docker Images
```bash
# Set variables
export GCP_PROJECT="verichron-recover-staging"
export GCP_REGION="us-central1"
export REGISTRY="us-central1-docker.pkg.dev/${GCP_PROJECT}/verichron-services"

# Build script for all services
cat > scripts/build-and-push-staging.sh << 'EOF'
#!/bin/bash
set -e

SERVICES=(
  "api-users"
  "api-organizations"
  "api-debts"
  "api-debtors"
  "api-transactions"
  "api-communications"
  "api-collectors"
  "api-voice"
  "api-workflows"
  "api-automations"
)

REGISTRY="us-central1-docker.pkg.dev/verichron-recover-staging/verichron-services"
VERSION=${1:-latest}

for SERVICE in "${SERVICES[@]}"; do
  echo "Building $SERVICE..."
  docker build \
    -f apps/$SERVICE/Dockerfile \
    -t $REGISTRY/$SERVICE:$VERSION \
    -t $REGISTRY/$SERVICE:$(git rev-parse --short HEAD) \
    --target production \
    .

  echo "Pushing $SERVICE..."
  docker push $REGISTRY/$SERVICE:$VERSION
  docker push $REGISTRY/$SERVICE:$(git rev-parse --short HEAD)
done

echo "All services built and pushed successfully!"
EOF

chmod +x scripts/build-and-push-staging.sh
```

---

## Phase 3: Cloud Run Deployment (1-2 hours)

### Step 3.1: Deploy First Service (api-users)
```bash
# Deploy api-users as the first service
gcloud run deploy api-users \
  --image=us-central1-docker.pkg.dev/verichron-recover-staging/verichron-services/api-users:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=8080 \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --set-env-vars="NODE_ENV=staging,LOG_LEVEL=info" \
  --set-secrets="ENV_FILE=env-stage:latest" \
  --add-cloudsql-instances=verichron-recover-staging:us-central1:verichron-recover \
  --vpc-connector=verichron-vpc-connector \
  --project=verichron-recover-staging

# Get the service URL
gcloud run services describe api-users \
  --region=us-central1 \
  --project=verichron-recover-staging \
  --format='value(status.url)'
```

### Step 3.2: Create VPC Connector (for Cloud SQL & Redis)
```bash
# Create VPC connector for private IP access
gcloud compute networks vpc-access connectors create verichron-vpc-connector \
  --region=us-central1 \
  --network=default \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=10 \
  --machine-type=e2-micro \
  --project=verichron-recover-staging
```

### Step 3.3: Deploy All Services Script
```bash
cat > scripts/deploy-all-staging.sh << 'EOF'
#!/bin/bash
set -e

SERVICES=(
  "api-users"
  "api-organizations"
  "api-debts"
  "api-debtors"
  "api-transactions"
  "api-communications"
  "api-collectors"
  "api-voice"
  "api-workflows"
  "api-automations"
)

PROJECT="verichron-recover-staging"
REGION="us-central1"
REGISTRY="us-central1-docker.pkg.dev/${PROJECT}/verichron-services"
VPC_CONNECTOR="verichron-vpc-connector"
CLOUD_SQL_INSTANCE="${PROJECT}:${REGION}:verichron-recover"

for SERVICE in "${SERVICES[@]}"; do
  echo "Deploying $SERVICE..."

  gcloud run deploy $SERVICE \
    --image=$REGISTRY/$SERVICE:latest \
    --platform=managed \
    --region=$REGION \
    --allow-unauthenticated \
    --port=8080 \
    --min-instances=0 \
    --max-instances=10 \
    --memory=512Mi \
    --cpu=1 \
    --timeout=300 \
    --set-secrets="ENV_FILE=env-stage:latest" \
    --add-cloudsql-instances=$CLOUD_SQL_INSTANCE \
    --vpc-connector=$VPC_CONNECTOR \
    --project=$PROJECT \
    --quiet

  # Get service URL
  URL=$(gcloud run services describe $SERVICE \
    --region=$REGION \
    --project=$PROJECT \
    --format='value(status.url)')

  echo "✅ $SERVICE deployed: $URL"
done

echo "All services deployed successfully!"
EOF

chmod +x scripts/deploy-all-staging.sh
```

---

## Phase 4: Domain & Load Balancer Setup (1 hour)

### Step 4.1: Configure Load Balancer (Optional - Single Entry Point)
```bash
# Create a Network Endpoint Group (NEG) for each Cloud Run service
# Then create a Load Balancer to route to them
# This provides a single domain: api.staging.verichroninc.com

# For now, you can use Cloud Run direct URLs
# Or set up Cloud Run domain mapping
```

### Step 4.2: Map Custom Domains
```bash
# Map custom domain to api-users
gcloud run domain-mappings create \
  --service=api-users \
  --domain=auth.staging.verichroninc.com \
  --region=us-central1 \
  --project=verichron-recover-staging

# Repeat for each service with its subdomain
# auth.staging.verichroninc.com -> api-users
# api.staging.verichroninc.com -> (load balancer needed)
```

---

## Phase 5: Database Migrations (30 minutes)

### Step 5.1: Run Migrations
```bash
# Connect to Cloud SQL via proxy
cloud_sql_proxy -instances=verichron-recover-staging:us-central1:verichron-recover=tcp:5432 &

# Set DATABASE_URL for local migration run
export DATABASE_URL="postgresql://verichron_stage:PASSWORD@localhost:5432/verichron_stage_db"

# Run migrations for each service
cd apps/api-users && pnpm run migration:run && cd ../..
cd apps/api-organizations && pnpm run migration:run && cd ../..
# ... repeat for all services

# OR use Cloud Build to run migrations during deployment
```

---

## Phase 6: Testing & Verification (1 hour)

### Step 6.1: Health Check All Services
```bash
# Test each service health endpoint
SERVICES=(
  "api-users"
  "api-organizations"
  "api-debts"
  "api-debtors"
  "api-transactions"
  "api-communications"
  "api-collectors"
  "api-voice"
  "api-workflows"
  "api-automations"
)

for SERVICE in "${SERVICES[@]}"; do
  URL=$(gcloud run services describe $SERVICE \
    --region=us-central1 \
    --project=verichron-recover-staging \
    --format='value(status.url)')

  echo "Testing $SERVICE at $URL/health"
  curl -f $URL/health || echo "❌ $SERVICE health check failed"
done
```

### Step 6.2: Smoke Tests
- [ ] User registration works
- [ ] Organization creation works
- [ ] Debt import works
- [ ] Email sending works
- [ ] Pub/Sub events flow between services
- [ ] Redis caching works
- [ ] Cloud SQL queries work

---

## Phase 7: CI/CD Setup (Optional, 2-3 hours)

### Option A: Cloud Build
```yaml
# cloudbuild.yaml
steps:
  # Build all services
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/verichron-services/api-users:$COMMIT_SHA', '-f', 'apps/api-users/Dockerfile', '.']

  # Push images
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/verichron-services/api-users:$COMMIT_SHA']

  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'api-users'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/verichron-services/api-users:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'

# Trigger on push to 'staging' branch
```

### Option B: GitHub Actions
```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Build and Push
        run: ./scripts/build-and-push-staging.sh

      - name: Deploy to Cloud Run
        run: ./scripts/deploy-all-staging.sh
```

---

## Cost Estimate

### Monthly Staging Costs (Estimated)
| Resource | Configuration | Est. Cost |
|----------|--------------|-----------|
| Cloud Run (10 services) | 0 min instances | $0-20 |
| Cloud SQL | db-f1-micro | $7 |
| Memorystore Redis | 1GB Standard | $50 |
| MongoDB Atlas | M2 Shared | $9 |
| Pub/Sub | Low volume | $0-5 |
| Cloud Storage | <100GB | $0-3 |
| Vertex AI | Usage-based | $0-10 |
| **TOTAL** | | **$66-104/month** |

---

## Security Checklist

- [ ] All secrets stored in Secret Manager (not in env vars)
- [ ] Cloud Run services use service accounts with minimal permissions
- [ ] Cloud SQL requires SSL connections
- [ ] VPC connector configured for private networking
- [ ] CORS configured to only allow staging domains
- [ ] Rate limiting enabled on all public endpoints
- [ ] Cloud Armor WAF configured (optional)

---

## Monitoring & Logging

### Enable Cloud Monitoring
```bash
# Logs are automatically sent to Cloud Logging
# View logs:
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=api-users" \
  --limit=50 \
  --project=verichron-recover-staging

# Create log-based metrics for errors
# Set up alerting policies
# Configure uptime checks
```

---

## Rollback Strategy

### Quick Rollback
```bash
# Rollback to previous revision
gcloud run services update-traffic api-users \
  --to-revisions=api-users-00001-abc=100 \
  --region=us-central1 \
  --project=verichron-recover-staging
```

---

## Next Steps

1. **Immediate**: Run Phase 1 (Infrastructure Setup)
2. **Day 1**: Complete Phase 2-3 (Build & Deploy)
3. **Day 2**: Phase 4-6 (Domains, Migration, Testing)
4. **Week 1**: Phase 7 (CI/CD automation)

---

## Support & Troubleshooting

### Common Issues

**Issue**: Cloud Run can't connect to Cloud SQL
- **Solution**: Ensure VPC connector is created and attached to Cloud Run service

**Issue**: Services can't talk to each other
- **Solution**: Update API_*_URL environment variables with Cloud Run service URLs

**Issue**: Out of memory errors
- **Solution**: Increase memory limit: `--memory=1Gi`

**Issue**: Cold starts too slow
- **Solution**: Set `--min-instances=1` for critical services

### Useful Commands
```bash
# View service logs
gcloud run services logs read api-users --region=us-central1

# SSH into a running container (for debugging)
gcloud run services describe api-users --region=us-central1

# Check service configuration
gcloud run services describe api-users --region=us-central1 --format=yaml
```

---

## Maintainer Notes

- This guide assumes monorepo structure with pnpm
- All services use PORT=8080 in Cloud Run (standard)
- Services auto-scale from 0 to 10 instances
- Secrets are injected from Secret Manager at runtime
- Database migrations should run before deployments
