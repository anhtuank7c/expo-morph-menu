// Tiny diagram kit: one description renders to an SVG that also embeds the
// draw.io model (the .drawio.svg format), so GitHub shows the picture and
// draw.io opens the same file for editing.
import fs from 'node:fs';

export const THEMES = {
  app: { fill: '#f1f3f4', stroke: '#5f6368', lane: '#fafafa' },
  js: { fill: '#e8f0fe', stroke: '#3b63c4', lane: '#f5f8ff' },
  ui: { fill: '#e6f4ea', stroke: '#2b7a4b', lane: '#f4fbf6' },
  media: { fill: '#f3e8fd', stroke: '#7b45c4', lane: '#fbf7ff' },
  cache: { fill: '#fef3e2', stroke: '#c46f1b', lane: '#fffaf2' },
  note: { fill: '#fffde7', stroke: '#b59f3b', lane: '#fffde7' },
};

const FONT = 'Helvetica, Arial, sans-serif';
const MONO_HINT = /`/g;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (s) => s.replace(MONO_HINT, '');
const width = (s, size, bold) => plain(s).length * size * (bold ? 0.6 : 0.54);

export function diagram(w, h, lang) {
  const nodes = [];
  const edges = [];
  const texts = [];
  const pick = (v) => (Array.isArray(v) ? v[lang === 'vi' ? 1 : 0] : v);
  const warn = [];
  const byId = new Map();

  const api = {
    pick,
    /** kind: box | lane | diamond | pill | note | header */
    node(n) {
      const v = { theme: 'app', kind: 'box', dashed: false, lines: [], ...n };
      v.title = v.title === undefined ? '' : pick(v.title);
      v.lines = v.lines.map(pick);
      nodes.push(v);
      byId.set(v.id, v);
      if (v.kind !== 'lane') {
        const room = v.kind === 'diamond' ? v.w * 0.62 : v.w - 14;
        if (v.title && width(v.title, 13, true) > room) warn.push(`${v.id} title`);
        v.lines.forEach((l, i) => width(l, 11.5) > room && warn.push(`${v.id} line ${i}: ${l}`));
      }
      return v;
    },
    /** Points are absolute; the first and last sit on the source and target outlines. */
    edge(e) {
      edges.push({ dashed: false, arrow: true, ...e, label: e.label && pick(e.label) });
    },
    text(t) {
      texts.push({ size: 11.5, bold: false, anchor: 'middle', bg: true, color: '#333', ...t, text: pick(t.text) });
    },
    save(file) {
      if (warn.length) console.warn(file, 'text may overflow:', warn);
      fs.writeFileSync(file, render(w, h, nodes, edges, texts, byId));
    },
  };
  return api;
}

/* --- SVG ----------------------------------------------------------------- */

function textBlock(x, y, lines, { size = 11.5, bold = false, anchor = 'middle', color = '#202124' }) {
  return lines
    .map(
      (l, i) =>
        `<text x="${x}" y="${y + i * (size + 4.5)}" font-family="${FONT}" font-size="${size}"${
          bold ? ' font-weight="bold"' : ''
        } fill="${color}" text-anchor="${anchor}">${esc(plain(l))}</text>`,
    )
    .join('');
}

function nodeSvg(n) {
  const t = THEMES[n.theme];
  const dash = n.dashed ? ' stroke-dasharray="6 4"' : '';
  let out = '';
  if (n.kind === 'diamond') {
    const cx = n.x + n.w / 2;
    const cy = n.y + n.h / 2;
    out += `<polygon points="${cx},${n.y} ${n.x + n.w},${cy} ${cx},${n.y + n.h} ${n.x},${cy}" fill="${t.fill}" stroke="${t.stroke}" stroke-width="1.4"${dash}/>`;
  } else {
    const fill = n.kind === 'lane' ? t.lane : t.fill;
    const r = n.kind === 'lane' ? 10 : n.kind === 'pill' ? n.h / 2 : 8;
    out += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${r}" fill="${fill}" stroke="${t.stroke}" stroke-width="${
      n.kind === 'lane' ? 1.2 : 1.4
    }"${dash}/>`;
  }
  if (n.kind === 'lane') return out;
  const titleH = n.title ? 17 : 0;
  const blockH = titleH + n.lines.length * 16;
  let y = n.y + (n.h - blockH) / 2 + 12;
  const cx = n.x + n.w / 2;
  if (n.title) {
    out += textBlock(cx, y, [n.title], { size: 13, bold: true });
    y += titleH + 1;
  }
  out += textBlock(cx, y, n.lines, { size: 11.5, color: '#3c4043' });
  return out;
}

