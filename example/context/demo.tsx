import { createContext, useContext } from 'react';

export type UiVariant = 'default' | 'custom';

/** Chọn bộ giao diện demo ở màn Home (mặc định / tuỳ biến bằng slot). */
export const DemoContext = createContext<{
  variant: UiVariant;
  setVariant: (v: UiVariant) => void;
}>({ variant: 'default', setVariant: () => {} });

export const useDemo = () => useContext(DemoContext);
