import type { Ionicons } from '@expo/vector-icons';

export type MorphItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
};

export const ITEMS: MorphItem[] = [
  { key: 'camera', label: 'Camera', icon: 'camera', tint: '#3a3a3c' },
  { key: 'store', label: 'Store', icon: 'logo-apple-appstore', tint: '#0a84ff' },
  { key: 'audio', label: 'Audio', icon: 'mic', tint: '#ff453a' },
  { key: 'checkin', label: 'Check In', icon: 'checkmark', tint: '#ffd60a' },
];

export const findItem = (key?: string): MorphItem =>
  ITEMS.find((i) => i.key === key) ?? ITEMS[0];
