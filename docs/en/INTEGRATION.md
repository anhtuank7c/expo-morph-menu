# Integration guide

**English** | [Tiếng Việt](../vi/INTEGRATION.md)

Related: [Architecture](ARCHITECTURE.md), [Custom UI](CUSTOM-UI.md), [Performance](PERFORMANCE.md)

This guide adds the menu to an existing expo-router app in three files, then describes configuration, platform behavior, testing and troubleshooting.

## Requirements

| Dependency | Version |
| --- | --- |
| Expo SDK | 58 or later |
| expo-router | 58 or later |
| react-native-reanimated | 4 or later, with `react-native-worklets` |
| react-native-gesture-handler | 3 or later |
| react-native-safe-area-context | 5 or later |
| react-native-screens | 4 or later |

Optional peer dependencies are detected at runtime. If a package is not installed, the related feature is disabled:

| Package | Feature |
| --- | --- |
| `expo-haptics` | Haptic feedback |
| `expo-glass-effect` | Liquid Glass card surface on iOS 26 and later |
| `expo-blur` | Blurred card surface on iOS |

Platform status: tested on Android emulators (Android 9 and 17), an iOS 27 simulator and desktop Chrome. Not yet verified on a physical iOS device.

## Installation

```bash
npx expo install expo-morph-menu \
  expo-router react-native-reanimated react-native-worklets \
  react-native-gesture-handler react-native-safe-area-context react-native-screens

# optional
npx expo install expo-haptics expo-blur expo-glass-effect
```

`babel.config.js` must use `babel-preset-expo`, which is the default in Expo projects. The preset enables the worklets plugin required by Reanimated. The package publishes its TypeScript source under the `react-native` export condition, so Metro compiles the package's worklets with your Babel configuration.

![Architecture](../diagrams/svg/en/1-architecture.svg)

## Step 1: root layout

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

Component order:

- `SafeAreaProvider` and `GestureHandlerRootView` wrap `MorphProvider`.
- `<MorphMenu />` is rendered inside `MorphProvider` and after the root `Stack`. It is an overlay and must be drawn above the screens.
- The sheet group uses `morphSheetScreenOptions`: `presentation: 'transparentModal'`, `animation: 'none'`, `headerShown: false`, `gestureEnabled: false` and a transparent background. Headers inside the sheet come from the inner Stack. The package runs its own animation, and a native transition would conflict with it.

## Step 2: sheet route group

Every route in this group expands from the menu card and collapses back into it.

```tsx
// app/(sheet)/_layout.tsx
import { Stack } from 'expo-router';
import { MorphSheetLayout } from 'expo-morph-menu';

export default function SheetLayout() {
  return (
    <MorphSheetLayout>
      <Stack.Screen name="[key]" options={{ headerShown: false }} />
      {/* screens pushed inside the full screen use the native stack */}
      <Stack.Screen name="details" options={{ title: 'Details' }} />
    </MorphSheetLayout>
  );
}
```

`MorphSheetLayout` props:

| Prop | Description |
| --- | --- |
| `children` | `<Stack.Screen>` declarations for the group |
| `screenOptions` | Merged into the inner Stack defaults (background `colors.sheetBackground`, minimal back button) |

The group name is arbitrary. The `href` of each item must point to a route inside the group.

## Step 3: screens

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

- Dismissal: `MorphCloseButton` calls `router.back()`. The other dismiss paths behave the same way and run the collapse animation: a custom button calling `router.back()`, Android hardware back, browser back, Esc on web, and the left-edge swipe and drag-down gestures on iOS.
- Deferred rendering: `useMorphSettled()` returns `true` after the container has finished expanding. Mounting a large component tree during the animation can drop frames.
- Safe area: the container covers the whole screen, including the system bars. Apply `insets.top` to the header and `insets.bottom` to scrollable content.

`MorphCloseButton` props: `icon`, `size` (default `32`), `iconSize`, `color`, `backgroundColor`, `tintImage`, `style`, and any `Pressable` prop. Call `e.preventDefault()` in `onPress` to skip the default `router.back()`.

## Menu items

```ts
type MorphItem = {
  key: string;                     // unique, also used in the test ID
  label: string;
  href: Href;                      // a route inside the sheet group
  icon?: MorphIcon;                // React element, image source, or ({ size, color }) => node
  iconTint?: boolean;              // tint single-color images (default true)
  tint?: string;                   // background color of the icon circle; omit for no circle
  accessibilityLabel?: string;
  data?: Record<string, unknown>;  // custom data for a custom Item slot
};
```

Keep the `items` array referentially stable, as a module constant or with `useMemo`.

