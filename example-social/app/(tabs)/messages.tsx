/**
 * Messages tab: conversation list, polled every 5 seconds while visible.
 *
 * Tapping a conversation pushes `/chat/[id]` on the root Stack. The tab bar
 * and the floating button are covered or hidden there. Compare with "New
 * message" in the floating menu, which opens the same chat inside the sheet.
 */

import { Link } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useGetConversationsQuery } from '../../api/murmurApi';
import { Avatar } from '../../components/Avatar';
import { QueryState } from '../../components/QueryState';
import { timeAgo } from '../../format';
import { TAB_BAR_HEIGHT, theme } from '../../theme';

export default function MessagesScreen() {
  const { data = [], isLoading, isFetching, error, refetch } = useGetConversationsQuery(undefined, {
    pollingInterval: 5_000,
  });

  return (
    <FlatList
      data={data}
      keyExtractor={(c) => c.id}
      style={styles.list}
      contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 24 }}
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} tintColor={theme.accent} />}
      ListEmptyComponent={
        isLoading || error ? (
          <QueryState isLoading={isLoading} error={error} onRetry={refetch} />
        ) : (
          <Text style={styles.empty}>No conversations yet.</Text>
        )
      }
      renderItem={({ item }) => {
        const last = item.lastMessage;
        return (
          <Link href={{ pathname: '/chat/[id]', params: { id: item.id } }} asChild>
            <Pressable style={styles.row} testID={`conversation-${item.id}`}>
              <Avatar user={item.user} size={50} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.top}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.user.name}
                  </Text>
                  {last && <Text style={styles.muted}>{timeAgo(last.createdAt)}</Text>}
                </View>
                <Text style={[styles.muted, item.unread > 0 && styles.unreadText]} numberOfLines={1}>
                  {item.typing ? 'typing...' : `${last?.from === 'me' ? 'You: ' : ''}${last?.text ?? ''}`}
                </Text>
              </View>
              {item.unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unread}</Text>
                </View>
              )}
            </Pressable>
          </Link>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: theme.background },
  empty: { textAlign: 'center', color: theme.textMuted, marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', color: theme.text, flexShrink: 1 },
  muted: { color: theme.textMuted, fontSize: 14 },
  unreadText: { color: theme.text, fontWeight: '600' },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
