/**
 * Sign-in, sign-out and the current user.
 *
 * Tokens are stored by the session slice (core/session). The `login`
 * mutation moves it through signingIn, then signedIn or back to signedOut
 * with an error code; the root layout reacts to the new state.
 */

import type { User } from '../../../core/api/dto';
import { api } from '../../../core/api/api';
import type { TokenPair } from '../../../core/http/types';
import { authActions, type AuthState } from '../../../core/session/authSlice';

export type Credentials = { email: string; password: string };

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<TokenPair, Credentials>({
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
      async queryFn(_arg, { getState, dispatch }, _extra, baseQuery) {
        const { refreshToken } = (getState() as { auth: AuthState }).auth;
        // Best effort: the local session ends even if the server is unreachable.
        await baseQuery({ url: '/auth/logout', method: 'POST', body: { refreshToken } });
        dispatch(authActions.signedOut());
        return { data: null };
      },
    }),

    getMe: build.query<User, void>({ query: () => '/me', providesTags: ['Me'] }),
  }),
});

export const { useLoginMutation, useLogoutMutation, useGetMeQuery } = authApi;
