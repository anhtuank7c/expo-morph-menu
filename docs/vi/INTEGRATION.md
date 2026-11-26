# Hướng dẫn tích hợp

[English](../en/INTEGRATION.md) | **Tiếng Việt**

Liên quan: [Kiến trúc](ARCHITECTURE.md), [UI tùy biến](CUSTOM-UI.md), [Hiệu năng](PERFORMANCE.md)

Hướng dẫn này thêm menu vào một app expo-router có sẵn với ba file, sau đó mô tả cấu hình, hành vi theo nền tảng, kiểm thử và xử lý sự cố.

## Yêu cầu

| Dependency | Phiên bản |
| --- | --- |
| Expo SDK | 58 trở lên |
| expo-router | 58 trở lên |
| react-native-reanimated | 4 trở lên, kèm `react-native-worklets` |
| react-native-gesture-handler | 3 trở lên |
| react-native-safe-area-context | 5 trở lên |
| react-native-screens | 4 trở lên |

Các peer dependency tùy chọn được phát hiện lúc chạy. Nếu một package chưa được cài, tính năng liên quan sẽ bị tắt:

| Package | Tính năng |
| --- | --- |
| `expo-haptics` | Phản hồi rung (haptic) |
| `expo-glass-effect` | Bề mặt card dạng Liquid Glass trên iOS 26 trở lên |
| `expo-blur` | Bề mặt card làm mờ (blur) trên iOS |

Tình trạng nền tảng: đã kiểm thử trên Android emulator (Android 9 và 17) và trên Chrome desktop. Chưa được xác minh trên thiết bị iOS.

## Cài đặt

```bash
npx expo install expo-morph-menu \
  expo-router react-native-reanimated react-native-worklets \
  react-native-gesture-handler react-native-safe-area-context react-native-screens

# optional
npx expo install expo-haptics expo-blur expo-glass-effect
```

`babel.config.js` phải dùng `babel-preset-expo`, đây là mặc định trong các dự án Expo. Preset này bật plugin worklets mà Reanimated yêu cầu. Package phát hành mã nguồn TypeScript dưới export condition `react-native`, nên Metro biên dịch các worklet của package bằng cấu hình Babel của bạn.

![Kiến trúc](../diagrams/svg/vi/1-architecture.svg)

## Bước 1: root layout

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

Thứ tự component:

- `SafeAreaProvider` và `GestureHandlerRootView` bao ngoài `MorphProvider`.
- `<MorphMenu />` được render bên trong `MorphProvider` và sau `Stack` gốc. Đây là một overlay (lớp phủ) và phải được vẽ phía trên các màn hình.
- Nhóm route sheet dùng `morphSheetScreenOptions`: `presentation: 'transparentModal'`, `animation: 'none'`, `headerShown: false`, `gestureEnabled: false` và nền trong suốt. Header bên trong sheet do Stack bên trong cung cấp. Package tự chạy animation của mình, và một transition native sẽ xung đột với animation đó.

## Bước 2: nhóm route sheet

Mọi route trong nhóm này mở rộng từ card menu và thu gọn trở lại vào card.

```tsx
// app/(sheet)/_layout.tsx
import { Stack } from 'expo-router';
import { MorphSheetLayout } from 'expo-morph-menu';

export default function SheetLayout() {
  return (
    <MorphSheetLayout>
      <Stack.Screen name="[key]" options={{ headerShown: false }} />
      {/* các màn hình được push bên trong full screen dùng native stack */}
      <Stack.Screen name="details" options={{ title: 'Details' }} />
    </MorphSheetLayout>
  );
}
```

Props của `MorphSheetLayout`:

| Prop | Mô tả |
| --- | --- |
| `children` | Các khai báo `<Stack.Screen>` của nhóm |
| `screenOptions` | Được gộp vào mặc định của Stack bên trong (nền `colors.sheetBackground`, nút back tối giản) |

Tên nhóm có thể đặt tùy ý. `href` của mỗi item phải trỏ tới một route bên trong nhóm.

## Bước 3: các màn hình

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

