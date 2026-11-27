/** Direct messages: conversation list, threads, sending, read markers. */

import type { ConversationSummary, Message, Thread } from '../../../core/api/dto';
import { api } from '../../../core/api/api';

export const messagesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getConversations: build.query<ConversationSummary[], void>({
      query: () => '/conversations',
      providesTags: ['Conversations'],
    }),

    openConversation: build.mutation<ConversationSummary, { userId: string }>({
      query: (body) => ({ url: '/conversations', method: 'POST', body }),
      invalidatesTags: ['Conversations'],
    }),

    getThread: build.query<Thread, string>({
      query: (id) => `/conversations/${id}/messages`,
      providesTags: (_r, _e, id) => [{ type: 'Thread', id }],
      // Keep messages that are still sending or failed when a poll result arrives.
      merge(current, incoming) {
        const local = current.messages.filter(
          (m) => m.status && !incoming.messages.some((s) => s.clientId && s.clientId === m.clientId),
        );
        return { ...incoming, messages: [...incoming.messages, ...local] };
      },
    }),

    sendMessage: build.mutation<Message, { conversationId: string; text: string; clientId: string }>({
      query: ({ conversationId, text, clientId }) => ({
        url: `/conversations/${conversationId}/messages`,
        method: 'POST',
        body: { text, clientId },
      }),
      async onQueryStarted({ conversationId, text, clientId }, { dispatch, queryFulfilled }) {
        const { updateQueryData } = messagesApi.util;
        // Show the message at once, marked as sending (or reset a failed one).
        dispatch(
          updateQueryData('getThread', conversationId, (thread) => {
            const existing = thread.messages.find((m) => m.clientId === clientId);
            if (existing) existing.status = 'sending';
            else
              thread.messages.push({
                id: clientId,
                clientId,
                from: 'me',
                text,
                createdAt: Date.now(),
                status: 'sending',
              });
          }),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            updateQueryData('getThread', conversationId, (thread) => {
              const index = thread.messages.findIndex((m) => m.clientId === clientId);
              const alreadyPolled = thread.messages.some((m) => m.id === data.id);
              if (index >= 0 && alreadyPolled) thread.messages.splice(index, 1);
              else if (index >= 0) thread.messages[index] = data;
            }),
          );
          dispatch(
            updateQueryData('getConversations', undefined, (list) => {
              const summary = list.find((c) => c.id === conversationId);
              if (summary) {
                summary.lastMessage = data;
                summary.updatedAt = data.createdAt;
              }
            }),
          );
        } catch {
          // Keep the message on screen with a "not delivered" state, so the user can retry.
          dispatch(
            updateQueryData('getThread', conversationId, (thread) => {
              const message = thread.messages.find((m) => m.clientId === clientId);
              if (message) message.status = 'failed';
            }),
          );
        }
      },
    }),

    markConversationRead: build.mutation<null, string>({
      query: (id) => ({ url: `/conversations/${id}/read`, method: 'POST' }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const { updateQueryData } = messagesApi.util;
        const patches = [
          dispatch(
            updateQueryData('getConversations', undefined, (list) => {
              const c = list.find((x) => x.id === id);
              if (c) c.unread = 0;
            }),
          ),
          dispatch(
            updateQueryData('getThread', id, (thread) => {
              thread.conversation.unread = 0;
            }),
          ),
        ];
        queryFulfilled.catch(() => patches.forEach((p) => p.undo()));
      },
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useOpenConversationMutation,
  useGetThreadQuery,
  useSendMessageMutation,
  useMarkConversationReadMutation,
} = messagesApi;

/**
 * Total unread messages, for the tab badge. `selectFromResult` returns a
 * number, so the tab layout renders only when the count changes, not on
 * every poll (a poll toggles `isFetching` twice even when nothing changed).
 */
export function useUnreadMessageCount(pollingInterval: number) {
  return useGetConversationsQuery(undefined, {
    pollingInterval,
    selectFromResult: ({ data }) => ({ count: data?.reduce((sum, c) => sum + c.unread, 0) ?? 0 }),
  }).count;
}
