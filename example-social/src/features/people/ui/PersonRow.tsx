import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { User } from '../../../core/api/dto';
import { compact } from '../../../shared/lib/format';
import { theme } from '../../../shared/theme';
import { Avatar } from '../../../shared/ui/Avatar';

/**
 * A person in a list (search results, "New message"). Memoized, and
 * `onPress` receives the user, so the parent can pass one stable callback
 * for every row instead of a new closure per row.
 */
export const PersonRow = memo(function PersonRow({
  user,
  onPress,
  detail = 'followers',
  pending = false,
  disabled = false,
  testID,
}: {
  user: User;
  onPress: (user: User) => void;
  detail?: 'followers' | 'chevron';
  pending?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const press = useCallback(() => onPress(user), [onPress, user]);
  return (
    <Pressable style={styles.row} onPress={press} disabled={disabled} testID={testID}>
      <Avatar user={user} size={44} />
      <View style={styles.body}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.muted}>
          @{user.handle}
          {detail === 'followers' ? ` · ${compact(user.followers)} followers` : ''}
        </Text>
      </View>
      {detail === 'followers' ? (
        user.isFollowed && <Text style={styles.following}>Following</Text>
      ) : pending ? (
        <ActivityIndicator size="small" color={theme.textMuted} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: theme.text },
  muted: { color: theme.textMuted, fontSize: 13 },
  following: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
});
