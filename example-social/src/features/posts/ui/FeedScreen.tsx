/**
 * Feed tab: "For you" and "Following".
 *
 * `useGetFeedInfiniteQuery` loads the feed page by page (cursor pagination).
 * Each tab is a separate cache entry, so switching tabs keeps both lists.
 * Pull to refresh refetches the loaded pages; reaching the end loads the next.
 */

import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { FeedTab } from '../../../core/api/dto';
import { TAB_BAR_HEIGHT, theme } from '../../../shared/theme';
import { QueryState } from '../../../shared/ui/QueryState';
import { useGetFeedInfiniteQuery } from '../api/postsApi';
import { PostList } from './PostList';

const TABS: { key: FeedTab; label: string }[] = [
  { key: 'for_you', label: 'For you' },
  { key: 'following', label: 'Following' },
];

// Leave room for the floating button above the tab bar.
const CONTENT = { paddingBottom: TAB_BAR_HEIGHT + 24 };
const STICKY = [0];

export function FeedScreen() {
  const [tab, setTab] = useState<FeedTab>('for_you');
  const { data, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch, error } =
    useGetFeedInfiniteQuery(tab);

  // Flatten only when the pages change, so the list gets the same array between renders.
  const posts = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const refreshing = isFetching && !isLoading && !isFetchingNextPage;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !error) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, error, fetchNextPage]);
  const refresh = useCallback(() => void refetch(), [refetch]);
  const retryNextPage = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  let footer: React.ReactElement | undefined;
  if (isFetchingNextPage) footer = <ActivityIndicator style={styles.footer} color={theme.accent} />;
  else if (posts.length > 0 && error)
    footer = <QueryState isLoading={false} error={error} onRetry={retryNextPage} />;
  else if (posts.length > 0 && !hasNextPage) footer = <Text style={styles.end}>You are all caught up.</Text>;

  return (
    <PostList
      posts={posts}
      style={styles.list}
      contentContainerStyle={CONTENT}
      stickyHeaderIndices={STICKY}
      onEndReachedThreshold={0.5}
      onEndReached={loadMore}
      ListHeaderComponent={<FeedTabs tab={tab} onChange={setTab} />}
      ListEmptyComponent={<QueryState isLoading={isLoading} error={error} onRetry={refetch} />}
      ListFooterComponent={footer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={theme.accent}
          colors={[theme.accent]}
          onRefresh={refresh}
        />
      }
    />
  );
}

const FeedTabs = memo(function FeedTabs({
  tab,
  onChange,
}: {
  tab: FeedTab;
  onChange: (tab: FeedTab) => void;
}) {
  return (
    <View style={styles.segments}>
      {TABS.map((t) => (
        <Pressable
          key={t.key}
          onPress={() => onChange(t.key)}
          style={styles.segment}
          testID={`feed-${t.key}`}
        >
          <Text style={[styles.segmentText, tab === t.key && styles.segmentActive]}>{t.label}</Text>
          {tab === t.key && <View style={styles.indicator} />}
        </Pressable>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  list: { backgroundColor: theme.background },
  segments: {
    flexDirection: 'row',
    backgroundColor: theme.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  segmentText: { fontSize: 15, fontWeight: '600', color: theme.textMuted },
  segmentActive: { color: theme.text },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: 48,
    borderRadius: 2,
    backgroundColor: theme.accent,
  },
  footer: { padding: 24 },
  end: { textAlign: 'center', color: theme.textMuted, padding: 24 },
});
