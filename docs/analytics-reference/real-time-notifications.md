# Real-Time Notification & Event System Strategy

## Overview

This document outlines the strategy for implementing a real-time event and notification system that supports both **demo mode** (faker data) and **production mode** (real business events).

## Current State

### Location
- `apps/web/src/hooks/useRealTimeSimulation.ts`

### What Works Well (Keep)
1. **Event Subscription Architecture**
   - Pub/sub pattern with `subscribe()` and `subscribeToMetrics()`
   - Event queue management (50 event limit)
   - React hooks: `useRealTimeEvents()`, `useRealTimeMetrics()`

2. **TypeScript Contracts**
   - `BusinessEvent` interface (already in `@verichron/libs/contracts`)
   - `MetricUpdate` interface
   - Event types: payment, status_change, system_update

3. **UI Integration**
   - Toast notifications (sonner)
   - Priority-based alerting
   - Animation system for metric updates

### What's Mock (Needs Real Implementation)
1. **Event Generation**
   - `generateBusinessEvent()` - creates synthetic events
   - Random timing (15-45 second intervals)
   - Hardcoded event templates with probability distributions

2. **Metric Calculations**
   - `generateMetricUpdates()` - uses random values
   - No connection to actual database state

3. **Data Source**
   - No backend connection
   - No WebSocket or Server-Sent Events

## Proposed Architecture

### Phase 1: Refactor for Demo/Production Modes

#### 1. Move Event Templates to Mock Data Package
**Location**: `@verichron/mock-data/src/event-templates.ts`

```typescript
export const eventTemplates = [
  {
    type: 'payment' as const,
    probability: 0.35,
    templates: [
      {
        title: 'Payment Received',
        description: 'Full payment processed for account #{accountId}',
        priority: 'medium' as const,
        icon: 'dollar-sign',
        color: 'green',
        animationType: 'bounce' as const,
        valueRange: [250, 15000],
        affectedMetrics: ['totalCollected', 'collectionEfficiency', 'cashFlow']
      },
      // ... more templates
    ]
  }
];
```

**Why**: Event templates are mock data configuration, not business logic. They belong with the mock data generation library.

#### 2. Create Abstract Event Provider
**Location**: `apps/web/src/services/events/EventProvider.ts`

```typescript
export interface IEventProvider {
  start(): void;
  stop(): void;
  subscribe(callback: (event: BusinessEvent) => void): () => void;
  subscribeToMetrics(callback: (updates: MetricUpdate[]) => void): () => void;
  getRecentEvents(count?: number): BusinessEvent[];
}
```

#### 3. Implement Demo Provider
**Location**: `apps/web/src/services/events/DemoEventProvider.ts`

Uses event templates from `@verichron/mock-data` to generate mock events.

#### 4. Implement Production Provider (Placeholder)
**Location**: `apps/web/src/services/events/ProductionEventProvider.ts`

Connects to WebSocket/SSE endpoint on NestJS backend.

#### 5. Factory Pattern for Mode Selection
**Location**: `apps/web/src/services/events/index.ts`

```typescript
import { DataMode } from '@verichron/contracts';

export function createEventProvider(mode: DataMode): IEventProvider {
  switch (mode) {
    case DataMode.DEMO:
      return new DemoEventProvider();
    case DataMode.DEVELOPMENT:
    case DataMode.PRODUCTION:
      return new ProductionEventProvider();
  }
}
```

#### 6. Keep Hooks Generic
**Location**: `apps/web/src/hooks/useRealTimeEvents.ts`

The React hooks stay in the web app but work with any `IEventProvider` implementation.

### File Organization

```
@verichron/mock-data/src/
  ├── event-templates.ts          # Event templates for demo mode
  └── data-generator.ts            # Existing faker data

apps/web/src/services/events/
  ├── EventProvider.ts             # Interface
  ├── DemoEventProvider.ts         # Mock implementation
  ├── ProductionEventProvider.ts   # Real implementation (stub for now)
  └── index.ts                     # Factory

apps/web/src/hooks/
  ├── useRealTimeEvents.ts         # Generic React hook
  └── useRealTimeMetrics.ts        # Generic React hook
```

### Benefits of This Approach

1. **Clean Separation**: Demo data config separate from business logic
2. **Easy Toggling**: Switch modes via `DataMode` enum
3. **Reusable Hooks**: Same React hooks work in both modes
4. **Progressive Enhancement**: Ship demo mode now, implement real mode later
5. **Testing**: Can test UI with demo provider, integration tests with real provider

## Phase 2: Production Implementation

### Backend Requirements (NestJS)

#### 1. WebSocket Gateway
**Location**: `apps/api/src/gateways/events.gateway.ts`

```typescript
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/events'
})
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  emitEvent(event: BusinessEvent) {
    this.server.emit('business-event', event);
  }

  emitMetricUpdate(updates: MetricUpdate[]) {
    this.server.emit('metric-update', updates);
  }
}
```

#### 2. Event Detection Hooks
Emit events when real business actions occur:

- **Payment Service**: Emit `payment` event when payment processed
- **Debt Service**: Emit `status_change` when debt status updated
- **Portfolio Service**: Emit `portfolio_update` when portfolio modified
- **System Health**: Emit `system_update` periodically

