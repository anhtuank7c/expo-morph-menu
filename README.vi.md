# expo-morph-menu

[English](https://github.com/anhtuank7c/expo-morph-menu/blob/main/README.md) | **Tiếng Việt**

Menu nổi có thể mở rộng dành cho expo-router, dùng animation của Reanimated 4.

Nút nổi mở rộng thành card menu. Khi chọn một dòng, card mở rộng thành một route full screen. Khi route được đóng, nó thu gọn về card và menu vẫn mở. Vì màn hình full screen là một route expo-router thông thường, nó hỗ trợ deep link, điều hướng back và native stack lồng nhau.

<table>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/anhtuank7c/expo-morph-menu/main/docs/demo/basic-ios.gif" width="280" alt="Ví dụ cơ bản trên iOS: menu Liquid Glass, các dòng mở rộng thành route full screen và màn con, đóng thì về lại card"></td>
    <td align="center"><img src="https://raw.githubusercontent.com/anhtuank7c/expo-morph-menu/main/docs/demo/social-ios.gif" width="280" alt="Ví dụ mạng xã hội trên iOS: menu soạn bài mở Photo và Go live thành route full screen, kéo xuống thì thu về card"></td>
  </tr>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/anhtuank7c/expo-morph-menu/main/docs/demo/basic.gif" width="280" alt="Ví dụ cơ bản: menu mở, một dòng mở rộng thành route full screen, đóng thì về lại card"></td>
    <td align="center"><img src="https://raw.githubusercontent.com/anhtuank7c/expo-morph-menu/main/docs/demo/social.gif" width="280" alt="Ví dụ mạng xã hội: nút soạn bài mở menu, Post, Poll và Go live mở rộng thành route full screen"></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/anhtuank7c/expo-morph-menu/tree/main/example">Ví dụ cơ bản</a>: chạm một dòng, đóng, nhấn giữ rồi trượt</td>
    <td align="center"><a href="https://github.com/anhtuank7c/expo-morph-menu/tree/main/example-social">Ví dụ mạng xã hội</a>: màn đăng bài, poll và live từ cùng một menu</td>
  </tr>
</table>

Hàng trên: iOS 27 simulator. Hàng dưới: Android emulator.

![Nút nổi, card menu, route full screen và màn hình con, cùng đường đóng](https://raw.githubusercontent.com/anhtuank7c/expo-morph-menu/main/docs/diagrams/svg/vi/0-overview.svg?sanitize=true)

## Tính năng

- Màn hình full screen là một nhóm route expo-router. Deep link, nút back phần cứng trên Android, nút back của trình duyệt và các màn hình lồng nhau dùng navigation stack thông thường.
- Container toàn màn hình bắt đầu từ khung (bounds) của card và trở về khung đó. Việc hoán đổi giữa card và container diễn ra trên UI thread trong một frame.
- Cử chỉ đóng có thể cấu hình theo từng nền tảng: vuốt từ mép trái và kéo xuống trên iOS, nút đóng và nút back phần cứng trên Android, Esc và nút back của trình duyệt trên web.
- `onHover` được gọi khi con trỏ di chuyển trên một dòng, trước khi dòng được chọn. Dùng nó để prefetch dữ liệu cho màn hình đích.
- Mọi phần hiển thị của menu là một component có thể thay thế (slot), nên menu có thể được render bằng bất kỳ bộ UI nào.
- Hỗ trợ iOS, Android và web (React Native Web).

## Tài liệu

| Chủ đề | English | Tiếng Việt |
| --- | --- | --- |
| Hướng dẫn tích hợp | [docs/en/INTEGRATION.md](https://github.com/anhtuank7c/expo-morph-menu/blob/main/docs/en/INTEGRATION.md) | [docs/vi/INTEGRATION.md](https://github.com/anhtuank7c/expo-morph-menu/blob/main/docs/vi/INTEGRATION.md) |
| Giao diện tùy chỉnh (slot) | [docs/en/CUSTOM-UI.md](https://github.com/anhtuank7c/expo-morph-menu/blob/main/docs/en/CUSTOM-UI.md) | [docs/vi/CUSTOM-UI.md](https://github.com/anhtuank7c/expo-morph-menu/blob/main/docs/vi/CUSTOM-UI.md) |
| Kiến trúc | [docs/en/ARCHITECTURE.md](https://github.com/anhtuank7c/expo-morph-menu/blob/main/docs/en/ARCHITECTURE.md) | [docs/vi/ARCHITECTURE.md](https://github.com/anhtuank7c/expo-morph-menu/blob/main/docs/vi/ARCHITECTURE.md) |
| Hiệu năng | [docs/en/PERFORMANCE.md](https://github.com/anhtuank7c/expo-morph-menu/blob/main/docs/en/PERFORMANCE.md) | [docs/vi/PERFORMANCE.md](https://github.com/anhtuank7c/expo-morph-menu/blob/main/docs/vi/PERFORMANCE.md) |
| Mã nguồn sơ đồ | [docs/README.md](https://github.com/anhtuank7c/expo-morph-menu/blob/main/docs/README.md) | [docs/README.vi.md](https://github.com/anhtuank7c/expo-morph-menu/blob/main/docs/README.vi.md) |

## Cài đặt

```bash
npx expo install expo-morph-menu \
  expo-router react-native-reanimated react-native-worklets \
  react-native-gesture-handler react-native-safe-area-context react-native-screens
```

Các gói tùy chọn, được phát hiện khi chạy:

| Gói | Tác dụng |
| --- | --- |
| `expo-haptics` | Phản hồi rung khi con trỏ di chuyển giữa các dòng và khi một dòng được chọn |
| `expo-glass-effect` | Bề mặt card Liquid Glass trên iOS 26 trở lên |
| `expo-blur` | Bề mặt card làm mờ trên iOS |

Nếu bắt đầu từ template trống (`create-expo-app --template blank-typescript`), cần cài thêm:

| Gói | Lý do |
| --- | --- |
| `react-dom` | expo-router phụ thuộc vào gói này. Nếu thiếu, npm cài một bản `react-dom` mới hơn, xung đột với `react` của project (`ERESOLVE`) |
| `react-native-web` | Chạy trên web |
| `@expo/vector-icons`, `expo-font` | Chỉ cần nếu dùng icon như các ví dụ bên dưới (`Ionicons`). Ngoài Expo Go bắt buộc phải có `expo-font` |

```bash
npx expo install react-dom react-native-web @expo/vector-icons expo-font
```

Template `default` đã có sẵn tất cả các gói này. Với project chưa từng dùng expo-router, cần đặt thêm `"main": "expo-router/entry"` trong `package.json` và một `scheme` trong `app.json`.

## Tương thích

| | Hỗ trợ |
| --- | --- |
| Expo SDK | 58 trở lên |
| React Native | 0.80 trở lên (New Architecture) |
| Reanimated | 4 trở lên, kèm `react-native-worklets` |
| Nền tảng | iOS, Android, web |
| Expo Go | Có. Package không có native code riêng |

`babel.config.js` phải dùng `babel-preset-expo`, preset này bật Babel plugin cho worklets.

**Jest:** package cung cấp mã nguồn TypeScript cho Metro (export condition `react-native`). Thêm package vào `transformIgnorePatterns` cùng với các package React Native khác, ví dụ `node_modules/(?!(...|expo-morph-menu)/)`.

## Sử dụng

### 1. Root layout

Bọc ứng dụng trong `MorphProvider`, đăng ký nhóm route sheet và render `<MorphMenu />` sau root navigator.

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MorphMenu, MorphProvider, morphSheetScreenOptions, type MorphItem } from 'expo-morph-menu';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const items: MorphItem[] = [
  {
    key: 'camera',
    label: 'Camera',
    tint: '#3a3a3c',
    icon: <Ionicons name="camera" size={15} color="#fff" />,
    href: { pathname: '/(sheet)/[key]', params: { key: 'camera' } },
  },
  // ...
];

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <MorphProvider items={items} onHover={(item) => prefetch(item.key)}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(sheet)" options={morphSheetScreenOptions} />
          </Stack>
          <MorphMenu />
        </MorphProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
```

### 2. Nhóm route sheet

Mọi route trong nhóm này mở rộng từ card menu.

```tsx
// app/(sheet)/_layout.tsx
import { Stack } from 'expo-router';
import { MorphSheetLayout } from 'expo-morph-menu';

export default function SheetLayout() {
  return (
    <MorphSheetLayout>
      <Stack.Screen name="[key]" options={{ headerShown: false }} />
    </MorphSheetLayout>
  );
}
```

### 3. Màn hình

Đóng bằng `<MorphCloseButton />` hoặc bất kỳ lệnh gọi `router.back()` nào. Render nội dung nặng sau khi animation mở rộng đã kết thúc.

```tsx
// app/(sheet)/[key].tsx
import { MorphCloseButton, useMorphSettled } from 'expo-morph-menu';

export default function Screen() {
  const settled = useMorphSettled();
  return (
    <View style={{ flex: 1 }}>
      <MorphCloseButton />
      {settled ? <HeavyContent /> : <Placeholder />}
    </View>
  );
}
```

Mọi đường đóng đều chạy animation thu gọn: nút đóng, `router.back()`, nút back phần cứng trên Android, nút back của trình duyệt, Esc và các cử chỉ trên iOS.

## Cấu hình

Mọi tùy chọn đều không bắt buộc. Chỉ truyền những giá trị bạn muốn ghi đè.

```tsx
<MorphProvider
  items={items}
  config={{
    closeMenuOnDismiss: false,         // giữ menu mở sau khi đóng full screen
    anchor: 'bottom-right',            // hoặc 'bottom-left'
    layout: { fabSize: 56, cardWidth: 236, rowHeight: 46, padding: 10, margin: 20, iconSize: 15 },
    radius: Platform.select({ ios: { card: 28 }, android: { card: 16 } }),
    shadow: { elevation: 8 },          // Android: elevation. iOS và web: color, opacity, radius, offsetY
    dismiss: { edgeSwipe: true, dragDown: false },
    spring: { duration: 460, dampingRatio: 0.85 },
    haptics: true,
    surface: 'auto',                   // 'glass' | 'blur' | 'solid'
    colorScheme: 'auto',               // 'light' | 'dark'
    backdropOpacity: 0.25,
    colors: { dark: { surface: '#202022' } },
  }}
/>
```

| Tùy chọn | Mặc định (iOS / Android) | Mô tả |
| --- | --- | --- |
| `closeMenuOnDismiss` | `false` | `true` thu gọn card về nút sau khi full screen được đóng |
| `anchor` | `'bottom-right'` | Góc màn hình đặt nút |
| `layout.*` | `56 / 236 / 46 / 10 / 20 / 15 / 1` | Kích thước nút, chiều rộng card, chiều cao dòng, padding của danh sách, lề màn hình (cộng thêm vào inset safe area phía dưới), kích thước icon của dòng, chiều cao đường phân cách |
| `radius.card` / `radius.sheet` / `radius.fab` | `28` / `0` / `null` | Bán kính bo góc của card, của full screen và của nút (`null` render hình tròn) |
| `shadow` | opacity `0.18`, radius `18`, offsetY `8` / elevation `10` | Bóng đổ khi đứng yên. Bị tắt trong lúc khung đang chạy animation |
| `dismiss.edgeSwipe` | `true` / `false` | Vuốt từ mép trái. Chỉ hoạt động trên màn hình gốc của nhóm sheet, nên các màn hình lồng nhau giữ cử chỉ vuốt back native |
| `dismiss.dragDown` | `true` / `false` | Kéo xuống để đóng |
| `spring` | `460` ms, `0.85` | Thời lượng và hệ số damping của spring. Tôn trọng cài đặt Reduce Motion |
| `haptics` | `true` | Cần `expo-haptics` |
| `surface` | `'auto'` | Thứ tự chọn: Liquid Glass (iOS 26+), blur (iOS), solid |
| `colorScheme` | `'auto'` | Theo cài đặt hệ thống |
| `colors.light` / `colors.dark` | `LIGHT_COLORS` / `DARK_COLORS` | `surface`, `sheetBackground`, `text`, `scrim`, `backdrop`, `highlight`, `fabIcon`, `closeBackground`, `closeIcon`, `iconForeground` |

### Icon

Icon của dòng (`item.icon`), icon của nút (`fabIcon`) và icon của nút đóng (`closeIcon` hoặc `<MorphCloseButton icon>`) nhận một `MorphIcon`:

```tsx
icon: <Ionicons name="camera" size={15} color="#fff" />,   // React element (icon font, SVG)
icon: <CameraSvg width={15} height={15} />,                 // component SVG (react-native-svg)
icon: require('./camera.png'),                              // ảnh đóng gói cùng ứng dụng
icon: { uri: 'https://example.com/camera.png' },            // ảnh từ xa
icon: ({ size, color }) => <Ionicons name="camera" size={size} color={color} />,
```

Dạng hàm nhận kích thước và màu theme tương ứng với vị trí của nó:

| Vị trí | `size` | `color` |
| --- | --- | --- |
| Icon của dòng | `layout.iconSize` | `colors.iconForeground` |
| Nút | `26` | `colors.fabIcon` |
| Nút đóng | `size * 0.56` | `colors.closeIcon` |

Ảnh một màu được tô bằng màu đó. Với ảnh nhiều màu, đặt `iconTint: false` trên item hoặc `tintImage={false}` trên nút đóng.

```tsx
<MorphProvider
  items={items}
  fabIcon={({ size, color }) => <Ionicons name="add" size={size} color={color} />}
  closeIcon={require('./close.png')}   // icon mặc định cho mọi MorphCloseButton
/>

<MorphCloseButton />
<MorphCloseButton icon={<CloseSvg />} size={40} backgroundColor="transparent" />
```

Props của `MorphCloseButton`: `icon`, `size` (mặc định `32`), `iconSize`, `color`, `backgroundColor`, `tintImage`, `style` và mọi prop của `Pressable`. Nó gọi `router.back()` trừ khi `onPress` gọi `e.preventDefault()`.

### Slot

![Các slot do ứng dụng render và layout do package quản lý](https://raw.githubusercontent.com/anhtuank7c/expo-morph-menu/main/docs/diagrams/svg/vi/6-slots.svg?sanitize=true)

Package quản lý các container có animation (kích thước, vị trí, bán kính bo góc, cắt nội dung) cùng với cử chỉ và logic chuyển giao (hand-off). Mỗi phần hiển thị có thể được thay thế qua `components`:

```tsx
import { MorphProvider, type MorphComponents } from 'expo-morph-menu';

const components: MorphComponents = {
  Background: () => <Card elevation={0} style={StyleSheet.absoluteFill} />,
  Item: ({ item }) => <ListItem title={item.label} subtitle={item.data?.subtitle} />,
  Trigger: () => <Icon name="plus" />,
  Separator: () => <Divider />,
  Scrim: () => <BlurView intensity={20} style={StyleSheet.absoluteFill} />,
  Backdrop: () => <View style={{ flex: 1, backgroundColor: '#000' }} />,
  Highlight: null,                     // Item tự render trạng thái hover
};

<MorphProvider
  items={items}
  components={components}
  itemHeight={(item) => (item.data?.subtitle ? 58 : 46)}
/>
```

| Slot | Props | Mặc định |
| --- | --- | --- |
| `Background` | `variant` (`'menu'` hoặc `'sheet'`), `progress`, `colors` | Liquid Glass, blur hoặc màu đặc `colors.surface` |
| `Item` | `item`, `index`, `variant`, `hovered`, `height`, `colors` | `DefaultItem`: icon trong vòng tròn màu `tint` và một nhãn |
| `Trigger` | `progress`, `size`, `colors` | `fabIcon` hoặc "+", xoay 45 độ và mờ dần khi mở |
| `Highlight` | `hovered`, `colors`. Truyền `null` để tắt | Hình chữ nhật bo góc màu `colors.highlight` |
| `Separator` | `index`, `colors` | Không có |
| `Scrim` / `Backdrop` | `progress`, `colors`. Độ mờ (opacity) do package animate | `colors.scrim` / `colors.backdrop` |

Component slot phải tuân theo bốn quy tắc:

1. `Item` và `Background` là thuần (pure). Chúng được render hai lần, trong card và trong container toàn màn hình trong lúc chuyển cảnh, và hai bản phải cho ra cùng kết quả.
2. Slot không tự animate kích thước hay vị trí của mình. Dùng `progress` và `hovered` (shared value của Reanimated) để animate opacity, màu hoặc góc xoay.
3. Chiều cao dòng được biết trước: `layout.rowHeight` hoặc một hàm thuần `itemHeight(item, index)`. Các dòng không được đo.
4. `Background` phải đục (không trong suốt), vì card và container toàn màn hình hoán đổi trong một frame.

Chi tiết và ví dụ cho NativeWind, Tamagui, React Native Paper và Unistyles: [Giao diện tùy chỉnh](https://github.com/anhtuank7c/expo-morph-menu/blob/main/docs/vi/CUSTOM-UI.md).

### Callback

| Prop | Được gọi khi |
| --- | --- |
| `onHover(item)` | Con trỏ di chuyển vào một dòng. Dùng nó để prefetch dữ liệu |
| `onSelect(item)` | Một dòng được chọn, trước khi điều hướng |
| `onOpen()` / `onClose()` | Menu bắt đầu mở hoặc đóng |
| `onSheetDismissed(item)` | Full screen đã thu gọn xong |

## API

| Export | Mô tả |
| --- | --- |
| `MorphProvider` | Context provider. Props: `items`, `config`, `components`, `itemHeight`, `fabIcon`, `closeIcon`, các callback |
| `MorphMenu` | Overlay (lớp phủ) gồm nút nổi và card. Render sau root navigator. Props: `hidden`, `bottomOffset`, `fabAccessibilityLabel` |
| `MorphSheetLayout` | Layout cho nhóm route mở rộng từ card. Phần tử con là các `<Stack.Screen>`. `screenOptions` là tùy chọn |
| `morphSheetScreenOptions` | Tùy chọn cho `<Stack.Screen>` của nhóm trong root navigator |
| `MorphCloseButton` | Nút đóng cho các màn hình sheet |
| `renderIcon(icon, { size, color })` | Render bất kỳ `MorphIcon` nào. Hữu ích bên trong một `Item` tùy chỉnh |
| `DefaultItem` | Component dòng có sẵn |
| `useMorphProgress()` | Các shared value chỉ đọc `{ menu, sheet }`, từ 0 đến 1 |
| `useMorphSettled()` | `true` sau khi full screen đã mở rộng xong |
| `useMorphDismiss()` | Trả về `dismiss({ closeMenu? })`, dùng để đóng toàn bộ sheet từ bất kỳ màn hình nào bên trong |
| `useMorph()` | Truy cập mức thấp tới các shared value và cấu hình đã được xử lý |
| `MorphTrace` | Component gỡ lỗi. Ghi log từng frame với tiền tố `[morph]` và đánh dấu các lỗi hiển thị |
| `DEFAULT_CONFIG`, `LIGHT_COLORS`, `DARK_COLORS` | Giá trị mặc định |

Test ID cho kiểm thử end-to-end (E2E): `morph-fab`, `morph-scrim`, `morph-item-<key>`, `morph-close`.

## Web

Cùng một mã chạy trên Expo web thông qua React Native Web.

- URL phản ánh route bên trong full screen, ví dụ `/camera`.
- Hover chuột lên một dòng sẽ làm nổi bật dòng đó và gọi `onHover`.
- Esc đóng full screen khi màn hình gốc của nó đang hoạt động, sau đó đóng menu.
- Nút back của trình duyệt chạy animation thu gọn.
- Nhấn giữ và kéo từ nút tới một dòng hoạt động được với chuột. Việc chọn văn bản bị tắt trong lúc kéo.
- Tải lại hoặc đóng tab khi full screen đang mở không hiện hộp thoại "Leave site?".
- Không có haptics, Liquid Glass và nút back phần cứng. Blur dùng CSS `backdrop-filter` thông qua `expo-blur`.

## Cách hoạt động

Card menu là một overlay, không phải route. Khi một dòng được chọn, package lưu khung của card và push route của item. Layout của nhóm route render một `Stack` có kích thước cố định bên trong một container có animation. Container mở rộng từ khung đã lưu ra toàn màn hình, trong khi navigator bên trong giữ kích thước không đổi và không phải tính layout lại.

![Kiến trúc: MorphProvider kết nối overlay MorphMenu và nhóm route MorphSheetLayout](https://raw.githubusercontent.com/anhtuank7c/expo-morph-menu/main/docs/diagrams/svg/vi/1-architecture.svg?sanitize=true)

Mở: frame đầu tiên của container trùng với card và render cùng các dòng, nên overlay có thể được ẩn mà không có thay đổi nào nhìn thấy được. Sau đó container mở rộng.

![Trình tự mở](https://raw.githubusercontent.com/anhtuank7c/expo-morph-menu/main/docs/diagrams/svg/vi/2-opening.svg?sanitize=true)

Đóng: mọi đường đóng đều bị chặn bởi `usePreventRemove`. Container thu gọn, và tại frame mà khung của nó trùng với card, card được hiện ra và container bị ẩn.

![Trình tự đóng](https://raw.githubusercontent.com/anhtuank7c/expo-morph-menu/main/docs/diagrams/svg/vi/3-closing.svg?sanitize=true)

Máy trạng thái, các lớp của container và dòng thời gian animation được mô tả trong [Kiến trúc](https://github.com/anhtuank7c/expo-morph-menu/blob/main/docs/vi/ARCHITECTURE.md).

## Phát triển

```bash
npm install
npm run example        # ví dụ cơ bản (example/) trong Expo Go
npm run example:social # ví dụ mạng xã hội có tab (example-social/)
npm run typecheck      # package và cả hai ứng dụng ví dụ
npm run test:api       # lớp dữ liệu của các ví dụ: refresh token, thử lại, idempotency
npm run lint           # ESLint cho package và cả hai ví dụ
npm run format         # Prettier (code và file cấu hình; không format Markdown)
npm run check          # typecheck, lint và kiểm tra format cùng lúc
npm run build          # biên dịch ra lib/
```

`npm install` cũng cài một pre-commit hook (husky). Mỗi lần commit, hook chạy ESLint với `--fix` và Prettier trên các file đã stage (lint-staged), rồi chạy `npm run typecheck`. Commit có lỗi lint, cảnh báo lint hoặc lỗi kiểu sẽ bị từ chối. `git commit --no-verify` bỏ qua hook.

Cấu hình ESLint (`eslint.config.js`) kế thừa `eslint-config-expo` và thêm các rule có dùng thông tin kiểu, nhắm vào những lỗi chỉ lộ ra lúc chạy:

| Rule | Bắt lỗi gì |
| --- | --- |
| `@typescript-eslint/no-floating-promises` | Promise không được await cũng không được catch, nên lỗi reject bị mất. Lời gọi cố ý không chờ thì đánh dấu bằng `void` |
| `@typescript-eslint/no-misused-promises` | Hàm async được truyền vào chỗ callback không được trả về gì, ví dụ `useEffect` |
| `@typescript-eslint/switch-exhaustiveness-check` | `switch` trên một union bỏ sót case được thêm về sau |
| `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps` | Hook gọi có điều kiện, effect và callback đọc phải giá trị cũ |
| `react-hooks/refs`, `react-hooks/purity` | Ref bị đọc hoặc ghi trong lúc render, lời gọi không thuần như `Date.now()` trong lúc render |
| `import/no-cycle` | Import vòng, có thể khiến một module là `undefined` lúc được đọc lần đầu |

`react-hooks/immutability` bị tắt: rule này báo mọi lần ghi vào shared value của Reanimated (`sv.value = x`), trong khi đó chính là cách API của Reanimated hoạt động.

| Ví dụ | Nội dung |
| --- | --- |
| [example/](https://github.com/anhtuank7c/expo-morph-menu/blob/main/example/README.vi.md) | Menu trên một màn hình kèm các bước tích hợp, slot mặc định và tùy biến, prefetch khi hover, kiểm thử end-to-end bằng Maestro với trace theo frame. Không dùng thư viện quản lý state |
| [example-social/](https://github.com/anhtuank7c/expo-morph-menu/blob/main/example-social/README.vi.md) | Ứng dụng mạng xã hội có tab và đăng nhập: nút nằm trên tab bar, ẩn ở các màn hình được push, luồng nhiều bước và chat bên trong sheet, `useMorphDismiss`, Redux Toolkit với optimistic update |

Ví dụ mạng xã hội tải dữ liệu từ một REST API giả lập chạy trong ứng dụng (refresh JWT, thử lại theo backoff, giả lập lỗi): [example-social/docs/DATA-LAYER.vi.md](https://github.com/anhtuank7c/expo-morph-menu/blob/main/example-social/docs/DATA-LAYER.vi.md).

## Trạng thái nền tảng

| Nền tảng | Đã kiểm tra bằng |
| --- | --- |
| Android | Kiểm thử end-to-end bằng Maestro và trace theo frame trên emulator Android 17 (API 37). Một bản build trước đó cũng đã được kiểm thử trên MEmu (Android 9) |
| Web | Kiểm thử thủ công và bằng script trên Chrome desktop, với kích thước viewport desktop và điện thoại |
| iOS | Kiểm thử thủ công trên iOS 27 simulator, gồm bề mặt Liquid Glass và kéo xuống để đóng. Chưa kiểm thử trên thiết bị thật |

Hoan nghênh báo cáo từ thiết bị iOS thật.

## Đóng góp và báo lỗi

- Lỗi: mở issue bằng [form báo lỗi](https://github.com/anhtuank7c/expo-morph-menu/issues/new?template=bug_report.yml). Ghi rõ version của package, Expo SDK và Reanimated, nền tảng, và kèm video nếu lỗi về hiển thị.
- Ý tưởng tính năng và câu hỏi: [đề xuất tính năng](https://github.com/anhtuank7c/expo-morph-menu/issues/new?template=feature_request.yml) hoặc [Discussions](https://github.com/anhtuank7c/expo-morph-menu/discussions).
- Pull request: xem [CONTRIBUTING.md](https://github.com/anhtuank7c/expo-morph-menu/blob/main/CONTRIBUTING.md).
- Lỗi bảo mật: không mở issue công khai, xem [SECURITY.md](https://github.com/anhtuank7c/expo-morph-menu/blob/main/SECURITY.md).
- Ghi chú phát hành: [CHANGELOG.md](https://github.com/anhtuank7c/expo-morph-menu/blob/main/CHANGELOG.md).

## Giấy phép

MIT
