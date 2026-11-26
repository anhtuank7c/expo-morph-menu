# Ví dụ mạng xã hội: Murmur

[English](README.md) | **Tiếng Việt**

Một ứng dụng mạng xã hội nhỏ kết hợp `expo-morph-menu` với cấu trúc expo-router thường gặp: tab ở dưới cùng, các màn hình được push trên root stack, một sheet soạn bài có các màn hình lồng bên trong, và luồng đăng nhập. Dữ liệu lấy từ một REST API qua Redux Toolkit và RTK Query, có JWT token, thử lại theo backoff và optimistic update. API là bản giả lập chạy bên trong ứng dụng, nên không truy cập mạng. Tên ứng dụng, giao diện và dữ liệu được tạo riêng cho ví dụ này.

Dùng ví dụ này để tìm hiểu cách đưa menu vào một ứng dụng có tab. API của package được mô tả trong [README gốc](../README.vi.md) và [hướng dẫn tích hợp](../docs/vi/INTEGRATION.md).

## Chạy ứng dụng

Chạy các lệnh từ thư mục gốc của repository. Không chạy `npm install` bên trong `example-social/`.

```bash
npm install
npm run example:social          # expo start trong example-social/
```

Mở bằng Expo Go (Android hoặc iOS), hoặc nhấn `w` để mở bản web. Form đăng nhập đã điền sẵn tài khoản demo (`demo@murmur.app` / `murmur123`, khai báo trong `api/seed.ts`).

Deep link mở thẳng một màn hình soạn bài, ví dụ:

```bash
npx uri-scheme open murmur://compose/poll --android
```

## Nội dung của ứng dụng

| Màn hình | Route | Cách mở |
| --- | --- | --- |
| Đăng nhập | `app/login.tsx` | Hiển thị bởi `Stack.Protected` khi chưa có phiên |
| Network (debug) | `app/dev.tsx` | Icon nhịp tim trên header của tab, hoặc liên kết ở màn đăng nhập |
| Feed, Search, Notifications, Messages | `app/(tabs)/*` | Tab ở dưới cùng |
| Chi tiết bài viết | `app/post/[id].tsx` | Push trên root Stack, từ một bài viết |
| Trang cá nhân | `app/profile/[handle].tsx` | Push trên root Stack, từ avatar hoặc kết quả tìm kiếm |
| Chat | `app/chat/[id].tsx` | Push trên root Stack, từ tab Messages hoặc trang cá nhân |
| New post, Photo, Poll, Go live, New message | `app/compose/*` | Các dòng của menu. Mỗi dòng mở sheet morph |
| Chỉnh ảnh | `app/compose/crop.tsx` | Push bên trong sheet, từ màn chọn ảnh |
| Chat bên trong sheet | `app/compose/thread/[id].tsx` | Push bên trong sheet, từ New message |

## Cấu trúc code

Code được tổ chức theo feature. `app/` chỉ chứa route; mỗi file route re-export một màn hình từ `src/features/<tên>`, còn các layout cấu hình điều hướng và provider.

```
app/                        route: mỗi màn hình một dòng, cùng các layout
  _layout.tsx               Stack gốc, Provider, MorphProvider, ComposeMenu
  (tabs)/_layout.tsx        Tabs với chiều cao nội dung cố định, badge chưa đọc
  compose/_layout.tsx       MorphSheetLayout (sheet)
src/
  core/                     hạ tầng, không chứa code của feature
    http/                   base query: token, refresh, backoff, idempotency, log request
    session/                slice auth: token và vòng đời của chúng
    api/                    API slice của RTK Query (không có endpoint) và kiểu dữ liệu API (dto.ts)
  backend/                  REST server giả lập; ứng dụng chỉ giao tiếp qua fetch
  shared/                   theme, định dạng, Avatar, Media, QueryState, SheetHeader, Separator
  store/                    configureStore, listener, hook có kiểu
  features/
    auth/                   đăng nhập, đăng xuất, người dùng hiện tại; LoginScreen
    posts/                  feed, chi tiết bài viết, like, vote, tạo bài; PostCard, PostList, FeedScreen
    people/                 tìm kiếm, trang cá nhân, follow; SearchScreen, ProfileScreen, PersonRow
    notifications/          thông báo, số chưa đọc; NotificationsScreen
    messages/               hội thoại, thread, gửi tin; MessagesScreen, ChatThread, ChatScreen
    compose/                menu nổi, slice bản nháp, các màn hình trong sheet
    live/                   phát trực tiếp; GoLiveScreen
    devtools/               màn Network
test/api.test.cjs           kịch bản kiểm thử lớp dữ liệu (npm run test:api)
docs/DATA-LAYER.vi.md       base query, refresh token, giả lập lỗi
```

