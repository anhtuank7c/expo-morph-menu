# Social example: Murmur

**English** | [Tiếng Việt](README.vi.md)

A small social app that combines `expo-morph-menu` with a typical expo-router structure: bottom tabs, screens pushed on the root stack, a compose sheet with nested screens, and a sign-in flow. Data comes from a REST API through Redux Toolkit and RTK Query, with JWT tokens, retries with backoff and optimistic updates. The API is a mock that runs inside the app, so there is no network access. The app name, look and data are made up for this example.

Use it to learn how the menu fits into an app with tabs. For the package API, see the [root README](../README.md) and the [integration guide](../docs/en/INTEGRATION.md).

## Running the app

Run the commands from the repository root. Do not run `npm install` inside `example-social/`.

```bash
npm install
npm run example:social          # expo start in example-social/
```

Open it in Expo Go (Android or iOS), or press `w` for the web version. The sign-in form is prefilled with the demo account (`demo@murmur.app` / `murmur123`, defined in `api/seed.ts`).

Deep links open a compose screen directly, for example:

```bash
npx uri-scheme open murmur://compose/poll --android
```

## What the app shows

| Screen | Route | How it is opened |
| --- | --- | --- |
| Sign in | `app/login.tsx` | Shown by `Stack.Protected` while there is no session |
| Network (debug) | `app/dev.tsx` | Pulse icon in the tab header, or the link on the sign-in screen |
| Feed, Search, Notifications, Messages | `app/(tabs)/*` | Bottom tabs |
| Post detail | `app/post/[id].tsx` | Push on the root Stack, from a post |
| Profile | `app/profile/[handle].tsx` | Push on the root Stack, from an avatar or search |
| Chat | `app/chat/[id].tsx` | Push on the root Stack, from the Messages tab or a profile |
| New post, Photo, Poll, Go live, New message | `app/compose/*` | Menu rows. Each opens the morph sheet |
| Edit photo | `app/compose/crop.tsx` | Push inside the sheet, from the photo picker |
| Chat inside the sheet | `app/compose/thread/[id].tsx` | Push inside the sheet, from New message |

```
app/
  _layout.tsx              root Stack, MorphProvider, MorphMenu, store
  (tabs)/_layout.tsx       Tabs with a fixed content height
  (tabs)/index.tsx         feed
  (tabs)/search.tsx
  (tabs)/notifications.tsx
  (tabs)/messages.tsx
  post/[id].tsx
  profile/[handle].tsx
  chat/[id].tsx
  compose/_layout.tsx      MorphSheetLayout (the sheet)
  compose/post.tsx
  compose/photo.tsx        step 1 of 2
  compose/crop.tsx         step 2 of 2, pushed inside the sheet
  compose/poll.tsx
  compose/live.tsx
  compose/message.tsx      pick a person
  compose/thread/[id].tsx  chat pushed inside the sheet
  login.tsx                sign-in (Stack.Protected)
  dev.tsx                  network and session debug screen
api/
  server.ts                mock REST backend: routes over the seed records
  seed.ts                  initial server records, demo account
  types.ts                 response shapes (DTOs)
  murmurApi.ts             RTK Query endpoints, tags, optimistic updates
store/
  index.ts                 configureStore, listener middleware, AppState focus
  composerSlice.ts         drafts of the compose screens (client-only state)
components/                Avatar, Media, PostCard, ChatThread, SheetHeader, QueryState
theme.ts                   colors, tab bar height
```

## Data layer

The generic parts (mock server, base query with token refresh and backoff, `auth` and `network` slices, Network screen) are described in [example-shared/README.md](../example-shared/README.md). This app adds:

| State | Where | Notes |
| --- | --- | --- |
| Server data | RTK Query cache (`api/murmurApi.ts`) | Keyed by endpoint and argument, shared by every screen that uses it |
| Session | `auth` slice | Drives `Stack.Protected` in `app/_layout.tsx` |
| Drafts | `composer` slice | Survive closing the sheet, cleared after a successful post |
| Request log | `network` slice | Shown on the Network screen |

How each mutation updates the cache:

| Mutation | Strategy |
| --- | --- |
| `setLike`, `vote` | Optimistic: patch every cached copy of the post (both feeds, all pages, detail, replies, profile lists), undo on failure, then apply the server's numbers |
| `setFollow` | Optimistic on the cached user, invalidates the "Following" feed |
| `sendMessage` | Optimistic: the message appears with status "sending". On failure it stays with status "failed" and can be resent with the same client id, which the server deduplicates |
| `markNotificationsRead`, `markConversationRead` | Optimistic, undo on failure |
| `createPost` | Pessimistic: wait for the server, then insert the returned post at the top of both feeds |
| `openConversation` | Invalidates the conversation list |

