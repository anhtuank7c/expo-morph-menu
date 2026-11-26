import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetThreadQuery, useMarkConversationReadMutation, useSendMessageMutation } from '../api/murmurApi';
import type { Message } from '../api/types';
import { clientId, timeAgo } from '../format';
import { theme } from '../theme';
import { Avatar } from './Avatar';
import { QueryState } from './QueryState';

/** How often the open conversation polls for new messages. */
const POLL_MS = 2000;

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
 */
export function ChatThread({ conversationId }: { conversationId: string }) {
  const { data, isLoading, error, refetch } = useGetThreadQuery(conversationId, { pollingInterval: POLL_MS });
  const [send] = useSendMessageMutation();
  const [markRead] = useMarkConversationReadMutation();
  const [draft, setDraft] = useState('');
  const insets = useSafeAreaInsets();
  const unread = data?.conversation.unread ?? 0;

  // Mark as read whenever messages arrive while the conversation is open.
  useEffect(() => {
    if (unread > 0) markRead(conversationId);
  }, [unread, conversationId, markRead]);

  if (!data) {
    return (
      <View style={styles.flex}>
        <QueryState isLoading={isLoading} error={error} onRetry={refetch} />
      </View>
    );
  }

  const other = data.conversation.user;
  // Inverted list: newest message at the bottom, next to the input.
  const messages = [...data.messages].reverse();

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    send({ conversationId, text, clientId: clientId('msg') });
    setDraft('');
  };

  const retry = (message: Message) =>
    send({ conversationId, text: message.text, clientId: message.clientId ?? message.id });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 + insets.top : 0}
    >
      <FlatList
        data={messages}
        inverted
        keyExtractor={(m) => m.clientId ?? m.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          data.conversation.typing ? (
            <View style={[styles.bubble, styles.them, styles.typing]}>
              <Text style={styles.muted}>{other.name.split(' ')[0]} is typing...</Text>
            </View>
          ) : undefined
        }
        ListFooterComponent={
          <View style={styles.intro}>
            <Avatar user={other} size={64} />
            <Text style={styles.introName}>{other.name}</Text>
            <Text style={styles.muted}>@{other.handle}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const mine = item.from === 'me';
          const failed = item.status === 'failed';
          return (
            <Pressable
              disabled={!failed}
              onPress={() => retry(item)}
              style={[styles.bubble, mine ? styles.me : styles.them, item.status === 'sending' && { opacity: 0.6 }]}
            >
              <Text style={[styles.message, mine && { color: '#fff' }]}>{item.text}</Text>
              <View style={styles.footer}>
                {item.status === 'sending' && <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.8)" />}
                <Text style={[styles.time, mine && { color: 'rgba(255,255,255,0.75)' }]}>
                  {failed ? 'Not delivered. Tap to retry.' : item.status === 'sending' ? 'Sending' : timeAgo(item.createdAt)}
                </Text>
              </View>
              {failed && (
                <View style={styles.failedBadge}>
                  <Ionicons name="alert-circle" size={18} color={theme.like} />
                </View>
              )}
            </Pressable>
          );
        }}
      />
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
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
          disabled={!draft.trim()}
          style={[styles.send, !draft.trim() && { opacity: 0.4 }]}
          testID="chat-send"
          accessibilityLabel="Send"
        >
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  typing: { paddingVertical: 8 },
  message: { fontSize: 15, lineHeight: 20, color: theme.text },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 2 },
  time: { fontSize: 11, color: theme.textMuted },
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
});
