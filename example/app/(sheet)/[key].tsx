import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams } from 'expo-router';
import { MorphCloseButton, useMorph, useMorphSettled } from 'expo-morph-menu';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from '../../components/Skeleton';
import { useDemo } from '../../context/demo';
import { findScene } from '../../scenes';
import { findDemo } from '../../data/items';
import { useSheetData } from '../../data/sheetData';

/** Lists the ways to close this screen that are enabled in the config. */
function closeHint(d: { edgeSwipe: boolean; dragDown: boolean }) {
  const ways = [
    'the close button',
    Platform.OS === 'android' && 'the back button',
    Platform.OS === 'web' && 'Esc or the browser back button',
    d.edgeSwipe && 'a swipe from the left edge',
    d.dragDown && 'dragging down',
  ].filter(Boolean);
  return `Close with ${ways.join(', ')}. Every way runs the same collapse animation back into the card.`;
}

const PREFETCHED_MS = 80;

/** The screen of a row: the basic one below, or the running scene's own. */
export default function SheetRoute() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const Scene = findScene(useDemo().scene)?.Screen;
  return Scene ? <Scene itemKey={key} /> : <SheetRoot />;
}

function SheetRoot() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const item = findDemo(key);
  const insets = useSafeAreaInsets();
  const settled = useMorphSettled();
  const { config } = useMorph();
  const { data, waitedMs } = useSheetData(item.key);

  // Render the content once the container has stopped moving and the data is here.
  const ready = settled && data !== null;
  const prefetched = waitedMs !== null && waitedMs < PREFETCHED_MS;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        {/* The icon comes from `closeIcon` on MorphProvider (app/_layout.tsx). */}
        <MorphCloseButton accessibilityLabel="Close" />
        <View style={styles.title}>
          <View style={[styles.icon, { backgroundColor: item.tint }]}>
            <Ionicons name={item.glyph} size={15} color="#fff" />
          </View>
          <Text style={styles.titleText}>{item.label}</Text>
        </View>
        <View style={styles.ghost} />
      </View>

      {ready ? (
        <ScrollView
          testID="sheet-content"
          // The container reaches the bottom edge, so leave room for the home indicator.
          contentContainerStyle={[styles.body, { paddingBottom: 24 + insets.bottom }]}
        >
          <Text style={styles.route}>/(sheet)/[key]?key={item.key}</Text>
          <Text style={styles.para}>{data.summary}</Text>

          <View style={styles.badge}>
            <Ionicons
              name={prefetched ? 'flash' : 'hourglass-outline'}
              size={14}
              color={prefetched ? '#30d158' : '#8e8e93'}
            />
            <Text style={styles.badgeText}>
              {prefetched
                ? `Waited ${waitedMs} ms. Loading started on hover.`
                : `Waited ${waitedMs} ms. Loading started when the screen opened.`}
            </Text>
          </View>

          <Text style={styles.heading}>What happened</Text>
          <Text style={styles.para}>
            1. The row&apos;s href was pushed with expo-router. This screen is a regular route, so a deep link
            opens it as well.
          </Text>
          <Text style={styles.para}>
            2. MorphSheetLayout, the layout of the (sheet) group, animated the container from the card to full
            screen.
          </Text>
          <Text style={styles.para}>
            3. This screen rendered a skeleton until useMorphSettled() returned true and the data arrived.
          </Text>

          <Link href={{ pathname: '/(sheet)/child', params: { from: item.label } }} asChild>
            <Pressable style={styles.cta} testID="open-child">
              <Text style={styles.ctaText}>Open a nested screen</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </Pressable>
          </Link>

          <Text style={styles.note}>{closeHint(config.dismiss)}</Text>
        </ScrollView>
      ) : (
        <Skeleton />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  title: { alignItems: 'center', gap: 4 },
  titleText: { fontSize: 13, fontWeight: '600', color: '#1c1c1e' },
  icon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: { width: 32 },
  body: { padding: 24, gap: 14, alignItems: 'flex-start' },
  route: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 12,
    color: '#8e8e93',
  },
  heading: { fontSize: 17, fontWeight: '700', color: '#1c1c1e', marginTop: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(120,120,128,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, color: '#3a3a3c', fontWeight: '600' },
  para: { fontSize: 15, color: '#3a3a3c', lineHeight: 22 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0a84ff',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 4,
  },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  note: { fontSize: 13, color: '#8e8e93', lineHeight: 19 },
});
