#!/usr/bin/env node
/**
 * Xuất từng trang của expo-morph-menu.{en,vi}.drawio ra SVG bằng draw.io
 * desktop, để nhúng vào README và tài liệu.
 *
 *   DRAWIO_BIN="C:/…/draw.io.exe" node docs/diagrams/export-svg.mjs
 *   → docs/diagrams/svg/{en,vi}/<n>-<tên>.svg
 *
 * - `--theme light` + nền trắng trong sơ đồ: SVG mặc định "adaptive" (màu chữ
 *   là CSS variable, nền trong suốt) — trên GitHub ở chế độ tối thành chữ đen
 *   trên nền đen.
 * - `--embed-diagram`: SVG chứa luôn dữ liệu sơ đồ, mở bằng draw.io sửa được.
 * - Gỡ ảnh PNG dự phòng: với mỗi nhãn HTML, draw.io ghi thêm một ảnh PNG
 *   base64 cho trình xem không hỗ trợ <foreignObject> (~30 KB/nhãn, ~1 MB một
 *   trang). Trình duyệt — kể cả cách GitHub hiển thị SVG — đều dùng
 *   <foreignObject>, nên bỏ chúng đi.
 *
 * draw.io desktop: https://github.com/jgraph/drawio-desktop/releases
 * (Windows: dùng đường dẫn dạng đầy đủ, không dùng tên rút gọn kiểu
 * `TUANNG~1` — Electron từ chối nạp file nội bộ: ERR_BLOCKED_BY_CLIENT.)
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// [tên file, số trang trong .drawio (1-based)]. Trang tổng quan được thêm sau
// nên nằm cuối file .drawio, nhưng mang số 0 vì nó đứng đầu README.
const PAGES = [
  ['0-overview', 7],
  ['1-architecture', 1],
  ['2-opening', 2],
  ['3-closing', 3],
  ['4-states', 4],
  ['5-shell', 5],
  ['6-slots', 6],
];

const candidates = [
  process.env.DRAWIO_BIN,
  'C:/Program Files/draw.io/draw.io.exe',
  '/Applications/draw.io.app/Contents/MacOS/draw.io',
  '/usr/bin/drawio',
  '/opt/drawio/drawio',
].filter(Boolean);
const bin = candidates.find((p) => existsSync(p));
if (!bin) {
  console.error('Không tìm thấy draw.io desktop. Đặt DRAWIO_BIN=<đường dẫn tới draw.io(.exe)>.');
  process.exit(2);
}

/** Bỏ <image> PNG dự phòng ngay sau mỗi <foreignObject>. */
function stripFallbacks(svg) {
  return svg
    .replace(/(<\/foreignObject>)\s*<image\b[^>]*?href="data:image\/png;base64,[^"]*"[^>]*?\/>/g, '$1')
    .replace(/(<\/foreignObject>)\s*<image\b[^>]*?href="data:image\/png;base64,[^"]*"[^>]*?><\/image>/g, '$1');
}

for (const lang of ['en', 'vi']) {
  const input = join(here, `expo-morph-menu.${lang}.drawio`);
  const outDir = join(here, 'svg', lang);
  mkdirSync(outDir, { recursive: true });
  PAGES.forEach(([name, page]) => {
    const out = join(outDir, `${name}.svg`);
    execFileSync(
      bin,
      [
        '--export',
        '--format', 'svg',
        '--page-index', String(page), // 1-based từ draw.io 27.0.2
        '--theme', 'light',
        '--embed-diagram',
        '--border', '20',
        '--output', out,
        input,
      ],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    );
    const before = statSync(out).size;
    const svg = stripFallbacks(readFileSync(out, 'utf8'));
    writeFileSync(out, svg);
    const left = (svg.match(/data:image\/png/g) ?? []).length;
    console.log(
      `${lang}/${name}.svg  ${(before / 1024).toFixed(0)} KB → ${(svg.length / 1024).toFixed(0)} KB${left ? `  (còn ${left} ảnh PNG!)` : ''}`,
    );
  });
}
