/**
 * Typed hooks. Features import these instead of the store itself, so the
 * only runtime dependency on the store is the <Provider> in app/_layout.tsx.
 *
 * Select the smallest value a component needs. `useAppSelector` re-renders
 * when the selected value changes by reference, so selecting a whole slice
 * re-renders on every change in that slice.
 */

import { useDispatch, useSelector, useStore } from 'react-redux';

import type { AppDispatch, AppStore, RootState } from './index';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
/**
 * The store without a subscription. Use it to read state inside an event
 * handler (for example the draft text on submit) when the component does
 * not need to render when that state changes.
 */
export const useAppStore = useStore.withTypes<AppStore>();