function laneTitle(n) {
  const t = THEMES[n.theme];
  const w = width(n.title, 13.5, true) + 10;
  return (
    `<rect x="${n.x + 9}" y="${n.y + 7}" width="${w.toFixed(1)}" height="20" rx="3" fill="${t.lane}"/>` +
    textBlock(n.x + 14, n.y + 22, [n.title], { size: 13.5, bold: true, anchor: 'start', color: t.stroke })
  );
}

function edgeSvg(e) {
  const d = e.points.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const dash = e.dashed ? ' stroke-dasharray="6 4"' : '';
  return `<path d="${d}" fill="none" stroke="#5f6368" stroke-width="1.4"${dash}${
    e.arrow ? ' marker-end="url(#arrow)"' : ''
  }/>`;
}

function textSvg(t) {
  const lines = t.text.split('\n');
  const size = t.size;
  let out = '';
  if (t.bg) {
    const w = Math.max(...lines.map((l) => width(l, size, t.bold))) + 8;
    const h = lines.length * (size + 4.5) + 3;
    const x = t.anchor === 'middle' ? t.x - w / 2 : t.anchor === 'end' ? t.x - w + 4 : t.x - 4;
    out += `<rect x="${x.toFixed(1)}" y="${t.y - size - 1}" width="${w.toFixed(1)}" height="${h}" rx="3" fill="#ffffff" fill-opacity="0.92"/>`;
  }
  out += textBlock(t.x, t.y, lines, { size, bold: t.bold, anchor: t.anchor, color: t.color });
  return out;
}

/* --- draw.io model -------------------------------------------------------- */

const xmlEsc = (s) => esc(s);
function html(n) {
  const parts = [];
  if (n.title) parts.push(`<b>${xmlEsc(plain(n.title))}</b>`);
  if (n.lines.length) parts.push(`<font style="font-size:11.5px">${n.lines.map((l) => xmlEsc(plain(l))).join('<br>')}</font>`);
  return parts.join('<br>');
}

