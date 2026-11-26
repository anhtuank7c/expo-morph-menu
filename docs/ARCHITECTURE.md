# Kiến trúc

Xem kèm `diagrams/architecture.drawio` — trang 1 là bản đồ của toàn bộ tài liệu này.

## Vấn đề

Cách dễ nhất để dựng interaction này là morph mọi thứ trong một `Animated.View`
nổi trên màn hình. Nó đẹp và chạy mượt. Nhưng màn full-screen đó không tồn tại
với hệ thống điều hướng: không push được màn con, không có back cứng Android,
không URL, không deep link, không `beforeRemove`, không khôi phục được trạng
thái. Đó là một modal giả, và nó sụp ngay khi sản phẩm lớn lên.

## Ranh giới

Không phải cái gì trông như "màn hình" cũng nên là route, và ngược lại:

| Thành phần | Là route? | Lý do |
| --- | --- | --- |
| FAB → card menu | **Không** | Affordance tạm thời như context menu. Không ai deep link vào một menu đang mở, cũng không ai muốn thấy nó khi khôi phục phiên. Nhưng nó *phải* nuốt back cứng Android. |
| Card → full-screen | **Có** | Là điểm đến. Cần URL, push màn con, back, state restoration. |

Ranh giới này là toàn bộ bản thiết kế. Mọi thứ còn lại chỉ là hệ quả.

## Cách nối hai nửa

`(sheet)` được khai báo ở Stack gốc là `presentation: 'transparentModal'` với
`animation: 'none'` — tắt animation mặc định vì chính ta lái morph.

Overlay và route không biết gì về nhau. Chúng chỉ chia sẻ bốn shared value
trong `MorphProvider`:

| | Ai sở hữu | Ý nghĩa |
| --- | --- | --- |
| `menu` | overlay | 0 → 1: FAB nở thành card |
| `sheet` | route | 0 → 1: card nở thành full-screen |
| `origin` | overlay ghi, route đọc | rect của card tại thời điểm push |
| `handoff` | route ghi, overlay đọc | route đã layout xong chưa |

`origin` là thứ khiến hai nửa độc lập được với nhau. Hệ quả dễ chịu: deep link
thẳng vào `/(sheet)/camera` vẫn chạy — lúc đó `origin` còn rỗng nên route dùng
`fallbackOrigin()` và nở nhẹ từ giữa màn.

`handoff` là thứ quyết định chất lượng cảm nhận. Route mount bất đồng bộ, nên
nếu overlay tự mờ đi theo tiến trình của route thì sẽ có lúc lọt một frame
trống. Buộc nó vào `onLayout` thật của vỏ sheet thì không bao giờ lọt.

## Mẹo quan trọng nhất: vỏ co giãn, ruột cố định

Xem trang 3 của file diagram.

```tsx
<Animated.View style={shell}>                       // width/height đổi mỗi frame
  <Animated.View style={{ width: W, height: H }}>   // CỐ ĐỊNH, absolute
    <Stack />                                        // không bao giờ bị đo lại
  </Animated.View>
</Animated.View>
```

Nếu để `<Stack/>` co giãn theo vỏ, mỗi frame kéo theo một layout pass trên toàn
bộ cây màn hình — jank thấy rõ trên Android tầm trung. Cho ruột một kích thước
cố định và để `overflow: hidden` cắt bớt thì chỉ còn đúng một node phải đo lại.

Đây là lý do push màn con bên trong vẫn là native-stack thật: swipe-back của
iOS và back cứng của Android là code của Apple/Google chạy trực tiếp, không
phải bản mô phỏng.

## Thoát màn: chặn unmount rồi mới animate

`animation: 'none'` nghĩa là route biến mất tức thì. Phải giữ nó lại:

```tsx
usePreventRemove(!allowLeave, ({ repeat }) => {
  repeatRef.current = repeat;
  sheet.value = withSpring(0, SPRING, (f) => f && runOnJS(setAllowLeave)(true));
});

useEffect(() => {
  if (!allowLeave) return;
  handoff.value = 0;
  closeMenu();
  repeatRef.current?.();   // lặp lại đúng hành động đã bị chặn
}, [allowLeave]);
```

Hợp đồng của `usePreventRemove`: giữ cờ chặn bật cho tới khi animation xong,
rồi tắt cờ và gọi `repeat()`. Dùng `repeat()` thay vì tự `dispatch` lại action
là quan trọng — nó lặp lại đúng hành động gốc, kể cả khi đó là back cứng hay
một `navigate` đi nơi khác.

Mọi đường thoát — nút ×, back cứng Android, `router.back()`, kéo xuống — đều
chảy qua đúng chỗ này. Riêng cử chỉ kéo thì gọi thẳng `goBack()`, và vì spring
chạy tiếp từ giá trị hiện tại của `sheet` nên không có cú giật nối hai animation.

Lưu ý: `usePreventRemove` chỉ bắn khi stack lồng đã ở gốc. Đang ở màn con thì
back pop trong stack lồng và không chạm tới vỏ — đúng như mong muốn.

## Ba hướng đi, vì sao chọn hướng này

