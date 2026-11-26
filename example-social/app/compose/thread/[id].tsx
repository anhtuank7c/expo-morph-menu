/**
 * Conversation pushed inside the morph sheet. Same component as
 * `app/chat/[id].tsx`, different place in the navigation tree:
 * here the native back button returns to "New message", and dismissing the
 * sheet collapses it into the menu card.
 */

import { Stack, useLocalSearchParams } from 'expo-router';

import { useGetThreadQuery } from '../../../api/murmurApi';
import { ChatThread } from '../../../components/ChatThread';

export default function SheetThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useGetThreadQuery(id);
  return (
    <>
      <Stack.Screen options={{ title: data?.conversation.user.name ?? 'Chat' }} />
      <ChatThread conversationId={id} />
    </>
  );
}
