/**
 * The floating "create" menu: its rows, its look, and when it is shown.
 * The root layout passes these to MorphProvider and renders <ComposeMenu />.
 */

import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { MorphMenu, type MorphBackgroundProps, type MorphComponents, type MorphConfigInput, type MorphIcon, type MorphItem } from 'expo-morph-menu';
import { StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';

import { TAB_BAR_HEIGHT, theme } from '../../../shared/theme';

/** Module-level constants: MorphProvider receives the same objects on every render. */
export const COMPOSE_ITEMS: MorphItem[] = [
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

export const composeFabIcon: MorphIcon = ({ size, color }) => <Ionicons name="add" size={size} color={color} />;

export const COMPOSE_CONFIG: MorphConfigInput = {
  colorScheme: 'light',
  layout: { margin: 16, cardWidth: 220 },
  colors: {
    light: { sheetBackground: theme.background, fabIcon: '#ffffff', iconForeground: '#ffffff' },
  },
};

/**
 * The button and the card share one surface. This Background slot paints it
 * violet while it is a button and white once it is a card, driven by the
 * `progress` shared value (on the UI thread, no React render). On the sheet
 * (variant 'sheet') it is always white, matching the open card, so the
 * hand-off swaps identical pixels.
 */
function CardBackground({ variant, progress }: MorphBackgroundProps) {
  const style = useAnimatedStyle(() => ({
    backgroundColor:
      variant === 'sheet' ? '#ffffff' : interpolateColor(progress.value, [0, 0.35], [theme.accent, '#ffffff']),
  }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]} />;
}

export const COMPOSE_COMPONENTS: MorphComponents = { Background: CardBackground };

/** Screens where the floating button is shown: the tab roots, and the sheet itself. */
const TAB_PATHS = new Set(['/', '/search', '/notifications', '/messages']);

/**
 * The menu overlay. Visible on the four tab screens; on pushed screens
 * (post, profile, chat) it is hidden. This is the only component that reads
 * the pathname, so navigation renders it and not the root layout.
 */
export function ComposeMenu() {
  const pathname = usePathname();
  const onTab = TAB_PATHS.has(pathname);
  // While a compose route is open, the card is where the sheet collapses back
  // to, so the menu must stay mounted and not hidden.
  const inSheet = pathname.startsWith('/compose');
  return <MorphMenu hidden={!onTab && !inSheet} bottomOffset={TAB_BAR_HEIGHT} fabAccessibilityLabel="Create" />;
}
