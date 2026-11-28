# `templates` Module

## 1. Overview

The `templates` module is a fundamental component of the `api-communications` microservice, providing robust management for communication templates. It centralizes the creation, storage, and retrieval of dynamic content used across various communication channels, such as email, SMS, and letters.

This module leverages the Handlebars templating engine to enable personalized message generation, ensures template validity through syntax checks, and implements an immutable versioning system for an auditable history of all template changes.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **The `Template` Entity:** It owns the TypeORM entity and the `templates` PostgreSQL table, which stores all communication template definitions.
-   **Template Management Logic:** It owns the core business logic for all CRUD (Create, Read, Update, Delete) operations related to templates.
-   **Template Rendering Engine:** It encapsulates the `TemplateRendererService`, which handles the compilation, rendering, and validation of Handlebars templates, including custom helpers.
-   **Immutable Versioning:** It owns the design pattern and implementation for managing template versions, where updates result in new immutable versions rather than modification of existing ones.

### What This Module Does NOT Own

-   **Communication Dispatch:** It does not initiate the sending of messages; it provides the rendered content to the `dispatch` module.
-   **Context Data:** It does not own the data that populates the templates. The context variables are provided dynamically at the time of rendering by the calling service (e.g., `dispatch`).

---

## 3. Entities

### `Template`

This is the core PostgreSQL entity for the module, storing a versioned definition of a communication template.

-   **Purpose:** To store the content (subject and body), metadata, and versioning information for each reusable communication template.
-   **Key Fields:**
    -   `id` (string, UUID): The unique identifier for this specific template version.
    -   `organizationId` (string, UUID): The tenant that owns this template.
    -   `name` (string): A unique identifier (slug) for the template within an organization (e.g., 'payment-receipt').
    -   `displayName` (string): A human-readable name for the template.
    -   `type` (enum: `TemplateType`): The communication channel for which the template is designed (e.g., `EMAIL`, `SMS`).
    -   `subject` (string | null): The Handlebars-templated subject line (primarily for email templates).
    -   `body` (string): The core content of the template, formatted with Handlebars syntax.
    -   `version` (number): The version number of this template.
    -   `isActive` (boolean): Indicates if this is the currently active version of the template. `false` typically means a newer version exists or it's soft-deleted.
    -   `requiredVariables` (string[] | null): An optional list of variables expected by the template.
-   **Relations:** This entity is self-contained and has no direct outgoing TypeORM relations.

---

## 4. Endpoints

All endpoints are prefixed with `/templates` and require JWT authentication.

### `POST /templates`

-   **Description:** Creates a new communication template for an organization. Includes validation for Handlebars syntax.
-   **Body:** `CreateTemplateDto`.
-   **Responses:**
    -   `201 Created`: Returns the newly created `Template` object.
    -   `409 Conflict`: If a template with the same name already exists for the organization.
    -   `400 Bad Request`: If template syntax is invalid or an EMAIL template is missing a subject.

### `GET /templates`

-   **Description:** Retrieves a paginated and filterable list of templates for an organization.
-   **Query Parameters:** `QueryTemplatesDto` (supports filtering by `type`, `name`, `isActive`, and search terms).
-   **Responses:**
    -   `200 OK`: Returns a paginated list of `Template` objects.

### `GET /templates/:id`

-   **Description:** Retrieves a specific template version by its unique ID.
-   **Parameters:** `id` (string, UUID).
-   **Responses:**
    -   `200 OK`: Returns the `Template` object.
    -   `404 Not Found`: If the template ID does not exist or is not associated with the user's organization.

### `PUT /templates/:id`

-   **Description:** Updates an existing template. This operation implements immutable versioning: the existing template is deactivated (`isActive: false`), and a new `Template` entity is created with an incremented version number and the updated content.
-   **Parameters:** `id` (string, UUID of the *current active* template).
-   **Body:** `UpdateTemplateDto`.
-   **Responses:**
    -   `200 OK`: Returns the newly created, active `Template` object.

### `DELETE /templates/:id`

-   **Description:** Deactivates (soft deletes) a template by setting its `isActive` flag to `false`. The template record remains in the database for historical and auditing purposes.
-   **Parameters:** `id` (string, UUID).
-   **Responses:**
    -   `204 No Content`: On successful deactivation.

### `POST /templates/:id/preview`

-   **Description:** Renders a specified template with provided context data. This is useful for testing and verifying template output before actual dispatch.
-   **Parameters:** `id` (string, UUID).
-   **Body:** `PreviewTemplateDto` (containing the `context` data).
-   **Responses:**
    -   `200 OK`: Returns the rendered `subject` and `body`.

---

## 5. Key Concepts & Patterns

### Handlebars Templating with Custom Helpers

All templates stored in this module utilize the Handlebars templating engine. This allows for dynamic and personalized content generation by injecting data into placeholders. The `TemplateRendererService` extends Handlebars by registering custom helpers like `{{currency amount}}`, `{{formatDate date}}`, and `{{debtStatus status}}`, which provide rich formatting and business-logic-driven display directly within the templates.

### Immutable Versioning

The module implements a crucial immutable versioning strategy for templates. When a template is "updated" (via `PUT /templates/:id`), the existing active template is *not* modified. Instead, it is marked as `isActive: false`, and a brand new `Template` record is created. This new record carries an incremented `version` number, the updated content, and is set as `isActive: true`. This approach ensures a complete, unalterable audit trail of every template change, which is vital for compliance and debugging.

### Template Syntax Validation

To prevent runtime errors and ensure template quality, the `TemplatesService` performs syntax validation before saving or updating any template. It uses the `TemplateRendererService.validateTemplate()` method to compile the Handlebars content (subject and body) without rendering it. If any syntax errors are detected, the operation is rejected with an `InvalidTemplateSyntaxException`.

### Organization-Scoped Management

Templates are tenant-scoped by `organizationId`. This ensures that each organization has its own isolated set of templates, and users can only access templates belonging to their respective organization. The `(organizationId, name, version)` unique index enforces this isolation and versioning.

---

## 6. Events

This module primarily serves as a content management system. It does not publish or subscribe to any events on the message bus.

---

## 7. Dependencies & Integrations

### Internal Dependencies

-   **`TemplateRendererService`:** This is an internal component of the module, responsible for all Handlebars-related operations.
-   **Note:** This module is a critical dependency *for* the `dispatch` module, which injects `TemplatesService` and `TemplateRendererService` to fetch and render templates before sending communications.

### External Integrations

-   **PostgreSQL:** The primary database where `Template` entities are stored. The module uses TypeORM for database interaction.
-   **Handlebars.js:** The underlying templating library used for rendering dynamic content.

---

## 8. Gaps & Future Work

-   **Required Variables Enforcement:** While the `Template` entity has a `requiredVariables` field, the system does not actively enforce that all specified variables are present in the context provided at rendering/dispatch time. Implementing this check could prevent silent rendering failures or incomplete messages.
-   **Version Rollback/Comparison:** The immutable versioning system provides the foundation for advanced features like comparing different template versions side-by-side or rolling back to a previous active version. These features are not yet implemented but would enhance template management capabilities.
