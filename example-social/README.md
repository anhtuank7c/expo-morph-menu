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

## Code structure

The code is organized by feature. `app/` holds routes only; every route file re-exports a screen from `src/features/<name>`, and the layouts configure navigation and providers.

```
app/                        routes: one line per screen, plus the layouts
  _layout.tsx               root Stack, Provider, MorphProvider, ComposeMenu
  (tabs)/_layout.tsx        Tabs with a fixed content height, unread badges
  compose/_layout.tsx       MorphSheetLayout (the sheet)
src/
  core/                     infrastructure, no feature code
    http/                   base query: tokens, refresh, backoff, idempotency, request log
    session/                auth slice: tokens and their lifecycle
    api/                    the RTK Query API slice (no endpoints) and the API types (dto.ts)
  backend/                  mock REST server; the app reaches it only through fetch
  shared/                   theme, formatting, Avatar, Media, QueryState, SheetHeader, Separator
  store/                    configureStore, listeners, typed hooks
  features/
    auth/                   login, logout, current user; LoginScreen
    posts/                  feeds, post detail, like, vote, create; PostCard, PostList, FeedScreen
    people/                 search, profiles, follow; SearchScreen, ProfileScreen, PersonRow
    notifications/          notifications, unread count; NotificationsScreen
    messages/               conversations, threads, sending; MessagesScreen, ChatThread, ChatScreen
    compose/                floating menu, drafts slice, screens inside the sheet
    live/                   broadcasts; GoLiveScreen
    devtools/               Network screen
test/api.test.cjs           data layer scenarios (npm run test:api)
docs/DATA-LAYER.md          base query, token refresh, fault injection
```

A feature has up to three parts:

| Folder | Contents | Depends on |
| --- | --- | --- |
| `api/` | Endpoints added with `api.injectEndpoints()`, cache updates, hooks such as `useUnreadMessageCount` | `core` |
| `model/` | Client-only state and pure logic (the drafts slice, the photo gallery) | nothing |
| `ui/` | Screens and components | `api`, `model`, `shared`, other features |

Rules that keep the dependencies one-way:

- Each feature exports its public API from `index.ts`. Other features and routes import from there, never from a file inside another feature.
- `core`, `shared` and `backend` never import from `features`.
- Tags are declared once in `core/api/api.ts`, so a mutation in one feature can invalidate data of another (following someone invalidates the "Following" feed) without an import.
- A screen that combines several features goes in the feature that owns the flow. "New message" uses people search and messages, so it is in `compose`, which depends on both. Placing it in `messages` would create a cycle, because the profile screen in `people` already depends on `messages`.

## Data layer

The generic parts (mock server, base query with token refresh and backoff, `auth` and `network` slices, Network screen) are described in [docs/DATA-LAYER.md](docs/DATA-LAYER.md). This app adds:

| State | Where | Notes |
| --- | --- | --- |
| Server data | RTK Query cache (`src/core/api/api.ts`, endpoints in `src/features/*/api/`) | Keyed by endpoint and argument, shared by every screen that uses it |
| Session | `auth` slice | Drives `Stack.Protected` in `app/_layout.tsx` |
| Drafts | `composer` slice (`src/features/compose/model/`) | Survive closing the sheet, cleared after a successful post |
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
- `refetchOnFocus` and `refetchOnReconnect`, wired to React Native `AppState` in `src/store/index.ts`.
- When the session ends, a listener resets the API cache and the drafts, so the next user does not see the previous user's data.

## Patterns in this example

### 1. Menu above a tab bar

The tab bar has a fixed content height, and the same value is passed to the menu, so the button sits above the tab bar:

```tsx
// src/shared/theme.ts
export const TAB_BAR_HEIGHT = 56;

// app/(tabs)/_layout.tsx
tabBarStyle: { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }

// src/features/compose/ui/ComposeMenu.tsx
<MorphMenu bottomOffset={TAB_BAR_HEIGHT} />
```

`bottomOffset` is added to the bottom safe area inset and `layout.margin`.

### 2. Hiding the button outside the tabs

The button is shown on the four tab screens and while a compose route is open. On pushed screens such as a chat, it is hidden (`src/features/compose/ui/ComposeMenu.tsx`):

