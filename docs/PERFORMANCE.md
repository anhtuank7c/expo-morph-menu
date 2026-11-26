# Hiệu năng

Xem kèm trang 3 và 4 của `diagrams/architecture.drawio`.

## Trước hết: đặt câu hỏi cho đúng

Cú push của native-stack chạy **đúng đoạn code hệ thống** mà một app Swift hay
Kotlin dùng — `react-native-screens` dựng `UINavigationController` và Fragment
thật, không mô phỏng. Nó không đi qua JS, cũng không qua Reanimated.

Nghĩa là overlay "mượt hơn" không phải vì animation rẻ hơn, mà vì **nó không
phải mount gì cả**. Khi bạn mount cùng một nội dung vào overlay, chi phí y hệt.
Biến số thật luôn là chi phí dựng nội dung, không phải cơ chế điều hướng.

Giữ điều đó trong đầu khi đọc danh sách dưới đây — nó giải thích vì sao mục 1
quan trọng hơn tất cả phần còn lại cộng lại.

---

## 1. Chi phí mount màn đích

Animation chạy đủ 120fps nhưng màn hiện ra trống một hai frame rồi nội dung mới
nhảy vào. Người dùng gọi đó là "lag"; profiler báo mọi thứ bình thường. Hai bên
đang nói về hai thứ khác nhau.

### 1a. Prefetch ngay khi ngón tay rê lên dòng · ĐÃ LÀM

Món quà riêng của interaction này: ta biết người dùng sắp chọn gì **trước khi
họ nhả tay** 150–400ms. `useAnimatedReaction` trên `hovered` vốn đã có sẵn để
bắn haptic, chỉ cần gắn thêm một việc:

```tsx
// components/MorphingMenu.tsx
const onHover = useCallback((index: number) => {
  const item = ITEMS[index];
  if (!item) return;
  Haptics.selectionAsync();
  prefetchSheet(item.key);          // ← react-query / SWR / router.prefetch
}, []);

useAnimatedReaction(
  () => hovered.value,
  (cur, prev) => { if (cur !== prev && cur >= 0) runOnJS(onHover)(cur); },
);
```

Rẻ, không rủi ro, và thường xoá sạch khoảng trống đầu màn. Nếu chỉ làm được một
việc trong cả tài liệu này thì làm việc này. Badge trong màn detail hiển thị
thời gian chờ thật để bạn thấy hiệu quả ngay.

### 1b. Hoãn phần nặng tới sau khi morph xong · ĐÃ LÀM

Trong lúc vỏ đang nở chỉ cần header + skeleton:

```tsx
// app/(sheet)/_layout.tsx
sheet.value = withSpring(1, SPRING, (f) => { 'worklet'; if (f) runOnJS(setSettled)(true); });
// cờ đi xuống màn hình qua SettledContext
```

Đừng dùng `InteractionManager.runAfterInteractions` cho việc này — nó không
biết gì về spring của Reanimated.

---

## 2. Shadow trên view đang đổi kích thước · ĐÃ SỬA

Đây là lỗi thật trong bản đầu: shadow không bị animate, nhưng **bounds thì có**,
và shadow phải dựng lại theo bounds mới ở mỗi frame. Cộng với `overflow: hidden`
+ `borderRadius` đang cắt view con, ta có đúng cặp đôi gây offscreen render
trên iOS.

```tsx
const shadow = restShadow(p); // morph/geometry.ts: 1 ở hai đầu, 0 khi bay
return { /* ... */ shadowOpacity: 0.18 * shadow, elevation: 10 * shadow };
```

Bản đầu dùng công tắc `flying ? 0 : 0.18`. Nó gây một cú nháy khi đóng: card
overlay vừa hiện lại với shadow đầy, frame sau đã bắt đầu thu về FAB và shadow
tắt phụt. `restShadow` ramp trong 10% ở mỗi đầu, lúc bounds gần như đứng yên.

Trên iOS, overlay không bao giờ bị animate opacity (`OVERLAY_BELOW_ROUTE`):
modal đã nằm đè lên nó, còn GlassView/BlurView vẽ sai khi alpha < 1.

Giữa chừng gần như không ai thấy shadow, nên cái giá về thẩm mỹ bằng không.

Cách triệt để hơn nếu shadow bắt buộc phải thấy xuyên suốt: tách nó ra một view
anh em **không đổi kích thước**, chỉ `transform`.

**Bẫy:** đừng với tay tới `shouldRasterizeIOS` ở đây. Rasterize một view đang
đổi kích thước nghĩa là raster lại mỗi frame — tệ hơn hẳn.

