# Project-Wide API Design Principles & Conventions

This document outlines the high-level design principles and mandatory coding conventions for all NestJS-based microservices in this project. It is intended to be a succinct guide for ensuring consistency and maintainability across the entire backend.

For implementation details specific to a service, refer to the `README.md` files within that service's `src/` directory.

## 1. Bounded Context & Database Ownership

Each microservice is a **bounded context**. This is a critical architectural principle.

-   **Self-Managed Database:** Every microservice **must** own and manage its own database. There are no cross-database joins or shared tables between services.
-   **Clear Ownership:** The service is the single source of truth for its domain entities. For example, `api-users` owns user identity, while `api-debts` owns debt records.
-   **Communication via API/Events:** Services communicate via well-defined APIs or through the event bus, never by directly accessing another service's database.

## 2. Directory Structure

All services follow a standardized, feature-based structure.

-   **`src/[feature-name]/`**: Each top-level directory in `src/` is a self-contained feature module (e.g., `debts`, `portfolios`).
-   **`src/core/`**: A global module for cross-cutting concerns like security guards and application-wide pipes/filters.
-   **`src/events/`**: A dedicated module for defining event DTOs and configuring event infrastructure for the service.

## 3. Event-Driven Architecture

-   **Event DTOs**: For every event published or consumed, a corresponding DTO **must** be created in the service's `src/events/event-dto/` directory.
-   **Interface Implementation**: Each event DTO **must** `implement` the corresponding payload interface from the shared `@verichron/events` package.
-   **Validation**: Event DTOs **must** use `class-validator` decorators to ensure runtime data integrity.

## 4. API, DTOs, and OpenAPI

-   **OpenAPI Generation**: Each microservice **must** contain a `generate-openapi.ts` script. This script is required to generate the `openapi.json` spec used by **Orval** to create type-safe clients for the microfrontends.
-   **OpenAPI Decorators**: All DTOs used in controllers (request/response bodies) **must** be fully decorated with `@ApiProperty()` or `@ApiPropertyOptional()` from `@nestjs/swagger`.
-   **Enums in DTOs**: When using an `enum` in a DTO, the `@ApiProperty` decorator **must** include the `enum` and `enumName` properties to ensure it is correctly represented in the OpenAPI specification.

    ```typescript
    // ✅ CORRECT: enumName is specified for Swagger
    @ApiPropertyOptional({
      description: 'Initial status of the portfolio.',
      enum: PortfolioStatus,
      enumName: 'PortfolioStatus', // This is required
    })
    @IsOptional()
    @IsEnum(PortfolioStatus)
    status?: PortfolioStatus;
    ```

## 5. Entities & Database Conventions

-   **TypeORM Decorators**: All entities **must** be fully decorated. Column types, lengths, nullability, and default values should be explicitly defined.
-   **Column Naming**: Database column names **must** be defined in `snake_case` using the `name` property of the `@Column` decorator.
-   **Indexes**: When creating a database index with `@Index()`, you **must** use the TypeORM property name (camelCase), not the database column name (snake_case).

## 6. Error Handling

-   **Custom Exceptions**: All custom, domain-specific exceptions **must** extend the `BaseException` class from the shared `@verichron/error-handling` package. This ensures all errors have a consistent shape (`statusCode`, `message`, `errorCode`) and are handled correctly by the global exception filter.

    ```typescript
    // ✅ CORRECT: Extends BaseException
    import { BaseException } from '@verichron/error-handling';
    import { HttpStatus } from '@nestjs/common';

    export class PortfolioNotFoundException extends BaseException {
      constructor(portfolioId: string) {
        super(
          `Portfolio with ID '${portfolioId}' not found.`,
          HttpStatus.NOT_FOUND,
          'DEBTS_PORTFOLIOS_001', // Unique error code
        );
      }
    }
    ```

## 7. 3rd Party Integrations

Common external services used across the platform include:

-   **PostgreSQL**: The primary write-model database for each service.
-   **Redis**: Used for caching and implementing high-performance read models (CQRS).
-   **GCP Pub/Sub**: The message bus for all event-driven communication.
-   **Google Cloud Document AI**: Used for parsing uploaded files in the `api-debts` service.
