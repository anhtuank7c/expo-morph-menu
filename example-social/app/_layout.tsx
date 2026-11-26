/**
 * Root layout of the social example.
 *
 * The `app/` folder holds routes only. Each route file re-exports a screen
 * from `src/features/<name>`; the layouts here configure navigation and the
 * providers. See README.md for the folder structure.
 *
 *   app/
 *     _layout.tsx            root Stack, MorphProvider, ComposeMenu, Redux store (this file)
 *     (tabs)/                bottom tabs: Feed, Search, Notifications, Messages
 *     post/[id].tsx          post detail, pushed on the root Stack
 *     profile/[handle].tsx   profile, pushed on the root Stack
 *     chat/[id].tsx          conversation, pushed on the root Stack (covers the tabs)
 *     compose/               the morph sheet: every route in it expands from the menu
 *     login.tsx              sign-in, shown while there is no session
 *     dev.tsx                network and session debug screen
 *
 * `Stack.Protected` switches between the login screen and the app when the
 * session starts or ends, including when the refresh token is rejected.
 */

import { Stack } from 'expo-router';
import { MorphProvider, MorphTrace, morphSheetScreenOptions } from 'expo-morph-menu';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import { selectIsSignedIn } from '../src/features/auth';
import { COMPOSE_COMPONENTS, COMPOSE_CONFIG, COMPOSE_ITEMS, ComposeMenu, composeFabIcon } from '../src/features/compose';
import { theme } from '../src/shared/theme';
import { store } from '../src/store';
import { useAppSelector } from '../src/store/hooks';

/**
 * A deep link such as murmur://compose/poll opens the sheet as the first
 * route. Without an anchor, the sheet would be alone on the root Stack and
 * closing it would have nowhere to go back to. With this setting,
 * expo-router places the tabs below the deep-linked route.
 */
export const unstable_settings = { anchor: '(tabs)' };

const STACK_OPTIONS = {
  headerTintColor: theme.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: theme.background },
};

/** Reads one boolean from the store, so it renders only when the user signs in or out. */
function RootStack() {
  const signedIn = useAppSelector(selectIsSignedIn);
  return (
    <Stack screenOptions={STACK_OPTIONS}>
      {/* Only reachable with a session. When the session ends, expo-router
          removes these screens and redirects to /login. */}
      <Stack.Protected guard={signedIn} redirectTo="/login">
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="post/[id]" options={{ title: 'Post' }} />
        <Stack.Screen name="profile/[handle]" options={{ title: '' }} />
        <Stack.Screen name="chat/[id]" options={{ title: 'Chat' }} />
        <Stack.Screen name="compose" options={morphSheetScreenOptions} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="dev" options={{ title: 'Network', presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <Provider store={store}>
          <MorphProvider items={COMPOSE_ITEMS} fabIcon={composeFabIcon} config={COMPOSE_CONFIG} components={COMPOSE_COMPONENTS}>
            <StatusBar style="dark" />
            <RootStack />
            <ComposeMenu />
            {/* Per-frame trace for debugging: EXPO_PUBLIC_MORPH_TRACE=1 npx expo start */}
            <MorphTrace enabled={process.env.EXPO_PUBLIC_MORPH_TRACE === '1'} />
          </MorphProvider>
        </Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
