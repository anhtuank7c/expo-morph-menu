/**
 * Bề mặt của card menu.
 *
 * `auto`: Liquid Glass thật của iOS 26+ (expo-glass-effect) → BlurView trên
 * iOS (expo-blur) → View đặc. Module nào chưa cài thì tự lùi bậc tiếp theo.
 * Android mặc định dùng View đặc: blur trên Android đắt và dễ mất 10–15fps ở
 * máy tầm trung.
 */

import { Platform } from 'react-native';
import Animated from 'react-native-reanimated';

import type { MorphSurfaceKind } from './config';
import { BlurView, GlassView, liquidGlassAvailable } from './optional';

const AnimatedGlass = GlassView ? Animated.createAnimatedComponent(GlassView) : null;
const AnimatedBlur = BlurView ? Animated.createAnimatedComponent(BlurView) : null;

export type ResolvedSurface = 'glass' | 'blur' | 'solid';

export function resolveSurface(kind: MorphSurfaceKind): ResolvedSurface {
  const canGlass = Platform.OS === 'ios' && !!AnimatedGlass && liquidGlassAvailable();
  const canBlur = !!AnimatedBlur;
  if (kind === 'glass') return canGlass ? 'glass' : canBlur ? 'blur' : 'solid';
  if (kind === 'blur') return canBlur ? 'blur' : 'solid';
  if (kind === 'solid') return 'solid';
  // auto
  if (canGlass) return 'glass';
  if (Platform.OS === 'ios' && canBlur) return 'blur';
  return 'solid';
}

/** Component và props cho một loại bề mặt. */
export function surfaceFor(kind: ResolvedSurface, scheme: 'light' | 'dark') {
  if (kind === 'glass' && AnimatedGlass) {
    return {
      Component: AnimatedGlass as any,
      props: { glassEffectStyle: 'regular', isInteractive: true },
      transparent: true,
    };
  }
  if (kind === 'blur' && AnimatedBlur) {
    return {
      Component: AnimatedBlur as any,
      props: { intensity: 72, tint: scheme },
      transparent: false,
    };
  }
  return { Component: Animated.View as any, props: {}, transparent: false };
}
