# .env.test → .env.stage Transition Analysis

**Document Version**: 1.0
**Last Updated**: 2026-01-11
**Status**: Ready for Implementation

---

## Executive Summary

This document outlines the transition from `.env.test` (local/E2E testing) to `.env.stage` (GCP Cloud Run staging) for Verichron Recover. The staging environment will be used to test:
- **Email dispatching** with real SendGrid domain authentication
- **Portfolio import** with Vertex AI entity resolution
- **UI-managers** manual testing (all features)
- **UI-collectors** soft phone integration testing

**Target Timeline**: Deploy to staging within 1 week

---

## Phase 1: Direct Transitions (Copy As-Is)

### ✅ Configuration Structure (Can Copy)

These can be copied directly from `.env.test` to `.env.stage` with **NO changes**:

```bash
# JWT Token Expiration (same durations)
JWT_ACCESS_TOKEN_EXPIRES_IN=1h
JWT_REFRESH_TOKEN_EXPIRES_IN=7d

# Port Configuration (Cloud Run uses 8080, but structure is same)
# Just update all to 8080 for Cloud Run

# Log Level (change from debug → info)
LOG_LEVEL=info
```

---

## Phase 2: Update with New Values

### 🔄 Branding Updates (Verichron)

**From .env.test:**
```bash
EMAIL_FROM_ADDRESS=noreply@verichron-test.com
JWT_CLAIMS_NAMESPACE=https://verichroninc.com/claims  # ASSUMED (not in .env.test)
```

**To .env.stage:**
```bash
EMAIL_FROM_ADDRESS=noreply@staging.verichroninc.com
EMAIL_FROM_NAME=Verichron Recover (Staging)
EMAIL_REPLY_TO=support@verichroninc.com
EMAIL_BRAND_COMPANY_NAME=Verichron Inc
EMAIL_BRAND_PRODUCT_NAME=Verichron Recover
JWT_CLAIMS_NAMESPACE=https://verichroninc.com/claims
```

**Action Required**:
- ✅ Already defined in `.env.stage`
- ⚠️ Need to update all backend services to use new JWT namespace

---

### 🔄 GCP Project ID Update

**From .env.test:**
```bash
GCP_PROJECT_ID=debt-lucidity-solutions
GCP_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-1.5-flash
```

**To .env.stage:**
```bash
GCP_PROJECT_ID=REPLACE_WITH_GCP_PROJECT_ID  # e.g., verichron-staging-123456
GCP_LOCATION=us-central1  # SAME
VERTEX_AI_MODEL=gemini-1.5-flash  # SAME
```

**Action Required**:
- [ ] Decide on staging GCP project ID (new project or existing?)
- [ ] Update `PUBSUB_PROJECT_ID` to match

---

### 🔄 Service Account Credentials

**From .env.test:**
```bash
GOOGLE_APPLICATION_CREDENTIALS=./credentials/gcp-service-account.json
```

**To .env.stage:**
```bash
GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcp-service-account.json
```

**Action Required**:
- [ ] Create new service account for staging: `verichron-staging@PROJECT_ID.iam.gserviceaccount.com`
- [ ] Grant roles:
  - Pub/Sub Admin
  - Vertex AI User
  - Document AI User
  - Cloud SQL Client
  - Secret Manager Accessor
- [ ] Download JSON key file
- [ ] Store in GCP Secret Manager: `gcp-service-account-staging`
- [ ] Mount secret in Cloud Run containers at `/secrets/gcp-service-account.json`

---

### 🔄 Twilio Configuration (Voice)

**From .env.test:**
```bash
TWILIO_VOICE_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_VOICE_AUTH_TOKEN=your_voice_auth_token
# ... (all placeholder values)
```

**To .env.stage:**
```bash
# Use REAL Twilio credentials from .env.test if they work, or create new staging sub-account
TWILIO_VOICE_ACCOUNT_SID=REPLACE_WITH_VOICE_ACCOUNT_SID
# ...
```

**Action Required**:
- [ ] Verify if current Twilio credentials in `.env.test` are real (lines 128-146)
- [ ] If real and working, copy to `.env.stage`
- [ ] If placeholders, create staging Twilio sub-account
- [ ] Buy US phone number for soft phone testing
- [ ] Configure TwiML App with webhook: `https://api.staging.verichroninc.com/voice`

