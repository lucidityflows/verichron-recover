# Event Subscriber Package (`@verichron/event-subscriber`)

## 1. Overview

The `@verichron/event-subscriber` package provides a standardized, robust, and declarative way for microservices to consume events from the GCP Pub/Sub event bus. It is the counterpart to the `@verichron/event-publisher` package.

Refined for the **Verichron Gold Standard**, it enforces mandatory inbound validation and provides a zero-boilerplate execution flow.

---

## 2. Core Features

- **Abstract Base Listener**: Provides a standardized execution flow including automatic logging, transformation, and validation.
- **Mandatory Inbound Validation**: Every listener must define a `dtoClass`. Incoming data is automatically validated using `class-validator` before the handler is invoked.
- **Zero-Boilerplate Subscriptions**:
    - **Auto-Subscription Naming**: Generates unique subscription names automatically (e.g., `api-users.organizations-v1.handleOrgCreated.sub`).
    - **Declarative Decorator**: Uses `@EventSubscriber()` to register handlers with minimal configuration.
- **Standardized Error Handling**: Automatically `nack`s messages on failure to trigger Pub/Sub retries and logs errors consistently.
- **Event Filtering**: Built-in support for filtering a topic by specific `eventType`s directly in the decorator.

---

## 3. Installation and Setup

1.  **Add the package** to your microservice:

    ```bash
    pnpm add @verichron/event-subscriber
    ```

2.  **Import the Module**: Initialize with your service's identity in the root `AppModule`.

    ```typescript
    // src/app.module.ts
    import { Module } from '@nestjs/common';
    import { EventSubscriberModule } from '@verichron/event-subscriber';

    @Module({
      imports: [
        EventSubscriberModule.forRoot({
          projectId: process.env.GCP_PROJECT_ID,
          serviceName: 'api-users', // Used for auto-generated subscription names
          emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
        }),
      ],
    })
    export class AppModule {}
    ```

---

## 4. Usage

### The Standard Pattern (Recommended)

Extend `AbstractBaseListener` to inherit the standardized execution flow.

```typescript
import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES, EventEnvelope } from '@verichron/events';
import { OrganizationCreatedDto } from '../events/event-dto';

@Injectable()
export class OrganizationCreatedListener extends AbstractBaseListener<OrganizationCreatedDto> {
  @EventSubscription({ 
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_CREATED,
    dto: OrganizationCreatedDto // Mandatory: DTO for validation & transformation
  })
  async handleCreated(data: OrganizationCreatedDto, envelope: EventEnvelope<OrganizationCreatedDto>) {
    // Standard flow (logged, validated, and try/catched)
    this.logger.log(`Processing org: ${data.organizationId}`);
    await this.someService.doWork(data);
  }
}
```

### Decorator Options

| Option | Type | Description |
| :--- | :--- | :--- |
| `topicName` | `EventTopic` | The GCP topic to listen to (Required). |
| `dto` | `Class` | The DTO class used for validation and transformation (Required). |
| `subscriptionName` | `string` | Optional. If omitted, one is generated: `[service].[topic].[method].sub`. |
| `eventType` | `EventType \| EventType[]` | Optional. Filters incoming messages by type. |

---

## 5. Standardized Execution Flow

When a message is received, the listener performs:
1.  **Receiving Log**: Logs the `eventType`, `eventId`, and `correlationId`.
2.  **Transformation**: Converts the raw JSON into an instance of `dtoClass`.
3.  **Validation**: Validates the instance using `class-validator`. If validation fails, the message is dropped (Acked) and the error is logged.
4.  **Handler Execution**: Invokes your `handleX` method.
5.  **Success Log**: Logs successful completion and execution time.
6.  **Error Handling**: If the handler throws, the error is logged and the message is `nack`ed for retry.

---

## 6. Handling Scoped Dependencies

The `SubscriberDiscoveryService` requires all Listeners to be **Singletons**. However, your business logic (like an Import Processor) might be **Request-Scoped** (e.g., for transactional isolation per event).

NestJS cannot inject a Request-Scoped service into a Singleton constructor. To solve this, use **Dynamic Resolution** via `ModuleRef`:

```typescript
import { Injectable } from '@nestjs/common';
import { ModuleRef, ContextIdFactory } from '@nestjs/core'; // Import from core
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { MyScopedService } from './my-scoped.service';

@Injectable()
export class MyListener extends AbstractBaseListener<MyDto> {
  // 1. Inject ModuleRef instead of the scoped service
  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  @EventSubscription({ ... })
  async handleEvent(data: MyDto) {
    // 2. Create a unique context ID for this execution
    const contextId = ContextIdFactory.create();
    
    // 3. Dynamically resolve the scoped service for this specific context
    // { strict: false } is often needed if resolving from a different module
    const scopedService = await this.moduleRef.resolve(MyScopedService, contextId, { strict: false });

    // 4. Use the service (it has its own isolated scope/transaction)
    await scopedService.doWork(data);
  }
}
```

This pattern allows the Listener to remain a stable Singleton while ensuring each event is processed in a fresh, isolated scope.