/**
 * Redux store of the basic example: RTK Query cache, session, network log.
 */

import { combineSlices, configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { AppState } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { authActions, authSlice } from '../../example-shared/store/authSlice';
import { networkSlice } from '../../example-shared/store/networkSlice';
import { sheetApi } from '../api/sheetApi';

const rootReducer = combineSlices(sheetApi, authSlice, networkSlice);

/** A new session must not see data cached for the previous one. */
const listener = createListenerMiddleware();
listener.startListening({
  matcher: isAnyOf(authActions.signedOut, authActions.sessionExpired),
  effect: (_action, api) => {
    api.dispatch(sheetApi.util.resetApiState());
  },
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) => getDefault().prepend(listener.middleware).concat(sheetApi.middleware),
});

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
