/**
 * Root layout of the social example.
 *
 * Route tree:
 *
 *   app/
 *     _layout.tsx            root Stack + MorphProvider + MorphMenu (this file)
 *     (tabs)/                bottom tabs: Feed, Search, Notifications, Messages
 *     post/[id].tsx          post detail, pushed on the root Stack
 *     profile/[handle].tsx   profile, pushed on the root Stack
 *     chat/[id].tsx          conversation, pushed on the root Stack (covers the tabs)
 *     compose/               the morph sheet: every route in it expands from the menu
 *     login.tsx              sign-in, shown while there is no session
 *     dev.tsx                network and session debug screen
 *
 * Data: a Redux store (store/index.ts) with RTK Query talking to a mock REST
 * backend (api/server.ts). `Stack.Protected` switches between the login screen
 * and the app when the session starts or ends, including when the refresh
 * token is rejected.
 *
 * The floating button is visible on the four tab screens only. On pushed
 * screens (post, profile, chat) it is hidden with `<MorphMenu hidden />`.
 */

import { Ionicons } from '@expo/vector-icons';
import { Stack, usePathname } from 'expo-router';
import {
  MorphMenu,
  MorphProvider,
  MorphTrace,
  morphSheetScreenOptions,
  type MorphBackgroundProps,
  type MorphComponents,
  type MorphItem,
} from 'expo-morph-menu';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import { selectIsSignedIn } from '../../example-shared/store/authSlice';
import { store, useAppSelector } from '../store';
import { TAB_BAR_HEIGHT, theme } from '../theme';

const ITEMS: MorphItem[] = [
  {
    key: 'post',
    label: 'Post',
    tint: theme.accent,
    icon: ({ size, color }) => <Ionicons name="create" size={size} color={color} />,
    href: '/compose/post',
  },
  {
    key: 'photo',
    label: 'Photo',
    tint: '#0ea5e9',
    icon: ({ size, color }) => <Ionicons name="image" size={size} color={color} />,
    href: '/compose/photo',
  },
  {
    key: 'poll',
    label: 'Poll',
    tint: '#10b981',
    icon: ({ size, color }) => <Ionicons name="stats-chart" size={size} color={color} />,
    href: '/compose/poll',
  },
  {
    key: 'live',
    label: 'Go live',
    tint: theme.live,
    icon: ({ size, color }) => <Ionicons name="radio" size={size} color={color} />,
    href: '/compose/live',
  },
  {
    key: 'message',
    label: 'New message',
    tint: '#f59e0b',
    icon: ({ size, color }) => <Ionicons name="mail" size={size} color={color} />,
    href: '/compose/message',
  },
];

/**
 * The button and the card share one surface. This Background slot paints it
 * violet while it is a button and white once it is a card, driven by the
 * `progress` shared value. On the sheet (variant 'sheet') it is always
 * white, matching the open card, so the hand-off swaps identical pixels.
 */
function CardBackground({ variant, progress }: MorphBackgroundProps) {
  const style = useAnimatedStyle(() => ({
    backgroundColor:
      variant === 'sheet'
        ? '#ffffff'
        : interpolateColor(progress.value, [0, 0.35], [theme.accent, '#ffffff']),
  }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]} />;
}

const COMPONENTS: MorphComponents = { Background: CardBackground };

/** Screens where the floating button is shown: the tab roots, and the sheet itself. */
const TAB_PATHS = new Set(['/', '/search', '/notifications', '/messages']);

function FloatingMenu() {
  const pathname = usePathname();
  const onTab = TAB_PATHS.has(pathname);
  // While a compose route is open, the card is where the sheet collapses back
  // to, so the menu must stay mounted and not hidden.
  const inSheet = pathname.startsWith('/compose');
  return <MorphMenu hidden={!onTab && !inSheet} bottomOffset={TAB_BAR_HEIGHT} fabAccessibilityLabel="Create" />;
}

/**
 * A deep link such as murmur://compose/poll opens the sheet as the first
 * route. Without an initial route, the sheet would be alone on the root Stack
 * and closing it would have nowhere to go back to. With this setting,
 * expo-router places the tabs below the deep-linked route.
 */
export const unstable_settings = { anchor: '(tabs)' };

function RootStack() {
  const signedIn = useAppSelector(selectIsSignedIn);
  return (
    <Stack
      screenOptions={{
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <MorphProvider
            items={ITEMS}
            fabIcon={({ size, color }) => <Ionicons name="add" size={size} color={color} />}
            config={{
              colorScheme: 'light',
              layout: { margin: 16, cardWidth: 220 },
              colors: {
                light: { sheetBackground: theme.background, fabIcon: '#ffffff', iconForeground: '#ffffff' },
              },
            }}
            components={COMPONENTS}
          >
            <StatusBar style="dark" />
            <RootStack />
            <FloatingMenu />
            {/* Per-frame trace for debugging: EXPO_PUBLIC_MORPH_TRACE=1 npx expo start */}
            <MorphTrace enabled={process.env.EXPO_PUBLIC_MORPH_TRACE === '1'} />
          </MorphProvider>
        </Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
