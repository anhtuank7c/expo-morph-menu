# Hướng dẫn tích hợp

> English: [`../en/INTEGRATION.md`](../en/INTEGRATION.md) · Kiến trúc: [`ARCHITECTURE.md`](ARCHITECTURE.md) · Tuỳ biến UI: [`CUSTOM-UI.md`](CUSTOM-UI.md)

Hướng dẫn này đưa một app expo-router có sẵn tới morph menu chạy được chỉ với ba file, rồi đi qua cấu hình, hành vi theo platform, kiểm thử và xử lý sự cố.

## Yêu cầu

| | Phiên bản |
| --- | --- |
| Expo SDK | 58+ |
| expo-router | 58+ |
| react-native-reanimated | 4+ (kèm `react-native-worklets`) |
| react-native-gesture-handler | 3+ |
| react-native-safe-area-context | 5+ |
| react-native-screens | 4+ |

Tuỳ chọn, tự được dùng khi đã cài: `expo-haptics` (rung nhẹ), `expo-glass-effect` (Liquid Glass trên iOS 26+), `expo-blur` (card blur trên iOS). Thiếu cũng không lỗi gì.

Đã kiểm trên Android (emulator, Android 9 và 17) và web (Chrome). iOS chưa được kiểm trên thiết bị.

## Cài đặt

```bash
npx expo install expo-morph-menu \
  expo-router react-native-reanimated react-native-worklets \
  react-native-gesture-handler react-native-safe-area-context react-native-screens

# tuỳ chọn
npx expo install expo-haptics expo-blur expo-glass-effect
```

`babel.config.js` phải dùng `babel-preset-expo` (mặc định trong project Expo). Preset này bật plugin worklets mà Reanimated cần. Package phát hành kèm mã nguồn TypeScript cho Metro (điều kiện export `react-native`), nên cấu hình Babel của bạn biên dịch luôn các worklet của nó.

![Kiến trúc](../diagrams/svg/vi/1-architecture.svg)

## Bước 1 — root layout

```tsx
// app/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { MorphMenu, MorphProvider, morphSheetScreenOptions, type MorphItem } from 'expo-morph-menu';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const items: MorphItem[] = [
  {
    key: 'camera',
    label: 'Camera',
    tint: '#3a3a3c',
    icon: ({ size, color }) => <Ionicons name="camera" size={size} color={color} />,
    href: { pathname: '/(sheet)/[key]', params: { key: 'camera' } },
  },
  {
    key: 'audio',
    label: 'Audio',
    tint: '#ff453a',
    icon: ({ size, color }) => <Ionicons name="mic" size={size} color={color} />,
    href: { pathname: '/(sheet)/[key]', params: { key: 'audio' } },
  },
];

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <MorphProvider items={items}>
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

Thứ tự quan trọng:

- `SafeAreaProvider` và `GestureHandlerRootView` nằm **ngoài** `MorphProvider`.
- `<MorphMenu />` đặt **sau** `Stack` gốc, bên trong `MorphProvider` — đây là overlay, phải vẽ đè lên các màn.
- Nhóm sheet nhận `morphSheetScreenOptions` (`transparentModal`, `animation: 'none'`, `gestureEnabled: false`, nền trong suốt). Package tự lái animation; thêm transition native lên trên sẽ giành nhau.

## Bước 2 — nhóm route sheet

Mọi route trong nhóm này nở ra từ card menu và thu về lại card.

```tsx
// app/(sheet)/_layout.tsx
import { Stack } from 'expo-router';
import { MorphSheetLayout } from 'expo-morph-menu';

