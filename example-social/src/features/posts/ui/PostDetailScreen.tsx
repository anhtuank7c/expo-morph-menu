/** Post detail with replies, pushed on the root Stack. Both queries load in parallel. */

import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../../../shared/theme';
import { QueryState } from '../../../shared/ui/QueryState';
import { useGetPostQuery, useGetRepliesQuery } from '../api/postsApi';
import { PostCard } from './PostCard';
import { PostList } from './PostList';

export function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = useGetPostQuery(id);
  const replies = useGetRepliesQuery(id);

  if (!post.data) {
    return (
      <View style={styles.list}>
        <QueryState isLoading={post.isLoading} error={post.error} onRetry={post.refetch} />
      </View>
    );
  }

  return (
    <PostList
      style={styles.list}
      posts={replies.data ?? EMPTY}
      ListHeaderComponent={
        <View style={styles.header}>
          <PostCard post={post.data} large />
          <Text style={styles.section}>Replies</Text>
        </View>
      }
      ListEmptyComponent={
        replies.isLoading || replies.error ? (
          <QueryState isLoading={replies.isLoading} error={replies.error} onRetry={replies.refetch} />
        ) : (
          <Text style={styles.empty}>No replies yet.</Text>
        )
      }
    />
  );
}

/** One empty array for every render, instead of a new `[]` each time. */
const EMPTY: never[] = [];

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: theme.background },
  header: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  section: { paddingHorizontal: 16, paddingVertical: 10, fontWeight: '700', color: theme.textMuted },
  empty: { color: theme.textMuted, padding: 16 },
});
