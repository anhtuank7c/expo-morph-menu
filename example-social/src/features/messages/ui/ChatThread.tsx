import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Message, User } from '../../../core/api/dto';
import { clientId, timeAgo } from '../../../shared/lib/format';
import { theme } from '../../../shared/theme';
import { Avatar } from '../../../shared/ui/Avatar';
import { QueryState } from '../../../shared/ui/QueryState';
import {
  useGetThreadQuery,
  useMarkConversationReadMutation,
  useSendMessageMutation,
} from '../api/messagesApi';

/** How often the open conversation polls for new messages. */
const POLL_MS = 2000;

const keyOf = (m: Message) => m.clientId ?? m.id;

/**
 * A conversation: message list and input.
 *
 * Used by two routes, which is the point of the example:
 * - `app/chat/[id].tsx`: pushed on the root Stack from the Messages tab.
 * - `app/compose/thread/[id].tsx`: pushed inside the morph sheet, after
 *   "New message" in the floating menu.
 *
 * Data flow: `getThread` polls while the screen is mounted (RTK Query stops
 * polling when the last subscriber unmounts). `sendMessage` adds the message
 * at once with status "sending"; if the request fails after retries, the
 * message stays with status "failed" and can be sent again with the same
 * client id, which the server uses to avoid duplicates.
 *
 * Rendering:
 * - `selectFromResult` leaves out `isFetching`, so a poll that returns the
 *   same messages does not render this component.
 * - The input keeps its text in `ChatComposer`; typing does not render the list.
 * - Bubbles are memoized on the message object.
 */
export function ChatThread({ conversationId }: { conversationId: string }) {
  const { data, isLoading, error, refetch } = useGetThreadQuery(conversationId, {
    pollingInterval: POLL_MS,
    selectFromResult: ({ data, isLoading, error }) => ({ data, isLoading, error }),
  });
  const [send] = useSendMessageMutation();
  const [markRead] = useMarkConversationReadMutation();
  const insets = useSafeAreaInsets();
  const unread = data?.conversation.unread ?? 0;

  // Mark as read whenever messages arrive while the conversation is open.
  useEffect(() => {
    if (unread > 0) void markRead(conversationId);
  }, [unread, conversationId, markRead]);

  // Inverted list: newest message at the bottom, next to the input.
  const list = data?.messages;
  const messages = useMemo(() => (list ? [...list].reverse() : []), [list]);

  const sendText = useCallback(
    (text: string) => send({ conversationId, text, clientId: clientId('msg') }),
    [send, conversationId],
  );
  const retry = useCallback(
    (message: Message) =>
      send({ conversationId, text: message.text, clientId: message.clientId ?? message.id }),
    [send, conversationId],
  );
  const renderItem = useCallback<ListRenderItem<Message>>(
    ({ item }) => <MessageBubble message={item} onRetry={retry} />,
    [retry],
  );

  if (!data) {
    return (
      <View style={styles.flex}>
        <QueryState isLoading={isLoading} error={error} onRetry={refetch} />
      </View>
    );
  }

  const other = data.conversation.user;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 + insets.top : 0}
    >
      <FlatList
        data={messages}
        inverted
        keyExtractor={keyOf}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={data.conversation.typing ? <TypingIndicator name={other.name} /> : undefined}
        ListFooterComponent={<ThreadIntro user={other} />}
      />
      <ChatComposer onSend={sendText} bottomInset={insets.bottom} />
    </KeyboardAvoidingView>
  );
}

const MessageBubble = memo(function MessageBubble({
  message,
  onRetry,
}: {
  message: Message;
  onRetry: (message: Message) => void;
}) {
  const mine = message.from === 'me';
  const failed = message.status === 'failed';
  const sending = message.status === 'sending';
  const retry = useCallback(() => onRetry(message), [onRetry, message]);
  return (
    <Pressable
      disabled={!failed}
      onPress={retry}
      style={[styles.bubble, mine ? styles.me : styles.them, sending && styles.sending]}
    >
      <Text style={[styles.message, mine && styles.mineText]}>{message.text}</Text>
      <View style={styles.footer}>
        {sending && <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.8)" />}
        <Text style={[styles.time, mine && styles.mineTime]}>
          {failed ? 'Not delivered. Tap to retry.' : sending ? 'Sending' : timeAgo(message.createdAt)}
        </Text>
      </View>
      {failed && (
        <View style={styles.failedBadge}>
          <Ionicons name="alert-circle" size={18} color={theme.like} />
        </View>
      )}
    </Pressable>
  );
});

/** Owns the draft text, so each keystroke renders only the input bar. */
const ChatComposer = memo(function ChatComposer({
  onSend,
  bottomInset,
}: {
  onSend: (text: string) => void;
  bottomInset: number;
}) {
  const [draft, setDraft] = useState('');
  const empty = !draft.trim();
  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };
  return (
    <View style={[styles.inputBar, { paddingBottom: Math.max(bottomInset, 10) }]}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Message"
        placeholderTextColor={theme.textMuted}
        style={styles.input}
        onSubmitEditing={submit}
        returnKeyType="send"
        testID="chat-input"
      />
      <Pressable
        onPress={submit}
        disabled={empty}
        style={[styles.send, empty && styles.sendDisabled]}
        testID="chat-send"
        accessibilityLabel="Send"
      >
        <Ionicons name="arrow-up" size={20} color="#fff" />
      </Pressable>
    </View>
  );
});

const ThreadIntro = memo(function ThreadIntro({ user }: { user: User }) {
  return (
    <View style={styles.intro}>
      <Avatar user={user} size={64} />
      <Text style={styles.introName}>{user.name}</Text>
      <Text style={styles.muted}>@{user.handle}</Text>
    </View>
  );
});

function TypingIndicator({ name }: { name: string }) {
  return (
    <View style={[styles.bubble, styles.them, styles.typing]}>
      <Text style={styles.muted}>{name.split(' ')[0]} is typing...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.background },
  list: { padding: 16, gap: 8 },
  intro: { alignItems: 'center', gap: 4, paddingVertical: 24 },
  introName: { fontSize: 18, fontWeight: '700', color: theme.text, marginTop: 8 },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  me: { alignSelf: 'flex-end', backgroundColor: theme.bubbleMe, borderBottomRightRadius: 6 },
  them: { alignSelf: 'flex-start', backgroundColor: theme.bubbleThem, borderBottomLeftRadius: 6 },
  sending: { opacity: 0.6 },
  typing: { paddingVertical: 8 },
  message: { fontSize: 15, lineHeight: 20, color: theme.text },
  mineText: { color: '#fff' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 2 },
  time: { fontSize: 11, color: theme.textMuted },
  mineTime: { color: 'rgba(255,255,255,0.75)' },
  failedBadge: { position: 'absolute', left: -26, bottom: 4 },
  muted: { color: theme.textMuted },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    backgroundColor: theme.background,
  },
  input: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    backgroundColor: theme.surface,
    color: theme.text,
    fontSize: 15,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
});
