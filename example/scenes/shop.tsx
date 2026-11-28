import { Ionicons } from '@expo/vector-icons';
import {
  renderIcon,
  type MorphBackgroundProps,
  type MorphItem,
  type MorphItemProps,
  type MorphTriggerProps,
} from 'expo-morph-menu';
import Constants from 'expo-constants';
import { configureSkiaWeb, MorphCarousel } from 'expo-morph-carousel';
import { useSyncExternalStore } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sheetItem, type Scene } from './types';
import { BackToDemos, SheetHeader } from './ui';
import { column } from '../components/layout';

/**
 * A shop. The button is a bag with a live badge: the Trigger slot reads the
 * cart, so adding a product on the home screen updates the button. The Item
 * slot draws its own hover state (Highlight is off) and a count per row.
 *
 * The banner on top is expo-morph-carousel, the sister package: its photos
 * melt into each other like liquid (https://anhtuank7c.github.io/expo-morph-carousel/).
 */

const ORANGE = '#ff5a1f';

/* A tiny cart store shared by the home screen, the button and the screens. */
type Line = { id: string; name: string; price: number; qty: number; color: string };
let lines: Line[] = [{ id: 'tee', name: 'Organic tee', price: 24, qty: 1, color: '#f3d9c6' }];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const cart = {
  subscribe: (l: () => void) => (listeners.add(l), () => listeners.delete(l)),
  get: () => lines,
  add: (p: Omit<Line, 'qty'>) => {
    const found = lines.find((l) => l.id === p.id);
    lines = found
      ? lines.map((l) => (l.id === p.id ? { ...l, qty: l.qty + 1 } : l))
      : [...lines, { ...p, qty: 1 }];
    emit();
  },
  change: (id: string, d: number) => {
    lines = lines
      .map((l) => (l.id === id ? { ...l, qty: Math.max(0, l.qty + d) } : l))
      .filter((l) => l.qty > 0);
    emit();
  },
};
const useCart = () => useSyncExternalStore(cart.subscribe, cart.get, cart.get);
const countOf = (ls: Line[]) => ls.reduce((a, l) => a + l.qty, 0);

/** Orange as a button, white as a card: the button and the card are one surface. */
function Background({ variant, progress }: MorphBackgroundProps) {
  const style = useAnimatedStyle(() => ({
    backgroundColor:
      variant === 'menu' ? interpolateColor(progress.value, [0, 0.5], [ORANGE, '#ffffff']) : '#ffffff',
  }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]} />;
}

function Trigger({ progress }: MorphTriggerProps) {
  const count = countOf(useCart());
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 0.3], [1, 0.6], Extrapolation.CLAMP) }],
  }));
  return (
    <Animated.View style={style}>
      <Ionicons name="bag-handle" size={26} color="#fff" />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </Animated.View>
  );
}

