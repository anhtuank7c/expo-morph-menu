import type { ComponentType } from 'react';
import type { MorphComponents, MorphConfigInput, MorphIcon, MorphItem } from 'expo-morph-menu';

/**
 * A demo app built on the same two routes as the basic example: the home
 * screen (`app/index.tsx`) and the sheet (`app/(sheet)/[key].tsx`). Each
 * scene brings its own items, config, slots and screens, so it shows how far
 * one `MorphProvider` can be taken.
 */
export type Scene = {
  id: string;
  title: string;
  /** One line for the list of demos. */
  subtitle: string;
  /** Accent color of the list entry. */
  accent: string;
  items: MorphItem[];
  config?: MorphConfigInput;
  components?: MorphComponents;
  itemHeight?: (item: MorphItem, index: number) => number;
  fabIcon?: MorphIcon;
  /** The home screen of the demo app. */
  Home: ComponentType;
  /** The full-screen route of a row (`itemKey` is the row's key). */
  Screen: ComponentType<{ itemKey: string }>;
};

/** A row that opens `/(sheet)/[key]` with its key. */
export function sheetItem(
  key: string,
  label: string,
  rest: Omit<MorphItem, 'key' | 'label' | 'href'> = {},
): MorphItem {
  return { key, label, href: { pathname: '/(sheet)/[key]', params: { key } }, ...rest };
}
