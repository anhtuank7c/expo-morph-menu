import { Ionicons } from '@expo/vector-icons';
import type { MorphBackgroundProps, MorphTriggerProps } from 'expo-morph-menu';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sheetItem, type Scene } from './types';
import { BackToDemos, Initials, SheetHeader } from './ui';
import { column } from '../components/layout';

/**
 * A wallet app in dark mode. The button is lime and the card is graphite:
 * the Background slot blends one into the other with `progress`, so the
 * brand-colored button grows into a dark menu.
 */

const LIME = '#c6f432';
const CARD = '#1d1d23';
const BG = '#0e0e12';

function Background({ variant, progress }: MorphBackgroundProps) {
  // 'menu': lime at the button (0), graphite as a card (1). 'sheet' starts as the card.
  const style = useAnimatedStyle(() => ({
    backgroundColor: variant === 'menu' ? interpolateColor(progress.value, [0, 0.5], [LIME, CARD]) : CARD,
  }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]} />;
}

function Trigger({ progress }: MorphTriggerProps) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3], [1, 0], Extrapolation.CLAMP),
    transform: [{ rotate: `${interpolate(progress.value, [0, 0.3], [0, 45], Extrapolation.CLAMP)}deg` }],
  }));
  return (
    <Animated.View style={style}>
      <Ionicons name="add" size={30} color={BG} />
    </Animated.View>
  );
}

const icon = (name: keyof typeof Ionicons.glyphMap) =>
  function Icon({ size }: { size: number }) {
    return <Ionicons name={name} size={size} color={BG} />;
  };

const items = [
  sheetItem('send', 'Send money', { tint: LIME, icon: icon('arrow-up') }),
  sheetItem('request', 'Request', { tint: '#7ee0ff', icon: icon('arrow-down') }),
  sheetItem('topup', 'Top up', { tint: '#ffd166', icon: icon('add-circle') }),
  sheetItem('scan', 'Scan to pay', { tint: '#ff9fd2', icon: icon('qr-code') }),
];

const PEOPLE = [
  { name: 'Mia Chen', color: '#7c5cff' },
  { name: 'Leo Park', color: '#ff7a59' },
  { name: 'Ana Silva', color: '#1fb6a6' },
  { name: 'Kai Ito', color: '#e0559b' },
];

const ACTIVITY = [
  { title: 'Coffee Lab', note: 'Today, 9:12', amount: -4.8, icon: 'cafe' as const },
  { title: 'Mia Chen', note: 'Dinner split', amount: 32.5, icon: 'person' as const },
  { title: 'Metro card', note: 'Yesterday', amount: -20, icon: 'train' as const },
  { title: 'Salary', note: 'Nov 25', amount: 4200, icon: 'briefcase' as const },
  { title: 'Groceries', note: 'Nov 24', amount: -64.3, icon: 'basket' as const },
];

const money = (n: number) => `${n < 0 ? '−' : '+'}$${Math.abs(n).toFixed(2)}`;

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
      <Text style={styles.hello}>Good morning, Alex</Text>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total balance</Text>
        <Text style={styles.balance}>$12,480.32</Text>
        <View style={styles.cardRow}>
          <Text style={styles.cardNumber}>•••• 4821</Text>
          <Text style={styles.cardBrand}>POCKET</Text>
        </View>
      </View>
      <View style={styles.stats}>
        <Stat label="Income" value="$4,200" up />
        <Stat label="Spent" value="$1,318" />
      </View>
      <Text style={styles.section}>Activity</Text>
      {ACTIVITY.map((a) => (
        <View key={a.title + a.note} style={styles.row}>
          <View style={styles.rowIcon}>
            <Ionicons name={a.icon} size={18} color="#fff" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.rowTitle}>{a.title}</Text>
            <Text style={styles.rowNote}>{a.note}</Text>
          </View>
          <Text style={[styles.rowAmount, a.amount > 0 && { color: LIME }]}>{money(a.amount)}</Text>
        </View>
      ))}
      <Text style={styles.hint}>
        Tap the lime button: it grows into a dark menu, each row into a full screen.
      </Text>
    </ScrollView>
  );
}

