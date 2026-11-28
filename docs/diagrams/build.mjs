#!/usr/bin/env node
/**
 * Sinh sơ đồ draw.io cho expo-morph-menu, song ngữ, từ MỘT bố cục.
 *
 *   node docs/diagrams/build.mjs
 *   → docs/diagrams/expo-morph-menu.en.drawio
 *   → docs/diagrams/expo-morph-menu.vi.drawio
 *
 * Sửa sơ đồ: sửa file này rồi chạy lại, đừng sửa tay file .drawio (lần sinh
 * sau sẽ đè). Mở bằng app.diagrams.net, draw.io desktop, hoặc extension
 * "Draw.io Integration" của VS Code; xuất PNG/SVG từ đó nếu cần.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/* --- style ---------------------------------------------------------------- */
const S = {
  pkg: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;',
  app: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;',
  slot: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;',
  state: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;',
  note: 'rounded=0;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;align=left;spacingLeft=8;spacingRight=8;',
  warn: 'rounded=0;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;align=left;spacingLeft=8;spacingRight=8;',
  frame: 'rounded=1;whiteSpace=wrap;html=1;fillColor=none;dashed=1;verticalAlign=top;align=left;spacingLeft=10;spacingTop=4;arcSize=3;',
  title: 'text;html=1;fontSize=22;fontStyle=1;align=left;verticalAlign=top;',
  sub: 'text;html=1;fontSize=12;fontColor=#555555;align=left;verticalAlign=top;whiteSpace=wrap;',
  label: 'text;html=1;fontSize=12;align=center;verticalAlign=middle;whiteSpace=wrap;',
  actor: 'rounded=1;whiteSpace=wrap;html=1;fontStyle=1;',
  life: 'endArrow=none;dashed=1;html=1;strokeColor=#999999;',
  msg: 'endArrow=block;endFill=1;html=1;',
  msgText: 'text;html=1;fontSize=11;align=left;verticalAlign=bottom;whiteSpace=wrap;labelBackgroundColor=#ffffff;',
  edgeLabel: 'text;html=1;fontSize=11;align=center;verticalAlign=middle;whiteSpace=wrap;labelBackgroundColor=#ffffff;',
  stateEdge: 'endArrow=block;endFill=1;html=1;',
  flow: 'endArrow=block;endFill=1;html=1;fontSize=11;labelBackgroundColor=#ffffff;edgeStyle=orthogonalEdgeStyle;rounded=1;',
  stateNode: 'ellipse;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;fontStyle=1;',
  bar: 'rounded=1;html=1;strokeColor=none;fontSize=10;fontColor=#ffffff;',
};

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Một trang draw.io. `lang` là 'en' | 'vi'; `t(en, vi)` chọn nhãn. */
function makePage(id, lang) {
  const cells = [];
  let n = 0;
  const t = (en, vi) => (lang === 'vi' ? vi : en);
  const nid = (p = 'c') => `${id}-${p}${++n}`;
  const api = {
    t,
    box(x, y, w, h, html, style = S.pkg, cid = nid()) {
      cells.push(
        `<mxCell id="${cid}" value="${esc(html)}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`,
      );
      return cid;
    },
    text(x, y, w, h, html, style = S.sub) {
      return api.box(x, y, w, h, html, style);
    },
    edge(src, tgt, html = '', style = S.flow) {
      const cid = nid('e');
      cells.push(
        `<mxCell id="${cid}" value="${esc(html)}" style="${style}" edge="1" parent="1" source="${src}" target="${tgt}"><mxGeometry relative="1" as="geometry"/></mxCell>`,
      );
      return cid;
    },
    /** Mũi tên tự do giữa hai điểm (dùng cho sơ đồ tuần tự). */
    arrow(x1, y1, x2, y2, html = '', style = S.msg) {
      const cid = nid('a');
      cells.push(
        `<mxCell id="${cid}" value="${esc(html)}" style="${style}" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${x1}" y="${y1}" as="sourcePoint"/><mxPoint x="${x2}" y="${y2}" as="targetPoint"/></mxGeometry></mxCell>`,
      );
      return cid;
    },
  };
  return { api, cells };
}

function diagram(id, name, cells, w = 1400, h = 900) {
  return `  <diagram id="${id}" name="${esc(name)}">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${w}" pageHeight="${h}" background="#ffffff" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${cells.join('\n        ')}
      </root>
    </mxGraphModel>
  </diagram>`;
}

function legend(api, x, y) {
  const { t } = api;
  api.box(x, y, 150, 30, t('expo-morph-menu', 'expo-morph-menu'), S.pkg);
  api.box(x + 160, y, 150, 30, t('Your code', 'Code của bạn'), S.app);
  api.box(x + 320, y, 150, 30, t('UI slot (yours)', 'Slot UI (của bạn)'), S.slot);
  api.box(x + 480, y, 150, 30, t('Shared state', 'Trạng thái chung'), S.state);
}

