import { Ionicons } from '@expo/vector-icons';
import type { MorphIcon, MorphItem } from 'expo-morph-menu';

type Demo = {
  key: string;
  label: string;
  /** Icon trong header của màn sheet (example tự vẽ). */
  glyph: keyof typeof Ionicons.glyphMap;
  tint: string;
  /** Icon trong menu — minh hoạ đủ dạng MorphIcon. */
  icon: MorphIcon;
  /** Chỉ slot Item tuỳ biến dùng (dòng cao hơn). */
  subtitle?: string;
};

/** Dạng hàm: icon nhận đúng `size` và `color` theo theme/config. */
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
    subtitle: 'Chụp ảnh, quay video',
  },
  {
    key: 'store',
    label: 'Store',
    glyph: 'logo-apple-appstore',
    tint: '#0a84ff',
    // Dạng element: tự đặt size/color.
    icon: <Ionicons name="logo-apple-appstore" size={15} color="#fff" />,
  },
  { key: 'audio', label: 'Audio', glyph: 'mic', tint: '#ff453a', icon: ion('mic'), subtitle: 'Ghi âm' },
  {
    key: 'checkin',
    label: 'Check In',
    glyph: 'locate',
    tint: '#ffd60a',
    // Dạng ảnh PNG đơn sắc: được tô màu bằng colors.iconForeground.
    icon: require('../assets/target.png'),
  },
];

/** Các dòng của menu: mỗi dòng mở route `/(sheet)/[key]`. */
export const ITEMS: MorphItem[] = DEMO.map((d) => ({
  key: d.key,
  label: d.label,
  tint: d.tint,
  icon: d.icon,
  data: d.subtitle ? { subtitle: d.subtitle } : undefined,
  href: { pathname: '/(sheet)/[key]', params: { key: d.key } },
}));

export const findDemo = (key?: string): Demo => DEMO.find((d) => d.key === key) ?? DEMO[0];
