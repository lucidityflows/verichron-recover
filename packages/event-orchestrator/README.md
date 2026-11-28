# Event Orchestrator Package (`@verichron/event-orchestrator`)

## 1. Overview

The `@verichron/event-orchestrator` package provides a standardized, robust, and declarative way for microservices to perform request-response style communication over the GCP Pub/Sub event bus. It is a companion to the `@verichron/event-publisher` and `@verichron/event-subscriber` packages.

Its primary goal is to allow services to query each other for data in a real-time, synchronous-style manner, without resorting to direct HTTP calls.

---

## 2. Core Features

- **Standardized Request-Response Client**: An injectable `EventOrchestratorClient` that enforces type-safe payloads and fail-fast validation.
- **Base Orchestrator Abstraction**: A powerful `BaseOrchestrator` abstract class that automates the orchestration lifecycle:
    - **Inbound Validation**: Automatically validates incoming request events.
    - **Standardized Execution**: Wraps handlers in a consistent try/catch/reply flow.
    - **Auto-Reply**: Automatically validates and publishes responses to the `replyTo` topic.
    - **Centralized HMAC Security**: Provides a `fetchInternal()` helper for secure, authenticated microservice calls.
- **Automatic Correlation**: Handles correlation IDs and temporary response subscriptions.

---

## 3. Usage

### A. The Requester

The service that needs data uses the `EventOrchestratorClient`.

```typescript
import { Injectable } from '@nestjs/common';
import { EventOrchestratorClient, DashboardRequestedDto } from '@verichron/event-orchestrator';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';

@Injectable()
export class AnalyticsService {
  constructor(private readonly orchestrator: EventOrchestratorClient) {}

  async getDashboard(orgId: string) {
    // request() now mandates a DTO class for fail-fast validation
    return await this.orchestrator.request<DashboardResponse, DashboardRequestedDto>(
      EVENT_TOPICS.ORGANIZATIONS,
      EVENT_TYPES.ANALYTICS_DASHBOARD_REQUESTED,
      { organizationId: orgId },
      DashboardRequestedDto
    );
  }
}
```

### B. The Responder (The Orchestrator)

Create an orchestrator by extending `BaseOrchestrator`. This handles all the "plumbing" automatically.

```typescript
@Injectable()
export class DashboardOrchestrator extends BaseOrchestrator<
  DashboardRequestedDto,
  DashboardCompletedDto
> {
  protected readonly logger = new Logger(DashboardOrchestrator.name);
  protected readonly requestDtoClass = DashboardRequestedDto;
  protected readonly responseDtoClass = DashboardCompletedDto;
  protected readonly serviceName = 'api-organizations';
  protected readonly serviceKeyEnvVar = 'SERVICE_KEY_ORGANIZATIONS';

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    eventType: EVENT_TYPES.ANALYTICS_DASHBOARD_REQUESTED,
  })
  async handleRequest(envelope: OrchestrationEventEnvelope<DashboardRequestedDto>) {
    // executeOrchestration handles validation, try/catch, and auto-reply
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.ANALYTICS_DASHBOARD_COMPLETED,
      async (payload) => {
        // Business logic: Use fetchInternal for secure microservice calls
        const data = await this.fetchInternal(
          this.config.serviceEndpoints['api-debts'],
          `/internal/debts/summary/${payload.organizationId}`
        );
        
        return { summary: data }; // Just return the data, base class sends the reply
      }
    );
  }
}
```

---

## 4. Why Use BaseOrchestrator?

1. **Safety**: Mandatory validation on every request and response ensures no malformed data enters or leaves the microservice.
2. **Resilience**: Standardized error handling ensures that even if a handler crashes, a failure response is sent back to the requester (preventing timeouts).
3. **Security**: Centralized HMAC signing means internal API calls are always correctly signed and authenticated without copy-pasting crypto logic.
4. **Productivity**: Reduces boilerplate by over 50% compared to manual implementations.