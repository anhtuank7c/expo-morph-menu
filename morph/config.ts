/**
 * Cấu hình morph, mặc định theo platform, ghi đè được qua
 * `<MorphProvider config={…}>`.
 *
 *   <MorphProvider
 *     config={{
 *       closeMenuOnDismiss: true,
 *       radius: Platform.select({ ios: { card: 28 }, android: { card: 16 } }),
 *       shadow: { elevation: 6 },
 *     }}
 *   >
 *
 * Mọi giá trị được đọc một lần lúc render rồi đóng băng vào worklet, nên đổi
 * config giữa chừng chỉ có hiệu lực từ lần morph sau.
 */

import { Platform } from 'react-native';

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

export type MorphConfig = {
  /**
   * Đóng full screen xong có đóng luôn morph menu không.
   *
   * false (mặc định): vỏ thu về đúng rect card rồi DỪNG ở đó — menu vẫn mở,
   * chọn tiếp được dòng khác. true: card thu tiếp về FAB.
   */
  closeMenuOnDismiss: boolean;
  radius: {
    /** Bo góc của card menu, cũng là bo góc lúc vỏ sheet bắt đầu nở. */
    card: number;
    /** Bo góc của vỏ sheet khi đã full screen. */
    sheet: number;
  };
  shadow: MorphShadow;
  /** Cử chỉ đóng full screen. Nút × và back cứng Android luôn có. */
  dismiss: {
    /** Vuốt từ cạnh trái sang phải (kiểu back của iOS). */
    edgeSwipe: boolean;
    /** Kéo xuống. */
    dragDown: boolean;
  };
};

export type MorphConfigInput = {
  closeMenuOnDismiss?: boolean;
  radius?: Partial<MorphConfig['radius']>;
  shadow?: Partial<MorphShadow>;
  dismiss?: Partial<MorphConfig['dismiss']>;
};

const IOS: MorphConfig = {
  closeMenuOnDismiss: false,
  // Full screen để 0: góc màn hình iPhone đã bo sẵn, phần cứng tự cắt.
  radius: { card: 28, sheet: 0 },
  shadow: { color: '#000', opacity: 0.18, radius: 18, offsetY: 8, elevation: 0 },
  dismiss: { edgeSwipe: true, dragDown: true },
};

const ANDROID: MorphConfig = {
  closeMenuOnDismiss: false,
  radius: { card: 28, sheet: 0 },
  // Android chỉ hiểu elevation (shadow* bị bỏ qua), nên chỉnh độ đậm ở đây.
  shadow: { color: '#000', opacity: 0.18, radius: 18, offsetY: 8, elevation: 10 },
  // Android: đóng bằng nút × hoặc back cứng, không có cử chỉ vuốt.
  dismiss: { edgeSwipe: false, dragDown: false },
};

export const DEFAULT_CONFIG: MorphConfig = Platform.OS === 'ios' ? IOS : ANDROID;

export function resolveConfig(input?: MorphConfigInput): MorphConfig {
  const d = DEFAULT_CONFIG;
  return {
    closeMenuOnDismiss: input?.closeMenuOnDismiss ?? d.closeMenuOnDismiss,
    radius: { ...d.radius, ...input?.radius },
    shadow: { ...d.shadow, ...input?.shadow },
    dismiss: { ...d.dismiss, ...input?.dismiss },
  };
}