/* --- trang 1: kiến trúc ----------------------------------------------------- */
function pageArchitecture(lang) {
  const { api, cells } = makePage('arch', lang);
  const { t } = api;
  api.text(40, 20, 900, 34, t('1 · Architecture', '1 · Kiến trúc'), S.title);
  api.text(
    40,
    56,
    1000,
    40,
    t(
      'The menu is an overlay (not a route). The full screen is a real expo-router route. They do not import each other and communicate only through MorphProvider.',
      'Menu là overlay (không phải route). Full screen là route thật của expo-router. Hai phần không import lẫn nhau, chỉ giao tiếp qua MorphProvider.',
    ),
  );
  legend(api, 700, 100);

  api.box(40, 150, 1320, 760, t('Your app: expo-router root layout', 'App của bạn: root layout của expo-router'), S.frame);
  const provider = api.box(
    60,
    190,
    1280,
    90,
    t(
      '<b>MorphProvider</b>: items · config · colors (light/dark) · components (slots) · callbacks<br><b>Shared values (UI thread):</b> menu 0→1 · sheet 0→1 · origin = card rect · handoff MENU | ROUTE | RETURNING',
      '<b>MorphProvider</b>: items · config · màu (sáng/tối) · components (slot) · callback<br><b>Shared value (UI thread):</b> menu 0→1 · sheet 0→1 · origin = rect của card · handoff MENU | ROUTE | RETURNING',
    ),
    `${S.state}align=left;spacingLeft=14;`,
  );

  api.box(60, 310, 840, 580, t('<b>Root &lt;Stack&gt;</b> (your navigator)', '<b>&lt;Stack&gt; gốc</b> (navigator của bạn)'), S.frame);
  api.box(80, 350, 200, 70, t('index & other screens<br>(yours)', 'index và các màn khác<br>(của bạn)'), S.app);
  api.box(
    300,
    350,
    580,
    520,
    t(
      '<b>(sheet) route group</b>: options = morphSheetScreenOptions<br>transparentModal · animation: none',
      '<b>Nhóm route (sheet)</b>: options = morphSheetScreenOptions<br>transparentModal · animation: none',
    ),
    S.frame,
  );
  const sheetLayout = api.box(
    320,
    410,
    540,
    440,
    t('<b>MorphSheetLayout</b>: app/(sheet)/_layout.tsx', '<b>MorphSheetLayout</b>: app/(sheet)/_layout.tsx'),
    S.frame,
  );
  api.box(340, 450, 230, 44, t('Backdrop (slot): dims the app behind', 'Backdrop (slot): làm tối app phía sau'), S.slot);
  api.box(
    590,
    450,
    250,
    44,
    t('usePreventRemove: holds the route while the reverse morph runs', 'usePreventRemove: giữ route trong lúc chạy morph ngược'),
    S.pkg,
  );
  api.box(
    340,
    510,
    500,
    320,
    t(
      '<b>Animated container</b>: x, y, width, height, corner radius = lerp(origin → screen) · overflow: hidden',
      '<b>Container animate</b>: x, y, width, height, bo góc = lerp(origin → màn hình) · overflow: hidden',
    ),
    S.frame,
  );
  api.box(360, 560, 200, 50, t('Background (slot, variant "sheet")', 'Background (slot, variant "sheet")'), S.slot);
  api.box(360, 625, 200, 60, t('MenuFace: Item slots, variant "sheet"', 'MenuFace: slot Item, variant "sheet"'), S.pkg);
  api.box(
    575,
    560,
    250,
    125,
    t(
      '<b>Fixed-size content</b> (never re-laid out)<br>inner &lt;Stack&gt; → your screens ([key], child…)<br>MorphCloseButton · useMorphSettled()',
      '<b>Nội dung cỡ cố định</b> (không bao giờ đo lại)<br>&lt;Stack&gt; lồng → màn của bạn ([key], child…)<br>MorphCloseButton · useMorphSettled()',
    ),
    S.app,
  );
  api.box(
    360,
    700,
    465,
    110,
    t(
      '<b>Dismiss paths</b> (all go through usePreventRemove)<br>close button / router.back() · Android hardware back · browser back · Esc (web)<br>iOS: edge swipe · drag down (config.dismiss)',
      '<b>Các đường đóng</b> (đều qua usePreventRemove)<br>nút đóng / router.back() · nút back phần cứng Android · back của trình duyệt · Esc (web)<br>iOS: vuốt cạnh trái · kéo xuống (config.dismiss)',
    ),
    S.note,
  );

  const menu = api.box(
    920,
    310,
    420,
    580,
    t('<b>MorphMenu</b>: overlay, rendered AFTER the root Stack', '<b>MorphMenu</b>: overlay, đặt SAU Stack gốc'),
    S.frame,
  );
  api.box(940, 350, 380, 40, t('Scrim (slot): tap to close the menu', 'Scrim (slot): chạm để đóng menu'), S.slot);
  api.box(
    940,
    405,
    380,
    300,
    t(
      '<b>Animated card</b> (Surface: Liquid Glass / blur / solid)<br>size, position, radius = lerp(FAB → card) · overflow: hidden',
      '<b>Card animate</b> (Surface: Liquid Glass / blur / nền đặc)<br>kích thước, vị trí, bo góc = lerp(FAB → card) · overflow: hidden',
    ),
    S.frame,
  );
  api.box(955, 460, 170, 44, t('Background (slot, "menu")', 'Background (slot, "menu")'), S.slot);
  api.box(1135, 460, 170, 44, t('Trigger (slot): the button face', 'Trigger (slot): mặt nút +'), S.slot);
  api.box(955, 515, 170, 44, t('Highlight (slot)', 'Highlight (slot)'), S.slot);
  const items = api.box(1135, 515, 170, 44, t('Item (slot) × n in Pressables', 'Item (slot) × n trong Pressable'), S.slot);
  api.box(955, 570, 170, 44, t('Separator (slot)', 'Separator (slot)'), S.slot);
  api.box(1135, 570, 170, 44, t('row offsets / heights (itemHeight)', 'vị trí / chiều cao dòng (itemHeight)'), S.pkg);
  api.box(
    955,
    625,
    350,
    66,
    t('hover (mouse on web) → onHover(item): prefetch · haptics', 'rê tay (hover chuột trên web) → onHover(item): prefetch · haptics'),
    S.pkg,
  );
  api.box(
    940,
    720,
    380,
    90,
    t(
      '<b>FAB hit area + Pan gesture</b><br>tap → open · press-and-drag → select a row<br>web: captures the pointer while pressed',
      '<b>Vùng bấm FAB + cử chỉ Pan</b><br>chạm → mở · giữ-và-rê → chọn dòng<br>web: giữ pointer trong lúc nhấn',
    ),
    S.pkg,
  );
  api.box(
    940,
    825,
    380,
    50,
    t('BackHandler (Android) · Esc (web) close the open menu', 'BackHandler (Android) · Esc (web) đóng menu đang mở'),
    S.pkg,
  );

  // Mũi tên từ mép khung (không nối tâm khung lớn: sẽ cắt chéo qua hộp khác).
  api.arrow(940, 765, 880, 765);
  api.box(836, 772, 104, 44, t('select →<br>router.push(item.href)', 'chọn →<br>router.push(item.href)'), S.edgeLabel);
  api.arrow(1130, 310, 1130, 280);
  api.box(1140, 284, 210, 24, t('writes menu · origin · handoff', 'ghi menu · origin · handoff'), `${S.edgeLabel}align=left;`);
  api.arrow(760, 410, 760, 280);
  api.box(770, 284, 130, 24, t('reads origin · writes sheet', 'đọc origin · ghi sheet'), `${S.edgeLabel}align=left;`);
  void items;
  void menu;
  void sheetLayout;
  return diagram('arch', t('1 · Architecture', '1 · Kiến trúc'), cells, 1400, 940);
}

