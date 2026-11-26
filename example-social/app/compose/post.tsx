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
 */

import { useMorphDismiss, useMorphSettled } from 'expo-morph-menu';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useCreatePostMutation, useGetMeQuery } from '../../api/murmurApi';
import { Avatar } from '../../components/Avatar';
import { errorText } from '../../components/QueryState';
import { SheetHeader } from '../../components/SheetHeader';
import { useAppDispatch, useAppSelector } from '../../store';
import { composerActions, selectPostDraft } from '../../store/composerSlice';
import { theme } from '../../theme';

const LIMIT = 280;

export default function ComposePost() {
  const dispatch = useAppDispatch();
  const text = useAppSelector(selectPostDraft);
  const { data: me } = useGetMeQuery();
  const [createPost, { isLoading, error }] = useCreatePostMutation();
  const dismiss = useMorphDismiss();
  // Focus the input only after the expand animation: the keyboard animation
  // would otherwise run at the same time as the morph.
  const settled = useMorphSettled();
  const left = LIMIT - text.length;

  const submit = async () => {
    try {
      await createPost({ text: text.trim() }).unwrap();
      dispatch(composerActions.cleared('post'));
      dismiss({ closeMenu: true });
    } catch {
      // Shown below the input; the draft stays.
    }
  };

  return (
    <View style={styles.screen}>
      <SheetHeader
        title="New post"
        action={isLoading ? 'Posting' : 'Post'}
        onAction={submit}
        actionDisabled={isLoading || !text.trim() || left < 0}
      />
      <View style={styles.row}>
        <Avatar user={me ?? { name: 'You', color: theme.accent }} size={40} />
        {settled ? (
          <TextInput
            autoFocus
            multiline
            value={text}
            onChangeText={(value) => dispatch(composerActions.postChanged(value))}
            placeholder="What is happening?"
            placeholderTextColor={theme.textMuted}
            style={styles.input}
            editable={!isLoading}
            testID="compose-text"
          />
        ) : (
          <Text style={[styles.input, !text && styles.placeholder]}>{text || 'What is happening?'}</Text>
        )}
      </View>
      {error ? <Text style={styles.error}>{errorText(error)}</Text> : null}
      <View style={styles.footer}>
        <Text style={styles.muted}>{text ? 'Draft saved' : ''}</Text>
        <Text style={[styles.counter, left < 20 && { color: left < 0 ? theme.like : '#d97706' }]}>{left}</Text>
      </View>
    </View>
  );
}

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
