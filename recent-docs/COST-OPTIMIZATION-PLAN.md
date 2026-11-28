# Cost Optimization Plan - Stretch $300 GCP Credits

## Current Monthly Burn Rate Analysis

### Your Current Setup:
```
Cloud Run (10 services, min=0):        ~$5-10/month (mostly idle)
Cloud SQL (db-perf-optimized-N-8):     ~$60/month ⚠️ EXPENSIVE
Memorystore Redis (1 instance):        ~$50/month ⚠️ EXPENSIVE  
VPC Connector:                         ~$8/month
Pub/Sub (low usage):                   ~$1/month
Secret Manager:                        ~$1/month
Artifact Registry:                     ~$0-5/month
Networking:                            ~$5/month
------------------------------------------------------
TOTAL:                                 ~$130-140/month
```

**With $300 credits: ~2-2.5 months before you run out**

---

## IMMEDIATE OPTIMIZATIONS (Reduce to ~$40/month = 7+ months of runway)

### 1. Downgrade Cloud SQL Instance (SAVES ~$50/month)

**Current:** db-perf-optimized-N-8 (8 vCPUs, 32GB RAM) - $60/month
**Problem:** Way overpowered for staging with no traffic

**Recommended:** db-f1-micro (shared vCPU, 614MB RAM) - $7.50/month

```bash
# Check current instance
gcloud sql instances describe verichron-recover \
  --project=verichron-recover-staging \
  --format="value(settings.tier,settings.dataDiskSizeGb)"

# Stop instance (to avoid charges during modification)
gcloud sql instances patch verichron-recover \
  --activation-policy=NEVER \
  --project=verichron-recover-staging

# Downgrade to cheapest tier
gcloud sql instances patch verichron-recover \
  --tier=db-f1-micro \
  --project=verichron-recover-staging

# Restart instance
gcloud sql instances patch verichron-recover \
  --activation-policy=ALWAYS \
  --project=verichron-recover-staging
```

**Important Notes:**
- db-f1-micro limits: 614MB RAM, 250 connections max
- Perfect for staging with no real users
- Still supports 9 databases, just slower queries
- Can upgrade back when you get alpha customers

**Alternative (if f1-micro too small):** db-g1-small (1.7GB RAM) - $25/month

### 2. Downgrade Redis Instance (SAVES ~$40/month)

**Current:** Basic tier, 1GB memory - $50/month
**Problem:** Too large for staging

**Option A: Switch to Cloud Run Redis (FREE for low usage)**
```typescript
// Use Cloud Run's built-in Redis (no Memorystore)
// Limited but free for caching
import { createClient } from 'redis';

const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }
});
```

**Option B: Downgrade Memorystore (SAVES ~$30/month)**
```bash
# Can't go below 1GB, but can use Standard tier instead of Basic
# Basic tier: High availability, automatic failover
# Standard tier: Single node, no failover

gcloud redis instances update verichron-redis \
  --region=us-central1 \
  --project=verichron-recover-staging \
  --size=1 \
  --tier=STANDARD_HA
```

Actually, Memorystore minimum is ~$48/month for 1GB. For staging, consider:

**Option C: Use Redis Labs Free Tier (SAVES $50/month)**
- 30MB storage (enough for sessions/caching)
- 30 connections
- FREE forever
- Sign up: https://redis.com/try-free/

```bash
# Update .env.stage with Redis Labs connection
REDIS_URL=redis://default:password@redis-12345.redis-cloud.com:12345
REDIS_HOST=redis-12345.redis-cloud.com
REDIS_PORT=12345
```

**Recommendation:** Use Redis Labs Free Tier for staging, only pay for Memorystore in production

### 3. Remove VPC Connector (SAVES ~$8/month)

**Current:** VPC Connector for Redis access
**If using Redis Labs:** Don't need VPC connector at all!

```bash
# Delete VPC connector
gcloud compute networks vpc-access connectors delete verirchron-connector \
  --region=us-central1 \
  --project=verichron-recover-staging

# Update all services to remove vpc-connector flag
for service in api-users api-organizations api-debts api-debtors api-transactions api-communications api-collectors api-voice api-workflows api-automations; do
  gcloud run services update ${service}-staging \
    --clear-vpc-connector \
    --region=us-central1 \
    --project=verichron-recover-staging
done
```

### 4. Optimize MongoDB Atlas (NO GCP COST)

**Current:** M10 ($57/month from your MongoDB Atlas account, not GCP)

