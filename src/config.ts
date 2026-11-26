/**
 * Cấu hình morph: mặc định theo platform, ghi đè từng phần qua
 * `<MorphProvider config={…}>`.
 *
 * Mọi giá trị được đọc lúc render rồi đóng băng vào worklet, nên đổi config
 * giữa chừng chỉ có hiệu lực từ lần morph sau.
 */

import { Platform } from 'react-native';

export type MorphAnchor = 'bottom-right' | 'bottom-left';

/** Bề mặt card. `auto`: Liquid Glass (iOS 26+) → blur (iOS) → nền đặc. */
export type MorphSurfaceKind = 'auto' | 'glass' | 'blur' | 'solid';

export type MorphColorScheme = 'auto' | 'light' | 'dark';

export type MorphShadow = {
  /** iOS: shadowColor. Android (API 28+): màu bóng của elevation. */
  color: string;
  /** iOS: shadowOpacity khi đứng yên. Android bỏ qua. */
  opacity: number;
  /** iOS: shadowRadius. Android bỏ qua. */
  radius: number;
  /** iOS: shadowOffset.height. Android bỏ qua. */
  offsetY: number;
  /** Android: elevation khi đứng yên. iOS bỏ qua. */
  elevation: number;
};

export type MorphColors = {
  /** Nền card khi bề mặt là `solid`, hoặc lớp phủ trên blur. */
  surface: string;
  /** Nền vỏ sheet và các màn bên trong khi full screen. */
  sheetBackground: string;
  /** Chữ nhãn dòng. */
  text: string;
  /** Lớp phủ phía sau khi menu mở. */
  scrim: string;
  /** Lớp tối phía sau sheet (opacity theo `backdropOpacity`). */
  backdrop: string;
  /** Nền dòng đang được rê tay / nhấn. */
  highlight: string;
  /** Màu icon của FAB (dấu "+" mặc định, hoặc `color` truyền cho MorphIcon dạng hàm). */
  fabIcon: string;
  /** Nền nút đóng (MorphCloseButton). */
  closeBackground: string;
  /** Màu icon nút đóng. */
  closeIcon: string;
  /** Màu icon bên trong vòng tròn `tint` của mỗi dòng. */
  iconForeground: string;
};

export type MorphConfig = {
  /**
   * Đóng full screen xong có đóng luôn morph menu không.
   * false (mặc định): vỏ thu về card rồi dừng ở đó, menu vẫn mở.
   * true: card thu tiếp về FAB.
   */
  closeMenuOnDismiss: boolean;
  /** Góc neo FAB + card. */
  anchor: MorphAnchor;
  layout: {
    fabSize: number;
    cardWidth: number;
    rowHeight: number;
    /** Đệm trên/dưới danh sách trong card. */
    padding: number;
    /** Khoảng cách tới mép màn hình (cộng thêm safe area dưới). */
    margin: number;
    /** Cỡ icon của mỗi dòng (vòng tròn `tint` = iconSize + 11). */
    iconSize: number;
    /** Chiều cao vạch ngăn giữa các dòng (chỉ dùng khi có slot `Separator`). */
    separatorHeight: number;
  };
  radius: {
    /** Bo góc card menu, cũng là bo góc lúc vỏ sheet bắt đầu nở. */
    card: number;
    /** Bo góc vỏ sheet khi đã full screen. */
    sheet: number;
    /** Bo góc FAB. Mặc định `null` = tròn (fabSize / 2). */
    fab: number | null;
  };
  shadow: MorphShadow;
  /** Cử chỉ đóng full screen. Nút đóng của bạn và back cứng Android luôn có. */
  dismiss: {
    /** Vuốt từ cạnh trái sang phải (kiểu back của iOS), chỉ ở màn gốc sheet. */
    edgeSwipe: boolean;
    /** Kéo xuống. */
    dragDown: boolean;
  };
  /** Spring cho mọi chuyển động. Mặc định ≈ `.snappy` của SwiftUI. */
  spring: { duration: number; dampingRatio: number };
  /** Rung nhẹ khi rê qua dòng và khi chọn. Cần `expo-haptics`. */
  haptics: boolean;
  surface: MorphSurfaceKind;
  colorScheme: MorphColorScheme;
  /** Độ tối tối đa của backdrop phía sau sheet. */
  backdropOpacity: number;
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K] };

