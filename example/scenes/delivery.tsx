import { Ionicons } from '@expo/vector-icons';
import { renderIcon, type MorphBackgroundProps, type MorphItem, type MorphItemProps } from 'expo-morph-menu';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sheetItem, type Scene } from './types';
import { BackToDemos, SheetHeader } from './ui';

/**
 * A super app (rides, food, groceries, parcels). Tall rows with an ETA and a
 * price on the right come from an `Item` slot; a `Background` slot draws a
 * white card with a green band at the top, the same in the card and while
 * it grows into the screen.
 */

const GREEN = '#00a862';

function Background(_: MorphBackgroundProps) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.bg]}>
      <View style={styles.band} />
    </View>
  );
}

function Item({ item, colors }: MorphItemProps) {
  return (
    <View style={styles.item}>
      <View style={[styles.itemIcon, { backgroundColor: item.tint }]}>
        {renderIcon(item.icon, { size: 20, color: colors.iconForeground })}
      </View>
      <View style={styles.flex}>
        <Text style={styles.itemTitle}>{item.label}</Text>
        <Text style={styles.itemEta}>{item.data?.eta as string}</Text>
      </View>
      <Text style={styles.itemPrice}>{item.data?.price as string}</Text>
    </View>
  );
}

const ion = (name: keyof typeof Ionicons.glyphMap) =>
  function Icon({ size, color }: { size: number; color: string }) {
    return <Ionicons name={name} size={size} color={color} />;
  };

const items: MorphItem[] = [
  sheetItem('ride', 'Ride', {
    tint: GREEN,
    icon: ion('car-sport'),
    data: { eta: '3 min away', price: 'from $6' },
  }),
  sheetItem('food', 'Food', {
    tint: '#ff6b35',
    icon: ion('fast-food'),
    data: { eta: '25 min', price: 'free delivery' },
  }),
  sheetItem('grocery', 'Groceries', {
    tint: '#2bb3c0',
    icon: ion('basket'),
    data: { eta: '15 min', price: 'from $1' },
  }),
  sheetItem('parcel', 'Parcel', {
    tint: '#8a5cf6',
    icon: ion('cube'),
    data: { eta: 'pickup in 10 min', price: '$4' },
  }),
];

const PROMOS = [
  { title: '50% off your next 3 rides', color: GREEN },
  { title: 'Free delivery on lunch', color: '#ff6b35' },
];

function Home() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[
        styles.home,
        { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 120 },
      ]}
    >
      <BackToDemos />
      <Text style={styles.hello}>Good evening, Alex</Text>
      <View style={styles.where}>
        <Ionicons name="search" size={18} color="#1c1c1e" />
        <Text style={styles.whereText}>Where to?</Text>
        <View style={styles.now}>
          <Ionicons name="time" size={14} color="#1c1c1e" />
          <Text style={styles.nowText}>Now</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {PROMOS.map((p) => (
          <View key={p.title} style={[styles.promo, { backgroundColor: p.color }]}>
            <Text style={styles.promoText}>{p.title}</Text>
          </View>
        ))}
      </ScrollView>
      <Text style={styles.section}>Recent</Text>
      {['Home · 12 Elm Street', 'Work · Riverside Tower', 'Gym · Harbor Fitness'].map((r) => (
        <View key={r} style={styles.recent}>
          <View style={styles.recentIcon}>
            <Ionicons name="location" size={16} color="#1c1c1e" />
          </View>
          <Text style={styles.recentText}>{r}</Text>
        </View>
      ))}
      <Text style={styles.hint}>Tap + for every service: each row shows its ETA and price.</Text>
    </ScrollView>
  );
}

