# UI tùy biến: slot

[English](../en/CUSTOM-UI.md) | **Tiếng Việt**

Liên quan: [Hướng dẫn tích hợp](INTEGRATION.md), [Kiến trúc](ARCHITECTURE.md). Sơ đồ: trang 6 của [`expo-morph-menu.vi.drawio`](../diagrams/expo-morph-menu.vi.drawio).

`expo-morph-menu` không đi kèm một thiết kế giao diện cố định. Trách nhiệm được chia như sau:

- Package quản lý các container có animation (kích thước, vị trí, bo góc, clipping, đổ bóng), hình học, cử chỉ và chuyển giao (hand-off) giữa menu và màn hình full screen.
- App của bạn quản lý nội dung được render, thông qua các slot. Một slot là một React component nhận props và các shared value của Reanimated.

Slot có thể dùng component từ bất kỳ design system nào, ví dụ Tamagui, NativeWind, React Native Paper, Unistyles hoặc gluestack, hoặc các view React Native thông thường.

## Slot

![Slot và hợp đồng của slot](../diagrams/svg/vi/6-slots.svg)

```tsx
<MorphProvider
  items={items}
  components={{ Background, Item, Trigger, Highlight, Separator, Scrim, Backdrop }}
  itemHeight={...}
/>
```

| Slot | Props | Nơi được render | Mặc định |
| --- | --- | --- | --- |
| `Background` | `variant` (`'menu'` hoặc `'sheet'`), `progress`, `colors` | Lấp đầy card menu. Cũng được render trong container toàn màn hình trong lúc chuyển cảnh | Liquid Glass, blur hoặc `colors.surface` dạng solid |
| `Item` | `item`, `index`, `variant`, `hovered`, `height`, `colors` | Mỗi dòng, trong card và trong container | `DefaultItem`: icon trong vòng tròn `tint` và một label |
| `Trigger` | `progress`, `size`, `colors` | Mặt nút, ở góc card | `fabIcon` hoặc "+", xoay 45 độ và mờ dần |
| `Highlight` | `hovered`, `colors`, hoặc `null` | Phía sau dòng đang được hover. Vị trí và kích thước do package đặt | Hình chữ nhật bo góc màu `colors.highlight` |
| `Separator` | `index`, `colors` | Giữa các dòng, cao `layout.separatorHeight` | Không có |
| `Scrim` | `progress`, `colors` | Phía sau menu đang mở. Chạm vào sẽ đóng menu | `colors.scrim` |
| `Backdrop` | `progress`, `colors` | Phía sau full screen | `colors.backdrop` với `backdropOpacity` |

- `progress` và `hovered` là các đối tượng `SharedValue` của Reanimated. Đọc chúng bên trong `useAnimatedStyle`.
- `variant` cho biết `Item` hoặc `Background` đang được render trong card tương tác (`'menu'`) hay trong bản sao tĩnh bên trong container (`'sheet'`). Phần lớn các triển khai bỏ qua giá trị này. Có thể dùng nó cho analytics hoặc viền debug.
- Package tự animate opacity của `Scrim` và `Backdrop`. Render chúng không kèm animation.
- Chiều cao dòng lấy từ `layout.rowHeight` cho mọi dòng, hoặc từ `itemHeight={(item, index) => number}`.

## Hợp đồng của slot

Các quy tắc sau giữ cho card và container giống hệt nhau về mặt hiển thị tại thời điểm chúng hoán đổi. Mỗi quy tắc ứng với một lỗi đã được tái hiện và sửa trong quá trình phát triển.

1. `Item` và `Background` là thuần (pure). Chúng được render hai lần, trong card và trong container toàn màn hình trong lúc chuyển cảnh. Tại thời điểm chuyển giao, hai bản sao hoán đổi trong một frame, nên chúng phải render ra cùng các pixel với cùng props. Không dùng state nội bộ, animation khi mount hoặc khi xuất hiện, hay phản hồi khi nhấn bên trong chúng. Package đã bọc mỗi dòng trong một `Pressable`.
2. Slot không tự animate kích thước hay vị trí của mình. Package animate container, và một animation bên trong sẽ xung đột với nó. Thay vào đó, hãy animate opacity, màu, góc xoay hoặc tỉ lệ icon từ `progress` và `hovered`.
3. Chiều cao dòng được biết trước. Chúng không bao giờ được đo: dùng `rowHeight` hoặc một `itemHeight` thuần. Chiều cao dòng được dùng cho hit testing khi kéo để chọn và cho vị trí của highlight.
4. `Background` là đục (không trong suốt). Một nền trong suốt một phần sẽ để lộ frame mà card và container hoán đổi. Để có giao diện trong suốt một phần, dùng `surface: 'blur'` hoặc `surface: 'glass'` mà không dùng slot `Background`.

