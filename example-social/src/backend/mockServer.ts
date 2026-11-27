/**
 * Generic in-memory REST backend, exposed as a `fetch` function.
 *
 * The client code (RTK Query + `fetchBaseQuery`) is the same code you would
 * use against a real server: only `fetchFn` points here instead of the global
 * `fetch`. Everything a real backend does to a client is simulated:
 *
 * - latency (random, abortable);
 * - JWT access tokens (short lifetime) and refresh tokens (rotated on every
 *   refresh, with reuse detection that revokes the whole session);
 * - `401 token_expired` with a `WWW-Authenticate` header;
 * - idempotency keys: a repeated POST with the same `Idempotency-Key` returns
 *   the stored response instead of creating a second resource;
 * - faults ("chaos"): network errors, 503, 429 with `Retry-After`, and lost
 *   responses (the server commits, then the connection drops).
 */

import { sleep } from '../core/http/backoff';
import { signJwt, verifyJwt, type JwtPayload } from '../core/http/jwt';
import type { ApiErrorBody, TokenPair } from '../core/http/types';

export type { ApiErrorBody, TokenPair };

export type ChaosLevel = 'off' | 'low' | 'high';

export type MockRequest = {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  headers: Record<string, string>;
  /** Authenticated user id. Empty string on public routes. */
  userId: string;
};

export type MockResponse = { status: number; body?: unknown; headers?: Record<string, string> };

export type RouteHandler = (req: MockRequest) => MockResponse | Promise<MockResponse>;

export type Route = { method: string; pattern: string; handler: RouteHandler; isPublic?: boolean };

export const route = (method: string, pattern: string, handler: RouteHandler, isPublic = false): Route => ({
  method,
  pattern,
  handler,
  isPublic,
});

export const json = (body: unknown, status = 200): MockResponse => ({ status, body });
export const noContent = (): MockResponse => ({ status: 204 });
export const error = (status: number, code: string, message: string): MockResponse => ({
  status,
  body: { error: code, message },
});

export type MockServerOptions = {
  /** Base URL the client uses, for example 'https://api.murmur.mock/v1'. */
  baseUrl: string;
  secret: string;
  routes: Route[];
  /** POST /auth/login. Returns the user id, or null for wrong credentials. */
  authenticate?: (body: any) => string | null;
  /** POST /auth/device: anonymous session for apps without a login screen. */
  anonymous?: () => string;
  /** Access token lifetime. Short on purpose, so refreshes happen while you use the app. */
  accessTtlSec?: number;
  refreshTtlSec?: number;
  latencyMs?: [number, number];
  chaos?: ChaosLevel;
  /** Random source for latency and faults. Tests pass a scripted one. */
  random?: () => number;
};

export type ServerState = { chaos: ChaosLevel; accessTtlSec: number; latencyMs: [number, number] };

export type MockServerControl = {
  getState: () => ServerState;
  subscribe: (listener: () => void) => () => void;
  setChaos: (level: ChaosLevel) => void;
  /** Every access token issued so far is rejected with 401 token_expired. */
  expireAccessTokens: () => void;
  /** Revokes all refresh tokens: the next refresh fails and the client must sign in again. */
  revokeSessions: () => void;
};

/** Probability of each fault per request. */
const CHAOS: Record<
  ChaosLevel,
  { network: number; unavailable: number; rateLimited: number; lostResponse: number }
> = {
  off: { network: 0, unavailable: 0, rateLimited: 0, lostResponse: 0 },
  low: { network: 0.03, unavailable: 0.08, rateLimited: 0.03, lostResponse: 0.04 },
  high: { network: 0.08, unavailable: 0.2, rateLimited: 0.08, lostResponse: 0.1 },
};

type RefreshRecord = {
  userId: string;
  family: string;
  /** Set when this token was exchanged. A second exchange is a reuse. */
  usedAt?: number;
  /** The pair issued in exchange, returned again for a quick retry. */
  replacement?: TokenPair;
};

let counter = 0;
const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;

function compile(pattern: string) {
  const keys: string[] = [];
  const source = pattern.replace(/:([A-Za-z]+)/g, (_, key: string) => {
    keys.push(key);
    return '([^/]+)';
  });
  return { regex: new RegExp(`^${source}$`), keys };
}

function networkError() {
  // Same error React Native's fetch throws when the connection fails.
  return new TypeError('Network request failed');
}

function abortError() {
  const e = new Error('Aborted');
  e.name = 'AbortError';
  return e;
}

