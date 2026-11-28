# Changelog

All notable changes to this package are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). Until 1.0.0, a minor version (0.x.0) may contain breaking changes; they are listed under **Breaking**.

## [Unreleased]

## [0.2.1] - 2026-11-29

### Changed

- The README links to the sister package, [expo-morph-carousel](https://github.com/anhtuank7c/expo-morph-carousel), and the package has more npm keywords. No code changes.

## [0.2.0] - 2026-11-28

### Added

- `config.floatingSheet`: on wide screens (iPad, unfolded phones, desktop web) the full screen opens as a floating card centered on the screen, like an iPadOS form sheet. Tapping outside the card closes it. Inside the card, `useSafeAreaInsets()` returns 0 and `useSafeAreaFrame()` returns the card, so phone screens work unchanged.

### Changed

- The floating card is on by default from 700 × 600 pt. Set `floatingSheet: { enabled: false }` to keep the full screen on every screen size.

## [0.1.0] - 2026-11-27

First public release.

### Added

- `MorphProvider`, `MorphMenu` and `MorphSheetLayout`: a floating button that expands into a card menu, and a card row that expands into a full-screen expo-router route and collapses back into the card when the route is dismissed.
- `morphSheetScreenOptions` for the route group's `<Stack.Screen>`.
- Dismiss paths that all run the collapse animation: `MorphCloseButton`, `router.back()`, Android hardware back, browser back, Esc on web, left-edge swipe and drag-down on iOS. The gestures follow the finger over the full travel and keep its velocity on release.
- Press, hold and slide from the button to a row to select it in one gesture.
- `onHover` callback for prefetching the destination screen's data.
- Replaceable UI parts (slots): `Trigger`, `Item`, `Highlight`, `Background`, `Scrim`, with `DefaultItem` as a starting point.
- Card surfaces: Liquid Glass on iOS 26 and later (`expo-glass-effect`), blur (`expo-blur`), solid. The Liquid Glass view keeps a fixed size while the menu morphs.
- Hooks: `useMorph`, `useMorphProgress`, `useMorphSettled`, `useMorphDismiss`.
- `MorphTrace`: per-frame trace that reports single-frame defects (`FLICKER`, `HOLE`, `GHOST`, `OVERLAP`).
- Web support through React Native Web.
- Light and dark color sets (`LIGHT_COLORS`, `DARK_COLORS`) and `DEFAULT_CONFIG`.

[Unreleased]: https://github.com/anhtuank7c/expo-morph-menu/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/anhtuank7c/expo-morph-menu/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/anhtuank7c/expo-morph-menu/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/anhtuank7c/expo-morph-menu/releases/tag/v0.1.0
