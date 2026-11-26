/** Notifications and the read marker. */

import type { Notice } from '../../../core/api/dto';
import { api } from '../../../core/api/api';

export const notificationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<Notice[], void>({
      query: () => '/notifications',
      providesTags: ['Notifications'],
    }),

    markNotificationsRead: build.mutation<null, void>({
      query: () => ({ url: '/notifications/read', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          notificationsApi.util.updateQueryData('getNotifications', undefined, (list) => {
            list.forEach((n) => (n.read = true));
          }),
        );
        queryFulfilled.catch(patch.undo);
      },
    }),
  }),
});

export const { useGetNotificationsQuery, useMarkNotificationsReadMutation } = notificationsApi;

/** Unread count for the tab badge. Renders the caller only when the count changes. */
export function useUnreadNoticeCount(pollingInterval: number) {
  return useGetNotificationsQuery(undefined, {
    pollingInterval,
    selectFromResult: ({ data }) => ({ count: data?.filter((n) => !n.read).length ?? 0 }),
  }).count;
}