**Đo:** Instruments → Core Animation → bật *Color Offscreen-Rendered Yellow*.
Vỏ sheet vàng rực trong lúc morph là đã trúng. Android: Perfetto, soi thời gian
`saveLayer`.

---

## 3. Giao ca bám vào layout thật, không bám vào tiến trình · ĐÃ SỬA

Route mount bất đồng bộ. Nếu overlay mờ đi theo `sheet.value` thì khi commit
đầu tiên của route trễ một frame, bạn được một frame trống — hiếm, nhưng lọt
đúng lúc người dùng đang nhìn chăm chú nhất.

```tsx
// (sheet)/_layout.tsx
<Animated.View style={shell} onLayout={() => { handoff.value = 1; }} />

// MorphingMenu.tsx
opacity: handoff.value ? 0 : 1,
```

Sửa chất lượng cảm nhận, không phải fps. Nhưng là loại lỗi người dùng không
chỉ ra được tên, chỉ thấy "hơi rẻ tiền".

### 3b. Chiều về: giao ca trên UI thread + crossfade · ĐÃ SỬA

Bản đầu bị "card trống rồi giật" khi đóng, rõ nhất ở bản dev:

- `setSettled(false)` lúc bắt đầu đóng → React gỡ ScrollView, dựng Skeleton
  đúng frame đầu animation.
- Nội dung mờ hết ở `p = 0.6`, nên nửa sau vỏ chỉ là khối trắng trống.
- Giao ca (`handoff = 0`, `menu → 0`) chạy trong `useEffect` sau
  `runOnJS(setAllowLeave)`: chờ một vòng render JS mới hiện card menu.

Giờ thì `handoff` có 3 trạng thái (`HANDOFF.MENU | ROUTE | RETURNING`). Vỏ
vẽ lại mặt card (`components/MenuFace.tsx`) ở góc dưới-phải: nội dung mờ ở
`p ∈ [0.4, 0.75]`, mặt card hiện ở `p ∈ [0.15, 0.5]`, nên vỏ không bao giờ
trống. Khi vỏ nhỏ, nội dung bị đẩy lên `insets.top` (chỉ transform), để phần
lộ ra không phải dải status bar trống. Lúc đóng, vỏ và card overlay chỉ
crossfade ở đoạn cuối `p ∈ [0, 0.12]`.

### 3c. Flicker đo bằng trace từng frame · ĐÃ SỬA

`morph/trace.tsx` ghi `menu`, `sheet`, `handoff` và opacity THỰC của overlay
và vỏ mỗi frame, lấy từ cùng các hàm mà style dùng (`morph/visibility.ts`).
Mọi lỗi dưới đây đều đo được trên Android trước khi sửa:

| Triệu chứng | Nguyên nhân | Sửa |
|---|---|---|
| Card cũ chớp lên khi đóng | `finished` đặt `handoff = MENU` khi route còn chờ JS pop → vỏ bật về opacity 1 | Giữ `RETURNING` tới sau unmount; commit kế tiếp mới đặt lại `MENU` |
| Card khựng ~115ms trước khi thu về FAB | Spring hơi vượt quá 0 rồi lắc ~7 frame mới báo `finished` | `useAnimatedReaction`: thu ngay khi `sheet ≤ 0.005` |
| Chạm × không đóng; sheet hơi xám rồi sáng lên | Overlay vẫn `open` khi route hiện: scrim nằm trên route (Android) nuốt cú chạm | `mode: closed / open / route`; `scrimGate` mờ scrim khi route nhận chỗ |
| Back cứng đóng menu ẩn thay vì đóng sheet | `BackHandler` của menu vẫn đăng ký khi route hiện | Như trên |
| Kéo xuống dài: vỏ và card đổi chỗ trong một frame | `sheet` chạm 0 khi `handoff` còn `ROUTE` | Sàn 0.35 cho cử chỉ kéo |
| Chạm FAB hơi lâu tự mở sheet "Check In", vỏ lệch card | Điểm FAB nằm trong dòng cuối của card; `hitTest` chọn nó khi nhả tay | Chạm-nhả tại chỗ không bao giờ chọn dòng |
| Rê nhanh rồi nhả: vỏ mọc ở rect card đầy đủ khi card mới nở 79% | Push trước khi card nở xong | Giữ lệnh chọn tới khi `menu ≥ 0.995` |
| Shadow sáng rồi tắt phụt lúc giao ca | Công tắc `flying ? 0 : 0.18` | `restShadow`: ramp 10% ở hai đầu |
| (iOS) Card kính nháy khi hiện lại | Animate opacity trên `UIVisualEffectView` | `OVERLAY_BELOW_ROUTE`: không đụng opacity overlay trên iOS |
| Chữ trên card in đúp, nhoè lúc đóng (ảnh chụp giữa chừng trên AVD) | Crossfade vỏ ↔ overlay ở `p ∈ [0, 0.12]`: hai lớp nửa trong suốt khi vỏ còn to hơn card vài dp; rớt frame làm crossfade thành cú cắt lệch | Bỏ crossfade: CẮT đúng frame `sheet ≤ ARRIVED` (0.005, lệch < 1dp), cả hai lớp đọc cùng `sheet` trên UI thread (`morph/visibility.ts`). Tracer gắn `GHOST` nếu tái phát |

