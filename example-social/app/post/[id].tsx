/** Post detail with replies, pushed on the root Stack. Two queries load in parallel. */

import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useGetPostQuery, useGetRepliesQuery } from '../../api/murmurApi';
import { PostCard } from '../../components/PostCard';
import { QueryState } from '../../components/QueryState';
import { theme } from '../../theme';

export default function PostScreen() {
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
    <FlatList
      style={styles.list}
      data={replies.data ?? []}
      keyExtractor={(p) => p.id}
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
          <Text style={[styles.muted, { padding: 16 }]}>No replies yet.</Text>
        )
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => <PostCard post={item} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: theme.background },
  header: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  section: { paddingHorizontal: 16, paddingVertical: 10, fontWeight: '700', color: theme.textMuted },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border },
  muted: { color: theme.textMuted },
});
