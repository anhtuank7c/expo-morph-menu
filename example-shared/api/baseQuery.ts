/**
 * RTK Query base query for the example apps.
 *
 * Wraps `fetchBaseQuery` with what a production client needs:
 *
 * 1. Bearer token on every request (`prepareHeaders`).
 * 2. Proactive refresh: if the access token expires within REFRESH_MARGIN_MS,
 *    refresh it before sending the request.
 * 3. Reactive refresh: on `401 token_expired`, refresh once and repeat the
 *    request. Concurrent requests share a single refresh call (single flight),
 *    so a burst of 401s does not send a burst of refreshes, which would also
 *    trip the server's refresh-token reuse detection.
 * 4. Retries with exponential backoff and full jitter for network errors,
 *    timeouts, 408, 429, 500, 502, 503 and 504. `Retry-After` is honored.
 * 5. Idempotency keys: every POST/PATCH gets an `Idempotency-Key` that stays
 *    the same across retries, so retrying a write after a lost response does
 *    not create a duplicate.
 *
 * Each attempt is logged in the `network` slice for the debug screen.
 */

import {
  fetchBaseQuery,
  type BaseQueryApi,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
  type FetchBaseQueryMeta,
} from '@reduxjs/toolkit/query';

import { authActions, type AuthState } from '../store/authSlice';
import { networkActions, type NetworkOutcome } from '../store/networkSlice';
import { backoffDelay, parseRetryAfter, sleep, type BackoffOptions } from './backoff';
import type { ApiErrorBody, TokenPair } from './mockServer';

type RootLike = { auth: AuthState };

export type BaseQueryOptions = {
  baseUrl: string;
  /** Replaces the global fetch. The examples pass the mock server's fetch. */
  fetchFn?: typeof fetch;
  maxRetries?: number;
  backoff?: BackoffOptions;
  /** Per-attempt timeout. */
  timeoutMs?: number;
};

/** Extra per-endpoint options: `extraOptions: { retry: false }` disables retries. */
export type ExtraOptions = { retry?: boolean };

const REFRESH_MARGIN_MS = 5_000;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']);

