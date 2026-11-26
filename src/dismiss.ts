/**
 * Đóng full screen bằng code, từ bất kỳ màn nào trong nhóm route.
 *
 * `router.back()` ở màn con chỉ pop màn con đó. Sau khi gửi bài hay hoàn tất
 * một luồng nhiều bước, thường muốn đóng CẢ full screen (thu về card), và đôi
 * khi muốn thu luôn menu về nút thay vì để menu mở:
 *
 *   const dismiss = useMorphDismiss();
 *   dismiss({ closeMenu: true });
 *
 * Đi qua đúng đường đóng thông thường (usePreventRemove), nên animation thu
 * gọn và các callback chạy như mọi cách đóng khác.
 */

import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useMorph } from './MorphProvider';

export type MorphDismissOptions = {
  /**
   * Ghi đè `config.closeMenuOnDismiss` cho lần đóng này. `true`: menu thu về
   * nút sau khi full screen đóng. `false`: menu vẫn mở. Bỏ trống: theo config.
   */
  closeMenu?: boolean;
};

export function useMorphDismiss() {
  const { closeMenuOverride, dismiss } = useMorph();
  const router = useRouter();
  return useCallback(
    (options?: MorphDismissOptions) => {
      if (options?.closeMenu !== undefined) closeMenuOverride.value = options.closeMenu ? 1 : 0;
      // Không có MorphSheetLayout đang mở (gọi nhầm chỗ): lùi một bước như thường.
      if (!dismiss()) {
        closeMenuOverride.value = -1;
        router.back();
      }
    },
    [closeMenuOverride, dismiss, router],
  );
}
