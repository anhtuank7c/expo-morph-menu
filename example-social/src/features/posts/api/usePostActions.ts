import { useMemo } from 'react';

import { useAppDispatch } from '../../../store/hooks';
import { postsApi } from './postsApi';

/**
 * Like and vote, as stable callbacks.
 *
 * `useSetLikeMutation()` in every row would subscribe each row to its own
 * mutation state and re-render it when that state changes. The rows do not
 * read the mutation state: the optimistic update in `onQueryStarted` changes
 * the post itself, which is what the row renders. So the mutation is
 * dispatched directly, with `track: false` to keep its result out of the
 * store.
 */
export function usePostActions() {
  const dispatch = useAppDispatch();
  return useMemo(
    () => ({
      setLike: (id: string, liked: boolean) =>
        void dispatch(postsApi.endpoints.setLike.initiate({ id, liked }, { track: false })),
      vote: (id: string, option: number) =>
        void dispatch(postsApi.endpoints.vote.initiate({ id, option }, { track: false })),
    }),
    [dispatch],
  );
}

export type PostActions = ReturnType<typeof usePostActions>;
