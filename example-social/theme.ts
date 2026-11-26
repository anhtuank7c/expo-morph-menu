/** Colors and sizes shared by every screen of the social example. */

export const theme = {
  accent: '#6d28d9',
  accentSoft: '#ede9fe',
  background: '#ffffff',
  surface: '#f6f5fa',
  border: '#e7e5ee',
  text: '#16141f',
  textMuted: '#6b6878',
  like: '#e11d48',
  repost: '#059669',
  live: '#dc2626',
  bubbleMe: '#6d28d9',
  bubbleThem: '#f1f0f6',
} as const;

/**
 * Height of the tab bar content, without the bottom safe area inset.
 * The tab bar uses it explicitly, and the floating button is offset by the
 * same amount (`<MorphMenu bottomOffset={TAB_BAR_HEIGHT} />`), so the button
 * always sits above the tab bar.
 */
export const TAB_BAR_HEIGHT = 56;
