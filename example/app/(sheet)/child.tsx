import { Stack, useLocalSearchParams } from 'expo-router';
import { useMorphDismiss } from 'expo-morph-menu';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

const BACK =
  Platform.OS === 'ios'
    ? 'The header back button and the left edge swipe'
    : Platform.OS === 'android'
      ? 'The header back button and the Android back button'
      : 'The header back button and the browser back button';

export default function Child() {
  const { from } = useLocalSearchParams<{ from: string }>();
  const dismiss = useMorphDismiss();
  return (
    <>
      <Stack.Screen options={{ title: 'Nested screen' }} />
      <View style={styles.root} testID="child-screen">
        <Text style={styles.text}>Pushed from {from}</Text>
        <Text style={styles.note}>
          This screen is in the nested Stack of MorphSheetLayout. {BACK} return to the previous
          screen, and the sheet stays open.
        </Text>
        <Text style={styles.note}>
          To close the whole sheet from here, call useMorphDismiss(). router.back() would only go back
          one screen.
        </Text>
        <Pressable style={styles.cta} onPress={() => dismiss()} testID="dismiss-sheet">
          <Text style={styles.ctaText}>Close the sheet</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  text: { fontSize: 18, fontWeight: '600', color: '#1c1c1e' },
  note: { fontSize: 14, color: '#636366', textAlign: 'center', lineHeight: 20 },
  cta: {
    backgroundColor: '#0a84ff',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 6,
  },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
