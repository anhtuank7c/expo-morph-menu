import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { IconName, Poll, Post } from '../../../core/api/dto';
import { compact, timeAgo } from '../../../shared/lib/format';
import { theme } from '../../../shared/theme';
import { Avatar } from '../../../shared/ui/Avatar';
import { Media } from '../../../shared/ui/Media';
import { usePostActions } from '../api/usePostActions';

/**
 * One post. Like and vote are optimistic (see api/postsApi.ts): the cached
 * post changes at once and rolls back if the request fails after retries.
 *
 * Rendering: the card is memoized on `post`. A like patches one post object
 * in the cache, so only that card renders again. Navigation uses the
 * `router` object instead of `useRouter()`, and the actions come from a
 * hook with stable callbacks, so the card has no other reason to render.
 */
export const PostCard = memo(function PostCard({ post, large = false }: { post: Post; large?: boolean }) {
  const { setLike, vote } = usePostActions();
  const { id, author, liked } = post;

  const open = useCallback(() => router.push({ pathname: '/post/[id]', params: { id } }), [id]);
  const openAuthor = useCallback(
    () => router.push({ pathname: '/profile/[handle]', params: { handle: author.handle } }),
    [author.handle],
  );
  const toggleLike = useCallback(() => setLike(id, !liked), [setLike, id, liked]);
  const onVote = useCallback((option: number) => vote(id, option), [vote, id]);

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [styles.row, pressed && !large && styles.pressed]}
      disabled={large}
      testID={`post-${id}`}
    >
      <Pressable hitSlop={4} onPress={openAuthor}>
        <Avatar user={author} size={large ? 48 : 42} />
      </Pressable>
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

        {post.media && (
          <Media media={post.media} style={[styles.media, { aspectRatio: post.media.aspect }]} />
        )}

        {post.poll && <PollView poll={post.poll} postId={id} onVote={onVote} />}

        <View style={styles.actions}>
          <Action icon="chatbubble-outline" label={compact(post.replyCount)} />
          <Action icon="repeat" label={compact(post.repostCount)} />
          <Action
            icon={liked ? 'heart' : 'heart-outline'}
            label={compact(post.likeCount)}
            color={liked ? theme.like : undefined}
            onPress={toggleLike}
            testID={`like-${id}`}
          />
          <Action icon="share-outline" />
        </View>
      </View>
    </Pressable>
  );
});

const PollView = memo(function PollView({
  poll,
  postId,
  onVote,
}: {
  poll: Poll;
  postId: string;
  onVote: (option: number) => void;
}) {
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
  const voted = poll.votedOption !== null;
  return (
    <View style={styles.poll}>
      {poll.options.map((option, i) => {
        const share = Math.round((option.votes / (totalVotes || 1)) * 100);
        return (
          <Pressable
            key={option.label}
            disabled={voted}
            onPress={() => onVote(i)}
            style={[styles.option, !voted && styles.optionOpen]}
            testID={`vote-${postId}-${i}`}
          >
            {voted && <View style={[styles.optionBar, { width: `${share}%` }]} />}
            <Text style={[styles.optionText, poll.votedOption === i && styles.optionChosen]}>
              {option.label}
            </Text>
            {voted && <Text style={styles.optionShare}>{share}%</Text>}
          </Pressable>
        );
      })}
      <Text style={styles.pollMeta}>
        {compact(totalVotes)} votes · {poll.days} {poll.days === 1 ? 'day' : 'days'} left
      </Text>
    </View>
  );
});

function Action({
  icon,
  label,
  color = theme.textMuted,
  onPress,
  testID,
}: {
  icon: IconName;
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
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.background,
  },
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
