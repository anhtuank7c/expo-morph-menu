/**
 * Scenario tests for the mock backend and the RTK Query base query.
 *
 *   npm run test:api
 *
 * The TypeScript sources of the data layer (src/core/http, src/core/session
 * and the generic mock server) are transpiled to CommonJS in test/.build
 * (git-ignored), then exercised with a real Redux store. Faults are injected
 * with a scripted random source, so every run takes the same path.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const repo = path.resolve(__dirname, '../..');
const src = path.resolve(__dirname, '../src');
const ts = require(path.join(repo, 'node_modules/typescript'));
const build = path.join(__dirname, '.build');
const SOURCES = [
  'core/http/backoff.ts',
  'core/http/jwt.ts',
  'core/http/types.ts',
  'core/http/networkLog.ts',
  'core/http/baseQuery.ts',
  'core/session/authSlice.ts',
  'backend/mockServer.ts',
];
for (const file of SOURCES) {
  const { outputText } = ts.transpileModule(fs.readFileSync(path.join(src, file), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const out = path.join(build, file.replace(/.ts$/, '.js'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, outputText);
}

const { configureStore, combineSlices } = require('@reduxjs/toolkit');
const { createApi } = require('@reduxjs/toolkit/query');
const { createMockServer, route, json } = require('./.build/backend/mockServer');
const { createBaseQuery } = require('./.build/core/http/baseQuery');
const { authSlice, authActions } = require('./.build/core/session/authSlice');
const { networkSlice } = require('./.build/core/http/networkLog');

const BASE = 'https://api.test/v1';

/**
 * Scripted random source for the mock server. Each request draws, in order:
 * latency, network error, 503, 429, and (for writes) lost response. A value
 * below the fault's probability triggers it. Empty script: 0.99, no faults.
 */
const script = [];
const scripted = () => (script.length ? script.shift() : 0.99);

let created = 0;

function setup() {
  script.length = 0;
  created = 0;
  const server = createMockServer({
    baseUrl: BASE,
    secret: 'test',
    latencyMs: [1, 3],
    accessTtlSec: 60,
    random: scripted,
    authenticate: (body) => (body.email === 'a' && body.password === 'b' ? 'u1' : null),
    routes: [
      route('GET', '/items/:id', ({ params, userId }) => json({ id: params.id, userId })),
      route('POST', '/items', ({ body }) => {
        created++;
        return json({ id: `n${created}`, ...body }, 201);
      }),
    ],
  });
  let refreshCalls = 0;
  const fetchFn = async (input, init) => {
    if (String(input.url ?? input).endsWith('/auth/refresh')) refreshCalls++;
    return server.fetch(input, init);
  };
  const api = createApi({
    reducerPath: 'api',
    baseQuery: createBaseQuery({ baseUrl: BASE, fetchFn, backoff: { baseMs: 5, capMs: 20 } }),
    endpoints: (b) => ({
      login: b.mutation({ query: (body) => ({ url: '/auth/login', method: 'POST', body }) }),
      item: b.query({ query: (id) => `/items/${id}` }),
      create: b.mutation({ query: (body) => ({ url: '/items', method: 'POST', body }) }),
    }),
  });
  const store = configureStore({
    reducer: combineSlices(api, authSlice, networkSlice),
    middleware: (g) => g({ serializableCheck: false }).concat(api.middleware),
  });
  const login = async () => {
    const result = await store.dispatch(api.endpoints.login.initiate({ email: 'a', password: 'b' }));
    store.dispatch(authActions.credentialsReceived(result.data));
  };
  const attemptsFor = (url) => store.getState().network.entries.filter((e) => e.url === url);
  return { server, api, store, login, attemptsFor, refreshCalls: () => refreshCalls };
}

/** Runs `fn` with Date.now shifted by `ms`. */
async function withClockShift(ms, fn) {
  const realNow = Date.now;
  Date.now = () => realNow() + ms;
  try {
    return await fn();
  } finally {
    Date.now = realNow;
  }
}

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push(`PASS  ${name}`);
  } catch (e) {
    results.push(`FAIL  ${name}\n      ${e.message}`);
  }
}