---

### 🔄 SendGrid API Key

**From .env.test:**
```bash
SENDGRID_API_KEY=REDACTED_SENDGRID_KEY
SENDGRID_WEBHOOK_PUBLIC_KEY="MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEEDg5K..."
```

**To .env.stage:**
```bash
SENDGRID_API_KEY=REPLACE_WITH_STAGING_SENDGRID_API_KEY
SENDGRID_WEBHOOK_PUBLIC_KEY=REPLACE_WITH_WEBHOOK_PUBLIC_KEY
```

**Action Required**:
- [ ] Check if current SendGrid key is real (test by sending email)
- [ ] If real, decide: Reuse for staging OR create new API key
- [ ] Set up domain authentication for `staging.verichroninc.com`:
  1. SendGrid Console > Settings > Sender Authentication > Authenticate Domain
  2. Enter: `staging.verichroninc.com`
  3. Add DNS records (will be provided by SendGrid):
     - `em####.staging.verichroninc.com` → CNAME to SendGrid
     - `s1._domainkey.staging.verichroninc.com` → CNAME
     - `s2._domainkey.staging.verichroninc.com` → CNAME
  4. Verify domain (wait 24-48 hours for DNS propagation)

---

## Phase 3: Critical Gaps to Fill

### ⚠️ CRITICAL: Database Connection String