Other RTK Query features in use:

- `getFeed` is an infinite query with cursor pagination. Each tab is its own cache entry.
- Polling: the open chat every 2 seconds, the Messages tab every 5 seconds, the tab badges every 10 and 30 seconds. Polling stops when the last screen using the data unmounts.
- `getThread` uses `merge`, so messages that are still sending are kept when a poll result arrives.
- `refetchOnFocus` and `refetchOnReconnect`, wired to React Native `AppState` in `store/index.ts`.
- When the session ends, a listener resets the API cache and the drafts, so the next user does not see the previous user's data.

## Patterns in this example

### 1. Menu above a tab bar

The tab bar has a fixed content height, and the same value is passed to the menu, so the button sits above the tab bar:

```tsx
// theme.ts
export const TAB_BAR_HEIGHT = 56;

// app/(tabs)/_layout.tsx
tabBarStyle: { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }

// app/_layout.tsx
<MorphMenu bottomOffset={TAB_BAR_HEIGHT} />
```

`bottomOffset` is added to the bottom safe area inset and `layout.margin`.

### 2. Hiding the button outside the tabs

The button is shown on the four tab screens and while a compose route is open. On pushed screens such as a chat, it is hidden:

```tsx
const TAB_PATHS = new Set(['/', '/search', '/notifications', '/messages']);

function FloatingMenu() {
  const pathname = usePathname();
  const onTab = TAB_PATHS.has(pathname);
  const inSheet = pathname.startsWith('/compose');
  return <MorphMenu hidden={!onTab && !inSheet} bottomOffset={TAB_BAR_HEIGHT} />;
}
```

Keep the menu visible while the sheet is open (`inSheet`): the card is where the sheet collapses back to. `hidden` has no effect while a sheet route is shown.

### 3. Cancel versus submit

`closeMenuOnDismiss` keeps its default (`false`), so the close button and back navigation return to the open menu, and the user can pick another action. After a successful submit, the composer closes the sheet and the menu together:

```tsx
const dismiss = useMorphDismiss();

const submit = () => {
  addPost({ text });
  dismiss({ closeMenu: true });
};
```

### 4. Closing from a nested screen

The photo flow has two steps inside the sheet: `photo` (pick) and `crop` (edit). On `crop`, `router.back()` would only return to `photo`. `useMorphDismiss()` closes the whole sheet from any screen inside the group.

### 5. The same screen in two places

`components/ChatThread.tsx` is used by two routes:

| Route | Opened from | Back button | Floating button |
| --- | --- | --- | --- |
| `app/chat/[id].tsx` | Messages tab, profile | Returns to the previous screen on the root Stack | Hidden |
| `app/compose/thread/[id].tsx` | Menu, New message | Returns to the contact list inside the sheet | Not visible, the sheet covers the screen |

Both routes read the same store, so a message sent from the sheet appears in the Messages tab.

### 6. A slot that changes color

The button and the card share one surface. The `Background` slot interpolates from violet (button) to white (card) with the `progress` shared value. In the full-screen container (`variant: 'sheet'`) it is always white, so the card and the container match at the hand-off:

```tsx
function CardBackground({ variant, progress }: MorphBackgroundProps) {
  const style = useAnimatedStyle(() => ({
    backgroundColor:
      variant === 'sheet' ? '#ffffff' : interpolateColor(progress.value, [0, 0.35], [theme.accent, '#ffffff']),
  }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]} />;
}
```

### 7. Deferred content

`compose/post.tsx` mounts the text input, and so the keyboard, after `useMorphSettled()` returns `true`. `compose/photo.tsx` renders the photo grid only after the sheet has expanded.

## Frame trace

Start Metro with the trace enabled and watch the `[morph]` lines in the device log:

```bash
cd example-social
EXPO_PUBLIC_MORPH_TRACE=1 npx expo start
```

On an Android 17 emulator (API 37, development bundle, fault injection at "low"), sign-in followed by 8 scripted flows covering every menu row, nested screens, hardware back, the hidden button and `useMorphDismiss` produced 270 traced frames with no `FLICKER`, `HOLE`, `GHOST` or `OVERLAP` flags.

## Not covered

- iOS has not been run yet.
- The emulator used a hardware keyboard, so keyboard avoidance in the chat was not checked with the on-screen keyboard.
- There are no Maestro flows for this example. The end-to-end suite is in `example/`. The data layer has its own tests: `npm run test:api`.
- Tokens are kept in memory, so restarting the app signs you out. A production app persists the refresh token with `expo-secure-store`.
