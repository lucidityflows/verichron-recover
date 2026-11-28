# Event Publisher Package (`@verichron/event-publisher`)

## 1. Overview

The `@verichron/event-publisher` package provides a standardized, robust, and type-safe way for microservices to publish domain events to the GCP Pub/Sub event bus. It is the counterpart to the `@verichron/event-subscriber` package.

Refined for the **Verichron Gold Standard**, it enforces mandatory outgoing validation and provides zero-boilerplate defaults for topic and source detection.

---

## 2. Core Features

- **Fail-Fast Validation**: Mandates a DTO class for every event. Validates the payload using `class-validator` *before* it leaves the microservice.
- **Zero-Boilerplate Defaults**:
    - **Automatic Source**: Detects the `eventSource` (e.g., `api-users`) from the module configuration.
    - **Automatic Topic**: Defaults the topic based on the service name (e.g., `api-debts` publishes to `debts-v1` by default).
- **Correlation Support**: Built-in support for `correlationId` to enable distributed tracing.
- **Automatic Topic Creation**: Automatically ensures GCP Pub/Sub topics exist before publishing.
- **Resilient Execution**: Includes built-in retry logic for transient Pub/Sub errors (Unavailable, Deadline Exceeded).

---

## 3. Installation and Setup

1.  **Add the package** to your microservice:

    ```bash
    pnpm add @verichron/event-publisher
    ```

2.  **Import the Module**: Initialize with your service's identity in the root `AppModule`.

    ```typescript
    // src/app.module.ts
    import { Module } from '@nestjs/common';
    import { EventPublisherModule } from '@verichron/event-publisher';

    @Module({
      imports: [
        EventPublisherModule.forRoot({
          projectId: process.env.PUBSUB_PROJECT_ID,
          emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
          serviceName: 'api-organizations', // Crucial for auto-source/topic
        }),
      ],
    })
    export class AppModule {}
    ```

---

## 4. Usage

Inject the `EventPublisher` service and call the `publish` method.

```typescript
import { Injectable } from '@nestjs/common';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { OrganizationCreatedDto } from '../events/event-dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly eventPublisher: EventPublisher) {}

  async provisionOrganization(data: any): Promise<void> {
    const payload = {
      organizationId: '123',
      name: 'Debt Lucidity Solutions Inc.',
    };

    // publish() now requires:
    // 1. EventType constant
    // 2. Data payload
    // 3. DTO Class (for validation)
    await this.eventPublisher.publish(
      EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_CREATED,
      payload,
      OrganizationCreatedDto
    );
  }
}
```

### Advanced Options

You can override the default topic or provide a correlation ID:

```typescript
await this.eventPublisher.publish(
  EVENT_TYPES.CUSTOM_EVENT,
  payload,
  CustomDto,
  {
    topic: 'custom-topic-v1',
    correlationId: 'trace-id-123',
    attributes: { priority: 'high' }
  }
);
```