Kiểm tra: render `<MorphTrace enabled />` và xem log có `GHOST`, `FLICKER` và `OVERLAP` hay không trong lúc mở và đóng. Trên web, `example/public/phone.html` render app trong một khung có kích thước điện thoại.

## Ví dụ: card tối có phụ đề

Ví dụ này là biến thể "Custom (slots)" của app ví dụ (`example/components/CustomSlots.tsx`). Nó đã được kiểm thử trên Android và web.

```tsx
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
  renderIcon,
  type MorphComponents,
  type MorphConfigInput,
  type MorphItem,
  type MorphItemProps,
  type MorphTriggerProps,
} from 'expo-morph-menu';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';

// 1. Nền đục: màu card, viền, gradient hoặc ảnh.
function Background() {
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1f2a44' }]} />;
}

// 2. Dòng có phụ đề và trạng thái hover riêng.
function Item({ item, index, hovered, colors }: MorphItemProps) {
  const subtitle = item.data?.subtitle as string | undefined;
  const hover = useAnimatedStyle(() => ({
    backgroundColor: hovered.value === index ? 'rgba(255,255,255,0.12)' : 'transparent',
  }));
  return (
    <Animated.View style={[styles.item, hover]}>
      <View style={[styles.badge, { backgroundColor: item.tint ?? '#334' }]}>
        {renderIcon(item.icon, { size: 16, color: colors.iconForeground })}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </Animated.View>
  );
}

// 3. Mặt nút: animate góc xoay và opacity từ progress, không animate kích thước.
function Trigger({ progress }: MorphTriggerProps) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35], [1, 0], Extrapolation.CLAMP),
    transform: [{ rotate: `${interpolate(progress.value, [0, 0.35], [0, 90], Extrapolation.CLAMP)}deg` }],
  }));
  return (
    <Animated.View style={style}>
      <Ionicons name="apps" size={22} color="#fff" />
    </Animated.View>
  );
}

export const components: MorphComponents = {
  Background,
  Item,
  Trigger,
  Separator: () => <View style={{ flex: 1, marginHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.15)' }} />,
  Scrim: () => <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />,
  Highlight: null, // Item tự render trạng thái hover
};

export const config: MorphConfigInput = {
  radius: { card: 18, fab: 18 },  // nút hình vuông bo góc
  layout: { cardWidth: 260, separatorHeight: StyleSheet.hairlineWidth },
  colors: { light: { iconForeground: '#fff' }, dark: { iconForeground: '#fff' } },
};

export const itemHeight = (item: MorphItem) => (item.data?.subtitle ? 58 : 46);
```

```tsx
<MorphProvider items={items} components={components} config={config} itemHeight={itemHeight}>
```

Ghi chú:

- Mỗi `Item` được đặt trong một container dòng có chiều cao bằng chiều cao của dòng. Dùng `flex: 1` để lấp đầy nó.
- `Separator` lấp đầy một container có kích thước theo `separatorHeight`. Dùng `flex: 1`.
- Khi dùng slot `Highlight`, package đặt vị trí và kích thước của nó theo dòng đang được hover. Dùng `flex: 1`.
- Định nghĩa các component slot ở cấp module, hoặc memo hóa chúng. Một định danh component mới ở mỗi lần render sẽ mount lại mọi dòng.
- `item.data` chứa mọi dữ liệu bổ sung mà `Item` cần, như phụ đề, số đếm của badge hoặc cờ vô hiệu hóa.

## Màu trong container toàn màn hình

Trong lúc container mở rộng, nó hiển thị `Background` của bạn mờ dần trên nền `colors.sheetBackground`, sau đó các màn hình của bạn hiện dần lên. Giữ các màu này nhất quán:

- `colors.sheetBackground` nên khớp với nền của các màn hình. Nó cũng được dùng làm nền `contentStyle` của Stack bên trong.
- Với một `Background` tối và nền sheet sáng, container chuyển pha giữa hai màu trong vài frame. Đây là hành vi dự kiến. Một màu `Background` gần với `sheetBackground` cho chuyển cảnh mượt hơn.
- Với chế độ tối, truyền cả hai bảng màu (`colors.light` và `colors.dark`) và đọc `colors` từ props của slot thay vì viết cứng giá trị.

## Icon và nút đóng

Mọi prop icon đều nhận một `MorphIcon`: một React element, một image source, hoặc một hàm.

