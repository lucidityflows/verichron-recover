# `redis` Module

## 1. Overview

The `redis` module is a core infrastructure module within the `api-debts` microservice. Its sole purpose is to provide a globally available, configured client for connecting to the Redis database. It abstracts the connection logic and lifecycle management of the Redis client.

This module is foundational for features that require high-performance caching or specialized data structures, most notably the **CQRS Read Model** implemented in the `debts` module.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Redis Connection:** The lifecycle of the connection to the Redis server.
-   **Redis Service Abstraction:** The `RedisService`, which acts as the injectable client for all other modules to interact with Redis.

### What This Module Does NOT Own

-   **Business Logic:** It contains no business logic. It is purely for infrastructure and connectivity.
-   **Data Structures:** It does not define how data is stored in Redis. The modules that *use* `RedisService` (like the `debts` module's `DebtIndexService`) are responsible for defining the keys, hashes, sorted sets, and other data structures.

---

## 3. Entities & Endpoints

This module does not define any database entities and does not expose any API endpoints.

---

## 4. Key Concepts & Patterns

### Global Infrastructure Module

The `RedisModule` is decorated with `@Global()`. This makes the `RedisService` it exports available for dependency injection in any other module within the `api-debts` service without needing to explicitly import `RedisModule`. This pattern is used for shared, cross-cutting concerns like database connections, loggers, or configuration.

### Extension of `ioredis`

The `RedisService` is not just a wrapper; it directly `extends Redis` from the `ioredis` library. This is a powerful implementation detail because it means any instance of `RedisService` *is* a full `ioredis` client. All standard `ioredis` commands (`get`, `set`, `zadd`, `hset`, etc.) are directly available on the service instance.

```typescript
// Example usage in another service
@Injectable()
export class AnotherService {
  constructor(private readonly redis: RedisService) {}

  async doSomething() {
    // All ioredis commands are available
    await this.redis.set('my-key', 'my-value');
    const value = await this.redis.get('my-key');
  }
}
```

### Configuration-Driven Connection

The service is configured via environment variables. In `redis.service.ts`, the `ConfigService` is used to fetch the `REDIS_URL`. If this environment variable is not set, the service will throw an error on startup, failing fast.

### Graceful Shutdown

The `RedisService` implements the `OnModuleDestroy` lifecycle hook. The `onModuleDestroy` method calls `this.disconnect()`, ensuring that the connection to the Redis server is gracefully closed when the NestJS application shuts down. This prevents lingering connections.

---

## 5. Dependencies & Integrations

### Internal Dependencies

-   **`@nestjs/config`**: Used to read the `REDIS_URL` from environment variables.

### External Integrations

-   **Redis:** Connects to a Redis server specified by the `REDIS_URL`.
-   **`ioredis`:** The underlying Node.js Redis client library that `RedisService` extends.

---

## 6. Gaps & Future Work

-   **Connection Error Handling:** The current implementation relies on `ioredis`'s default connection retry strategy. While robust, a future enhancement could be to add more explicit logging or application-level health checks around the Redis connection state to provide better observability into connection failures or flapping.
