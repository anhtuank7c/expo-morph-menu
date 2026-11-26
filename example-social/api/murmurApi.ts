/**
 * Murmur API client (RTK Query).
 *
 * Server state lives in the RTK Query cache, keyed by endpoint and argument.
 * Mutations keep the cache consistent in one of three ways:
 *
 * - optimistic update with rollback (`setLike`, `setFollow`, `sendMessage`,
 *   `markNotificationsRead`, `markConversationRead`): patch every cached copy
 *   right away, undo the patches if the request fails;
 * - pessimistic insert (`createPost`): wait for the server, then insert the
 *   returned post into the cached feeds;
 * - tag invalidation (`openConversation`): mark cached data as stale and let
 *   RTK Query refetch it.
 */

import { createApi } from '@reduxjs/toolkit/query/react';

import { createBaseQuery } from '../../example-shared/api/baseQuery';
import type { TokenPair } from '../../example-shared/api/mockServer';
import { authActions } from '../../example-shared/store/authSlice';
import { API_BASE_URL, server } from './server';
import type {
  ConversationSummary,
  FeedTab,
  LiveSession,
  Message,
  NewPost,
  Notice,
  Page,
  Post,
  Thread,
  Trend,
  User,
} from './types';

type PatchResult = { undo: () => void };

export const murmurApi = createApi({
  reducerPath: 'api',
  baseQuery: createBaseQuery({ baseUrl: API_BASE_URL, fetchFn: server.fetch }),
  tagTypes: ['Me', 'Feed', 'Post', 'Replies', 'User', 'UserPosts', 'Notifications', 'Conversations', 'Thread', 'Live'],
  // Keep unused data for 2 minutes, refetch when the app returns to the foreground.
  keepUnusedDataFor: 120,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: (build) => ({
    /* --- auth ------------------------------------------------------------- */

    login: build.mutation<TokenPair, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        dispatch(authActions.signInStarted());
        try {
          const { data } = await queryFulfilled;
          dispatch(authActions.credentialsReceived(data));
        } catch (e) {
          const code = (e as { error?: { data?: { error?: string } } }).error?.data?.error;
          dispatch(authActions.signInFailed(code ?? 'network_error'));
        }
      },
    }),

    logout: build.mutation<null, void>({
      // queryFn: the request body comes from the store, not from the caller.
      async queryFn(_arg, api, _extra, baseQuery) {
        const refreshToken = (api.getState() as { auth: { refreshToken: string | null } }).auth.refreshToken;
        // Best effort: the local session ends even if the server is unreachable.
        await baseQuery({ url: '/auth/logout', method: 'POST', body: { refreshToken } });
        api.dispatch(authActions.signedOut());
        return { data: null };
      },
    }),

    getMe: build.query<User, void>({ query: () => '/me', providesTags: ['Me'] }),

    /* --- posts ------------------------------------------------------------ */

    getFeed: build.infiniteQuery<Page<Post>, FeedTab, string | null>({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
      query: ({ queryArg, pageParam }) => ({
        url: '/feed',
        params: { tab: queryArg, limit: 8, ...(pageParam ? { cursor: pageParam } : null) },
      }),
      providesTags: (_result, _error, tab) => [{ type: 'Feed', id: tab }],
    }),

    getPost: build.query<Post, string>({
      query: (id) => `/posts/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Post', id }],
    }),

    getReplies: build.query<Post[], string>({
      query: (id) => `/posts/${id}/replies`,
      providesTags: (_r, _e, id) => [{ type: 'Replies', id }],
    }),

    createPost: build.mutation<Post, NewPost>({
      query: (body) => ({ url: '/posts', method: 'POST', body }),
      // Pessimistic: insert the post the server created into both feeds.
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data: post } = await queryFulfilled;
        for (const tab of ['for_you', 'following'] as const) {
          dispatch(
            murmurApi.util.updateQueryData('getFeed', tab, (draft) => {
              draft.pages[0]?.items.unshift(post);
            }),
          );
        }
      },
      invalidatesTags: (post) => (post ? [{ type: 'UserPosts', id: post.author.handle }] : []),
    }),

    setLike: build.mutation<Post, { id: string; liked: boolean }>({
      query: ({ id, liked }) => ({ url: `/posts/${id}/like`, method: liked ? 'PUT' : 'DELETE' }),
      async onQueryStarted({ id, liked }, { dispatch, getState, queryFulfilled }) {
        const patches = patchPostEverywhere(dispatch, getState, id, (post) => {
          if (post.liked === liked) return;
          post.liked = liked;
          post.likeCount += liked ? 1 : -1;
        });
        try {
          const { data } = await queryFulfilled;
          // Replace the guess with the server's numbers.
          patchPostEverywhere(dispatch, getState, id, (post) => {
            post.liked = data.liked;
            post.likeCount = data.likeCount;
          });
        } catch {
          patches.forEach((p) => p.undo());
        }
      },
    }),

    vote: build.mutation<Post, { id: string; option: number }>({
      query: ({ id, option }) => ({ url: `/posts/${id}/votes`, method: 'POST', body: { option } }),
      async onQueryStarted({ id, option }, { dispatch, getState, queryFulfilled }) {
        const patches = patchPostEverywhere(dispatch, getState, id, (post) => {
          if (!post.poll || post.poll.votedOption !== null) return;
          post.poll.votedOption = option;
          post.poll.options[option].votes += 1;
        });
        try {
          const { data } = await queryFulfilled;
          patchPostEverywhere(dispatch, getState, id, (post) => {
            post.poll = data.poll;
          });
        } catch {
          patches.forEach((p) => p.undo());
        }
      },
    }),

    /* --- people ------------------------------------------------------------ */

    searchUsers: build.query<User[], string>({
      query: (q) => ({ url: '/users', params: { q } }),
      providesTags: (users = []) => users.map((u) => ({ type: 'User' as const, id: u.handle })),
    }),

    getUser: build.query<User, string>({
      query: (handle) => `/users/${handle}`,
      providesTags: (_r, _e, handle) => [{ type: 'User', id: handle }],
    }),

    getUserPosts: build.query<Post[], string>({
      query: (handle) => `/users/${handle}/posts`,
      providesTags: (_r, _e, handle) => [{ type: 'UserPosts', id: handle }],
    }),

    setFollow: build.mutation<User, { handle: string; follow: boolean }>({
      query: ({ handle, follow }) => ({ url: `/users/${handle}/follow`, method: follow ? 'PUT' : 'DELETE' }),
      async onQueryStarted({ handle, follow }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          murmurApi.util.updateQueryData('getUser', handle, (user) => {
            if (user.isFollowed === follow) return;
            user.isFollowed = follow;
            user.followers += follow ? 1 : -1;
          }),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(murmurApi.util.upsertQueryData('getUser', handle, data));
        } catch {
          patch.undo();
        }
      },
      // The "Following" feed depends on who you follow.
      invalidatesTags: [{ type: 'Feed', id: 'following' }],
    }),

    getTrends: build.query<Trend[], void>({ query: () => '/trends' }),

    /* --- notifications ---------------------------------------------------- */

    getNotifications: build.query<Notice[], void>({
      query: () => '/notifications',
      providesTags: ['Notifications'],
    }),

    markNotificationsRead: build.mutation<null, void>({
      query: () => ({ url: '/notifications/read', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          murmurApi.util.updateQueryData('getNotifications', undefined, (list) => {
            list.forEach((n) => (n.read = true));
          }),
        );
        queryFulfilled.catch(patch.undo);
      },
    }),

    /* --- messages ---------------------------------------------------------- */

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
        // Show the message at once, marked as sending (or reset a failed one).
        dispatch(
          murmurApi.util.updateQueryData('getThread', conversationId, (thread) => {
            const existing = thread.messages.find((m) => m.clientId === clientId);
            if (existing) existing.status = 'sending';
            else thread.messages.push({ id: clientId, clientId, from: 'me', text, createdAt: Date.now(), status: 'sending' });
          }),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            murmurApi.util.updateQueryData('getThread', conversationId, (thread) => {
              const index = thread.messages.findIndex((m) => m.clientId === clientId);
              const alreadyPolled = thread.messages.some((m) => m.id === data.id);
              if (index >= 0 && alreadyPolled) thread.messages.splice(index, 1);
              else if (index >= 0) thread.messages[index] = data;
            }),
          );
          dispatch(
            murmurApi.util.updateQueryData('getConversations', undefined, (list) => {
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
            murmurApi.util.updateQueryData('getThread', conversationId, (thread) => {
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
        const patches = [
          dispatch(
            murmurApi.util.updateQueryData('getConversations', undefined, (list) => {
              const c = list.find((x) => x.id === id);
              if (c) c.unread = 0;
            }),
          ),
          dispatch(
            murmurApi.util.updateQueryData('getThread', id, (thread) => {
              thread.conversation.unread = 0;
            }),
          ),
        ];
        queryFulfilled.catch(() => patches.forEach((p) => p.undo()));
      },
    }),

    /* --- live -------------------------------------------------------------- */

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

/**
 * Applies `recipe` to every cached copy of a post: both feeds (all pages),
 * the detail query, reply lists and profile lists. Returns the patches so the
 * caller can undo them.
 */
function patchPostEverywhere(
  dispatch: (action: any) => any,
  getState: () => unknown,
  id: string,
  recipe: (post: Post) => void,
): PatchResult[] {
  const state = getState() as Parameters<typeof murmurApi.util.selectCachedArgsForQuery>[0];
  const patches: PatchResult[] = [];
  const apply = (list: Post[]) => list.filter((p) => p.id === id).forEach(recipe);

  for (const tab of murmurApi.util.selectCachedArgsForQuery(state, 'getFeed')) {
    patches.push(dispatch(murmurApi.util.updateQueryData('getFeed', tab, (d) => d.pages.forEach((page) => apply(page.items)))));
  }
  for (const postId of murmurApi.util.selectCachedArgsForQuery(state, 'getPost')) {
    if (postId === id) patches.push(dispatch(murmurApi.util.updateQueryData('getPost', postId, recipe)));
  }
  for (const parent of murmurApi.util.selectCachedArgsForQuery(state, 'getReplies')) {
    patches.push(dispatch(murmurApi.util.updateQueryData('getReplies', parent, apply)));
  }
  for (const handle of murmurApi.util.selectCachedArgsForQuery(state, 'getUserPosts')) {
    patches.push(dispatch(murmurApi.util.updateQueryData('getUserPosts', handle, apply)));
  }
  return patches;
}

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useGetFeedInfiniteQuery,
  useGetPostQuery,
  useGetRepliesQuery,
  useCreatePostMutation,
  useSetLikeMutation,
  useVoteMutation,
  useSearchUsersQuery,
  useGetUserQuery,
  useGetUserPostsQuery,
  useSetFollowMutation,
  useGetTrendsQuery,
  useGetNotificationsQuery,
  useMarkNotificationsReadMutation,
  useGetConversationsQuery,
  useOpenConversationMutation,
  useGetThreadQuery,
  useSendMessageMutation,
  useMarkConversationReadMutation,
  useStartLiveMutation,
  useGetLiveQuery,
  useEndLiveMutation,
} = murmurApi;
