/** Live broadcasts. */

import type { LiveSession } from '../../../core/api/dto';
import { api } from '../../../core/api/api';

export const liveApi = api.injectEndpoints({
  endpoints: (build) => ({
    startLive: build.mutation<LiveSession, { title: string }>({
      query: (body) => ({ url: '/live', method: 'POST', body }),
    }),
    getLive: build.query<LiveSession, string>({
      query: (id) => `/live/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Live', id }],
    }),
    endLive: build.mutation<null, string>({
      query: (id) => ({ url: `/live/${id}`, method: 'DELETE' }),
    }),
  }),
});

export const { useStartLiveMutation, useGetLiveQuery, useEndLiveMutation } = liveApi;
