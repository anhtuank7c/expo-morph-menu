import type { Href } from 'expo-router';
import type { ComponentType } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import type { MorphColors } from './config';
import type { MorphIcon } from './icon';

export type MorphItem = {
  /** Khoá duy nhất. Cũng dùng làm testID: `morph-item-${key}`. */
  key: string;
  label: string;
  /** Route mở khi chọn dòng, nằm trong nhóm route dùng MorphSheetLayout. */
  href: Href;
  /**
   * Icon của dòng, vẽ trong vòng tròn `tint`: element (`<Ionicons/>`, SVG),
   * ảnh (`require('./x.png')`, `{ uri }`) hoặc `({ size, color }) => …`.
   */
  icon?: MorphIcon;
  /** Tô màu ảnh PNG bằng `colors.iconForeground`. Mặc định true; false cho ảnh nhiều màu. */
  iconTint?: boolean;
  /** Màu vòng tròn sau icon. Bỏ trống thì không vẽ vòng tròn. */
  tint?: string;
  /** Nhãn cho trình đọc màn hình, mặc định là `label`. */
  accessibilityLabel?: string;
  /** Dữ liệu tuỳ ý cho slot `Item` của bạn (subtitle, badge…). */
  data?: Record<string, unknown>;
};

export type MorphCallbacks = {
  /**
   * Ngón tay rê lên một dòng (hoặc chuột hover trên web), trước khi nhả
   * 150–400ms. Chỗ lý tưởng để nạp trước dữ liệu. Gọi lại mỗi lần đổi dòng.
   */
  onHover?: (item: MorphItem) => void;
  /** Đã chọn một dòng, ngay trước khi push route. */
  onSelect?: (item: MorphItem) => void;
  /** Menu bắt đầu mở. */
  onOpen?: () => void;
  /** Menu bắt đầu đóng về FAB. */
  onClose?: () => void;
  /** Full screen đã đóng xong (route đã pop). */
  onSheetDismissed?: (item: MorphItem | null) => void;
};

/* --- slot ------------------------------------------------------------------
   Package giữ các view ĐANG ANIMATE (kích thước, vị trí, bo góc, cắt nội
   dung) và mọi logic hình học / cử chỉ / giao ca. Bạn vẽ phần nhìn thấy bằng
   bộ UI của mình qua các slot dưới đây.

   Hợp đồng:
   1. Slot phải THUẦN: cùng props → cùng hình. `Item` và `Background` được vẽ
      HAI lần (trong card và trên vỏ full screen lúc đang morph); hai bản lệch
      nhau là thấy hình nhân đôi đúng lúc giao ca.
   2. Đừng tự animate kích thước / vị trí của slot — package lo việc đó. Đọc
      `progress` (SharedValue) để animate thứ khác (opacity, màu, xoay icon…).
   3. Chiều cao dòng phải biết trước: `layout.rowHeight` hoặc prop `itemHeight`.
   4. `Background` nên ĐỤC: lúc vỏ full screen thu về chạm card, hai lớp đổi
      chỗ trong một frame; nền trong suốt làm lộ chỗ đổi.                   */

/** Ngữ cảnh một slot đang được vẽ. */
export type MorphSlotVariant = 'menu' | 'sheet';

export type MorphBackgroundProps = {
  /**
   * 'menu': nền card menu (lấp đầy card, bị cắt theo bo góc).
   * 'sheet': nền của vỏ full screen lúc đang nở/thu (mờ dần về
   * `colors.sheetBackground` khi lớn lên) — phải trông y hệt bản 'menu'.
   */
  variant: MorphSlotVariant;
  /** 0 → 1: FAB → card ('menu') hoặc card → full screen ('sheet'). */
  progress: SharedValue<number>;
  colors: MorphColors;
};

export type MorphItemProps = {
  item: MorphItem;
  index: number;
  /** 'menu': trong card (bấm được). 'sheet': bản tĩnh vẽ trên vỏ lúc morph. */
  variant: MorphSlotVariant;
  /** Chỉ số dòng đang được rê tay / hover / nhấn; -1 khi không có. */
  hovered: SharedValue<number>;
  /** Chiều cao ô dòng (đã tính từ `itemHeight` / `layout.rowHeight`). */
  height: number;
  colors: MorphColors;
};

export type MorphTriggerProps = {
  /** 0 → 1: FAB → card. Trigger mặc định mờ + xoay 45° trong khoảng 0 → 0.4. */
  progress: SharedValue<number>;
  size: number;
  colors: MorphColors;
};

export type MorphHighlightProps = {
  /** Chỉ số dòng đang được rê tay / hover / nhấn; -1 khi không có. */
  hovered: SharedValue<number>;
  colors: MorphColors;
};

export type MorphLayerProps = {
  /** 0 → 1 độ hiện của lớp (package đã animate opacity của lớp bọc ngoài). */
  progress: SharedValue<number>;
  colors: MorphColors;
};

export type MorphComponents = {
  /** Nền card menu và nền vỏ full screen lúc morph. */
  Background?: ComponentType<MorphBackgroundProps>;
  /** Nội dung một dòng. Mặc định: icon trong vòng tròn `tint` + nhãn. */
  Item?: ComponentType<MorphItemProps>;
  /** Nội dung FAB khi đóng. Mặc định: dấu "+" (hoặc `fabIcon`). */
  Trigger?: ComponentType<MorphTriggerProps>;
  /** Lớp đánh dấu dòng đang rê tay. `null` để tắt (khi `Item` tự vẽ trạng thái hover). */
  Highlight?: ComponentType<MorphHighlightProps> | null;
  /** Vạch ngăn giữa các dòng. Cao `layout.separatorHeight`. */
  Separator?: ComponentType<{ index: number; colors: MorphColors }>;
  /** Lớp phủ phía sau card khi menu mở (bấm vào là đóng menu). */
  Scrim?: ComponentType<MorphLayerProps>;
  /** Lớp phủ phía sau vỏ full screen. */
  Backdrop?: ComponentType<MorphLayerProps>;
};
