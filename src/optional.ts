/**
 * Phụ thuộc tuỳ chọn: expo-haptics, expo-blur, expo-glass-effect.
 *
 * `require` trong try/catch là optional dependency mà Metro hiểu: thiếu module
 * thì bundle vẫn build, `require` ném lỗi lúc chạy và ta lùi về phương án
 * khác. Nhờ vậy người dùng chỉ cài thứ họ cần.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
declare const require: (id: string) => any;

let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch {
  Haptics = null;
}

let Blur: any = null;
try {
  Blur = require('expo-blur');
} catch {
  Blur = null;
}

let Glass: any = null;
try {
  Glass = require('expo-glass-effect');
} catch {
  Glass = null;
}

export const haptics = {
  selection() {
    Haptics?.selectionAsync?.().catch?.(() => {});
  },
  impact() {
    Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light).catch?.(() => {});
  },
};

export const BlurView: any = Blur?.BlurView ?? null;
export const GlassView: any = Glass?.GlassView ?? null;

export function liquidGlassAvailable(): boolean {
  try {
    return !!Glass?.isLiquidGlassAvailable?.();
  } catch {
    return false;
  }
}