/* --- sơ đồ tuần tự dùng chung ---------------------------------------------- */
/** Một tin nhắn: mũi tên không nhãn + ô chữ căn trái phía trên, không tràn trang. */
function message(api, x1, x2, y, html, pageW = 1420) {
  api.arrow(x1, y, x2, y);
  const w = Math.max(Math.abs(x2 - x1) - 12, 560);
  let x = Math.min(x1, x2) + 6;
  if (x + w > pageW - 20) x = pageW - 20 - w;
  api.box(x, y - 34, w, 32, html, S.msgText);
}

function sequence(api, actors, top, bottom) {
  const xs = {};
  actors.forEach(([key, label, style], i) => {
    const x = 60 + i * 225;
    xs[key] = x + 95;
    api.box(x, top, 190, 50, label, style);
    api.arrow(x + 95, top + 50, x + 95, bottom, '', S.life);
  });
  return xs;
}

/* --- trang 2: luồng mở ------------------------------------------------------ */
function pageOpen(lang) {
  const { api, cells } = makePage('open', lang);
  const { t } = api;
  api.text(40, 20, 900, 34, t('2 · Opening: button → menu → full screen', '2 · Mở: nút + → menu → full screen'), S.title);
  api.text(
    40,
    56,
    1250,
    40,
    t(
      'Every visual step runs on the UI thread (Reanimated). JS only pushes the route and calls the callbacks, so a slow JS thread (for example in development builds) does not delay the visual steps.',
      'Mọi bước hình ảnh chạy trên UI thread (Reanimated). JS chỉ push route và gọi callback, nên JS thread chậm (ví dụ ở bản development) không làm chậm các bước hiển thị.',
    ),
  );
  const x = sequence(
    api,
    [
      ['user', t('User', 'Người dùng'), S.app],
      ['menu', 'MorphMenu', S.pkg],
      ['sv', t('Shared values', 'Shared value'), S.state],
      ['router', 'expo-router', S.app],
      ['sheet', 'MorphSheetLayout', S.pkg],
      ['you', t('Your callbacks / screen', 'Callback / màn của bạn'), S.app],
    ],
    110,
    880,
  );
  let y = 190;
  const m = (from, to, en, vi) => {
    message(api, x[from], x[to], y, `<b>${String(++m.i)}</b>&nbsp; ${t(en, vi)}`);
    y += 50;
  };
  m.i = 0;
  m('user', 'menu', 'press the + button', 'nhấn nút +');
  m('menu', 'sv', 'menu = spring(1) · mode = open (hit area stays active while pressed)', 'menu = spring(1) · mode = open (vùng bấm giữ hoạt động khi còn nhấn)');
  m('user', 'menu', 'slide over rows (or hover with the mouse)', 'rê qua các dòng (hoặc hover chuột)');
  m('menu', 'you', 'onHover(item): prefetch the next screen here', 'onHover(item): prefetch màn sắp mở ở đây');
  m('user', 'menu', 'release on a row (or tap a row)', 'nhả tay trên một dòng (hoặc chạm một dòng)');
  m('menu', 'sv', 'wait until menu ≥ 0.995 · origin = card rect · handoff = MENU', 'chờ menu ≥ 0.995 · origin = rect card · handoff = MENU');
  m('menu', 'you', 'onSelect(item)', 'onSelect(item)');
  m('menu', 'router', 'router.push(item.href)', 'router.push(item.href)');
  m('router', 'sheet', 'mount the (sheet) route: transparentModal, no animation', 'mount route (sheet): transparentModal, không animation');
  m('sheet', 'sv', 'first frame: container = origin rect, MenuFace drawn → handoff = ROUTE', 'frame đầu: container = rect origin, vẽ MenuFace → handoff = ROUTE');
  m('sv', 'menu', 'card opacity 0 (the container below renders the same pixels)', 'card opacity 0 (container bên dưới hiển thị cùng các pixel)');
  m('sheet', 'sv', 'sheet = spring(1): container grows · content fades in · face fades out', 'sheet = spring(1): container lớn dần · nội dung hiện · mặt menu mờ đi');
  m('sheet', 'you', 'spring finished → useMorphSettled() = true: mount heavy content', 'spring xong → useMorphSettled() = true: mount phần nặng');
  api.box(
    60,
    y + 10,
    1300,
    60,
    t(
      '<b>Step 10, native vs web:</b> native waits for the container\'s onLayout (the native view may not be on screen yet when effects run). Web hands off in useLayoutEffect, because the DOM is painted in the same frame, while onLayout (ResizeObserver) arrives frames later and would leave the card covering the growing container.',
      '<b>Bước 10, native và web:</b> native chờ onLayout của container (view native có thể chưa lên màn khi effect chạy). Web chuyển giao trong useLayoutEffect vì DOM được vẽ trong cùng frame, còn onLayout (ResizeObserver) về trễ vài frame và để card đè lên container đang mở rộng.',
    ),
    S.note,
  );
  return diagram('open', t('2 · Opening', '2 · Luồng mở'), cells, 1420, y + 100);
}