export default function SheetLayout() {
  return (
    <MorphSheetLayout>
      <Stack.Screen name="[key]" options={{ headerShown: false }} />
      {/* các màn khác được push native bên trong sheet */}
      <Stack.Screen name="details" options={{ title: 'Chi tiết' }} />
    </MorphSheetLayout>
  );
}
```

Props của `MorphSheetLayout`:

| Prop | |
| --- | --- |
| `children` | các khai báo `<Stack.Screen>` của nhóm |
| `screenOptions` | gộp vào mặc định của Stack lồng (nền = `colors.sheetBackground`, nút back tối giản) |

Đặt tên nhóm thế nào cũng được; chỉ cần `href` của các item trỏ vào trong nhóm đó.

## Bước 3 — các màn

```tsx
// app/(sheet)/[key].tsx
import { useLocalSearchParams } from 'expo-router';
import { MorphCloseButton, useMorphSettled } from 'expo-morph-menu';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SheetScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const settled = useMorphSettled();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16 }}>
        <MorphCloseButton />
      </View>
      {settled ? <HeavyContent id={key} /> : <Skeleton />}
    </View>
  );
}
```

- **Đóng:** `MorphCloseButton` gọi `router.back()`. Mọi đường khác cũng được — `router.back()` từ nút của bạn, back cứng Android, back của trình duyệt, Esc trên web, và trên iOS là vuốt cạnh / kéo xuống. Tất cả đều chạy morph ngược.
- **`useMorphSettled()`** thành `true` khi vỏ đã nở xong. Mount một danh sách nặng giữa animation là nguồn giật phổ biến nhất.
- **Safe area:** vỏ phủ cả màn kể cả thanh hệ thống; chừa `insets.top` cho header và `insets.bottom` cho nội dung cuộn.

Props của `MorphCloseButton`: `icon`, `size` (32), `iconSize`, `color`, `backgroundColor`, `tintImage`, `style`, cùng mọi prop của `Pressable`. Gọi `e.preventDefault()` trong `onPress` để chặn `router.back()` mặc định.

## Item

```ts
type MorphItem = {
  key: string;                 // duy nhất; cũng là hậu tố của testID
  label: string;
  href: Href;                  // một route trong nhóm sheet
  icon?: MorphIcon;            // element, ảnh, hoặc ({ size, color }) => node
  iconTint?: boolean;          // tô màu ảnh PNG đơn sắc (mặc định true)
  tint?: string;               // vòng tròn sau icon; bỏ trống thì không vẽ
  accessibilityLabel?: string;
  data?: Record<string, unknown>; // dữ liệu tuỳ ý cho slot Item của bạn
};
```

Giữ `items` ổn định (hằng số module hoặc `useMemo`). Icon:

```tsx
icon: <Ionicons name="camera" size={15} color="#fff" />          // element
icon: require('./camera.png')                                     // ảnh trong bundle (được tô màu)
icon: { uri: 'https://example.com/camera.png' }                   // ảnh từ mạng
icon: ({ size, color }) => <CameraSvg width={size} color={color} />  // theo theme
```

## Cấu hình

Chỉ truyền những gì bạn đổi; còn lại dùng mặc định theo platform.

```tsx
<MorphProvider
  items={items}
  config={{
    closeMenuOnDismiss: false,
    anchor: 'bottom-right',
    layout: { fabSize: 56, cardWidth: 236, rowHeight: 46 },
    radius: Platform.select({ ios: { card: 28 }, android: { card: 20 } }),
    dismiss: { dragDown: false },
    colorScheme: 'auto',
  }}
/>
```

| Khoá | Mặc định (iOS / Android / web) | Ghi chú |
| --- | --- | --- |
| `closeMenuOnDismiss` | `false` | `false`: đóng full screen xong menu vẫn mở. `true`: thu về nút. |
| `anchor` | `'bottom-right'` | hoặc `'bottom-left'` |
| `layout.fabSize` | `56` | |
| `layout.cardWidth` | `236` | |
| `layout.rowHeight` | `46` | chiều cao dòng mặc định (xem `itemHeight`) |
| `layout.padding` | `10` | đệm trên/dưới của danh sách |
| `layout.margin` | `20` | khoảng cách tới mép màn hình (+ safe area dưới) |
| `layout.iconSize` | `15` | cỡ icon dòng; vòng tròn tint = `iconSize + 11` |
| `layout.separatorHeight` | `1` | chỉ dùng khi có slot `Separator` |
| `radius.card` / `radius.sheet` / `radius.fab` | `28` / `0` / tròn | `fab: null` = tròn |
| `shadow` | opacity 0.18, radius 18, offsetY 8 / elevation 10 | iOS & web dùng color/opacity/radius/offsetY; Android dùng elevation |
| `dismiss.edgeSwipe` | `true` / `false` / `false` | vuốt cạnh trái, chỉ ở màn gốc của sheet |
| `dismiss.dragDown` | `true` / `false` / `false` | |
| `spring` | `{ duration: 460, dampingRatio: 0.85 }` | tôn trọng Reduce Motion |
| `haptics` | `true` | cần `expo-haptics` |
| `surface` | `'auto'` | `'glass'`, `'blur'`, `'solid'` — auto: Liquid Glass (iOS 26+) → blur (iOS) → nền đặc |
| `colorScheme` | `'auto'` | `'light'`, `'dark'` |
| `backdropOpacity` | `0.25` | độ tối phía sau full screen |
| `colors.light` / `colors.dark` | `LIGHT_COLORS` / `DARK_COLORS` | `surface`, `sheetBackground`, `text`, `scrim`, `backdrop`, `highlight`, `fabIcon`, `closeBackground`, `closeIcon`, `iconForeground` |

Nếu các màn của bạn chỉ có giao diện sáng, đặt `colorScheme: 'light'` — nếu không, hệ điều hành/trình duyệt ở chế độ tối sẽ cho nút đóng icon màu sáng trên nền trắng của bạn.

Các prop khác của `MorphProvider`: `components` và `itemHeight` (xem [Tuỳ biến UI](CUSTOM-UI.md)), `fabIcon`, `closeIcon`.

## Callback

| Prop | Khi nào |
| --- | --- |
| `onHover(item)` | ngón tay rê lên một dòng (hoặc chuột hover trên web) |
| `onSelect(item)` | đã chọn một dòng, ngay trước `router.push` |
| `onOpen()` / `onClose()` | menu bắt đầu mở / đóng |
| `onSheetDismissed(item)` | full screen đã đóng xong |

Prefetch trong `onHover` — người dùng còn đang chọn, dữ liệu đã trên đường về:

```tsx
const queryClient = useQueryClient();
<MorphProvider
  items={items}
  onHover={(item) => queryClient.prefetchQuery({ queryKey: ['sheet', item.key], queryFn: () => fetchSheet(item.key) })}
