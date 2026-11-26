/**
 * Ai đang hiện, bao nhiêu phần — một nguồn sự thật duy nhất.
 *
 * Style của overlay/vỏ và MorphTrace cùng gọi các hàm này, nên thứ được log ra
 * đúng là thứ được vẽ.
 *
 * Chiều về là một cú CẮT, không phải crossfade: crossfade cho hai lớp nửa
 * trong suốt chồng nhau khi vỏ còn to hơn card vài dp, chữ trên mặt menu bị in
 * đúp. Cắt đúng frame vỏ trùng khít card thì không thấy gì; và vì cả hai cùng
 * đọc một `sheet` trong cùng frame UI, rớt frame cũng không tách được chúng.
 */

import { ARRIVED, HANDOFF, OVERLAY_BELOW_ROUTE } from './constants';

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
