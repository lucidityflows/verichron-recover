# WebSocket Implementation Strategy

## Overview
This document outlines the strategic roadmap for transitioning the Debt Lucidity Solutions (Verichron) platform from a static, polling-based architecture to a high-performance, event-driven real-time system. 

Following our "Do it Right" philosophy, this implementation focuses on building a robust, scalable infrastructure that treats real-time data as a first-class citizen, ensuring that future features like Manager-to-Collector (M2C) chat integrate seamlessly without requiring architectural re-engineering.

---

## Why This Approach?

### 1. From Passive to Active Management
Current dashboard implementations rely on 30-second polling. In a high-volume collection environment, 30 seconds is the difference between preventing an FDCPA violation and incurring a $10,000 fine. WebSockets enable **active intervention**.

### 2. Infrastructure Resilience
By using a **Redis-backed distributed gateway**, we ensure that the system scales horizontally. If the platform grows from 50 to 5,000 concurrent users, the real-time event bridge remains stable and synchronized across all server instances.

### 3. Efficiency & Cost
Polling generates thousands of unnecessary HTTP requests that strain the database. A persistent WebSocket connection reduces API noise by **~90%**, pushing data only when a delta occurs.

---

## System Benefits

*   **Sub-100ms Latency**: Events move from backend services to the browser almost instantly.
*   **Multi-Tenant Isolation**: Rooms are cryptographically tied to Organization IDs, ensuring zero data leakage between clients.
*   **Type-Safe Events**: Shared contracts between the API and UI ensure that real-time payloads are always validated and predictable.
*   **Foundation for M2C Chat**: The "pipes" are built to be bidirectional. When the UI is ready, messaging is simply a new event type, not a new system.

---

## Implementation Roadmap

### Phase 1: Foundations & Contracts
Establish the shared language and infrastructure requirements.
- [ ] Extend `@verichron/events` to include `WebSocketEvent` types and payloads.
- [ ] Define standardized Room naming conventions (e.g., `org:{id}`, `user:{id}`).
- [ ] Ensure Redis instances are accessible to the `api-organizations` gateway.

### Phase 2: The Real-time Gateway (Backend)
Build the "Event Bridge" in `api-organizations`.
- [ ] Implement `RealtimeModule` using `@nestjs/websockets` and `Socket.io`.
- [ ] Configure `@socket.io/redis-adapter` for multi-instance synchronization.
- [ ] Implement JWT-based handshake authentication (reuse existing Auth guards).
- [ ] Build the **Pub/Sub to WebSocket Bridge**: A service that listens to internal GCP Pub/Sub events and broadcasts them to the appropriate Socket rooms.

### Phase 3: Frontend Transport (UI)
Integrate the real-time stream into the `ui-organizations` microfrontend.
- [ ] Create `RealtimeProvider` and `useRealtime` hook.
- [ ] Implement connection resilience logic (automatic exponential backoff reconnection).
- [ ] Wire `RealtimeProvider` into TanStack Query's `queryClient` to enable automatic cache invalidation on events.

### Phase 4: Feature Activation
Migrate existing high-value views to real-time.
- [ ] **Manager Dashboard**: Replace polling in `TeamOverviewPage` with live updates.
- [ ] **Collector Workstation**: Implement live "Compliance Alerts" pushed from the server.
- [ ] **M2C Chat (Future)**: Activate bidirectional messaging using the established infrastructure.

---

## Progress Checklist

### @verichron/events
- [ ] Define `RealtimeEventType` enum.
- [ ] Define `WebSocketPayload` interfaces.

### api-organizations
- [ ] Initialize `RealtimeGateway`.
- [ ] Implement Redis Adapter configuration.
- [ ] Implement `RoomManagerService` (join/leave logic).
- [ ] Map `COLLECTOR_STATUS_CHANGED` event to WS broadcast.
- [ ] Map `PAYMENT_LOGGED` event to WS broadcast.

### ui-organizations
- [ ] Install `socket.io-client`.
- [ ] Implement `RealtimeProvider`.
- [ ] Add "Live Connection" status indicator to the Sidebar/Header.
- [ ] Update `useTeamOverview` query to listen for real-time invalidations.

---

## Technical Debt & Constraints
*   **Sticky Sessions**: Ensure Load Balancers (GCP) are configured to support WebSocket upgrades or use the Redis adapter effectively.
*   **Token Expiry**: Sockets must handle re-authentication if the JWT expires during a long-running session.