Một feature có tối đa ba phần:

| Thư mục | Nội dung | Phụ thuộc vào |
| --- | --- | --- |
| `api/` | Endpoint thêm bằng `api.injectEndpoints()`, cập nhật cache, hook như `useUnreadMessageCount` | `core` |
| `model/` | State chỉ có ở client và logic thuần (slice bản nháp, thư viện ảnh) | không có |
| `ui/` | Màn hình và component | `api`, `model`, `shared`, feature khác |

Các quy tắc giữ cho phụ thuộc chỉ đi một chiều:

- Mỗi feature export API công khai từ `index.ts`. Feature khác và route import từ đó, không import từ một file bên trong feature khác.
- `core`, `shared` và `backend` không bao giờ import từ `features`.
- Tag được khai báo một lần trong `core/api/api.ts`, nên mutation của một feature có thể invalidate dữ liệu của feature khác (follow một người làm feed "Following" bị invalidate) mà không cần import.
- Màn hình kết hợp nhiều feature nằm trong feature sở hữu luồng đó. "New message" dùng tìm kiếm người và tin nhắn, nên nằm trong `compose`, feature phụ thuộc vào cả hai. Đặt nó trong `messages` sẽ tạo phụ thuộc vòng, vì màn trang cá nhân trong `people` đã phụ thuộc vào `messages`.

## Lớp dữ liệu

Phần tổng quát (mock server, base query có refresh token và backoff, slice `auth` và `network`, màn Network) được mô tả trong [docs/DATA-LAYER.vi.md](docs/DATA-LAYER.vi.md). Ứng dụng này bổ sung:

| State | Vị trí | Ghi chú |
| --- | --- | --- |
| Dữ liệu server | Cache của RTK Query (`src/core/api/api.ts`, endpoint trong `src/features/*/api/`) | Theo endpoint và tham số, dùng chung cho mọi màn hình cần đến |
| Phiên | Slice `auth` | Điều khiển `Stack.Protected` trong `app/_layout.tsx` |
| Bản nháp | Slice `composer` (`src/features/compose/model/`) | Giữ lại khi đóng sheet, xóa sau khi đăng thành công |
| Log request | Slice `network` | Hiển thị trên màn Network |

Cách từng mutation cập nhật cache:

| Mutation | Chiến lược |
| --- | --- |
| `setLike`, `vote` | Optimistic: sửa mọi bản sao của bài viết trong cache (cả hai feed, mọi trang, màn chi tiết, danh sách trả lời, danh sách ở trang cá nhân), hoàn tác khi lỗi, rồi áp dụng số liệu từ server |
| `setFollow` | Optimistic trên user trong cache, làm mới feed "Following" |
| `sendMessage` | Optimistic: tin nhắn hiện ngay với trạng thái "sending". Khi lỗi, tin nhắn ở lại với trạng thái "failed" và có thể gửi lại với cùng client id, server dùng id này để loại trùng |
| `markNotificationsRead`, `markConversationRead` | Optimistic, hoàn tác khi lỗi |
| `createPost` | Pessimistic: chờ server, rồi chèn bài viết server trả về lên đầu cả hai feed |
| `openConversation` | Làm mới danh sách hội thoại (invalidate tag) |

Các tính năng khác của RTK Query được dùng:

- `getFeed` là infinite query phân trang theo cursor. Mỗi tab là một mục cache riêng.
- Polling: màn chat đang mở mỗi 2 giây, tab Messages mỗi 5 giây, badge của tab mỗi 10 và 30 giây. Polling dừng khi màn hình cuối cùng dùng dữ liệu đó unmount.
- `getThread` dùng `merge` để giữ các tin nhắn đang gửi khi có kết quả polling mới.
- `refetchOnFocus` và `refetchOnReconnect`, nối với `AppState` của React Native trong `src/store/index.ts`.
- Khi phiên kết thúc, một listener xóa cache API và bản nháp, để người dùng kế tiếp không thấy dữ liệu của người trước.

