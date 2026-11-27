/**
 * Poll composer: question, 2 to 4 choices, duration. The draft lives in the
 * composer slice.
 *
 * Rendering: each field subscribes to its own value (`PollOption` selects one
 * option by index), so typing in one choice renders only that row. The
 * screen reads the number of options and one boolean for the "Post" button.
 */

import { Ionicons } from '@expo/vector-icons';
import { useMorphDismiss } from 'expo-morph-menu';
import { memo, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { theme } from '../../../shared/theme';
import { errorText } from '../../../shared/ui/QueryState';
import { SheetHeader } from '../../../shared/ui/SheetHeader';
import { useAppDispatch, useAppSelector, useAppStore } from '../../../store/hooks';
import { useCreatePostMutation } from '../../posts';
import {
  POLL_MAX_OPTIONS,
  composerActions,
  selectCanSubmitPoll,
  selectPollDays,
  selectPollDraft,
  selectPollOption,
  selectPollOptionCount,
  selectPollQuestion,
} from '../model/composerSlice';

const DURATIONS = [1, 3, 7];

export function ComposePollScreen() {
  const store = useAppStore();
  const dispatch = useAppDispatch();
  const optionCount = useAppSelector(selectPollOptionCount);
  const canSubmit = useAppSelector(selectCanSubmitPoll);
  const [createPost, { isLoading, error }] = useCreatePostMutation();
  const dismiss = useMorphDismiss();

  const submit = useCallback(async () => {
    const { question, options, days } = selectPollDraft(store.getState());
    try {
      await createPost({
        text: question.trim(),
        poll: { options: options.map((o) => o.trim()).filter(Boolean), days },
      }).unwrap();
      store.dispatch(composerActions.cleared('poll'));
      dismiss({ closeMenu: true });
    } catch {
      // Error shown under the form.
    }
  }, [store, createPost, dismiss]);

  return (
    <View style={styles.screen}>
      <SheetHeader
        title="New poll"
        action={isLoading ? 'Posting' : 'Post'}
        onAction={submit}
        actionDisabled={!canSubmit || isLoading}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PollQuestion />
        {Array.from({ length: optionCount }, (_, i) => (
          <PollOption key={i} index={i} removable={optionCount > 2} />
        ))}
        {optionCount < POLL_MAX_OPTIONS && (
          <Pressable style={styles.add} onPress={() => dispatch(composerActions.pollOptionAdded())}>
            <Ionicons name="add" size={18} color={theme.accent} />
            <Text style={styles.addText}>Add a choice</Text>
          </Pressable>
        )}
        <Text style={styles.label}>Poll length</Text>
        <PollDuration />
        {error ? <Text style={styles.error}>{errorText(error)}</Text> : null}
      </ScrollView>
    </View>
  );
}

const PollQuestion = memo(function PollQuestion() {
  const dispatch = useAppDispatch();
  const question = useAppSelector(selectPollQuestion);
  return (
    <TextInput
      value={question}
      onChangeText={(text) => dispatch(composerActions.pollQuestionChanged(text))}
      placeholder="Ask a question"
      placeholderTextColor={theme.textMuted}
      style={styles.question}
      testID="poll-question"
    />
  );
});

const PollOption = memo(function PollOption({ index, removable }: { index: number; removable: boolean }) {
  const dispatch = useAppDispatch();
  const value = useAppSelector((state) => selectPollOption(state, index));
  return (
    <View style={styles.optionRow}>
      <TextInput
        value={value}
        onChangeText={(text) => dispatch(composerActions.pollOptionChanged({ index, text }))}
        placeholder={`Choice ${index + 1}`}
        placeholderTextColor={theme.textMuted}
        style={styles.option}
        testID={`poll-option-${index}`}
      />
      {removable && (
        <Pressable onPress={() => dispatch(composerActions.pollOptionRemoved(index))} hitSlop={8}>
          <Ionicons name="close-circle" size={22} color={theme.textMuted} />
        </Pressable>
      )}
    </View>
  );
});

const PollDuration = memo(function PollDuration() {
  const dispatch = useAppDispatch();
  const days = useAppSelector(selectPollDays);
  return (
    <View style={styles.durations}>
      {DURATIONS.map((d) => (
        <Pressable
          key={d}
          onPress={() => dispatch(composerActions.pollDaysChanged(d))}
          style={[styles.chip, days === d && styles.chipActive]}
        >
          <Text style={[styles.chipText, days === d && styles.chipTextActive]}>
            {d} {d === 1 ? 'day' : 'days'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16, gap: 10 },
  question: { fontSize: 20, fontWeight: '600', color: theme.text, paddingVertical: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  option: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    color: theme.text,
    fontSize: 15,
  },
  add: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addText: { color: theme.accent, fontWeight: '600' },
  label: { marginTop: 12, fontWeight: '700', color: theme.text },
  durations: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.surface },
  chipActive: { backgroundColor: theme.accent },
  chipText: { color: theme.text, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  error: { color: theme.like, marginTop: 8 },
});
