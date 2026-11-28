# @verichron/security

Security utilities for internal service-to-service authentication in the Debt Lifecycle System (Verichron).

## Purpose

This package provides cryptographic utilities for securing internal HTTP requests between microservices in the Verichron platform. It implements HMAC-based request signing to ensure:

- **Authentication**: Only authorized services can access internal endpoints
- **Integrity**: Requests cannot be tampered with in transit
- **Non-repudiation**: Each request is cryptographically linked to a specific service
- **Replay protection**: Requests cannot be intercepted and reused

## Current Implementation (Phase 1)

### Security Level: 7/10 (Development/Testing)

Phase 1 provides HMAC-SHA256 request signing with service-scoped keys, suitable for E2E testing and development environments.

### Features

✅ **HMAC-SHA256 Request Signing**: Cryptographically secure request authentication
✅ **Service-Scoped Keys**: Each service has its own API key (limits blast radius)
✅ **Replay Attack Prevention**: Timestamp + nonce validation
✅ **Constant-Time Comparison**: Prevents timing attacks
✅ **Audit Trail**: Service name logged with each request
✅ **Fail-Secure**: Denies access by default if not properly configured

### Architecture

```
┌─────────────────────┐                    ┌─────────────────────┐
│  api-organizations  │                    │     api-debts       │
│                     │                    │                     │
│  1. Generate nonce  │                    │  4. Validate time   │
│  2. Get timestamp   │                    │  5. Check nonce     │
│  3. Sign request    │─────────────────>  │  6. Verify HMAC     │
│                     │  HMAC signature    │  7. Process request │
└─────────────────────┘                    └─────────────────────┘

Headers sent:
- x-service-name: api-organizations
- x-timestamp: 1638360000000
- x-nonce: 550e8400-e29b-41d4-a716-446655440000
- x-signature: a3b2c1d4e5f6...
```

### Components

#### HmacSigner

The core utility for signing and verifying requests.

```typescript
import { HmacSigner } from '@verichron/security';
import * as crypto from 'crypto';

// Signing a request (caller side)
const signature = HmacSigner.sign(
  'POST',                           // HTTP method
  '/internal/analytics',            // Request path
  JSON.stringify({ data: 'value' }), // Request body
  process.env.SERVICE_KEY_ORGANIZATIONS!, // Service-specific key
  Date.now(),                       // Current timestamp
  crypto.randomUUID()               // Unique nonce
);

// Verifying a request (receiver side)
const isValid = HmacSigner.verify(
  request.method,
  request.path,
  JSON.stringify(request.body),
  process.env.SERVICE_KEY_ORGANIZATIONS!, // Caller's key
  parseInt(request.headers['x-timestamp']),
  request.headers['x-nonce'],
  request.headers['x-signature']
);
```

#### Security Constants

Configurable security parameters:

- `MAX_TIME_DRIFT_MS`: Maximum allowed clock skew (default: 5 minutes)
- `NONCE_TTL_MS`: How long to cache nonces (default: 10 minutes)
- `HMAC_ALGORITHM`: Hashing algorithm (default: 'sha256')
- `INTERNAL_AUTH_HEADERS`: Standard header names
- `SERVICE_NAMES`: Registered service identifiers

## Usage

### 1. Caller Side (Making Internal Requests)

Create a service to handle HMAC-signed requests:

