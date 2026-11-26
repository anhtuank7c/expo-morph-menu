/**
 * Redux store: the composition root of the app state.
 *
 *   api        RTK Query cache: server data, endpoints injected by each feature
 *   auth       session and tokens (core/session)
 *   network    log of HTTP attempts for the debug screen (core/http)
 *   composer   drafts of the compose screens, client-only (features/compose)
 */

import { combineSlices, configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { AppState } from 'react-native';

import { api } from '../core/api/api';
import { networkSlice } from '../core/http/networkLog';
import { authActions, authSlice } from '../core/session/authSlice';
import { composerSlice } from '../features/compose/model/composerSlice';

const rootReducer = combineSlices(api, authSlice, networkSlice, composerSlice);

/**
 * Side effects that react to actions. When the session ends, cached server
 * data belongs to the previous user: drop it, and drop the drafts too.
 */
const listener = createListenerMiddleware();
listener.startListening({
  matcher: isAnyOf(authActions.signedOut, authActions.sessionExpired),
  effect: (_action, { dispatch }) => {
    dispatch(api.util.resetApiState());
    dispatch(composerSlice.actions.reset());
  },
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) => getDefault().prepend(listener.middleware).concat(api.middleware),
});

/**
 * refetchOnFocus and refetchOnReconnect need focus events. React Native has
 * no window focus event, so AppState is mapped to RTK Query's focus actions.
 */
setupListeners(store.dispatch, (dispatch, { onFocus, onFocusLost }) => {
  const subscription = AppState.addEventListener('change', (state) => {
    dispatch(state === 'active' ? onFocus() : onFocusLost());
  });
  return () => subscription.remove();
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
