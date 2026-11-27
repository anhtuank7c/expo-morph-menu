/**
 * Bộ ghi từng frame cho morph (công cụ gỡ lỗi).
 *
 * Mỗi frame có gì đổi thì in một dòng `[morph] …` qua console.log, xuất hiện
 * trong `adb logcat -s ReactNativeJS`. Dùng để soi flicker mà không cần quay
 * màn hình (emulator như MEmu chụp ra ảnh trắng với nội dung GPU).
 *
 *   f      số frame kể từ lúc bắt đầu hoạt động
 *   m / s  menu.value / sheet.value
 *   h      handoff (0 MENU, 1 ROUTE, 2 RETURNING)
 *   ov/sh  opacity THỰC của card overlay / vỏ sheet (cùng hàm với style)
 *
 * Nhãn cuối dòng:
 *   handoff  nhảy > 0.5 trong một frame nhưng có chủ đích (hai lớp trùng khít)
 *   FLICKER  nhảy > 0.5 trong một frame ở bất kỳ chỗ nào khác — là lỗi
 *   HOLE     cả overlay lẫn vỏ cùng ≈ 0 khi route còn trên màn — khung trống
 *   GHOST    overlay lẫn vỏ cùng hiện một phần khi vỏ chưa trùng card — hai
 *            mặt menu nửa trong suốt lệch nhau, chữ in đúp
 *   OVERLAP  card overlay (nằm TRÊN route: Android, web) vẫn đè lên vỏ đang
 *            nở/thu — giao ca trễ, mắt thấy card "đứng lại" rồi biến mất
 *   DROP(n)  frame này tới sau n ms (> 25ms): UI thread rớt frame — jank
 *
 * `example/scripts/e2e.mjs` chạy Maestro rồi quét logcat; có FLICKER/HOLE/GHOST/OVERLAP là trượt.
 */

import { useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { HANDOFF, OVERLAY_BELOW_ROUTE } from './constants';
import { useMorph } from './MorphProvider';
import { overlayOpacity, shellOpacity } from './visibility';

export type MorphTraceProps = {
  /**
   * Bật ghi. Đặt trong <MorphProvider>; nên gắn với một cờ build, ví dụ
   * `enabled={process.env.EXPO_PUBLIC_MORPH_TRACE === '1'}`. Log mỗi frame
   * tốn JS, đừng bật ở bản phát hành.
   */
  enabled?: boolean;
};

/** Công cụ gỡ lỗi: ghi trạng thái morph từng frame ra console (`[morph] …`). */
export function MorphTrace({ enabled = true }: MorphTraceProps) {
  const { menu, sheet, handoff } = useMorph();
  const prev = useSharedValue({ m: -1, s: -1, h: -1, ov: -1, sh: -1, f: 0 });

  useFrameCallback((frame) => {
    'worklet';
    const m = menu.value;
    const s = sheet.value;
    const h = handoff.value;
    const ov = overlayOpacity(h, s);
    const sh = shellOpacity(h, s);
    const p = prev.value;
    const changed =
      Math.abs(m - p.m) > 1e-3 ||
      Math.abs(s - p.s) > 1e-3 ||
      h !== p.h ||
      Math.abs(ov - p.ov) > 1e-3 ||
      Math.abs(sh - p.sh) > 1e-3;
    if (!changed) return;
    const jumped = p.ov >= 0 && (Math.abs(ov - p.ov) > 0.5 || Math.abs(sh - p.sh) > 0.5);
    // Ba cú nhảy CÓ CHỦ ĐÍCH, đều xảy ra khi vỏ nằm trùng khít card (s≈0,
    // m≈1) nên mắt không thấy:
    //   MENU → ROUTE      route vừa layout, overlay nhường chỗ cho vỏ.
    //   RETURNING (cắt)   vỏ chạm card, nhường lại cho overlay.
    //   RETURNING → MENU  commit lần mới; vỏ cũ đã unmount, vỏ mới chưa có.
    //   RETURNING → ROUTE như trên + vỏ mới đã có ngay (web, cùng một lượt JS).
    const aligned = Math.abs(s) < 0.01 && m > 0.99;
    const expected =
      aligned &&
      ((p.h === HANDOFF.MENU && h === HANDOFF.ROUTE) ||
        (p.h === HANDOFF.RETURNING && h === HANDOFF.RETURNING) ||
        (p.h === HANDOFF.RETURNING && h === HANDOFF.MENU) ||
        // Web: commit (→ MENU) và useLayoutEffect của vỏ (→ ROUTE) chạy cùng
        // một lượt JS, tracer thấy thẳng RETURNING → ROUTE.
        (p.h === HANDOFF.RETURNING && h === HANDOFF.ROUTE));
    // Khoảng cách tới frame trước (ms). > 25ms nghĩa là UI thread đã bỏ lỡ ít
    // nhất một vsync — jank, khác với flicker do logic.
    const dt = frame.timeSincePreviousFrame ?? 16;
    const drop = dt > 25 ? ` DROP(${Math.round(dt)}ms)` : '';
    const jump = jumped ? (expected ? ' handoff' : ' FLICKER') : '';
    const hole = h !== HANDOFF.MENU && ov < 0.05 && sh < 0.05 && s > 0.02 ? ' HOLE' : '';
    const partial = (o: number) => o > 0.05 && o < 0.95;
    const ghost = partial(ov) && partial(sh) && s > 0.01 ? ' GHOST' : '';
    // overlay = 1 khi vỏ đã rời rect card (s > 0.02) chỉ có thể là handoff
    // còn MENU — tức giao ca sang vỏ bị trễ. iOS: overlay nằm dưới, bỏ qua.
    const overlap = !OVERLAY_BELOW_ROUTE && ov > 0.95 && sh > 0.95 && s > 0.02 ? ' OVERLAP' : '';
    console.log(
      `[morph] f=${p.f} m=${m.toFixed(3)} s=${s.toFixed(3)} h=${h} ov=${ov.toFixed(2)} sh=${sh.toFixed(2)}${jump}${hole}${ghost}${overlap}${drop}`,
    );
    prev.value = { m, s, h, ov, sh, f: p.f + 1 };
  }, enabled);

  return null;
}
