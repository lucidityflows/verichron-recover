# EVENTS MODULE - Verichron Infrastructure Bridge Pattern

## 1. Overview

The `events` module is the architectural core of the `api-organizations` microservice's event-driven capabilities. It provides the infrastructure for publishing, subscribing, and orchestrating events via GCP Pub/Sub.

---

## 2. Design Pattern: The Infrastructure Bridge

To ensure scalability and maintain clean dependency injection (DI), this microservice follows the **Infrastructure Bridge** pattern.

### **Rule 1: Contracts are Centralized**
All **Event DTOs** and **Type Mappings** are stored within the `events/` module. 
- **Location**: `src/events/event-dto/`
- **Reason**: This folder serves as the "Internal API Contract" for the microservice. Any developer can look here to see every message the service sends or receives.

### **Rule 2: Listeners are Decentralized**
**Listener classes** (the logic that reacts to events) are owned and registered by the **Feature Modules** they serve.
- **Example**: `DebtorProfileCreatedListener` is registered in `AnalyticsModule`, not `EventsModule`.
- **Reason**: Listeners usually depend on feature-specific services and repositories. Moving them to the feature module allows dependencies to be resolved naturally without creating circular dependencies or "God Modules."

### **Rule 3: One-Way Dependency Flow**
- **Feature Modules** -> `EventsModule` (**Allowed**)
- **EventsModule** -> **Feature Modules** (**STRICTLY FORBIDDEN**)

This ensures that the `EventsModule` remains lightweight and the system remains easy to test and extend.

---

## 3. Layered Event Validation

Our event system uses three distinct layers for type safety and validation:

### **Layer 1: Payload Interfaces (@verichron/events)**
Pure TypeScript interfaces defined in the workspace packages. They contain no validation logic and serve as the global contract.

### **Layer 2: Service Event DTOs (this microservice)**
Located in `src/events/event-dto/`. These classes `implements` the Layer 1 interfaces and add `class-validator` decorators. They ensure data integrity at the service boundary.

### **Layer 3: Orchestration DTOs (@verichron/event-orchestrator)**
Standardized DTOs for Request-Response patterns.

---

## 4. Usage in Features

To listen for an event in a feature module:

1. Create your listener in the feature's `listeners/` directory.
2. Extend `AbstractBaseListener` for standardized logging and validation.
3. Register the listener in the feature module's `providers` array.

```typescript
// Example Registration in AnalyticsModule
@Module({
  imports: [EventsModule, ...],
  providers: [AnalyticsService, DebtorProfileCreatedListener],
})
export class AnalyticsModule {}
```