**Current in .env.test:**
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_db
```

**Needed for .env.stage:**
```bash
DATABASE_URL=postgresql://verichron_stage:PASSWORD@/verichron_stage_db?host=/cloudsql/PROJECT_ID:us-central1:verichron-stage-postgres
```

**Action Required**:
- [ ] Create Cloud SQL PostgreSQL instance:
  ```bash
  gcloud sql instances create verichron-stage-postgres \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --no-backup \
    --availability-type=zonal
  ```
- [ ] Create database:
  ```bash
  gcloud sql databases create verichron_stage_db \
    --instance=verichron-stage-postgres
  ```
- [ ] Create user:
  ```bash
  gcloud sql users create verichron_stage \
    --instance=verichron-stage-postgres \
    --password=GENERATE_SECURE_PASSWORD
  ```
- [ ] Run migrations for all 10 services
- [ ] Grant Cloud Run services access via Cloud SQL Proxy

**Estimated Cost**: $7/month (db-f1-micro)

---

### ⚠️ CRITICAL: Redis Connection

**Current in .env.test:**
```bash
REDIS_URL=redis://redis-test:6379  # Docker container
REDIS_HOST=redis-test
REDIS_PORT=6379
```

**Needed for .env.stage:**
```bash
REDIS_URL=redis://10.123.45.67:6379  # GCP Memorystore IP
REDIS_HOST=10.123.45.67
REDIS_PORT=6379
```

**Action Required**:
- [ ] Create Memorystore for Redis instance:
  ```bash
  gcloud redis instances create verichron-stage-redis \
    --size=1 \
    --region=us-central1 \
    --redis-version=redis_7_0 \
    --tier=standard
  ```
- [ ] Get IP address:
  ```bash
  gcloud redis instances describe verichron-stage-redis \
    --region=us-central1 \
    --format="get(host)"
  ```
- [ ] Update `.env.stage` with actual IP
- [ ] Configure VPC peering for Cloud Run access

**Estimated Cost**: $50/month (1GB Standard Tier)

---

### ⚠️ CRITICAL: MongoDB Atlas Connection

**Current in .env.test:**
```bash
# Not present in .env.test - NEW REQUIREMENT
```

**Needed for .env.stage:**
```bash
MONGODB_URI=mongodb+srv://verichron_stage:PASSWORD@verichron-stage.CLUSTER.mongodb.net/verichron_stage?retryWrites=true&w=majority
```

**Action Required**:
- [ ] Create MongoDB Atlas account (if not already)
- [ ] Create cluster:
  - Tier: M0 Free Tier (for initial testing) or M2 Shared ($9/month)
  - Region: GCP us-central1 (Iowa)
  - Cluster Name: `verichron-stage`
- [ ] Create database: `verichron_stage`
- [ ] Create database user: `verichron_stage` with password
- [ ] Whitelist Cloud Run IP ranges:
  - Add `0.0.0.0/0` (not ideal, but Cloud Run has dynamic IPs)
  - OR use Cloud NAT for static IP (extra cost)
- [ ] Get connection string from Atlas Dashboard

**Estimated Cost**: $0 (M0) or $9/month (M2)

---

### ⚠️ CRITICAL: JWT Secrets

**Current in .env.test:**
```bash
JWT_SECRET=supersecretjwtkeyfore2etesting
JWT_REFRESH_SECRET=supersecretjwtrefreshkeyfore2etesting
AUTH_CONTEXT_TOKEN_SECRET=supersecretauthcontextkeyfore2etesting
```

**Needed for .env.stage:**
```bash
JWT_SECRET=REPLACE_WITH_GENERATED_SECRET_64_CHARS_MIN
JWT_REFRESH_SECRET=REPLACE_WITH_GENERATED_REFRESH_SECRET_64_CHARS_MIN
AUTH_CONTEXT_TOKEN_SECRET=REPLACE_WITH_GENERATED_AUTH_CONTEXT_SECRET_64_CHARS_MIN
```

**Action Required**:
- [ ] Generate new secrets (DO NOT reuse test secrets):
  ```bash
  openssl rand -base64 64  # Run 3 times for 3 secrets
  ```
- [ ] Store in GCP Secret Manager:
  ```bash
  echo "GENERATED_SECRET" | gcloud secrets create jwt-secret-staging --data-file=-
  echo "GENERATED_SECRET" | gcloud secrets create jwt-refresh-secret-staging --data-file=-
  echo "GENERATED_SECRET" | gcloud secrets create auth-context-secret-staging --data-file=-
  ```
- [ ] Reference in Cloud Run deployments

---

### ⚠️ CRITICAL: Service-to-Service Keys

**Current in .env.test:**
```bash
SERVICE_KEY_USERS=test-e2e-users-service-key-change-in-production-12345678
SERVICE_KEY_ORGANIZATIONS=test-e2e-org-service-key-change-in-production-12345678
# ... (all test keys)
```

**Needed for .env.stage:**
```bash
SERVICE_KEY_USERS=REPLACE_WITH_GENERATED_KEY_32_CHARS_MIN
SERVICE_KEY_ORGANIZATIONS=REPLACE_WITH_GENERATED_KEY_32_CHARS_MIN
# ... (10 total)
```

**Action Required**:
- [ ] Generate 10 new keys (one per service):
  ```bash
  openssl rand -base64 32  # Run 10 times
  ```
- [ ] Store in GCP Secret Manager:
  ```bash
  for service in users organizations debts debtors transactions communications collectors voice workflows automations; do
    echo "GENERATED_KEY" | gcloud secrets create service-key-${service}-staging --data-file=-
  done
  ```
- [ ] Update all services to read from Secret Manager

**Security Note**: Phase 2 (pre-production) should move these to Secret Manager with automated rotation.

---

### ⚠️ CRITICAL: Cloud Run Service URLs

**Current in .env.test:**
```bash
API_USERS_URL=http://localhost:3001
API_ORGANIZATIONS_URL=http://localhost:3002
# ... (all localhost)
```

**Needed for .env.stage:**
```bash
API_USERS_URL=https://api-users-staging-abc123xyz.a.run.app
API_ORGANIZATIONS_URL=https://api-organizations-staging-def456uvw.a.run.app
# ... (all Cloud Run URLs)
```

**Action Required**:
- [ ] Deploy all 10 services to Cloud Run
- [ ] Get service URLs:
  ```bash
  gcloud run services list --platform=managed --region=us-central1 --format="table(name,url)"
  ```
- [ ] Update `.env.stage` with actual URLs
- [ ] Redeploy services with updated env vars (circular dependency - requires 2 deployments)

**Deployment Order**:
1. Deploy with placeholder URLs (services won't be able to call each other yet)
2. Get real URLs from Cloud Run
3. Update `.env.stage`
4. Redeploy all services with correct URLs

---

## Phase 4: New Requirements (Not in .env.test)

### 🆕 API Gateway Configuration

**Not present in .env.test**, needed for staging:

- [ ] Set up Google Cloud Load Balancer
- [ ] Configure URL map for path-based routing:
  ```
  api.staging.verichroninc.com/users → api-users Cloud Run
  api.staging.verichroninc.com/organizations → api-organizations Cloud Run
  ... (all 10 services)
  ```
- [ ] Configure SSL certificate for `*.staging.verichroninc.com`
- [ ] Set up Cloud Armor for rate limiting (100 req/min per IP)

**Alternative (Simpler for MVP)**: Use Cloud Run as-is without gateway, update frontend to call individual service URLs.

---

### 🆕 DNS Records

**Not present in .env.test**, needed for staging:

```dns
# Frontend Apps
CNAME auth.staging.verichroninc.com → ghs.googlehosted.com (Firebase Hosting)
CNAME app.staging.verichroninc.com → ghs.googlehosted.com
CNAME ops.staging.verichroninc.com → ghs.googlehosted.com
CNAME collect.staging.verichroninc.com → ghs.googlehosted.com
CNAME portal.staging.verichroninc.com → ghs.googlehosted.com
CNAME staging.verichroninc.com → ghs.googlehosted.com