/* --- trang 3: luồng đóng ---------------------------------------------------- */
function pageClose(lang) {
  const { api, cells } = makePage('close', lang);
  const { t } = api;
  api.text(40, 20, 900, 34, t('3 · Closing: full screen → back into the menu', '3 · Đóng: full screen → nhập lại vào menu'), S.title);
  api.text(
    40,
    56,
    1250,
    40,
    t(
      'All dismiss paths converge on usePreventRemove, so the reverse morph lives in exactly one place. The hand-off back to the card is a single-frame swap, not a crossfade.',
      'Mọi đường đóng gặp nhau ở usePreventRemove, nên morph ngược chỉ nằm ở một chỗ. Chuyển giao về card là một lần hoán đổi trong một frame, không phải crossfade.',
    ),
  );
  const x = sequence(
    api,
    [
      ['user', t('User', 'Người dùng'), S.app],
      ['router', 'expo-router', S.app],
      ['sheet', 'MorphSheetLayout', S.pkg],
      ['sv', t('Shared values', 'Shared value'), S.state],
      ['menu', 'MorphMenu', S.pkg],
      ['you', t('Your callbacks', 'Callback của bạn'), S.app],
    ],
    110,
    760,
  );
  let y = 190;
  const m = (from, to, en, vi) => {
    message(api, x[from], x[to], y, `<b>${String(++m.i)}</b>&nbsp; ${t(en, vi)}`);
    y += 52;
  };
  m.i = 0;
  m('user', 'router', 'close button · Android back · browser back · Esc · edge swipe / drag', 'nút đóng · nút back phần cứng · back trình duyệt · Esc · vuốt cạnh / kéo xuống');
  m('router', 'sheet', 'removal blocked → usePreventRemove callback(repeat)', 'gỡ route bị chặn → callback(repeat) của usePreventRemove');
  m('sheet', 'sv', 'handoff = RETURNING · sheet = spring(0): continues from the gesture value', 'handoff = RETURNING · sheet = spring(0): chạy tiếp từ giá trị của cử chỉ');
  m('sheet', 'sv', 'container shrinks · content fades out · MenuFace fades in', 'container thu nhỏ · nội dung mờ đi · MenuFace hiện dần');
  m('sv', 'menu', 'frame where sheet ≤ 0.005: swap, container opacity 0, card opacity 1 (same UI frame)', 'frame có sheet ≤ 0.005: hoán đổi, container opacity 0, card opacity 1 (cùng một frame UI)');
  m('menu', 'sv', 'closeMenuOnDismiss = false: scrim back, menu stays open · true: menu = spring(0) → button', 'closeMenuOnDismiss = false: scrim hiện lại, menu vẫn mở · true: menu = spring(0) → nút +');
  m('sheet', 'menu', 'spring finished → allowLeave → sheetDismissed(): mode = open | closed', 'spring xong → allowLeave → sheetDismissed(): mode = open | closed');
  m('sheet', 'you', 'onSheetDismissed(item)', 'onSheetDismissed(item)');
  m('sheet', 'router', 'repeat() → the original action continues, route popped', 'repeat() → hành động gốc chạy tiếp, route bị pop');
  api.box(
    60,
    y + 10,
    640,
    110,
    t(
      '<b>handoff stays RETURNING after unmount.</b> Android (react-native-screens) removes native views asynchronously; resetting handoff on unmount would show the old container again for a frame. The next selection resets it to MENU.',
      '<b>handoff giữ RETURNING kể cả sau unmount.</b> Android (react-native-screens) gỡ view native bất đồng bộ; đặt lại handoff lúc unmount sẽ làm container cũ hiện lại một frame. Lần chọn kế tiếp mới đặt lại MENU.',
    ),
    S.warn,
  );
  api.box(
    720,
    y + 10,
    640,
    110,
    t(
      '<b>Web:</b> usePreventRemove would also block page unload ("Leave site?") while the full screen is open. The package disables that on beforeunload (listener registered in useLayoutEffect so it runs before React Navigation\'s).',
      '<b>Web:</b> usePreventRemove còn chặn cả việc rời trang ("Leave site?") suốt lúc full screen mở. Package tắt phần đó khi có beforeunload (listener đăng ký trong useLayoutEffect để chạy trước listener của React Navigation).',
    ),
    S.note,
  );
  return diagram('close', t('3 · Closing', '3 · Luồng đóng'), cells, 1420, y + 150);
}

