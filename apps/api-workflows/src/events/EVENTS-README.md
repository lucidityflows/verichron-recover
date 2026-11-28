# EVENTS MODULE - Verichron Infrastructure Bridge Pattern

## 1. Overview

The `events` module is the architectural core of the `api-workflows` microservice's event-driven capabilities. It provides the infrastructure for publishing and subscribing to events via GCP Pub/Sub.

---

## 2. Design Pattern: The Infrastructure Bridge

To ensure scalability and maintain clean dependency injection (DI), this microservice follows the **Infrastructure Bridge** pattern.

### **Rule 1: Contracts are Centralized**
All **Event DTOs** and **Type Mappings** are stored within the `events/` module. 
- **Location**: `src/events/event-dto/`
- **Reason**: This folder serves as the "Internal API Contract" for the microservice. Any developer can look here to see every message the service sends or receives.

### **Rule 2: Listeners are Decentralized**
**Listener classes** (the logic that reacts to events) are owned and registered by the **Feature Modules** they serve.
- **Example**: `DebtCreatedListener` is registered in `EngineModule`.
- **Reason**: Listeners usually depend on feature-specific services and repositories. Moving them to the feature module allows dependencies to be resolved naturally without creating circular dependencies.

### **Rule 3: One-Way Dependency Flow**
- **Feature Modules** -> `EventsModule` (**Allowed**)
- **EventsModule** -> **Feature Modules** (**STRICTLY FORBIDDEN**)

---

## 3. Usage in Features

To listen for an event in a feature module:

1. Create your listener in the feature's `listeners/` directory.
2. Extend `AbstractBaseListener` for standardized logging and validation.
3. Register the listener in the feature module's `providers` array.

```typescript
// Example Registration in EngineModule
@Module({
  imports: [EventsModule, ...],
  providers: [EngineService, DebtCreatedListener],
})
export class EngineModule {}
```