#### 3. Metric Calculation Service
**Location**: `apps/api/src/services/metrics.service.ts`

Calculate real metrics from database:
- Query actual totals, counts, aggregations
- Compare before/after states for change deltas
- Emit metric updates via WebSocket

### Frontend Integration

#### ProductionEventProvider Implementation

```typescript
export class ProductionEventProvider implements IEventProvider {
  private socket: Socket;
  private subscribers: Array<(event: BusinessEvent) => void> = [];
  private metricSubscribers: Array<(updates: MetricUpdate[]) => void> = [];

  constructor() {
    this.socket = io(`${getBaseURL()}/events`, {
      auth: { token: getAuthToken() }
    });

    this.socket.on('business-event', (event) => {
      this.notifySubscribers(event);
    });

    this.socket.on('metric-update', (updates) => {
      this.notifyMetricSubscribers(updates);
    });
  }

  start() {
    this.socket.connect();
  }

  stop() {
    this.socket.disconnect();
  }

  // ... implement interface methods
}
```

## Real-Time Features for Debt Collection System

### High-Value Use Cases

1. **Payment Processing Alerts**
   - Large payments received (> $10k)
   - Payment plan milestones reached
   - Failed payment attempts

2. **Account Status Changes**
   - Debt moved to legal action
   - Payment plan created/modified
   - Account escalated to manager

3. **Collaboration Awareness**
   - User X is viewing/editing account Y
   - Concurrent edit detection
   - Assignment notifications

4. **Portfolio Metrics**
   - Live collection rate updates
   - Active accounts counter
   - Today's collected amount

5. **Compliance & Risk**
   - FDCPA violation risk detected
   - Account approaching statute of limitations
   - Required callback time approaching

6. **System Events**
   - Bulk import completed
   - Report generation finished
   - Integration sync status

## Implementation Checklist

### Phase 1: Refactor (Demo Mode)
- [ ] Extract event templates to `@verichron/mock-data/src/event-templates.ts`
- [ ] Create `IEventProvider` interface
- [ ] Implement `DemoEventProvider` using templates
- [ ] Create stub `ProductionEventProvider`
- [ ] Create factory function with `DataMode` toggle
- [ ] Refactor hooks to use provider pattern
- [ ] Test demo mode functionality
- [ ] Update UI to use new structure

### Phase 2: Production Backend
- [ ] Install `@nestjs/websockets` and `socket.io`
- [ ] Create `EventsGateway` in API
- [ ] Add event emission to Payment Service
- [ ] Add event emission to Debt Service
- [ ] Add event emission to Portfolio Service
- [ ] Create Metrics Service for real calculations
- [ ] Add authentication to WebSocket gateway
- [ ] Add rate limiting to prevent event spam

### Phase 3: Production Frontend
- [ ] Implement `ProductionEventProvider` with Socket.IO client
- [ ] Add connection status indicator
- [ ] Add reconnection logic
- [ ] Add error handling for connection failures
- [ ] Test with real backend
- [ ] Add E2E tests for real-time features

## Security Considerations

1. **Authentication**: WebSocket must verify JWT token
2. **Authorization**: Users only receive events for their company/portfolios
3. **Rate Limiting**: Prevent event flooding
4. **Data Privacy**: Redact sensitive info in events (SSN, account numbers)
5. **Company Isolation**: Multi-tenant event filtering

## Performance Considerations

1. **Event Throttling**: Batch rapid events (e.g., 100 payments in 1 second)
2. **Selective Subscriptions**: Users subscribe to specific event types or entities
3. **Redis Pub/Sub**: Scale WebSocket across multiple API instances
4. **Event TTL**: Expire old events, don't store forever
5. **Metric Aggregation**: Pre-calculate heavy metrics, don't query on every event

## Configuration

### Environment Variables
```bash
# Demo Mode
DATA_MODE=demo

# Production Mode
DATA_MODE=production
WEBSOCKET_URL=wss://api.example.com/events
```

### Feature Flags
- `ENABLE_REAL_TIME_EVENTS`: Master switch
- `ENABLE_PAYMENT_EVENTS`: Toggle payment notifications
- `ENABLE_METRIC_UPDATES`: Toggle live metric updates
- `ENABLE_COLLABORATION_EVENTS`: Toggle user presence

## Rollout Strategy

1. **Week 1-2**: Refactor demo mode (Phase 1)
2. **Week 3-4**: Build backend infrastructure (Phase 2)
3. **Week 5**: Implement ProductionEventProvider
4. **Week 6**: Internal testing with real data
5. **Week 7**: Beta rollout to select users
6. **Week 8**: Full production release with feature flag

## Success Metrics

- **User Engagement**: Time spent on dashboard with real-time updates
- **Action Speed**: Time from payment received to user viewing event
- **Collaboration**: Reduction in concurrent edit conflicts
- **Performance**: Event latency < 500ms, connection uptime > 99.5%

## Conclusion

This strategy allows us to:
1. **Ship demo mode immediately** - Refactor existing code, move templates to faker data
2. **Design for production** - Abstract interface supports both implementations
3. **Progressive rollout** - Enable real-time features incrementally
4. **Maintain quality** - Test both modes independently

The key insight: **The event consumption layer (hooks, UI) doesn't need to change.** We just swap the provider based on `DataMode`.
