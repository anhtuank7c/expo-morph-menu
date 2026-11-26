/**
 * The morph sheet. Every route in this group expands from the menu card and
 * collapses back into it.
 *
 * Inside the sheet is a regular native Stack:
 * - root screens (post, photo, poll, live, message) draw their own header
 *   with a close button;
 * - pushed screens (crop, thread) use the native header with a back button,
 *   and on iOS the native back swipe. The left-edge dismiss gesture of the
 *   sheet is only active on the root screen.
 */

import { Stack } from 'expo-router';
import { MorphSheetLayout } from 'expo-morph-menu';

import { theme } from '../../theme';

export default function ComposeLayout() {
  return (
    <MorphSheetLayout
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="post" options={{ headerShown: false }} />
      <Stack.Screen name="photo" options={{ headerShown: false }} />
      <Stack.Screen name="crop" options={{ title: 'Edit photo' }} />
      <Stack.Screen name="poll" options={{ headerShown: false }} />
      <Stack.Screen name="live" options={{ headerShown: false }} />
      <Stack.Screen name="message" options={{ headerShown: false }} />
      <Stack.Screen name="thread/[id]" options={{ title: 'Chat' }} />
    </MorphSheetLayout>
  );
}
