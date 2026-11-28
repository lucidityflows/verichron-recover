# `auth` Module

## 1. Overview

The `auth` module is the Identity and Access Management (IAM) core of the Verichron platform, residing within the `api-users` microservice. It is the definitive authority for user authentication, session context management, and the issuance of JSON Web Tokens (JWTs).

This module implements a secure, two-step login flow designed to accommodate users who may have access to multiple organizations. It handles the entire authentication lifecycle, from initial credential validation to the issuance and refreshing of scoped access tokens that are used to authorize requests across all other microservices.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **User Authentication:** It owns the process of validating user credentials (email and password).
-   **The Two-Step Login Flow:** It owns the complete logic for the two-step authentication process, including the creation and validation of the short-lived Authentication Context Token (ACT).
-   **JWT Issuance:** It is the sole issuer of scoped JWT access tokens and their corresponding refresh tokens.
-   **Token Refreshment:** It owns the logic for validating refresh tokens and issuing new access tokens.
-   **Authentication Events:** It is responsible for publishing all authentication-related domain events, such as `LoginSuccess`, `TokenIssued`, and `ContextSwitched`.

### What This Module Does NOT Own

-   **User Profiles & Memberships:** It does not manage user data directly. It calls the `profiles` module to fetch user details and determine which organizations a user belongs to.
-   **Permissions Logic:** It does not define roles or permissions. It calls the `rbac` module to retrieve the correct set of permissions for a user within a specific context (e.g., an organization), which are then embedded into the JWT.
-   **Token Enforcement:** It does not enforce token validity on resource access. It only issues tokens; enforcement is the responsibility of guards within each microservice.

---

## 3. Endpoints

All endpoints are prefixed with `/auth`.

### `POST /auth/login`

-   **Description:** The first step of the two-step login flow. The client sends the user's email and password. On success, the service returns a list of organizations the user belongs to and sets a secure, `httpOnly` cookie containing an **Authentication Context Token (ACT)**.
-   **Body:** `AuthLoginDto`
-   **Responses:**
    -   `200 OK`: Returns `AuthOrganizationListResponseDto`.
    -   `401 Unauthorized`: If credentials are invalid.

### `POST /auth/token`

-   **Description:** The second step of the login flow. The client sends the `organizationId` the user has selected. A guard validates the ACT from the cookie. On success, the service issues a scoped JWT access token and a refresh token, then clears the ACT cookie.
-   **Body:** `AuthTokenDto`
-   **Responses:**
    -   `201 Created`: Returns `AuthTokenResponseDto` containing the `accessToken` and `refreshToken`.
    -   `403 Forbidden`: If the ACT is invalid, expired, or already used.

### `POST /auth/refresh`

-   **Description:** Exchanges a valid, non-expired refresh token for a new access token.
-   **Body:** `{ "refreshToken": "..." }`
-   **Responses:**
    -   `201 Created`: Returns `{ "accessToken": "..." }`.
    -   `401 Unauthorized`: If the refresh token is invalid or expired.

### `POST /auth/switch-context`

-   **Description:** Allows an already authenticated user (with a valid JWT) to get a new ACT, effectively re-starting the login flow at Step 1 to select a different organization context.
-   **Responses:**
    -   `200 OK`: Returns `AuthOrganizationListResponseDto` and sets a new `act` cookie.

---

## 4. Key Concepts & Patterns

### Two-Step Authentication Flow

This module's core is a two-step login process designed for a multi-tenant environment where users can belong to multiple organizations.

1.  **Step 1: Authentication (`/auth/login`)**: The user authenticates with their primary credentials. Instead of immediately receiving a final access token, they get a short-lived **Authentication Context Token (ACT)** set as a secure cookie. The API response contains the list of organizations they can access. This separates the act of proving *who you are* from deciding *what you want to access*.
2.  **Step 2: Authorization Context (`/auth/token`)**: The frontend presents the list of organizations to the user. Once the user selects an organization, the frontend makes a request to `/auth/token` with the chosen `organizationId`. The backend validates the ACT, confirms the user's membership in the requested organization, and only then mints the final, scoped JWT access token.

### Authentication Context Token (ACT)

The ACT is a short-lived (5-minute) JWT that serves as a temporary, single-use credential.
-   **Purpose:** To securely bridge the time between initial authentication and the user's selection of an organizational context.
-   **Security:** It is stored in an `httpOnly` cookie, making it inaccessible to client-side JavaScript. It also contains a unique identifier (`jti`) which is "burned" in Redis upon use, preventing any possibility of replay attacks. The `ActStrategy` is a custom Passport strategy dedicated to extracting and validating this token from the cookie.

### Scoped JWT Issuance

The final access token issued by the service is "scoped" to a specific context. The `AuthService` collaborates with the `RbacService` to fetch the precise roles and permissions the user has for the selected `organizationId`. These permissions are then embedded directly into the JWT payload under a custom claims namespace. This makes the JWT self-contained, allowing any other microservice to authorize a user's actions by inspecting the token without needing to call back to `api-users`.

### Refresh Token Rotation

The service issues a long-lived refresh token alongside the short-lived access token, following standard OAuth2 best practices. This allows clients to maintain a user's session by using the `/auth/refresh` endpoint to obtain a new access token without requiring the user to re-enter their password.

---

## 5. Events

### Published Events

| Event Name | Event Constant | Trigger |
| :--- | :--- | :--- |
| **Login Success** | `USERS_AUTH_LOGIN_SUCCESS` | A user successfully validates their primary credentials. |
| **Login Failed** | `USERS_AUTH_LOGIN_FAILED` | A user provides invalid credentials. |
| **Token Issued** | `USERS_AUTH_TOKEN_ISSUED` | A new access token is generated (via login, refresh, or context switch). |
| **Context Switched**| `USERS_AUTH_CONTEXT_SWITCHED` | A user successfully obtains a token for a new organization via the `/switch-context` flow. |

---

## 6. Dependencies & Integrations

### Internal Dependencies

-   **`profiles` module:** A critical dependency used to fetch user data for validation and to retrieve a user's list of organization memberships.
-   **`rbac` module:** A critical dependency used to fetch the specific roles and permissions for a user within a given organization context.
-   **`redis` module:** Used to implement the "burn list" for single-use Authentication Context Tokens (ACTs) by storing their `jti`.
-   **`@verichron/event-publisher`:** Used to publish all authentication-related domain events.

### External Integrations

-   **Redis:** Serves as a high-performance cache for storing used token identifiers (`jti`).
-   **bcrypt:** The library used for securely comparing password hashes during login.
-   **`@nestjs/jwt` & `passport-jwt`:** The core libraries used for creating and validating all JSON Web Tokens.

---

## 7. Gaps & Future Work

-   **User Validation in JWT Strategy:** The `JwtStrategy` contains a `TODO` comment to add a check that ensures a user still exists and is active every time a token is validated. This is an important security enhancement to immediately invalidate tokens for users who have been deleted or suspended.
-   **Session Invalidation (Logout):** The module currently lacks an explicit `/auth/logout` endpoint. A proper implementation would invalidate the provided refresh token, effectively logging the user out and preventing further token refreshes.
