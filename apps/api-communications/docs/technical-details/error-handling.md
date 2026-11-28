# API-Communications Microservice: Error Handling Strategy

This document details the error handling strategy implemented within the `api-communications` microservice, covering error code formats, module-specific error codes, and the retry/dead letter queue strategies.

---

## Error Code Format

All custom exceptions within the `api-communications` service follow a structured error code pattern: `COMMS_{MODULE}_{NNN}`.

*   **Prefix**: `COMMS_` (Communications service identifier)
*   **Module**: `DISPATCH`, `TEMPLATE`, `GATEWAY`, `LOG`, `COMPLIANCE`, `PREF` (identifies the feature or context within the service).
*   **Number**: A sequential three-digit identifier unique within its module.

---

## Error Codes by Module

### Dispatch Module (`COMMS_DISPATCH_XXX`)
Error codes related to the orchestration and dispatching of communications.

| Code | Exception | Description |
|:-----|:--------------------------|:-----------------------------------------------------|
| `001` | `DispatchFailedException` | A general error occurred during communication dispatch. |
| `002` | `ComplianceViolationException` | Communication dispatch blocked due to a compliance rule violation. |
| `003` | `DebtorNotFoundException` | The specified debtor for communication was not found. |

### Templates Module (`COMMS_TEMPLATE_XXX`)
Error codes related to the management and rendering of communication templates.

| Code | Exception | Description |
|:-----|:------------------------------|:-------------------------------------------|
| `001` | `TemplateNotFoundException` | The requested template was not found. |
| `002` | `TemplateRenderFailedException` | Failed to render the template with the provided context. |
| `003` | `InvalidTemplateSyntaxException` | The template contains invalid syntax. |
| `004` | `TemplateAlreadyExistsException` | A template with the given name already exists. |

### Gateways Module (`COMMS_GATEWAY_XXX`)
Error codes pertaining to third-party communication gateway integrations.

| Code | Exception | Description |
|:-----|:-------------------------------|:----------------------------------------------|
| `001` | `GatewayTimeoutException` | A timeout occurred while communicating with the gateway. |
| `002` | `GatewayFailureException` | The communication gateway reported a failure. |
| `003` | `InvalidWebhookSignatureException` | Webhook signature verification failed. |
| `004` | `RateLimitExceededException` | The service's rate limit with the gateway was exceeded. |

### Logs Module (`COMMS_LOG_XXX`)
Error codes related to the immutable communication logs.

| Code | Exception | Description |
|:-----|:--------------------|:---------------------------------------|
| `001` | `LogNotFoundException` | The specified communication log entry was not found. |
| `002` | `LogUpdateFailedException` | Failed to update the communication log entry. |

### Compliance Module (`COMMS_COMPLIANCE_XXX`)
Error codes related to compliance rule enforcement.

| Code | Exception | Description |
|:-----|:--------------------------------|:---------------------------------------------------|
| `001` | `OptOutViolationException` | Communication blocked due to debtor opt-out preference. |
| `002` | `FrequencyLimitExceededException` | Communication blocked due to exceeding contact frequency limits. |
| `003` | `TimeRestrictionViolationException` | Communication blocked due to time-of-day restrictions. |

### Preferences Module (`COMMS_PREF_XXX`)
Error codes related to debtor communication preferences.

| Code | Exception | Description |
|:-----|:--------------------------|:-------------------------------------|
| `001` | `PreferenceNotFoundException` | The specified debtor preference was not found. |
| `002` | `InvalidPreferenceException` | Invalid preference data was provided. |

---

## Retry Strategy

The `api-communications` service employs a robust retry strategy for transient errors and identifies non-retryable errors for immediate failure.

### Retryable Errors
These errors typically indicate temporary issues and will be retried up to **3 attempts** with **exponential backoff**.

*   Gateway timeouts
*   Connection errors (`ECONNREFUSED`, `ENOTFOUND`)
*   `5xx` server errors from communication gateways
*   Rate limit errors (`429`, `503`)

### Non-Retryable Errors
These errors indicate business logic or data integrity issues and will **fail immediately** without retry.

*   Compliance violations (e.g., opt-out, frequency limit)
*   Template not found or rendering failures
*   Validation errors in input data

### Dead Letter Queue (DLQ)
*   Persistent failures (after max retries) and non-retryable business errors are directed to a Dead Letter Queue.
*   Messages in the DLQ are logged for manual review and trigger alerts for operational teams.
*   This mechanism ensures that no message is lost and provides an opportunity for manual intervention or system analysis.
