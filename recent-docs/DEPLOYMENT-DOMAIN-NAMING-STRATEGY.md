# Verichron Recover - Domain & Subdomain Naming Strategy

**Document Version**: 1.0
**Last Updated**: 2025-01-10
**Status**: Approved for MVP Deployment

---

## Overview

This document defines the domain and subdomain architecture for Verichron Recover, a multi-tenant debt collection SaaS platform. The strategy supports 5 microfrontends and 10 bounded-context microservices while maintaining security, scalability, and user experience best practices.

---

## Domain Structure

### Primary Domain
- **Root Domain**: `verichroninc.com`
- **Company**: Verichron Inc
- **Product**: Verichron Recover
- **SSL Certificate**: Wildcard `*.verichroninc.com`

---

## Subdomain Mapping

### Public-Facing Applications

| Subdomain | Application | Purpose | Primary Users |
|-----------|-------------|---------|---------------|
| `verichroninc.com` | ui-marketing | Company landing page, product info, SEO | Prospective customers |
| `www.verichroninc.com` | → Redirects to root | SEO/convention | N/A |

### Authentication Layer

| Subdomain | Application | Purpose | Primary Users |
|-----------|-------------|---------|---------------|
| `auth.verichroninc.com` | ui-auth | Centralized login for all user types | All users |

**Rationale**: Separate auth subdomain is industry standard for security (prevents session fixation attacks, supports OAuth/OIDC flows, enables SSO future expansion).

### Role-Based Application Portals

| Subdomain | Application | Purpose | Primary Users |
|-----------|-------------|---------|---------------|
| `app.verichroninc.com` | ui-managers | Organization management, strategy, roster | Org Admins, Org Managers |
| `ops.verichroninc.com` | ui-ops | Platform administration, tenant management | SaaS Platform Admins |
| `collect.verichroninc.com` | ui-collectors | Dialer, action log, collector workflows | Org Team Leads, Org Collectors |
| `portal.verichroninc.com` | ui-consumers | Consumer self-service, payment portal | Debtors/Consumers |

**Naming Rationale**:
- `app.` = Default for primary users (org managers), simple and professional
- `ops.` = Short for operations, clearly platform-level
- `collect.` = Action-oriented, reflects the product function
- `portal.` = Consumer-friendly, less technical than "consumers"

### Backend API

| Subdomain | Purpose | Backend Services |
|-----------|---------|------------------|
| `api.verichroninc.com` | API Gateway (single entry point) | All 10 microservices |

**Path-based routing** behind the gateway:
```
api.verichroninc.com/users           → api-users (port 3001)
api.verichroninc.com/organizations   → api-organizations (port 3002)
api.verichroninc.com/debts           → api-debts (port 3003)
api.verichroninc.com/debtors         → api-debtors (port 3004)
api.verichroninc.com/transactions    → api-transactions (port 3005)
api.verichroninc.com/communications  → api-communications (port 3006)
api.verichroninc.com/collectors      → api-collectors (port 3007)
api.verichroninc.com/voice           → api-voice (port 3008)
api.verichroninc.com/workflows       → api-workflows (port 3009)
api.verichroninc.com/automations     → api-automations (port 3010)
```

---

## Technical Benefits

### Security
- ✅ Separate `auth.` subdomain prevents session fixation attacks
- ✅ Cookie domain set to `.verichroninc.com` for secure cross-app sessions
- ✅ Single SSL wildcard certificate `*.verichroninc.com`
- ✅ CORS simplified - same parent domain

### Developer Experience
- ✅ Single API endpoint (`api.verichroninc.com`) - no per-service URLs in frontend
- ✅ Clear separation of concerns (1 subdomain = 1 app)
- ✅ Consistent naming convention across environments

### Scalability
- ✅ API Gateway enables load balancing, rate limiting, authentication at edge
- ✅ Easy to add new microfrontends (e.g., `analytics.verichroninc.com`)
- ✅ Supports future multi-tenant white-labeling (`{org-slug}.verichroninc.com`)

### User Experience
- ✅ Memorable, role-specific URLs
- ✅ Clear visual separation between apps (different subdomains = different contexts)
- ✅ Primary users land on simple `app.` URL

---

## User Authentication Flow Examples

### Manager Login
```
1. User navigates to:     app.verichroninc.com
2. Detects no session →   Redirects to: auth.verichroninc.com?redirect=app.verichroninc.com
3. User logs in →         JWT token set with domain=.verichroninc.com
4. Auth redirects back →  app.verichroninc.com/dashboard
5. API calls →            api.verichroninc.com/organizations/...
```

