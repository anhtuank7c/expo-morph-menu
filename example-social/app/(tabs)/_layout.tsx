/**
 * Bottom tabs. The tab bar has an explicit content height (TAB_BAR_HEIGHT)
 * so the floating button can be placed right above it with
 * `<MorphMenu bottomOffset={TAB_BAR_HEIGHT} />` in the root layout.
 *
 * Badges come from two polled queries. RTK Query shares the cache entry with
 * the Notifications and Messages screens, so they show the same data.
 */

import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetConversationsQuery, useGetNotificationsQuery } from '../../api/murmurApi';
import { TAB_BAR_HEIGHT, theme } from '../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const icon =
  (active: IconName, inactive: IconName) =>
  ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <Ionicons name={focused ? active : inactive} size={24} color={color as string} />
  );

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { data: notices = [] } = useGetNotificationsQuery(undefined, { pollingInterval: 30_000 });
  const { data: conversations = [] } = useGetConversationsQuery(undefined, { pollingInterval: 10_000 });
  const unreadNotices = notices.filter((n) => !n.read).length;
  const unreadMessages = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <Tabs
      screenOptions={{
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
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 22, fontWeight: '800' },
        headerRight: () => (
          <Link href="/dev" asChild>
            <Pressable hitSlop={10} style={{ paddingHorizontal: 16 }} accessibilityLabel="Network debug" testID="open-dev">
              <Ionicons name="pulse" size={22} color={theme.textMuted} />
            </Pressable>
          </Link>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Murmur', tabBarAccessibilityLabel: 'Feed', tabBarIcon: icon('home', 'home-outline') }}
      />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: icon('search', 'search-outline') }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: icon('notifications', 'notifications-outline'),
          tabBarBadge: unreadNotices || undefined,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: icon('mail', 'mail-outline'),
          tabBarBadge: unreadMessages || undefined,
        }}
      />
    </Tabs>
  );
}
