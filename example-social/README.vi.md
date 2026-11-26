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

```
app/
  _layout.tsx              root Stack, MorphProvider, MorphMenu, store
  (tabs)/_layout.tsx       Tabs với chiều cao nội dung cố định
  (tabs)/index.tsx         feed
  (tabs)/search.tsx
  (tabs)/notifications.tsx
  (tabs)/messages.tsx
  post/[id].tsx
  profile/[handle].tsx
  chat/[id].tsx
  compose/_layout.tsx      MorphSheetLayout (sheet)
  compose/post.tsx
  compose/photo.tsx        bước 1/2
  compose/crop.tsx         bước 2/2, push bên trong sheet
  compose/poll.tsx
  compose/live.tsx
  compose/message.tsx      chọn người nhận
  compose/thread/[id].tsx  chat push bên trong sheet
  login.tsx                đăng nhập (Stack.Protected)
  dev.tsx                  màn debug mạng và phiên
api/
  server.ts                REST backend giả lập: route trên các bản ghi mẫu
  seed.ts                  bản ghi ban đầu của server, tài khoản demo
  types.ts                 cấu trúc response (DTO)
  murmurApi.ts             endpoint RTK Query, tag, optimistic update
store/
  index.ts                 configureStore, listener middleware, focus theo AppState
  composerSlice.ts         bản nháp của các màn soạn bài (state chỉ ở client)
components/                Avatar, Media, PostCard, ChatThread, SheetHeader, QueryState
theme.ts                   màu sắc, chiều cao tab bar
```

## Lớp dữ liệu

Phần tổng quát (mock server, base query có refresh token và backoff, slice `auth` và `network`, màn Network) được mô tả trong [example-shared/README.vi.md](../example-shared/README.vi.md). Ứng dụng này bổ sung:

| State | Vị trí | Ghi chú |
| --- | --- | --- |
| Dữ liệu server | Cache của RTK Query (`api/murmurApi.ts`) | Theo endpoint và tham số, dùng chung cho mọi màn hình cần đến |
| Phiên | Slice `auth` | Điều khiển `Stack.Protected` trong `app/_layout.tsx` |
| Bản nháp | Slice `composer` | Giữ lại khi đóng sheet, xóa sau khi đăng thành công |
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
- `refetchOnFocus` và `refetchOnReconnect`, nối với `AppState` của React Native trong `store/index.ts`.
- Khi phiên kết thúc, một listener xóa cache API và bản nháp, để người dùng kế tiếp không thấy dữ liệu của người trước.

## Các mẫu triển khai trong ví dụ

### 1. Menu phía trên tab bar

Tab bar có chiều cao nội dung cố định, và cùng giá trị đó được truyền cho menu, nên nút nằm phía trên tab bar:

```tsx
// theme.ts
export const TAB_BAR_HEIGHT = 56;

// app/(tabs)/_layout.tsx
tabBarStyle: { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }

// app/_layout.tsx
<MorphMenu bottomOffset={TAB_BAR_HEIGHT} />
```

`bottomOffset` được cộng với inset dưới của safe area và `layout.margin`.

### 2. Ẩn nút bên ngoài các tab

Nút hiển thị ở bốn màn hình tab và trong lúc một route soạn bài đang mở. Ở các màn hình được push như chat, nút bị ẩn:

```tsx
const TAB_PATHS = new Set(['/', '/search', '/notifications', '/messages']);

function FloatingMenu() {
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

`components/ChatThread.tsx` được dùng bởi hai route:

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

`compose/post.tsx` chỉ mount ô nhập văn bản, và do đó bàn phím, sau khi `useMorphSettled()` trả về `true`. `compose/photo.tsx` chỉ render lưới ảnh sau khi sheet đã mở rộng xong.

## Trace theo frame

Chạy Metro với trace được bật và theo dõi các dòng `[morph]` trong log của thiết bị:

```bash
cd example-social
EXPO_PUBLIC_MORPH_TRACE=1 npx expo start
```

Trên emulator Android 17 (API 37, bundle development, giả lập lỗi ở mức "low"), bước đăng nhập và 8 luồng được chạy bằng script, bao gồm mọi dòng của menu, các màn hình lồng, nút back phần cứng, nút bị ẩn và `useMorphDismiss`, ghi được 270 frame và không có cờ `FLICKER`, `HOLE`, `GHOST` hay `OVERLAP` nào.

## Chưa bao gồm

- Chưa chạy trên iOS.
- Emulator dùng bàn phím vật lý, nên chưa kiểm tra việc tránh bàn phím ảo trong màn chat.
- Ví dụ này chưa có flow Maestro. Bộ kiểm thử end-to-end nằm trong `example/`. Lớp dữ liệu có bộ kiểm thử riêng: `npm run test:api`.
- Token chỉ lưu trong bộ nhớ, nên khởi động lại ứng dụng sẽ đăng xuất. Ứng dụng production lưu refresh token bằng `expo-secure-store`.