### Collector Login
```
1. User navigates to:     collect.verichroninc.com
2. Detects no session →   Redirects to: auth.verichroninc.com?redirect=collect.verichroninc.com
3. User logs in →         JWT token set with domain=.verichroninc.com
4. Auth redirects back →  collect.verichroninc.com/dialer
5. API calls →            api.verichroninc.com/collectors/...
```

### Consumer Payment Portal
```
1. Debtor receives email → Click link: portal.verichroninc.com/pay/{debtId}/{token}
2. Auto-authenticates →   One-time token validates
3. Lands on →             portal.verichroninc.com/payment
4. API calls →            api.verichroninc.com/debtors/...
```

---

## Environment Variables

### Production

```bash
# ============================================================================
# FRONTEND URLS (Production)
# ============================================================================
VITE_APP_BASE_URL=https://app.verichroninc.com
VITE_AUTH_URL=https://auth.verichroninc.com
VITE_DASHBOARD_OPS_URL=https://ops.verichroninc.com
VITE_DASHBOARD_MANAGERS_URL=https://app.verichroninc.com
VITE_DASHBOARD_COLLECTORS_URL=https://collect.verichroninc.com
VITE_DASHBOARD_CONSUMERS_URL=https://portal.verichroninc.com
VITE_MARKETING_URL=https://verichroninc.com

# Backend API (Single Gateway)
VITE_API_BASE_URL=https://api.verichroninc.com

# Email Template Links
ACTIVATION_BASE_URL=https://auth.verichroninc.com/activate
PASSWORD_RESET_BASE_URL=https://auth.verichroninc.com/reset-password
UNSUBSCRIBE_BASE_URL=https://portal.verichroninc.com/unsubscribe

# JWT Configuration (Must match across all services)
JWT_CLAIMS_NAMESPACE=https://verichroninc.com/claims

# Email Branding
EMAIL_FROM_ADDRESS=noreply@verichroninc.com
EMAIL_FROM_NAME=Verichron Recover
EMAIL_REPLY_TO=support@verichroninc.com
EMAIL_LOGO_URL=https://verichroninc.com/branding/logo-email.png
EMAIL_BRAND_COMPANY_NAME=Verichron Inc
EMAIL_BRAND_PRODUCT_NAME=Verichron Recover
```

### Staging Environment

```bash
# Staging uses subdomain prefix pattern
VITE_APP_BASE_URL=https://app.staging.verichroninc.com
VITE_AUTH_URL=https://auth.staging.verichroninc.com
VITE_DASHBOARD_OPS_URL=https://ops.staging.verichroninc.com
VITE_DASHBOARD_MANAGERS_URL=https://app.staging.verichroninc.com
VITE_DASHBOARD_COLLECTORS_URL=https://collect.staging.verichroninc.com
VITE_DASHBOARD_CONSUMERS_URL=https://portal.staging.verichroninc.com
VITE_MARKETING_URL=https://staging.verichroninc.com

VITE_API_BASE_URL=https://api.staging.verichroninc.com

# Staging email uses separate SendGrid domain
EMAIL_FROM_ADDRESS=noreply@staging.verichroninc.com
```

### Local Development

```bash
# Local uses localhost with port mapping
VITE_AUTH_URL=http://localhost:5173
VITE_DASHBOARD_OPS_URL=http://localhost:5174
VITE_DASHBOARD_MANAGERS_URL=http://localhost:5175
VITE_DASHBOARD_COLLECTORS_URL=http://localhost:5176
VITE_DASHBOARD_CONSUMERS_URL=http://localhost:5177
VITE_MARKETING_URL=http://localhost:5178

# Local API services run on separate ports
VITE_API_USERS_URL=http://localhost:3001
VITE_API_ORGANIZATIONS_URL=http://localhost:3002
VITE_API_DEBTS_URL=http://localhost:3003
# ... etc (no gateway in local dev)
```

---

## DNS Configuration

### Required DNS Records (Production)

```dns
# Root domain and www redirect
A     verichroninc.com                 → [Your hosting IP / Load balancer]
A     www.verichroninc.com             → [Your hosting IP] (or CNAME to root)

# Application subdomains
CNAME auth.verichroninc.com           → [Your hosting / CDN endpoint]
CNAME app.verichroninc.com            → [Your hosting / CDN endpoint]
CNAME ops.verichroninc.com            → [Your hosting / CDN endpoint]
CNAME collect.verichroninc.com        → [Your hosting / CDN endpoint]
CNAME portal.verichroninc.com         → [Your hosting / CDN endpoint]

# API Gateway
CNAME api.verichroninc.com            → [Your API gateway / Load balancer]

# Email Authentication (SendGrid)
CNAME em1234.verichroninc.com         → u1234567.wl123.sendgrid.net
CNAME s1._domainkey.verichroninc.com  → s1.domainkey.u1234567.wl123.sendgrid.net
CNAME s2._domainkey.verichroninc.com  → s2.domainkey.u1234567.wl123.sendgrid.net

# Email SPF/DMARC (if needed)
TXT   verichroninc.com                 → "v=spf1 include:sendgrid.net ~all"
TXT   _dmarc.verichroninc.com          → "v=DMARC1; p=none; rua=mailto:dmarc@verichroninc.com"
```

