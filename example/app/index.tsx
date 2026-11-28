import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { useDemo, type UiVariant } from '../context/demo';
import { findScene, SCENES } from '../scenes';

const VARIANTS: { key: UiVariant; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'custom', label: 'Custom slots' },
];

/** The surface that `surface: 'auto'` picks on this platform. */
const SURFACE =
  Platform.OS === 'ios' ? 'Liquid Glass on iOS 26 and later, blur on older versions' : 'solid color';

const STEPS: { title: string; file: string; code: string; note: string }[] = [
  {
    title: 'Install',
    file: 'terminal',
    code: [
      'npx expo install \\',
      '  expo-morph-menu \\',
      '  expo-router \\',
      '  react-native-reanimated \\',
      '  react-native-worklets \\',
      '  react-native-gesture-handler \\',
      '  react-native-safe-area-context \\',
      '  react-native-screens',
    ].join('\n'),
    note: 'expo-haptics, expo-glass-effect and expo-blur are optional and detected at runtime.',
  },
  {
    title: 'Root layout',
    file: 'app/_layout.tsx',
    code: '<MorphProvider items={items}>\n  <Stack>\n    <Stack.Screen name="index" />\n    <Stack.Screen\n      name="(sheet)"\n      options={morphSheetScreenOptions}\n    />\n  </Stack>\n  <MorphMenu />\n</MorphProvider>',
    note: 'Render MorphMenu after the navigator, so the button and the card are drawn above every screen.',
  },
  {
    title: 'Menu items',
    file: 'data/items.tsx',
    code: "{\n  key: 'camera',\n  label: 'Camera',\n  icon: <Ionicons name=\"camera\" />,\n  href: '/(sheet)/camera',\n}",
    note: 'Selecting a row navigates to its href. The menu itself has no route.',
  },
  {
    title: 'Sheet route group',
    file: 'app/(sheet)/_layout.tsx',
    code: '<MorphSheetLayout>\n  <Stack.Screen name="[key]" />\n</MorphSheetLayout>',
    note: 'MorphSheetLayout animates the container from the card to full screen and contains a nested Stack.',
  },
  {
    title: 'Sheet screen',
    file: 'app/(sheet)/[key].tsx',
    code: 'const settled = useMorphSettled();\n\n<MorphCloseButton />\n{settled ? <Content /> : <Skeleton />}',
    note: 'Render heavy content after the expand animation. router.back() and hardware back also close the sheet.',
  },
];

/** The home screen of the running demo: the basic one below, or a scene's own. */
export default function Index() {
  const { scene } = useDemo();
  const Scene = findScene(scene)?.Home;
  return Scene ? <Scene /> : <Home />;
}

function Home() {
  const insets = useSafeAreaInsets();
  const { variant, setVariant, setScene } = useDemo();
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        padding: 20,
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 120,
        gap: 14,
      }}
    >
      <Text style={styles.title} testID="home-title">
        expo-morph-menu
      </Text>
      <Text style={styles.lead}>
        The + button opens a menu card. Each row is an expo-router route: the card grows into that screen, and
        closing the screen shrinks it back into the card.
      </Text>

      <Text style={styles.caption}>Try it</Text>
      <View style={styles.card}>
        <Text style={styles.step}>
          1. Tap +, then tap a row. The screen shows a placeholder while its data loads (about 700 ms).
        </Text>
        <Text style={styles.step}>
          2. Press and hold +, slide onto a row and release. Loading starts while your finger is on the row
          (the onHover callback), so the data is usually ready when the screen opens.
        </Text>
        <Text style={styles.step}>The badge on the screen shows how long it waited for data.</Text>
      </View>

      <Text style={styles.caption}>Appearance</Text>
      <View style={styles.segment}>
        {VARIANTS.map((v) => (
          <Pressable
            key={v.key}
            testID={`variant-${v.key}`}
            onPress={() => setVariant(v.key)}
            style={[styles.segItem, variant === v.key && styles.segActive]}
          >
            <Text style={[styles.segText, variant === v.key && styles.segTextActive]}>{v.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>
        {variant === 'default'
          ? `Built-in components. Card surface on this platform: ${SURFACE}.`
          : 'components/CustomSlots.tsx replaces the card background, rows, separators, button and scrim.'}
      </Text>

      <Text style={styles.caption}>More demo apps</Text>
      <Text style={styles.hint}>
        The same two routes and one MorphProvider, each with its own items, config, slots and screens.
      </Text>
      {SCENES.map((sc) => (
        <Pressable
          key={sc.id}
          testID={`scene-${sc.id}`}
          onPress={() => setScene(sc.id)}
          style={styles.scene}
          accessibilityRole="button"
        >
          <View style={[styles.sceneDot, { backgroundColor: sc.accent }]} />
          <View style={styles.sceneText}>
            <Text style={styles.stepTitle}>{sc.title}</Text>
            <Text style={styles.hint}>{sc.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#c7c7cc" />
        </Pressable>
      ))}

      <Text style={styles.caption}>Add it to your app</Text>
      {STEPS.map((s, i) => (
        <View key={s.title} style={styles.card}>
          <View style={styles.stepHead}>
            <Text style={styles.stepTitle}>
              {i + 1}. {s.title}
            </Text>
            <Text style={styles.file}>{s.file}</Text>
          </View>
          <View style={styles.codeBox}>
            <Text style={styles.code}>{s.code}</Text>
          </View>
          <Text style={styles.step}>{s.note}</Text>
        </View>
      ))}

      <Text style={styles.caption}>Deep link</Text>
      <View style={styles.card}>
        <View style={styles.codeBox}>
          <Text style={styles.code}>npx uri-scheme open morphmenu://sheet/audio --android</Text>
        </View>
        <Text style={styles.step}>
          Opens the route without the menu. There is no card to start from, so the container expands from the
          center of the screen.
        </Text>
      </View>

      <Text style={styles.footer}>
        Full guide: docs/en/INTEGRATION.md in the repository. The code of this app is in example/.
      </Text>
    </ScrollView>
  );
}

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 30, fontWeight: '800', color: '#1c1c1e' },
  lead: { fontSize: 15, color: '#3a3a3c', lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '700', color: '#8e8e93', marginTop: 8, textTransform: 'uppercase' },
  card: { backgroundColor: 'rgba(120,120,128,0.08)', borderRadius: 16, padding: 14, gap: 10 },
  step: { fontSize: 14, color: '#3a3a3c', lineHeight: 20 },
  stepHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: '#1c1c1e' },
  file: { fontFamily: MONO, fontSize: 11, color: '#8e8e93', flexShrink: 1, textAlign: 'right' },
  codeBox: { backgroundColor: '#1c1c1e', borderRadius: 10, padding: 12 },
  code: { fontFamily: MONO, fontSize: 11.5, lineHeight: 17, color: '#f2f2f7' },
  hint: { fontSize: 13, color: '#8e8e93', lineHeight: 19 },
  footer: { fontSize: 12, color: '#8e8e93', marginTop: 10, lineHeight: 18 },
  scene: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(120,120,128,0.08)',
    borderRadius: 16,
    padding: 14,
  },
  sceneDot: { width: 14, height: 14, borderRadius: 7 },
  sceneText: { flex: 1, gap: 2 },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderRadius: 10,
    padding: 2,
  },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  segText: { fontSize: 13, fontWeight: '600', color: '#8e8e93' },
  segTextActive: { color: '#1c1c1e' },
});