Kết quả `npm run e2e` (5 flow), ngày 2026-11-26:

| Thiết bị | Bundle | Frame | Rớt frame | FLICKER / HOLE / GHOST |
|---|---|---|---|---|
| AVD Pixel API 37 (Android 17) | `--no-dev --minify` | 468 | 0 | 0 |
| AVD Pixel API 37 (Android 17) | dev, khởi động lạnh mỗi flow | 455 | 16 | 0 |
| MEmu (Android 9) | dev, trước khi bỏ crossfade | 481 | — | 0 |

Rớt frame chỉ xuất hiện ở bản dev ngay sau khi tải bundle (JIT, shader); bản
production đo được 0.

Kiểm tra lại: `npm run start:trace` rồi `npm run e2e` (xem README).

---

## 4. `width`/`height` so với `transform` · CỐ Ý KHÔNG LÀM

Mỗi frame của vỏ là một lần cập nhật prop layout đi qua shadow tree. Mẹo ruột
cố định đã chặn phần đắt nhất là layout cả cây con, nhưng node vỏ vẫn phải đo lại.

Phương án thuần transform: tách **hình dạng** khỏi **nội dung**. Một layer nền
trơn chỉ có màu, phóng bằng `scaleX/scaleY` — gần như miễn phí trên GPU. Nội
dung ở layer anh em, chỉ `translate` và đổi opacity, không bao giờ bị scale.

Cái giá: scale một hình bo góc làm méo bán kính thành elip. Bù thì phải animate
ngược `borderRadius`, mà prop đó cũng cập nhật mỗi frame và kéo theo dựng lại
mask — lợi ích teo đi đáng kể. Với animation ~460ms và bán kính 28pt, mắt
thường gần như không bắt được độ méo, nên "chấp nhận méo" là lựa chọn thực dụng
nếu bạn vẫn muốn đi hướng này.

**Vì sao chưa làm:** lợi ích nhỏ hơn mục 2 nhiều lần, và React Native 0.85 đã
có bản preview của Shared Animation Backend — làm cùng Software Mansion, chạy
cho cả Animated lẫn Reanimated — cho phép animate thuộc tính layout bằng native
driver. Vỏ morph animate `width`/`height`, tức chính xác loại prop đó. Viết lại
sang kiến trúc scale phức tạp để né một chi phí mà nền tảng đang chuẩn bị xoá
hộ thì không đáng.

Nếu hình dạng là điểm bán hàng của sản phẩm và bạn cần trần cao nhất: vẽ bằng
Skia. Nội suy rounded rect trên canvas GPU, không view nào phải đo lại, và làm
được cả kiểu morph metaball của Liquid Glass. Đổi lại là một dependency nặng,
và nội dung vẫn phải là view RN thật xếp chồng lên trên.

---

## 5. Bề mặt kính

`components/Surface.tsx` chọn theo thứ tự: Liquid Glass thật của iOS 26+
(`expo-glass-effect`) → `BlurView` → View đặc.

Blur là hiệu ứng đắt, và đắt hơn nhiều trên Android. Mặc định chỉ bật từ iOS.
Nếu cần trên Android thì phải `experimentalBlurMethod="dimezisBlurView"`, và
nên đo trước — đây là chỗ dễ mất 10–15fps nhất trên máy tầm trung.

---

## Thứ tự nên làm khi bạn mở rộng bản này

1. Giữ nguyên 1a và 2 — rẻ nhất, hiệu quả rõ nhất, đã có sẵn.
2. Đo trên **máy Android yếu nhất trong danh sách hỗ trợ**, bản **release**.
   Profile animation ở bản debug trong RN gần như vô nghĩa.
3. Chỉ khi vẫn rớt frame mới tính tới transform hoặc Skia.

Thước đo đáng tin: Instruments → Animation Hitches trên iOS; `adb shell
dumpsys gfxinfo <package> framestats` hoặc Perfetto trên Android. Đừng tin cảm
giác, và càng đừng tin FPS counter của dev menu.
