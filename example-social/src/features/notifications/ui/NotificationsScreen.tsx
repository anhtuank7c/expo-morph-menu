/**
 * Notifications tab. Unread rows stay highlighted while the tab is visible;
 * leaving the tab marks everything as read (optimistic mutation). Marking
 * as read changes every unread row, so those rows render again, and the
 * rows that were already read keep their identity and do not.
 */

import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useRef } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View, type ListRenderItem } from 'react-native';

import type { IconName, Notice } from '../../../core/api/dto';
import { timeAgo } from '../../../shared/lib/format';
import { TAB_BAR_HEIGHT, theme } from '../../../shared/theme';
import { Avatar } from '../../../shared/ui/Avatar';
import { QueryState } from '../../../shared/ui/QueryState';
import { Separator } from '../../../shared/ui/Separator';
import { useGetNotificationsQuery, useMarkNotificationsReadMutation } from '../api/notificationsApi';

const KIND: Record<Notice['kind'], { icon: IconName; color: string; text: string }> = {
  like: { icon: 'heart', color: theme.like, text: 'liked your post' },
  follow: { icon: 'person-add', color: theme.accent, text: 'followed you' },
  reply: { icon: 'chatbubble', color: '#0ea5e9', text: 'replied to your post' },
  repost: { icon: 'repeat', color: theme.repost, text: 'reposted your post' },
  mention: { icon: 'at', color: '#f59e0b', text: 'mentioned you' },
};

const CONTENT = { paddingBottom: TAB_BAR_HEIGHT + 24 };
const EMPTY: Notice[] = [];
const keyOf = (n: Notice) => n.id;
const renderRow: ListRenderItem<Notice> = ({ item }) => <NoticeRow notice={item} />;

export function NotificationsScreen() {
  const { data = EMPTY, isLoading, isFetching, error, refetch } = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationsReadMutation();
  // Read in the blur cleanup; a ref avoids re-subscribing the focus effect on every data change.
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
  const refresh = useCallback(() => void refetch(), [refetch]);

  return (
    <FlatList
      data={data}
      keyExtractor={keyOf}
      renderItem={renderRow}
      style={styles.list}
      contentContainerStyle={CONTENT}
      ItemSeparatorComponent={Separator}
      ListEmptyComponent={<QueryState isLoading={isLoading} error={error} onRetry={refetch} />}
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refresh} tintColor={theme.accent} />}
    />
  );
}

const NoticeRow = memo(function NoticeRow({ notice }: { notice: Notice }) {
  const kind = KIND[notice.kind];
  const open = useCallback(() => {
    if (notice.postId) router.push({ pathname: '/post/[id]', params: { id: notice.postId } });
    else router.push({ pathname: '/profile/[handle]', params: { handle: notice.user.handle } });
  }, [notice.postId, notice.user.handle]);

  return (
    <Pressable style={[styles.row, !notice.read && styles.unread]} onPress={open}>
      <Ionicons name={kind.icon} size={22} color={kind.color} style={styles.kind} />
      <View style={styles.body}>
        <Avatar user={notice.user} size={32} />
        <Text style={styles.text}>
          <Text style={styles.bold}>{notice.user.name}</Text> {kind.text} · {timeAgo(notice.createdAt)}
        </Text>
        {notice.postText ? (
          <Text style={styles.muted} numberOfLines={2}>
            {notice.postText}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  list: { backgroundColor: theme.background },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  unread: { backgroundColor: theme.accentSoft },
  kind: { width: 32, textAlign: 'center' },
  body: { flex: 1, gap: 6 },
  text: { color: theme.text, fontSize: 15 },
  bold: { fontWeight: '700' },
  muted: { color: theme.textMuted, fontSize: 14 },
});
