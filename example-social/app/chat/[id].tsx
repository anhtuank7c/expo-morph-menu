/**
 * Conversation pushed on the root Stack (from the Messages tab or a profile).
 * It covers the tabs, and the root layout hides the floating button here.
 * The title is read from the cached thread, no extra request.
 */

import { Stack, useLocalSearchParams } from 'expo-router';

import { useGetThreadQuery } from '../../api/murmurApi';
import { ChatThread } from '../../components/ChatThread';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useGetThreadQuery(id);
  return (
    <>
      <Stack.Screen options={{ title: data?.conversation.user.name ?? 'Chat' }} />
      <ChatThread conversationId={id} />
    </>
  );
}
