# Custom UI: slots

**English** | [Tiếng Việt](../vi/CUSTOM-UI.md)

Related: [Integration guide](INTEGRATION.md), [Architecture](ARCHITECTURE.md). Diagram: page 6 of [`expo-morph-menu.en.drawio`](../diagrams/expo-morph-menu.en.drawio).

`expo-morph-menu` does not ship a fixed visual design. Responsibilities are split as follows:

- The package owns the animated containers (size, position, corner radius, clipping, shadow), the geometry, the gestures and the hand-off between the menu and the full screen.
- Your app owns the rendered content, through slots. A slot is a React component that receives props and Reanimated shared values.

Slots can use components from any design system, for example Tamagui, NativeWind, React Native Paper, Unistyles or gluestack, or plain React Native views.

## Slots

![Slots and the slot contract](../diagrams/svg/en/6-slots.svg)

```tsx
<MorphProvider
  items={items}
  components={{ Background, Item, Trigger, Highlight, Separator, Scrim, Backdrop }}
  itemHeight={...}
/>
```

| Slot | Props | Where it is rendered | Default |
| --- | --- | --- | --- |
| `Background` | `variant` (`'menu'` or `'sheet'`), `progress`, `colors` | Fills the card. Also rendered in the full-screen container during the transition | Liquid Glass, blur or solid `colors.surface` |
| `Item` | `item`, `index`, `variant`, `hovered`, `height`, `colors` | Each row, in the card and in the container | `DefaultItem`: icon in a `tint` circle and a label |
| `Trigger` | `progress`, `size`, `colors` | Button face, in the card corner | `fabIcon` or "+", rotates 45 degrees and fades out |
| `Highlight` | `hovered`, `colors`, or `null` | Behind the hovered row. Position and size are set by the package | Rounded rectangle in `colors.highlight` |
| `Separator` | `index`, `colors` | Between rows, `layout.separatorHeight` high | None |
| `Scrim` | `progress`, `colors` | Behind the open menu. Tapping it closes the menu | `colors.scrim` |
| `Backdrop` | `progress`, `colors` | Behind the full screen | `colors.backdrop` with `backdropOpacity` |

- `progress` and `hovered` are Reanimated `SharedValue` objects. Read them inside `useAnimatedStyle`.
- `variant` indicates whether `Item` or `Background` is rendered in the interactive card (`'menu'`) or in the static copy inside the container (`'sheet'`). Most implementations ignore it. It can be used for analytics or debug borders.
- The package animates the opacity of `Scrim` and `Backdrop`. Render them without animation.
- Row heights come from `layout.rowHeight` for all rows, or from `itemHeight={(item, index) => number}`.

## The slot contract

The following rules keep the card and the container visually identical at the moment they swap. Each rule corresponds to a defect that was reproduced and fixed during development.

1. `Item` and `Background` are pure. They are rendered twice, in the card and in the full-screen container during the transition. At the hand-off, the two copies swap in a single frame, so they must render the same pixels for the same props. Do not use internal state, mount or enter animations, or press feedback inside them. The package already wraps each row in a `Pressable`.
2. Slots do not animate their own size or position. The package animates the container, and an animation inside it would conflict. Animate opacity, color, rotation or icon scale from `progress` and `hovered` instead.
3. Row heights are known in advance. They are never measured: use `rowHeight` or a pure `itemHeight`. Row heights are used for drag-to-select hit testing and for the highlight position.
4. `Background` is opaque. A translucent background would show the frame in which the card and the container swap. For a translucent look, use `surface: 'blur'` or `surface: 'glass'` without a `Background` slot.

Verification: render `<MorphTrace enabled />` and check the logs for `GHOST`, `FLICKER` and `OVERLAP` while opening and closing. On web, `example/public/phone.html` renders the app in a phone-sized frame.

## Example: dark card with subtitles

This example is the "Custom (slots)" variant of the example app (`example/components/CustomSlots.tsx`). It was tested on Android and web.

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

// 1. Opaque background: card color, border, gradient or image.
function Background() {
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1f2a44' }]} />;
}

// 2. Row with a subtitle and its own hover state.
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

// 3. Button face: animate rotation and opacity from progress, not size.
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
  Highlight: null, // Item renders its own hover state
};

export const config: MorphConfigInput = {
  radius: { card: 18, fab: 18 },  // rounded square button
  layout: { cardWidth: 260, separatorHeight: StyleSheet.hairlineWidth },
  colors: { light: { iconForeground: '#fff' }, dark: { iconForeground: '#fff' } },
};

