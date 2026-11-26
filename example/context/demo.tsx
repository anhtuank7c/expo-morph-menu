import { createContext, useContext } from 'react';

export type UiVariant = 'default' | 'custom';

/** UI variant selected on the home screen: default or custom slots. */
export const DemoContext = createContext<{
  variant: UiVariant;
  setVariant: (v: UiVariant) => void;
}>({ variant: 'default', setVariant: () => {} });

export const useDemo = () => useContext(DemoContext);
