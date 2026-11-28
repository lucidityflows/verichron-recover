# @verichron/auth-utils

Shared authentication utilities for Verichron microfrontends. Provides secure token storage and automatic JWT refresh to maintain seamless user sessions.

## Features

- **Hybrid Token Storage**: Memory-only by default, localStorage for "Remember Me"
- **Automatic Token Refresh**: Refreshes tokens 5 minutes before expiration
- **Secure by Default**: Access tokens never persisted, refresh tokens only with user consent
- **Framework Agnostic**: Works with any frontend framework (React, Vue, vanilla JS)

## Installation

This package is part of the Verichron monorepo and is automatically available via workspace dependencies.

```json
{
  "dependencies": {
    "@verichron/auth-utils": "workspace:*"
  }
}
```

## Usage

### Phase 1: After Successful Login

```typescript
import { tokenStorage, tokenRefreshService } from '@verichron/auth-utils';
import { authService } from './services/authService';

// After user selects organization and receives tokens
const tokens = await authService.getToken({ organizationId });

// Save tokens (with "Remember Me" support)
const rememberMe = loginForm.rememberMe; // from checkbox
tokenStorage.saveTokens(tokens, rememberMe);

// Start automatic token refresh
tokenRefreshService.start(tokens.accessToken, {
  onRefresh: async (refreshToken) => {
    // Call your auth service to refresh the token
    const newTokens = await authService.refreshToken(refreshToken);
    return newTokens;
  },
  onRefreshFailure: (error) => {
    // Handle refresh failure (session expired)
    console.error('Session expired:', error);
    tokenStorage.clearTokens();
    navigate('/login');
  },
});
```

### Phase 2: App Initialization (Restore Session)

```typescript
import { tokenStorage, tokenRefreshService } from '@verichron/auth-utils';
import { authService } from './services/authService';

// Check if user has a persisted refresh token
const refreshToken = tokenStorage.getRefreshToken();

if (refreshToken) {
  try {
    // Attempt to restore session with refresh token
    const tokens = await authService.refreshToken(refreshToken);

    // Save new tokens and start auto-refresh
    tokenStorage.saveTokens(tokens, true); // preserve "remember me"

    tokenRefreshService.start(tokens.accessToken, {
      onRefresh: async (rt) => authService.refreshToken(rt),
      onRefreshFailure: (error) => {
        console.error('Session restore failed:', error);
        tokenStorage.clearTokens();
        navigate('/login');
      },
    });

    console.log('Session restored successfully');
  } catch (error) {
    // Refresh token expired or invalid, clear and show login
    console.warn('Could not restore session:', error);
    tokenStorage.clearTokens();
  }
}
```

### Phase 3: Logout

```typescript
import { tokenStorage, tokenRefreshService } from '@verichron/auth-utils';

function logout() {
  // Stop automatic refresh
  tokenRefreshService.stop();

  // Clear all tokens
  tokenStorage.clearTokens();

  // Redirect to login
  navigate('/login');
}
```

## API Reference

### TokenStorage

Manages secure storage of authentication tokens.

#### Methods

##### `saveTokens(tokens: IAuthTokenResponse, rememberMe?: boolean): void`

Save access and refresh tokens.

- `tokens`: Object containing `accessToken` and `refreshToken`
- `rememberMe`: If `true`, persist refresh token to localStorage (default: `false`)

**Example:**
```typescript
tokenStorage.saveTokens({ accessToken, refreshToken }, true);
```

##### `getAccessToken(): string | null`

Get current access token (always from memory).

**Returns:** Access token or `null` if not authenticated

##### `getRefreshToken(): string | null`

Get refresh token from memory or localStorage.

**Returns:** Refresh token or `null` if not available

##### `hasTokens(): boolean`

Check if user has valid tokens.

**Returns:** `true` if either access token or refresh token exists

##### `clearTokens(): void`

Clear all tokens (memory and localStorage).

**Example:**
```typescript
tokenStorage.clearTokens();
```

##### `updateAccessToken(accessToken: string): void`

Update only the access token (used after manual refresh).

---

### TokenRefreshService

Automatically refreshes access tokens before expiration.

#### Methods

##### `start(accessToken: string, callbacks: TokenRefreshCallbacks): void`

Initialize and start automatic token refresh.