export const itemHeight = (item: MorphItem) => (item.data?.subtitle ? 58 : 46);
```

```tsx
<MorphProvider items={items} components={components} config={config} itemHeight={itemHeight}>
```

Notes:

- Each `Item` is placed in a row container with the row's height. Use `flex: 1` to fill it.
- `Separator` fills a container sized to `separatorHeight`. Use `flex: 1`.
- When the `Highlight` slot is used, the package positions and sizes it to the hovered row. Use `flex: 1`.
- Define slot components at module level, or memoize them. A new component identity on each render remounts every row.
- `item.data` carries any extra data the `Item` needs, such as a subtitle, a badge count or a disabled flag.

## Colors in the full-screen container

While the container expands, it shows your `Background` fading out over `colors.sheetBackground`, then your screens fading in. Keep these colors consistent:

- `colors.sheetBackground` should match the background of your screens. It is also used as the `contentStyle` background of the inner Stack.
- With a dark `Background` and a light sheet background, the container blends between both colors for a few frames. This is expected. A `Background` color close to `sheetBackground` gives a smoother transition.
- For dark mode, pass both palettes (`colors.light` and `colors.dark`) and read `colors` from the slot props instead of hard-coding values.

## Icons and the close button

Every icon prop accepts a `MorphIcon`: a React element, an image source, or a function.

```tsx
fabIcon={({ size, color }) => <Icon name="plus" size={size} color={color} />}
closeIcon={require('./close.png')}                // default for every MorphCloseButton
items={[{ ..., icon: <CameraSvg width={15} height={15} /> }]}
```

The function form receives the size and theme color for its position. Single-color images are tinted. For multi-color images, set `iconTint: false` on the item or `tintImage={false}` on the close button. Inside a custom `Item`, render icons with `renderIcon(item.icon, { size, color })`.

`<MorphCloseButton icon={...} size={40} backgroundColor="transparent" />` customizes the built-in button. A custom button that calls `router.back()` runs the same collapse animation.

## UI kit examples

The pattern is the same for every kit: static, pure components inside the slots, with animation driven by shared values. Check the prop names against the version of your kit.

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

Derive hover and pressed styles from `hovered` with `useAnimatedStyle`. Do not use `active:` or `hover:` classes: they respond to touches on the row itself, which are handled by the package's `Pressable`, and they are not applied to the copy inside the container.

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

Do not use the Tamagui `animation` or `enterStyle` props, or pressable components such as `Button` and `ListItem`, inside slots. They animate on mount, so the two copies would differ.

### React Native Paper

```tsx
const components: MorphComponents = {
  Background: () => <Surface elevation={0} style={StyleSheet.absoluteFill} />,
  Item: ({ item }) => <List.Item title={item.label} style={{ flex: 1, justifyContent: 'center' }} />, // no onPress
};
```

Keep Paper elevation at `0` inside the card, because the package renders the card shadow (`config.shadow`). A `List.Item` without `onPress` has no ripple effect, so it stays pure.

### Unistyles and StyleSheet-based themes

Call the style hook inside the slot, for example `const { styles } = useStyles(sheet)`. A theme change re-renders both copies in the same way, so the purity rule still holds.

## Advanced usage

- `useMorphProgress()` returns `{ menu, sheet }` for animations outside the menu, such as dimming a tab bar, blurring a header or scaling the page behind.
- Wrap the default row: `Item: (p) => <View style={{ opacity: p.item.data?.disabled ? 0.4 : 1, flex: 1 }}><DefaultItem {...p} /></View>`.
- Platform-specific slots: build `components` with `Platform.select`.
- Disable a part: set `Highlight: null`, omit `Separator`, or set `surface: 'solid'` to skip Liquid Glass and blur.

## Checklist

- [ ] Slot components are defined at module level or memoized.
- [ ] `Item` and `Background` have no internal state, mount animations or press effects.
- [ ] Hover and pressed styles read `hovered`. The button animation reads `progress`.
- [ ] Row heights come from `rowHeight` or a pure `itemHeight`.
- [ ] `Background` is opaque, and `colors.sheetBackground` matches the screens.
- [ ] Light and dark palettes are provided if the app supports both themes.
- [ ] Opening and closing were checked with `<MorphTrace enabled />`, with no `GHOST`, `FLICKER`, `OVERLAP` or `HOLE` flags.