function Item({ item, index, hovered, colors }: MorphItemProps) {
  const lineCount = countOf(useCart());
  const hover = useAnimatedStyle(() => ({
    backgroundColor: hovered.value === index ? '#fff1ea' : 'transparent',
  }));
  const count = item.key === 'cart' ? lineCount : (item.data?.count as number | undefined);
  return (
    <Animated.View style={[styles.item, hover]}>
      {renderIcon(item.icon, { size: 20, color: ORANGE })}
      <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
      {count ? (
        <View style={styles.count}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const ion = (name: keyof typeof Ionicons.glyphMap) =>
  function Icon({ size, color }: { size: number; color: string }) {
    return <Ionicons name={name} size={size} color={color} />;
  };

const items: MorphItem[] = [
  sheetItem('cart', 'Cart', { icon: ion('bag-handle-outline') }),
  sheetItem('wishlist', 'Wishlist', { icon: ion('heart-outline'), data: { count: 6 } }),
  sheetItem('orders', 'Orders', { icon: ion('cube-outline'), data: { count: 1 } }),
  sheetItem('help', 'Help', { icon: ion('chatbubbles-outline') }),
];

/* Photos from Unsplash (https://unsplash.com/license), cropped by imgix. */
const BANNERS = [
  { id: '1483985988355-763728e1935b', title: 'Mid-season sale', subtitle: 'Up to 60% off', color: '#b0476c' },
  {
    id: '1520006403909-838d6b92c22e',
    title: 'New arrivals',
    subtitle: 'Fresh picks every morning',
    color: '#7a5c3e',
  },
  { id: '1555529669-e69e7aa0ba9a', title: 'Free shipping', subtitle: 'On orders over $35', color: '#3e6b7a' },
];
const photo = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${Math.round(w)}&h=${Math.round(h)}&fit=crop&q=80&fm=jpg`;

// On the documentation site the web build lives under a sub path, CanvasKit too.
const base = Constants.expoConfig?.experiments?.baseUrl;
if (Platform.OS === 'web' && base) configureSkiaWeb({ locateFile: (file) => `${base}/${file}` });

function Banner() {
  return (
    <MorphCarousel
      data={BANNERS}
      keyExtractor={(b) => b.id}
      getImage={(b, _i, t) => ({
        uri: photo(b.id, t.layoutWidth * t.pixelRatio, t.layoutHeight * t.pixelRatio),
      })}
      getPlaceholderColor={(b) => b.color}
      mediaPosition="background"
      mediaFit="cover"
      mediaPadding={0}
      liquid={{ preserveShape: true }}
      loop
      autoplay={{ interval: 3500 }}
      pagination={{ activeColor: '#fff', inactiveColor: '#ffffff80', size: 6, activeWidth: 18 }}
      accessibilityLabel="Promotions"
      getAccessibilityLabel={(b) => `${b.title}, ${b.subtitle}`}
      style={styles.banner}
      pageStyle={styles.bannerPage}
      footerStyle={styles.bannerDots}
      renderItem={({ item }) => (
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>{item.title}</Text>
          <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
        </View>
      )}
    />
  );
}

const PRODUCTS = [
  { id: 'sneakers', name: 'Canvas sneakers', price: 68, color: '#dfe7f5' },
  { id: 'tote', name: 'Market tote', price: 32, color: '#efe3c8' },
  { id: 'cap', name: 'Wool cap', price: 28, color: '#d8eadf' },
  { id: 'mug', name: 'Stoneware mug', price: 18, color: '#f5dcdc' },
  { id: 'lamp', name: 'Desk lamp', price: 89, color: '#ece2f6' },
  { id: 'tee', name: 'Organic tee', price: 24, color: '#f3d9c6' },
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
      <Banner />
      <Text style={styles.h1}>New in</Text>
      <View style={styles.grid}>
        {PRODUCTS.map((p) => (
          <View key={p.id} style={styles.product}>
            <View style={[styles.productImage, { backgroundColor: p.color }]}>
              <Ionicons name="pricetag" size={28} color="#00000033" />
            </View>
            <Text style={styles.productName}>{p.name}</Text>
            <View style={styles.row}>
              <Text style={styles.price}>${p.price}</Text>
              <Pressable
                style={styles.add}
                onPress={() => cart.add(p)}
                accessibilityLabel={`Add ${p.name} to the cart`}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.hint}>
        Add something: the badge on the bag button updates. It is a Trigger slot reading the cart.
      </Text>
    </ScrollView>
  );
}

function Cart() {
  const ls = useCart();
  const total = ls.reduce((a, l) => a + l.qty * l.price, 0);
  return (
    <View style={styles.page}>
      <SheetHeader title={`Cart (${countOf(ls)})`} />
      <ScrollView contentContainerStyle={[column, styles.home]}>
        {ls.length === 0 && <Text style={styles.hint}>Your cart is empty.</Text>}
        {ls.map((l) => (
          <View key={l.id} style={styles.line}>
            <View style={[styles.lineImage, { backgroundColor: l.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{l.name}</Text>
              <Text style={styles.price}>${l.price}</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable onPress={() => cart.change(l.id, -1)} hitSlop={8} accessibilityLabel="Less">
                <Ionicons name="remove" size={18} color="#1c1c1e" />
              </Pressable>
              <Text style={styles.qty}>{l.qty}</Text>
              <Pressable onPress={() => cart.change(l.id, 1)} hitSlop={8} accessibilityLabel="More">
                <Ionicons name="add" size={18} color="#1c1c1e" />
              </Pressable>
            </View>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.productName}>Total</Text>
          <Text style={styles.total}>${total.toFixed(2)}</Text>
        </View>
        <Pressable style={styles.primary}>
          <Text style={styles.primaryText}>Checkout</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Wishlist() {
  return (
    <View style={styles.page}>
      <SheetHeader title="Wishlist" />
      <ScrollView contentContainerStyle={[column, styles.home, styles.grid]}>
        {PRODUCTS.map((p) => (
          <View key={p.id} style={styles.product}>
            <View style={[styles.productImage, { backgroundColor: p.color }]}>
              <Ionicons name="heart" size={22} color={ORANGE} style={styles.heart} />
            </View>
            <Text style={styles.productName}>{p.name}</Text>
            <Text style={styles.price}>${p.price}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Orders() {
  const steps = [
    ['Order placed', 'Nov 26, 10:02', true],
    ['Packed', 'Nov 26, 15:40', true],
    ['On the way', 'Nov 27, 08:15', true],
    ['Delivered', 'Expected today by 6 pm', false],
  ] as const;
  return (
    <View style={styles.page}>
      <SheetHeader title="Order #4821" />
      <View style={styles.home}>
        {steps.map(([t, when, done], i) => (
          <View key={t} style={styles.step}>
            <View style={styles.stepRail}>
              <View style={[styles.stepDot, done && styles.stepDone]}>
                {done && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              {i < steps.length - 1 && (
                <View style={[styles.stepLine, done && { backgroundColor: ORANGE }]} />
              )}
            </View>
            <View style={{ paddingBottom: 22 }}>
              <Text style={styles.productName}>{t}</Text>
              <Text style={styles.when}>{when}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function Help() {
  const messages = [
    ['them', 'Hi Alex! How can we help today?'],
    ['me', 'Can I change the size of my sneakers?'],
    ['them', 'Of course. Your order has not shipped yet, so I switched them to 42. Anything else?'],
  ];
  return (
    <View style={styles.page}>
      <SheetHeader title="Help" />
      <View style={[styles.home, { gap: 10 }]}>
        {messages.map(([who, text], i) => (
          <View key={i} style={[styles.bubble, who === 'me' ? styles.me : styles.them]}>
            <Text style={[styles.bubbleText, who === 'me' && { color: '#fff' }]}>{text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Screen({ itemKey }: { itemKey: string }) {
  if (itemKey === 'wishlist') return <Wishlist />;
  if (itemKey === 'orders') return <Orders />;
  if (itemKey === 'help') return <Help />;
  return <Cart />;
}

export const shop: Scene = {
  id: 'shop',
  title: 'Shop',
  subtitle: 'A bag button with a live badge, rows with counts, a cart that updates',
  accent: ORANGE,
  items,
  config: {
    radius: { card: 20 },
    layout: { cardWidth: 220 },
    colors: { light: { surface: '#fff', fabIcon: '#fff' } },
  },
  // The button is orange: the card is white once it opens.
  components: { Background, Trigger, Item, Highlight: null },
  Home,
  Screen,
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  home: { paddingHorizontal: 16, gap: 12 },
  h1: { fontSize: 32, fontWeight: '800', color: '#1c1c1e' },
  banner: { width: '100%', aspectRatio: 2, borderRadius: 18, overflow: 'hidden', backgroundColor: '#ddd' },
  bannerPage: { justifyContent: 'flex-end' },
  bannerDots: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingVertical: 10 },
  bannerText: { padding: 18, paddingBottom: 30, gap: 2 },
  bannerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textShadowColor: '#0008',
    textShadowRadius: 8,
  },
  bannerSubtitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: '#0008',
    textShadowRadius: 6,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  product: { width: '47%', flexGrow: 1, gap: 4 },
  productImage: {
    height: 150,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  productName: { fontSize: 15, fontWeight: '600', color: '#1c1c1e' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 15, fontWeight: '700', color: '#1c1c1e' },
  add: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { fontSize: 13, color: '#8e8e93', textAlign: 'center', marginTop: 6 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    marginHorizontal: 6,
    borderRadius: 12,
  },
  itemLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  count: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineImage: { width: 64, height: 64, borderRadius: 14 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  qty: { fontSize: 15, fontWeight: '700', minWidth: 14, textAlign: 'center' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginTop: 4,
  },
  total: { fontSize: 20, fontWeight: '800', color: '#1c1c1e' },
  primary: { backgroundColor: ORANGE, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  heart: { position: 'absolute', top: 10, right: 10 },
  step: { flexDirection: 'row', gap: 14 },
  stepRail: { alignItems: 'center' },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  stepDone: { backgroundColor: ORANGE, borderColor: ORANGE },
  stepLine: { width: 2, flex: 1, backgroundColor: '#ddd' },
  when: { fontSize: 13, color: '#8e8e93' },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  them: { alignSelf: 'flex-start', backgroundColor: '#f2f2f7' },
  me: { alignSelf: 'flex-end', backgroundColor: ORANGE },
  bubbleText: { fontSize: 15, color: '#1c1c1e', lineHeight: 20 },
});
