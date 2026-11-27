/**
 * Bottom tabs. The tab bar has an explicit content height (TAB_BAR_HEIGHT)
 * so the floating button can be placed right above it with
 * `<MorphMenu bottomOffset={TAB_BAR_HEIGHT} />` in the root layout.
 *
 * Badges come from two polled queries that share their cache entries with
 * the Notifications and Messages screens. The badge hooks select a number,
 * so this layout renders when a count changes, not on every poll.
 */

import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '../../src/core/api/dto';
import { useUnreadMessageCount } from '../../src/features/messages';
import { useUnreadNoticeCount } from '../../src/features/notifications';
import { TAB_BAR_HEIGHT, theme } from '../../src/shared/theme';

const icon = (active: IconName, inactive: IconName) =>
  function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    return <Ionicons name={focused ? active : inactive} size={24} color={color as string} />;
  };

const ICONS = {
  index: icon('home', 'home-outline'),
  search: icon('search', 'search-outline'),
  notifications: icon('notifications', 'notifications-outline'),
  messages: icon('mail', 'mail-outline'),
};

function DevButton() {
  return (
    <Link href="/dev" asChild>
      <Pressable hitSlop={10} style={styles.devButton} accessibilityLabel="Network debug" testID="open-dev">
        <Ionicons name="pulse" size={22} color={theme.textMuted} />
      </Pressable>
    </Link>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const unreadNotices = useUnreadNoticeCount(30_000);
  const unreadMessages = useUnreadMessageCount(10_000);

  // Recreated only when the bottom inset changes.
  const screenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: theme.text,
      tabBarInactiveTintColor: theme.textMuted,
      tabBarShowLabel: false,
      tabBarStyle: {
        height: TAB_BAR_HEIGHT + insets.bottom,
        paddingBottom: insets.bottom,
        borderTopColor: theme.border,
      },
      tabBarItemStyle: { height: TAB_BAR_HEIGHT },
      tabBarBadgeStyle: { backgroundColor: theme.accent, fontSize: 11 },
      headerTitleAlign: 'left' as const,
      headerShadowVisible: false,
      headerTitleStyle: { fontSize: 22, fontWeight: '800' as const },
      headerRight: DevButton,
    }),
    [insets.bottom],
  );

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Murmur', tabBarAccessibilityLabel: 'Feed', tabBarIcon: ICONS.index }}
      />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: ICONS.search }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ICONS.notifications,
          tabBarBadge: unreadNotices || undefined,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Messages', tabBarIcon: ICONS.messages, tabBarBadge: unreadMessages || undefined }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  devButton: { paddingHorizontal: 16 },
});
