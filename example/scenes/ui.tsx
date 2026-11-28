import { Ionicons } from '@expo/vector-icons';
import { MorphCloseButton } from 'expo-morph-menu';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDemo } from '../context/demo';

/** Header of a sheet screen: close button, title, and an optional action on the right. */
export function SheetHeader({
  title,
  color = '#1c1c1e',
  right,
}: {
  title: string;
  color?: string;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <MorphCloseButton accessibilityLabel="Close" />
      <Text style={[styles.title, { color }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

/** Pill at the top of a demo's home screen that goes back to the list of demos. */
export function BackToDemos({ dark = false }: { dark?: boolean }) {
  const { setScene } = useDemo();
  return (
    <Pressable
      onPress={() => setScene('basic')}
      style={[styles.back, { backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]}
      accessibilityRole="button"
      accessibilityLabel="All demos"
      hitSlop={8}
    >
      <Ionicons name="chevron-back" size={14} color={dark ? '#fff' : '#1c1c1e'} />
      <Text style={[styles.backText, { color: dark ? '#fff' : '#1c1c1e' }]}>Demos</Text>
    </Pressable>
  );
}

/** A colored circle with initials, for people in the demos. */
export function Initials({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  const letters = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.38 }}>{letters}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  right: { minWidth: 32, alignItems: 'flex-end' },
  back: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 8,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  backText: { fontSize: 13, fontWeight: '600' },
});