```tsx
icon: <Ionicons name="camera" size={15} color="#fff" />             // React element
icon: require('./camera.png')                                        // bundled image, tinted
icon: { uri: 'https://example.com/camera.png' }                      // remote image
icon: ({ size, color }) => <CameraSvg width={size} color={color} />  // follows the theme
```

## Configuration

Pass only the values to override. Other values use platform defaults.

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

| Key | Default (iOS / Android / web) | Description |
| --- | --- | --- |
| `closeMenuOnDismiss` | `false` | `false`: the menu stays open after the full screen is dismissed. `true`: the menu collapses into the button |
| `anchor` | `'bottom-right'` | Or `'bottom-left'` |
| `layout.fabSize` | `56` | Button size |
| `layout.cardWidth` | `236` | Card width |
| `layout.rowHeight` | `46` | Default row height, see `itemHeight` |
| `layout.padding` | `10` | Top and bottom padding of the list |
| `layout.margin` | `20` | Distance from the screen edges, added to the bottom safe area inset |
| `layout.iconSize` | `15` | Row icon size. The tint circle is `iconSize + 11` |
| `layout.separatorHeight` | `1` | Used only with a `Separator` slot |
| `radius.card` / `radius.sheet` / `radius.fab` | `28` / `0` / `null` | `fab: null` renders a circle |
| `shadow` | opacity `0.18`, radius `18`, offsetY `8` / elevation `10` | iOS and web use color, opacity, radius and offsetY. Android uses elevation |
| `dismiss.edgeSwipe` | `true` / `false` / `false` | Left-edge swipe, on the root screen of the group only |
| `dismiss.dragDown` | `true` / `false` / `false` | Drag down to dismiss |
| `spring` | `{ duration: 460, dampingRatio: 0.85 }` | Reduce Motion is respected |
| `haptics` | `true` | Requires `expo-haptics` |
| `surface` | `'auto'` | `'glass'`, `'blur'` or `'solid'`. `'auto'` resolves to Liquid Glass (iOS 26+), then blur (iOS), then solid |
| `colorScheme` | `'auto'` | `'light'` or `'dark'` |
| `backdropOpacity` | `0.25` | Opacity of the backdrop behind the full screen |
| `colors.light` / `colors.dark` | `LIGHT_COLORS` / `DARK_COLORS` | `surface`, `sheetBackground`, `text`, `scrim`, `backdrop`, `highlight`, `fabIcon`, `closeBackground`, `closeIcon`, `iconForeground` |

If your screens support only a light theme, set `colorScheme: 'light'`. Otherwise, with a dark system theme, the close button uses a light icon on a light screen.

Other `MorphProvider` props: `components` and `itemHeight` (see [Custom UI](CUSTOM-UI.md)), `fabIcon`, `closeIcon`.

## Callbacks

| Prop | Called when |
| --- | --- |
| `onHover(item)` | The pointer moves onto a row: finger drag on touch devices, mouse hover on web |
| `onSelect(item)` | A row is selected, before `router.push` |
| `onOpen()` / `onClose()` | The menu starts opening or closing |
| `onSheetDismissed(item)` | The full screen has finished collapsing |

`onHover` runs before the user releases the pointer, so it can start loading the destination data:

```tsx
const queryClient = useQueryClient();

<MorphProvider
  items={items}
  onHover={(item) =>
    queryClient.prefetchQuery({ queryKey: ['sheet', item.key], queryFn: () => fetchSheet(item.key) })
  }
/>
```

## Platform behavior

| Behavior | iOS | Android | Web |
| --- | --- | --- | --- |
| Card surface (`'auto'`) | Liquid Glass (iOS 26+) or blur | Solid | Solid |
| Dismiss the full screen | Close button, left-edge swipe, drag down | Close button, hardware back | Close button, Esc, browser back |
| Close the menu | Tap the scrim | Tap the scrim, hardware back | Click the scrim, Esc |
| `onHover` | Drag | Drag | Drag, mouse hover |
| Haptics | Yes | Yes | No |

Web: reloading or closing the tab while the full screen is open does not show the "Leave site?" dialog. Press-and-drag works with a mouse, and text selection is disabled during the drag.

## Tabs and pushed screens

When the root navigator contains a tab navigator, place the button above the tab bar and hide it on screens where it does not apply. `MorphMenu` props:

| Prop | Default | Description |
| --- | --- | --- |
| `bottomOffset` | `0` | Extra distance from the bottom edge, added to the bottom safe area inset and `layout.margin`. Pass the tab bar height without its inset |
| `hidden` | `false` | Hides the button (scale and fade out, no touches). If the menu is open, it is closed first. Ignored while a sheet route is shown, because the card is where the sheet collapses back to |
| `fabAccessibilityLabel` | `'Open menu'` | Screen reader label of the button |

