/**
 * Search tab. The query string is debounced, and each distinct query is its
 * own cache entry, so typing back to an earlier query is answered from cache.
 */

import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useGetTrendsQuery, useSearchUsersQuery } from '../../api/murmurApi';
import { Avatar } from '../../components/Avatar';
import { QueryState } from '../../components/QueryState';
import { compact } from '../../format';
import { TAB_BAR_HEIGHT, theme } from '../../theme';

function useDebounced<T>(value: T, ms = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim().toLowerCase());
  const people = useSearchUsersQuery(q);
  const trends = useGetTrendsQuery(undefined, { skip: q.length > 0 });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.field}>
        <Ionicons name="search" size={18} color={theme.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search people"
          placeholderTextColor={theme.textMuted}
          style={styles.input}
          testID="search-input"
        />
        {people.isFetching && <ActivityIndicator size="small" color={theme.textMuted} />}
      </View>

      {!q && (
        <>
          <Text style={styles.heading}>Trending</Text>
          <QueryState isLoading={trends.isLoading} error={trends.error} onRetry={trends.refetch} />
          {trends.data?.map((t, i) => (
            <View key={t.tag} style={styles.trend}>
              <Text style={styles.muted}>{i + 1} · Trending</Text>
              <Text style={styles.tag}>{t.tag}</Text>
              <Text style={styles.muted}>{t.posts}</Text>
            </View>
          ))}
        </>
      )}

      <Text style={styles.heading}>People</Text>
      <QueryState isLoading={people.isLoading} error={people.error} onRetry={people.refetch} />
      {people.data?.map((u) => (
        <Link key={u.id} href={{ pathname: '/profile/[handle]', params: { handle: u.handle } }} asChild>
          <Pressable style={styles.person}>
            <Avatar user={u} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{u.name}</Text>
              <Text style={styles.muted}>
                @{u.handle} · {compact(u.followers)} followers
              </Text>
            </View>
            {u.isFollowed && <Text style={styles.following}>Following</Text>}
          </Pressable>
        </Link>
      ))}
      {people.data?.length === 0 && <Text style={[styles.muted, { paddingHorizontal: 16 }]}>No results.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.surface,
  },
  input: { flex: 1, fontSize: 15, color: theme.text },
  heading: { fontSize: 19, fontWeight: '800', color: theme.text, paddingHorizontal: 16, marginTop: 8, marginBottom: 4 },
  trend: { paddingHorizontal: 16, paddingVertical: 10, gap: 2 },
  tag: { fontSize: 16, fontWeight: '700', color: theme.text },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  name: { fontSize: 15, fontWeight: '700', color: theme.text },
  muted: { color: theme.textMuted, fontSize: 13 },
  following: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
});
