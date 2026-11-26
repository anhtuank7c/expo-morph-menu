/**
 * Bề mặt của khối morph.
 *
 * Ưu tiên Liquid Glass thật của iOS 26+ (expo-glass-effect) vì đó chính là thứ
 * bản SwiftUI gốc dùng; không có thì lùi về BlurView; không có nữa thì View
 * đặc. Chọn một lần lúc nạp module — `isLiquidGlassAvailable()` là hàm đồng bộ
 * và kết quả không đổi trong vòng đời app.
 *
 * Lưu ý: expo-glass-effect expose GlassView/GlassContainer, tương ứng
 * `.glassEffect()` và `GlassEffectContainer` của SwiftUI. Phần morph giữa các
 * khối kính (`glassEffectID`) thì chưa có, nên hình dạng vẫn do ta tự lái.
 */

import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, View } from 'react-native';
import Animated from 'react-native-reanimated';

export const LIQUID_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

const AnimatedGlass = Animated.createAnimatedComponent(GlassView);
const AnimatedBlur = Animated.createAnimatedComponent(BlurView);

export const Surface: any = LIQUID_GLASS
  ? AnimatedGlass
  : Platform.OS === 'ios'
    ? AnimatedBlur
    : Animated.View;

/** Props riêng của từng loại bề mặt, gom lại để nơi dùng không phải rẽ nhánh. */
export const surfaceProps = LIQUID_GLASS
  ? { glassEffectStyle: 'regular' as const, isInteractive: true }
  : Platform.OS === 'ios'
    ? { intensity: 72, tint: 'light' as const }
    : {};

/** Nền đặc dùng kèm khi không có hiệu ứng kính, để chữ luôn đọc được. */
export const surfaceBackground = LIQUID_GLASS
  ? 'transparent'
  : Platform.OS === 'ios'
    ? 'rgba(255,255,255,0.72)'
    : '#ffffff';

export const Plain = View;