```tsx
const TAB_PATHS = new Set(['/', '/search', '/notifications', '/messages']);

function FloatingMenu() {
  const pathname = usePathname();
  const visible = TAB_PATHS.has(pathname) || pathname.startsWith('/compose');
  return <MorphMenu hidden={!visible} bottomOffset={TAB_BAR_HEIGHT} />;
}
```

Give the tab bar a fixed content height (for example `tabBarStyle: { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }`) so the same value can be passed to `bottomOffset`. A complete app with tabs is in [`example-social/`](../../example-social/README.md).

## Closing from code

`router.back()` on a nested screen inside the sheet only pops that screen. `useMorphDismiss()` closes the whole sheet from any screen in the group, through the same path as the other dismiss actions:

```tsx
import { useMorphDismiss } from 'expo-morph-menu';

const dismiss = useMorphDismiss();

dismiss();                      // collapse into the card; the menu follows closeMenuOnDismiss
dismiss({ closeMenu: true });   // collapse into the card, then into the button
dismiss({ closeMenu: false });  // collapse into the card and keep the menu open
```

A common pattern: keep `closeMenuOnDismiss: false`, so cancelling returns to the open menu, and call `dismiss({ closeMenu: true })` after a successful submit.

## Deep links

Sheet routes are regular routes, so `myapp://camera` (or `/camera` on web) opens them directly. Without a card to expand from, the container expands from a centered rectangle.

A deep link can make the sheet the first route of the root navigator, with no screen below it to return to. Export `unstable_settings` from the root layout so that expo-router places your home route below it:

```tsx
// app/_layout.tsx
export const unstable_settings = { anchor: 'index' }; // or '(tabs)'
```

Without this setting, closing the sheet does nothing, and a warning is logged in development builds.

## Testing

Test IDs:

| ID | Element |
| --- | --- |
| `morph-fab` | Button hit area |
| `morph-scrim` | Scrim behind the open menu |
| `morph-item-<key>` | Menu row |
| `morph-close` | `MorphCloseButton` (default test ID) |

Maestro example:

```yaml
- tapOn: { id: "morph-fab" }
- tapOn: { id: "morph-item-camera" }
- tapOn: { id: "morph-close" }
- assertVisible: { id: "morph-item-camera" }   # the menu stays open (closeMenuOnDismiss: false)
```

Screenshots do not reliably capture single-frame defects. To detect them, render `<MorphTrace enabled={__DEV__ && myFlag} />` inside `MorphProvider` and search the `[morph]` log lines for the `FLICKER`, `HOLE`, `GHOST` and `OVERLAP` flags. The example app includes a Maestro and logcat runner (`example/scripts/e2e.mjs`) that fails on these flags.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| The menu is hidden behind the screens | `<MorphMenu />` must be inside `MorphProvider` and after the root `Stack` |
| Error "useMorph() must be used inside &lt;MorphProvider&gt;" | `MorphSheetLayout`, `MorphCloseButton` or a hook is rendered outside the provider |
| The full screen appears with a native transition | The group's `<Stack.Screen>` is missing `options={morphSheetScreenOptions}` |
| Gap at the bottom of the full screen (Android) | Do not wrap the app in a container with a fixed size. The package uses `useSafeAreaFrame()`, which requires `SafeAreaProvider` at the root |
| Content jumps or frames drop while opening | Mount expensive content after `useMorphSettled()` returns `true` |
| A semi-transparent copy of the menu appears while closing | A custom `Item` or `Background` is not pure or not opaque. See [Custom UI: the slot contract](CUSTOM-UI.md#the-slot-contract) |
| The close button icon is not visible in dark mode | The screens support only a light theme. Set `colorScheme: 'light'` or add a dark theme to the screens |
| "Invalid hook call" or duplicate React errors in a monorepo | Configure Metro to resolve a single copy of `react`, `react-native-reanimated` and `expo-router` |
| Closing a deep-linked sheet does nothing | The sheet is the only route on the root navigator. Export `unstable_settings = { anchor: ... }` from the root layout. See [Deep links](#deep-links) |
| The button covers the tab bar | Pass the tab bar height to `<MorphMenu bottomOffset={...} />`. See [Tabs and pushed screens](#tabs-and-pushed-screens) |
| Worklet errors such as "... is not a worklet" | `babel.config.js` must use `babel-preset-expo`. Clear the Metro cache with `npx expo start -c` |
