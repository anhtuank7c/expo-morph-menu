# Performance

**English** | [Tiếng Việt](../vi/PERFORMANCE.md)

Related: [Architecture](ARCHITECTURE.md), pages 2 to 5 of [`expo-morph-menu.en.drawio`](../diagrams/expo-morph-menu.en.drawio)

This document lists the optimizations in the package, the defects found with the frame trace, the test results, and options that were evaluated but not implemented.

## Contents

1. [Where the cost is](#1-where-the-cost-is)
2. [Destination screen mount cost](#2-destination-screen-mount-cost)
3. [Shadows on a resizing view](#3-shadows-on-a-resizing-view)
4. [Hand-off](#4-hand-off)
5. [Defects found with the frame trace](#5-defects-found-with-the-frame-trace)
6. [Test results](#6-test-results)
7. [Layout properties versus transforms](#7-layout-properties-versus-transforms)
8. [Card surface](#8-card-surface)
9. [Measurement](#9-measurement)

## 1. Where the cost is

A native-stack push runs the platform navigation code: `react-native-screens` uses `UINavigationController` on iOS and Fragments on Android. The transition itself does not run in JavaScript or in Reanimated.

An overlay animation appears faster than a screen push mainly because it does not mount a new screen. Mounting the same content in an overlay costs the same. In most cases, the cost to optimize is rendering the destination content, not the navigation mechanism.

## 2. Destination screen mount cost

A common symptom: the animation runs at full frame rate, but the destination screen is empty for one or two frames before its content appears. Users report this as lag, while the profiler shows no dropped frames.

### 2.1 Prefetch on hover (implemented)

The package knows which row the user is about to select before the pointer is released. `MorphMenu` watches the hovered row index with `useAnimatedReaction`, triggers haptic feedback, and calls `onHover(item)`:

```tsx
// src/MorphMenu.tsx (simplified)
const onHover = useCallback(
  (index: number) => {
    const item = items[index];
    if (!item) return;
    if (config.haptics) haptics.selection();
    callbacks.onHover?.(item);
  },
  [items, config.haptics, callbacks],
);

useAnimatedReaction(
  () => hovered.value,
  (cur, prev) => { if (cur !== prev && cur >= 0) runOnJS(onHover)(cur); },
);
```

Start data loading in `onHover` (React Query, SWR or a custom cache). In the example app, the detail screen shows a badge with the actual wait time, so the effect can be compared between press-and-drag and a quick tap.

### 2.2 Deferred rendering (implemented)

During the expand animation, the screen only needs a header and a placeholder. `useMorphSettled()` returns `true` when the spring finishes:

```tsx
// src/MorphSheetLayout.tsx
sheet.value = withSpring(1, spring, (finished) => {
  'worklet';
  if (finished) runOnJS(setSettled)(true);
});
```

`InteractionManager.runAfterInteractions` is not suitable for this, because it does not track Reanimated animations.

## 3. Shadows on a resizing view

The shadow is not animated, but the bounds of the view are, so the shadow is recomputed for the new bounds on every frame. Combined with `overflow: hidden` and `borderRadius` clipping the children, this causes offscreen rendering on iOS.

```tsx
const shadow = restShadow(p); // src/geometry.ts: 1 at both ends, 0 in between
```

`restShadow` fades the shadow over the first and last 10% of progress, where the bounds barely change. An earlier version used a switch (`flying ? 0 : 0.18`), which caused a visible jump when closing: the card reappeared with a full shadow, and the shadow turned off in the next frame when the card started collapsing.

On iOS, the opacity of the overlay is never animated (`OVERLAY_BELOW_ROUTE`). The modal already covers it, and `UIVisualEffectView` does not render correctly with opacity below 1.

If the shadow must stay visible during the whole animation, render it on a sibling view that keeps a fixed size and moves only with `transform`.

Do not use `shouldRasterizeIOS` on a view that changes size. The layer would be rasterized again on every frame.

Measurement: Instruments, Core Animation, "Color Offscreen-Rendered Yellow". On Android, use Perfetto and look at the duration of `saveLayer`.

## 4. Hand-off

### 4.1 Hand-off based on the first rendered frame

Routes mount asynchronously. If the overlay faded out based on `sheet` progress, a delayed first commit of the route would produce an empty frame. The overlay is hidden only after the route sets `handoff` to `ROUTE`: on native in the container's `onLayout`, on web in `useLayoutEffect`.

### 4.2 Closing on the UI thread

The first version showed an empty card followed by a jump when closing, most visibly in development builds. Causes:

- `setSettled(false)` at the start of the close animation made React unmount the content and mount the placeholder in the first animation frame.
- The content was fully transparent at progress 0.6, so the second half of the animation showed an empty container.
- The swap between container and card ran in a `useEffect` after a `runOnJS` call, so the card appeared one JavaScript render later.

Current implementation:

- `handoff` has three states: `MENU`, `ROUTE` and `RETURNING`.
- The container renders the menu rows (`src/MenuFace.tsx`) in the card corner. Content opacity changes between progress 0.4 and 0.75, and the menu rows between 0.15 and 0.5, so the container always shows either content or rows.
- While the container is small, the content is shifted up by `insets.top` (transform only), so the visible part is not the empty status bar area.
- The swap happens on the UI thread in a single frame. See [Architecture, section 6](ARCHITECTURE.md#6-hand-off-single-frame-swap).

## 5. Defects found with the frame trace

`src/MorphTrace.tsx` logs `menu`, `sheet`, `handoff`, and the rendered opacity of the overlay and the container on every frame, computed with the same functions as the styles (`src/visibility.ts`). Each defect below was reproduced on Android before it was fixed:

| Symptom | Cause | Fix |
| --- | --- | --- |
| The old card flashes when closing | The spring `finished` callback set `handoff = MENU` while the route was still waiting for the JavaScript pop, so the container opacity returned to 1 | Keep `RETURNING` until after unmount. The next selection resets it to `MENU` |
| The card pauses about 115 ms before collapsing into the button | The spring overshoots 0 and oscillates for about 7 frames before `finished` | `useAnimatedReaction` starts the collapse as soon as `sheet <= 0.005` |
| Tapping the close button does nothing, and the sheet turns grey for a moment | The overlay was still in mode `open` while the route was visible. On Android, the scrim was above the route and intercepted the tap | Menu mode `closed`, `open` or `route`. `scrimGate` hides the scrim while the route is visible |
| Hardware back closes the hidden menu instead of the sheet | The menu's `BackHandler` was still registered while the route was visible | Same fix as above |
| A long drag-down swaps the container and the card in one frame | `sheet` reached 0 while `handoff` was still `ROUTE` | The drag gesture has a floor of 0.35 |
| A slightly long tap on the button opens the last row | The button is inside the area of the card's last row, and hit testing selected it on release | A tap released in place never selects a row |
| Fast drag and release: the container starts from the full card bounds while the card is at 79% | The route was pushed before the card finished expanding | Selection waits until `menu >= 0.995` |
| The shadow appears and turns off abruptly at the hand-off | Switch `flying ? 0 : 0.18` | `restShadow` fades over 10% at both ends |
| (iOS) The glass card flickers when it reappears | Opacity animated on `UIVisualEffectView` | `OVERLAY_BELOW_ROUTE`: overlay opacity is not changed on iOS |
| Doubled, blurred text on the card while closing (mid-close screenshot on the emulator) | Crossfade between container and overlay for progress 0 to 0.12: two semi-transparent layers while the container was still a few dp larger than the card. A dropped frame turned the crossfade into a misaligned cut | Crossfade removed. The swap happens in the frame where `sheet <= ARRIVED` (0.005, offset under 1 dp). Both layers read the same `sheet` value on the UI thread. The trace flags `GHOST` if this happens again |

## 6. Test results

Maestro end-to-end flows, 2026-11-26:

| Device | Bundle | Frames | Dropped frames | FLICKER / HOLE / GHOST |
| --- | --- | --- | --- | --- |
| Android emulator, API 37 (Android 17) | `--no-dev --minify` | 468 | 0 | 0 |
| Android emulator, API 37 (Android 17) | Development, cold start per flow | 455 | 16 | 0 |
| MEmu (Android 9) | Development, before the crossfade was removed | 481 | Not recorded | 0 |

In these runs, dropped frames occurred only in the development bundle, right after the bundle was loaded. The production bundle recorded 0 dropped frames.

To repeat the test: `npm run example:trace`, then `npm run e2e`. See [example/README.md](../../example/README.md).

## 7. Layout properties versus transforms

Status: not implemented.

The container animates `width` and `height`, so each frame updates layout properties through the shadow tree. The fixed-size inner view avoids a layout pass over the screen tree, but the container node is still laid out again on every frame.

A transform-only alternative separates the shape from the content. A plain background layer is scaled with `scaleX` and `scaleY`, which is inexpensive on the GPU. The content is a sibling layer that only uses `translate` and opacity, and is never scaled.

Trade-off: scaling a rounded rectangle distorts its corners into ellipses. Compensating requires animating `borderRadius` in the opposite direction, which is also a per-frame property update and rebuilds the clipping mask, so most of the gain is lost. For a 460 ms animation with a 28 pt radius, the distortion is small, so accepting it is an option.

Reason it was not implemented: the expected gain is much smaller than the shadow fix in [section 3](#3-shadows-on-a-resizing-view). Before rewriting the animation, check whether the React Native and Reanimated versions in use can animate layout properties without a JavaScript round trip.

For full control over the shape, the container could be drawn with Skia: a rounded rectangle interpolated on a GPU canvas, without view layout. This adds a large dependency, and the content still has to be React Native views stacked on top.

## 8. Card surface

`src/Surface.tsx` selects the surface in this order: Liquid Glass on iOS 26 and later (`expo-glass-effect`), then `BlurView`, then a solid view.

Blur is expensive, especially on Android. It is enabled by default only on iOS. To use blur on Android, set `experimentalBlurMethod="dimezisBlurView"` in a custom `Background` slot and measure the frame rate on low-end devices first.

## 9. Measurement

Recommended order when extending the package:

1. Keep prefetching on hover ([2.1](#21-prefetch-on-hover-implemented)) and the shadow fade ([section 3](#3-shadows-on-a-resizing-view)).
2. Measure on the lowest-end Android device you support, with a release build. Animation profiles from React Native debug builds are not representative.
3. Consider transforms or Skia only if frames are still dropped.

Tools:

| Platform | Tool |
| --- | --- |
| iOS | Instruments, Animation Hitches |
| Android | `adb shell dumpsys gfxinfo <package> framestats`, Perfetto |

The FPS counter in the React Native dev menu is not a reliable measurement.