let keyCounter = 0;
const idempotencyKey = () => `${Date.now().toString(36)}-${(keyCounter++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const errorCode = (error: FetchBaseQueryError | undefined) =>
  error && typeof error.status === 'number' ? (error.data as ApiErrorBody | undefined)?.error : undefined;

function outcomeOf(error: FetchBaseQueryError | undefined, meta: FetchBaseQueryMeta | undefined): NetworkOutcome {
  if (!error) return meta?.response?.status ?? 200;
  if (error.status === 'FETCH_ERROR') return /abort/i.test(String(error.error)) ? 'aborted' : 'network';
  if (error.status === 'TIMEOUT_ERROR') return 'timeout';
  if (typeof error.status === 'number') return error.status;
  return meta?.response?.status ?? 'network';
}

function isRetryable(error: FetchBaseQueryError, method: string, hasKey: boolean) {
  // Writes are only safe to repeat when the server can deduplicate them.
  if (!IDEMPOTENT_METHODS.has(method) && !hasKey) return false;
  if (error.status === 'FETCH_ERROR') return !/abort/i.test(String(error.error));
  if (error.status === 'TIMEOUT_ERROR') return true;
  return typeof error.status === 'number' && RETRYABLE_STATUS.has(error.status);
}

export function createBaseQuery({
  baseUrl,
  fetchFn,
  maxRetries = 3,
  backoff,
  timeoutMs = 8_000,
}: BaseQueryOptions): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError, ExtraOptions, FetchBaseQueryMeta> {
  const raw = fetchBaseQuery({
    baseUrl,
    fetchFn,
    timeout: timeoutMs,
    prepareHeaders(headers, { getState }) {
      const token = (getState() as RootLike).auth.accessToken;
      if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
      headers.set('Accept', 'application/json');
      return headers;
    },
  });

  /** The refresh in progress, shared by every request that needs it. */
  let refreshing: Promise<boolean> | null = null;

  /** One logged attempt. */
  async function attempt(args: FetchArgs, api: BaseQueryApi, attemptNo: number) {
    const id = (api.dispatch(
      networkActions.requestStarted({
        method: (args.method ?? 'GET').toUpperCase(),
        url: args.url,
        attempt: attemptNo,
        startedAt: Date.now(),
      }),
    ) as ReturnType<typeof networkActions.requestStarted>).payload.id;
    const result = await raw(args, api, {});
    const replayed = result.meta?.response?.headers.get('Idempotent-Replay') === 'true';
    api.dispatch(
      networkActions.requestFinished({
        id,
        outcome: outcomeOf(result.error, result.meta),
        note: replayed ? 'replayed stored response' : undefined,
      }),
    );
    return { result, id };
  }

  async function refresh(api: BaseQueryApi): Promise<boolean> {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      const refreshToken = (api.getState() as RootLike).auth.refreshToken;
      if (!refreshToken) return false;
      const args: FetchArgs = {
        url: '/auth/refresh',
        method: 'POST',
        body: { refreshToken },
        // The expired access token is not needed here.
        headers: { Authorization: '' },
      };
      for (let n = 0; n <= maxRetries; n++) {
        const { result, id } = await attempt(args, api, n);
        if (result.data) {
          api.dispatch(authActions.tokensRefreshed(result.data as TokenPair));
          return true;
        }
        const error = result.error!;
        if (typeof error.status === 'number' && error.status < 500 && error.status !== 429) {
          api.dispatch(authActions.sessionExpired(errorCode(error) ?? 'refresh_failed'));
          return false;
        }
        if (n === maxRetries) break;
        const delay = backoffDelay(n, backoff);
        api.dispatch(networkActions.annotated({ id, note: `retry refresh in ${delay} ms` }));
        await sleep(delay);
      }
      // The server could not be reached: keep the session, the request fails.
      return false;
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  return async (input, api, extraOptions) => {
    const args: FetchArgs = typeof input === 'string' ? { url: input } : { ...input };
    const method = (args.method ?? 'GET').toUpperCase();
    const isAuthCall = args.url.startsWith('/auth/');

    // One key for the logical request, reused by every retry.
    let hasKey = false;
    if (method === 'POST' || method === 'PATCH') {
      args.headers = { 'Idempotency-Key': idempotencyKey(), ...(args.headers as Record<string, string>) };
      hasKey = true;
    }

    if (!isAuthCall) {
      const { accessExpiresAt, refreshToken } = (api.getState() as RootLike).auth;
      if (refreshToken && accessExpiresAt && accessExpiresAt - Date.now() < REFRESH_MARGIN_MS) {
        await refresh(api);
      }
    }

    let refreshed = false;
    let retries = 0;
    for (;;) {
      const { result, id } = await attempt(args, api, retries);
      const error = result.error;
      if (!error) return result;

      if (!isAuthCall && error.status === 401 && errorCode(error) === 'token_expired' && !refreshed) {
        api.dispatch(networkActions.annotated({ id, note: 'refresh token, then repeat' }));
        refreshed = true;
        if (await refresh(api)) continue;
        return result;
      }

      const retryAllowed = extraOptions?.retry !== false && retries < maxRetries && isRetryable(error, method, hasKey);
      if (!retryAllowed) return result;

      const retryAfter = parseRetryAfter(result.meta?.response?.headers.get('Retry-After'));
      const delay = retryAfter ?? backoffDelay(retries, backoff);
      api.dispatch(networkActions.annotated({ id, note: `retry in ${delay} ms${retryAfter !== null ? ' (Retry-After)' : ''}` }));
      try {
        await sleep(delay, api.signal);
      } catch {
        return result;
      }
      retries++;
    }
  };
}
