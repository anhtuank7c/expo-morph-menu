/**
 * Messages tab: conversation list, polled every 5 seconds while visible.
 *
 * Tapping a conversation pushes `/chat/[id]` on the root Stack. The tab bar
 * and the floating button are covered or hidden there. Compare with "New
 * message" in the floating menu, which opens the same chat inside the sheet.
 *
 * Rendering: RTK Query keeps unchanged objects when a poll returns the same
 * data (structural sharing), so the memoized rows of unchanged
 * conversations do not render again.
 */

import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';

import type { ConversationSummary } from '../../../core/api/dto';
import { timeAgo } from '../../../shared/lib/format';
import { TAB_BAR_HEIGHT, theme } from '../../../shared/theme';
import { Avatar } from '../../../shared/ui/Avatar';
import { QueryState } from '../../../shared/ui/QueryState';
import { useGetConversationsQuery } from '../api/messagesApi';

const CONTENT = { paddingBottom: TAB_BAR_HEIGHT + 24 };
const EMPTY: ConversationSummary[] = [];
const keyOf = (c: ConversationSummary) => c.id;
const renderRow: ListRenderItem<ConversationSummary> = ({ item }) => <ConversationRow conversation={item} />;

export function MessagesScreen() {
  const {
    data = EMPTY,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetConversationsQuery(undefined, {
    pollingInterval: 5_000,
  });
  const refresh = useCallback(() => void refetch(), [refetch]);

  return (
    <FlatList
      data={data}
      keyExtractor={keyOf}
      renderItem={renderRow}
      style={styles.list}
      contentContainerStyle={CONTENT}
      refreshControl={
        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refresh} tintColor={theme.accent} />
      }
      ListEmptyComponent={
        isLoading || error ? (
          <QueryState isLoading={isLoading} error={error} onRetry={refetch} />
        ) : (
          <Text style={styles.empty}>No conversations yet.</Text>
        )
      }
    />
  );
}

const ConversationRow = memo(function ConversationRow({
  conversation,
}: {
  conversation: ConversationSummary;
}) {
  const { id, user, lastMessage: last, unread, typing } = conversation;
  const open = useCallback(() => router.push({ pathname: '/chat/[id]', params: { id } }), [id]);
  return (
    <Pressable style={styles.row} onPress={open} testID={`conversation-${id}`}>
      <Avatar user={user} size={50} />
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={1}>
            {user.name}
          </Text>
          {last && <Text style={styles.muted}>{timeAgo(last.createdAt)}</Text>}
        </View>
        <Text style={[styles.muted, unread > 0 && styles.unreadText]} numberOfLines={1}>
          {typing ? 'typing...' : `${last?.from === 'me' ? 'You: ' : ''}${last?.text ?? ''}`}
        </Text>
      </View>
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread}</Text>
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  list: { backgroundColor: theme.background },
  empty: { textAlign: 'center', color: theme.textMuted, marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  body: { flex: 1, gap: 2 },
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
