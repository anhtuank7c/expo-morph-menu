import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type AvatarUser = { name: string; color: string };

/**
 * Initials on a colored circle. No images, so the example works offline.
 * Memoized: it is rendered in every list row.
 */
export const Avatar = memo(function Avatar({ user, size = 40 }: { user: AvatarUser; size?: number }) {
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: user.color },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '700' },
});
