/**
 * Notifications tab. Unread rows stay highlighted while the tab is visible;
 * leaving the tab marks everything as read (optimistic mutation).
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useGetNotificationsQuery, useMarkNotificationsReadMutation } from '../../api/murmurApi';
import type { Notice } from '../../api/types';
import { Avatar } from '../../components/Avatar';
import { QueryState } from '../../components/QueryState';
import { timeAgo } from '../../format';
import { TAB_BAR_HEIGHT, theme } from '../../theme';

const KIND: Record<Notice['kind'], { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; text: string }> = {
  like: { icon: 'heart', color: theme.like, text: 'liked your post' },
  follow: { icon: 'person-add', color: theme.accent, text: 'followed you' },
  reply: { icon: 'chatbubble', color: '#0ea5e9', text: 'replied to your post' },
  repost: { icon: 'repeat', color: theme.repost, text: 'reposted your post' },
  mention: { icon: 'at', color: '#f59e0b', text: 'mentioned you' },
};

export default function NotificationsScreen() {
  const { data = [], isLoading, isFetching, error, refetch } = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationsReadMutation();
  const router = useRouter();
  const hasUnread = useRef(false);
  hasUnread.current = data.some((n) => !n.read);

  useFocusEffect(
    useCallback(
      () => () => {
        if (hasUnread.current) markRead();
      },
      [markRead],
    ),
  );

  return (
    <FlatList
      data={data}
      keyExtractor={(n) => n.id}
      style={styles.list}
      contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 24 }}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={<QueryState isLoading={isLoading} error={error} onRetry={refetch} />}
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} tintColor={theme.accent} />}
      renderItem={({ item }) => {
        const kind = KIND[item.kind];
        return (
          <Pressable
            style={[styles.row, !item.read && styles.unread]}
            onPress={() =>
              item.postId
                ? router.push({ pathname: '/post/[id]', params: { id: item.postId } })
                : router.push({ pathname: '/profile/[handle]', params: { handle: item.user.handle } })
            }
          >
            <Ionicons name={kind.icon} size={22} color={kind.color} style={styles.kind} />
            <View style={{ flex: 1, gap: 6 }}>
              <Avatar user={item.user} size={32} />
              <Text style={styles.text}>
                <Text style={styles.bold}>{item.user.name}</Text> {kind.text} · {timeAgo(item.createdAt)}
              </Text>
              {item.postText ? (
                <Text style={styles.muted} numberOfLines={2}>
                  {item.postText}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: theme.background },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  unread: { backgroundColor: theme.accentSoft },
  kind: { width: 32, textAlign: 'center' },
  text: { color: theme.text, fontSize: 15 },
  bold: { fontWeight: '700' },
  muted: { color: theme.textMuted, fontSize: 14 },
});