/** Streets drawn with views: a map placeholder that needs no map library. */
function FakeMap() {
  return (
    <View style={styles.map}>
      {[0.2, 0.45, 0.75].map((y) => (
        <View key={y} style={[styles.road, { top: `${y * 100}%`, left: 0, right: 0, height: 10 }]} />
      ))}
      {[0.3, 0.65].map((x) => (
        <View key={x} style={[styles.road, { left: `${x * 100}%`, top: 0, bottom: 0, width: 10 }]} />
      ))}
      <View style={[styles.pin, { top: '40%', left: '25%' }]}>
        <Ionicons name="radio-button-on" size={22} color={GREEN} />
      </View>
      <View style={[styles.pin, { top: '68%', left: '62%' }]}>
        <Ionicons name="location" size={30} color="#1c1c1e" />
      </View>
      <View style={[styles.pin, { top: '22%', left: '55%' }]}>
        <Ionicons name="car" size={22} color="#1c1c1e" />
      </View>
    </View>
  );
}

function Ride() {
  const [pick, setPick] = useState(0);
  const options = [
    { name: 'Economy', seats: 4, eta: '3 min', price: 8.4, icon: 'car-outline' as const },
    { name: 'Comfort', seats: 4, eta: '5 min', price: 12.9, icon: 'car-sport-outline' as const },
    { name: 'XL', seats: 6, eta: '7 min', price: 16.2, icon: 'bus-outline' as const },
  ];
  return (
    <View style={styles.page}>
      <SheetHeader title="Ride" />
      <FakeMap />
      <View style={styles.panel}>
        {options.map((o, i) => (
          <Pressable
            key={o.name}
            style={[styles.option, i === pick && styles.optionOn]}
            onPress={() => setPick(i)}
          >
            <Ionicons name={o.icon} size={28} color="#1c1c1e" />
            <View style={styles.flex}>
              <Text style={styles.optionName}>{o.name}</Text>
              <Text style={styles.itemEta}>
                {o.eta} · {o.seats} seats
              </Text>
            </View>
            <Text style={styles.optionPrice}>${o.price.toFixed(2)}</Text>
          </Pressable>
        ))}
        <Pressable style={styles.primary}>
          <Text style={styles.primaryText}>Choose {options[pick].name}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Food() {
  const places = [
    { name: 'Saigon Street Kitchen', tag: 'Vietnamese · Pho, banh mi', eta: '20–30 min', color: '#ffd8c2' },
    { name: 'Nonna Pasta', tag: 'Italian · Fresh pasta', eta: '25–35 min', color: '#ffe9b0' },
    { name: 'Green Bowl', tag: 'Healthy · Salads, bowls', eta: '15–25 min', color: '#d4f1d6' },
    { name: 'Tokyo Ramen Bar', tag: 'Japanese · Ramen', eta: '30–40 min', color: '#e3dcfb' },
  ];
  return (
    <View style={styles.page}>
      <SheetHeader title="Food" />
      <ScrollView contentContainerStyle={styles.home}>
        {places.map((p) => (
          <View key={p.name} style={styles.place}>
            <View style={[styles.placeImage, { backgroundColor: p.color }]}>
              <Ionicons name="restaurant" size={34} color="#00000055" />
            </View>
            <Text style={styles.optionName}>{p.name}</Text>
            <Text style={styles.itemEta}>
              {p.tag} · {p.eta}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Grocery() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const products = [
    ['Avocados', '$3.20', '#cfe8b5'],
    ['Oat milk', '$2.90', '#f1ead8'],
    ['Strawberries', '$4.50', '#ffd0d6'],
    ['Sourdough', '$5.10', '#f3dcb8'],
    ['Eggs, 12', '$3.80', '#fff1c7'],
    ['Coffee beans', '$9.90', '#e3d2c5'],
  ];
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  return (
    <View style={styles.page}>
      <SheetHeader
        title="Groceries"
        right={<Text style={styles.cartCount}>{count ? `${count} in cart` : ''}</Text>}
      />
      <ScrollView contentContainerStyle={[styles.home, styles.gridWrap]}>
        {products.map(([name, price, color]) => (
          <View key={name} style={styles.product}>
            <View style={[styles.productImage, { backgroundColor: color }]}>
              <Ionicons name="leaf" size={26} color="#00000040" />
            </View>
            <Text style={styles.productName}>{name}</Text>
            <View style={styles.productRow}>
              <Text style={styles.optionPrice}>{price}</Text>
              <Pressable
                style={styles.add}
                onPress={() => setCart((c) => ({ ...c, [name]: (c[name] ?? 0) + 1 }))}
                accessibilityLabel={`Add ${name}`}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Parcel() {
  return (
    <View style={styles.page}>
      <SheetHeader title="Send a parcel" />
      <View style={[styles.home, { gap: 10 }]}>
        <Text style={styles.section}>Pickup</Text>
        <TextInput style={styles.field} defaultValue="12 Elm Street" />
        <Text style={styles.section}>Drop-off</Text>
        <TextInput style={styles.field} placeholder="Address" defaultValue="Riverside Tower, floor 9" />
        <Text style={styles.section}>Size</Text>
        <View style={styles.sizes}>
          {['S', 'M', 'L'].map((s, i) => (
            <View key={s} style={[styles.size, i === 1 && styles.optionOn]}>
              <Ionicons name="cube-outline" size={18 + i * 6} color="#1c1c1e" />
              <Text style={styles.optionName}>{s}</Text>
            </View>
          ))}
        </View>
        <Pressable style={styles.primary}>
          <Text style={styles.primaryText}>Book pickup · $4</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Screen({ itemKey }: { itemKey: string }) {
  if (itemKey === 'food') return <Food />;
  if (itemKey === 'grocery') return <Grocery />;
  if (itemKey === 'parcel') return <Parcel />;
  return <Ride />;
}

export const delivery: Scene = {
  id: 'delivery',
  title: 'Super app',
  subtitle: 'Rides, food, groceries, parcels: tall rows with ETA and price',
  accent: GREEN,
  items,
  config: {
    radius: { card: 26 },
    layout: { cardWidth: 290, padding: 14 },
    colors: { light: { highlight: '#eef8f2', fabIcon: GREEN } },
  },
  components: { Background, Item },
  itemHeight: () => 64,
  Home,
  Screen,
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: '#fff' },
  home: { paddingHorizontal: 16, gap: 14 },
  bg: { backgroundColor: '#fff' },
  band: { height: 6, backgroundColor: GREEN },
  item: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  itemIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#1c1c1e' },
  itemEta: { fontSize: 12, color: '#6e6e73', marginTop: 1 },
  itemPrice: { fontSize: 12, fontWeight: '700', color: GREEN },
  hello: { fontSize: 26, fontWeight: '800', color: '#1c1c1e' },
  where: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f2f2f4',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
  },
  whereText: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1c1c1e' },
  now: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  nowText: { fontSize: 13, fontWeight: '600', color: '#1c1c1e' },
  promo: { width: 240, height: 110, borderRadius: 20, padding: 16, justifyContent: 'flex-end' },
  promoText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6e6e73',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f2f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentText: { fontSize: 15, color: '#1c1c1e' },
  hint: { fontSize: 13, color: '#8e8e93', textAlign: 'center' },
  map: { height: 280, backgroundColor: '#e8efe9', overflow: 'hidden' },
  road: { position: 'absolute', backgroundColor: '#fff' },
  pin: { position: 'absolute' },
  panel: {
    flex: 1,
    padding: 16,
    gap: 8,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    marginTop: -20,
    backgroundColor: '#fff',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionOn: { borderColor: '#1c1c1e', backgroundColor: '#f7f7f8' },
  optionName: { fontSize: 16, fontWeight: '700', color: '#1c1c1e' },
  optionPrice: { fontSize: 16, fontWeight: '700', color: '#1c1c1e' },
  primary: {
    marginTop: 8,
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  place: { gap: 4 },
  placeImage: {
    height: 130,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  product: { width: '47%', flexGrow: 1, gap: 6 },
  productImage: { height: 110, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 14, fontWeight: '600', color: '#1c1c1e' },
  productRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  add: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCount: { fontSize: 13, fontWeight: '700', color: GREEN },
  field: {
    backgroundColor: '#f2f2f4',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#1c1c1e',
  },
  sizes: { flexDirection: 'row', gap: 10 },
  size: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#eee',
  },
});
