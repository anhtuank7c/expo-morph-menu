/**
 * A conversation as a route. Used in two places in the route tree:
 *
 * - `app/chat/[id].tsx`: pushed on the root Stack (from the Messages tab or a
 *   profile). It covers the tabs, and the root layout hides the floating
 *   button there.
 * - `app/compose/thread/[id].tsx`: pushed inside the morph sheet. The back
 *   button returns to "New message", and dismissing the sheet collapses it
 *   into the menu card.
 *
 * The title is read from the cached thread, without an extra request.
 * `selectFromResult` returns only the name, so polls do not render the header.
 */

import { Stack, useLocalSearchParams } from 'expo-router';

import { useGetThreadQuery } from '../api/messagesApi';
import { ChatThread } from './ChatThread';

export function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { title } = useGetThreadQuery(id, {
    selectFromResult: ({ data }) => ({ title: data?.conversation.user.name ?? 'Chat' }),
  });
  return (
    <>
      <Stack.Screen options={{ title }} />
      <ChatThread conversationId={id} />
    </>
  );
}