export function createMockServer(options: MockServerOptions) {
  const {
    baseUrl,
    secret,
    authenticate,
    anonymous,
    refreshTtlSec = 7 * 24 * 3600,
    random = Math.random,
  } = options;

  const state: ServerState = {
    chaos: options.chaos ?? 'off',
    accessTtlSec: options.accessTtlSec ?? 60,
    latencyMs: options.latencyMs ?? [150, 450],
  };
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  /** Access tokens carry the epoch they were issued in; bumping it expires them all. */
  let accessEpoch = 0;
  const refreshTokens = new Map<string, RefreshRecord>();
  const revokedFamilies = new Set<string>();
  const idempotency = new Map<string, MockResponse>();

  const routes = options.routes.map((r) => ({ ...r, ...compile(r.pattern) }));

  /* --- tokens ------------------------------------------------------------- */

  function issue(userId: string, family = uid('fam')): TokenPair {
    const now = Math.floor(Date.now() / 1000);
    const access: JwtPayload & { ep: number } = {
      sub: userId,
      jti: uid('at'),
      typ: 'access',
      iat: now,
      exp: now + state.accessTtlSec,
      ep: accessEpoch,
    };
    const refreshJti = uid('rt');
    const refresh: JwtPayload = {
      sub: userId,
      jti: refreshJti,
      typ: 'refresh',
      iat: now,
      exp: now + refreshTtlSec,
      fam: family,
    };
    refreshTokens.set(refreshJti, { userId, family });
    return {
      accessToken: signJwt(access, secret),
      refreshToken: signJwt(refresh, secret),
      tokenType: 'Bearer',
      expiresIn: state.accessTtlSec,
    };
  }

  function authorize(header: string | undefined): { userId: string } | MockResponse {
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return error(401, 'unauthorized', 'Missing bearer token');
    const result = verifyJwt(token, secret);
    const expired =
      (!result.ok && result.reason === 'expired') ||
      (result.ok && ((result.payload as JwtPayload & { ep?: number }).ep ?? 0) < accessEpoch);
    if (expired) {
      return {
        ...error(401, 'token_expired', 'The access token expired'),
        headers: {
          'WWW-Authenticate': 'Bearer error="invalid_token", error_description="The access token expired"',
        },
      };
    }
    if (!result.ok || result.payload.typ !== 'access')
      return error(401, 'invalid_token', 'Invalid access token');
    return { userId: result.payload.sub };
  }

  function refresh(body: any): MockResponse {
    const result = verifyJwt(String(body?.refreshToken ?? ''), secret);
    if (!result.ok) {
      return error(
        401,
        result.reason === 'expired' ? 'refresh_token_expired' : 'invalid_refresh_token',
        'Sign in again',
      );
    }
    const record = refreshTokens.get(result.payload.jti);
    if (!record || revokedFamilies.has(record.family)) return error(401, 'session_revoked', 'Sign in again');
    if (record.usedAt) {
      // A client that lost the response may retry within a few seconds:
      // return the same new pair. Any later reuse means the token leaked.
      if (record.replacement && Date.now() - record.usedAt < 10_000) return json(record.replacement);
      revokedFamilies.add(record.family);
      return error(401, 'refresh_token_reused', 'Refresh token reuse detected, session revoked');
    }
    const pair = issue(record.userId, record.family);
    record.usedAt = Date.now();
    record.replacement = pair;
    return json(pair);
  }

  function handleAuth(path: string, body: any): MockResponse | null {
    switch (path) {
      case '/auth/login': {
        const userId = authenticate?.(body);
        return userId ? json(issue(userId)) : error(401, 'invalid_credentials', 'Wrong email or password');
      }
      case '/auth/device':
        return anonymous ? json(issue(anonymous())) : error(404, 'not_found', 'Not found');
      case '/auth/refresh':
        return refresh(body);
      case '/auth/logout': {
        const result = verifyJwt(String(body?.refreshToken ?? ''), secret);
        const record = result.ok ? refreshTokens.get(result.payload.jti) : undefined;
        if (record) revokedFamilies.add(record.family);
        return noContent();
      }
      default:
        return null;
    }
  }

  /* --- request handling --------------------------------------------------- */

  async function readRequest(input: RequestInfo | URL, init?: RequestInit) {
    const isRequest = typeof input === 'object' && input !== null && 'url' in input && 'method' in input;
    const request = isRequest ? input : null;
    const url = request ? request.url : String(input);
    const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
    const headers: Record<string, string> = {};
    const source = init?.headers ?? request?.headers;
    if (source) new Headers(source).forEach((value, key) => (headers[key.toLowerCase()] = value));
    let text = '';
    if (init?.body != null) text = String(init.body);
    else if (request && method !== 'GET' && method !== 'HEAD') text = await request.text();
    return { url, method, headers, text, signal: init?.signal ?? request?.signal ?? undefined };
  }

  function toResponse({ status, body, headers }: MockResponse): Response {
    const payload = status === 204 || body === undefined ? null : JSON.stringify(body);
    return new Response(payload, {
      status,
      headers: { ...(payload ? { 'Content-Type': 'application/json' } : null), ...headers },
    });
  }

  async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const req = await readRequest(input, init);
    const chaos = CHAOS[state.chaos];
    const [minLatency, maxLatency] = state.latencyMs;
    try {
      await sleep(minLatency + random() * (maxLatency - minLatency), req.signal ?? undefined);
    } catch {
      throw abortError();
    }
    if (random() < chaos.network) throw networkError();

    // React Native has no full URL implementation: parse the path by hand.
    const relative = req.url.startsWith(baseUrl) ? req.url.slice(baseUrl.length) : req.url;
    const [path, queryString = ''] = relative.split('?');
    const query: Record<string, string> = {};
    for (const pair of queryString.split('&').filter(Boolean)) {
      const [k, v = ''] = pair.split('=');
      query[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    }
    let body: any = undefined;
    try {
      body = req.text ? JSON.parse(req.text) : undefined;
    } catch {
      return toResponse(error(400, 'bad_request', 'Body is not valid JSON'));
    }

    if (path.startsWith('/auth/') && req.method === 'POST') {
      const auth = handleAuth(path, body);
      if (auth) return toResponse(auth);
    }

    const match = routes
      .filter((r) => r.method === req.method)
      .map((r) => ({ r, m: r.regex.exec(path) }))
      .find((x) => x.m);
    if (!match) return toResponse(error(404, 'not_found', `No route for ${req.method} ${path}`));

    let userId = '';
    if (!match.r.isPublic) {
      const auth = authorize(req.headers.authorization);
      if ('status' in auth) return toResponse(auth);
      userId = auth.userId;
    }

    // Faults that happen before the server does any work.
    if (random() < chaos.unavailable) {
      return toResponse(error(503, 'unavailable', 'Service temporarily unavailable'));
    }
    if (random() < chaos.rateLimited) {
      return toResponse({
        ...error(429, 'rate_limited', 'Too many requests'),
        headers: { 'Retry-After': '1' },
      });
    }

    const key = req.headers['idempotency-key'];
    const cacheKey = key ? `${userId}:${req.method}:${path}:${key}` : null;
    if (cacheKey && idempotency.has(cacheKey)) {
      const stored = idempotency.get(cacheKey)!;
      return toResponse({ ...stored, headers: { ...stored.headers, 'Idempotent-Replay': 'true' } });
    }

    const params: Record<string, string> = {};
    match.r.keys.forEach((k, i) => (params[k] = decodeURIComponent(match.m![i + 1])));
    let result: MockResponse;
    try {
      result = await match.r.handler({
        method: req.method,
        path,
        params,
        query,
        body,
        headers: req.headers,
        userId,
      });
    } catch (e) {
      result = error(500, 'internal', e instanceof Error ? e.message : 'Internal error');
    }

    if (cacheKey && result.status < 500) {
      idempotency.set(cacheKey, result);
      if (idempotency.size > 500) idempotency.delete(idempotency.keys().next().value!);
    }
    // The work is done, but the client never hears back. Only a retry with
    // the same Idempotency-Key gets the result without doing it twice.
    if (req.method !== 'GET' && random() < chaos.lostResponse) throw networkError();

    return toResponse(result);
  }

  const control: MockServerControl = {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setChaos: (level) => {
      state.chaos = level;
      emit();
    },
    expireAccessTokens: () => {
      accessEpoch++;
      emit();
    },
    revokeSessions: () => {
      refreshTokens.forEach((r) => revokedFamilies.add(r.family));
      accessEpoch++;
      emit();
    },
  };

  return { fetch: mockFetch, control };
}

/** Reads the initial chaos level from EXPO_PUBLIC_API_CHAOS (off, low, high). */
export function chaosFromEnv(fallback: ChaosLevel): ChaosLevel {
  const value = process.env.EXPO_PUBLIC_API_CHAOS;
  return value === 'off' || value === 'low' || value === 'high' ? value : fallback;
}
