/**
 * Log of HTTP attempts, written by the base query and shown on the Network
 * debug screen. One entry per attempt, so retries and refreshes are visible.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type NetworkOutcome = number | 'network' | 'timeout' | 'aborted';

export type NetworkEntry = {
  id: number;
  method: string;
  url: string;
  /** 0 for the first attempt, 1 for the first retry, and so on. */
  attempt: number;
  startedAt: number;
  durationMs?: number;
  outcome?: NetworkOutcome;
  /** What the client did next: "retry in 640 ms", "refresh token", "replayed". */
  note?: string;
};

type NetworkState = { entries: NetworkEntry[] };

const initialState: NetworkState = { entries: [] };

const LIMIT = 80;

/** Entry ids are assigned in prepare(), so the base query knows the id of the entry it started. */
let nextEntryId = 1;

export const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    requestStarted: {
      reducer(state, action: PayloadAction<Omit<NetworkEntry, 'id'> & { id: number }>) {
        state.entries.unshift(action.payload);
        if (state.entries.length > LIMIT) state.entries.pop();
      },
      prepare(entry: Omit<NetworkEntry, 'id'>) {
        return { payload: { ...entry, id: nextEntryId++ } };
      },
    },
    requestFinished(state, action: PayloadAction<{ id: number; outcome: NetworkOutcome; note?: string }>) {
      const entry = state.entries.find((e) => e.id === action.payload.id);
      if (!entry) return;
      entry.outcome = action.payload.outcome;
      entry.durationMs = Date.now() - entry.startedAt;
      if (action.payload.note) entry.note = action.payload.note;
    },
    annotated(state, action: PayloadAction<{ id: number; note: string }>) {
      const entry = state.entries.find((e) => e.id === action.payload.id);
      if (entry) entry.note = action.payload.note;
    },
    cleared(state) {
      state.entries = [];
    },
  },
  selectors: {
    selectNetworkEntries: (state) => state.entries,
  },
});

export const networkActions = networkSlice.actions;
export const { selectNetworkEntries } = networkSlice.selectors;
