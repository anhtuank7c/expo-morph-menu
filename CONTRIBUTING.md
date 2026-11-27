# Contributing

Thanks for helping. Issues and pull requests can be written in English or Vietnamese.

## Reporting a bug

Use the [bug report form](https://github.com/anhtuank7c/expo-morph-menu/issues/new?template=bug_report.yml). A report that can be reproduced gets fixed first, so please include:

- versions of `expo-morph-menu`, Expo SDK, React Native and Reanimated (`npx expo --version`, `npm ls react-native-reanimated`)
- platform and OS version, device or simulator, Expo Go or a development build
- the smallest code that shows the problem, ideally a change to [`example/`](example)
- a screen recording for anything visual

Most visual bugs in this package last one or two frames, which a recording can miss. Render `<MorphTrace enabled />` inside `MorphProvider` (or run the example with `npm run example:trace`) and attach the `[morph]` log lines. Lines flagged `FLICKER`, `HOLE`, `GHOST` or `OVERLAP` point at the frame that went wrong.

Security issues: see [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Development setup

Requirements: Node 20 or later, npm 10 or later. Android Studio or Xcode for running the examples outside Expo Go.

```bash
git clone https://github.com/anhtuank7c/expo-morph-menu.git
cd expo-morph-menu
npm install            # also installs the pre-commit hook
npm run example        # basic example in Expo Go
npm run example:social # social example
```

The package source is in `src/`. Both example apps import it directly from `src/` through Metro, so a change shows up after a reload with no build step.

## Before opening a pull request

```bash
npm run check          # typecheck, ESLint, Prettier check
npm run test:api       # data layer of the social example
npm run e2e            # Maestro flows + frame trace on Android (needs Metro: npm run example:trace)
```

The pre-commit hook runs ESLint and Prettier on staged files and the typecheck. CI runs `npm run check`, `npm run test:api` and a package build on every pull request.

For changes to the animation or the handoff between the card and the full screen, also:

- run the Maestro flows (`npm run e2e`) and check that the trace reports 0 errors
- test on iOS and Android, and on web if the change touches gestures or keyboard handling
- read [Architecture](docs/en/ARCHITECTURE.md) and [Performance](docs/en/PERFORMANCE.md) first; they explain which values must change on the UI thread and in which frame

## Pull requests

- One topic per pull request. Refactors and behavior changes in separate pull requests.
- Commit messages: imperative mood, short subject line (for example "Keep the Liquid Glass surface at a fixed size while the menu morphs").
- Update `CHANGELOG.md` under **Unreleased** for any change a user of the package would notice.
- Update both language versions of a document you change (`docs/en` and `docs/vi`, `README.md` and `README.vi.md`). If you only write one language, say so in the pull request and the other will be added before merge.
- A change to the public API (exports of `src/index.ts`, props, config keys) needs a note on compatibility in the pull request description.

## Releasing (maintainers)

1. Move the **Unreleased** entries in `CHANGELOG.md` under a new version heading.
2. `npm version <patch|minor|major>`: updates `package.json` and creates the `vX.Y.Z` tag.
3. `git push --follow-tags`. The `Release` workflow checks, builds and publishes to npm with provenance, then creates the GitHub release.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