/>
```

## Hành vi theo platform

| | iOS | Android | Web |
| --- | --- | --- | --- |
| Bề mặt card (auto) | Liquid Glass (26+) hoặc blur | nền đặc | nền đặc |
| Đóng full screen | nút đóng, vuốt cạnh, kéo xuống | nút đóng, back cứng | nút đóng, Esc, back trình duyệt |
| Đóng menu | scrim | scrim, back cứng | scrim, Esc |
| `onHover` | khi rê | khi rê | khi rê, hover chuột |
| Haptics | ✓ | ✓ | — |

Ghi chú web: tải lại hoặc đóng tab khi full screen đang mở không hỏi "Leave site?"; giữ-và-rê chạy được bằng chuột; không bôi đen chữ khi kéo.

## Deep link

Route của sheet là route bình thường, nên `myapp://camera` (hoặc `/camera` trên web) mở thẳng được. Không có card để nở từ đó, vỏ nở từ một rect ở giữa màn. Đóng thì quay về màn bên dưới.

## Kiểm thử

testID ổn định:

| ID | Phần tử |
| --- | --- |
| `morph-fab` | vùng bấm của nút |
| `morph-scrim` | scrim sau menu đang mở |
| `morph-item-<key>` | một dòng |
| `morph-close` | `MorphCloseButton` (mặc định) |

Ví dụ Maestro:

```yaml
- tapOn: { id: "morph-fab" }
- tapOn: { id: "morph-item-camera" }
- tapOn: { id: "morph-close" }
- assertVisible: { id: "morph-item-camera" }   # menu vẫn mở (closeMenuOnDismiss: false)
```

Để bắt lỗi hình ảnh (nháy, nhân đôi, khung trống), render `<MorphTrace enabled={__DEV__ && myFlag} />` bên trong `MorphProvider` và tìm `FLICKER`, `HOLE`, `GHOST`, `OVERLAP` trong các dòng log `[morph]`. App ví dụ trong repo có sẵn bộ chạy Maestro + logcat đầy đủ (`example/scripts/e2e.mjs`).

## Xử lý sự cố

| Triệu chứng | Nguyên nhân / cách sửa |
| --- | --- |
| Menu vẽ sau các màn / không hiện | `<MorphMenu />` phải đặt sau `Stack` gốc, bên trong `MorphProvider`. |
| "useMorph() must be used inside &lt;MorphProvider&gt;" | `MorphSheetLayout`, `MorphCloseButton` hoặc một hook nằm ngoài provider. |
| Full screen trượt vào bằng animation native | Nhóm route thiếu `options={morphSheetScreenOptions}`. |
| Hở một dải ở đáy full screen (Android) | Đừng bọc app trong container có kích thước riêng; package dùng `useSafeAreaFrame()`, cần `SafeAreaProvider` ở gốc. |
| Nội dung giật khi mở | Mount phần nặng sau `useMorphSettled()`. |
| Thấy bóng mờ của menu khi đóng | `Item`/`Background` tuỳ biến không thuần hoặc không đục — xem [Tuỳ biến UI › hợp đồng](CUSTOM-UI.md#hợp-đồng). |
| Nút đóng gần như vô hình ở chế độ tối | Các màn chỉ có giao diện sáng: đặt `colorScheme: 'light'`, hoặc làm theme cho màn. |
| "Hai bản React" / lỗi hook trong monorepo | Bảo đảm Metro chỉ resolve một bản `react`, `react-native-reanimated` và `expo-router`. |
| Lỗi worklet ("… is not a worklet") | `babel.config.js` phải dùng `babel-preset-expo`; xoá cache Metro (`expo start -c`). |
