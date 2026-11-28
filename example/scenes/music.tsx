import { Ionicons } from '@expo/vector-icons';
import type { MorphItem, MorphTriggerProps } from 'expo-morph-menu';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sheetItem, type Scene } from './types';
import { BackToDemos, SheetHeader } from './ui';
import { column } from '../components/layout';

/**
 * A music app in dark mode. The Trigger slot is a small equalizer that
 * keeps moving while the button is closed and shrinks away as it opens
 * (it reads `progress`, the package animates the size).
 */

const PINK = '#ff3d77';
const BG = '#0b0b10';

function EqBar({
  i,
  beat,
  progress,
}: {
  i: number;
  beat: SharedValue<number>;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const h = 6 + Math.abs(Math.sin(beat.value * Math.PI * 2 + i * 1.3)) * 14;
    return { height: h * interpolate(progress.value, [0, 0.35], [1, 0], Extrapolation.CLAMP) };
  });
  return <Animated.View style={[styles.eq, style]} />;
}

function Trigger({ progress }: MorphTriggerProps) {
  const beat = useSharedValue(0);
  useEffect(() => {
    beat.value = withRepeat(withTiming(1, { duration: 1400 }), -1);
  }, [beat]);
  return (
    <View style={styles.eqRow}>
      {[0, 1, 2, 3].map((i) => (
        <EqBar key={i} i={i} beat={beat} progress={progress} />
      ))}
    </View>
  );
}

const ion = (name: keyof typeof Ionicons.glyphMap) =>
  function Icon({ size, color }: { size: number; color: string }) {
    return <Ionicons name={name} size={size} color={color} />;
  };

const items: MorphItem[] = [
  sheetItem('playlist', 'New playlist', { tint: PINK, icon: ion('albums') }),
  sheetItem('songs', 'Add songs', { tint: '#7c5cff', icon: ion('musical-notes') }),
  sheetItem('radio', 'Start a radio', { tint: '#1fb6a6', icon: ion('radio') }),
  sheetItem('live', 'Listen together', { tint: '#ff9f1a', icon: ion('headset') }),
];

const ALBUMS = [
  { title: 'Night Drive', artist: 'Halcyon', color: '#5b2c83' },
  { title: 'Afterglow', artist: 'Paper Suns', color: '#e8705a' },
  { title: 'Tidal', artist: 'Blue Hours', color: '#1c7c7d' },
  { title: 'Ember', artist: 'Juniper & Ash', color: '#e67e22' },
];
const SONGS = [
  'Neon Tides',
  'Paper Planes',
  'Glass House',
  'Slow Motion',
  'Northern Lights',
  'Golden Hour',
  'Static',
];

function Home() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: BG }}
      contentContainerStyle={[
        column,
        styles.home,
        { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 120 },
      ]}
    >
      <BackToDemos dark />
      <Text style={styles.h1}>Listen now</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
        {ALBUMS.map((a) => (
          <View key={a.title} style={{ width: 150, gap: 6 }}>
            <View style={[styles.cover, { backgroundColor: a.color }]}>
              <Ionicons name="musical-note" size={40} color="#ffffff66" />
            </View>
            <Text style={styles.albumTitle}>{a.title}</Text>
            <Text style={styles.albumArtist}>{a.artist}</Text>
          </View>
        ))}
      </ScrollView>
      <Text style={styles.section}>Recently played</Text>
      {SONGS.slice(0, 5).map((s, i) => (
        <View key={s} style={styles.song}>
          <View style={[styles.songCover, { backgroundColor: ALBUMS[i % 4].color }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.songTitle}>{s}</Text>
            <Text style={styles.albumArtist}>{ALBUMS[i % 4].artist}</Text>
          </View>
          <Ionicons name="ellipsis-horizontal" size={18} color="#8a8a96" />
        </View>
      ))}
      <Text style={styles.hint}>The equalizer in the button is a Trigger slot.</Text>
    </ScrollView>
  );
}

const COVERS = ['#ff3d77', '#7c5cff', '#1fb6a6', '#ff9f1a', '#2f6bff', '#e0559b'];

