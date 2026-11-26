import { Platform } from 'react-native';

/**
 * Ai đang hiện card.
 *
 * MENU      overlay hiện card; route chưa có hoặc đã đi.
 * ROUTE     route đã layout xong, overlay ẩn.
 * RETURNING route đang thu về card; khi vỏ chạm card (sheet ≤ ARRIVED) thì
 *           cắt sang overlay trong một frame — xem visibility.ts.
 */
export const HANDOFF = { MENU: 0, ROUTE: 1, RETURNING: 2 } as const;

/**
 * iOS: `transparentModal` được present thành một UIViewController riêng, nằm
 * ĐÈ lên root view, tức đè lên overlay. Vỏ sheet luôn chứa trọn rect của card
 * nên overlay không bao giờ lộ ra, không cần ẩn bằng opacity. Và không nên ẩn:
 * GlassView/BlurView là UIVisualEffectView, vẽ sai khi alpha < 1.
 *
 * Android: screen nằm cùng cây view, overlay khai báo sau <Stack/> nên ở TRÊN;
 * phải ẩn. Bề mặt ở Android là View thường, animate opacity không vấn đề.
 */
export const OVERLAY_BELOW_ROUTE = Platform.OS === 'ios';

/** `sheet` ≤ ngưỡng này nghĩa là vỏ đã nằm trùng rect card (lệch < 1dp). */
export const ARRIVED = 0.005;

/** `menu` ≥ ngưỡng này nghĩa là card đã nở xong, nằm đúng rect `origin`. */
export const MENU_SETTLED = 0.995;
