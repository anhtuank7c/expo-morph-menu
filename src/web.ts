/**
 * Phần riêng cho Expo web. Trên native mọi hàm ở đây là no-op.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Gọi `handler` khi nhấn phím `key` (ví dụ 'Escape') trong lúc `active`.
 * Web không có nút back cứng; Esc là cách đóng quen thuộc của bàn phím.
 */
export function useWebKey(key: string, active: boolean, handler: () => void) {
  const ref = useRef(handler);
  useLayoutEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || !active) return;
    const target = (globalThis as any).document;
    if (!target?.addEventListener) return;
    const onKey = (e: { key: string; defaultPrevented?: boolean }) => {
      if (e.key === key && !e.defaultPrevented) ref.current();
    };
    target.addEventListener('keydown', onKey);
    return () => target.removeEventListener('keydown', onKey);
  }, [key, active]);
}
