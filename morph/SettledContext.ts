import { createContext, useContext } from 'react';

/**
 * `true` khi vỏ morph đã đứng yên. Màn hình đọc cờ này để hoãn việc mount
 * phần nặng cho tới sau animation — xem TỐI ƯU 1b trong docs/PERFORMANCE.md.
 *
 * Để ở module riêng thay vì trong _layout để tránh vòng import: màn hình
 * import nó, còn layout là nơi dựng màn hình.
 */
export const SettledContext = createContext(false);
export const useSettled = () => useContext(SettledContext);
