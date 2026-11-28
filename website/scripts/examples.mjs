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
  ...scene({
    id: 'wallet',
    title: ['Wallet', 'Ví điện tử'],
    summary: [
      'A dark fintech app: a lime button grows into a graphite menu, the rows into send, request, top up and scan screens.',
      'App tài chính nền tối: nút màu chanh nở thành menu màu than chì, các dòng nở thành màn chuyển tiền, yêu cầu, nạp tiền và quét mã.',
    ],
    steps: [
      [
        'The button and the card are one surface. The `Background` slot reads `progress` and blends lime (the button, 0) into graphite (the card, 0.5 and up) with `interpolateColor`.',
        'Its `sheet` variant is plain graphite, so the card and the growing screen match on the frame they swap.',
        'The `Trigger` slot draws a dark + that fades and turns as the card opens; `colorScheme: \'dark\'` and `colors.dark` set the text, highlight and screen background.',
        'Send has a working keypad and a contact picker; Request shows a code and a link.',
      ],
      [
        'Nút và thẻ là cùng một bề mặt. Slot `Background` đọc `progress` và chuyển màu chanh (nút, 0) sang than chì (thẻ, từ 0.5) bằng `interpolateColor`.',
        'Biến thể `sheet` của nó là màu than chì, nên thẻ và màn hình đang nở khớp nhau đúng khung hình hoán đổi.',
        'Slot `Trigger` vẽ dấu + màu tối, mờ dần và xoay khi thẻ mở; `colorScheme: \'dark\'` và `colors.dark` đặt màu chữ, highlight và nền màn hình.',
        'Màn chuyển tiền có bàn phím số và chọn người nhận; màn yêu cầu có mã và đường dẫn.',
      ],
    ],
    uses: [SLOT('Background'), SLOT('Trigger'), CONFIG('colorScheme'), CONFIG('colors'), CONFIG('radius'), CONFIG('layout')],
  }),
  ...scene({
    id: 'chat',
    title: ['Messaging', 'Nhắn tin'],
    summary: [
      'A chat list with a compose menu: rows with a title and a subtitle, screens to start a chat, a group or a channel.',
      'Danh sách chat với menu soạn tin: các dòng có tiêu đề và phụ đề, màn bắt đầu chat, tạo nhóm hoặc kênh.',
    ],
    steps: [
      [
        'An `Item` slot draws an icon tile, the label and `item.data.subtitle`; the built-in Highlight still marks the row under the finger.',
        '`itemHeight` returns 60 for rows with a subtitle: heights are known in advance, rows are never measured.',
        '`fabIcon` replaces the + with a compose icon, colored by `colors.fabIcon`.',
        'New message filters contacts as you type; New group toggles members; New channel has a public switch.',
      ],
      [
        'Slot `Item` vẽ ô icon, nhãn và `item.data.subtitle`; Highlight mặc định vẫn đánh dấu dòng dưới ngón tay.',
        '`itemHeight` trả về 60 cho dòng có phụ đề: chiều cao biết trước, các dòng không bao giờ được đo.',
        '`fabIcon` thay dấu + bằng icon soạn tin, tô bằng `colors.fabIcon`.',
        'Tin nhắn mới lọc danh bạ khi gõ; Nhóm mới chọn thành viên; Kênh mới có công tắc công khai.',
      ],
    ],
    uses: [SLOT('Item'), 'itemHeight:guides/custom-ui/', API('renderIcon'), 'fabIcon:guides/configuration/#icons', CONFIG('colors')],
  }),
  ...scene({
    id: 'delivery',
    title: ['Super app', 'Siêu ứng dụng'],
    summary: [
      'Rides, food, groceries and parcels from one button: tall rows with an ETA and a price.',
      'Gọi xe, đồ ăn, đi chợ và gửi hàng từ một nút: các dòng cao có thời gian và giá.',
    ],
    steps: [
      [
        'An `Item` slot lays out an icon tile, the service, its ETA and a price, all from `item.data`; `itemHeight` makes every row 64 high.',
        'A `Background` slot draws a white card with a green band at the top, the same in the card and while it grows into the screen.',
        'The Ride screen draws a map with plain views and lets you pick a car; Groceries counts what you add.',
      ],
      [
        'Slot `Item` xếp ô icon, tên dịch vụ, thời gian và giá, tất cả lấy từ `item.data`; `itemHeight` cho mọi dòng cao 64.',
        'Slot `Background` vẽ thẻ trắng có dải xanh ở trên, giống nhau trong thẻ và lúc nở thành màn hình.',
        'Màn gọi xe vẽ bản đồ bằng các View thường và cho chọn loại xe; màn đi chợ đếm món bạn thêm.',
      ],
    ],
    uses: [SLOT('Item'), SLOT('Background'), 'itemHeight:guides/custom-ui/', CONFIG('layout'), CONFIG('radius')],
  }),
  ...scene({
    id: 'shop',
    title: ['Shop', 'Cửa hàng'],
    summary: [
      'A bag button with a live badge: add a product and the button updates. Cart, wishlist, order tracking and help chat.',
      'Nút túi xách có huy hiệu trực tiếp: thêm sản phẩm là nút cập nhật. Giỏ hàng, yêu thích, theo dõi đơn và chat hỗ trợ.',
    ],
    steps: [
      [
        'The `Trigger` slot reads a small cart store, so the badge on the button changes as you add products on the home screen.',
        'The `Item` slot paints its own hover state from `hovered`, so `Highlight` is `null`, and shows a count per row.',
        'A `Background` slot turns the orange button into a white card, like the wallet.',
        'The cart screen edits quantities in the same store: close it and the badge follows.',
      ],
      [
        'Slot `Trigger` đọc một store giỏ hàng nhỏ, nên huy hiệu trên nút đổi khi bạn thêm sản phẩm ở màn chính.',
        'Slot `Item` tự vẽ trạng thái hover từ `hovered`, nên `Highlight` là `null`, và hiện số lượng ở mỗi dòng.',
        'Slot `Background` biến nút cam thành thẻ trắng, như ví dụ ví điện tử.',
        'Màn giỏ hàng sửa số lượng trong cùng store: đóng lại là huy hiệu cập nhật theo.',
      ],
    ],
    uses: [SLOT('Trigger'), SLOT('Item'), SLOT('Background'), 'Highlight: null:guides/custom-ui/#slots', CONFIG('layout')],
  }),
  ...scene({
    id: 'music',
    title: ['Music', 'Nghe nhạc'],
    summary: [
      'A dark music app: a moving equalizer in the button, playlists, songs, radio and a listening party.',
      'App nghe nhạc nền tối: equalizer chuyển động trong nút, playlist, bài hát, radio và nghe cùng bạn bè.',
    ],
    steps: [
      [
        'The `Trigger` slot is four bars that keep moving while the button is closed and shrink to nothing as `progress` rises.',
        'The slot only animates its own content; the package animates the button growing into the card.',
        '`surface: \'solid\'` with `colors.dark.surface` gives the card a deep tone on every platform.',
      ],
      [
        'Slot `Trigger` là bốn thanh chuyển động khi nút đóng và co lại khi `progress` tăng.',
        'Slot chỉ animate nội dung của chính nó; package lo việc nút nở thành thẻ.',
        '`surface: \'solid\'` với `colors.dark.surface` cho thẻ một tông màu sâu trên mọi nền tảng.',
      ],
    ],
    uses: [SLOT('Trigger'), CONFIG('surface'), CONFIG('colorScheme'), CONFIG('colors')],
  }),
  ...scene({
    id: 'notes',
    title: ['Notes', 'Ghi chú'],
    summary: [
      'A notes app on warm paper, with the button in the bottom-left corner and keyboard shortcuts on the rows.',
      'App ghi chú trên nền giấy ấm, nút ở góc dưới bên trái và phím tắt trên các dòng.',
    ],
    steps: [
      [
        '`anchor: \'bottom-left\'` moves the button to the left corner; the card opens from there.',
        'The `Item` slot shows a shortcut chip, and the `Separator` slot draws hairlines between rows (`layout.separatorHeight`).',
        '`colors.light` sets the paper tones of the card, the text and the screens.',
        'The voice memo animates a waveform with Reanimated; the checklist ticks items off.',
      ],
      [
        '`anchor: \'bottom-left\'` dời nút sang góc trái; thẻ mở ra từ đó.',
        'Slot `Item` hiện chip phím tắt, slot `Separator` vẽ vạch mảnh giữa các dòng (`layout.separatorHeight`).',
        '`colors.light` đặt tông giấy cho thẻ, chữ và các màn hình.',
        'Ghi âm có sóng âm animate bằng Reanimated; checklist đánh dấu từng việc.',
      ],
    ],
    uses: [CONFIG('anchor'), SLOT('Item'), SLOT('Separator'), CONFIG('colors'), CONFIG('surface')],
  }),
];

/** A demo app of example/scenes: opened with ?scene=<id>, its source is one file. */
function scene({ id, title, summary, steps, uses }) {
  return [
    {
      slug: id,
      app: 'example',
      route: `?scene=${id}`,
      gif: `scenes/${id}.gif`,
      title,
      summary,
      steps,
      uses,
      files: [`example/scenes/${id}.tsx`, 'example/scenes/types.ts', 'example/scenes/ui.tsx'],
    },
  ];
}

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
