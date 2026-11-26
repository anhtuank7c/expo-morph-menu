#!/usr/bin/env node
/**
 * Xem trước nhanh các file .drawio thành một trang HTML (SVG), KHÔNG cần
 * draw.io và không gửi gì ra ngoài — dùng để soát chồng chéo / tràn chữ.
 *
 *   node docs/diagrams/preview.mjs [en|vi] [đường-dẫn-ra.html]
 *
 * Đây là bản vẽ gần đúng (khung, màu, chữ HTML, mũi tên thẳng), không thay
 * được draw.io để xuất ảnh chính thức.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const lang = process.argv[2] ?? 'en';
const out = process.argv[3] ?? join(here, `preview.${lang}.html`);
const xml = readFileSync(join(here, `expo-morph-menu.${lang}.drawio`), 'utf8');

const unesc = (s) =>
  s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const styleOf = (s) =>
  Object.fromEntries(
    s
      .split(';')
      .filter(Boolean)
      .map((kv) => {
        const i = kv.indexOf('=');
        return i < 0 ? [kv, '1'] : [kv.slice(0, i), kv.slice(i + 1)];
      }),
  );

const pages = [...xml.matchAll(/<diagram id="([^"]+)" name="([^"]+)">([\s\S]*?)<\/diagram>/g)].map(
  ([, id, name, body]) => {
    const pw = Number(body.match(/pageWidth="(\d+)"/)?.[1] ?? 1400);
    const ph = Number(body.match(/pageHeight="(\d+)"/)?.[1] ?? 900);
    const cells = [...body.matchAll(/<mxCell ([^>]*?)(\/>|>([\s\S]*?)<\/mxCell>)/g)].map((m) => {
      const attrs = Object.fromEntries([...m[1].matchAll(/(\w+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
      const inner = m[3] ?? '';
      const g = inner.match(/<mxGeometry ([^>]*?)\/?>/)?.[1] ?? '';
      const ga = Object.fromEntries([...g.matchAll(/(\w+)="([^"]*)"/g)].map((a) => [a[1], Number(a[2])]));
      const sp = inner.match(/<mxPoint x="([\d.]+)" y="([\d.]+)" as="sourcePoint"/);
      const tp = inner.match(/<mxPoint x="([\d.]+)" y="([\d.]+)" as="targetPoint"/);
      return { ...attrs, geo: ga, sp: sp && [+sp[1], +sp[2]], tp: tp && [+tp[1], +tp[2]] };
    });
    const byId = Object.fromEntries(cells.map((c) => [c.id, c]));
    const center = (c) => [c.geo.x + c.geo.width / 2, c.geo.y + c.geo.height / 2];
    let svg = '';
    for (const c of cells.filter((c) => c.vertex === '1')) {
      const st = styleOf(unesc(c.style ?? ''));
      const { x, y, width: w, height: h } = c.geo;
      const isText = 'text' in st;
      const fill = st.fillColor && st.fillColor !== 'none' ? st.fillColor : 'none';
      const stroke = isText ? 'none' : st.strokeColor && st.strokeColor !== 'none' ? st.strokeColor : '#333';
      const r = st.rounded === '1' ? 8 : 0;
      if ('ellipse' in st) svg += `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill}" stroke="${stroke}"/>`;
      else if (!isText) svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" ${st.dashed === '1' ? 'stroke-dasharray="6 4"' : ''}/>`;
      const fs = st.fontSize ?? 12;
      const align = st.align ?? 'center';
      const valign = st.verticalAlign ?? 'middle';
      const html = unesc(c.value ?? '');
      svg += `<foreignObject x="${x + 4}" y="${y + 2}" width="${Math.max(w - 8, 1)}" height="${Math.max(h - 4, 1)}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;flex-direction:column;justify-content:${valign === 'top' ? 'flex-start' : 'center'};text-align:${align};font:${st.fontStyle === '1' ? 'bold ' : ''}${fs}px/1.25 Helvetica,Arial,sans-serif;color:${st.fontColor ?? '#000'};overflow:hidden;outline:${'text' in st ? 'none' : '0'}"><div>${html}</div></div></foreignObject>`;
    }
    for (const c of cells.filter((c) => c.edge === '1')) {
      const st = styleOf(unesc(c.style ?? ''));
      let a = c.sp;
      let b = c.tp;
      const anchor = (cell, fx, fy) =>
        fx != null && fy != null
          ? [cell.geo.x + cell.geo.width * Number(fx), cell.geo.y + cell.geo.height * Number(fy)]
          : center(cell);
      if (c.source && byId[c.source]) a = anchor(byId[c.source], st.exitX, st.exitY);
      if (c.target && byId[c.target]) b = anchor(byId[c.target], st.entryX, st.entryY);
      if (!a || !b) continue;
      const dash = st.dashed === '1' ? 'stroke-dasharray="5 4"' : '';
      const head = st.endArrow === 'none' ? '' : 'marker-end="url(#arr)"';
      svg += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${st.strokeColor ?? '#333'}" ${dash} ${head}/>`;
      const label = unesc(c.value ?? '');
      if (label) {
        const mx = c.sp ? Math.min(a[0], b[0]) + 6 : (a[0] + b[0]) / 2 - 110;
        const my = c.sp ? a[1] - 18 : (a[1] + b[1]) / 2 - 12;
        svg += `<foreignObject x="${mx}" y="${my}" width="${c.sp ? Math.abs(b[0] - a[0]) + 260 : 220}" height="40"><div xmlns="http://www.w3.org/1999/xhtml" style="font:11px Helvetica,Arial,sans-serif;background:rgba(255,255,255,.85);display:inline-block">${label}</div></foreignObject>`;
      }
    }
    return `<h2>${name}</h2><svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="0 0 ${pw} ${ph}" style="background:#fff;border:1px solid #ccc"><defs><marker id="arr" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 z" fill="#333"/></marker></defs>${svg}</svg>`;
  },
);

writeFileSync(
  out,
  `<!doctype html><html><head><meta charset="utf-8"><title>drawio preview (${lang})</title><style>body{margin:16px;background:#eee;font-family:sans-serif}h2{margin:24px 0 8px}</style></head><body>${pages.join('')}</body></html>`,
);
console.log(`wrote ${out}`);