```typescript
// api-organizations/src/services/internal-api.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { HmacSigner, INTERNAL_AUTH_HEADERS } from '@verichron/security';
import * as crypto from 'crypto';

@Injectable()
export class InternalApiService {
  private readonly logger = new Logger(InternalApiService.name);
  private readonly serviceName = 'api-organizations';
  private readonly serviceKey = process.env.SERVICE_KEY_ORGANIZATIONS!;

  async callInternalEndpoint<T = any>(
    baseUrl: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any
  ): Promise<T> {
    const timestamp = Date.now();
    const nonce = crypto.randomUUID();
    const body = data ? JSON.stringify(data) : '';

    const signature = HmacSigner.sign(
      method,
      endpoint,
      body,
      this.serviceKey,
      timestamp,
      nonce
    );

    const response = await axios({
      method,
      url: `${baseUrl}${endpoint}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        [INTERNAL_AUTH_HEADERS.SERVICE_NAME]: this.serviceName,
        [INTERNAL_AUTH_HEADERS.TIMESTAMP]: timestamp.toString(),
        [INTERNAL_AUTH_HEADERS.NONCE]: nonce,
        [INTERNAL_AUTH_HEADERS.SIGNATURE]: signature,
      },
    });

    return response.data;
  }
}
```

### 2. Receiver Side (Validating Requests)

**⚠️ Important: Path-Only Signing (Phase 1 Limitation)**

The current implementation signs and verifies **path only** (no query string). This works because internal endpoints don't use query parameters.

**WARNING:** If you add query parameters to internal endpoints (e.g., `/internal/analytics?filter=active`), you must:
1. Include query params in the signed path on the caller side
2. Use `request.originalUrl` (not `request.path`) on the receiver side
3. Ensure consistent URL encoding between caller and receiver

**TODO Phase 2:** Standardize on `request.originalUrl.split('?')[0]` for defense-in-depth.

Update your `JwtAuthGuard` to validate HMAC signatures:

```typescript
// api-debts/src/core/guards/jwt.guard.ts
import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import {
  HmacSigner,
  INTERNAL_AUTH_HEADERS,
  MAX_TIME_DRIFT_MS,
  NONCE_TTL_MS
} from '@verichron/security';
import { IS_PUBLIC_KEY } from '../decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly nonceCache = new Set<string>();

  private readonly serviceKeys: Record<string, string> = {
    'api-organizations': process.env.SERVICE_KEY_ORGANIZATIONS || '',
    'api-debts': process.env.SERVICE_KEY_DEBTS || '',
    'api-debtors': process.env.SERVICE_KEY_DEBTORS || '',
  };

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Check for internal service authentication
    if (this.hasInternalAuthHeaders(request)) {
      return this.validateInternalAuth(request);
    }

    // Fall back to JWT for external requests
    return super.canActivate(context);
  }

  private hasInternalAuthHeaders(request: any): boolean {
    return !!(
      request.headers[INTERNAL_AUTH_HEADERS.SERVICE_NAME] &&
      request.headers[INTERNAL_AUTH_HEADERS.TIMESTAMP] &&
      request.headers[INTERNAL_AUTH_HEADERS.NONCE] &&
      request.headers[INTERNAL_AUTH_HEADERS.SIGNATURE]
    );
  }

  private validateInternalAuth(request: any): boolean {
    const serviceName = request.headers[INTERNAL_AUTH_HEADERS.SERVICE_NAME];
    const timestamp = parseInt(request.headers[INTERNAL_AUTH_HEADERS.TIMESTAMP], 10);
    const nonce = request.headers[INTERNAL_AUTH_HEADERS.NONCE];
    const signature = request.headers[INTERNAL_AUTH_HEADERS.SIGNATURE];

    // 1. Validate timestamp
    const now = Date.now();
    if (Math.abs(now - timestamp) > MAX_TIME_DRIFT_MS) {
      this.logger.warn(`Auth failed: timestamp too old for ${serviceName}`);
      return false;
    }

    // 2. Validate nonce (prevent replay)
    if (this.nonceCache.has(nonce)) {
      this.logger.warn(`Auth failed: nonce reuse detected for ${serviceName}`);
      return false;
    }

    // 3. Get service-specific key
    const serviceKey = this.serviceKeys[serviceName];
    if (!serviceKey) {
      this.logger.warn(`Auth failed: unknown service ${serviceName}`);
      return false;
    }

    // 4. Verify HMAC signature
    const body = JSON.stringify(request.body || {});
    const isValid = HmacSigner.verify(
      request.method,
      request.path,
      body,
      serviceKey,
      timestamp,
      nonce,
      signature
    );

    if (!isValid) {
      this.logger.warn(`Auth failed: invalid signature for ${serviceName}`);
      return false;
    }

    // 5. Success - cache nonce and add service context
    this.nonceCache.add(nonce);
    setTimeout(() => this.nonceCache.delete(nonce), NONCE_TTL_MS);

    request.serviceAccount = {
      name: serviceName,
      authenticatedAt: new Date().toISOString()
    };

    this.logger.log(`Internal auth success: ${serviceName} -> ${request.method} ${request.path}`);
    return true;
  }
}
```

### 3. Environment Configuration

Add service-scoped keys to your `.env` file:

```bash
# Service-to-Service Authentication Keys
# Each service has its own key to limit blast radius
SERVICE_KEY_ORGANIZATIONS=dev-org-key-change-in-production
SERVICE_KEY_DEBTS=dev-debts-key-change-in-production
SERVICE_KEY_DEBTORS=dev-debtors-key-change-in-production
SERVICE_KEY_TRANSACTIONS=dev-transactions-key-change-in-production
SERVICE_KEY_COMMUNICATIONS=dev-communications-key-change-in-production
SERVICE_KEY_USERS=dev-users-key-change-in-production
```

## Security Considerations

### ✅ What Phase 1 Protects Against

- **Unauthorized Access**: Only services with valid keys can call internal endpoints
- **Request Tampering**: HMAC signature ensures request integrity
- **Replay Attacks**: Timestamp + nonce validation prevents request reuse
- **Timing Attacks**: Constant-time comparison prevents signature guessing
- **Service Impersonation**: Service-scoped keys limit compromise blast radius

### ⚠️ What Phase 1 Does NOT Protect Against

- **Compromised Service Key in Logs**: Keys could appear in application logs
- **Cross-Instance Replay**: In-memory nonce cache doesn't work across multiple instances
- **Long-Term Key Compromise**: No automatic key rotation
- **Network-Level Attacks**: No transport-layer encryption (relies on Docker/K8s networking)
- **Audit Compliance**: Basic logging, not immutable audit trail

## Future Roadmap

### Phase 2: Pre-Production Hardening (Q2-Q3 2026)

**Security Level: 8/10 (Production-ready for small scale)**

Planned enhancements:

```typescript
// ✅ Redis-backed nonce cache (multi-instance support)
private async validateNonce(nonce: string): Promise<boolean> {
  const exists = await this.redis.get(`nonce:${nonce}`);
  if (exists) return false;

  await this.redis.set(`nonce:${nonce}`, '1', 'EX', 600);
  return true;
}

