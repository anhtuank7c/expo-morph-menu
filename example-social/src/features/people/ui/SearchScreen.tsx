/** Search tab: trending topics, and people matching the query. */

import { router } from 'expo-router';
import { memo, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Trend, User } from '../../../core/api/dto';
import { TAB_BAR_HEIGHT, theme } from '../../../shared/theme';
import { QueryState } from '../../../shared/ui/QueryState';
import { useGetTrendsQuery, useSearchUsersQuery } from '../api/peopleApi';
import { PersonRow } from './PersonRow';
import { SearchField } from './SearchField';

const CONTENT = { paddingBottom: TAB_BAR_HEIGHT + 24 };

const openProfile = (user: User) => router.push({ pathname: '/profile/[handle]', params: { handle: user.handle } });

export function SearchScreen() {
  // The debounced query: this screen renders once per pause in typing, not per keystroke.
  const [q, setQ] = useState('');
  const people = useSearchUsersQuery(q);
  const trends = useGetTrendsQuery(undefined, { skip: q.length > 0 });
  const onQuery = useCallback((value: string) => setQ(value), []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={CONTENT} keyboardShouldPersistTaps="handled">
      <SearchField onQuery={onQuery} busy={people.isFetching} />

      {!q && (
        <>
          <Text style={styles.heading}>Trending</Text>
          <QueryState isLoading={trends.isLoading} error={trends.error} onRetry={trends.refetch} />
          {trends.data && <TrendList trends={trends.data} />}
        </>
      )}

      <Text style={styles.heading}>People</Text>
      <QueryState isLoading={people.isLoading} error={people.error} onRetry={people.refetch} />
      {people.data?.map((u) => <PersonRow key={u.id} user={u} onPress={openProfile} />)}
      {people.data?.length === 0 && <Text style={styles.empty}>No results.</Text>}
    </ScrollView>
  );
}

const TrendList = memo(function TrendList({ trends }: { trends: Trend[] }) {
  return trends.map((t, i) => (
    <View key={t.tag} style={styles.trend}>
      <Text style={styles.muted}>{i + 1} · Trending</Text>
      <Text style={styles.tag}>{t.tag}</Text>
      <Text style={styles.muted}>{t.posts}</Text>
    </View>
  ));
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  heading: { fontSize: 19, fontWeight: '800', color: theme.text, paddingHorizontal: 16, marginTop: 8, marginBottom: 4 },
  trend: { paddingHorizontal: 16, paddingVertical: 10, gap: 2 },
  tag: { fontSize: 16, fontWeight: '700', color: theme.text },
  muted: { color: theme.textMuted, fontSize: 13 },
  empty: { color: theme.textMuted, fontSize: 13, paddingHorizontal: 16 },
});
