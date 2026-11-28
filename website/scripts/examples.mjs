// Builds the example pages and the gallery (English and Vietnamese) from one
// list: what the demo is, how it works, what it uses and which files to show.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const docs = path.resolve(here, '..', 'src', 'content', 'docs');
const BASE = '/expo-morph-menu';

// `name:page#anchor` links a chip to its documentation.
const CONFIG = (name) => `${name}:guides/configuration/`;
const SLOT = (name) => `${name} slot:guides/custom-ui/#slots`;
const API = (name) => `${name}:reference/api/`;

const EXAMPLES = [
  {
    slug: 'basic',
    app: 'example',
    route: '',
    gif: 'basic.gif',
    title: ['Basic menu', 'Menu cơ bản'],
    summary: [
      'The + button grows into a card; each row grows into a full-screen route and shrinks back on close.',
      'Nút + nở thành thẻ menu; mỗi dòng nở thành một route toàn màn hình rồi thu lại khi đóng.',
    ],
    steps: [
      [
        'Tap + to open the card, then a row: the card grows into the route `/(sheet)/[key]`. Or press and hold +, slide onto a row and release.',
        '`MorphProvider` in the root layout holds the items; `<MorphMenu />` after the `Stack` draws the button and the card over every screen.',
        'The `(sheet)` group is registered with `morphSheetScreenOptions`, and its layout is `MorphSheetLayout`: every route inside expands from the card.',
        'The screen renders a skeleton until `useMorphSettled()` is true, so the expansion never waits for heavy content. `onHover` prefetches the data of the row under the pointer.',
        'Close with the × (`MorphCloseButton`), the browser back or Esc: the screen collapses into the card, and the menu stays open.',
      ],
      [
        'Bấm + để mở thẻ, rồi chọn một dòng: thẻ nở thành route `/(sheet)/[key]`. Hoặc nhấn giữ +, trượt lên một dòng rồi thả tay.',
        '`MorphProvider` trong root layout giữ danh sách item; `<MorphMenu />` đặt sau `Stack` vẽ nút và thẻ lên trên mọi màn hình.',
        'Nhóm `(sheet)` được khai báo với `morphSheetScreenOptions`, layout của nó là `MorphSheetLayout`: mọi route bên trong đều nở ra từ thẻ.',
        'Màn hình hiện skeleton cho tới khi `useMorphSettled()` là true, nên hiệu ứng nở không phải chờ nội dung nặng. `onHover` tải trước dữ liệu của dòng đang được rê chuột.',
        'Đóng bằng nút × (`MorphCloseButton`), nút back của trình duyệt hoặc Esc: màn hình thu về thẻ, và menu vẫn mở.',
      ],
    ],
    uses: [
      API('MorphProvider'),
      API('MorphMenu'),
      API('MorphSheetLayout'),
      API('morphSheetScreenOptions'),
      API('MorphCloseButton'),
      API('useMorphSettled'),
      'onHover:guides/configuration/#callbacks',
    ],
    files: ['example/app/_layout.tsx', 'example/app/(sheet)/_layout.tsx', 'example/app/(sheet)/[key].tsx', 'example/data/items.tsx'],
  },
  {
    slug: 'custom-slots',
    app: 'example',
    route: '?variant=custom',
    title: ['Custom slots', 'Slot tuỳ biến'],
    summary: [
      'Every visible part replaced through slots: a navy card, rows with subtitles, a custom trigger, separator and scrim.',
      'Mọi phần hiển thị được thay qua slot: thẻ màu navy, dòng có phụ đề, trigger, separator và scrim riêng.',
    ],
    steps: [
      [
        '`components` replaces `Background`, `Item`, `Trigger`, `Separator` and `Scrim`; the package keeps the animated containers, the gestures and the hand-off.',
        '`Item` reads `hovered` (a shared value) to paint its own hover state, so `Highlight` is `null`.',
        'Rows with a subtitle are taller: `itemHeight(item)` gives every height in advance, because rows are never measured.',
        'The slots are pure and the background is opaque: the card and the full screen show the same rows and swap in one frame.',
      ],
      [
        '`components` thay `Background`, `Item`, `Trigger`, `Separator` và `Scrim`; package vẫn giữ các container có animation, cử chỉ và phần chuyển giao.',
        '`Item` đọc `hovered` (một shared value) để tự vẽ trạng thái hover, nên `Highlight` là `null`.',
        'Dòng có phụ đề cao hơn: `itemHeight(item)` cho biết trước mọi chiều cao, vì các dòng không bao giờ được đo.',
        'Các slot là thuần (pure) và nền là đục: thẻ và màn hình toàn phần hiện cùng những dòng đó và hoán đổi trong một khung hình.',
      ],
    ],
    uses: [SLOT('Background'), SLOT('Item'), SLOT('Trigger'), SLOT('Separator'), SLOT('Scrim'), 'itemHeight:guides/custom-ui/', API('renderIcon')],
    files: ['example/components/CustomSlots.tsx', 'example/app/_layout.tsx'],
  },
  {
    slug: 'left-corner',
    app: 'example',
    route: '?anchor=left',
    title: ['Left corner', 'Góc trái'],
    summary: [
      'The same menu in the bottom-left corner: one line of `config`.',
      'Cùng menu đó ở góc dưới bên trái: chỉ một dòng trong `config`.',
    ],
    steps: [
      [
        '`config={{ anchor: \'bottom-left\' }}` moves the button; the card opens from that corner and the full screen grows from it.',
        'Everything else in `config` works the same way: sizes (`layout`), corner radii (`radius`), shadow, dismiss gestures, spring, haptics, surface and colors.',
        'All options are optional and merge with the defaults, per platform if you use `Platform.select`.',
      ],
      [
        '`config={{ anchor: \'bottom-left\' }}` dời nút sang trái; thẻ mở ra từ góc đó và màn hình toàn phần cũng nở từ đó.',
        'Mọi tuỳ chọn khác trong `config` đều dùng như vậy: kích thước (`layout`), bo góc (`radius`), bóng, cử chỉ đóng, spring, haptics, bề mặt và màu.',
        'Mọi tuỳ chọn đều không bắt buộc và được gộp với giá trị mặc định, có thể theo từng nền tảng nếu dùng `Platform.select`.',
      ],
    ],
    uses: [CONFIG('anchor'), CONFIG('layout'), CONFIG('radius'), CONFIG('dismiss'), CONFIG('surface'), CONFIG('colors')],
    files: ['example/app/_layout.tsx'],
  },
  {
    slug: 'social',
    app: 'social',
    route: '',
    gif: 'social.gif',
    title: ['Social app', 'App mạng xã hội'],
    summary: [
      'A small social app with tabs, a compose menu and a compose sheet with nested screens.',
      'Một app mạng xã hội nhỏ có tab, menu soạn bài và sheet soạn bài với các màn hình lồng nhau.',
    ],
    steps: [
      [
        'Sign in with the prefilled demo account (the API is a mock inside the app, there is no network).',
        'The compose button floats over the bottom tabs: `<MorphMenu bottomOffset>` keeps it above the tab bar.',
        'New post, Photo, Poll, Go live and New message are routes of the `compose` group; Photo pushes an Edit photo screen inside the sheet, with the native back button.',
        'The menu uses its own slots and config (`COMPOSE_COMPONENTS`, `COMPOSE_CONFIG`) from the compose feature folder.',
      ],
      [
        'Đăng nhập bằng tài khoản demo đã điền sẵn (API là server giả chạy trong app, không cần mạng).',
        'Nút soạn bài nổi trên thanh tab: `<MorphMenu bottomOffset>` giữ nó nằm trên tab bar.',
        'Bài mới, Ảnh, Bình chọn, Phát trực tiếp và Tin nhắn mới là các route của nhóm `compose`; màn Ảnh mở thêm màn Chỉnh ảnh bên trong sheet, có nút back native.',
        'Menu dùng slot và config riêng (`COMPOSE_COMPONENTS`, `COMPOSE_CONFIG`) nằm trong thư mục tính năng compose.',
      ],
    ],
    uses: [API('MorphMenu'), API('MorphSheetLayout'), SLOT('Item'), 'bottomOffset:guides/integration/', API('useMorphDismiss')],
    files: [
      'example-social/app/_layout.tsx',
      'example-social/app/compose/_layout.tsx',
      'example-social/src/features/compose/ui/ComposeMenu.tsx',
    ],
  },
];

