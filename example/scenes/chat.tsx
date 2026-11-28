import { Ionicons } from '@expo/vector-icons';
import { renderIcon, type MorphItem, type MorphItemProps } from 'expo-morph-menu';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sheetItem, type Scene } from './types';
import { BackToDemos, Initials, SheetHeader } from './ui';

/**
 * A messaging app. The rows have a title and a subtitle: an `Item` slot draws
 * them, and `itemHeight` gives the taller rows their height in advance. The
 * built-in Highlight still marks the row under the finger.
 */

const BLUE = '#2f6bff';

function Item({ item, colors }: MorphItemProps) {
  const subtitle = item.data?.subtitle as string | undefined;
  return (
    <View style={styles.item}>
      <View style={[styles.itemIcon, { backgroundColor: item.tint }]}>
        {renderIcon(item.icon, { size: 17, color: colors.iconForeground })}
      </View>
      <View style={styles.flex}>
        <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
          {item.label}
        </Text>
        {subtitle ? (
          <Text style={styles.itemSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const ion = (name: keyof typeof Ionicons.glyphMap) =>
  function Icon({ size, color }: { size: number; color: string }) {
    return <Ionicons name={name} size={size} color={color} />;
  };

const items: MorphItem[] = [
  sheetItem('message', 'New message', {
    tint: BLUE,
    icon: ion('create'),
    data: { subtitle: 'Write to someone' },
  }),
  sheetItem('group', 'New group', {
    tint: '#22b07d',
    icon: ion('people'),
    data: { subtitle: 'Up to 200 people' },
  }),
  sheetItem('channel', 'New channel', {
    tint: '#ff8a3d',
    icon: ion('megaphone'),
    data: { subtitle: 'Broadcast to many' },
  }),
  sheetItem('invite', 'Invite friends', {
    tint: '#b05cff',
    icon: ion('gift'),
    data: { subtitle: 'Share a link' },
  }),
];

const CHATS = [
  { name: 'Design team', color: '#7c5cff', last: 'Mia: the new icons are in Figma', time: '9:41', unread: 3 },
  { name: 'Leo Park', color: '#ff7a59', last: 'See you at 7?', time: '9:12', unread: 1 },
  { name: 'Ana Silva', color: '#1fb6a6', last: 'Photo', time: 'Yesterday', unread: 0 },
  { name: 'Weekend trip', color: '#e0559b', last: 'Kai: I booked the cabin', time: 'Yesterday', unread: 0 },
  { name: 'Mom', color: '#f5a623', last: 'Call me when you can', time: 'Mon', unread: 0 },
  { name: 'Run club', color: '#22b07d', last: 'Tomorrow 6 am, river loop', time: 'Sun', unread: 0 },
];
const CONTACTS = [
  'Ana Silva',
  'Ben Cole',
  'Chloe Kim',
  'Dev Patel',
  'Emma Ross',
  'Kai Ito',
  'Leo Park',
  'Mia Chen',
];
const COLORS = ['#1fb6a6', '#5b8def', '#e0559b', '#f5a623', '#7c5cff', '#22b07d', '#ff7a59', '#b05cff'];

function Home() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 120 }}
    >
      <View style={styles.pad}>
        <BackToDemos />
        <Text style={styles.h1}>Chats</Text>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color="#8e8e93" />
          <Text style={styles.searchText}>Search</Text>
        </View>
      </View>
      {CHATS.map((c) => (
        <View key={c.name} style={styles.chat}>
          <Initials name={c.name} color={c.color} size={50} />
          <View style={styles.flex}>
            <View style={styles.chatTop}>
              <Text style={styles.chatName}>{c.name}</Text>
              <Text style={styles.chatTime}>{c.time}</Text>
            </View>
            <View style={styles.chatTop}>
              <Text style={styles.chatLast} numberOfLines={1}>
                {c.last}
              </Text>
              {c.unread ? (
                <View style={styles.unread}>
                  <Text style={styles.unreadText}>{c.unread}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function Message() {
  const [q, setQ] = useState('');
  const list = CONTACTS.filter((c) => c.toLowerCase().includes(q.toLowerCase()));
  return (
    <View style={styles.page}>
      <SheetHeader title="New message" />
      <View style={styles.pad}>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color="#8e8e93" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="To: name or number"
            style={styles.input}
            placeholderTextColor="#8e8e93"
          />
        </View>
      </View>
      <ScrollView>
        {list.map((c) => (
          <View key={c} style={styles.contact}>
            <Initials name={c} color={COLORS[CONTACTS.indexOf(c)]} />
            <Text style={styles.contactName}>{c}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Group() {
  const [picked, setPicked] = useState<string[]>(['Mia Chen', 'Leo Park']);
  const toggle = (c: string) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  return (
    <View style={styles.page}>
      <SheetHeader title="New group" right={<Text style={styles.action}>Create</Text>} />
      <View style={styles.pad}>
        <TextInput placeholder="Group name" defaultValue="Weekend crew" style={styles.field} />
        <Text style={styles.label}>{picked.length} members</Text>
      </View>
      <ScrollView>
        {CONTACTS.map((c, i) => {
          const on = picked.includes(c);
          return (
            <Pressable
              key={c}
              style={styles.contact}
              onPress={() => toggle(c)}
              accessibilityState={{ checked: on }}
            >
              <Initials name={c} color={COLORS[i]} />
              <Text style={styles.contactName}>{c}</Text>
              <Ionicons
                name={on ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={on ? '#22b07d' : '#c7c7cc'}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Channel() {
  const [pub, setPub] = useState(true);
  return (
    <View style={styles.page}>
      <SheetHeader title="New channel" right={<Text style={styles.action}>Next</Text>} />
      <View style={[styles.pad, { gap: 12 }]}>
        <View style={styles.channelIcon}>
          <Ionicons name="megaphone" size={34} color="#fff" />
        </View>
        <TextInput placeholder="Channel name" defaultValue="Product updates" style={styles.field} />
        <TextInput
          placeholder="Description"
          style={[styles.field, { height: 90 }]}
          multiline
          defaultValue="Release notes and sneak peeks, every Friday."
        />
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text style={styles.contactName}>Public channel</Text>
            <Text style={styles.chatLast}>Anyone can find it and join</Text>
          </View>
          <Switch value={pub} onValueChange={setPub} />
        </View>
      </View>
    </View>
  );
}

function Invite() {
  return (
    <View style={styles.page}>
      <SheetHeader title="Invite friends" />
      <View style={[styles.pad, { alignItems: 'center', gap: 14, marginTop: 30 }]}>
        <View style={[styles.channelIcon, { backgroundColor: '#b05cff' }]}>
          <Ionicons name="gift" size={34} color="#fff" />
        </View>
        <Text style={styles.h2}>Chat is better together</Text>
        <Text style={[styles.chatLast, { textAlign: 'center' }]}>
          Friends who join with your link get a month of extra storage, and so do you.
        </Text>
        <View style={styles.link}>
          <Text style={styles.linkText}>chat.example/invite/alex</Text>
          <Ionicons name="copy-outline" size={18} color={BLUE} />
        </View>
      </View>
    </View>
  );
}

function Screen({ itemKey }: { itemKey: string }) {
  if (itemKey === 'group') return <Group />;
  if (itemKey === 'channel') return <Channel />;
  if (itemKey === 'invite') return <Invite />;
  return <Message />;
}

export const chat: Scene = {
  id: 'chat',
  title: 'Messaging',
  subtitle: 'Chat list with a compose menu: rows with subtitles from an Item slot',
  accent: BLUE,
  items,
  config: {
    radius: { card: 22 },
    layout: { cardWidth: 264 },
    colors: { light: { highlight: '#eef3ff', fabIcon: BLUE } },
  },
  components: { Item },
  itemHeight: (item) => (item.data?.subtitle ? 60 : 46),
  fabIcon: ({ size, color }) => <Ionicons name="create-outline" size={size - 2} color={color} />,
  Home,
  Screen,
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: '#fff' },
  pad: { paddingHorizontal: 16, gap: 10 },
  h1: { fontSize: 32, fontWeight: '800', color: '#1c1c1e' },
  h2: { fontSize: 22, fontWeight: '800', color: '#1c1c1e' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f2f2f7',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 6,
  },
  searchText: { color: '#8e8e93', fontSize: 15 },
  input: { flex: 1, fontSize: 15, color: '#1c1c1e' },
  chat: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  chatName: { fontSize: 16, fontWeight: '700', color: '#1c1c1e' },
  chatTime: { fontSize: 12, color: '#8e8e93' },
  chatLast: { flex: 1, fontSize: 14, color: '#6e6e73' },
  unread: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  item: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  itemIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemSubtitle: { fontSize: 12, color: '#8e8e93', marginTop: 1 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  contactName: { flex: 1, fontSize: 16, color: '#1c1c1e', fontWeight: '500' },
  action: { color: BLUE, fontSize: 16, fontWeight: '700' },
  field: {
    backgroundColor: '#f2f2f7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1c1c1e',
  },
  label: { fontSize: 13, color: '#8e8e93', fontWeight: '600', textTransform: 'uppercase' },
  channelIcon: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ff8a3d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#eef3ff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  linkText: { color: BLUE, fontSize: 15, fontWeight: '600' },
});
