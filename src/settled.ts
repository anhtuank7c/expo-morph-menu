import { createContext, useContext } from 'react';

/**
 * `true` khi vỏ full screen đã đứng yên. Màn hình đọc cờ này để hoãn việc
 * mount phần nặng tới sau animation (mount giữa chừng là nguồn giật chính).
 */
export const SettledContext = createContext(false);

/** `true` khi vỏ full screen đã nở xong. Dùng để hoãn mount phần nặng. */
export const useMorphSettled = () => useContext(SettledContext);