**Option A: Downgrade to M2 Shared ($9/month)**
- 2GB storage
- Shared RAM
- Perfect for staging with low traffic
- SAVES $48/month

**Option B: Use M0 Free Tier ($0/month)**
- 512MB storage
- Shared resources
- Good enough for development/testing
- May need to clean up old data periodically

**Recommendation:** Switch to M2 ($9/month) - still has good performance, saves significantly

---

## OPTIMIZED MONTHLY COST

```
Cloud Run (min=0):                     ~$5/month
Cloud SQL (db-f1-micro):              ~$7.50/month
Redis Labs (free tier):                $0/month
VPC Connector (removed):               $0/month
Pub/Sub:                               ~$1/month
Secret Manager:                        ~$1/month
Artifact Registry:                     ~$2/month
Networking:                            ~$5/month
MongoDB Atlas (M2 - not GCP):          $9/month (separate billing)
------------------------------------------------------
GCP TOTAL:                             ~$21.50/month
MongoDB (separate):                    ~$9/month
------------------------------------------------------
GRAND TOTAL:                           ~$30.50/month
```

**With $300 GCP credits: ~14 months of runway! 🎉**

---

## GitHub Actions - YES, IT'S FREE! 🆓

### Free Tier:
- **Public repositories:** UNLIMITED free minutes
- **Private repositories:** 2,000 free minutes/month (plenty for you)

### Your Estimated Usage:
- Full build & deploy all 10 services: ~15 minutes
- Deploy once per day: 15 min × 30 days = 450 minutes/month
- **Well within free tier!**

### Additional Benefits:
- Faster builds than Cloud Build on free tier
- Better integration with GitHub (PRs, issues)
- Easier to debug locally
- No GCP credit usage

**Recommendation:** Use GitHub Actions for CI/CD - it's completely free!

---

## Implementation Steps (This Week)

### Step 1: Set Up GitHub Actions (FREE, Do First)
```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [main]
  workflow_dispatch: # Manual trigger

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      services: ${{ steps.changes.outputs.services }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      
      - name: Detect changed services
        id: changes
        run: |
          CHANGED=$(git diff --name-only HEAD^ HEAD | grep '^apps/api-' | cut -d'/' -f2 | sort -u | jq -R -s -c 'split("\n")[:-1]')
          echo "services=$CHANGED" >> $GITHUB_OUTPUT
          echo "Changed services: $CHANGED"

  build-and-deploy:
    needs: detect-changes
    if: needs.detect-changes.outputs.services != '[]'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: ${{ fromJson(needs.detect-changes.outputs.services) }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2
      
      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker us-central1-docker.pkg.dev
      
      - name: Build Docker image
        run: |
          docker build \
            -f apps/${{ matrix.service }}/Dockerfile.e2e \
            -t us-central1-docker.pkg.dev/verichron-recover-staging/verichron-staging/${{ matrix.service }}:${{ github.sha }} \
            -t us-central1-docker.pkg.dev/verichron-recover-staging/verichron-staging/${{ matrix.service }}:latest \
            .
      
      - name: Push to Artifact Registry
        run: |
          docker push us-central1-docker.pkg.dev/verichron-recover-staging/verichron-staging/${{ matrix.service }}:${{ github.sha }}
          docker push us-central1-docker.pkg.dev/verichron-recover-staging/verichron-staging/${{ matrix.service }}:latest
      
      - name: Deploy to Cloud Run
        run: |
          # Source service-specific configs
          if [[ "${{ matrix.service }}" == "api-communications" ]]; then
            MEMORY="1Gi"
            CPU="2"
            TIMEOUT="900"
            VPC_EGRESS="all-traffic"
          else
            MEMORY="512Mi"
            CPU="1"
            TIMEOUT="300"
            VPC_EGRESS="private-ranges-only"
          fi
          
          gcloud run deploy ${{ matrix.service }}-staging \
            --image=us-central1-docker.pkg.dev/verichron-recover-staging/verichron-staging/${{ matrix.service }}:${{ github.sha }} \
            --region=us-central1 \
            --project=verichron-recover-staging \
            --memory=$MEMORY \
            --cpu=$CPU \
            --timeout=$TIMEOUT \
            --quiet
```

**Setup:**
1. Create GCP service account for GitHub Actions
2. Add secret to GitHub: Settings → Secrets → Actions → New secret
3. Push to main branch - auto deploys!

