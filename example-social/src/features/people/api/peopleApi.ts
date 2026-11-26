/** People: search, profiles, follow, and trending topics. */

import type { Trend, User } from '../../../core/api/dto';
import { api } from '../../../core/api/api';

export const peopleApi = api.injectEndpoints({
  endpoints: (build) => ({
    /** Each distinct query is its own cache entry, so typing back to an earlier query is answered from cache. */
    searchUsers: build.query<User[], string>({
      query: (q) => ({ url: '/users', params: { q } }),
      providesTags: (users = []) => users.map((u) => ({ type: 'User' as const, id: u.handle })),
    }),

    getUser: build.query<User, string>({
      query: (handle) => `/users/${handle}`,
      providesTags: (_r, _e, handle) => [{ type: 'User', id: handle }],
    }),

    setFollow: build.mutation<User, { handle: string; follow: boolean }>({
      query: ({ handle, follow }) => ({ url: `/users/${handle}/follow`, method: follow ? 'PUT' : 'DELETE' }),
      async onQueryStarted({ handle, follow }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          peopleApi.util.updateQueryData('getUser', handle, (user) => {
            if (user.isFollowed === follow) return;
            user.isFollowed = follow;
            user.followers += follow ? 1 : -1;
          }),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(peopleApi.util.upsertQueryData('getUser', handle, data));
        } catch {
          patch.undo();
        }
      },
      // The "Following" feed depends on who you follow.
      invalidatesTags: [{ type: 'Feed', id: 'following' }],
    }),

    getTrends: build.query<Trend[], void>({ query: () => '/trends' }),
  }),
});

export const { useSearchUsersQuery, useGetUserQuery, useSetFollowMutation, useGetTrendsQuery } = peopleApi;
