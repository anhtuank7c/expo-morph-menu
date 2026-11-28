#!/usr/bin/env node
/**
 * Page 7 of the architecture diagrams: full screen or floating card.
 *
 *   node docs/diagrams/floating-sheet.mjs
 *   → docs/diagrams/svg/{en,vi}/7-floating-sheet.svg
 *
 * Unlike pages 0–6 (build.mjs, exported with draw.io desktop), this page is
 * rendered to SVG by svg-kit.mjs directly, with the draw.io model embedded,
 * so draw.io still opens the file for editing.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { THEMES, diagram } from './svg-kit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
THEMES.device = { fill: '#e8eaed', stroke: '#80868b', lane: '#e8eaed' };
THEMES.screen = { fill: '#ffffff', stroke: '#3b63c4', lane: '#ffffff' };

function page(lang) {
  const d = diagram(1340, 930, lang);
  const { node, edge, text } = d;

  text({ x: 40, y: 36, anchor: 'start', size: 18, bold: true, bg: false, color: '#202124',
    text: ['7 · The sheet: full screen or floating card', '7 · Sheet: full screen hay thẻ nổi'] });
  text({ x: 40, y: 58, anchor: 'start', bg: false, color: '#5f6368',
    text: ['config.floatingSheet decides where the sheet ends up. Everything else (hand-off, close paths, inner Stack) stays the same.',
      'config.floatingSheet quyết định sheet dừng ở đâu. Mọi thứ khác (giao ca, các đường đóng, Stack lồng) giữ nguyên.'] });

  // --- decision ---------------------------------------------------------------
  node({ id: 'in', x: 160, y: 84, w: 320, h: 58, theme: 'js', title: ['MorphSheetLayout, every render', 'MorphSheetLayout, mỗi lần render'],
    lines: ['W, H = useSafeAreaFrame() · insets'] });
  node({ id: 'q', kind: 'diamond', x: 150, y: 170, w: 340, h: 120, theme: 'js',
    lines: ['floatingSheet.enabled', ['and W ≥ minWidth (700)', 'và W ≥ minWidth (700)'], ['and H ≥ minHeight (600)?', 'và H ≥ minHeight (600)?']] });
  node({ id: 'full', x: 40, y: 320, w: 270, h: 92, theme: 'app', title: 'Full screen',
    lines: ['x 0 · y 0 · W × H', 'radius.sheet (0)', ['phones, phone landscape,', 'điện thoại, điện thoại ngang,'], ['folded or narrow screens', 'máy gập, màn hẹp']] });
  node({ id: 'card', x: 330, y: 320, w: 270, h: 92, theme: 'ui', title: ['Floating card', 'Thẻ nổi'],
    lines: ['w = min(maxWidth 640, W − sides)', 'h = min(maxHeight 900, H − sides)', ['centered in the safe area', 'căn giữa vùng an toàn'], ['margin 40 · radius 24', 'lề 40 · bo góc 24']] });
  node({ id: 'target', x: 40, y: 446, w: 560, h: 74, theme: 'js', title: ['Target rect TX, TY, TW, TH, TR (sheetRect)', 'Rect đích TX, TY, TW, TH, TR (sheetRect)'],
    lines: [['the container animates from the card (origin) to this rect', 'container animate từ card (origin) tới rect này'],
      ['inner content frame: TW × TH, never laid out again', 'khung nội dung bên trong: TW × TH, không đo lại']] });

  edge({ from: 'in', to: 'q', points: [[320, 142], [320, 170]] });
  edge({ from: 'q', to: 'full', points: [[150, 230], [120, 230], [120, 320]] });
  text({ x: 135, y: 222, text: ['no', 'không'] });
  edge({ from: 'q', to: 'card', points: [[490, 230], [520, 230], [520, 320]] });
  text({ x: 505, y: 222, text: ['yes', 'có'] });
  edge({ from: 'full', to: 'target', points: [[175, 412], [175, 446]] });
  edge({ from: 'card', to: 'target', points: [[465, 412], [465, 446]] });

  // --- screens, drawn at 1/4 scale ----------------------------------------------
  const S = 0.25;
  const screen = (id, x, y, w, h, sheet, caption) => {
    node({ id: `${id}-dev`, x, y, w: w * S, h: h * S, theme: 'device' });
    node({ id: `${id}-sheet`, x: x + sheet[0] * S, y: y + sheet[1] * S, w: sheet[2] * S, h: sheet[3] * S, theme: 'screen' });
    text({ x: x + (w * S) / 2, y: y + h * S + 20, bg: false, text: caption[0] });
    text({ x: x + (w * S) / 2, y: y + h * S + 36, bg: false, color: '#5f6368', text: caption[1] });
  };
  screen('phone', 650, 110, 390, 844, [0, 0, 390, 844], [['Phone 390 × 844', 'Điện thoại 390 × 844'], ['full screen', 'full screen']]);
  screen('pad', 775, 110, 820, 1180, [90, 140, 640, 900], [['iPad 820 × 1180', 'iPad 820 × 1180'], ['card 640 × 900', 'thẻ 640 × 900']]);
  screen('land', 1000, 110, 1180, 820, [270, 40, 640, 740], [['iPad 1180 × 820', 'iPad 1180 × 820'], ['card 640 × 740', 'thẻ 640 × 740']]);
  text({ x: 975, y: 470, bg: false, color: '#5f6368', text: [
    'Gray: backdrop (colors.backdrop at backdropOpacity), visible only around a card.\nSizes measured in the example app on web and on an Android emulator.',
    'Xám: backdrop (colors.backdrop với backdropOpacity), chỉ thấy quanh thẻ.\nKích thước đo trên app ví dụ, ở web và Android emulator.'] });

  // --- what changes inside a floating card ---------------------------------------
  node({ id: 'lane', kind: 'lane', x: 40, y: 560, w: 1260, h: 330, theme: 'ui', title: ['Only while floating', 'Chỉ khi đang nổi'] });
  const box = (id, x, y, title, lines) => node({ id, x, y, w: 600, h: 124, theme: 'ui', title, lines });
  box('safe', 60, 600, ['Safe area inside the card', 'Safe area bên trong thẻ'], [
    ['SafeAreaInsetsContext → { top: 0, bottom: 0, left: 0, right: 0 }', 'SafeAreaInsetsContext → { top: 0, bottom: 0, left: 0, right: 0 }'],
    ['SafeAreaFrameContext → the card frame', 'SafeAreaFrameContext → khung của thẻ'],
    ['useSafeAreaInsets() in your screens and the native-stack header', 'useSafeAreaInsets() trong màn của bạn và header của native stack'],
    ['read 0, so phone screens need no change', 'đọc ra 0, nên màn viết cho điện thoại không phải sửa'],
    ['topInset = 0: no −insets.top shift while the card is small', 'topInset = 0: không đẩy −insets.top khi thẻ còn nhỏ']]);
  box('backdrop', 680, 600, ['Backdrop press', 'Chạm backdrop'], [
    ['a Pressable fills the screen behind the card', 'một Pressable phủ màn hình phía sau thẻ'],
    ['(floatingSheet.dismissOnBackdropPress, default true)', '(floatingSheet.dismissOnBackdropPress, mặc định true)'],
    ['tap outside → goBack() on the root navigator', 'chạm ra ngoài → goBack() trên navigator gốc'],
    ['→ usePreventRemove: the same collapse into the card', '→ usePreventRemove: cùng animation thu về card'],
    ['as the close button, Android back and Esc', 'như nút đóng, back cứng Android và Esc']]);
  box('gesture', 60, 744, ['Dismiss gestures', 'Cử chỉ đóng'], [
    ['drag down: travel from the finger to the card bottom (TY + TH)', 'kéo xuống: quãng từ ngón tay tới đáy thẻ (TY + TH)'],
    ['edge swipe: from the card left edge to its right edge (TX + TW)', 'vuốt cạnh: từ mép trái thẻ tới mép phải (TX + TW)'],
    ['both still shrink the container linearly back to the card', 'cả hai vẫn co container tuyến tính về đúng card'],
    ['(config.dismiss, on by default on iOS only)', '(config.dismiss, mặc định chỉ bật trên iOS)']]);
  box('resize', 680, 744, ['Rotation and folding', 'Xoay màn và gập máy'], [
    ['sheetRect runs on every render from useSafeAreaFrame()', 'sheetRect chạy mỗi lần render từ useSafeAreaFrame()'],
    ['rotating or unfolding switches between card and full screen', 'xoay hoặc mở máy gập thì chuyển giữa thẻ và full screen'],
    ['while open; the inner Stack keeps its screens and state', 'ngay lúc đang mở; Stack lồng giữ nguyên màn và state'],
    ['enabled: false keeps the full screen everywhere', 'enabled: false để luôn full screen']]);
  return d;
}

for (const lang of ['en', 'vi']) page(lang).save(join(here, 'svg', lang, '7-floating-sheet.svg'));