**1. Tự lái (bản này).** Không thêm dependency ngoài những thứ Expo đã có. Stack
lồng là native thật. Toàn quyền với hình dạng morph — mà hình dạng chính là
điểm của UI này. Đổi lại phải tự viết phần chặn unmount, đúng ~15 dòng ở trên.

**2. `react-native-screen-transitions`.** Từ bản 3.4 có `navigation.zoom()`, một
helper bounds-driven dựng lại đúng kiểu zoom transition của SwiftUI: từ bounds
của element nguồn sang màn hình đích. Gần như viết hộ toàn bộ bài này. Đổi lại
là thêm dependency và stack chuyển sang dạng JS-driven. Nếu cả app cần nhiều
transition tuỳ biến chứ không riêng chỗ này thì nên chọn.

**3. Shared Element Transitions của Reanimated.** Bản 4.8 (tháng 11/2026) đã đưa
tính năng này thành stable và bật mặc định — ở 4.7.2 cờ
`ENABLE_SHARED_ELEMENT_TRANSITIONS` còn tắt. Chỉ cần gắn `sharedTransitionTag`
trùng nhau ở hai đầu, vẫn giữ nguyên native-stack, và là cách gọn nhất về lượng
code. Rủi ro: mới stable được vài tuần, và đã có issue về back-swipe bị
`usePreventRemove` từ chối làm hỏng shared transition — đúng cơ chế bản này dựa
vào. Project đang ở Reanimated 4.7.1 nên chưa bật. Rất đáng thử song song khi
nâng lên 4.8+, nhưng tôi sẽ không đặt cược interaction chủ đạo vào nó trước vài
bản patch nữa.

Nếu nâng lên 4.8: cờ bật mặc định sẽ xung đột với
`USE_LEGACY_LAYOUT_ANIMATIONS_PROXY` nếu bạn đang dùng.

## Bên native họ làm gì

Hữu ích để biết mình đang bắt chước cái gì. Điểm chung xuyên suốt: **không nền
tảng nào thực sự "di chuyển" element**. Tất cả đều ẩn source, ẩn destination,
vẽ một view thứ ba đè lên, animate nó từ bounds A sang bounds B, rồi tráo lại.

- **UIKit thủ công**: `UIViewControllerAnimatedTransitioning` + `snapshotView`,
  `convert(_:to:)` để quy đổi toạ độ, `UIPercentDrivenInteractiveTransition` cho
  gesture. Tương ứng gần như một-một với bản này: `origin` ≈ snapshot frame, vỏ
  morph ≈ animator, `usePreventRemove` ≈ interactive transition controller.
- **SwiftUI từ iOS 18**: `.matchedTransitionSource(id:in:)` ở nguồn +
  `.navigationTransition(.zoom(sourceID:in:))` ở đích. Chạy cả với
  `NavigationStack` lẫn sheet/fullScreenCover — tức Apple cũng phải giải bài
  toán "morph nhưng vẫn là route".
- **SwiftUI trong một màn**: `matchedGeometryEffect`; iOS 26 thêm
  `GlassEffectContainer` + `glassEffectID(_:in:)`. **Đây mới là thứ video gốc
  dùng** — không phải navigation transition.
- **Android**: `MaterialContainerTransform` phía View;
  `SharedTransitionLayout` + `Modifier.sharedElement` phía Compose, với ràng
  buộc cả hai destination phải nằm trong cùng một layout (thường là bọc
  `NavHost`). Ràng buộc đó giống hệt cái ta gặp ở RN — Compose cũng giữ cả hai
  trong một cây và animate bounds, chứ không chuyển element giữa hai màn.

Điều đáng rút ra: với **đúng** interaction này, một iOS dev sẽ không dùng shared
element transition. Họ dùng `glassEffectID` trong một view, vì FAB → card →
detail là một bề mặt liên tục chứ không phải hai màn độc lập. Shared element
sinh ra để nối hai màn vốn tồn tại riêng rẽ. Bản này phải gộp cả hai nhu cầu,
và đó chính xác là việc `origin` + `usePreventRemove` đang làm.

## Còn thiếu gì trước khi vào app thật

- **Xoay màn hình.** `origin` lưu toạ độ tuyệt đối, nên xoay lúc sheet đang mở
  sẽ làm rect cũ sai. Rẻ nhất: lưu kèm `W/H` lúc chụp rồi quy đổi, hoặc khoá
  xoay cho nhóm route này.
- **Nhiều điểm gọi menu.** Hiện `origin` là một rect đơn. Nếu app có nhiều chỗ
  mở sheet thì nâng thành stack nhỏ theo route key.
- **Accessibility.** Đã có `accessibilityViewIsModal` trên vỏ và
  `accessibilityRole` trên các dòng; rê-để-chọn luôn có đường thay thế bằng
  chạm từng dòng. Còn thiếu: thông báo khi menu mở/đóng cho screen reader.
- **Reduce Motion.** Đã tôn trọng qua `ReduceMotion.System` trong `springs.ts`.
- **Lồng sâu hơn.** Nếu stack lồng có tab hoặc modal riêng, cần xem lại chỗ
  `usePreventRemove` — nó chỉ bắn khi stack lồng đã ở gốc.
