# `core` Module

## 1. Overview

The `core` module in `api-automations` provides a minimal set of foundational, cross-cutting services for the application. As `api-automations` is a purely event-driven service with no HTTP interface, this module is significantly leaner than its counterparts in other microservices.

Its primary purpose is to provide a request-scoped `RequestContext` service, enabling a consistent way to access contextual information (such as `organizationId` or the initiating user's ID) derived from event payloads throughout a single event-processing lifecycle.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **The `RequestContext` Service:** It owns the `RequestContext` service, which is intended to be used as an injectable, request-scoped container for contextual data.

### What This Module Does NOT Own

-   **HTTP-Related Infrastructure:** This module does not contain any HTTP-specific components like Guards, Filters, Interceptors, or Pipes, as the service does not expose a web server.
-   **Business Logic:** It is entirely separate from the business logic of executing automations.

---

## 3. Key Components & Patterns

### `RequestContext` Service
The sole component in this module is the `RequestContext` service.
-   **Purpose:** To provide a clean, injectable, and isolated context for each incoming event being processed. In an event-driven service, a "request" corresponds to the processing of a single event from the message bus.
-   **Usage:** The event listeners (located in the `events` module) are responsible for populating the `RequestContext` by extracting relevant data from the event envelope (e.g., `organizationId`). Downstream business logic services (like `AutoAssignmentService`) can then inject `RequestContext` to access this information without needing the entire event payload passed down through multiple method calls.

### Architectural Note: An Event-Only Core
The minimal nature of this module is a direct reflection of the `api-automations` service's architecture. Because it has no API controllers or endpoints, it has no need for the extensive set of HTTP-related guards, filters, and interceptors found in the `core` modules of other API services. Its focus is narrowed to providing a mechanism for context management within an event-processing flow.

---

## 4. Dependencies & Integrations

This module is self-contained and has no external dependencies beyond the core NestJS libraries. It provides the `RequestContext` service to all other modules within the `api-automations` application.

---

## 5. Gaps & Future Work

-   **Context Population:** The provided files define the `RequestContext` service but do not show where it is populated. To make it functional, the event listeners in the `events` module must be updated to call `requestContext.setUser()` with data extracted from the event envelope at the beginning of each handler.
-   **Future API Expansion:** If this service were ever to expose an HTTP API (e.g., for manual triggers or status monitoring), this `core` module would need to be significantly expanded to include the standard security and infrastructure components (Guards, Filters, Interceptors) found in the other microservices.
