/**
 * The RTK Query API slice. It has no endpoints of its own: every feature adds
 * its endpoints with `api.injectEndpoints()` in `features/<name>/api/`.
 *
 * Server state lives in the RTK Query cache, keyed by endpoint and argument.
 * Mutations keep the cache consistent in one of three ways:
 *
 * - optimistic update with rollback: patch every cached copy right away,
 *   undo the patches if the request fails (likes, votes, follows, messages,
 *   read markers);
 * - pessimistic insert: wait for the server, then insert the returned
 *   resource into the cached lists (new posts);
 * - tag invalidation: mark cached data as stale and let RTK Query refetch it.
 *
 * Tags are declared here, so features can invalidate each other's data
 * without importing each other (for example following someone invalidates
 * the "Following" feed).
 */

import { createApi } from '@reduxjs/toolkit/query/react';

import { API_BASE_URL, server } from '../../backend';
import { createBaseQuery } from '../http/baseQuery';

export const api = createApi({
  reducerPath: 'api',
  // With a real backend, drop `fetchFn` and point `baseUrl` at your API.
  baseQuery: createBaseQuery({ baseUrl: API_BASE_URL, fetchFn: server.fetch }),
  tagTypes: ['Me', 'Feed', 'Post', 'Replies', 'User', 'UserPosts', 'Notifications', 'Conversations', 'Thread', 'Live'],
  // Keep unused data for 2 minutes, refetch when the app returns to the foreground.
  keepUnusedDataFor: 120,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});

export type PatchResult = { undo: () => void };
