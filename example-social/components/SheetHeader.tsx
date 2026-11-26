import { MorphCloseButton } from 'expo-morph-menu';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../theme';

/**
 * Header for the root screens of the compose sheet: close button, title and
 * an optional primary action ("Post", "Go live").
 *
 * The sheet covers the status bar, so the header pads itself with the top
 * safe area inset.
 */
export function SheetHeader({
  title,
  action,
  onAction,
  actionDisabled,
  dark = false,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  dark?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <MorphCloseButton
        size={34}
        backgroundColor={dark ? 'rgba(255,255,255,0.16)' : undefined}
        color={dark ? '#fff' : undefined}
      />
      <Text style={[styles.title, dark && { color: '#fff' }]}>{title}</Text>
      {action ? (
        <Pressable
          onPress={onAction}
          disabled={actionDisabled}
          style={[styles.action, actionDisabled && styles.actionDisabled]}
          testID="sheet-action"
        >
          <Text style={styles.actionText}>{action}</Text>
        </Pressable>
      ) : (
        <View style={{ width: 34 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: theme.text },
  action: { backgroundColor: theme.accent, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8 },
  actionDisabled: { opacity: 0.4 },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
