/**
 * "New message": pick a person. `openConversation` finds or creates the
 * conversation on the server, then the thread is pushed inside the sheet
 * (`/compose/thread/[id]`). Closing from the thread goes back to this list;
 * closing from here collapses the sheet into the card.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useOpenConversationMutation, useSearchUsersQuery } from '../../api/murmurApi';
import { Avatar } from '../../components/Avatar';
import { QueryState, errorText } from '../../components/QueryState';
import { SheetHeader } from '../../components/SheetHeader';
import { theme } from '../../theme';

export default function NewMessage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const people = useSearchUsersQuery(query.trim().toLowerCase());
  const [openConversation, opening] = useOpenConversationMutation();
  const [pending, setPending] = useState<string | null>(null);

  const open = async (userId: string) => {
    setPending(userId);
    try {
      const conversation = await openConversation({ userId }).unwrap();
      router.push({ pathname: '/compose/thread/[id]', params: { id: conversation.id } });
    } catch {
      // Error shown above the list.
    } finally {
      setPending(null);
    }
  };

  return (
    <View style={styles.screen}>
      <SheetHeader title="New message" />
      <View style={styles.field}>
        <Text style={styles.to}>To:</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search people"
          placeholderTextColor={theme.textMuted}
          style={styles.input}
        />
      </View>
      {opening.error ? <Text style={styles.error}>{errorText(opening.error)}</Text> : null}
      <FlatList
        data={people.data ?? []}
        keyExtractor={(u) => u.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<QueryState isLoading={people.isLoading} error={people.error} onRetry={people.refetch} />}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            testID={`contact-${item.handle}`}
            disabled={pending !== null}
            onPress={() => open(item.id)}
          >
            <Avatar user={item} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.muted}>@{item.handle}</Text>
            </View>
            {pending === item.id ? (
              <ActivityIndicator size="small" color={theme.textMuted} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  to: { color: theme.textMuted, fontSize: 15 },
  input: { flex: 1, fontSize: 15, color: theme.text },
  error: { color: theme.like, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  name: { fontWeight: '700', color: theme.text, fontSize: 15 },
  muted: { color: theme.textMuted, fontSize: 14 },
});