# API Gateway (if using Load Balancer)
A api.staging.verichroninc.com → LOAD_BALANCER_IP

# SendGrid Domain Auth (from SendGrid console)
CNAME em####.staging.verichroninc.com → u####.wl###.sendgrid.net
CNAME s1._domainkey.staging.verichroninc.com → s1.domainkey.u####.wl###.sendgrid.net
CNAME s2._domainkey.staging.verichroninc.com → s2.domainkey.u####.wl###.sendgrid.net
```

**Action Required**:
- [ ] Access domain registrar/DNS provider
- [ ] Add all CNAME records
- [ ] Wait 24-48 hours for propagation
- [ ] Verify with `dig` or `nslookup`

---

### 🆕 Monitoring & Observability

**Not present in .env.test**, needed for staging:

```bash
ENABLE_CLOUD_LOGGING=true
ENABLE_CLOUD_TRACE=true
ENABLE_CLOUD_MONITORING=true
ENABLE_ERROR_REPORTING=true
TRACE_SAMPLING_RATE=0.1
LOG_FORMAT=json
```

**Action Required**:
- [ ] Enable Cloud Logging API
- [ ] Enable Cloud Trace API
- [ ] Enable Cloud Monitoring API
- [ ] Enable Error Reporting API
- [ ] Set up log-based metrics
- [ ] Create uptime checks for all services
- [ ] Set up alert policies (e.g., 5xx errors > 10/min)

---

## Phase 5: Testing Checklist

### Email Dispatching Test

- [ ] Send test invitation email via `api-communications`
- [ ] Verify email arrives from `noreply@staging.verichroninc.com`
- [ ] Verify SPF/DKIM pass (check email headers)
- [ ] Click activation link → should redirect to `auth.staging.verichroninc.com/activate`
- [ ] Test password reset email
- [ ] Test consumer payment receipt email

**Success Criteria**: All emails delivered, no spam folder, links work correctly

---

### Portfolio Import with Vertex AI

- [ ] Upload CSV portfolio to `ui-managers` → Import feature
- [ ] Verify Vertex AI entity resolution triggered (check logs)
- [ ] Verify creditor duplicates detected (70-89% confidence → manual review queue)
- [ ] Verify auto-resolved matches (90%+ confidence → merged automatically)
- [ ] Check Vertex AI API usage in GCP Console (confirm billing works)

**Success Criteria**: Portfolio imported successfully, entity resolution working, no 500 errors

---

### UI-Managers Manual Testing

Test all features in staging:

- [ ] Staff Directory: Invite, view, edit, delete
- [ ] Teams (Roster): Create, edit, delete, assign collectors
- [ ] Portfolio Management: Create, authorize teams, remove
- [ ] Team Detail: View performance, staffing capacity, collections
- [ ] Resource Optimizer: Drag-drop portfolios, see capacity updates
- [ ] Strategy (Workflows): Create 3-step dunning workflow, test execution

**Success Criteria**: All features work as intended, no console errors, dark mode works

---

### UI-Collectors Soft Phone Testing

- [ ] Login as collector user
- [ ] Open soft phone interface
- [ ] Place outbound test call to real phone number
- [ ] Verify call connects via Twilio
- [ ] Verify call audio quality (both ways)
- [ ] Hang up call → verify call log recorded
- [ ] Place inbound call to Twilio number → verify rings in UI
- [ ] Test call transfer (if implemented)
- [ ] Test call hold/resume (if implemented)

**Success Criteria**: Soft phone fully functional, calls clear, logs recorded to MongoDB

---

### UI-Managers vs UI-Collectors Consistency

- [ ] Login to both apps with same user
- [ ] Compare sidebar navigation (should be consistent)
- [ ] Compare theme/branding (logo, colors, fonts)
- [ ] Compare authentication flow (JWT claims, redirects)
- [ ] Compare API error handling (toast notifications)
- [ ] Compare performance metrics display (if both show)

**Success Criteria**: Consistent user experience across both apps, no design drift

---

## Phase 6: Deployment Script

Here's a complete deployment script to automate the staging setup:

```bash
#!/bin/bash
# deploy-staging.sh - Automated Staging Deployment for Verichron Recover

