/**
 * Feed tab: "For you" and "Following".
 *
 * `useGetFeedInfiniteQuery` loads the feed page by page (cursor pagination).
 * Each tab is a separate cache entry, so switching tabs keeps both lists.
 * Pull to refresh refetches the loaded pages; reaching the end loads the next.
 */

import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useGetFeedInfiniteQuery } from '../../api/murmurApi';
import type { FeedTab } from '../../api/types';
import { PostCard } from '../../components/PostCard';
import { QueryState } from '../../components/QueryState';
import { TAB_BAR_HEIGHT, theme } from '../../theme';

const TABS: { key: FeedTab; label: string }[] = [
  { key: 'for_you', label: 'For you' },
  { key: 'following', label: 'Following' },
];

export default function FeedScreen() {
  const [tab, setTab] = useState<FeedTab>('for_you');
  const { data, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch, error } =
    useGetFeedInfiniteQuery(tab);
  const posts = data?.pages.flatMap((page) => page.items) ?? [];
  const refreshing = isFetching && !isLoading && !isFetchingNextPage;

  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PostCard post={item} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      // Leave room for the floating button above the tab bar.
      contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 24 }}
      style={styles.list}
      stickyHeaderIndices={[0]}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage && !error) fetchNextPage();
      }}
      ListHeaderComponent={
        <View style={styles.segments}>
          {TABS.map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.segment} testID={`feed-${t.key}`}>
              <Text style={[styles.segmentText, tab === t.key && styles.segmentActive]}>{t.label}</Text>
              {tab === t.key && <View style={styles.indicator} />}
            </Pressable>
          ))}
        </View>
      }
      ListEmptyComponent={<QueryState isLoading={isLoading} error={error} onRetry={refetch} />}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator style={styles.footer} color={theme.accent} />
        ) : posts.length > 0 && error ? (
          <QueryState isLoading={false} error={error} onRetry={() => fetchNextPage()} />
        ) : posts.length > 0 && !hasNextPage ? (
          <Text style={styles.end}>You are all caught up.</Text>
        ) : undefined
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} tintColor={theme.accent} colors={[theme.accent]} onRefresh={() => void refetch()} />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: theme.background },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border },
  segments: {
    flexDirection: 'row',
    backgroundColor: theme.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  segmentText: { fontSize: 15, fontWeight: '600', color: theme.textMuted },
  segmentActive: { color: theme.text },
  indicator: { position: 'absolute', bottom: 0, height: 3, width: 48, borderRadius: 2, backgroundColor: theme.accent },
  footer: { padding: 24 },
  end: { textAlign: 'center', color: theme.textMuted, padding: 24 },
});
