/** Poll composer: question, 2 to 4 choices, duration. The draft lives in the composer slice. */

import { Ionicons } from '@expo/vector-icons';
import { useMorphDismiss } from 'expo-morph-menu';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useCreatePostMutation } from '../../api/murmurApi';
import { errorText } from '../../components/QueryState';
import { SheetHeader } from '../../components/SheetHeader';
import { useAppDispatch, useAppSelector } from '../../store';
import { composerActions, selectPollDraft } from '../../store/composerSlice';
import { theme } from '../../theme';

const DURATIONS = [1, 3, 7];

export default function ComposePoll() {
  const dispatch = useAppDispatch();
  const { question, options, days } = useAppSelector(selectPollDraft);
  const [createPost, { isLoading, error }] = useCreatePostMutation();
  const dismiss = useMorphDismiss();

  const filled = options.map((o) => o.trim()).filter(Boolean);
  const ready = question.trim().length > 0 && filled.length >= 2 && !isLoading;

  const submit = async () => {
    try {
      await createPost({ text: question.trim(), poll: { options: filled, days } }).unwrap();
      dispatch(composerActions.cleared('poll'));
      dismiss({ closeMenu: true });
    } catch {
      // Error shown under the form.
    }
  };

  return (
    <View style={styles.screen}>
      <SheetHeader title="New poll" action={isLoading ? 'Posting' : 'Post'} onAction={submit} actionDisabled={!ready} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          value={question}
          onChangeText={(text) => dispatch(composerActions.pollQuestionChanged(text))}
          placeholder="Ask a question"
          placeholderTextColor={theme.textMuted}
          style={styles.question}
          testID="poll-question"
        />
        {options.map((value, i) => (
          <View key={i} style={styles.optionRow}>
            <TextInput
              value={value}
              onChangeText={(text) => dispatch(composerActions.pollOptionChanged({ index: i, text }))}
              placeholder={`Choice ${i + 1}`}
              placeholderTextColor={theme.textMuted}
              style={styles.option}
              testID={`poll-option-${i}`}
            />
            {options.length > 2 && (
              <Pressable onPress={() => dispatch(composerActions.pollOptionRemoved(i))} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={theme.textMuted} />
              </Pressable>
            )}
          </View>
        ))}
        {options.length < 4 && (
          <Pressable style={styles.add} onPress={() => dispatch(composerActions.pollOptionAdded())}>
            <Ionicons name="add" size={18} color={theme.accent} />
            <Text style={styles.addText}>Add a choice</Text>
          </Pressable>
        )}
        <Text style={styles.label}>Poll length</Text>
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
        {error ? <Text style={styles.error}>{errorText(error)}</Text> : null}
      </ScrollView>
    </View>
  );
}

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