set -e  # Exit on error

PROJECT_ID="verichron-staging-123456"  # UPDATE THIS
REGION="us-central1"

echo "=========================================="
echo "Verichron Recover - Staging Deployment"
echo "=========================================="

# 1. Set GCP Project
gcloud config set project $PROJECT_ID

# 2. Enable APIs
echo "Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  pubsub.googleapis.com \
  aiplatform.googleapis.com \
  documentai.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com

# 3. Create Cloud SQL Instance
echo "Creating Cloud SQL PostgreSQL instance..."
gcloud sql instances create verichron-stage-postgres \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --backup-start-time=03:00 \
  --availability-type=zonal \
  --enable-bin-log=false

# 4. Create Database
echo "Creating database..."
gcloud sql databases create verichron_stage_db \
  --instance=verichron-stage-postgres

# 5. Create Redis Instance
echo "Creating Memorystore for Redis..."
gcloud redis instances create verichron-stage-redis \
  --size=1 \
  --region=$REGION \
  --redis-version=redis_7_0 \
  --tier=standard

# 6. Get Redis IP
REDIS_HOST=$(gcloud redis instances describe verichron-stage-redis \
  --region=$REGION \
  --format="get(host)")
echo "Redis Host: $REDIS_HOST"

# 7. Create Secrets
echo "Creating secrets..."
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH=$(openssl rand -base64 64)
AUTH_CONTEXT=$(openssl rand -base64 64)

echo "$JWT_SECRET" | gcloud secrets create jwt-secret-staging --data-file=-
echo "$JWT_REFRESH" | gcloud secrets create jwt-refresh-secret-staging --data-file=-
echo "$AUTH_CONTEXT" | gcloud secrets create auth-context-secret-staging --data-file=-

# 8. Create Service Keys
for service in users organizations debts debtors transactions communications collectors voice workflows automations; do
  SERVICE_KEY=$(openssl rand -base64 32)
  echo "$SERVICE_KEY" | gcloud secrets create service-key-${service}-staging --data-file=-
done

# 9. Deploy Cloud Run Services (Placeholder - needs actual deployment logic)
echo "Deploying Cloud Run services..."
echo "TODO: Implement Cloud Run deployment with Docker images"