function Stat({ label, value, up = false }: { label: string; value: string; up?: boolean }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={up ? 'trending-up' : 'trending-down'} size={18} color={up ? LIME : '#ff8a8a'} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

function Send() {
  const [amount, setAmount] = useState('25');
  const [to, setTo] = useState(0);
  const press = (k: string) =>
    setAmount((a) =>
      k === '⌫'
        ? a.slice(0, -1) || '0'
        : a === '0' && k !== '.'
          ? k
          : a.includes('.') && k === '.'
            ? a
            : (a + k).slice(0, 8),
    );
  return (
    <View style={styles.sheet}>
      <SheetHeader title="Send money" color="#fff" />
      <View style={styles.people}>
        {PEOPLE.map((p, i) => (
          <Pressable
            key={p.name}
            onPress={() => setTo(i)}
            style={[styles.person, i === to && styles.personOn]}
          >
            <Initials name={p.name} color={p.color} size={46} />
            <Text style={styles.personName}>{p.name.split(' ')[0]}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.amount}>${amount}</Text>
      <Text style={styles.amountNote}>to {PEOPLE[to].name} · no fee</Text>
      <View style={styles.keypad}>
        {KEYS.map((k) => (
          <Pressable
            key={k}
            style={styles.key}
            onPress={() => press(k)}
            accessibilityLabel={k === '⌫' ? 'Delete' : k}
          >
            <Text style={styles.keyText}>{k}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={styles.primary}>
        <Text style={styles.primaryText}>Send ${amount}</Text>
      </Pressable>
    </View>
  );
}

/** A made-up QR pattern: the same squares every time. */
function FakeQr() {
  const cells = Array.from({ length: 21 * 21 }, (_, i) => ((i * 7919) % 13) % 3 === 0);
  return (
    <View style={styles.qr}>
      {cells.map((on, i) => (
        <View key={i} style={[styles.qrCell, on && styles.qrOn]} />
      ))}
    </View>
  );
}

function Request() {
  return (
    <View style={styles.sheet}>
      <SheetHeader title="Request" color="#fff" />
      <View style={styles.center}>
        <FakeQr />
        <Text style={styles.big}>pocket.me/alex</Text>
        <Text style={styles.muted}>Anyone can scan this code or open the link to pay you.</Text>
        <Pressable style={styles.primary}>
          <Ionicons name="share-outline" size={18} color={BG} />
          <Text style={styles.primaryText}>Share link</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TopUp() {
  const [pick, setPick] = useState(1);
  const amounts = [20, 50, 100, 200];
  return (
    <View style={styles.sheet}>
      <SheetHeader title="Top up" color="#fff" />
      <View style={styles.body}>
        <Text style={styles.section}>Amount</Text>
        <View style={styles.chips}>
          {amounts.map((a, i) => (
            <Pressable key={a} onPress={() => setPick(i)} style={[styles.chip, i === pick && styles.chipOn]}>
              <Text style={[styles.chipText, i === pick && { color: BG }]}>${a}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.section}>From</Text>
        {[
          ['card', 'Visa •••• 9012', 'Instant'],
          ['business', 'Bank transfer', '1 to 2 days'],
          ['wallet', 'Pay wallet', 'Instant'],
        ].map(([ic, t, n]) => (
          <View key={t} style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name={ic as keyof typeof Ionicons.glyphMap} size={18} color="#fff" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>{t}</Text>
              <Text style={styles.rowNote}>{n}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </View>
        ))}
        <Pressable style={styles.primary}>
          <Text style={styles.primaryText}>Add ${amounts[pick]}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Scan() {
  return (
    <View style={[styles.sheet, { backgroundColor: '#000' }]}>
      <SheetHeader title="Scan to pay" color="#fff" />
      <View style={styles.center}>
        <View style={styles.viewfinder}>
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
            <View key={c} style={[styles.corner, styles[c]]} />
          ))}
        </View>
        <Text style={styles.muted}>Point the camera at a payment code.</Text>
      </View>
    </View>
  );
}

function Screen({ itemKey }: { itemKey: string }) {
  if (itemKey === 'request') return <Request />;
  if (itemKey === 'topup') return <TopUp />;
  if (itemKey === 'scan') return <Scan />;
  return <Send />;
}

export const wallet: Scene = {
  id: 'wallet',
  title: 'Wallet',
  subtitle: 'Dark fintech app: a lime button that grows into a graphite menu',
  accent: LIME,
  items,
  config: {
    colorScheme: 'dark',
    radius: { card: 26, fab: 22 },
    layout: { fabSize: 60, cardWidth: 240, rowHeight: 52, iconSize: 17 },
    colors: { dark: { sheetBackground: BG, highlight: 'rgba(255,255,255,0.08)', text: '#f4f4f6' } },
  },
  components: { Background, Trigger },
  Home,
  Screen,
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  home: { paddingHorizontal: 20, gap: 14 },
  hello: { color: '#fff', fontSize: 24, fontWeight: '800' },
  balanceCard: { backgroundColor: LIME, borderRadius: 24, padding: 20, gap: 6 },
  balanceLabel: { color: '#28320a', fontSize: 13, fontWeight: '600' },
  balance: { color: BG, fontSize: 34, fontWeight: '800' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  cardNumber: { color: '#28320a', fontSize: 14, fontWeight: '600' },
  cardBrand: { color: BG, fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: CARD, borderRadius: 18, padding: 14, gap: 4 },
  statLabel: { color: '#9a9aa6', fontSize: 12 },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '700' },
  section: {
    color: '#9a9aa6',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rowNote: { color: '#80808c', fontSize: 12 },
  rowAmount: { color: '#fff', fontSize: 15, fontWeight: '700' },
  hint: { color: '#80808c', fontSize: 13, textAlign: 'center', marginTop: 8 },
  sheet: { flex: 1, backgroundColor: BG },
  body: { paddingHorizontal: 20, gap: 12 },
  people: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 12, marginTop: 8 },
  person: { alignItems: 'center', gap: 6, padding: 6, borderRadius: 18 },
  personOn: { backgroundColor: CARD },
  personName: { color: '#fff', fontSize: 12 },
  amount: { color: '#fff', fontSize: 56, fontWeight: '800', textAlign: 'center', marginTop: 24 },
  amountNote: { color: '#80808c', fontSize: 13, textAlign: 'center' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 28, marginTop: 18 },
  key: { width: '33.33%', height: 58, alignItems: 'center', justifyContent: 'center' },
  keyText: { color: '#fff', fontSize: 26, fontWeight: '500' },
  primary: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: LIME,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  primaryText: { color: BG, fontSize: 16, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24 },
  qr: {
    width: 210,
    height: 210,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 18,
  },
  qrCell: { width: 190 / 21, height: 190 / 21 },
  qrOn: { backgroundColor: BG },
  big: { color: '#fff', fontSize: 20, fontWeight: '700' },
  muted: { color: '#9a9aa6', fontSize: 14, textAlign: 'center' },
  chips: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: CARD, alignItems: 'center' },
  chipOn: { backgroundColor: LIME },
  chipText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  viewfinder: { width: 240, height: 240 },
  corner: { position: 'absolute', width: 44, height: 44, borderColor: LIME },
  tl: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 18 },
  tr: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 18 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 18 },
  br: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 18 },
});