### Staging Environment DNS

```dns
# Staging subdomain structure
CNAME staging.verichroninc.com               → [Staging hosting]
CNAME auth.staging.verichroninc.com          → [Staging hosting]
CNAME app.staging.verichroninc.com           → [Staging hosting]
CNAME ops.staging.verichroninc.com           → [Staging hosting]
CNAME collect.staging.verichroninc.com       → [Staging hosting]
CNAME portal.staging.verichroninc.com        → [Staging hosting]
CNAME api.staging.verichroninc.com           → [Staging API gateway]

# Staging email (separate SendGrid domain auth)
CNAME em5678.staging.verichroninc.com        → u5678901.wl456.sendgrid.net
CNAME s1._domainkey.staging.verichroninc.com → s1.domainkey.u5678901...
CNAME s2._domainkey.staging.verichroninc.com → s2.domainkey.u5678901...
```

---

## SSL/TLS Certificate Strategy

### Option A: Single Wildcard Certificate (Recommended for MVP)
```
*.verichroninc.com
```
**Covers**: All production subdomains (auth, app, ops, collect, portal, api)

**Pros**:
- ✅ Simple management - one cert for everything
- ✅ Cost-effective (single cert vs multiple)
- ✅ Easy to add new subdomains (no cert updates needed)

**Cons**:
- ⚠️ If compromised, all subdomains affected
- ⚠️ Doesn't cover nested staging subdomains (auth.staging.verichroninc.com)

### Option B: Multi-Wildcard for Staging Support
```
*.verichroninc.com
*.staging.verichroninc.com
```
**Covers**: Production + staging nested subdomains

**Recommended Provider**: Let's Encrypt (free, auto-renewal) or AWS ACM (if hosting on AWS)

---

## Future Expansion Strategies

### Multi-Tenant White-Labeling (Post-MVP)

Allow enterprise customers to have branded subdomains:

```
acme.verichroninc.com          → Acme Corp's branded portal
globex.verichroninc.com        → Globex Inc's branded portal
```

**Implementation**:
- Wildcard routing in API gateway
- Organization settings table: `custom_subdomain` column
- Theme customization per org (logo, colors)

### Regional Deployment (GDPR Compliance)

```
us.verichroninc.com            → US region (data residency)
eu.verichroninc.com            → EU region (GDPR)
```

### Custom Domain Support (Enterprise Tier)

Allow customers to use their own domains:

```
collections.acmecorp.com       → CNAME to acme.verichroninc.com
```

