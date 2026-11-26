/**
 * Hằng số layout và phép tính rect, dùng chung cho overlay lẫn route.
 *
 * Để ở đây vì hai phía phải đồng ý tuyệt đối về hình học: chỉ cần lệch 1pt là
 * khoảnh khắc giao ca giữa card và sheet sẽ thấy được bằng mắt.
 */

export const FAB = 56;
export const CARD_W = 236;
export const ROW_H = 46;
export const PAD = 10;
export const MARGIN = 20;
export const CARD_RADIUS = 28;

export type Rect = { x: number; y: number; w: number; h: number; r: number };

export const EMPTY_RECT: Rect = { x: 0, y: 0, w: 0, h: 0, r: CARD_RADIUS };

export function metrics(
  W: number,
  H: number,
  bottomInset: number,
  count: number,
  cardRadius: number = CARD_RADIUS,
) {
  'worklet';
  const bottom = bottomInset + MARGIN;
  const cardH = count * ROW_H + PAD * 2;
  return {
    cardH,
    fab: { x: W - MARGIN - FAB, y: H - bottom - FAB, w: FAB, h: FAB, r: FAB / 2 } as Rect,
    card: {
      x: W - MARGIN - CARD_W,
      y: H - bottom - cardH,
      w: CARD_W,
      h: cardH,
      r: cardRadius,
    } as Rect,
  };
}

/**
 * Độ đậm shadow (0…1) theo tiến trình morph: đầy ở hai đầu, 0 khi đang bay.
 *
 * Thay cho công tắc `flying ? 0 : 0.18` cũ: công tắc đó tắt/bật shadow trong
 * một frame, rơi đúng lúc giao ca (card vừa hiện lại đã bắt đầu thu về FAB),
 * nên mắt thấy một cú nháy. Ramp ngắn 10% ở hai đầu, lúc bounds gần như đứng
 * yên, nên vẫn giữ được TỐI ƯU 2: giữa chừng không dựng lại shadow.
 */
export function restShadow(p: number) {
  'worklet';
  const nearStart = 1 - Math.min(Math.max(p, 0) / 0.1, 1);
  const nearEnd = Math.min(Math.max(p - 0.9, 0) / 0.1, 1);
  return Math.max(nearStart, nearEnd);
}

/** Rect dự phòng khi mở thẳng route bằng deep link: nở nhẹ từ giữa màn. */
export function fallbackOrigin(W: number, H: number, r: number = CARD_RADIUS): Rect {
  'worklet';
  const w = W * 0.72;
  const h = H * 0.42;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h, r };
}
