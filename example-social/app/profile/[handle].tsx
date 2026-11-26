/**
 * Profile, pushed on the root Stack.
 * - Follow / Following: optimistic mutation on the cached user.
 * - Message: `openConversation` finds or creates the conversation on the
 *   server, then pushes `/chat/[id]` (a regular push, not the morph menu).
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  useGetUserPostsQuery,
  useGetUserQuery,
  useLogoutMutation,
  useOpenConversationMutation,
  useSetFollowMutation,
} from '../../api/murmurApi';
import { Avatar } from '../../components/Avatar';
import { PostCard } from '../../components/PostCard';
import { QueryState, errorText } from '../../components/QueryState';
import { compact } from '../../format';
import { theme } from '../../theme';

export default function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const router = useRouter();
  const user = useGetUserQuery(handle);
  const posts = useGetUserPostsQuery(handle);
  const [setFollow] = useSetFollowMutation();
  const [openConversation, opening] = useOpenConversationMutation();
  const [logout] = useLogoutMutation();

  if (!user.data) {
    return (
      <View style={styles.list}>
        <QueryState isLoading={user.isLoading} error={user.error} onRetry={user.refetch} />
      </View>
    );
  }

  const u = user.data;
  const isMe = u.id === 'me';

  const message = async () => {
    try {
      const conversation = await openConversation({ userId: u.id }).unwrap();
      router.push({ pathname: '/chat/[id]', params: { id: conversation.id } });
    } catch {
      // The error is shown under the buttons (opening.error).
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: u.name }} />
      <FlatList
        style={styles.list}
        data={posts.data ?? []}
        keyExtractor={(p) => p.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => <PostCard post={item} />}
        ListEmptyComponent={
          posts.isLoading || posts.error ? (
            <QueryState isLoading={posts.isLoading} error={posts.error} onRetry={posts.refetch} />
          ) : (
            <Text style={[styles.muted, { padding: 16 }]}>No posts yet.</Text>
          )
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.banner, { backgroundColor: u.color }]} />
            <View style={styles.avatarRow}>
              <View style={styles.avatarRing}>
                <Avatar user={u} size={76} />
              </View>
              <View style={styles.buttons}>
                {isMe ? (
                  <Pressable style={styles.outline} onPress={() => logout()}>
                    <Text style={styles.outlineText}>Sign out</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable style={styles.outline} onPress={message} disabled={opening.isLoading} testID="profile-message">
                      {opening.isLoading ? <ActivityIndicator size="small" /> : <Text style={styles.outlineText}>Message</Text>}
                    </Pressable>
                    <Pressable
                      style={[styles.follow, u.isFollowed && styles.outline]}
                      onPress={() => setFollow({ handle: u.handle, follow: !u.isFollowed })}
                      testID="profile-follow"
                    >
                      <Text style={u.isFollowed ? styles.outlineText : styles.followText}>
                        {u.isFollowed ? 'Following' : 'Follow'}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
            {opening.error ? <Text style={styles.error}>{errorText(opening.error)}</Text> : null}
            <Text style={styles.name}>{u.name}</Text>
            <Text style={styles.muted}>@{u.handle}</Text>
            <Text style={styles.bio}>{u.bio}</Text>
            <Text style={styles.muted}>
              <Text style={styles.count}>{compact(u.following)}</Text> following{'   '}
              <Text style={styles.count}>{compact(u.followers)}</Text> followers
            </Text>
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: theme.background },
  header: { paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  banner: { height: 110, opacity: 0.85 },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: -38 },
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
  follow: { backgroundColor: theme.text, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, minWidth: 90, alignItems: 'center' },
  followText: { fontWeight: '700', color: '#fff' },
  error: { color: theme.like, paddingHorizontal: 16, marginTop: 6 },
  name: { fontSize: 21, fontWeight: '800', color: theme.text, paddingHorizontal: 16, marginTop: 8 },
  bio: { fontSize: 15, color: theme.text, paddingHorizontal: 16, marginVertical: 8 },
  muted: { color: theme.textMuted, fontSize: 14, paddingHorizontal: 16 },
  count: { color: theme.text, fontWeight: '700' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border },
});