# 10. Set up DNS Records
echo "=========================================="
echo "Manual Steps Required:"
echo "=========================================="
echo "1. Add DNS records for *.staging.verichroninc.com"
echo "2. Configure SendGrid domain authentication"
echo "3. Update .env.stage with actual values:"
echo "   - GCP_PROJECT_ID=$PROJECT_ID"
echo "   - REDIS_HOST=$REDIS_HOST"
echo "   - DATABASE_URL (get from Cloud SQL)"
echo "   - MONGODB_URI (from Atlas)"
echo "   - SENDGRID_API_KEY"
echo "   - TWILIO credentials"
echo "4. Deploy frontend apps to Firebase Hosting"
echo "5. Test all endpoints"
echo "=========================================="
```

---

## Estimated Costs (Staging)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| **Cloud Run** (10 services) | Min=0, Max=10, 512MB RAM | $0-20 |
| **Cloud SQL PostgreSQL** | db-f1-micro (shared CPU, 0.6GB) | $7 |
| **Memorystore Redis** | 1GB Standard Tier | $50 |
| **MongoDB Atlas** | M2 Shared (2GB) | $9 |
| **Pub/Sub** | 10k messages/day | $0-5 |
| **Cloud Storage** | 10GB for imports | $0.20 |
| **Vertex AI** | 1000 API calls/month | $0.50 |
| **SendGrid** | Essentials (50k emails/month) | $20 |
| **Twilio Voice** | 100 minutes/month | $5 |
| **Load Balancer** (optional) | Forwarding rules + bandwidth | $18 |
| **DNS Hosting** | Cloudflare (free) | $0 |
| **SSL Certificates** | Let's Encrypt (free) | $0 |
| **Total** | | **$110-135/month** |

---

## Timeline (1 Week)

### Day 1-2: Infrastructure Setup
- [ ] Create GCP project
- [ ] Provision Cloud SQL, Redis, MongoDB Atlas
- [ ] Generate secrets, store in Secret Manager
- [ ] Set up DNS records

### Day 3-4: Service Deployment
- [ ] Build Docker images for all 10 services
- [ ] Deploy to Cloud Run with min-instances=0
- [ ] Configure environment variables
- [ ] Set up Pub/Sub topics/subscriptions
- [ ] Run database migrations

### Day 5-6: Frontend Deployment
- [ ] Deploy ui-auth to Firebase Hosting (auth.staging)
- [ ] Deploy ui-managers (app.staging)
- [ ] Deploy ui-ops (ops.staging)
- [ ] Deploy ui-collectors (collect.staging)
- [ ] Configure OAuth/JWT flows

### Day 7: Testing & Validation
- [ ] Test email dispatching
- [ ] Test portfolio import with Vertex AI
- [ ] Manual testing of ui-managers (all features)
- [ ] Soft phone testing in ui-collectors
- [ ] Load testing (100 concurrent users)
- [ ] Security testing (OWASP Top 10)

---

## Critical Gaps Summary

| Gap | Priority | Effort | Blocker? |
|-----|----------|--------|----------|
| GCP Project Setup | 🔴 Critical | 1 hour | YES |
| Cloud SQL Database | 🔴 Critical | 2 hours | YES |
| Memorystore Redis | 🔴 Critical | 1 hour | YES |
| MongoDB Atlas | 🔴 Critical | 1 hour | YES |
| JWT Secret Generation | 🔴 Critical | 15 min | YES |
| Service Key Generation | 🔴 Critical | 30 min | YES |
| SendGrid Domain Auth | 🔴 Critical | 1 day (DNS propagation) | YES (for email) |
| Twilio Voice Setup | 🟡 High | 2 hours | YES (for soft phone) |
| DNS Records | 🟡 High | 1 day (propagation) | YES |
| Cloud Run Deployment | 🟡 High | 4 hours | YES |
| API Gateway Setup | 🟢 Medium | 2 hours | NO (can use direct URLs) |
| Monitoring Setup | 🟢 Medium | 1 hour | NO |

**Total Estimated Effort**: 16-20 hours (2-3 dev days)

---

## Next Steps

1. **Review this document** with the team
2. **Create GCP project** for staging: `verichron-staging-123456`
3. **Provision infrastructure** (Cloud SQL, Redis, MongoDB)
4. **Generate secrets** and store in Secret Manager
5. **Update `.env.stage`** with actual values
6. **Deploy backend services** to Cloud Run
7. **Deploy frontend apps** to Firebase Hosting
8. **Test thoroughly** (email, Vertex AI, soft phone)
9. **Document issues** and iterate

**Status**: ✅ Ready to begin implementation

---

## Appendix A: Quick Reference Commands

### Generate Secrets
```bash
openssl rand -base64 64  # JWT secrets
openssl rand -base64 32  # Service keys
openssl rand -hex 32     # Encryption keys
```

### Get Cloud SQL Connection String
```bash
gcloud sql instances describe verichron-stage-postgres \
  --format="value(connectionName)"
```

### Get Redis IP
```bash
gcloud redis instances describe verichron-stage-redis \
  --region=us-central1 \
  --format="get(host)"
```

### Test Database Connection
```bash
psql "postgresql://verichron_stage:PASSWORD@/verichron_stage_db?host=/cloudsql/PROJECT_ID:us-central1:verichron-stage-postgres"
```

### Test Redis Connection
```bash
redis-cli -h REDIS_IP -p 6379 ping
```

### Test MongoDB Connection
```bash
mongosh "mongodb+srv://verichron_stage:PASSWORD@verichron-stage.CLUSTER.mongodb.net/verichron_stage"
```

---

**Document Complete** - Ready for staging deployment