```tsx
const TAB_PATHS = new Set(['/', '/search', '/notifications', '/messages']);

export function ComposeMenu() {
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

`ChatScreen` (`src/features/messages/ui/ChatScreen.tsx`) is used by two routes:

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

`ComposePostScreen` mounts the text input, and so the keyboard, after `useMorphSettled()` returns `true`. `PhotoPickerScreen` renders the photo grid only after the sheet has expanded.

## Rendering performance

The goal is that a change renders only the components that show it. The techniques used, and where:

| Technique | Where | Effect |
| --- | --- | --- |
| `React.memo` on list rows | `PostCard`, `ConversationRow`, `NoticeRow`, `MessageBubble`, `PersonRow`, `EntryRow` | RTK Query keeps unchanged objects when data is refetched (structural sharing), and Immer keeps unchanged items when a cache entry is patched. A like changes one post object, so one row renders |
| Module-level `renderItem`, `keyExtractor` and `ItemSeparatorComponent` | `PostList`, `MessagesScreen`, `NotificationsScreen` | The list receives the same props on every render of its parent. An inline `ItemSeparatorComponent={() => ...}` is a new component type on every render, so React remounts every separator |
| `selectFromResult` | Tab badges, chat title, `ChatThread`, `ViewerCount`, `ComposePostScreen` | The component subscribes to the value it shows. A poll toggles `isFetching` twice even when the data is the same; without `selectFromResult` every poll renders the subscriber |
| Narrow Redux selectors | `selectCanSubmitPost`, `selectPostLength`, `selectPollOption(index)`, `selectLastAuthError` | A keystroke in the post draft renders the input and the counter; the header renders only when "can post" changes. Typing in one poll choice renders only that row |
| `useAppStore` in event handlers | Compose screens | The submit handler reads the draft from the store when it runs, so the screen does not subscribe to the draft |
| Mutations dispatched without a hook | `usePostActions` | Like and vote are dispatched with `initiate(arg, { track: false })`. A `useSetLikeMutation()` in every row would subscribe each row to its own mutation state |
| Local state in leaf components | `ChatComposer`, `SearchField`, `LiveClock`, `TokenCountdown` | Typing, a debounced query, and clocks that tick every second render one small component instead of the screen |
| `router` object instead of `useRouter()` | `PostCard` and other rows | Rows use the imperative `router` from expo-router, so they do not read navigation context |
| Stable options and constants | `COMPOSE_ITEMS`, `COMPOSE_CONFIG`, tab `screenOptions` (`useMemo` on the inset), `EMPTY` arrays | Providers and navigators receive the same objects between renders |

Animation values (`progress`, `sheet`, hover) are Reanimated shared values and run on the UI thread, so the morph itself does not render React components.

To check renders, enable "Highlight updates when components render" in React DevTools, or record with the Profiler. [React Compiler](https://react.dev/learn/react-compiler) can add most of these memoizations automatically (`"experiments": { "reactCompiler": true }` in `app.json`). This example writes them by hand so each one is visible in the code.

## Frame trace

Start Metro with the trace enabled and watch the `[morph]` lines in the device log:

```bash
cd example-social
EXPO_PUBLIC_MORPH_TRACE=1 npx expo start
```

On an Android 17 emulator (API 37, development bundle, fault injection at "low"), sign-in followed by 8 scripted flows covering every menu row, nested screens, hardware back, the hidden button and `useMorphDismiss` produced 270 traced frames with no `FLICKER`, `HOLE`, `GHOST` or `OVERLAP` flags.

After the code was reorganized into features, a manual run on the same emulator (sign-in, like, vote, post, photo, poll, live, and chat in both places) produced 271 traced frames, also with no flags.

## Not covered

- iOS has not been run yet.
- The emulator used a hardware keyboard, so keyboard avoidance in the chat was not checked with the on-screen keyboard.
- There are no Maestro flows for this example. The end-to-end suite is in `example/`. The data layer has its own tests: `npm run test:api`.
- Tokens are kept in memory, so restarting the app signs you out. A production app persists the refresh token with `expo-secure-store`.