- Đóng: `MorphCloseButton` gọi `router.back()`. Các cách đóng khác hoạt động giống vậy và chạy animation thu gọn: một nút tự viết gọi `router.back()`, nút back phần cứng trên Android, nút back của trình duyệt, phím Esc trên web, và các cử chỉ vuốt từ mép trái và kéo xuống trên iOS.
- Render trì hoãn: `useMorphSettled()` trả về `true` sau khi container toàn màn hình đã mở rộng xong. Mount một cây component lớn trong lúc animation có thể gây frame bị rớt (dropped frame).
- Safe area: container phủ toàn bộ màn hình, kể cả các thanh hệ thống. Áp dụng `insets.top` cho header và `insets.bottom` cho nội dung cuộn được.

Props của `MorphCloseButton`: `icon`, `size` (mặc định `32`), `iconSize`, `color`, `backgroundColor`, `tintImage`, `style`, và mọi prop của `Pressable`. Gọi `e.preventDefault()` trong `onPress` để bỏ qua `router.back()` mặc định.

## Các item của menu

```ts
type MorphItem = {
  key: string;                     // duy nhất, cũng được dùng trong test ID
  label: string;
  href: Href;                      // một route bên trong nhóm sheet
  icon?: MorphIcon;                // React element, image source, hoặc ({ size, color }) => node
  iconTint?: boolean;              // tô màu ảnh đơn sắc (mặc định true)
  tint?: string;                   // màu nền của vòng tròn icon; bỏ trống để không có vòng tròn
  accessibilityLabel?: string;
  data?: Record<string, unknown>;  // dữ liệu tùy ý cho slot Item tùy biến
};
```

Giữ mảng `items` ổn định về tham chiếu, dưới dạng hằng số cấp module hoặc dùng `useMemo`.

```tsx
icon: <Ionicons name="camera" size={15} color="#fff" />             // React element
icon: require('./camera.png')                                        // ảnh đóng gói, được tô màu
icon: { uri: 'https://example.com/camera.png' }                      // ảnh từ xa
icon: ({ size, color }) => <CameraSvg width={size} color={color} />  // theo theme
```

## Cấu hình

Chỉ truyền các giá trị cần ghi đè. Các giá trị khác dùng mặc định của từng nền tảng.

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

| Khóa | Mặc định (iOS / Android / web) | Mô tả |
| --- | --- | --- |
| `closeMenuOnDismiss` | `false` | `false`: menu vẫn mở sau khi đóng màn hình full screen. `true`: menu thu gọn vào nút |
| `anchor` | `'bottom-right'` | Hoặc `'bottom-left'` |
| `layout.fabSize` | `56` | Kích thước nút |
| `layout.cardWidth` | `236` | Chiều rộng card |
| `layout.rowHeight` | `46` | Chiều cao dòng mặc định, xem `itemHeight` |
| `layout.padding` | `10` | Padding trên và dưới của danh sách |
| `layout.margin` | `20` | Khoảng cách tới các cạnh màn hình, cộng thêm vào inset safe area phía dưới |
| `layout.iconSize` | `15` | Kích thước icon của dòng. Vòng tròn tint có kích thước `iconSize + 11` |
| `layout.separatorHeight` | `1` | Chỉ dùng khi có slot `Separator` |
| `radius.card` / `radius.sheet` / `radius.fab` | `28` / `0` / `null` | `fab: null` render một hình tròn |
| `shadow` | opacity `0.18`, radius `18`, offsetY `8` / elevation `10` | iOS và web dùng color, opacity, radius và offsetY. Android dùng elevation |
| `dismiss.edgeSwipe` | `true` / `false` / `false` | Vuốt từ mép trái, chỉ trên màn hình gốc của nhóm |
| `dismiss.dragDown` | `true` / `false` / `false` | Kéo xuống để đóng |
| `spring` | `{ duration: 460, dampingRatio: 0.85 }` | Tôn trọng thiết lập Reduce Motion |
| `haptics` | `true` | Cần `expo-haptics` |
| `surface` | `'auto'` | `'glass'`, `'blur'` hoặc `'solid'`. `'auto'` chọn lần lượt Liquid Glass (iOS 26+), rồi blur (iOS), rồi solid |
| `colorScheme` | `'auto'` | `'light'` hoặc `'dark'` |
| `backdropOpacity` | `0.25` | Độ mờ đục của backdrop phía sau full screen |
| `colors.light` / `colors.dark` | `LIGHT_COLORS` / `DARK_COLORS` | `surface`, `sheetBackground`, `text`, `scrim`, `backdrop`, `highlight`, `fabIcon`, `closeBackground`, `closeIcon`, `iconForeground` |

