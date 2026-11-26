# Morphing Menu — Expo

Dựng lại interaction "Expandable Floating Menu" của SwiftUI bằng Expo, nhưng
với điều hướng thật: màn full-screen là một route, bên trong push được màn con,
back cứng Android và deep link đều chạy.

```
nút "+"  ──morph──▶  card menu  ──push──▶  route full-screen  ──push──▶  màn con
   ◀──────────────────── morph ngược ◀─── usePreventRemove ◀──────────────┘
```

## Chạy

```bash
npm install
npx expo start
```

Cần development build hoặc simulator — `expo-glass-effect`, `expo-haptics` và
`expo-blur` là native module nên Expo Go không chạy được:

```bash
npx expo run:ios      # hoặc
npx expo run:android
```

Kiểm tra nhanh mà không cần chạy máy:

```bash
npm run typecheck
```

### E2E + kiểm tra flicker (Android, Maestro)

`.maestro/` có 6 flow: mở/đóng menu (scrim, back cứng); mở full screen rồi
đóng bằng nút ×, back cứng, kéo xuống (Android: không đóng), qua màn con; và
vuốt cạnh trái (chỉ iOS, chưa chạy thử). Mọi flow đóng full screen đều kiểm
menu **vẫn mở** sau đó (`closeMenuOnDismiss = false`). Maestro chỉ kiểm hành
vi; flicker nằm dưới tầm screenshot nên được bắt bằng trace từng frame
(`morph/trace.tsx`), in ra logcat rồi `scripts/e2e.mjs` quét.

```bash
npm run start:trace    # Metro với EXPO_PUBLIC_MORPH_TRACE=1 (terminal 1)
npm run e2e            # Maestro + quét trace          (terminal 2)
npm run e2e -- .maestro/02-sheet-close-button.yaml   # một flow
```

Trượt khi một flow trượt HOẶC trace có `FLICKER` / `HOLE` / `GHOST`; trace đầy
đủ ở `e2e-trace.log`, kèm số frame rớt (`DROP`). Cần: thiết bị trong `adb
devices` có Expo Go, Maestro (`~/.maestro/maestro/bin`), Java 17+ (`JAVA_HOME`,
mặc định thử JBR của Android Studio). Script tự dùng IP LAN cho `exp://…`.

| Biến | Dùng khi |
|---|---|
| `ANDROID_SERIAL` | có nhiều thiết bị, ví dụ `emulator-5554` |
| `METRO_PORT` | Metro không ở 8081, ví dụ chạy song song `npm run start:trace -- --port 8082` |
| `METRO_URL` | đặt hẳn URL Expo Go |

Đo độ mượt thật thì dùng bundle production — rớt frame ở bản dev gần như vô nghĩa:

```bash
npm run start:trace -- --port 8083 --no-dev --minify
ANDROID_SERIAL=emulator-5554 METRO_PORT=8083 npm run e2e
```

Expo Go cache bundle production: nếu trace cho thấy code cũ, xoá dữ liệu Expo
Go (`adb shell pm clear host.exp.exponent`) rồi chạy lại.

### Cấu hình

`morph/config.ts` — mặc định theo platform, ghi đè qua `MorphProvider`
(`app/_layout.tsx`):

```tsx
<MorphProvider
  config={{
    closeMenuOnDismiss: true,          // mặc định false: đóng full screen xong menu vẫn mở
    radius: Platform.select({ ios: { card: 28 }, android: { card: 16 } }),
    shadow: { elevation: 6 },          // Android: elevation; iOS: color/opacity/radius/offsetY
    dismiss: { dragDown: false },      // iOS mặc định: edgeSwipe + dragDown; Android: không cử chỉ
  }}
>
```

| | iOS | Android |
|---|---|---|
| `closeMenuOnDismiss` | `false` | `false` |
| `radius.card` / `radius.sheet` | 28 / 0 | 28 / 0 |
| `shadow` | opacity 0.18, radius 18, offsetY 8 | elevation 10 |
| `dismiss.edgeSwipe` | ✓ (chỉ ở màn gốc của sheet) | — (cạnh trái là back của hệ thống) |
| `dismiss.dragDown` | ✓ | — |
| Nút × / back cứng | nút × | nút × + back cứng |

Deep link vào thẳng route detail:

```bash
npx uri-scheme open morphmenu://sheet/audio --ios
```

## Hai cách thử để thấy khác biệt

1. **Giữ "+" rồi rê xuống một dòng và nhả.** Dữ liệu được nạp từ lúc ngón tay
   rê qua, nên màn mở ra đã có sẵn nội dung — badge sẽ ghi "chờ 0ms".
2. **Chạm "+" rồi chạm nhanh một dòng.** Không có pha rê để tranh thủ, bạn sẽ
   thấy skeleton và badge ghi thời gian chờ thật.

Đó là minh hoạ sống của luận điểm chính: nút thắt không nằm ở animation mà ở
chi phí dựng nội dung.

## Tài liệu

| File | Nội dung |
| --- | --- |
| `docs/ARCHITECTURE.md` | Ranh giới route, mẹo vỏ/ruột, cơ chế thoát màn, so sánh 3 hướng đi |
| `docs/PERFORMANCE.md` | 5 điểm tối ưu xếp theo tác động, cách đo, cái gì nên bỏ qua |
| `docs/diagrams/architecture.drawio` | 4 trang: ranh giới route · vòng đời morph · vỏ-ruột · mô hình luồng |

Mở file `.drawio` bằng app.diagrams.net hoặc extension Draw.io Integration
trong VS Code.

## Cấu trúc

```
app/
  _layout.tsx            Stack gốc + MorphingMenu nằm NGOÀI navigator
  index.tsx              màn chính
  (sheet)/
    _layout.tsx          vỏ morph + Stack lồng
    [key].tsx            màn gốc của sheet
    child.tsx            màn con, push bằng native-stack
components/
  MorphingMenu.tsx       overlay FAB → card, hit-test, prefetch khi hover
  Surface.tsx            Liquid Glass → BlurView → View đặc
  Skeleton.tsx           giữ chỗ trong lúc vỏ đang nở
morph/
  geometry.ts            hằng số layout + phép tính rect dùng chung
  MorphProvider.tsx      4 shared value nối overlay với route
  SettledContext.ts      cờ "vỏ đã đứng yên" để hoãn mount phần nặng
  springs.ts             cấu hình spring + Reduce Motion
data/
  items.ts               danh sách menu
  sheetData.ts           lớp dữ liệu giả, có prefetch
```

## Phiên bản

Expo SDK 58 · React Native 0.88 · React 19.3 · Reanimated 4.7 ·
Gesture Handler 3.3 · react-native-screens 4.30.

Nếu bạn nâng hoặc hạ SDK, chạy `npm run fix-deps` (`expo install --fix`) để
Expo tự chỉnh các native module về đúng phiên bản của SDK đó.

## Đã kiểm chứng tới đâu

- `tsc --noEmit` sạch.
- `expo export` bundle thành công cho **cả iOS và Android**, nên không có lỗi
  import hay lỗi cú pháp nào.
- **Chưa chạy trên máy thật.** Những chỗ đáng soi đầu tiên khi bạn chạy:
  thứ tự `usePreventRemove` → `repeat()` khi thoát, và việc xoay màn hình lúc
  sheet đang mở (`origin` lưu toạ độ tuyệt đối — xem phần "Còn thiếu gì" trong
  ARCHITECTURE.md).