**Requirements**:
- SSL certificate management (Let's Encrypt + DNS challenge)
- Organization-level domain verification

---

## API Gateway Configuration

### Technology Options

1. **NGINX Reverse Proxy** (Simple, cost-effective for MVP)
2. **Google Cloud Load Balancer** (If deploying on GCP)
3. **AWS API Gateway** (If deploying on AWS)
4. **Kong / Tyk** (Advanced API management)

### Sample NGINX Configuration

```nginx
# /etc/nginx/sites-available/api.verichroninc.com

upstream api-users {
    server localhost:3001;
}

upstream api-organizations {
    server localhost:3002;
}

# ... repeat for all services

server {
    listen 443 ssl http2;
    server_name api.verichroninc.com;

    ssl_certificate /etc/letsencrypt/live/verichroninc.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/verichroninc.com/privkey.pem;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Route to microservices
    location /users {
        proxy_pass http://api-users;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /organizations {
        proxy_pass http://api-organizations;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # ... repeat for all bounded contexts
}
```

---

## Migration from Old Domain (debtluciditysolutions.com)

### Phase 1: DNS Setup (Week 1)
- [ ] Register/configure verichroninc.com DNS
- [ ] Set up SendGrid domain authentication
- [ ] Wait for DNS propagation (24-48 hours)

### Phase 2: Code Updates (Week 1)
- [ ] Update JWT_CLAIMS_NAMESPACE in `/packages/contracts`
- [ ] Update email config in `api-communications`
- [ ] Update activation URLs in email templates
- [ ] Update all frontend auth redirects

### Phase 3: Environment Variables (Week 2)
- [ ] Update production .env files
- [ ] Update staging .env files
- [ ] Update CI/CD pipelines

### Phase 4: Testing (Week 2)
- [ ] Test email sending from new domain
- [ ] Test authentication flows
- [ ] Test cross-subdomain cookies
- [ ] Test API gateway routing

### Phase 5: Deployment (Week 3)
- [ ] Deploy updated code to staging
- [ ] End-to-end testing on staging
- [ ] Deploy to production
- [ ] Monitor for issues

### Phase 6: Legacy Support (Ongoing)
- [ ] Keep debtluciditysolutions.com DNS active for 90 days
- [ ] Set up 301 redirects from old domain to new
- [ ] Update all external links (emails, documentation)
- [ ] Notify existing users of domain change

---

## Security Considerations

### Cookie Configuration

```javascript
// Set cookies with secure flags
document.cookie = `access_token=${token}; Domain=.verichroninc.com; Secure; SameSite=Lax; Path=/`;
```

**Key Settings**:
- `Domain=.verichroninc.com` - Shares across all subdomains
- `Secure` - HTTPS only
- `SameSite=Lax` - Protects against CSRF (Strict would break auth redirects)
- `HttpOnly` - For refresh tokens (prevents XSS)

### CORS Configuration

```typescript
// api-*/src/main.ts
app.enableCors({
  origin: [
    'https://auth.verichroninc.com',
    'https://app.verichroninc.com',
    'https://ops.verichroninc.com',
    'https://collect.verichroninc.com',
    'https://portal.verichroninc.com',
    // Staging
    'https://auth.staging.verichroninc.com',
    'https://app.staging.verichroninc.com',
    // ... etc
  ],
  credentials: true,
});
```

### Content Security Policy (CSP)

```http
Content-Security-Policy:
  default-src 'self';
  connect-src 'self' https://api.verichroninc.com;
  img-src 'self' https://verichroninc.com data:;
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
```

---

## Monitoring & Observability

### Domain Health Checks

Monitor each subdomain's availability:

```yaml
# Example: Uptime Robot / Pingdom config
- name: Auth Service
  url: https://auth.verichroninc.com/health
  interval: 60s

- name: App Service
  url: https://app.verichroninc.com/health
  interval: 60s

- name: API Gateway
  url: https://api.verichroninc.com/health
  interval: 30s
```

### DNS Monitoring

- Monitor DNS propagation for changes
- Alert on DNS resolution failures
- Track TTL for critical records

### SSL Certificate Monitoring

- Alert 30 days before expiration
- Auto-renewal via Let's Encrypt
- Monitor certificate chain validity

---

## Cost Estimates

### Domain & DNS
- Domain registration: ~$12/year (verichroninc.com)
- Cloudflare DNS (free tier): $0/month
- **Total**: ~$12/year

### SSL Certificates
- Let's Encrypt: $0/month (free)
- AWS Certificate Manager: $0/month (free if on AWS)
- **Total**: $0/year

### Email Sending (SendGrid)
- Free tier: 100 emails/day
- Essentials: $19.95/month (50k emails/month)
- **Estimated**: $20-50/month

### API Gateway / Load Balancer
- NGINX (self-hosted): $0/month + server cost
- Google Cloud Load Balancer: ~$18/month + bandwidth
- AWS API Gateway: ~$3.50/million requests
- **Estimated**: $0-50/month (depending on choice)

**Total Infrastructure (MVP)**: ~$30-100/month

---

## Appendix A: Naming Alternatives Considered

### Alternative 1: Product-Branded Subdomains
```
verichroninc.com          → Company marketing
app.verichronrecover.com  → Product app (NOT CHOSEN)
```
**Rejected because**: Splits cookies, requires second domain purchase/SSL, more complex

### Alternative 2: Hyphenated Naming
```
debt-collect.verichroninc.com  (NOT CHOSEN)
```
**Rejected because**: Hyphens in URLs are less memorable, harder to type

### Alternative 3: Flat Structure
```
verichroninc.com/managers   (NOT CHOSEN)
verichroninc.com/collectors (NOT CHOSEN)
```
**Rejected because**: Single SPA deployment, harder to separate apps, worse for microfrontend architecture

---

## Appendix B: Related Documents

- `PRODUCT-DESIGN-IMPLEMENTATION-CHECKPOINT-3.md` - Overall product architecture
- `ARCHITECTURE-SPEC.md` - Current implementation plan (Creditor Master, Workflows)
- `.env.example` - Environment variable template
- `/apps/api-communications/README.md` - Email service documentation

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-10 | System Architect | Initial domain strategy approved |

---

**Status**: ✅ Approved for MVP Deployment
**Next Steps**: Update environment variables and begin DNS setup