### Step 2: Downgrade Cloud SQL
```bash
# 1. Backup first (just in case)
gcloud sql backups create \
  --instance=verichron-recover \
  --project=verichron-recover-staging

# 2. Downgrade (takes ~5 minutes)
gcloud sql instances patch verichron-recover \
  --tier=db-f1-micro \
  --project=verichron-recover-staging
```

### Step 3: Switch to Redis Labs (Free)
```bash
# 1. Sign up at https://redis.com/try-free/
# 2. Create database (30MB free tier)
# 3. Get connection details

# 4. Update secrets
echo -n "redis://default:PASSWORD@redis-xxxxx.redis-cloud.com:xxxxx" | \
  gcloud secrets versions add REDIS_URL --project=verichron-recover-staging --data-file=-

echo -n "redis-xxxxx.redis-cloud.com" | \
  gcloud secrets versions add REDIS_HOST --project=verichron-recover-staging --data-file=-

echo -n "xxxxx" | \
  gcloud secrets versions add REDIS_PORT --project=verichron-recover-staging --data-file=-

# 5. Delete Memorystore instance
gcloud redis instances delete verichron-redis \
  --region=us-central1 \
  --project=verichron-recover-staging

# 6. Remove VPC connector from all services (see above)

# 7. Delete VPC connector
gcloud compute networks vpc-access connectors delete verirchron-connector \
  --region=us-central1 \
  --project=verichron-recover-staging
```

### Step 4: Downgrade MongoDB Atlas
1. Login to MongoDB Atlas
2. Go to your cluster
3. Click "Edit Configuration"
4. Change from M10 to M2 Shared
5. Click "Apply Changes"
6. Saves $48/month (non-GCP)

---

## Cost Comparison

### Before Optimization:
- GCP: $130/month
- MongoDB: $57/month
- **Total: $187/month**
- **$300 credits last: 1.6 months** ⚠️

### After Optimization:
- GCP: $21.50/month
- MongoDB: $9/month
- **Total: $30.50/month**
- **$300 credits last: 14 months** ✅

### Savings:
- **$156.50/month saved!**
- **12+ additional months of runway**

---

## When to Scale Back Up

### Trigger: First Alpha Customer
1. Upgrade Cloud SQL to db-g1-small ($25/month)
2. Add Memorystore Redis Basic 1GB ($50/month)
3. Upgrade MongoDB to M10 ($57/month)
4. Add Cloud NAT for MongoDB security ($45/month)
5. Total: ~$150/month

### Trigger: 10+ Active Users
1. Upgrade Cloud SQL to db-n1-standard-1 ($50/month)
2. Keep Memorystore Redis Basic
3. Add Load Balancer + Cloud Armor ($30/month)
4. Total: ~$180/month

### Trigger: Production Launch
1. Separate production environment (2x staging costs)
2. High availability (redundancy)
3. Backups and disaster recovery
4. Total: ~$600-800/month (production only)

---

## Monitoring Your Credits

```bash
# Check current credit balance
gcloud billing accounts describe $(gcloud billing projects describe verichron-recover-staging --format="value(billingAccountName)") \
  --format="table(displayName,name)" 2>/dev/null || echo "Check in GCP Console: Billing → Credits"

# Set up budget alert
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT_ID \
  --display-name="GCP Credits Alert" \
  --budget-amount=300 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=75 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

**Get email alerts at 50%, 75%, 90%, and 100% credit usage**

---

## Summary & Recommendations

### ✅ DO NOW (This Week):
1. ✅ Set up GitHub Actions CI/CD (FREE, huge benefit)
2. ✅ Downgrade Cloud SQL to db-f1-micro (SAVE $52/month)
3. ✅ Switch to Redis Labs free tier (SAVE $50/month)
4. ✅ Remove VPC connector (SAVE $8/month)
5. ✅ Downgrade MongoDB Atlas to M2 (SAVE $48/month - non-GCP)

### 💰 RESULT:
- **From $187/month → $30.50/month**
- **14 months of runway instead of 1.6 months**
- **Still fully functional for development/testing**

### ⏰ LATER (When You Get Alpha Customers):
- Upgrade Cloud SQL to db-g1-small
- Add Memorystore Redis
- Set up Load Balancer + Cloud Armor
- Add MongoDB Cloud NAT security

### 📊 Track Your Spend:
```bash
# Monthly cost tracking
gcloud billing accounts list
# Then check in GCP Console → Billing → Reports
```

---

## Questions?

1. Should I create the GitHub Actions workflow file now?
2. Want me to help downgrade Cloud SQL and Redis?
3. Need help setting up MongoDB Atlas M2?