const t = (pair, vi) => pair[vi ? 1 : 0];

for (const vi of [false, true]) {
  const prefix = `${BASE}${vi ? '/vi' : ''}`;
  for (const ex of EXAMPLES) {
    const body = [
      '---',
      `title: ${JSON.stringify(t(ex.title, vi))}`,
      `description: ${JSON.stringify(t(ex.summary, vi))}`,
      '---',
      '',
      `{/* Generated by website/scripts/examples.mjs. */}`,
      '',
      "import Demo from '~/components/Demo.astro';",
      "import Source from '~/components/Source.astro';",
      "import Uses from '~/components/Uses.astro';",
      '',
      t(ex.summary, vi),
      '',
      `<Demo route="${ex.route}" app="${ex.app}">`,
      '',
      `### ${vi ? 'Hoạt động thế nào' : 'How it works'}`,
      '',
      ...ex.steps[vi ? 1 : 0].map((s, i) => `${i + 1}. ${s}`),
      '',
      `<Uses items={${JSON.stringify(ex.uses)}} />`,
      '',
      '</Demo>',
      '',
      `## ${vi ? 'Mã nguồn đầy đủ' : 'Full source'}`,
      '',
      vi
        ? 'Đây chính là mã đang chạy trong khung điện thoại. Chép về, đổi item và màn hình là dùng được.'
        : 'This is the code running in the phone. Copy it, swap the items and screens, and it is yours.',
      '',
      `<Source files={${JSON.stringify(ex.files)}} />`,
      '',
    ].join('\n');
    const file = path.join(docs, vi ? 'vi' : '', 'examples', `${ex.slug}.mdx`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  }

  const card = (ex) =>
    `  <a href="${prefix}/examples/${ex.slug}/">${ex.gif ? `<img src="${BASE}/media/${ex.gif}" alt="" loading="lazy" />` : ''}<div class="text"><strong>${t(ex.title, vi)}</strong><span>${t(ex.summary, vi)}</span></div></a>`;
  const gallery = [
    '---',
    `title: ${JSON.stringify(vi ? 'Ví dụ' : 'Examples')}`,
    `description: ${JSON.stringify(vi ? 'Mỗi ví dụ chạy trực tiếp, kèm cách hoạt động và toàn bộ mã nguồn.' : 'Every example runs live, with how it works and its full source.')}`,
    '---',
    '',
    `{/* Generated by website/scripts/examples.mjs. */}`,
    '',
    vi
      ? 'Mỗi ví dụ chạy trong khung điện thoại: mở ra để thử, đọc cách nó hoạt động, rồi chép mã nguồn đầy đủ.'
      : 'Each example runs in a phone frame: open one to try it, read how it works, then copy the full source.',
    '',
    '<div class="gallery not-content">',
    ...EXAMPLES.map(card),
    '</div>',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(docs, vi ? 'vi' : '', 'examples', 'index.mdx'), gallery);
}
console.log(`examples: ${EXAMPLES.length} pages × 2 languages and the gallery`);
