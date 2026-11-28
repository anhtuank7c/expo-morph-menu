// Builds the guide and reference pages (English and Vietnamese) from the
// README sections and the documents in docs/en and docs/vi, so the
// repository and the site never disagree. Run after editing them:
// `npm run sections` (also run by `npm run build`).
//
// A page is made of README sections (by their English heading; the
// Vietnamese README has the same sections in the same order) or of a whole
// document, with a live demo and its source above or below.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const docs = path.resolve(here, '..', 'src', 'content', 'docs');
const BASE = '/expo-morph-menu';
const REPO = 'https://github.com/anhtuank7c/expo-morph-menu/blob/main/';
const RAW = 'https://raw.githubusercontent.com/anhtuank7c/expo-morph-menu/main/';

const PAGES = [
  {
    slug: 'getting-started',
    title: ['Getting started', 'Bắt đầu'],
    description: [
      'Install the menu and its peers, and check compatibility.',
      'Cài menu và các thư viện đi kèm, kiểm tra tương thích.',
    ],
    sections: ['Installation', 'Compatibility'],
    intro: [
      'Install the package and the libraries it builds on, and the menu on the right is yours. Next: [Usage](BASE/usage/) wires it into your app in three files.',
      'Cài package và các thư viện nền là bạn có ngay menu bên phải. Tiếp theo: [Cách dùng](BASE/vi/usage/) gắn nó vào app chỉ với ba file.',
    ],
    demo: '',
  },
  {
    slug: 'usage',
    title: ['Usage', 'Cách dùng'],
    description: ['Three files: the root layout, the sheet route group and a screen.', 'Ba file: root layout, nhóm route sheet và một màn hình.'],
    sections: ['Usage'],
    demo: '',
    source: ['example/app/_layout.tsx', 'example/app/(sheet)/_layout.tsx', 'example/app/(sheet)/[key].tsx', 'example/data/items.tsx'],
  },
  {
    slug: 'guides/configuration',
    title: ['Configuration', 'Cấu hình'],
    description: ['Options, icons and callbacks.', 'Tuỳ chọn, icon và callback.'],
    sections: ['Configuration'],
    // Slots have their own page (Custom UI).
    skip: ['Slots'],
    demo: '?anchor=left',
    demoNote: [
      'The same app with `anchor: \'bottom-left\'`. Every option of the table below is one line of `config`.',
      'Cùng app đó với `anchor: \'bottom-left\'`. Mỗi tuỳ chọn trong bảng bên dưới là một dòng trong `config`.',
    ],
  },
  {
    slug: 'guides/custom-ui',
    title: ['Custom UI: slots', 'UI tuỳ biến: slot'],
    description: [
      'Replace every visible part of the menu with your own components or UI kit.',
      'Thay mọi phần hiển thị của menu bằng component hoặc UI kit của bạn.',
    ],
    doc: 'CUSTOM-UI.md',
    demo: '?variant=custom',
    demoNote: [
      'The example\'s "Custom slots" variant: a navy card, rows with subtitles, its own trigger, separator and scrim. Its full source is under the guide.',
      'Biến thể "Custom slots" của app ví dụ: thẻ màu navy, các dòng có phụ đề, trigger, separator và scrim riêng. Toàn bộ mã nằm ở cuối hướng dẫn.',
    ],
    source: ['example/components/CustomSlots.tsx'],
  },
  {
    slug: 'guides/integration',
    title: ['Integration guide', 'Hướng dẫn tích hợp'],
    description: ['Everything about adding the menu to an expo-router app.', 'Mọi thứ về việc thêm menu vào một app expo-router.'],
    doc: 'INTEGRATION.md',
  },
  {
    slug: 'guides/web',
    title: ['Web', 'Web'],
    description: ['The same code on Expo web.', 'Cùng một mã trên Expo web.'],
    sections: ['Web'],
    demo: '',
    demoNote: [
      'This phone runs the web build: hover a row with the mouse, press Esc, use the browser back.',
      'Khung điện thoại này chạy bản web: rê chuột lên một dòng, bấm Esc, dùng nút back của trình duyệt.',
    ],
  },
  {
    slug: 'guides/how-it-works',
    title: ['How it works', 'Cách hoạt động'],
    description: ['The card, the route group and the single-frame swap.', 'Thẻ menu, nhóm route và cú hoán đổi trong một khung hình.'],
    sections: ['How it works'],
  },
  {
    slug: 'guides/architecture',
    title: ['Architecture', 'Kiến trúc'],
    description: ['Modules, shared state, opening and closing sequences.', 'Các module, state dùng chung, trình tự mở và đóng.'],
    doc: 'ARCHITECTURE.md',
  },
  {
    slug: 'guides/performance',
    title: ['Performance', 'Hiệu năng'],
    description: ['Where the cost is, and what was measured.', 'Chi phí nằm ở đâu, và đã đo những gì.'],
    doc: 'PERFORMANCE.md',
  },
  {
    slug: 'reference/api',
    title: ['API', 'API'],
    description: ['Every export of expo-morph-menu.', 'Toàn bộ export của expo-morph-menu.'],
    sections: ['API'],
  },
  {
    slug: 'reference/platforms',
    title: ['Platform status', 'Trạng thái nền tảng'],
    description: ['What was tested where.', 'Đã kiểm tra những gì, trên nền tảng nào.'],
    sections: ['Platform status'],
  },
];

