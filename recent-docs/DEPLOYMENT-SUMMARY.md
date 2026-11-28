# GCP Cloud Run Staging Deployment Summary

**Status:** ✅ All 10 API microservices successfully deployed  
**Date:** 2026-01-13  
**Project:** verichron-recover-staging  
**Region:** us-central1  

## Deployed Services

| Service | Status | CPU | Memory | Timeout | URL |
|---------|--------|-----|--------|---------|-----|
| api-users | ✅ Healthy | 1 | 512Mi | 300s | https://api-users-staging-3abh7qpwbq-uc.a.run.app |
| api-organizations | ✅ Healthy | 1 | 512Mi | 300s | https://api-organizations-staging-3abh7qpwbq-uc.a.run.app |
| api-debts | ✅ Healthy | 1 | 512Mi | 300s | https://api-debts-staging-3abh7qpwbq-uc.a.run.app |
| api-debtors | ✅ Healthy | 1 | 512Mi | 300s | https://api-debtors-staging-3abh7qpwbq-uc.a.run.app |
| api-transactions | ✅ Healthy | 1 | 512Mi | 300s | https://api-transactions-staging-3abh7qpwbq-uc.a.run.app |
| api-communications | ✅ Healthy | 2 | 1Gi | 900s | https://api-communications-staging-3abh7qpwbq-uc.a.run.app |
| api-collectors | ✅ Healthy | 1 | 512Mi | 300s | https://api-collectors-staging-3abh7qpwbq-uc.a.run.app |
| api-voice | ✅ Healthy | 1 | 512Mi | 300s | https://api-voice-staging-3abh7qpwbq-uc.a.run.app |
| api-workflows | ✅ Healthy | 1 | 512Mi | 300s | https://api-workflows-staging-3abh7qpwbq-uc.a.run.app |
| api-automations | ✅ Healthy | 1 | 512Mi | 300s | https://api-automations-staging-3abh7qpwbq-uc.a.run.app |

## Infrastructure Components

### Secrets Manager
- ✅ 128 secrets created from .env.stage
- ✅ All services configured with proper secret mappings

### Pub/Sub Topics
- ✅ 12 event topics created:
  - users-v1, organizations-v1, debtors-v1, debts-v1
  - transactions-v1, communications-v1, analytics-v1
  - orchestrations-v1, collectors-v1, voice-v1
  - workflows-v1, automations-v1

### Databases
- ✅ Cloud SQL PostgreSQL (verichron-recover)
  - 9 logical databases (one per service except automations)
- ✅ MongoDB Atlas (verichron-recover-stage.moe3jof.mongodb.net)
  - Used by api-communications for high-volume logs
  - Network access configured for us-central1

### Redis
- ✅ Memorystore Redis (private, VPC-connected)

### IAM Permissions
- ✅ Service Account: 758380557452-compute@developer.gserviceaccount.com
  - roles/cloudsql.client
  - roles/secretmanager.secretAccessor
  - roles/pubsub.publisher
  - roles/pubsub.subscriber
  - roles/pubsub.admin

### Organization Policies
- ✅ iam.allowedPolicyMemberDomains: allowAll (permits public Cloud Run services)

## Special Configurations

### api-communications
- **Resources:** 2 CPU, 1GB RAM, 900s timeout
- **VPC Egress:** all-traffic (required for MongoDB Atlas access)
- **Dependencies:** PostgreSQL + MongoDB + Redis + SendGrid + Twilio
- **Note:** Higher resource requirements due to multiple gateway initializations

### api-voice
- **Environment Variables:** APP_URL=https://api.staging.verichroninc.com
- **Special Secrets:** Twilio Voice credentials, encryption key

## Security Notes

### Current (Staging)
- All services publicly accessible (--allow-unauthenticated)
- JWT authentication enforced at application level
- Multi-tenant isolation via JwtAuthGuard + OrgContextGuard
- RBAC via PermissionsGuard

### Before Production/Alpha
- [ ] Deploy Cloud Load Balancer
- [ ] Configure Cloud Armor WAF rules
- [ ] Set up DDoS protection
- [ ] Configure SSL certificates
- [ ] Restrict direct service access
- [ ] Enable audit logging
- [ ] Configure alerting and monitoring

## Next Steps

1. **Database Migrations**
   - Generate TypeORM migrations for each service
   - Run migrations to create schemas (currently no tables exist)

2. **Data Seeding**
   - Create platform admin user
   - Seed roles and permissions
   - Create test organization

3. **Frontend Deployment**
   - Deploy ui-auth
   - Deploy ui-organizations
   - Deploy ui-managers
   - Deploy ui-collectors

4. **API Gateway** (deferred to pre-production)
   - Set up Cloud Load Balancer
   - Configure Cloud Armor
   - Add rate limiting
   - Configure custom domain

5. **Monitoring & Observability**
   - Set up Cloud Monitoring dashboards
   - Configure log-based metrics
   - Set up alerting policies
   - Configure uptime checks

## Troubleshooting Notes

### Common Issues Resolved

1. **Trailing Spaces in Secrets**
   - DATABASE_URL, GCP_PROJECT_ID, PUBSUB_PROJECT_ID, API_VOICE_ENCRYPTION_KEY
   - **Fix:** Used `echo -n` to create secrets without trailing newlines

2. **Pub/Sub Topics Missing**
   - **Fix:** Added topic creation step to deployment script

3. **MongoDB Atlas Connection**
   - **Issue:** Cloud Run couldn't reach MongoDB Atlas with `vpc-egress=private-ranges-only`
   - **Fix:** Changed api-communications to `vpc-egress=all-traffic`
   - **Fix:** Configured MongoDB Atlas to allow us-central1 IP ranges

4. **api-communications Timeout**
   - **Issue:** Service timed out during startup with default 240s probe
   - **Fix:** Increased to 2 CPU, 1GB RAM, 900s timeout

## Files Modified

- `/.env.stage` - Fixed trailing spaces
- `/deploy-all-staging.sh` - Comprehensive deployment script with Pub/Sub, service-specific configs
- `/allow-public-cloud-run.yaml` - Org policy override

## Scripts Available

- `create-secrets.sh` - Creates all secrets from .env.stage
- `deploy-all-staging.sh` - Full deployment (with optional --skip-build)
- `update-all-apis.sh` - Update existing deployments (deprecated, use deploy-all-staging.sh --skip-build)
