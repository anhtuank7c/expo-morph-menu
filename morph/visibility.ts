/**
 * Ai đang hiện, bao nhiêu phần — một nguồn sự thật duy nhất.
 *
 * Style của overlay/vỏ và bộ trace (morph/trace.tsx) cùng gọi các hàm này, nên
 * thứ được log ra đúng là thứ được vẽ, không phải một bản chép tay dễ lệch.
 *
 * Chiều về là một cú CẮT, không phải crossfade. Bản crossfade (p ∈ [0, 0.12])
 * cho hai lớp nửa trong suốt chồng nhau khi vỏ còn to hơn card vài dp — chữ
 * trên mặt menu bị in đúp, nhoè (thấy rõ trên ảnh chụp giữa chừng ở AVD), mắt
 * đọc thành một cú nháy. Cắt đúng frame vỏ trùng khít card (lệch < 1dp) thì
 * không thấy gì; và vì cả hai cùng đọc một `sheet` trong cùng frame UI, rớt
 * frame cũng không tách được chúng.
 */

import { HANDOFF, OVERLAY_BELOW_ROUTE } from './MorphProvider';

/** `sheet` ≤ ngưỡng này nghĩa là vỏ đã nằm trùng rect card. */
export const ARRIVED = 0.005;

/** Opacity của card overlay. */
export function overlayOpacity(handoff: number, sheet: number) {
  'worklet';
  if (OVERLAY_BELOW_ROUTE || handoff === HANDOFF.MENU) return 1;
  if (handoff === HANDOFF.RETURNING) return sheet <= ARRIVED ? 1 : 0;
  return 0;
}

/** Opacity của vỏ sheet. */
export function shellOpacity(handoff: number, sheet: number) {
  'worklet';
  return handoff === HANDOFF.RETURNING && sheet <= ARRIVED ? 0 : 1;
}
