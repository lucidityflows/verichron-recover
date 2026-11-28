# `shared` Module

## 1. Overview

The `shared` module within the `api-voice` microservice serves as a container for common services and utilities that facilitate communication with other microservices in the Verichron platform. It acts as a client layer, abstracting the details of inter-service communication and encapsulating domain-specific business logic for interacting with external services.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Cross-Service Clients:** It owns client implementations (e.g., `CommunicationsService`) for making API calls or other forms of synchronous communication with other microservices.
-   **Abstraction of External Interactions:** It provides an abstraction layer over the direct HTTP or RPC calls to external services, allowing internal modules to interact with them via a clean, internal API.

### What This Module Does NOT Own

-   **External Microservice Logic:** It does not own the business logic or data of the external microservices it communicates with. It is merely a client.
-   **Database Entities or API Endpoints:** This module does not define any database entities or expose any API endpoints of its own.

---

## 3. Entities

This module does not define or manage any database entities.

---

## 4. Endpoints

This module does not expose any API endpoints. It contains client-side service logic for inter-service communication.

---

## 5. Key Concepts & Patterns

### Service-to-Service Communication
This module embodies the pattern of synchronous service-to-service communication within a microservice architecture. Instead of services directly querying other microservices' databases (which violates bounded context principles), they use dedicated client services from this module to make API calls.

### Client for `api-communications`
The `CommunicationsService` is a concrete example of this pattern. It acts as a client for the `api-communications` microservice. Its `isDnc` method is designed to perform a check against the `api-communications` service to determine if a debtor has a "Do Not Call" (DNC) flag set, which is a critical compliance step before initiating a call.

### Abstraction Layer
By centralizing calls to external microservices in this `shared` module, `api-voice` creates an effective abstraction layer. If the underlying communication mechanism for inter-service calls changes (e.g., from REST/HTTP to gRPC), only the services within this `shared` module need to be updated, minimizing impact on the rest of the `api-voice` codebase.

---

## 6. Events

This module facilitates synchronous service-to-service communication and does not directly publish or subscribe to any events on the message bus.

---

## 7. Dependencies & Integrations

### External Microservices
-   **`api-communications`:** The `CommunicationsService` implicitly depends on the `api-communications` microservice, as its `isDnc` method is a placeholder for a real API call to check DNC status.

---

## 8. Gaps & Future Work

-   **Placeholder Implementation:** The `CommunicationsService.isDnc` method currently contains a placeholder implementation that always returns `false` and logs a message. This needs to be replaced with an actual HTTP client call (e.g., using `axios` or NestJS's `HttpService`) to the `api-communications` microservice to fetch the real DNC status.
-   **Robust Error Handling:** The current placeholder does not include robust error handling for network issues, API failures, or timeouts when attempting to communicate with external services. A production-ready implementation would need to address these concerns.
-   **Authentication for Service Calls:** The `CommunicationsService` will need to implement a mechanism for authenticating its calls to `api-communications`, likely using an internal API key or HMAC signature.
