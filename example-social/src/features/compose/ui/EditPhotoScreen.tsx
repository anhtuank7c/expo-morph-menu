/**
 * Second step of the photo flow, pushed inside the sheet with the native
 * header. "Post photo" closes the whole sheet from this nested screen with
 * `useMorphDismiss()`; `router.back()` here would only return to the picker.
 */

import { useLocalSearchParams } from 'expo-router';
import { useMorphDismiss } from 'expo-morph-menu';
import { memo, useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../../../shared/theme';
import { Media } from '../../../shared/ui/Media';
import { errorText } from '../../../shared/ui/QueryState';
import { useAppDispatch, useAppSelector, useAppStore } from '../../../store/hooks';
import { useCreatePostMutation } from '../../posts';
import { GALLERY } from '../model/gallery';
import { composerActions, selectCaptionDraft } from '../model/composerSlice';

const RATIOS = [
  { label: 'Square', value: 1 },
  { label: '4:5', value: 4 / 5 },
  { label: '16:9', value: 16 / 9 },
];

export function EditPhotoScreen() {
  const { index } = useLocalSearchParams<{ index: string }>();
  const photo = GALLERY[Number(index)] ?? GALLERY[0];
  const [aspect, setAspect] = useState(1);
  const store = useAppStore();
  const [createPost, { isLoading, error }] = useCreatePostMutation();
  const dismiss = useMorphDismiss();
  const insets = useSafeAreaInsets();

  const submit = useCallback(async () => {
    const caption = selectCaptionDraft(store.getState()).trim();
    try {
      await createPost({ text: caption, media: { ...photo, aspect } }).unwrap();
      store.dispatch(composerActions.cleared('caption'));
      dismiss({ closeMenu: true });
    } catch {
      // Error shown above the button.
    }
  }, [store, createPost, photo, aspect, dismiss]);

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.stage}>
        <Media media={photo} style={[styles.photo, { aspectRatio: aspect }]} iconSize={64} />
      </View>
      <View style={styles.ratios}>
        {RATIOS.map((r) => (
          <Pressable
            key={r.label}
            onPress={() => setAspect(r.value)}
            style={[styles.chip, aspect === r.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, aspect === r.value && styles.chipTextActive]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>
      <CaptionInput />
      {error ? <Text style={styles.error}>{errorText(error)}</Text> : null}
      <Pressable style={[styles.post, isLoading && styles.busy]} disabled={isLoading} testID="photo-post" onPress={submit}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.postText}>Post photo</Text>}
      </Pressable>
    </View>
  );
}

/** Typing a caption renders this input only, not the photo preview. */
const CaptionInput = memo(function CaptionInput() {
  const dispatch = useAppDispatch();
  const caption = useAppSelector(selectCaptionDraft);
  return (
    <TextInput
      value={caption}
      onChangeText={(value) => dispatch(composerActions.captionChanged(value))}
      placeholder="Add a caption"
      placeholderTextColor={theme.textMuted}
      style={styles.caption}
    />
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background, gap: 14 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0a10', padding: 24 },
  photo: { width: '100%', maxHeight: '100%', borderRadius: 4 },
  ratios: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: theme.surface },
  chipActive: { backgroundColor: theme.text },
  chipText: { color: theme.text, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  caption: {
    marginHorizontal: 16,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.surface,
    color: theme.text,
    fontSize: 15,
  },
  error: { color: theme.like, marginHorizontal: 16 },
  post: { marginHorizontal: 16, height: 48, borderRadius: 24, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' },
  busy: { opacity: 0.7 },
  postText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
