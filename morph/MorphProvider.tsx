/**
 * Cầu nối giữa overlay và route. Bốn shared value, không hơn.
 *
 *  menu    0 → 1   FAB nở thành card            (overlay sở hữu)
 *  sheet   0 → 1   card nở thành full-screen    (route sở hữu)
 *  origin  rect    card ở đâu lúc push          (overlay ghi, route đọc)
 *  handoff HANDOFF ai đang hiện card           (route ghi, overlay đọc)
 *
 * Kèm `config` (morph/config.ts): cấu hình theo platform, ghi đè qua prop.
 *
 * `handoff` là thứ quyết định chất lượng cảm nhận: overlay chỉ biến mất khi
 * route đã thực sự có mặt trên màn hình, chứ không dựa vào con số tiến trình.
 * Route mount bất đồng bộ nên bám vào tiến trình sẽ có lúc lọt một frame trống.
 */

import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { resolveConfig, type MorphConfig, type MorphConfigInput } from './config';
import { EMPTY_RECT, type Rect } from './geometry';

/**
 * MENU      overlay hiện card; route chưa có hoặc đã đi.
 * ROUTE     route đã layout xong, overlay ẩn.
 * RETURNING route đang thu về card; khi vỏ chạm card (sheet ≤ ARRIVED) thì
 *           cắt sang overlay trong một frame — xem morph/visibility.ts.
 */
export const HANDOFF = { MENU: 0, ROUTE: 1, RETURNING: 2 } as const;

/**
 * iOS: `transparentModal` được present thành một UIViewController riêng, nằm
 * ĐÈ lên root view, tức đè lên overlay. Vỏ sheet luôn chứa trọn rect của card
 * (nó nội suy từ card → full-screen) nên overlay không bao giờ lộ ra, không
 * cần ẩn bằng opacity. Và không nên ẩn: GlassView/BlurView là
 * UIVisualEffectView, vẽ sai khi alpha < 1 rồi giật về đúng khi alpha = 1 —
 * chính là cú nháy lúc đóng.
 *
 * Android: screen nằm cùng cây view, overlay khai báo sau <Stack/> nên ở TRÊN;
 * phải ẩn. Bề mặt ở Android là View thường, animate opacity không vấn đề.
 */
export const OVERLAY_BELOW_ROUTE = Platform.OS === 'ios';

type MorphCtx = {
  menu: SharedValue<number>;
  sheet: SharedValue<number>;
  origin: SharedValue<Rect>;
  handoff: SharedValue<number>;
  config: MorphConfig;
  /**
   * Overlay đăng ký hàm đồng bộ state JS khi full screen đã đóng xong. Hàm
   * này KHÔNG chạy animation: overlay tự phản ứng trên UI thread ngay frame
   * vỏ chạm card (không phải chờ JS, chậm hẳn ở bản dev).
   */
  registerSheetDismissed: (fn: () => void) => void;
  sheetDismissed: () => void;
};

const Ctx = createContext<MorphCtx | null>(null);

export function MorphProvider({
  children,
  config: input,
}: {
  children: React.ReactNode;
  /** Ghi đè cấu hình mặc định theo platform — xem morph/config.ts. */
  config?: MorphConfigInput;
}) {
  const menu = useSharedValue(0);
  const sheet = useSharedValue(0);
  const handoff = useSharedValue(0);
  const origin = useSharedValue<Rect>(EMPTY_RECT);
  const dismissedRef = useRef<(() => void) | null>(null);
  // Phụ thuộc vào nội dung chứ không vào identity: `config={{…}}` viết inline
  // tạo object mới mỗi render, không được làm mọi consumer render lại.
  const key = JSON.stringify(input ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const config = useMemo(() => resolveConfig(input), [key]);

  const registerSheetDismissed = useCallback((fn: () => void) => {
    dismissedRef.current = fn;
  }, []);

  const sheetDismissed = useCallback(() => {
    dismissedRef.current?.();
  }, []);

  const value = useMemo<MorphCtx>(
    () => ({ menu, sheet, origin, handoff, config, registerSheetDismissed, sheetDismissed }),
    [menu, sheet, origin, handoff, config, registerSheetDismissed, sheetDismissed],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMorph() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMorph phải nằm trong <MorphProvider>');
  return ctx;
}
