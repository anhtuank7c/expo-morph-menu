/**
 * Client-only state: drafts of the compose screens.
 *
 * Drafts survive closing the sheet (the user can cancel, browse, and come
 * back to the same text) and are cleared after a successful post. Server
 * data never goes here; it lives in the RTK Query cache.
 *
 * Selectors return the smallest value a component needs (one poll option,
 * a length, a boolean), so a keystroke in one field renders only the
 * components that read that field.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export const POST_LIMIT = 280;
export const POLL_MAX_OPTIONS = 4;

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
      if (state.poll.options.length < POLL_MAX_OPTIONS) state.poll.options.push('');
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
    selectPostLength: (state) => state.post.length,
    selectCanSubmitPost: (state) => state.post.trim().length > 0 && state.post.length <= POST_LIMIT,
    selectCaptionDraft: (state) => state.caption,
    selectPollDraft: (state) => state.poll,
    selectPollQuestion: (state) => state.poll.question,
    selectPollOption: (state, index: number) => state.poll.options[index],
    selectPollOptionCount: (state) => state.poll.options.length,
    selectPollDays: (state) => state.poll.days,
    selectCanSubmitPoll: (state) =>
      state.poll.question.trim().length > 0 && state.poll.options.filter((o) => o.trim()).length >= 2,
  },
});

export const composerActions = composerSlice.actions;
export const {
  selectPostDraft,
  selectPostLength,
  selectCanSubmitPost,
  selectCaptionDraft,
  selectPollDraft,
  selectPollQuestion,
  selectPollOption,
  selectPollOptionCount,
  selectPollDays,
  selectCanSubmitPoll,
} = composerSlice.selectors;
