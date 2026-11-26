/**
 * The mock backend. In a real app this is a separate server: the client only
 * reaches it through `fetch`. The app imports from here in two places only:
 * the API client (`server.fetch`, `API_BASE_URL`) and the debug screen
 * (`server.control`). The sign-in screen also reads the demo account to
 * prefill the form.
 */

export { API_BASE_URL, DEMO_ACCOUNT, server } from './server';
export type { ChaosLevel, MockServerControl } from './mockServer';