**Parameters:**
- `accessToken`: Current access token to decode for expiration
- `callbacks`: Object with `onRefresh` and `onRefreshFailure` callbacks

**Example:**
```typescript
tokenRefreshService.start(accessToken, {
  onRefresh: async (refreshToken) => authService.refreshToken(refreshToken),
  onRefreshFailure: (error) => navigate('/login'),
});
```

##### `stop(): void`

Stop automatic token refresh and clear timer.

##### `isActive(): boolean`

Check if auto-refresh is currently active.

**Returns:** `true` if refresh timer is scheduled

##### `refreshNow(): Promise<IAuthTokenResponse | null>`

Manually trigger token refresh (useful for testing).

**Returns:** Promise resolving to new tokens or `null` on failure

---

## Integration Examples

### React + TanStack Router (ui-auth example)

```typescript
// apps/ui-auth/src/features/auth/Login.tsx
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { tokenStorage, tokenRefreshService } from '@verichron/auth-utils';
import { authService } from '@/services/authService';

export function Login() {
  const navigate = useNavigate();
  const [rememberMe, setRememberMe] = useState(false);

  async function handleLogin(credentials) {
    // Step 1: Login
    const organizations = await authService.login(credentials);

    // Step 2: Get token (assume single org for simplicity)
    const tokens = await authService.getToken({
      organizationId: organizations[0].id
    });

    // Step 3: Save tokens and start auto-refresh
    tokenStorage.saveTokens(tokens, rememberMe);

    tokenRefreshService.start(tokens.accessToken, {
      onRefresh: async (rt) => authService.refreshToken(rt),
      onRefreshFailure: () => {
        tokenStorage.clearTokens();
        navigate({ to: '/login' });
      },
    });

    navigate({ to: '/dashboard' });
  }

  return (
    <form onSubmit={handleLogin}>
      {/* form fields */}
      <label>
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        Remember Me
      </label>
    </form>
  );
}
```

### App Initialization (App.tsx)

```typescript
// apps/ui-auth/src/App.tsx
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { tokenStorage, tokenRefreshService } from '@verichron/auth-utils';
import { authService } from '@/services/authService';

export function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // Attempt to restore session on app load
    async function restoreSession() {
      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        return; // No session to restore
      }

      try {
        const tokens = await authService.refreshToken(refreshToken);
        tokenStorage.saveTokens(tokens, true);

        tokenRefreshService.start(tokens.accessToken, {
          onRefresh: async (rt) => authService.refreshToken(rt),
          onRefreshFailure: () => {
            tokenStorage.clearTokens();
            navigate({ to: '/login' });
          },
        });

        console.log('Session restored');
      } catch (error) {
        console.warn('Session restore failed:', error);
        tokenStorage.clearTokens();
      }
    }

    restoreSession();
  }, [navigate]);

  return <RouterProvider router={router} />;
}
```

---

## Security Considerations

1. **Access Tokens**: Always stored in memory only, never persisted
2. **Refresh Tokens**: Only persisted if user explicitly checks "Remember Me"
3. **Storage Keys**: Prefixed with `dls_auth` to avoid collisions
4. **Token Expiration**: Automatically refreshed 5 minutes before expiry
5. **Refresh Failures**: Gracefully handled with callback for user notification

---

## Testing

### Manual Token Refresh

```typescript
import { tokenRefreshService } from '@verichron/auth-utils';

// Force immediate refresh
await tokenRefreshService.refreshNow();
```

### Check Refresh Status

```typescript
if (tokenRefreshService.isActive()) {
  console.log('Auto-refresh is running');
}
```

---

## Troubleshooting

### "No refresh token available" Error

**Cause:** Token was cleared or never saved

**Solution:** Ensure `tokenStorage.saveTokens()` is called after successful authentication

### Tokens Not Persisting After Refresh

**Cause:** `rememberMe` was `false` when saving tokens

**Solution:** Check that "Remember Me" checkbox state is correctly passed to `saveTokens()`

### Refresh Loop (Constant Refreshing)

**Cause:** Access token expiration is set too short or refresh buffer is too large

**Solution:** Verify JWT expiration (`exp` claim) is reasonable (e.g., 15 minutes minimum)

---

## Contributing

This package is maintained as part of the Verichron monorepo. Follow standard contribution guidelines.

## License

Private - Internal use only
