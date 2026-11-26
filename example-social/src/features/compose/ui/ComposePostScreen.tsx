/**
 * Text composer.
 *
 * - The draft lives in the composer slice, so closing the sheet keeps it.
 * - "Post" sends `createPost`. The base query adds an Idempotency-Key and
 *   retries with backoff, so a lost response does not create two posts.
 * - On success the draft is cleared and `dismiss({ closeMenu: true })`
 *   collapses the sheet and the menu. On failure the sheet stays open with
 *   the error, and the draft is kept.
 * - The close button keeps `closeMenuOnDismiss: false` (the default): the
 *   menu stays open so the user can pick another action.
 *
 * Rendering: the screen itself does not read the draft text. `PostInput`
 * reads the text, `CharacterCount` reads the length, and the header reads a
 * boolean (`selectCanSubmitPost`). A keystroke renders the input and the
 * counter; the header renders only when the boolean flips.
 */

import { useMorphDismiss, useMorphSettled } from 'expo-morph-menu';
import { memo, useCallback } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { theme } from '../../../shared/theme';
import { Avatar } from '../../../shared/ui/Avatar';
import { errorText } from '../../../shared/ui/QueryState';
import { SheetHeader } from '../../../shared/ui/SheetHeader';
import { useAppDispatch, useAppSelector, useAppStore } from '../../../store/hooks';
import { useGetMeQuery } from '../../auth';
import { useCreatePostMutation } from '../../posts';
import {
  POST_LIMIT,
  composerActions,
  selectCanSubmitPost,
  selectPostDraft,
  selectPostLength,
} from '../model/composerSlice';

const PLACEHOLDER = 'What is happening?';
const FALLBACK_AVATAR = { name: 'You', color: theme.accent };

export function ComposePostScreen() {
  const store = useAppStore();
  const canSubmit = useAppSelector(selectCanSubmitPost);
  const { me } = useGetMeQuery(undefined, { selectFromResult: ({ data }) => ({ me: data }) });
  const [createPost, { isLoading, error }] = useCreatePostMutation();
  const dismiss = useMorphDismiss();

  const submit = useCallback(async () => {
    // Read the draft at submit time instead of subscribing to it.
    const text = selectPostDraft(store.getState()).trim();
    try {
      await createPost({ text }).unwrap();
      store.dispatch(composerActions.cleared('post'));
      dismiss({ closeMenu: true });
    } catch {
      // Shown below the input; the draft stays.
    }
  }, [store, createPost, dismiss]);

  return (
    <View style={styles.screen}>
      <SheetHeader
        title="New post"
        action={isLoading ? 'Posting' : 'Post'}
        onAction={submit}
        actionDisabled={isLoading || !canSubmit}
      />
      <View style={styles.row}>
        <Avatar user={me ?? FALLBACK_AVATAR} size={40} />
        <PostInput editable={!isLoading} />
      </View>
      {error ? <Text style={styles.error}>{errorText(error)}</Text> : null}
      <CharacterCount />
    </View>
  );
}

const PostInput = memo(function PostInput({ editable }: { editable: boolean }) {
  const dispatch = useAppDispatch();
  const text = useAppSelector(selectPostDraft);
  // Mount the input, and so the keyboard, after the expand animation: the
  // keyboard animation would otherwise run at the same time as the morph.
  const settled = useMorphSettled();
  const onChange = useCallback((value: string) => dispatch(composerActions.postChanged(value)), [dispatch]);

  if (!settled) {
    return <Text style={[styles.input, !text && styles.placeholder]}>{text || PLACEHOLDER}</Text>;
  }
  return (
    <TextInput
      autoFocus
      multiline
      value={text}
      onChangeText={onChange}
      placeholder={PLACEHOLDER}
      placeholderTextColor={theme.textMuted}
      style={styles.input}
      editable={editable}
      testID="compose-text"
    />
  );
});

const CharacterCount = memo(function CharacterCount() {
  const length = useAppSelector(selectPostLength);
  const left = POST_LIMIT - length;
  return (
    <View style={styles.footer}>
      <Text style={styles.muted}>{length > 0 ? 'Draft saved' : ''}</Text>
      <Text style={[styles.counter, left < 20 && { color: left < 0 ? theme.like : '#d97706' }]}>{left}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 8, flex: 1 },
  input: { flex: 1, fontSize: 18, lineHeight: 24, color: theme.text, textAlignVertical: 'top', paddingTop: 8 },
  placeholder: { color: theme.textMuted },
  error: { color: theme.like, paddingHorizontal: 16, paddingBottom: 8 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  muted: { color: theme.textMuted, fontSize: 13 },
  counter: { color: theme.textMuted, fontWeight: '600' },
});
