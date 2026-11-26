/**
 * Nút đóng full screen, đặt trong màn của nhóm route MorphSheetLayout.
 *
 *   <MorphCloseButton />                                       dấu × mặc định
 *   <MorphCloseButton icon={<Ionicons name="close" size={18} />} />
 *   <MorphCloseButton icon={require('./close.png')} size={36} />
 *   <MorphCloseButton icon={({ size, color }) => <CloseSvg width={size} color={color} />} />
 *
 * Bấm thì `router.back()` → MorphSheetLayout chạy morph ngược về card. Icon
 * mặc định cho mọi nút đặt được một lần qua `<MorphProvider closeIcon={…}>`.
 */

import { useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { renderIcon, type MorphIcon } from './icon';
import { useMorph } from './MorphProvider';

export type MorphCloseButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  /** Icon: element, ảnh hoặc `({ size, color }) => …`. Mặc định: dấu ×. */
  icon?: MorphIcon;
  /** Đường kính nút. Mặc định 32. */
  size?: number;
  /** Cỡ icon bên trong. Mặc định size × 0.56. */
  iconSize?: number;
  /** Màu icon (truyền cho icon dạng hàm và ảnh PNG). Mặc định colors.closeIcon. */
  color?: string;
  /** Nền nút. Mặc định colors.closeBackground; 'transparent' để bỏ nền. */
  backgroundColor?: string;
  /** Tô màu ảnh PNG bằng `color`. Mặc định true. */
  tintImage?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function MorphCloseButton({
  icon,
  size = 32,
  iconSize,
  color,
  backgroundColor,
  tintImage = true,
  style,
  onPress,
  hitSlop = 12,
  accessibilityLabel = 'Close',
  testID = 'morph-close',
  ...rest
}: MorphCloseButtonProps) {
  const router = useRouter();
  const { colors, closeIcon } = useMorph();
  const fg = color ?? colors.closeIcon;
  const glyph = iconSize ?? Math.round(size * 0.56);
  const chosen = icon ?? closeIcon;

  return (
    <Pressable
      {...rest}
      testID={testID}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={(e) => {
        onPress?.(e);
        if (!e.defaultPrevented) router.back();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor ?? colors.closeBackground,
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      {chosen != null ? (
        renderIcon(chosen, { size: glyph, color: fg, tint: tintImage })
      ) : (
        <Cross size={glyph} color={fg} />
      )}
    </Pressable>
  );
}

/** Dấu × mặc định, vẽ bằng View để không phụ thuộc thư viện icon. */
function Cross({ size, color }: { size: number; color: string }) {
  const bar = { width: size, height: Math.max(1.5, size / 9), borderRadius: size, backgroundColor: color };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.bar, bar, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[styles.bar, bar, { transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute' },
});
