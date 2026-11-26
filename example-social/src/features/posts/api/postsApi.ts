/**
 * Posts: feeds, detail, replies, posts of a user, and the mutations on them.
 */

import type { FeedTab, NewPost, Page, Post } from '../../../core/api/dto';
import { api, type PatchResult } from '../../../core/api/api';

export const postsApi = api.injectEndpoints({
  endpoints: (build) => ({
    /** Cursor pagination. Each tab is its own cache entry. */
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

    getUserPosts: build.query<Post[], string>({
      query: (handle) => `/users/${handle}/posts`,
      providesTags: (_r, _e, handle) => [{ type: 'UserPosts', id: handle }],
    }),

    createPost: build.mutation<Post, NewPost>({
      query: (body) => ({ url: '/posts', method: 'POST', body }),
      // Pessimistic: insert the post the server created into both feeds.
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data: post } = await queryFulfilled;
        for (const tab of ['for_you', 'following'] as const) {
          dispatch(
            postsApi.util.updateQueryData('getFeed', tab, (draft) => {
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
  }),
});

/**
 * Applies `recipe` to every cached copy of a post: both feeds (all pages),
 * the detail query, reply lists and profile lists. Returns the patches so the
 * caller can undo them.
 *
 * Immer only creates new objects for what the recipe changes, so the other
 * posts in a list keep their identity and their memoized rows do not render.
 */
function patchPostEverywhere(
  dispatch: (action: any) => any,
  getState: () => unknown,
  id: string,
  recipe: (post: Post) => void,
): PatchResult[] {
  const state = getState() as Parameters<typeof postsApi.util.selectCachedArgsForQuery>[0];
  const patches: PatchResult[] = [];
  const apply = (list: Post[]) => list.filter((p) => p.id === id).forEach(recipe);
  const { selectCachedArgsForQuery, updateQueryData } = postsApi.util;

  for (const tab of selectCachedArgsForQuery(state, 'getFeed')) {
    patches.push(dispatch(updateQueryData('getFeed', tab, (d) => d.pages.forEach((page) => apply(page.items)))));
  }
  for (const postId of selectCachedArgsForQuery(state, 'getPost')) {
    if (postId === id) patches.push(dispatch(updateQueryData('getPost', postId, recipe)));
  }
  for (const parent of selectCachedArgsForQuery(state, 'getReplies')) {
    patches.push(dispatch(updateQueryData('getReplies', parent, apply)));
  }
  for (const handle of selectCachedArgsForQuery(state, 'getUserPosts')) {
    patches.push(dispatch(updateQueryData('getUserPosts', handle, apply)));
  }
  return patches;
}

export const {
  useGetFeedInfiniteQuery,
  useGetPostQuery,
  useGetRepliesQuery,
  useGetUserPostsQuery,
  useCreatePostMutation,
} = postsApi;