Nếu các màn hình của bạn chỉ hỗ trợ theme sáng, hãy đặt `colorScheme: 'light'`. Nếu không, khi hệ thống dùng theme tối, nút đóng sẽ dùng icon sáng trên màn hình sáng.

Các prop khác của `MorphProvider`: `components` và `itemHeight` (xem [UI tùy biến](CUSTOM-UI.md)), `fabIcon`, `closeIcon`.

## Callback

| Prop | Được gọi khi |
| --- | --- |
| `onHover(item)` | Con trỏ di chuyển lên một dòng: kéo ngón tay trên thiết bị cảm ứng, hover chuột trên web |
| `onSelect(item)` | Một dòng được chọn, trước `router.push` |
| `onOpen()` / `onClose()` | Menu bắt đầu mở hoặc đóng |
| `onSheetDismissed(item)` | Full screen đã thu gọn xong |

`onHover` chạy trước khi người dùng nhả con trỏ, nên có thể dùng để bắt đầu tải dữ liệu của màn hình đích:

```tsx
const queryClient = useQueryClient();

<MorphProvider
  items={items}
  onHover={(item) =>
    queryClient.prefetchQuery({ queryKey: ['sheet', item.key], queryFn: () => fetchSheet(item.key) })
  }
/>
```

## Hành vi theo nền tảng

| Hành vi | iOS | Android | Web |
| --- | --- | --- | --- |
| Bề mặt card (`'auto'`) | Liquid Glass (iOS 26+) hoặc blur | Solid | Solid |
| Đóng full screen | Nút đóng, vuốt từ mép trái, kéo xuống | Nút đóng, nút back phần cứng | Nút đóng, Esc, nút back của trình duyệt |
| Đóng menu | Chạm vào scrim | Chạm vào scrim, nút back phần cứng | Nhấp chuột vào scrim, Esc |
| `onHover` | Kéo | Kéo | Kéo, hover chuột |
| Haptics | Có | Có | Không |

Web: tải lại hoặc đóng tab khi full screen đang mở không hiển thị hộp thoại "Leave site?". Nhấn giữ và kéo hoạt động với chuột, và việc chọn văn bản bị tắt trong lúc kéo.

## Tab và các màn hình được push

Khi root navigator chứa một tab navigator, hãy đặt nút phía trên tab bar và ẩn nút ở những màn hình không dùng đến. Props của `MorphMenu`:

| Prop | Mặc định | Mô tả |
| --- | --- | --- |
| `bottomOffset` | `0` | Khoảng cách thêm tính từ mép dưới, cộng với inset dưới của safe area và `layout.margin`. Truyền chiều cao của tab bar, không gồm inset |
| `hidden` | `false` | Ẩn nút (thu nhỏ và mờ dần, không nhận chạm). Nếu menu đang mở thì menu được đóng trước. Bị bỏ qua khi một route sheet đang hiển thị, vì card là nơi sheet thu gọn về |
| `fabAccessibilityLabel` | `'Open menu'` | Nhãn của nút cho trình đọc màn hình |

```tsx
const TAB_PATHS = new Set(['/', '/search', '/notifications', '/messages']);

function FloatingMenu() {
  const pathname = usePathname();
  const visible = TAB_PATHS.has(pathname) || pathname.startsWith('/compose');
  return <MorphMenu hidden={!visible} bottomOffset={TAB_BAR_HEIGHT} />;
}
```

Đặt chiều cao cố định cho phần nội dung của tab bar (ví dụ `tabBarStyle: { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }`) để truyền cùng giá trị đó cho `bottomOffset`. Một ứng dụng hoàn chỉnh có tab nằm trong [`example-social/`](../../example-social/README.vi.md).

## Đóng bằng code

`router.back()` ở một màn hình lồng bên trong sheet chỉ pop màn hình đó. `useMorphDismiss()` đóng toàn bộ sheet từ bất kỳ màn hình nào trong nhóm, đi qua cùng luồng với các cách đóng khác:

```tsx
import { useMorphDismiss } from 'expo-morph-menu';

const dismiss = useMorphDismiss();

dismiss();                      // thu gọn về card; menu theo closeMenuOnDismiss
dismiss({ closeMenu: true });   // thu gọn về card, rồi về nút
dismiss({ closeMenu: false });  // thu gọn về card và giữ menu mở
```

