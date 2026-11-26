# Data layer of the social example

**English** | [Tiếng Việt](DATA-LAYER.vi.md)

The social example loads its data the way a production app talks to a REST API: Redux Toolkit, RTK Query, JWT access and refresh tokens, retries with exponential backoff. The backend is a mock that runs inside the app, so the app works offline and needs no server. Only the `fetch` function is replaced; the client code is the same code you would point at a real API.

None of this is part of the `expo-morph-menu` package. It exists so the example shows the menu in a realistic app. The basic example (`example/`) does not use it. For the folder structure of the app, see the [README](../README.md#code-structure).

## Files

| File | Contents |
| --- | --- |
| `src/core/http/baseQuery.ts` | RTK Query base query: bearer token, token refresh, retries with backoff, idempotency keys, request log |
| `src/core/http/backoff.ts` | Backoff delay with full jitter, `Retry-After` parsing, abortable sleep |
| `src/core/http/jwt.ts` | JWT encoding for the mock server (the signature is not cryptographic) and `decodeJwt` for the client |
| `src/core/http/networkLog.ts` | Slice with the log of HTTP attempts for the debug screen |
| `src/core/session/authSlice.ts` | Session state: status, tokens, expiry, refresh count, last error |
| `src/core/api/api.ts` | The RTK Query API slice. Features add endpoints with `injectEndpoints` |
| `src/core/api/dto.ts` | Request and response types of the REST API |
| `src/backend/mockServer.ts` | Generic in-memory REST backend exposed as a `fetch` function: routing, latency, JWT auth, idempotency keys, fault injection |
| `src/backend/server.ts`, `seed.ts` | The Murmur routes and their initial records |
| `src/features/devtools/ui/NetworkPanel.tsx` | Debug screen: session, token countdown, fault injection, request log |
| `test/api.test.cjs` | Scenario tests (`npm run test:api`) |

## Request lifecycle

For each request, the base query does the following:

1. Adds `Authorization: Bearer <access token>` from the `auth` slice.
2. For `POST` and `PATCH`, adds an `Idempotency-Key` header. The key is created once per logical request and reused by every retry.
3. If the access token expires within 5 seconds, refreshes it before sending the request (proactive refresh).
4. Sends the request and logs the attempt in the `network` slice.
5. On `401` with error code `token_expired`: refreshes the token once, then repeats the request.
6. On a network error, a timeout, or status `408`, `429`, `500`, `502`, `503` or `504`: waits and retries, up to 3 retries. The delay is `Retry-After` when the server sends it, otherwise a random value between 0 and `min(5000, 300 * 2^n)` ms (full jitter).
7. Any other error is returned to the caller without a retry.

Writes are retried only because of the idempotency key: if the server committed a write but the response was lost, the retry returns the stored response instead of creating a second resource.

## Token refresh

```
request ──> 401 token_expired
              │
              ▼
        refresh in progress? ──yes──> wait for it ──┐
              │ no                                   │
              ▼                                      │
      POST /auth/refresh (rotation)                  │
        │                │                           │
       200              401                          │
        │                │                           │
 tokensRefreshed   sessionExpired ──> signed out     │
        │                                            │
        └──────────────> repeat the request <────────┘
```

- Single flight: concurrent requests that receive `401` share one refresh call. Sending several refreshes in parallel would also trigger the server's reuse detection.
- Rotation: every refresh returns a new refresh token and invalidates the old one.
- Reuse detection: presenting an already used refresh token revokes the whole session (all tokens from the same login). A retry within 10 seconds of a lost refresh response receives the same new pair instead.
- When the refresh is rejected, the `auth` slice moves to `signedOut` with a reason. A listener in the app's store clears the RTK Query cache, and `Stack.Protected` returns to the login screen.

Access tokens live 60 seconds, so refreshes happen while you use the app.

## Fault injection

The mock server simulates these faults, with probabilities per request:

| Fault | Low | High | Client behavior |
| --- | --- | --- | --- |
| Network error before the request reaches the server | 3% | 8% | Retry with backoff |
| `503 Service Unavailable` | 8% | 20% | Retry with backoff |
| `429 Too Many Requests` with `Retry-After: 1` | 3% | 8% | Retry after 1 second |
| Lost response after a write was committed | 4% | 10% | Retry with the same idempotency key, the server replays the stored response |

The default level is `low`. Change it on the Network screen, or start Metro with `EXPO_PUBLIC_API_CHAOS=off|low|high`.

## Network screen

The Network screen (`src/features/devtools/ui/NetworkPanel.tsx`) shows:

- Session status, user id, access token countdown, number of refreshes, last error.
- "Expire access token": the next request receives `401 token_expired`, and the log shows the refresh and the repeated request.
- "Revoke session": the next refresh fails and the session ends.
- Fault injection level.
- One log line per HTTP attempt, with status, retry number, duration and what the client did next.

## Tests

```bash
npm run test:api
```

The test transpiles the TypeScript sources, builds a real Redux store with RTK Query, and runs these scenarios against the mock server:

| Scenario | Checks |
| --- | --- |
| Login and authorized request | Tokens stored, `Authorization` header accepted |
| Wrong password | `401 invalid_credentials`, no retry |
| Expired token, 5 parallel requests | Exactly one refresh call, all 5 requests succeed |
| Token about to expire | Refresh before the request |
| Revoked session | Refresh fails, session ends with `session_revoked` |
| Refresh token reuse | Quick retry allowed, later reuse revokes the session |
| Network error, then 503 | 3 attempts, the third succeeds |
| Lost response on POST | Retry replays the stored response, resource created once |
| 429 | Waits for `Retry-After` |
| 404 | Not retried |

Faults are injected with a scripted random source, so the tests are deterministic.

## Using this with a real backend

- In `src/core/api/api.ts`, remove `fetchFn: server.fetch` from `createBaseQuery` and set `baseUrl` to your API. Then delete `src/backend/`.
- Persist the refresh token with `expo-secure-store` and restore it at startup.
- Keep the access token short-lived, and match the error code your server returns for an expired token (here `token_expired`).
- Make sure your server deduplicates writes by `Idempotency-Key`, or turn off retries for writes with `extraOptions: { retry: false }`.
