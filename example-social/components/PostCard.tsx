import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSetLikeMutation, useVoteMutation } from '../api/murmurApi';
import type { Post } from '../api/types';
import { compact, timeAgo } from '../format';
import { theme } from '../theme';
import { Avatar } from './Avatar';
import { Media } from './Media';

/**
 * One post. Like and vote are optimistic mutations (see api/murmurApi.ts):
 * the UI changes at once and rolls back if the request fails after retries.
 */
export const PostCard = memo(function PostCard({ post, large = false }: { post: Post; large?: boolean }) {
  const router = useRouter();
  const [setLike] = useSetLikeMutation();
  const [vote] = useVoteMutation();
  const { author, poll } = post;
  const totalVotes = poll ? poll.options.reduce((sum, o) => sum + o.votes, 0) : 0;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
      style={({ pressed }) => [styles.row, pressed && !large && styles.pressed]}
      disabled={large}
      testID={`post-${post.id}`}
    >
      <Link href={{ pathname: '/profile/[handle]', params: { handle: author.handle } }} asChild>
        <Pressable hitSlop={4}>
          <Avatar user={author} size={large ? 48 : 42} />
        </Pressable>
      </Link>
      <View style={styles.body}>
        <View style={styles.meta}>
          <Text style={styles.name} numberOfLines={1}>
            {author.name}
          </Text>
          <Text style={styles.handle} numberOfLines={1}>
            @{author.handle} · {timeAgo(post.createdAt)}
          </Text>
        </View>
        {post.text ? <Text style={[styles.text, large && styles.textLarge]}>{post.text}</Text> : null}

        {post.media && <Media media={post.media} style={[styles.media, { aspectRatio: post.media.aspect }]} />}

        {poll && (
          <View style={styles.poll}>
            {poll.options.map((option, i) => {
              const share = Math.round((option.votes / (totalVotes || 1)) * 100);
              const voted = poll.votedOption !== null;
              return (
                <Pressable
                  key={option.label}
                  disabled={voted}
                  onPress={() => vote({ id: post.id, option: i })}
                  style={[styles.option, !voted && styles.optionOpen]}
                  testID={`vote-${post.id}-${i}`}
                >
                  {voted && <View style={[styles.optionBar, { width: `${share}%` }]} />}
                  <Text style={[styles.optionText, poll.votedOption === i && styles.optionChosen]}>{option.label}</Text>
                  {voted && <Text style={styles.optionShare}>{share}%</Text>}
                </Pressable>
              );
            })}
            <Text style={styles.pollMeta}>
              {compact(totalVotes)} votes · {poll.days} {poll.days === 1 ? 'day' : 'days'} left
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <Action icon="chatbubble-outline" label={compact(post.replyCount)} />
          <Action icon="repeat" label={compact(post.repostCount)} />
          <Action
            icon={post.liked ? 'heart' : 'heart-outline'}
            label={compact(post.likeCount)}
            color={post.liked ? theme.like : undefined}
            onPress={() => setLike({ id: post.id, liked: !post.liked })}
            testID={`like-${post.id}`}
          />
          <Action icon="share-outline" />
        </View>
      </View>
    </Pressable>
  );
});

function Action({
  icon,
  label,
  color = theme.textMuted,
  onPress,
  testID,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label?: string;
  color?: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.action} testID={testID}>
      <Ionicons name={icon} size={17} color={color} />
      {label ? <Text style={[styles.actionLabel, { color }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.background },
  pressed: { backgroundColor: theme.surface },
  body: { flex: 1, gap: 6 },
  meta: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  name: { fontWeight: '700', color: theme.text, fontSize: 15, flexShrink: 1 },
  handle: { color: theme.textMuted, fontSize: 14, flexShrink: 1 },
  text: { color: theme.text, fontSize: 15, lineHeight: 21 },
  textLarge: { fontSize: 18, lineHeight: 25 },
  media: { borderRadius: 16, marginTop: 4 },
  poll: { gap: 6, marginTop: 4 },
  option: {
    height: 36,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: theme.surface,
  },
  optionOpen: { borderWidth: 1, borderColor: theme.accent, backgroundColor: theme.background },
  optionBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: theme.accentSoft },
  optionText: { color: theme.text, fontSize: 14, fontWeight: '500' },
  optionChosen: { fontWeight: '700', color: theme.accent },
  optionShare: { position: 'absolute', right: 12, color: theme.text, fontWeight: '600' },
  pollMeta: { color: theme.textMuted, fontSize: 13 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', paddingRight: 24, marginTop: 4 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionLabel: { fontSize: 13 },
});