Cách dùng thường gặp: giữ `closeMenuOnDismiss: false` để thao tác hủy quay về menu đang mở, và gọi `dismiss({ closeMenu: true })` sau khi gửi thành công.

## Deep link

Các route sheet là route thông thường, nên `myapp://camera` (hoặc `/camera` trên web) mở chúng trực tiếp. Khi không có card để mở rộng từ đó, container mở rộng từ một hình chữ nhật ở giữa màn hình.

Deep link có thể làm sheet trở thành route đầu tiên của root navigator, không có màn hình nào bên dưới để quay về. Hãy export `unstable_settings` từ root layout để expo-router đặt route trang chủ bên dưới:

```tsx
// app/_layout.tsx
export const unstable_settings = { anchor: 'index' }; // hoặc '(tabs)'
```

Nếu không có thiết lập này, thao tác đóng sheet không có tác dụng, và một cảnh báo được ghi ra log ở bản development.

## Kiểm thử

Test ID:

| ID | Phần tử |
| --- | --- |
| `morph-fab` | Vùng chạm của nút |
| `morph-scrim` | Scrim phía sau menu đang mở |
| `morph-item-<key>` | Dòng của menu |
| `morph-close` | `MorphCloseButton` (test ID mặc định) |

Ví dụ Maestro:

```yaml
- tapOn: { id: "morph-fab" }
- tapOn: { id: "morph-item-camera" }
- tapOn: { id: "morph-close" }
- assertVisible: { id: "morph-item-camera" }   # the menu stays open (closeMenuOnDismiss: false)
```

Ảnh chụp màn hình không bắt được một cách đáng tin cậy các lỗi chỉ xuất hiện trong một frame. Để phát hiện chúng, render `<MorphTrace enabled={__DEV__ && myFlag} />` bên trong `MorphProvider` và tìm các cờ `FLICKER`, `HOLE`, `GHOST` và `OVERLAP` trong các dòng log `[morph]`. App ví dụ có một trình chạy Maestro và logcat (`example/scripts/e2e.mjs`) báo lỗi khi gặp các cờ này.

## Xử lý sự cố

| Triệu chứng | Nguyên nhân và cách khắc phục |
| --- | --- |
| Menu bị che phía sau các màn hình | `<MorphMenu />` phải nằm trong `MorphProvider` và sau `Stack` gốc |
| Lỗi "useMorph() must be used inside &lt;MorphProvider&gt;" | `MorphSheetLayout`, `MorphCloseButton` hoặc một hook được render bên ngoài provider |
| Full screen xuất hiện với transition native | `<Stack.Screen>` của nhóm thiếu `options={morphSheetScreenOptions}` |
| Khoảng trống ở đáy full screen (Android) | Không bọc app trong một container có kích thước cố định. Package dùng `useSafeAreaFrame()`, hook này cần `SafeAreaProvider` ở gốc |
| Nội dung bị nhảy hoặc rớt frame khi mở | Mount nội dung nặng sau khi `useMorphSettled()` trả về `true` |
| Một bản sao trong suốt một phần của menu xuất hiện khi đóng | Một `Item` hoặc `Background` tùy biến không thuần (pure) hoặc không đục (không trong suốt). Xem [UI tùy biến: hợp đồng của slot](CUSTOM-UI.md#hợp-đồng-của-slot) |
| Không thấy icon của nút đóng ở chế độ tối | Các màn hình chỉ hỗ trợ theme sáng. Đặt `colorScheme: 'light'` hoặc thêm theme tối cho các màn hình |
| Lỗi "Invalid hook call" hoặc React bị trùng lặp trong monorepo | Cấu hình Metro để resolve một bản duy nhất của `react`, `react-native-reanimated` và `expo-router` |
| Đóng sheet mở bằng deep link không có tác dụng | Sheet là route duy nhất trên root navigator. Export `unstable_settings = { anchor: ... }` từ root layout. Xem [Deep link](#deep-link) |
| Nút che tab bar | Truyền chiều cao tab bar cho `<MorphMenu bottomOffset={...} />`. Xem [Tab và các màn hình được push](#tab-và-các-màn-hình-được-push) |
| Lỗi worklet như "... is not a worklet" | `babel.config.js` phải dùng `babel-preset-expo`. Xóa cache Metro bằng `npx expo start -c` |