function model(w, h, nodes, edges, texts, byId) {
  const cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>'];
  cells.push(
    `<mxCell id="bg" value="" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=none;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="${w}" height="${h}" as="geometry"/></mxCell>`,
  );
  const ordered = [...nodes.filter((n) => n.kind === 'lane'), ...nodes.filter((n) => n.kind !== 'lane')];
  for (const n of ordered) {
    const t = THEMES[n.theme];
    const common = `whiteSpace=wrap;html=1;fontFamily=Helvetica;strokeColor=${t.stroke};strokeWidth=1.4;${n.dashed ? 'dashed=1;dashPattern=6 4;' : ''}`;
    let style;
    if (n.kind === 'lane') {
      style = `rounded=1;arcSize=2;absoluteArcSize=1;${common}fillColor=${t.lane};verticalAlign=top;align=left;spacingLeft=10;spacingTop=2;fontSize=13.5;fontStyle=1;fontColor=${t.stroke};`;
    } else if (n.kind === 'diamond') {
      style = `rhombus;${common}fillColor=${t.fill};fontSize=13;`;
    } else {
      const arc = n.kind === 'pill' ? 'arcSize=50;' : 'arcSize=8;absoluteArcSize=1;';
      style = `rounded=1;${arc}${common}fillColor=${t.fill};fontSize=13;fontColor=#202124;spacing=4;`;
    }
    const value = n.kind === 'lane' ? xmlEsc(n.title) : xmlEsc(html(n));
    cells.push(
      `<mxCell id="${n.id}" value="${value}" style="${style}" vertex="1" parent="1"><mxGeometry x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" as="geometry"/></mxCell>`,
    );
  }
  edges.forEach((e, i) => {
    const s = e.from && byId.get(e.from);
    const t = e.to && byId.get(e.to);
    const [p0] = e.points;
    const pn = e.points.at(-1);
    if (!s || !t) {
      const style = `edgeStyle=none;rounded=0;html=1;strokeColor=#5f6368;strokeWidth=1.4;${
        e.arrow ? 'endArrow=block;endFill=1;endSize=7;' : 'endArrow=none;'
      }${e.dashed ? 'dashed=1;dashPattern=6 4;' : ''}`;
      const mids = e.points.slice(1, -1).map((p) => `<mxPoint x="${p[0]}" y="${p[1]}"/>`).join('');
      cells.push(
        `<mxCell id="e${i}" value="" style="${style}" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${p0[0]}" y="${p0[1]}" as="sourcePoint"/><mxPoint x="${pn[0]}" y="${pn[1]}" as="targetPoint"/>${
          mids ? `<Array as="points">${mids}</Array>` : ''
        }</mxGeometry></mxCell>`,
      );
      return;
    }
    const rel = (n, p) => [((p[0] - n.x) / n.w).toFixed(4), ((p[1] - n.y) / n.h).toFixed(4)];
    const [ex, ey] = rel(s, p0);
    const [nx, ny] = rel(t, pn);
    const style = `edgeStyle=none;rounded=0;html=1;strokeColor=#5f6368;strokeWidth=1.4;${
      e.arrow ? 'endArrow=block;endFill=1;endSize=7;' : 'endArrow=none;'
    }${e.dashed ? 'dashed=1;dashPattern=6 4;' : ''}exitX=${ex};exitY=${ey};exitDx=0;exitDy=0;entryX=${nx};entryY=${ny};entryDx=0;entryDy=0;`;
    const mids = e.points
      .slice(1, -1)
      .map((p) => `<mxPoint x="${p[0]}" y="${p[1]}"/>`)
      .join('');
    cells.push(
      `<mxCell id="e${i}" value="" style="${style}" edge="1" parent="1" source="${e.from}" target="${e.to}"><mxGeometry relative="1" as="geometry">${
        mids ? `<Array as="points">${mids}</Array>` : ''
      }</mxGeometry></mxCell>`,
    );
  });
  texts.forEach((t, i) => {
    const lines = t.text.split('\n');
    const tw = Math.max(...lines.map((l) => width(l, t.size, t.bold))) + 10;
    const th = lines.length * (t.size + 4.5) + 4;
    const x = t.anchor === 'middle' ? t.x - tw / 2 : t.anchor === 'end' ? t.x - tw : t.x - 5;
    const align = t.anchor === 'middle' ? 'center' : t.anchor === 'end' ? 'right' : 'left';
    const style = `text;html=1;fontFamily=Helvetica;fontSize=${t.size};${t.bold ? 'fontStyle=1;' : ''}align=${align};verticalAlign=middle;fontColor=${t.color};${
      t.bg ? 'labelBackgroundColor=#ffffff;' : ''
    }`;
    cells.push(
      `<mxCell id="t${i}" value="${xmlEsc(lines.map((l) => xmlEsc(plain(l))).join('<br>'))}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x.toFixed(1)}" y="${(t.y - t.size - 1).toFixed(1)}" width="${tw.toFixed(1)}" height="${th}" as="geometry"/></mxCell>`,
    );
  });
  return `<mxfile host="drawio" type="device"><diagram id="d" name="Page-1"><mxGraphModel dx="${w}" dy="${h}" grid="1" gridSize="10" guides="1" page="1" pageWidth="${w}" pageHeight="${h}" background="#ffffff"><root>${cells.join('')}</root></mxGraphModel></diagram></mxfile>`;
}

function render(w, h, nodes, edges, texts, byId) {
  const lanes = nodes.filter((n) => n.kind === 'lane');
  const rest = nodes.filter((n) => n.kind !== 'lane');
  const content = esc(model(w, h, nodes, edges, texts, byId));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" content="${content}">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#5f6368"/></marker></defs>
<rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>
${lanes.map(nodeSvg).join('\n')}
${edges.map(edgeSvg).join('\n')}
${rest.map(nodeSvg).join('\n')}
${lanes.map(laneTitle).join('\n')}
${texts.map(textSvg).join('\n')}
</svg>
`;
}