```tsx
fabIcon={({ size, color }) => <Icon name="plus" size={size} color={color} />}
closeIcon={require('./close.png')}                // mặc định cho mọi MorphCloseButton
items={[{ ..., icon: <CameraSvg width={15} height={15} /> }]}
```

Dạng hàm nhận kích thước và màu theme cho vị trí của nó. Ảnh đơn sắc được tô màu. Với ảnh nhiều màu, đặt `iconTint: false` trên item hoặc `tintImage={false}` trên nút đóng. Bên trong một `Item` tùy biến, render icon bằng `renderIcon(item.icon, { size, color })`.

`<MorphCloseButton icon={...} size={40} backgroundColor="transparent" />` tùy biến nút có sẵn. Một nút tự viết gọi `router.back()` sẽ chạy cùng animation thu gọn.

## Ví dụ với các bộ UI

Cách làm giống nhau với mọi bộ UI: component tĩnh, thuần bên trong slot, với animation được điều khiển bởi shared value. Hãy đối chiếu tên prop với phiên bản bộ UI bạn dùng.

### NativeWind

```tsx
const components: MorphComponents = {
  Background: () => <View className="absolute inset-0 bg-zinc-900" />,
  Item: ({ item }) => (
    <View className="flex-1 flex-row items-center px-4 gap-3">
      <Text className="text-white font-semibold">{item.label}</Text>
    </View>
  ),
};
```

Suy ra style hover và pressed từ `hovered` bằng `useAnimatedStyle`. Không dùng các class `active:` hoặc `hover:`: chúng phản hồi các lần chạm trên chính dòng đó, vốn được xử lý bởi `Pressable` của package, và chúng không được áp dụng cho bản sao bên trong container.

### Tamagui

```tsx
const components: MorphComponents = {
  Background: () => <YStack position="absolute" fullscreen backgroundColor="$background" />,
  Item: ({ item }) => (
    <XStack flex={1} alignItems="center" paddingHorizontal="$4" gap="$3">
      <Text fontWeight="600">{item.label}</Text>
    </XStack>
  ),
};
```

Không dùng các prop `animation` hoặc `enterStyle` của Tamagui, hay các component có thể nhấn như `Button` và `ListItem`, bên trong slot. Chúng animate khi mount, nên hai bản sao sẽ khác nhau.

### React Native Paper

```tsx
const components: MorphComponents = {
  Background: () => <Surface elevation={0} style={StyleSheet.absoluteFill} />,
  Item: ({ item }) => <List.Item title={item.label} style={{ flex: 1, justifyContent: 'center' }} />, // không có onPress
};
```

Giữ elevation của Paper ở `0` bên trong card, vì package tự render đổ bóng của card (`config.shadow`). Một `List.Item` không có `onPress` thì không có hiệu ứng ripple, nên vẫn thuần.

### Unistyles và các theme dựa trên StyleSheet

Gọi hook style bên trong slot, ví dụ `const { styles } = useStyles(sheet)`. Một lần đổi theme render lại cả hai bản sao theo cùng một cách, nên quy tắc thuần vẫn được giữ.

## Sử dụng nâng cao

- `useMorphProgress()` trả về `{ menu, sheet }` cho các animation bên ngoài menu, như làm tối tab bar, làm mờ header hoặc thu phóng trang phía sau.
- Bọc dòng mặc định: `Item: (p) => <View style={{ opacity: p.item.data?.disabled ? 0.4 : 1, flex: 1 }}><DefaultItem {...p} /></View>`.
- Slot theo từng nền tảng: xây dựng `components` bằng `Platform.select`.
- Tắt một phần: đặt `Highlight: null`, bỏ `Separator`, hoặc đặt `surface: 'solid'` để không dùng Liquid Glass và blur.

## Danh sách kiểm tra

- [ ] Các component slot được định nghĩa ở cấp module hoặc được memo hóa.
- [ ] `Item` và `Background` không có state nội bộ, animation khi mount hay hiệu ứng khi nhấn.
- [ ] Style hover và pressed đọc `hovered`. Animation của nút đọc `progress`.
- [ ] Chiều cao dòng lấy từ `rowHeight` hoặc một `itemHeight` thuần.
- [ ] `Background` là đục, và `colors.sheetBackground` khớp với các màn hình.
- [ ] Cung cấp cả bảng màu sáng và tối nếu app hỗ trợ cả hai theme.
- [ ] Đã kiểm tra việc mở và đóng với `<MorphTrace enabled />`, không có cờ `GHOST`, `FLICKER`, `OVERLAP` hay `HOLE`.
