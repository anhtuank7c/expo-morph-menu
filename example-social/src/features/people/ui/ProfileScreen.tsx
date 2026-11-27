/**
 * Profile, pushed on the root Stack.
 * - Follow / Following: optimistic mutation on the cached user.
 * - Message: `openConversation` finds or creates the conversation on the
 *   server, then pushes `/chat/[id]` (a regular push, not the morph menu).
 */

import { Stack, router, useLocalSearchParams } from 'expo-router';
import { memo, useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { User } from '../../../core/api/dto';
import { compact } from '../../../shared/lib/format';
import { theme } from '../../../shared/theme';
import { Avatar } from '../../../shared/ui/Avatar';
import { QueryState, errorText } from '../../../shared/ui/QueryState';
import { useLogoutMutation } from '../../auth';
import { useOpenConversationMutation } from '../../messages';
import { PostList, useGetUserPostsQuery } from '../../posts';
import { useGetUserQuery, useSetFollowMutation } from '../api/peopleApi';

export function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const user = useGetUserQuery(handle);
  const posts = useGetUserPostsQuery(handle);

  if (!user.data) {
    return (
      <View style={styles.list}>
        <QueryState isLoading={user.isLoading} error={user.error} onRetry={user.refetch} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: user.data.name }} />
      <PostList
        style={styles.list}
        posts={posts.data ?? EMPTY}
        ListHeaderComponent={<ProfileHeader user={user.data} />}
        ListEmptyComponent={
          posts.isLoading || posts.error ? (
            <QueryState isLoading={posts.isLoading} error={posts.error} onRetry={posts.refetch} />
          ) : (
            <Text style={[styles.muted, styles.empty]}>No posts yet.</Text>
          )
        }
      />
    </>
  );
}

const EMPTY: never[] = [];

/** Renders again only when the user object changes (follow, refetch), not when the post list loads. */
const ProfileHeader = memo(function ProfileHeader({ user }: { user: User }) {
  const [setFollow] = useSetFollowMutation();
  const [openConversation, opening] = useOpenConversationMutation();
  const [logout] = useLogoutMutation();
  const isMe = user.id === 'me';

  const message = useCallback(async () => {
    try {
      const conversation = await openConversation({ userId: user.id }).unwrap();
      router.push({ pathname: '/chat/[id]', params: { id: conversation.id } });
    } catch {
      // The error is shown under the buttons (opening.error).
    }
  }, [openConversation, user.id]);

  const toggleFollow = useCallback(
    () => setFollow({ handle: user.handle, follow: !user.isFollowed }),
    [setFollow, user.handle, user.isFollowed],
  );

  return (
    <View style={styles.header}>
      <View style={[styles.banner, { backgroundColor: user.color }]} />
      <View style={styles.avatarRow}>
        <View style={styles.avatarRing}>
          <Avatar user={user} size={76} />
        </View>
        <View style={styles.buttons}>
          {isMe ? (
            <Pressable style={styles.outline} onPress={() => logout()}>
              <Text style={styles.outlineText}>Sign out</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                style={styles.outline}
                onPress={message}
                disabled={opening.isLoading}
                testID="profile-message"
              >
                {opening.isLoading ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Text style={styles.outlineText}>Message</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.follow, user.isFollowed && styles.outline]}
                onPress={toggleFollow}
                testID="profile-follow"
              >
                <Text style={user.isFollowed ? styles.outlineText : styles.followText}>
                  {user.isFollowed ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
      {opening.error ? <Text style={styles.error}>{errorText(opening.error)}</Text> : null}
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.muted}>@{user.handle}</Text>
      <Text style={styles.bio}>{user.bio}</Text>
      <Text style={styles.muted}>
        <Text style={styles.count}>{compact(user.following)}</Text> following{'   '}
        <Text style={styles.count}>{compact(user.followers)}</Text> followers
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: theme.background },
  header: { paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  banner: { height: 110, opacity: 0.85 },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: -38,
  },
  avatarRing: { borderRadius: 50, borderWidth: 4, borderColor: theme.background },
  buttons: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  outline: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: theme.background,
    minWidth: 90,
    alignItems: 'center',
  },
  outlineText: { fontWeight: '700', color: theme.text },
  follow: {
    backgroundColor: theme.text,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  followText: { fontWeight: '700', color: '#fff' },
  error: { color: theme.like, paddingHorizontal: 16, marginTop: 6 },
  name: { fontSize: 21, fontWeight: '800', color: theme.text, paddingHorizontal: 16, marginTop: 8 },
  bio: { fontSize: 15, color: theme.text, paddingHorizontal: 16, marginVertical: 8 },
  muted: { color: theme.textMuted, fontSize: 14, paddingHorizontal: 16 },
  empty: { padding: 16 },
  count: { color: theme.text, fontWeight: '700' },
});