/** Markdown split at its `## ` headings (outside code fences). */
function split(text) {
  const out = [];
  let cur = { heading: '', lines: [] };
  out.push(cur);
  let fence = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('```')) fence = !fence;
    if (!fence && line.startsWith('## ')) {
      cur = { heading: line.slice(3).trim(), lines: [line] };
      out.push(cur);
    } else cur.lines.push(line);
  }
  return out;
}
const readme = {
  en: split(fs.readFileSync(path.join(root, 'README.md'), 'utf8')),
  vi: split(fs.readFileSync(path.join(root, 'README.vi.md'), 'utf8')),
};
if (readme.en.length !== readme.vi.length) throw new Error('README.md and README.vi.md have different sections');

const slugify = (h) =>
  h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9 -]/g, '')
    .trim()
    .replace(/ /g, '-');

// Where README anchors and documents end up, per language.
const anchorMap = { en: {}, vi: {} };
const docMap = {};
for (const lang of ['en', 'vi']) {
  readme[lang].forEach((s, i) => {
    const page = PAGES.find((p) => p.sections?.includes(readme.en[i].heading));
    for (const line of s.lines) {
      const m = line.match(/^(##+) (.*)/);
      if (m && page) anchorMap[lang][slugify(m[2])] = `${BASE}${lang === 'vi' ? '/vi' : ''}/${page.slug}/#${slugify(m[2])}`;
    }
  });
}
for (const p of PAGES) if (p.doc) docMap[p.doc] = p.slug;

/** Markdown into MDX: escape what MDX reads as code, point links and images at the site or GitHub. */
function toMdx(lines, lang, dir) {
  let fence = false;
  const prefix = `${BASE}${lang === 'vi' ? '/vi' : ''}`;
  return lines
    .map((line) => {
      if (line.startsWith('```')) {
        fence = !fence;
        return line;
      }
      if (fence) return line;
      // Images next to the document: raw files on GitHub (SVG needs ?sanitize=true).
      line = line.replace(/!\[([^\]]*)\]\((?!https?:)([^)]+)\)/g, (m, alt, p) => {
        const file = path.posix.normalize(path.posix.join(dir, p));
        return `![${alt}](${RAW}${file}${file.endsWith('.svg') ? '?sanitize=true' : ''})`;
      });
      // README anchors.
      line = line.replace(/\]\(#([^)]+)\)/g, (m, a) => `](${anchorMap[lang][a] ?? `#${a}`})`);
      // Links to the documents (docs/en/X.md, ../en/X.md, X.md) become site pages; other files go to GitHub.
      line = line.replace(/\]\((?!https?:|#|\/)([^)#]+)(#[^)]*)?\)/g, (m, p, hash = '') => {
        const doc = path.posix.basename(p);
        if (docMap[doc] && /\.md$/.test(p)) return `](${prefix}/${docMap[doc]}/${hash})`;
        if (/^README(\.vi)?\.md$/.test(doc) && dir === '') return `](${prefix}/${hash})`;
        return `](${REPO}${path.posix.normalize(path.posix.join(dir, p))}${hash})`;
      });
      line = line.replace(
        /\]\(https:\/\/github\.com\/anhtuank7c\/expo-morph-menu\/blob\/main\/docs\/(en|vi)\/([A-Z-]+\.md)(#[^)]*)?\)/g,
        (m, l, doc, hash = '') => (docMap[doc] ? `](${prefix}/${docMap[doc]}/${hash})` : m),
      );
      // Outside inline code, braces and < are MDX syntax.
      return line
        .split(/(`[^`]*`)/)
        .map((part, i) => (i % 2 ? part : part.replace(/[{}]/g, (c) => `\\${c}`).replace(/</g, '&lt;')))
        .join('');
    })
    .join('\n')
    .trim();
}

/** A section without the `### heading` subsections listed in `skip`. */
function without(lines, skip = []) {
  const out = [];
  let skipping = false;
  for (const line of lines) {
    const m = line.match(/^### (.*)/);
    if (m) skipping = skip.includes(m[1].trim()) || skip.includes(slugify(m[1]));
    if (!skipping) out.push(line);
  }
  return out;
}

const fill = (text) => text.replaceAll('BASE', BASE);

for (const page of PAGES) {
  for (const [lang, i18n] of [
    ['en', 0],
    ['vi', 1],
  ]) {
    let body;
    let editFile;
    if (page.doc) {
      const rel = `docs/${lang}/${page.doc}`;
      editFile = rel;
      const parts = split(fs.readFileSync(path.join(root, rel), 'utf8'));
      // Drop the "# Title", the language switch line and the hand-made table of contents.
      const intro = parts[0].lines.filter((l) => !/^# /.test(l) && !/^\[English\]|^\*\*English\*\*/.test(l));
      const rest = parts.slice(1).filter((s) => !/^(contents|muc luc)$/.test(slugify(s.heading)));
      body = [toMdx(intro, lang, `docs/${lang}`), ...rest.map((s) => toMdx(s.lines, lang, `docs/${lang}`))];
    } else {
      editFile = lang === 'vi' ? 'README.vi.md' : 'README.md';
      body = page.sections.map((h) => {
        const idx = readme.en.findIndex((s) => s.heading === h);
        if (idx < 0) throw new Error(`README section "${h}" not found`);
        const lines = without(readme[lang][idx].lines, page.skip);
        if (lines[0].slice(3).trim() === page.title[i18n] || page.sections.length === 1) lines.shift();
        return toMdx(lines, lang, '');
      });
    }
    const imports = [];
    const top = [];
    if (page.demo !== undefined || page.source)
      imports.push("import Demo from '~/components/Demo.astro';", "import Source from '~/components/Source.astro';");
    if (page.intro) top.push(fill(page.intro[i18n]));
    if (page.demo !== undefined)
      top.push(`<Demo route="${page.demo}">\n\n${page.demoNote ? fill(page.demoNote[i18n]) : ''}\n\n</Demo>`);
    const bottom = page.source
      ? [`## ${lang === 'vi' ? 'Mã nguồn của demo' : 'Source of the demo'}`, `<Source files={${JSON.stringify(page.source)}} />`]
      : [];
    const out = [
      '---',
      `title: ${JSON.stringify(page.title[i18n])}`,
      `description: ${JSON.stringify(page.description[i18n])}`,
      `editUrl: ${REPO.replace('/blob/', '/edit/')}${editFile}`,
      '---',
      '',
      `{/* Generated from ${editFile} by website/scripts/sections.mjs: edit that file, then run npm run sections. */}`,
      '',
      ...imports,
      imports.length ? '' : null,
      ...top.flatMap((t) => [t, '']),
      ...body.flatMap((b) => [b, '']),
      ...bottom.flatMap((b) => [b, '']),
    ]
      .filter((l) => l !== null)
      .join('\n');
    const file = path.join(docs, lang === 'vi' ? 'vi' : '', `${page.slug}.mdx`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, out.trimEnd() + '\n');
  }
}
console.log(`sections: ${PAGES.length} pages × 2 languages`);