function Playlist() {
  const [color, setColor] = useState(0);
  return (
    <View style={styles.sheet}>
      <SheetHeader title="New playlist" color="#fff" right={<Text style={styles.action}>Create</Text>} />
      <View style={styles.center}>
        <View style={[styles.bigCover, { backgroundColor: COVERS[color] }]}>
          <Ionicons name="albums" size={64} color="#ffffffaa" />
        </View>
        <TextInput style={styles.title} defaultValue="Sunday morning" placeholderTextColor="#666" />
        <View style={styles.swatches}>
          {COVERS.map((c, i) => (
            <Pressable
              key={c}
              onPress={() => setColor(i)}
              style={[styles.swatch, { backgroundColor: c }, i === color && styles.swatchOn]}
              accessibilityLabel={`Cover color ${i + 1}`}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function Songs() {
  const [added, setAdded] = useState<string[]>(['Glass House']);
  return (
    <View style={styles.sheet}>
      <SheetHeader title="Add songs" color="#fff" right={<Text style={styles.action}>{added.length}</Text>} />
      <ScrollView contentContainerStyle={[column, styles.home]}>
        {SONGS.map((s, i) => {
          const on = added.includes(s);
          return (
            <Pressable
              key={s}
              style={styles.song}
              onPress={() => setAdded((a) => (on ? a.filter((x) => x !== s) : [...a, s]))}
            >
              <View style={[styles.songCover, { backgroundColor: COVERS[i % COVERS.length] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.songTitle}>{s}</Text>
                <Text style={styles.albumArtist}>{ALBUMS[i % 4].artist}</Text>
              </View>
              <Ionicons
                name={on ? 'checkmark-circle' : 'add-circle-outline'}
                size={26}
                color={on ? PINK : '#8a8a96'}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Radio() {
  const genres = ['Lo-fi', 'Indie', 'Jazz', 'Electronic', 'Hip hop', 'Classical', 'Ambient', 'Rock'];
  const [pick, setPick] = useState(0);
  return (
    <View style={styles.sheet}>
      <SheetHeader title="Start a radio" color="#fff" />
      <View style={[styles.home, styles.genres]}>
        {genres.map((g, i) => (
          <Pressable
            key={g}
            onPress={() => setPick(i)}
            style={[
              styles.genre,
              { backgroundColor: COVERS[i % COVERS.length] },
              i === pick && styles.genreOn,
            ]}
          >
            <Text style={styles.genreText}>{g}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.hint, { marginTop: 18 }]}>
        {genres[pick]} radio: endless songs picked for you.
      </Text>
    </View>
  );
}

function Live() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <View style={styles.sheet}>
      <SheetHeader title="Listen together" color="#fff" />
      <View style={styles.center}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>
            LIVE · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </Text>
        </View>
        <View style={[styles.bigCover, { backgroundColor: '#ff9f1a' }]}>
          <Ionicons name="headset" size={64} color="#ffffffaa" />
        </View>
        <Text style={styles.songTitle}>3 friends are listening with you</Text>
        <Text style={styles.albumArtist}>Now: Golden Hour · Paper Suns</Text>
      </View>
    </View>
  );
}

function Screen({ itemKey }: { itemKey: string }) {
  if (itemKey === 'songs') return <Songs />;
  if (itemKey === 'radio') return <Radio />;
  if (itemKey === 'live') return <Live />;
  return <Playlist />;
}

export const music: Scene = {
  id: 'music',
  title: 'Music',
  subtitle: 'Dark player: an equalizer in the button, from a Trigger slot',
  accent: PINK,
  items,
  config: {
    colorScheme: 'dark',
    surface: 'solid',
    radius: { card: 24 },
    colors: { dark: { surface: '#1a1a24', sheetBackground: BG, highlight: 'rgba(255,61,119,0.16)' } },
  },
  components: { Trigger },
  Home,
  Screen,
};

const styles = StyleSheet.create({
  home: { paddingHorizontal: 16, gap: 12 },
  h1: { fontSize: 32, fontWeight: '800', color: '#fff' },
  cover: { width: 150, height: 150, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  albumTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  albumArtist: { color: '#8a8a96', fontSize: 13 },
  section: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 8 },
  song: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  songCover: { width: 48, height: 48, borderRadius: 8 },
  songTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  hint: { color: '#8a8a96', fontSize: 13, textAlign: 'center' },
  eqRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 22 },
  eq: { width: 4, borderRadius: 2, backgroundColor: PINK },
  sheet: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 24 },
  bigCover: { width: 200, height: 200, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  swatches: { flexDirection: 'row', gap: 12 },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  swatchOn: { borderWidth: 3, borderColor: '#fff' },
  action: { color: PINK, fontSize: 16, fontWeight: '700' },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  genre: { width: '47%', flexGrow: 1, height: 84, borderRadius: 14, padding: 12, justifyContent: 'flex-end' },
  genreOn: { borderWidth: 3, borderColor: '#fff' },
  genreText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ff3b30',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontWeight: '800', fontSize: 13, fontVariant: ['tabular-nums'] },
});
