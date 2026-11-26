import { Ionicons } from '@expo/vector-icons';
import type { MorphIcon, MorphItem } from 'expo-morph-menu';

type Demo = {
  key: string;
  label: string;
  /** Icon in the header of the sheet screen (drawn by this app). */
  glyph: keyof typeof Ionicons.glyphMap;
  tint: string;
  /** Icon in the menu. The four items use the different MorphIcon forms. */
  icon: MorphIcon;
  /** Used only by the custom Item slot (taller rows). */
  subtitle?: string;
};

/** Function form: receives `size` and `color` from the theme and config. */
const ion =
  (name: keyof typeof Ionicons.glyphMap): MorphIcon =>
  ({ size, color }) => <Ionicons name={name} size={size} color={color} />;

const DEMO: Demo[] = [
  {
    key: 'camera',
    label: 'Camera',
    glyph: 'camera',
    tint: '#3a3a3c',
    icon: ion('camera'),
    subtitle: 'Photos and video',
  },
  {
    key: 'store',
    label: 'Store',
    glyph: 'logo-apple-appstore',
    tint: '#0a84ff',
    // Element form: sets its own size and color.
    icon: <Ionicons name="logo-apple-appstore" size={15} color="#fff" />,
  },
  { key: 'audio', label: 'Audio', glyph: 'mic', tint: '#ff453a', icon: ion('mic'), subtitle: 'Voice memo' },
  {
    key: 'checkin',
    label: 'Check In',
    glyph: 'locate',
    tint: '#ffd60a',
    // Image form: a single-color PNG tinted with colors.iconForeground.
    icon: require('../assets/target.png'),
  },
];

/** Menu rows. Each row opens the route `/(sheet)/[key]`. */
export const ITEMS: MorphItem[] = DEMO.map((d) => ({
  key: d.key,
  label: d.label,
  tint: d.tint,
  icon: d.icon,
  data: d.subtitle ? { subtitle: d.subtitle } : undefined,
  href: { pathname: '/(sheet)/[key]', params: { key: d.key } },
}));

export const findDemo = (key?: string): Demo => DEMO.find((d) => d.key === key) ?? DEMO[0];
