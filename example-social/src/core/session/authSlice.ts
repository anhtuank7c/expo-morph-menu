/**
 * Session state: tokens and their lifecycle.
 *
 *   signedOut ──signIn──> signingIn ──credentialsReceived──> signedIn
 *                              │                               │  ▲
 *                              └──signInFailed──> signedOut     │  └─tokensRefreshed (rotation)
 *                                                             sessionExpired / signedOut
 *                                                               ▼
 *                                                            signedOut (with a reason)
 *
 * The access token is attached to every request by the base query. Its
 * expiry is decoded from the JWT so the client can refresh it before it is
 * rejected. In a production app, persist the refresh token with
 * expo-secure-store; here the session lives in memory.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { decodeJwt } from '../http/jwt';
import type { TokenPair } from '../http/types';

export type AuthStatus = 'signedOut' | 'signingIn' | 'signedIn';

export type AuthState = {
  status: AuthStatus;
  userId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** Access token expiry, ms since epoch. */
  accessExpiresAt: number | null;
  /** Number of successful refreshes in this session, for the debug screen. */
  refreshCount: number;
  /** Why the last session ended or the last sign-in failed. */
  lastError: string | null;
};

const initialState: AuthState = {
  status: 'signedOut',
  userId: null,
  accessToken: null,
  refreshToken: null,
  accessExpiresAt: null,
  refreshCount: 0,
  lastError: null,
};

function applyTokens(state: AuthState, pair: TokenPair) {
  const payload = decodeJwt(pair.accessToken);
  state.accessToken = pair.accessToken;
  state.refreshToken = pair.refreshToken;
  state.accessExpiresAt = payload ? payload.exp * 1000 : Date.now() + pair.expiresIn * 1000;
  state.userId = payload?.sub ?? state.userId;
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signInStarted(state) {
      state.status = 'signingIn';
      state.lastError = null;
    },
    credentialsReceived(state, action: PayloadAction<TokenPair>) {
      applyTokens(state, action.payload);
      state.status = 'signedIn';
      state.refreshCount = 0;
      state.lastError = null;
    },
    signInFailed(state, action: PayloadAction<string>) {
      state.status = 'signedOut';
      state.lastError = action.payload;
    },
    tokensRefreshed(state, action: PayloadAction<TokenPair>) {
      applyTokens(state, action.payload);
      state.refreshCount += 1;
    },
    /** The refresh token was rejected: the user must sign in again. */
    sessionExpired(_state, action: PayloadAction<string>) {
      return { ...initialState, lastError: action.payload };
    },
    signedOut() {
      return initialState;
    },
  },
  selectors: {
    selectAuth: (state) => state,
    selectIsSignedIn: (state) => state.status === 'signedIn',
    selectAccessToken: (state) => state.accessToken,
    selectUserId: (state) => state.userId,
    selectLastAuthError: (state) => state.lastError,
  },
});

export const authActions = authSlice.actions;
export const { selectAuth, selectIsSignedIn, selectAccessToken, selectUserId, selectLastAuthError } =
  authSlice.selectors;
