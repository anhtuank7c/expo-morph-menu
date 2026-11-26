/**
 * Shadow đang animate, theo platform.
 *
 * Native: `shadow*` (iOS) và `elevation` (Android) — độ đậm nhân với hệ số.
 *
 * Web: React Native Web ghép `shadow*` thành CSS `box-shadow`, nhưng chỉ khi
 * chúng nằm CHUNG một style. Ta đặt `shadowColor/Radius/Offset` tĩnh còn
 * `shadowOpacity` do Reanimated animate, nên mỗi lần cập nhật RNW dựng lại
 * `box-shadow` chỉ với màu + độ đậm: `rgba(0,0,0,.18) 0px 0px 0px` — bóng nằm
 * gọn dưới card, không thấy gì. Trên web ta tự dựng chuỗi `box-shadow` đầy
 * đủ ngay trong style đang animate.
 */

import { Platform } from 'react-native';

import type { MorphShadow } from './config';

const IS_WEB = Platform.OS === 'web';

/** `#rgb`, `#rrggbb`, `rgb(…)`, `rgba(…)` → [r, g, b]. Khác thì đen. */
function toRgb(color: string): [number, number, number] {
  const c = color.trim();
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (x) => x + x) : hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const fn = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (fn) return [Number(fn[1]), Number(fn[2]), Number(fn[3])];
  return [0, 0, 0];
}

export type ShadowSpec = {
  web: boolean;
  rgb: [number, number, number];
  opacity: number;
  radius: number;
  offsetY: number;
  elevation: number;
};

/** Tính một lần ở JS (không parse màu trong worklet). */
export function shadowSpec(s: MorphShadow): ShadowSpec {
  return {
    web: IS_WEB,
    rgb: toRgb(s.color),
    opacity: s.opacity,
    radius: s.radius,
    offsetY: s.offsetY,
    elevation: s.elevation,
  };
}

/** Style tĩnh: native cần shadowColor/Radius/Offset; web để trống (tự dựng). */
export function staticShadowStyle(s: MorphShadow) {
  if (IS_WEB) return null;
  return {
    shadowColor: s.color,
    shadowRadius: s.radius,
    shadowOffset: { width: 0, height: s.offsetY },
  };
}

/** Phần shadow của style đang animate, với hệ số `k` (0…1, xem restShadow). */
export function animatedShadow(spec: ShadowSpec, k: number) {
  'worklet';
  if (spec.web) {
    const a = Math.round(spec.opacity * k * 1000) / 1000;
    if (a <= 0) return { boxShadow: 'none' };
    const [r, g, b] = spec.rgb;
    return { boxShadow: `0px ${spec.offsetY}px ${spec.radius}px rgba(${r}, ${g}, ${b}, ${a})` };
  }
  return { shadowOpacity: spec.opacity * k, elevation: spec.elevation * k };
}