export type MorphConfigInput = DeepPartial<MorphConfig> & {
  /** Ghi đè màu theo từng chế độ sáng/tối. */
  colors?: { light?: Partial<MorphColors>; dark?: Partial<MorphColors> };
};

const isIOS = Platform.OS === 'ios';

export const DEFAULT_CONFIG: MorphConfig = {
  closeMenuOnDismiss: false,
  anchor: 'bottom-right',
  layout: {
    fabSize: 56,
    cardWidth: 236,
    rowHeight: 46,
    padding: 10,
    margin: 20,
    iconSize: 15,
    separatorHeight: 1,
  },
  // Full screen để 0: góc màn hình đã bo sẵn, phần cứng tự cắt.
  radius: { card: 28, sheet: 0, fab: null },
  shadow: isIOS
    ? { color: '#000', opacity: 0.18, radius: 18, offsetY: 8, elevation: 0 }
    : // Android chỉ hiểu elevation (shadow* bị bỏ qua).
      { color: '#000', opacity: 0.18, radius: 18, offsetY: 8, elevation: 10 },
  // iOS: vuốt cạnh trái + kéo xuống. Android: nút đóng hoặc back cứng.
  dismiss: isIOS ? { edgeSwipe: true, dragDown: true } : { edgeSwipe: false, dragDown: false },
  spring: { duration: 460, dampingRatio: 0.85 },
  haptics: true,
  surface: 'auto',
  colorScheme: 'auto',
  backdropOpacity: 0.25,
};

export const LIGHT_COLORS: MorphColors = {
  surface: isIOS ? 'rgba(255,255,255,0.72)' : '#ffffff',
  sheetBackground: '#ffffff',
  text: '#1c1c1e',
  scrim: 'rgba(0,0,0,0.08)',
  backdrop: '#000000',
  highlight: 'rgba(120,120,128,0.14)',
  fabIcon: '#1c1c1e',
  closeBackground: 'rgba(120,120,128,0.12)',
  closeIcon: '#1c1c1e',
  iconForeground: '#ffffff',
};

export const DARK_COLORS: MorphColors = {
  surface: isIOS ? 'rgba(44,44,46,0.72)' : '#2c2c2e',
  sheetBackground: '#1c1c1e',
  text: '#f2f2f7',
  scrim: 'rgba(0,0,0,0.32)',
  backdrop: '#000000',
  highlight: 'rgba(120,120,128,0.28)',
  fabIcon: '#f2f2f7',
  closeBackground: 'rgba(120,120,128,0.24)',
  closeIcon: '#f2f2f7',
  iconForeground: '#ffffff',
};

export function resolveConfig(input?: MorphConfigInput): MorphConfig {
  const d = DEFAULT_CONFIG;
  return {
    closeMenuOnDismiss: input?.closeMenuOnDismiss ?? d.closeMenuOnDismiss,
    anchor: input?.anchor ?? d.anchor,
    layout: { ...d.layout, ...input?.layout },
    radius: { ...d.radius, ...input?.radius },
    shadow: { ...d.shadow, ...input?.shadow },
    dismiss: { ...d.dismiss, ...input?.dismiss },
    spring: { ...d.spring, ...input?.spring },
    haptics: input?.haptics ?? d.haptics,
    surface: input?.surface ?? d.surface,
    colorScheme: input?.colorScheme ?? d.colorScheme,
    backdropOpacity: input?.backdropOpacity ?? d.backdropOpacity,
  };
}

export function resolveColors(
  scheme: 'light' | 'dark',
  input?: MorphConfigInput['colors'],
): MorphColors {
  return scheme === 'dark'
    ? { ...DARK_COLORS, ...input?.dark }
    : { ...LIGHT_COLORS, ...input?.light };
}
