/**
 * Client-only state: drafts of the compose screens.
 *
 * Drafts survive closing the sheet (the user can cancel, browse, and come
 * back to the same text) and are cleared after a successful post. Server
 * data never goes here; it lives in the RTK Query cache.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type PollDraft = { question: string; options: string[]; days: number };

type ComposerState = {
  post: string;
  poll: PollDraft;
  caption: string;
};

const emptyPoll: PollDraft = { question: '', options: ['', ''], days: 1 };

const initialState: ComposerState = { post: '', poll: emptyPoll, caption: '' };

export const composerSlice = createSlice({
  name: 'composer',
  initialState,
  reducers: {
    postChanged(state, action: PayloadAction<string>) {
      state.post = action.payload;
    },
    captionChanged(state, action: PayloadAction<string>) {
      state.caption = action.payload;
    },
    pollQuestionChanged(state, action: PayloadAction<string>) {
      state.poll.question = action.payload;
    },
    pollOptionChanged(state, action: PayloadAction<{ index: number; text: string }>) {
      state.poll.options[action.payload.index] = action.payload.text;
    },
    pollOptionAdded(state) {
      if (state.poll.options.length < 4) state.poll.options.push('');
    },
    pollOptionRemoved(state, action: PayloadAction<number>) {
      if (state.poll.options.length > 2) state.poll.options.splice(action.payload, 1);
    },
    pollDaysChanged(state, action: PayloadAction<number>) {
      state.poll.days = action.payload;
    },
    cleared(state, action: PayloadAction<'post' | 'poll' | 'caption'>) {
      if (action.payload === 'poll') state.poll = emptyPoll;
      else state[action.payload] = '';
    },
    reset: () => initialState,
  },
  selectors: {
    selectPostDraft: (state) => state.post,
    selectPollDraft: (state) => state.poll,
    selectCaptionDraft: (state) => state.caption,
  },
});

export const composerActions = composerSlice.actions;
export const { selectPostDraft, selectPollDraft, selectCaptionDraft } = composerSlice.selectors;