## Các mẫu triển khai trong ví dụ

### 1. Menu phía trên tab bar

Tab bar có chiều cao nội dung cố định, và cùng giá trị đó được truyền cho menu, nên nút nằm phía trên tab bar:

```tsx
// src/shared/theme.ts
export const TAB_BAR_HEIGHT = 56;

// app/(tabs)/_layout.tsx
tabBarStyle: { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }

// src/features/compose/ui/ComposeMenu.tsx
<MorphMenu bottomOffset={TAB_BAR_HEIGHT} />
```

`bottomOffset` được cộng với inset dưới của safe area và `layout.margin`.

### 2. Ẩn nút bên ngoài các tab

Nút hiển thị ở bốn màn hình tab và trong lúc một route soạn bài đang mở. Ở các màn hình được push như chat, nút bị ẩn (`src/features/compose/ui/ComposeMenu.tsx`):

```tsx
const TAB_PATHS = new Set(['/', '/search', '/notifications', '/messages']);

export function ComposeMenu() {
  const pathname = usePathname();
  const onTab = TAB_PATHS.has(pathname);
  const inSheet = pathname.startsWith('/compose');
  return <MorphMenu hidden={!onTab && !inSheet} bottomOffset={TAB_BAR_HEIGHT} />;
}
```

Giữ menu hiển thị khi sheet đang mở (`inSheet`), vì card là nơi sheet thu gọn về. `hidden` không có tác dụng khi một route sheet đang hiển thị.

### 3. Hủy và gửi

`closeMenuOnDismiss` giữ giá trị mặc định (`false`), nên nút đóng và thao tác back quay về menu đang mở, người dùng có thể chọn thao tác khác. Sau khi gửi thành công, màn soạn bài đóng cả sheet lẫn menu:

```tsx
const dismiss = useMorphDismiss();

const submit = () => {
  addPost({ text });
  dismiss({ closeMenu: true });
};
```

### 4. Đóng từ một màn hình lồng

Luồng ảnh có hai bước bên trong sheet: `photo` (chọn) và `crop` (chỉnh). Ở `crop`, `router.back()` chỉ quay về `photo`. `useMorphDismiss()` đóng toàn bộ sheet từ bất kỳ màn hình nào trong nhóm.

### 5. Cùng một màn hình ở hai vị trí

`ChatScreen` (`src/features/messages/ui/ChatScreen.tsx`) được dùng bởi hai route:

| Route | Mở từ | Nút back | Nút nổi |
| --- | --- | --- | --- |
| `app/chat/[id].tsx` | Tab Messages, trang cá nhân | Quay về màn hình trước trên root Stack | Bị ẩn |
| `app/compose/thread/[id].tsx` | Menu, New message | Quay về danh sách liên hệ bên trong sheet | Không hiển thị, sheet che toàn màn hình |

Cả hai route đọc cùng một store, nên tin nhắn gửi từ sheet xuất hiện trong tab Messages.

### 6. Slot đổi màu

Nút và card dùng chung một bề mặt. Slot `Background` nội suy màu từ tím (nút) sang trắng (card) theo shared value `progress`. Trong container toàn màn hình (`variant: 'sheet'`), slot luôn màu trắng, nên card và container trùng khớp tại thời điểm chuyển giao:

```tsx
function CardBackground({ variant, progress }: MorphBackgroundProps) {
  const style = useAnimatedStyle(() => ({
    backgroundColor:
      variant === 'sheet' ? '#ffffff' : interpolateColor(progress.value, [0, 0.35], [theme.accent, '#ffffff']),
  }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]} />;
}
```

### 7. Hoãn render nội dung

`ComposePostScreen` chỉ mount ô nhập văn bản, và do đó bàn phím, sau khi `useMorphSettled()` trả về `true`. `PhotoPickerScreen` chỉ render lưới ảnh sau khi sheet đã mở rộng xong.

## Hiệu năng render

Mục tiêu là một thay đổi chỉ render lại các component hiển thị nó. Các kỹ thuật được dùng, và vị trí:

| Kỹ thuật | Vị trí | Tác dụng |
| --- | --- | --- |
| `React.memo` cho dòng của list | `PostCard`, `ConversationRow`, `NoticeRow`, `MessageBubble`, `PersonRow`, `EntryRow` | RTK Query giữ nguyên object không đổi khi fetch lại (structural sharing), và Immer giữ nguyên item không đổi khi patch cache. Một lần like chỉ đổi một object bài viết, nên chỉ một dòng render lại |
| `renderItem`, `keyExtractor` và `ItemSeparatorComponent` khai báo ở cấp module | `PostList`, `MessagesScreen`, `NotificationsScreen` | List nhận cùng props ở mỗi lần component cha render. `ItemSeparatorComponent={() => ...}` viết inline là một kiểu component mới ở mỗi lần render, nên React mount lại mọi separator |
| `selectFromResult` | Badge của tab, tiêu đề chat, `ChatThread`, `ViewerCount`, `ComposePostScreen` | Component chỉ subscribe giá trị nó hiển thị. Mỗi lần poll đổi `isFetching` hai lần kể cả khi dữ liệu không đổi; không có `selectFromResult`, mỗi lần poll đều render lại component subscribe |
| Selector Redux hẹp | `selectCanSubmitPost`, `selectPostLength`, `selectPollOption(index)`, `selectLastAuthError` | Gõ phím trong bản nháp chỉ render ô nhập và bộ đếm; header chỉ render khi trạng thái "có thể đăng" thay đổi. Gõ trong một lựa chọn của poll chỉ render dòng đó |
| `useAppStore` trong event handler | Các màn soạn bài | Handler đăng bài đọc bản nháp từ store lúc chạy, nên màn hình không subscribe bản nháp |
| Mutation dispatch không qua hook | `usePostActions` | Like và vote được dispatch bằng `initiate(arg, { track: false })`. `useSetLikeMutation()` ở mỗi dòng sẽ khiến mỗi dòng subscribe state mutation riêng |
| State cục bộ trong component lá | `ChatComposer`, `SearchField`, `LiveClock`, `TokenCountdown` | Gõ phím, query có debounce và đồng hồ đếm mỗi giây chỉ render một component nhỏ thay vì cả màn hình |
| Object `router` thay cho `useRouter()` | `PostCard` và các dòng khác | Các dòng dùng `router` dạng imperative của expo-router, nên không đọc navigation context |
| Option và hằng số ổn định | `COMPOSE_ITEMS`, `COMPOSE_CONFIG`, `screenOptions` của tab (`useMemo` theo inset), các mảng `EMPTY` | Provider và navigator nhận cùng object giữa các lần render |

Giá trị animation (`progress`, `sheet`, hover) là shared value của Reanimated và chạy trên UI thread, nên bản thân hiệu ứng morph không render component React.

Để kiểm tra số lần render, bật "Highlight updates when components render" trong React DevTools, hoặc ghi lại bằng Profiler. [React Compiler](https://react.dev/learn/react-compiler) có thể tự thêm phần lớn các memoization này (`"experiments": { "reactCompiler": true }` trong `app.json`). Ví dụ này viết tay để từng kỹ thuật hiện rõ trong code.

## Trace theo frame

Chạy Metro với trace được bật và theo dõi các dòng `[morph]` trong log của thiết bị:

```bash
cd example-social
EXPO_PUBLIC_MORPH_TRACE=1 npx expo start
```

Trên emulator Android 17 (API 37, bundle development, giả lập lỗi ở mức "low"), bước đăng nhập và 8 luồng được chạy bằng script, bao gồm mọi dòng của menu, các màn hình lồng, nút back phần cứng, nút bị ẩn và `useMorphDismiss`, ghi được 270 frame và không có cờ `FLICKER`, `HOLE`, `GHOST` hay `OVERLAP` nào.

Sau khi code được tổ chức lại theo feature, một lần chạy thủ công trên cùng emulator (đăng nhập, like, vote, đăng bài, ảnh, poll, live và chat ở cả hai vị trí) cho ra 271 frame, cũng không có cờ nào.

## Chưa bao gồm

- Chưa chạy trên iOS.
- Emulator dùng bàn phím vật lý, nên chưa kiểm tra việc tránh bàn phím ảo trong màn chat.
- Ví dụ này chưa có flow Maestro. Bộ kiểm thử end-to-end nằm trong `example/`. Lớp dữ liệu có bộ kiểm thử riêng: `npm run test:api`.
- Token chỉ lưu trong bộ nhớ, nên khởi động lại ứng dụng sẽ đăng xuất. Ứng dụng production lưu refresh token bằng `expo-secure-store`.
