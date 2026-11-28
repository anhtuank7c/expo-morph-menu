import { createContext, useContext } from 'react';

export type UiVariant = 'default' | 'custom';

/**
 * Demo state of the example app: the UI variant of the basic demo (default
 * or custom slots) and which demo app is running (`basic` or a scene id).
 */
export const DemoContext = createContext<{
  variant: UiVariant;
  setVariant: (v: UiVariant) => void;
  scene: string;
  setScene: (id: string) => void;
}>({ variant: 'default', setVariant: () => {}, scene: 'basic', setScene: () => {} });

export const useDemo = () => useContext(DemoContext);