/* --- trang 4: máy trạng thái ------------------------------------------------ */
function pageStates(lang) {
  const { api, cells } = makePage('states', lang);
  const { t } = api;
  api.text(40, 20, 900, 34, t('4 · State machines', '4 · Máy trạng thái'), S.title);

  api.box(40, 70, 640, 640, t('<b>handoff</b>: who shows the card', '<b>handoff</b>: ai đang hiện card'), S.frame);
  const sMenu = api.box(80, 140, 150, 70, 'MENU', S.stateNode);
  const sRoute = api.box(470, 140, 150, 70, 'ROUTE', S.stateNode);
  const sRet = api.box(275, 340, 150, 70, 'RETURNING', S.stateNode);
  const se = (a, b, anchors) => api.edge(a, b, '', `${S.stateEdge}${anchors}`);
  se(sMenu, sRoute, 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;');
  se(sRoute, sRet, 'exitX=0.5;exitY=1;entryX=1;entryY=0.5;');
  se(sRet, sMenu, 'exitX=0;exitY=0.5;entryX=0.5;entryY=1;');
  api.box(255, 120, 190, 44, t('route laid out<br>(onLayout · web: useLayoutEffect)', 'route đã layout<br>(onLayout · web: useLayoutEffect)'), S.edgeLabel);
  api.box(480, 260, 170, 44, t('dismiss<br>(usePreventRemove)', 'đóng<br>(usePreventRemove)'), S.edgeLabel);
  api.box(60, 260, 190, 44, t('next selection<br>(or deep link mount)', 'lần chọn kế tiếp<br>(hoặc mount qua deep link)'), S.edgeLabel);
  api.box(
    60,
    450,
    600,
    240,
    t(
      '<b>What is visible</b> (Android / web: the card overlay is above the route)<br><br>MENU: card 1 · container 1 (container mounts underneath, identical)<br>ROUTE: card 0 · container 1<br>RETURNING, sheet &gt; 0.005: card 0 · container 1<br>RETURNING, sheet ≤ 0.005: card 1 · container 0 ← swap<br><br><b>iOS:</b> the transparentModal is presented above the overlay, so the card always stays at opacity 1 (never animate opacity on glass/blur views).',
      '<b>Cái gì đang hiện</b> (Android / web: card overlay nằm trên route)<br><br>MENU: card 1 · container 1 (container mount bên dưới, giống hệt)<br>ROUTE: card 0 · container 1<br>RETURNING, sheet &gt; 0.005: card 0 · container 1<br>RETURNING, sheet ≤ 0.005: card 1 · container 0 ← hoán đổi<br><br><b>iOS:</b> transparentModal được present đè lên overlay, nên card luôn ở opacity 1 (không bao giờ animate opacity trên view kính/blur).',
    ),
    S.note,
  );

  api.box(720, 70, 640, 640, t('<b>MorphMenu mode</b>: who receives touches', '<b>mode của MorphMenu</b>: ai nhận chạm'), S.frame);
  const mClosed = api.box(760, 140, 150, 70, 'closed', S.stateNode);
  const mOpen = api.box(1160, 140, 150, 70, 'open', S.stateNode);
  const mRoute = api.box(960, 340, 150, 70, 'route', S.stateNode);
  const me = (a, b, anchors) => api.edge(a, b, '', `${S.stateEdge}${anchors}`);
  me(mClosed, mOpen, 'exitX=1;exitY=0.25;entryX=0;entryY=0.25;');
  me(mOpen, mClosed, 'exitX=0;exitY=0.75;entryX=1;entryY=0.75;');
  me(mOpen, mRoute, 'exitX=0.25;exitY=1;entryX=1;entryY=0.25;');
  me(mRoute, mOpen, 'exitX=1;exitY=0.75;entryX=0.75;entryY=1;');
  me(mRoute, mClosed, 'exitX=0;exitY=0.5;entryX=0.5;entryY=1;');
  api.box(945, 108, 200, 24, t('press the button', 'nhấn nút +'), S.edgeLabel);
  api.box(925, 205, 240, 34, t('scrim · back · Esc · drag released outside', 'scrim · back · Esc · thả tay ngoài card'), S.edgeLabel);
  api.box(1075, 258, 110, 34, t('select a row', 'chọn một dòng'), S.edgeLabel);
  api.box(1150, 360, 200, 44, t('dismissed,<br>closeMenuOnDismiss = false', 'đã đóng,<br>closeMenuOnDismiss = false'), S.edgeLabel);
  api.box(730, 270, 200, 44, t('dismissed,<br>closeMenuOnDismiss = true', 'đã đóng,<br>closeMenuOnDismiss = true'), S.edgeLabel);
  api.box(
    740,
    450,
    600,
    240,
    t(
      '<b>Touch ownership</b><br><br>closed: only the button hit area<br>open: scrim + rows; Android back / Esc close the menu<br>route: the overlay receives no touches and does not handle back. Otherwise (Android and web, overlay on top) the scrim would intercept taps on the close button<br><br><b>pressing</b>: while a press that started on the button is down, its hit area stays active even in "open": on web, a pointer-events:none element never receives pointerup and the gesture would get stuck.',
      '<b>Ai nhận chạm</b><br><br>closed: chỉ vùng bấm của nút +<br>open: scrim + các dòng; nút back phần cứng / Esc đóng menu<br>route: overlay không nhận chạm và không xử lý back. Nếu không (Android và web, overlay ở trên) scrim sẽ chặn chạm vào nút đóng<br><br><b>pressing</b>: khi cú nhấn bắt đầu trên nút + còn giữ, vùng bấm vẫn hoạt động dù đã "open": trên web, phần tử pointer-events:none không nhận pointerup và gesture sẽ kẹt.',
    ),
    S.note,
  );
  return diagram('states', t('4 · State machines', '4 · Máy trạng thái'), cells, 1400, 740);
}

/* --- trang 5: cấu tạo container + dòng thời gian ---------------------------------- */
function pageShell(lang) {
  const { api, cells } = makePage('shell', lang);
  const { t } = api;
  api.text(40, 20, 1000, 34, t('5 · The full-screen container: layers and timeline', '5 · Container full screen: các lớp và dòng thời gian'), S.title);
  api.text(
    40,
    56,
    1300,
    40,
    t(
      'One opaque container changes size every frame; everything inside it is fixed-size and only fades or translates. The inner navigator never re-lays out, so it stays a real native stack.',
      'Một container đục đổi kích thước mỗi frame; mọi thứ bên trong cố định kích thước, chỉ mờ/hiện hoặc dịch chuyển. Navigator bên trong không bao giờ đo lại, nên vẫn là native stack thật.',
    ),
  );
  const layers = [
    [t('Backdrop (slot): opacity 0 → backdropOpacity', 'Backdrop (slot): opacity 0 → backdropOpacity'), S.slot],
    [t('Container: animated rect, corner radius, overflow hidden, background color card → sheet', 'Container: rect animate, bo góc, overflow hidden, màu nền card → sheet'), S.pkg],
    [t('Background (slot, "sheet"): fades out as the container grows', 'Background (slot, "sheet"): mờ đi khi container lớn lên'), S.slot],
    [t('Fixed-size content (your inner Stack): fades in, slides from −insets.top to 0', 'Nội dung cỡ cố định (Stack lồng của bạn): hiện dần, trượt từ −insets.top về 0'), S.app],
    [t('MenuFace: the menu rows, anchored to the card corner; fades out', 'MenuFace: các dòng menu, neo góc card; mờ đi'), S.pkg],
  ];
  layers.forEach(([label, style], i) => {
    api.box(60 + i * 18, 120 + i * 70, 560, 56, label, style);
  });
  api.text(
    60,
    480,
    600,
    120,
    t(
      '<b>Why the content is pushed up by insets.top while small:</b> the content is anchored to the container\'s top-left; at card size the visible part would be the empty status-bar strip. Shifting it up shows the real header instead. Transform only, no layout pass.',
      '<b>Vì sao nội dung bị đẩy lên insets.top khi còn nhỏ:</b> nội dung neo góc trên-trái của container; ở cỡ card phần lộ ra sẽ là dải status bar trống. Đẩy lên thì thứ lộ ra là header thật. Chỉ dùng transform, không tính lại layout.',
    ),
  );

  const X0 = 720;
  const X1 = 1320;
  const vx = (v) => X0 + v * (X1 - X0);
  api.text(X0 - 10, 110, 640, 24, t('<b>sheet progress</b> (0 = card, 1 = full screen)', '<b>tiến trình sheet</b> (0 = card, 1 = full screen)'));
  [0, 0.25, 0.5, 0.75, 1].forEach((v) => {
    api.text(vx(v) - 20, 140, 40, 20, String(v), S.label);
    api.arrow(vx(v), 162, vx(v), 520, '', S.life);
  });
  const bar = (row, from, to, color, label) => {
    const y = 180 + row * 52;
    api.box(vx(from), y, Math.max(vx(to) - vx(from), 4), 34, label, `${S.bar}fillColor=${color};`);
  };
  bar(0, 0, 0.4, '#d79b00', t('Background 1 → 0', 'Background 1 → 0'));
  bar(1, 0, 0.4, '#6c8ebf', t('color card → sheet', 'màu card → sheet'));
  bar(2, 0.15, 0.5, '#6c8ebf', t('MenuFace 1 → 0', 'MenuFace 1 → 0'));
  bar(3, 0.4, 0.75, '#82b366', t('content 0 → 1', 'nội dung 0 → 1'));
  bar(4, 0, 1, '#82b366', t('content translateY −insets.top → 0', 'nội dung translateY −insets.top → 0'));
  bar(5, 0, 0.1, '#9673a6', t('shadow', 'bóng'));
  bar(5, 0.9, 1, '#9673a6', t('shadow', 'bóng'));
  api.box(vx(0) - 6, 500, 12, 20, '', 'rounded=0;html=1;fillColor=#b85450;strokeColor=none;');
  api.text(
    X0,
    530,
    640,
    80,
    t(
      '<b>0.005 = ARRIVED.</b> When closing, the container stays fully opaque until it matches the card (&lt; 1 dp off), then card and container swap in one frame. Shadows are disabled while the bounds change every frame, and fade over 10% at each end.',
      '<b>0.005 = ARRIVED.</b> Khi đóng, container giữ đục hoàn toàn tới khi trùng card (lệch &lt; 1 dp), rồi card và container đổi chỗ trong một frame. Bóng đổ tắt khi bounds thay đổi mỗi frame, và tăng/giảm dần trong 10% ở mỗi đầu.',
    ),
  );
  return diagram('shell', t('5 · Container: layers and timeline', '5 · Container: các lớp và dòng thời gian'), cells, 1400, 640);
}

/* --- trang 6: slot ---------------------------------------------------------- */
function pageSlots(lang) {
  const { api, cells } = makePage('slots', lang);
  const { t } = api;
  api.text(40, 20, 1000, 34, t('6 · Custom UI: what you draw, what the package moves', '6 · Tuỳ biến UI: phần bạn vẽ, phần package lái'), S.title);
  legend(api, 40, 64);

  api.box(40, 120, 700, 600, t('<b>Card</b> (package: size · position · corners · clipping · shadow)', '<b>Card</b> (package: kích thước · vị trí · bo góc · cắt nội dung · bóng)'), S.frame);
  api.box(60, 160, 660, 540, t('Background: fills the card; drawn again on the container while morphing', 'Background: lấp đầy card; vẽ lại trên container khi đang morph'), `${S.slot}verticalAlign=top;arcSize=3;`);
  api.box(80, 210, 620, 70, t('Item #0: height = itemHeight(item, 0)<br>props: item · index · variant · hovered · height · colors', 'Item #0: cao = itemHeight(item, 0)<br>props: item · index · variant · hovered · height · colors'), S.slot);
  api.box(100, 284, 580, 10, '', `${S.slot}fillColor=#d79b00;`);
  api.text(80, 294, 620, 20, t('Separator: layout.separatorHeight', 'Separator: layout.separatorHeight'), S.label);
  api.box(80, 318, 620, 56, t('Highlight (behind the hovered row) + Item #1', 'Highlight (sau dòng đang hover) + Item #1'), `${S.slot}fillColor=#fad7ac;`);
  api.box(80, 390, 620, 70, t('Item #2 …', 'Item #2 …'), S.slot);
  api.box(600, 600, 90, 80, t('Trigger<br>(button face)', 'Trigger<br>(mặt nút +)'), S.slot);
  api.box(80, 600, 500, 80, t('Row offsets and heights are computed in advance (not measured). They are used for drag-to-select hit testing and the highlight.', 'Vị trí và chiều cao dòng được tính trước (không đo), dùng cho hit testing khi kéo để chọn và cho highlight.'), S.pkg);

  api.box(
    780,
    120,
    580,
    330,
    t(
      '<b>The slot contract</b><br><br><b>1. Pure.</b> Item and Background render twice (card + container). Same props → same pixels, or two overlapping copies show at hand-off. No internal state, no enter/press animations of their own.<br><br><b>2. Don\'t animate size or position</b> inside a slot. Read progress / hovered (SharedValues) for opacity, color, rotation.<br><br><b>3. Known heights:</b> layout.rowHeight or a pure itemHeight().<br><br><b>4. Opaque Background:</b> card and container swap in one frame.',
      '<b>Hợp đồng của slot</b><br><br><b>1. Thuần.</b> Item và Background được vẽ hai lần (card + container). Cùng props → cùng pixel, nếu không sẽ thấy hai bản chồng lên nhau lúc chuyển giao. Không state riêng, không animation nhấn/xuất hiện riêng.<br><br><b>2. Không tự animate kích thước, vị trí</b> trong slot. Đọc progress / hovered (SharedValue) để animate opacity, màu, xoay.<br><br><b>3. Chiều cao biết trước:</b> layout.rowHeight hoặc itemHeight() thuần.<br><br><b>4. Background đục:</b> card và container đổi chỗ trong một frame.',
    ),
    S.note,
  );
  api.box(
    780,
    470,
    580,
    250,
    t(
      '<b>Outside the card</b><br><br>Scrim: behind the open menu (opacity animated for you; tap closes)<br>Backdrop: behind the full screen<br>MorphCloseButton: in your screens; icon via closeIcon / icon<br>fabIcon · item.icon: any MorphIcon: element, image source or ({ size, color }) =&gt; node<br><br>Beyond slots: useMorphProgress() → { menu, sheet } for your own animations.',
      '<b>Bên ngoài card</b><br><br>Scrim: sau menu đang mở (opacity đã được animate; chạm để đóng)<br>Backdrop: sau full screen<br>MorphCloseButton: trong màn của bạn; icon qua closeIcon / icon<br>fabIcon · item.icon: mọi MorphIcon: element, ảnh hoặc ({ size, color }) =&gt; node<br><br>Ngoài slot: useMorphProgress() → { menu, sheet } để điều khiển animation của riêng bạn.',
    ),
    S.note,
  );
  return diagram('slots', t('6 · Custom UI (slots)', '6 · Tuỳ biến UI (slot)'), cells, 1400, 750);
}

/* --- trang 7: tổng quan (đầu README) ---------------------------------------- */
function pageOverview(lang) {
  const { api, cells } = makePage('overview', lang);
  const { t } = api;
  const PHONE = 'rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#333333;strokeWidth=2;';
  const LINE = 'rounded=1;html=1;fillColor=#e6e6e6;strokeColor=none;';
  const HEAD = 'rounded=1;html=1;fillColor=#c7c7c7;strokeColor=none;';
  const CAPTION = 'text;html=1;fontSize=14;fontStyle=1;align=center;verticalAlign=middle;whiteSpace=wrap;';
  const ARROW_TEXT = 'text;html=1;fontSize=12;align=center;verticalAlign=bottom;whiteSpace=wrap;';
  const BACK = 'endArrow=block;endFill=1;html=1;fontSize=12;labelBackgroundColor=#ffffff;strokeColor=#6c8ebf;strokeWidth=2;dashed=1;';
  const CLOSE = 'ellipse;whiteSpace=wrap;html=1;fillColor=#f0f0f0;strokeColor=none;fontColor=#333333;';
  const W = 210;
  const H = 400;
  const TOP = 110;
  const GAP = 130;
  const xs = [0, 1, 2, 3].map((i) => 40 + i * (W + GAP));

  /** Đường gấp khúc qua các điểm (mũi tên quay về, chạy bên dưới các màn). */
  const path = (pts, html, style) => {
    const [s, ...rest] = pts;
    const e = rest.pop();
    cells.push(
      `<mxCell id="overview-p${cells.length}" value="${esc(html)}" style="${style}" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${s[0]}" y="${s[1]}" as="sourcePoint"/><mxPoint x="${e[0]}" y="${e[1]}" as="targetPoint"/><Array as="points">${rest.map(([x, y]) => `<mxPoint x="${x}" y="${y}"/>`).join('')}</Array></mxGeometry></mxCell>`,
    );
  };
  const phone = (x, caption) => {
    api.text(x - 20, TOP - 34, W + 40, 26, caption, CAPTION);
    api.box(x, TOP, W, H, '', PHONE);
    api.box(x + 75, TOP + 10, 60, 8, '', 'rounded=1;html=1;fillColor=#333333;strokeColor=none;');
  };
  const content = (x, y0, rows) => {
    for (let i = 0; i < rows; i++) api.box(x + 20, y0 + i * 26, i % 3 === 2 ? 110 : 170, 12, '', LINE);
  };

  api.text(40, 16, 1300, 30, t('How it moves', 'Chuyển động thế nào'), S.title);
  api.text(
    40,
    48,
    1300,
    22,
    t(
      'The button expands into a card, and the card expands into a full-screen expo-router route. Dismissing the route reverses the animation.',
      'Nút mở rộng thành card, card mở rộng thành route full screen của expo-router. Đóng route sẽ chạy animation theo chiều ngược lại.',
    ),
    S.sub,
  );

  // 1 · nút
  phone(xs[0], t('1 · Floating button', '1 · Nút nổi'));
  api.box(xs[0] + 20, TOP + 40, 120, 18, '', HEAD);
  content(xs[0], TOP + 80, 9);
  api.box(xs[0] + 140, TOP + 330, 50, 50, '<font style="font-size:26px">+</font>', 'ellipse;whiteSpace=wrap;html=1;fillColor=#1f2a44;strokeColor=none;fontColor=#ffffff;shadow=1;');

  // 2 · card menu
  phone(xs[1], t('2 · Card menu', '2 · Card menu'));
  api.box(xs[1] + 20, TOP + 40, 120, 18, '', HEAD);
  content(xs[1], TOP + 80, 9);
  api.box(xs[1] + 2, TOP + 26, W - 4, H - 40, '', 'rounded=0;html=1;fillColor=#000000;strokeColor=none;opacity=22;');
  const card = { x: xs[1] + 30, y: TOP + 160, w: 160, h: 220 };
  api.box(card.x, card.y, card.w, card.h, '', 'rounded=1;arcSize=12;html=1;fillColor=#ffffff;strokeColor=#6c8ebf;strokeWidth=2;shadow=1;');
  [t('Camera', 'Camera'), t('Notes', 'Ghi chú'), t('Search', 'Tìm kiếm'), t('Settings', 'Cài đặt')].forEach((label, i) => {
    const ry = card.y + 14 + i * 40;
    if (i === 1) api.box(card.x + 6, ry - 3, card.w - 12, 36, '', 'rounded=1;html=1;fillColor=#dae8fc;strokeColor=none;');
    api.box(card.x + 14, ry + 3, 24, 24, '', 'ellipse;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;');
    api.text(card.x + 46, ry, 100, 30, label, 'text;html=1;fontSize=12;align=left;verticalAlign=middle;');
  });
  api.box(card.x + card.w - 42, card.y + card.h - 42, 30, 30, '<font style="font-size:18px">×</font>', CLOSE);

  // 3 · route full-screen
  phone(xs[2], t('3 · Full-screen route', '3 · Route full-screen'));
  api.box(xs[2] + 16, TOP + 34, 30, 30, '<font style="font-size:18px">×</font>', CLOSE);
  api.text(xs[2] + 54, TOP + 34, 140, 30, `<b>${t('Notes', 'Ghi chú')}</b>`, 'text;html=1;fontSize=14;align=left;verticalAlign=middle;');
  api.box(xs[2] + 20, TOP + 80, 170, 64, '', LINE);
  api.box(
    xs[2] + 30,
    TOP + 160,
    160,
    220,
    t('grew from the card’s rect<br><font face="Courier New">/(sheet)/[key]</font>', 'phóng to từ khung card<br><font face="Courier New">/(sheet)/[key]</font>'),
    'rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#6c8ebf;strokeWidth=2;dashed=1;fontSize=11;fontColor=#4a6fa5;',
  );

  // 4 · màn con
  phone(xs[3], t('4 · Child screen', '4 · Màn con'));
  api.text(xs[3] + 16, TOP + 34, 180, 30, `‹ ${t('Notes', 'Ghi chú')}&nbsp;&nbsp;&nbsp;<b>${t('Detail', 'Chi tiết')}</b>`, 'text;html=1;fontSize=13;align=left;verticalAlign=middle;fontColor=#333333;');
  content(xs[3], TOP + 80, 10);
  api.text(xs[3] + 10, TOP + 350, 190, 20, t('inner native Stack', 'native Stack bên trong'), 'text;html=1;fontSize=11;align=center;fontColor=#555555;');

  // mũi tên đi tới
  [
    t('tap, or press and drag onto a row', 'chạm, hoặc nhấn giữ và kéo tới một dòng'),
    t('pick a row: the card grows into the route', 'chọn dòng: card phóng to thành route'),
    t('router.push inside the sheet', 'router.push bên trong sheet'),
  ].forEach((label, i) => {
    const x1 = xs[i] + W + 8;
    const x2 = xs[i + 1] - 8;
    const y = TOP + 230;
    api.text(x1, y - 70, x2 - x1, 64, label, ARROW_TEXT);
    api.arrow(x1, y, x2, y, '', 'endArrow=block;endFill=1;html=1;strokeWidth=2;strokeColor=#333333;');
  });

  // mũi tên quay về
  const B = TOP + H;
  path([[xs[3] + 105, B + 6], [xs[3] + 105, B + 36], [xs[2] + 150, B + 36], [xs[2] + 150, B + 6]], t('back', 'quay lại'), BACK);
  path(
    [[xs[2] + 60, B + 6], [xs[2] + 60, B + 86], [xs[1] + 105, B + 86], [xs[1] + 105, B + 6]],
    t('<b>dismiss: collapses into the card, the menu stays open</b>', '<b>đóng: thu gọn về card, menu vẫn mở</b>'),
    BACK,
  );
  path([[xs[1] + 40, B + 6], [xs[1] + 40, B + 36], [xs[0] + 165, B + 36], [xs[0] + 165, B + 6]], t('tap outside', 'chạm ra ngoài'), BACK);

  // cách đóng theo nền tảng
  const PY = B + 120;
  const pw = 413;
  [
    t('<b>iOS</b><br>close button · swipe from the left edge · drag down', '<b>iOS</b><br>nút đóng · vuốt từ mép trái · kéo xuống'),
    t('<b>Android</b><br>close button · hardware back', '<b>Android</b><br>nút đóng · phím back'),
    t('<b>Web</b><br>close button · Esc · browser back', '<b>Web</b><br>nút đóng · Esc · nút back của trình duyệt'),
  ].forEach((html, i) => api.box(40 + i * (pw + 20), PY, pw, 50, html, S.pkg));
  api.text(
    40,
    PY + 60,
    1300,
    22,
    t(
      '<b>closeMenuOnDismiss: true</b>: dismissing the route also collapses the menu into the button.',
      '<b>closeMenuOnDismiss: true</b>: đóng route thì menu cũng thu gọn về nút.',
    ),
    S.sub,
  );
  return diagram('overview', t('0 · Overview', '0 · Tổng quan'), cells, 1400, PY + 100);
}

/* --- xuất ------------------------------------------------------------------- */
for (const lang of ['en', 'vi']) {
  const pages = [pageArchitecture, pageOpen, pageClose, pageStates, pageShell, pageSlots, pageOverview].map((p) => p(lang));
  const xml = `<mxfile host="app.diagrams.net" agent="expo-morph-menu/docs/diagrams/build.mjs" type="device">\n${pages.join('\n')}\n</mxfile>\n`;
  const out = join(here, `expo-morph-menu.${lang}.drawio`);
  writeFileSync(out, xml);
  console.log(`wrote ${out} (${pages.length} pages)`);
}
