/**
 * Phép tính rect, dùng chung cho overlay lẫn route.
 *
 * Hai phía phải đồng ý tuyệt đối về hình học: chỉ cần lệch 1pt là khoảnh khắc
 * giao ca giữa card và sheet sẽ thấy được bằng mắt. Vì vậy mọi kích thước đều
 * TÍNH TRƯỚC từ config, không đo layout (đo là bất đồng bộ, frame đầu sai).
 */

import type { MorphAnchor, MorphConfig } from './config';

export type Rect = { x: number; y: number; w: number; h: number; r: number };

export const EMPTY_RECT: Rect = { x: 0, y: 0, w: 0, h: 0, r: 0 };

/** Vị trí các dòng bên trong card, tính từ mép trên card. */
export type ListLayout = {
  /** Chiều cao từng dòng. */
  heights: number[];
  /** Mép trên từng dòng (đã gồm padding trên và các vạch ngăn phía trước). */
  offsets: number[];
  /** Chiều cao card. */
  cardH: number;
};

export function listLayout(heights: number[], padding: number, separatorHeight: number): ListLayout {
  const offsets: number[] = [];
  let y = padding;
  heights.forEach((h, i) => {
    offsets.push(y);
    y += h + (i < heights.length - 1 ? separatorHeight : 0);
  });
  return { heights, offsets, cardH: y + padding };
}

export type Metrics = {
  cardH: number;
  fab: Rect;
  card: Rect;
  /** Phía neo: card và FAB dính mép trái hay phải. */
  side: 'left' | 'right';
};

export function sideOf(anchor: MorphAnchor): 'left' | 'right' {
  return anchor === 'bottom-left' ? 'left' : 'right';
}

export function metrics(
  W: number,
  H: number,
  bottomInset: number,
  cardH: number,
  config: Pick<MorphConfig, 'layout' | 'radius' | 'anchor'>,
): Metrics {
  const { fabSize, cardWidth, margin } = config.layout;
  const side = sideOf(config.anchor);
  const bottom = bottomInset + margin;
  const fabX = side === 'right' ? W - margin - fabSize : margin;
  const cardX = side === 'right' ? W - margin - cardWidth : margin;
  const fabR = config.radius.fab ?? fabSize / 2;
  return {
    cardH,
    side,
    fab: { x: fabX, y: H - bottom - fabSize, w: fabSize, h: fabSize, r: fabR },
    card: { x: cardX, y: H - bottom - cardH, w: cardWidth, h: cardH, r: config.radius.card },
  };
}

/** Dòng chứa điểm `rel` (tính từ mép trên card), -1 nếu không có. */
export function rowAt(rel: number, offsets: number[], heights: number[]) {
  'worklet';
  for (let i = 0; i < offsets.length; i++) {
    if (rel >= offsets[i] && rel < offsets[i] + heights[i]) return i;
  }
  return -1;
}

/**
 * Độ đậm shadow (0…1) theo tiến trình morph: đầy ở hai đầu, 0 khi đang bay.
 *
 * Ramp ngắn 10% ở hai đầu thay cho công tắc bật/tắt: công tắc tắt/bật shadow
 * trong một frame, rơi đúng lúc giao ca, nên mắt thấy một cú nháy. Giữa chừng
 * vẫn tắt, vì bounds đổi mỗi frame thì shadow phải dựng lại mỗi frame.
 */
export function restShadow(p: number) {
  'worklet';
  const nearStart = 1 - Math.min(Math.max(p, 0) / 0.1, 1);
  const nearEnd = Math.min(Math.max(p - 0.9, 0) / 0.1, 1);
  return Math.max(nearStart, nearEnd);
}

type Insets = { top: number; bottom: number; left: number; right: number };

/**
 * Rect của sheet khi đã mở hẳn: full screen, hoặc thẻ nổi ở giữa vùng an toàn
 * khi màn đủ rộng và đủ cao (`config.floatingSheet`).
 */
export function sheetRect(
  W: number,
  H: number,
  insets: Insets,
  config: Pick<MorphConfig, 'floatingSheet' | 'radius'>,
): Rect & { floating: boolean } {
  const f = config.floatingSheet;
  if (!f.enabled || W < f.minWidth || H < f.minHeight) {
    return { x: 0, y: 0, w: W, h: H, r: config.radius.sheet, floating: false };
  }
  const left = insets.left + f.margin;
  const top = insets.top + f.margin;
  const availW = W - left - insets.right - f.margin;
  const availH = H - top - insets.bottom - f.margin;
  const w = Math.round(Math.min(f.maxWidth, availW));
  const h = Math.round(Math.min(f.maxHeight, availH));
  return {
    x: Math.round(left + (availW - w) / 2),
    y: Math.round(top + (availH - h) / 2),
    w,
    h,
    r: f.radius,
    floating: true,
  };
}

/** Rect dự phòng khi mở thẳng route bằng deep link: nở nhẹ từ giữa màn. */
export function fallbackOrigin(W: number, H: number, r: number): Rect {
  'worklet';
  const w = W * 0.72;
  const h = H * 0.42;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h, r };
}
