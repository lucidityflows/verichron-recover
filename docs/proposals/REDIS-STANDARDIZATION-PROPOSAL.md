# Redis Standardization Proposal

**Date:** January 24, 2026
**Status:** Proposed (Postponed until `ui-managers` stabilization)
**Context:** Monorepo Architecture Refinement

## 1. Executive Summary

This document proposes extracting a shared Redis infrastructure library (`packages/redis`) to standardize how services connect to, configure, and utilize Redis. Currently, `api-analytics`, `api-organizations`, and `api-debts` each implement their own Redis modules with varying configurations and patterns.

While the current implementations are functional and the WebSocket architecture in `api-organizations` is standard and correct, unifying these into a shared package will improve maintainability, enforce consistent connection resiliency (retries, timeouts), and simplify future features (like cross-service event publishing).

## 2. Current State Analysis

We currently have three distinct implementations of Redis connectivity:

### A. `apps/api-organizations` (The Realtime Hub)
*   **Role:** Manages WebSocket connections and real-time notifications.
*   **Implementation:**
    *   `RedisIoAdapter`: Uses `socket.io-redis-adapter` for scaling WebSockets.
    *   `RedisModule`: A basic wrapper around `ioredis` for internal caching.
*   **Architecture:** Acts as the centralized "Notification Bridge." Other services must route messages through here to reach the frontend.

### B. `apps/api-analytics` (The Caching Hub)
*   **Role:** Aggregates and caches heavy analytics queries.
*   **Implementation:**
    *   `CacheService`: A robust service wrapping `ioredis` with standardized hashing, TTLs, and invalidation patterns.
    *   **Configuration:** Uses a different setup logic than `api-organizations`.

### C. `apps/api-debts` (The CQRS Read Model)
*   **Role:** Maintains a fast read-model of debts using Redis.
*   **Implementation:**
    *   `RedisService`: Directly *extends* the `ioredis` class (inheritance).
    *   **Usage:** Heavily used for CQRS patterns (`DebtIndexService`).

## 3. Problem Statement

1.  **Code Duplication:** Connection logic, error handling, and retry strategies are repeated across three services.
2.  **Configuration Drift:** One service might use `REDIS_URL` while another uses `REDIS_HOST`/`REDIS_PORT`. One might retry 3 times, another might retry indefinitely or crash.
3.  **Inconsistent Patterns:** `api-debts` uses inheritance (`extends Redis`), while others use composition (dependency injection of the client). This makes it harder to share utility code or swap implementations.

## 4. Proposed Solution: `packages/redis`

Create a new shared library that provides a unified, configurable `RedisModule`.

### Key Features
*   **Standardized Configuration:** Single source of truth for `REDIS_URL` parsing and validation.
*   **Resilient Connections:** Centralized retry logic (exponential backoff), timeout settings, and keep-alive handling.
*   **Flexible Injection:** Exports a `REDIS_CLIENT` token that can be injected into any service (Analytics, Debts, Orgs).
*   **Type Safety:** Shared types for Redis keys and event payloads.

### Architectural Decision: The "Bridge"
We will **keep the WebSocket Gateway in `api-organizations`**.
*   **Reasoning:** It is the correct place for managing user sessions and organizational context.
*   **Integration:** `api-analytics` will use the new `packages/redis` to publish events (e.g., `dashboard.updated`) which `api-organizations` will subscribe to and forward to the user via WebSockets.

## 5. Benefits

1.  **Stability:** Fixing a connection bug in `packages/redis` fixes it for the entire platform.
2.  **Developer Experience:** Developers don't need to copy-paste Redis boilerplate when creating new services.
3.  **Observability:** Easier to add centralized logging or APM tracing for all Redis operations.
4.  **Simplicity:** Reduces the codebase size of individual microservices.

## 6. Migration Strategy

This refactor can be done incrementally:

1.  **Phase 1: Create Package**
    *   Scaffold `packages/redis` with `RedisModule`, `RedisService`, and configuration logic.

2.  **Phase 2: Analytics Migration**
    *   Replace the local `src/core/redis` in `api-analytics` with the new package.
    *   Refactor `CacheService` to use the injected client.

3.  **Phase 3: Organizations Migration**
    *   Replace local `RedisModule` in `api-organizations`.
    *   Ensure `RedisIoAdapter` works with the shared configuration.

4.  **Phase 4: Debts Migration**
    *   Refactor `api-debts` to inject the client instead of extending it (composition over inheritance).

## 7. Next Steps

**Status:** **Deferred.**
This proposal is approved in principle but is lower priority than the current `ui-managers` stabilization work. We will revisit this when we are ready to tackle technical debt or when we need to implement significant new real-time features in `api-analytics`.