(async () => {
  await test('login stores tokens and authorized GET works', async () => {
    const { api, store, login } = setup();
    await login();
    assert.equal(store.getState().auth.status, 'signedIn');
    const r = await store.dispatch(api.endpoints.item.initiate('1'));
    assert.deepEqual(r.data, { id: '1', userId: 'u1' });
  });

  await test('wrong password is a 401 without retries', async () => {
    const { api, store } = setup();
    const r = await store.dispatch(api.endpoints.login.initiate({ email: 'a', password: 'x' }));
    assert.equal(r.error.status, 401);
    assert.equal(r.error.data.error, 'invalid_credentials');
    assert.equal(store.getState().network.entries.length, 1);
  });

  await test('expired token: 5 parallel requests share one refresh, all succeed', async () => {
    const { api, store, login, server, refreshCalls } = setup();
    await login();
    server.control.expireAccessTokens();
    const all = await Promise.all(
      ['a', 'b', 'c', 'd', 'e'].map((id) => store.dispatch(api.endpoints.item.initiate(id))),
    );
    assert.ok(
      all.every((r) => r.data),
      'all requests succeed',
    );
    assert.equal(refreshCalls(), 1, `refresh calls: ${refreshCalls()}`);
    assert.equal(store.getState().auth.refreshCount, 1);
  });

  await test('proactive refresh when the token is about to expire', async () => {
    const { api, store, login, refreshCalls } = setup();
    await login();
    // 58 s later, the 60 s access token is inside the 5 s refresh margin.
    const r = await withClockShift(58_000, () => store.dispatch(api.endpoints.item.initiate('p')));
    assert.ok(r.data);
    assert.equal(refreshCalls(), 1);
  });

  await test('revoked session: refresh fails and the session ends', async () => {
    const { api, store, login, server } = setup();
    await login();
    server.control.revokeSessions();
    const r = await store.dispatch(api.endpoints.item.initiate('x'));
    assert.equal(r.error.status, 401);
    assert.equal(store.getState().auth.status, 'signedOut');
    assert.equal(store.getState().auth.lastError, 'session_revoked');
  });

  await test('refresh token reuse revokes the session', async () => {
    const { server } = setup();
    const post = (url, body) =>
      server.fetch(`${BASE}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    const pair = await (await post('/auth/login', { email: 'a', password: 'b' })).json();
    const first = await post('/auth/refresh', { refreshToken: pair.refreshToken });
    assert.equal(first.status, 200);
    const quickRetry = await post('/auth/refresh', { refreshToken: pair.refreshToken });
    assert.equal(quickRetry.status, 200, 'a quick retry gets the same pair (grace period)');
    await withClockShift(15_000, async () => {
      const reuse = await post('/auth/refresh', { refreshToken: pair.refreshToken });
      assert.equal(reuse.status, 401);
      assert.equal((await reuse.json()).error, 'refresh_token_reused');
      const next = await first.json();
      const afterRevoke = await post('/auth/refresh', { refreshToken: next.refreshToken });
      assert.equal((await afterRevoke.json()).error, 'session_revoked', 'the whole family is revoked');
    });
  });

  await test('network error and 503 are retried with backoff', async () => {
    const { api, store, login, server, attemptsFor } = setup();
    await login();
    server.control.setChaos('high');
    // Attempt 1: network error. Attempt 2: 503. Attempt 3: success.
    script.push(0.5, 0.01, 0.5, 0.5, 0.01);
    const r = await store.dispatch(api.endpoints.item.initiate('r'));
    assert.ok(r.data, JSON.stringify(r.error));
    const attempts = attemptsFor('/items/r');
    assert.equal(attempts.length, 3, `attempts: ${attempts.length}`);
    assert.deepEqual(
      attempts.map((e) => e.outcome),
      [200, 503, 'network'],
    );
    assert.ok(attempts.slice(1).every((e) => /retry in/.test(e.note ?? '')));
  });

  await test('lost response on POST: retry replays, resource created once', async () => {
    const { api, store, login, server, attemptsFor } = setup();
    await login();
    server.control.setChaos('high');
    // Attempt 1: the server commits, then the response is lost.
    script.push(0.5, 0.99, 0.99, 0.99, 0.01);
    const r = await store.dispatch(api.endpoints.create.initiate({ name: 'x' }));
    assert.ok(r.data, JSON.stringify(r.error));
    assert.equal(r.data.id, 'n1');
    assert.equal(created, 1, `created ${created} times`);
    assert.ok(attemptsFor('/items').some((e) => e.note === 'replayed stored response'));
  });

  await test('429 honors Retry-After', async () => {
    const { api, store, login, server, attemptsFor } = setup();
    await login();
    server.control.setChaos('high');
    // Attempt 1: 429 with Retry-After: 1.
    script.push(0.5, 0.99, 0.99, 0.01);
    const started = Date.now();
    const r = await store.dispatch(api.endpoints.item.initiate('rl'));
    assert.ok(r.data);
    assert.ok(Date.now() - started >= 950, `waited ${Date.now() - started} ms`);
    assert.match(attemptsFor('/items/rl').pop().note ?? '', /Retry-After/);
  });

  await test('404 is not retried', async () => {
    const { api, store, login } = setup();
    await login();
    const r = await store.dispatch(api.endpoints.item.initiate('../nope/x'));
    assert.equal(r.error.status, 404);
    assert.equal(store.getState().network.entries.filter((e) => e.outcome === 404).length, 1);
  });

  console.log(results.join('\n'));
  process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
})();
