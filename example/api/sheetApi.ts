/**
 * API client of the basic example (RTK Query).
 *
 * - `startSession` opens an anonymous session at app start (see SessionGate).
 * - `getSheet` loads the content of a sheet screen. The root layout calls
 *   `prefetch('getSheet', key)` from the menu's `onHover`, so the request
 *   starts while the finger is still moving over the row.
 */

import { createApi } from '@reduxjs/toolkit/query/react';

import { createBaseQuery } from '../../example-shared/api/baseQuery';
import type { TokenPair } from '../../example-shared/api/mockServer';
import { authActions } from '../../example-shared/store/authSlice';
import { API_BASE_URL, server, type SheetPayload } from './server';

export const sheetApi = createApi({
  reducerPath: 'api',
  baseQuery: createBaseQuery({ baseUrl: API_BASE_URL, fetchFn: server.fetch }),
  tagTypes: ['Sheet'],
  endpoints: (build) => ({
    startSession: build.mutation<TokenPair, void>({
      query: () => ({ url: '/auth/device', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        dispatch(authActions.signInStarted());
        try {
          const { data } = await queryFulfilled;
          dispatch(authActions.credentialsReceived(data));
        } catch {
          dispatch(authActions.signInFailed('network_error'));
        }
      },
    }),
    getSheet: build.query<SheetPayload, string>({
      query: (key) => `/sheets/${key}`,
      providesTags: (_r, _e, key) => [{ type: 'Sheet', id: key }],
      keepUnusedDataFor: 300,
    }),
  }),
});

export const { useStartSessionMutation, useGetSheetQuery } = sheetApi;
