import { Ionicons } from '@expo/vector-icons';
import { renderIcon, type MorphItem, type MorphItemProps } from 'expo-morph-menu';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
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
 * A notes app on warm paper, with the button in the bottom-left corner. The
 * rows show a keyboard shortcut and a Separator slot draws lines between
 * them; the colors come from `config.colors`.
 */

const PAPER = '#fbf6ec';
const INK = '#3b3125';
const ACCENT = '#e8a23a';

function Item({ item, colors }: MorphItemProps) {
  return (
    <View style={styles.item}>
      {renderIcon(item.icon, { size: 18, color: ACCENT })}
      <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
      <View style={styles.shortcut}>
        <Text style={styles.shortcutText}>{item.data?.shortcut as string}</Text>
      </View>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const ion = (name: keyof typeof Ionicons.glyphMap) =>
  function Icon({ size, color }: { size: number; color: string }) {
    return <Ionicons name={name} size={size} color={color} />;
  };

const items: MorphItem[] = [
  sheetItem('note', 'Note', { icon: ion('document-text-outline'), data: { shortcut: '⌘ N' } }),
  sheetItem('checklist', 'Checklist', { icon: ion('checkbox-outline'), data: { shortcut: '⌘ L' } }),
  sheetItem('voice', 'Voice memo', { icon: ion('mic-outline'), data: { shortcut: '⌘ R' } }),
  sheetItem('scan', 'Scan document', { icon: ion('scan-outline'), data: { shortcut: '⌘ D' } }),
];

const NOTES = [
  {
    title: 'Trip to Kyoto',
    body: 'Fushimi Inari at sunrise, tea in Uji, the bamboo path before 8.',
    color: '#fde9c4',
  },
  { title: 'Groceries', body: '☐ Oat milk\n☐ Lemons\n☑ Basil\n☐ Sourdough', color: '#e3f1d9' },
  { title: 'Book ideas', body: 'A lighthouse keeper who collects other people’s letters.', color: '#e7e3f6' },
  { title: 'Standup', body: 'Ship the onboarding, review the icons, plan the beta.', color: '#fbe0df' },
  { title: 'Workout', body: '5 × 5 squats, 3 × 8 rows, 20 min easy run.', color: '#dff0f4' },
  { title: 'Gift list', body: 'Mom: ceramic mug. Leo: climbing chalk.', color: '#fdebd2' },
];

function Home() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[
        column,
        styles.home,
        { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 120 },
      ]}
    >
      <BackToDemos />
      <Text style={styles.h1}>Notes</Text>
      <View style={styles.grid}>
        {NOTES.map((n) => (
          <View key={n.title} style={[styles.card, { backgroundColor: n.color }]}>
            <Text style={styles.cardTitle}>{n.title}</Text>
            <Text style={styles.cardBody} numberOfLines={5}>
              {n.body}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.hint}>
        The button sits in the bottom-left corner: `anchor: &apos;bottom-left&apos;`.
      </Text>
    </ScrollView>
  );
}

function Note() {
  return (
    <View style={styles.page}>
      <SheetHeader title="" color={INK} right={<Text style={styles.done}>Done</Text>} />
      <View style={styles.editor}>
        <TextInput style={styles.editorTitle} defaultValue="Morning pages" placeholder="Title" />
        <TextInput
          style={styles.editorBody}
          multiline
          defaultValue={
            'Slept well. The light in the kitchen at 7 is the best part of the day.\n\nToday: finish the draft, call the bakery about Saturday, walk without the phone.'
          }
        />
      </View>
    </View>
  );
}

function Checklist() {
  const [tasks, setTasks] = useState([
    { t: 'Book the train', done: true },
    { t: 'Pack the rain jacket', done: false },
    { t: 'Print the tickets', done: false },
    { t: 'Water the plants', done: true },
    { t: 'Charge the camera', done: false },
  ]);
  const left = tasks.filter((x) => !x.done).length;
  return (
    <View style={styles.page}>
      <SheetHeader title="Weekend trip" color={INK} />
      <View style={styles.editor}>
        <Text style={styles.muted}>{left} left</Text>
        {tasks.map((task, i) => (
          <Pressable
            key={task.t}
            style={styles.task}
            onPress={() => setTasks((all) => all.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: task.done }}
          >
            <Ionicons
              name={task.done ? 'checkbox' : 'square-outline'}
              size={24}
              color={task.done ? ACCENT : '#b9ad9a'}
            />
            <Text style={[styles.taskText, task.done && styles.taskDone]}>{task.t}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const BARS = 28;

function Voice() {
  const t = useSharedValue(0);
  const [recording, setRecording] = useState(true);
  useEffect(() => {
    t.value = 0;
    if (recording) t.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, [recording, t]);
  return (
    <View style={styles.page}>
      <SheetHeader title="Voice memo" color={INK} />
      <View style={styles.voice}>
        <Text style={styles.clock}>{recording ? '0:12' : 'Paused'}</Text>
        <View style={styles.wave}>
          {Array.from({ length: BARS }, (_, i) => (
            <Bar key={i} i={i} t={t} />
          ))}
        </View>
        <Pressable
          style={[styles.record, !recording && { backgroundColor: ACCENT }]}
          onPress={() => setRecording((r) => !r)}
          accessibilityLabel={recording ? 'Pause' : 'Record'}
        >
          <Ionicons name={recording ? 'pause' : 'mic'} size={30} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

function Bar({ i, t }: { i: number; t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const phase = Math.sin(i * 0.7 + t.value * Math.PI * 2);
    return { height: 14 + Math.abs(phase) * (24 + (i % 5) * 10) };
  });
  return <Animated.View style={[styles.bar, style]} />;
}

function Scan() {
  return (
    <View style={[styles.page, { backgroundColor: '#2b2620' }]}>
      <SheetHeader title="Scan document" color="#fff" />
      <View style={styles.voice}>
        <View style={styles.paperSheet}>
          {[0.9, 0.75, 0.85, 0.6, 0.8, 0.5].map((w, i) => (
            <View key={i} style={[styles.paperLine, { width: `${w * 100}%` }]} />
          ))}
        </View>
        <Text style={[styles.muted, { color: '#d9cfbf' }]}>Hold steady: edges found, capturing…</Text>
      </View>
    </View>
  );
}

function Screen({ itemKey }: { itemKey: string }) {
  if (itemKey === 'checklist') return <Checklist />;
  if (itemKey === 'voice') return <Voice />;
  if (itemKey === 'scan') return <Scan />;
  return <Note />;
}

export const notes: Scene = {
  id: 'notes',
  title: 'Notes',
  subtitle: 'Warm paper, bottom-left corner, rows with shortcuts and separators',
  accent: ACCENT,
  items,
  config: {
    anchor: 'bottom-left',
    surface: 'solid',
    radius: { card: 18, fab: 18 },
    layout: { cardWidth: 230, rowHeight: 48, separatorHeight: StyleSheet.hairlineWidth },
    colors: {
      light: {
        surface: '#fffdf8',
        sheetBackground: PAPER,
        text: INK,
        highlight: '#f3e7cf',
        fabIcon: ACCENT,
        closeIcon: INK,
      },
    },
  },
  components: { Item, Separator },
  Home,
  Screen,
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAPER },
  home: { paddingHorizontal: 16, gap: 12 },
  h1: { fontSize: 32, fontWeight: '800', color: INK },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48%', flexGrow: 1, borderRadius: 18, padding: 14, gap: 6, minHeight: 130 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: INK },
  cardBody: { fontSize: 13, lineHeight: 18, color: '#5e5242' },
  hint: { fontSize: 13, color: '#9a8c77', textAlign: 'center', marginTop: 6 },
  item: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  itemLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  shortcut: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e6d9c2',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  shortcutText: { fontSize: 11, color: '#9a8c77', fontWeight: '600' },
  separator: { flex: 1, marginHorizontal: 16, backgroundColor: '#eadfca' },
  done: { color: ACCENT, fontSize: 16, fontWeight: '700' },
  editor: { paddingHorizontal: 22, gap: 10 },
  editorTitle: { fontSize: 28, fontWeight: '800', color: INK },
  editorBody: { fontSize: 17, lineHeight: 26, color: '#4a3f31', minHeight: 300, textAlignVertical: 'top' },
  muted: { fontSize: 14, color: '#9a8c77' },
  task: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  taskText: { fontSize: 17, color: INK },
  taskDone: { color: '#b9ad9a', textDecorationLine: 'line-through' },
  voice: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 30 },
  clock: { fontSize: 44, fontWeight: '300', color: INK, fontVariant: ['tabular-nums'] },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 80 },
  bar: { width: 5, borderRadius: 3, backgroundColor: ACCENT },
  record: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#e5484d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperSheet: {
    width: 230,
    height: 300,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 22,
    gap: 14,
    borderWidth: 3,
    borderColor: ACCENT,
    transform: [{ rotate: '-3deg' }],
  },
  paperLine: { height: 8, borderRadius: 4, backgroundColor: '#e5ded2' },
});
