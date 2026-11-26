/**
 * Redux store of the social example.
 *
 *   api        RTK Query cache: server data (posts, users, messages...)
 *   auth       session and tokens (shared with the basic example)
 *   network    log of HTTP attempts for the debug screen
 *   composer   drafts of the compose screens (client-only)
 */

import { combineSlices, configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { AppState } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { authActions, authSlice } from '../../example-shared/store/authSlice';
import { networkSlice } from '../../example-shared/store/networkSlice';
import { murmurApi } from '../api/murmurApi';
import { composerSlice } from './composerSlice';

const rootReducer = combineSlices(murmurApi, authSlice, networkSlice, composerSlice);

/**
 * Side effects that react to actions. When the session ends, cached server
 * data belongs to the previous user: drop it, and drop the drafts too.
 */
const listener = createListenerMiddleware();
listener.startListening({
  matcher: isAnyOf(authActions.signedOut, authActions.sessionExpired),
  effect: (_action, api) => {
    api.dispatch(murmurApi.util.resetApiState());
    api.dispatch(composerSlice.actions.reset());
  },
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) => getDefault().prepend(listener.middleware).concat(murmurApi.middleware),
});

/**
 * refetchOnFocus / refetchOnReconnect need focus events. React Native has no
 * window focus event, so map AppState to RTK Query's focus actions.
 */
setupListeners(store.dispatch, (dispatch, { onFocus, onFocusLost }) => {
  const subscription = AppState.addEventListener('change', (state) => {
    dispatch(state === 'active' ? onFocus() : onFocusLost());
  });
  return () => subscription.remove();
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