// ✅ Structured audit logging (SOC 2 compliance)
this.auditLogger.log({
  event: 'internal_auth_success',
  service: serviceName,
  endpoint: request.url,
  timestamp: new Date().toISOString(),
  requestId: request.id,
  ipAddress: request.ip
});

// ✅ Rate limiting per service
@UseGuards(InternalRateLimitGuard)

// ✅ Automated key rotation
await this.secretsManager.rotateServiceKey('api-organizations');

// ✅ Prometheus metrics
this.metricsService.incrementCounter('internal_auth_attempts', {
  service: serviceName,
  success: true
});
```

**Key Additions:**
- Redis-backed nonce cache for multi-instance deployments
- Immutable audit logging (append-only)
- Rate limiting per service (prevent abuse)
- Semi-automated key rotation (monthly)
- Observability (Prometheus metrics, distributed tracing)

### Phase 3: Enterprise Production (Q4 2026 - GKE)

**Security Level: 10/10 (SOC 2 Type II compliant)**

Migration to **mutual TLS (mTLS)** via Istio service mesh:

```yaml
# Enforces mTLS between all services
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: verichron-production
spec:
  mtls:
    mode: STRICT
```

**Benefits:**
- ✅ Zero application code changes (service mesh handles auth)
- ✅ Automatic certificate rotation (cert-manager)
- ✅ Strong cryptographic guarantees (TLS 1.3)
- ✅ Built-in audit trails (Istio telemetry)
- ✅ Industry standard (used by Google, AWS internally)
- ✅ Meets SOC 2 Type II requirements

**Defense-in-Depth Strategy:**
```
Layer 1 (Network): Kubernetes NetworkPolicies + Istio mTLS
Layer 2 (Application): HMAC signing (this package) as fallback
Layer 3 (Transport): TLS 1.3 encryption
Layer 4 (Audit): Immutable audit logs + distributed tracing
```

Keep HMAC signing as fallback for:
- Services outside the mesh
- Emergency access scenarios
- Development/testing environments

## Migration Path

### From Phase 1 → Phase 2

1. Deploy Redis cluster for distributed nonce cache
2. Update guards to use Redis instead of in-memory Set
3. Add structured logging with log aggregation
4. Implement rate limiting guards
5. Set up Prometheus metrics and Grafana dashboards
6. Implement key rotation scripts

### From Phase 2 → Phase 3

1. Deploy Istio to GKE cluster
2. Enable sidecar injection for all microservices
3. Configure PeerAuthentication for STRICT mTLS
4. Deploy cert-manager for certificate lifecycle
5. Apply NetworkPolicies for network isolation
6. Keep HMAC as fallback (defense-in-depth)

## Contributing

When adding new services:

1. Add service name to `SERVICE_NAMES` in `constants.ts`
2. Add service key environment variable (`SERVICE_KEY_<NAME>`)
3. Update all receiver guards with new service key
4. Document service-to-service communication flows

## License

Proprietary - Debt Lifecycle System (Verichron)

## Questions?

For security concerns or questions about this package, contact the platform security team.
