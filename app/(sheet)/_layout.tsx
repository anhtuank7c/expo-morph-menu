/**
 * Vỏ morph cho cả nhóm route `(sheet)`.
 *
 * Mấu chốt kiến trúc: khối animate chỉ là **vỏ ngoài**. `<Stack />` lồng bên
 * trong nằm trong một View **cố định W × H**, absolute ở góc trên-trái. Vỏ co
 * giãn mỗi frame, navigator bên trong không đổi kích thước nên Yoga không phải
 * đo lại cả cây — nó chỉ bị `overflow: hidden` cắt bớt. Nhờ vậy push/pop màn
 * con vẫn là native-stack thật: animation native, back gesture native, back
 * cứng Android, deep link đầy đủ.
 *
 * Mở: vỏ nở từ đúng rect card menu ra full screen.
 * Đóng: vỏ thu về đúng rect card; menu ở lại mở hay thu tiếp về FAB là do
 * `config.closeMenuOnDismiss` (overlay lo, xem components/MorphingMenu.tsx).
 */

import { Stack, useNavigation, usePreventRemove, useSegments } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuFace } from '../../components/MenuFace';
import { fallbackOrigin, restShadow } from '../../morph/geometry';
import { HANDOFF, useMorph } from '../../morph/MorphProvider';
import { SettledContext } from '../../morph/SettledContext';
import { SPRING } from '../../morph/springs';
import { shellOpacity } from '../../morph/visibility';

/** Quãng kéo xuống để vỏ co từ 1 về sàn. */
const DRAG_DISTANCE = 260;
/** Bề rộng dải cạnh trái nhận cử chỉ vuốt (giống back gesture của iOS). */
const EDGE_WIDTH = 24;
/**
 * Sàn của cử chỉ: kéo/vuốt dài tới đâu vỏ cũng không co hẳn về card. Không có
 * sàn, `sheet` chạm 0 khi handoff còn ROUTE, lúc nhả tay vỏ và overlay đổi chỗ
 * trong một frame khi vỏ chưa trùng card (trace: f=489→490).
 */
const GESTURE_FLOOR = 0.35;
/** Nhả tay dưới ngưỡng này (hoặc vuốt nhanh) thì đóng, không thì bật lại. */
const DISMISS_AT = 0.78;
const FLING_VELOCITY = 900;

export default function SheetLayout() {
  // KHÔNG dùng useWindowDimensions: trên Android edge-to-edge, "window" không
  // tính thanh điều hướng (có máy còn trừ cả status bar), vỏ nở thiếu và hở
  // một dải dưới đáy. Frame của SafeAreaProvider là kích thước thật của root
  // view, cùng hệ toạ độ với `insets`.
  const { width: W, height: H } = useSafeAreaFrame();
  const { sheet, origin, handoff, config, sheetDismissed } = useMorph();
  const insets = useSafeAreaInsets();
  const topInset = insets.top;
  const navigation = useNavigation();
  const segments = useSegments();

  /** Khi true, thôi chặn và cho điều hướng đi tiếp. */
  const [allowLeave, setAllowLeave] = useState(false);
  /** Chỉ mount nội dung nặng khi vỏ đã đứng yên. */
  const [settled, setSettled] = useState(false);
  const repeatRef = useRef<(() => void) | null>(null);
  /** Đã bắt đầu rời đi: chặn chạy morph ngược hai lần và chặn onLayout muộn. */
  const leavingRef = useRef(false);

  /* --- vào màn: nở từ rect card ra full screen --------------------------- */
  useEffect(() => {
    // Deep link mở lại sau một lần đóng: handoff còn RETURNING từ lần trước.
    if (handoff.value === HANDOFF.RETURNING) handoff.value = HANDOFF.MENU;
    sheet.value = 0;
    sheet.value = withSpring(1, SPRING, (finished) => {
      'worklet';
      if (finished) runOnJS(setSettled)(true);
    });
    return () => {
      // KHÔNG đụng handoff ở đây. Trên Android react-native-screens gỡ view
      // native bất đồng bộ, vỏ có thể còn trên màn thêm một frame sau cleanup;
      // đặt MENU lúc này làm shellOpacity bật vỏ về 1 → card cũ chớp lên
      // (trace: `h 2 → 0, sh 0 → 1 JUMP`). RETURNING với sheet = 0 đã cho
      // overlay = 1, vỏ = 0 — đúng trạng thái nghỉ. Overlay đặt lại MENU khi
      // commit lần sau.
      sheet.value = 0;
    };
  }, [sheet, handoff]);

  /* --- ra màn: chặn unmount, thu về card, rồi mới cho đi tiếp -------------
     Hợp đồng của usePreventRemove: giữ cờ chặn bật cho tới khi animation xong,
     sau đó tắt cờ và gọi `repeat()` để lặp lại đúng hành động đã bị chặn. Mọi
     đường thoát — nút ×, back cứng, router.back(), vuốt cạnh, kéo xuống — đều
     chảy qua đây, nên chỉ có một chỗ duy nhất lo việc đảo chiều morph.      */
  usePreventRemove(!allowLeave, ({ repeat }) => {
    repeatRef.current = repeat;
    // Chạm × hai lần / back + × cùng lúc: chỉ chạy morph ngược một lần.
    if (leavingRef.current) return;
    leavingRef.current = true;
    // KHÔNG setSettled(false) ở đây: nó bắt React gỡ ScrollView và dựng lại
    // Skeleton đúng frame đầu của animation đóng, chính là cú khựng. Nội dung
    // đang mờ dần theo `contentStyle`, cứ để nguyên cho tới lúc pop.
    handoff.value = HANDOFF.RETURNING;
    sheet.value = withSpring(0, SPRING, (finished) => {
      'worklet';
      if (!finished) return;
      // `handoff` CỐ Ý giữ nguyên RETURNING, kể cả sau unmount: đặt MENU ở đây
      // làm vỏ bật lại opacity 1 trong khi route còn chờ JS pop thêm vài frame
      // (trace: `sh 0 → 1 JUMP`). Phần của overlay (menu ở lại / thu về FAB)
      // đã chạy trên UI thread từ frame vỏ chạm card.
      runOnJS(setAllowLeave)(true);
    });
  });

  useEffect(() => {
    if (!allowLeave) return;
    sheetDismissed(); // chỉ đồng bộ state JS của overlay
    repeatRef.current?.();
  }, [allowLeave, sheetDismissed]);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  /* --- cử chỉ đóng (bật/tắt theo config.dismiss, mặc định theo platform) ---
     iOS: vuốt từ cạnh trái + kéo xuống. Android: không có cử chỉ — nút × và
     back cứng. Cả hai cử chỉ chỉ lái `sheet` theo ngón tay; nhả tay thì
     goBack() → usePreventRemove ở trên, spring chạy tiếp từ giá trị hiện tại
     nên không có cú giật nối giữa cử chỉ và animation.

     Vuốt cạnh trái chỉ bật khi stack bên trong đang ở màn gốc. Ở màn con,
     cạnh trái là của back gesture native của stack đó (pop về màn gốc).    */
  const atStackRoot = segments[segments.length - 1] === '[key]';
  const { edgeSwipe, dragDown } = config.dismiss;

  // useMemo: không có nó, mỗi lần layout re-render (settled, allowLeave…) lại
  // tạo gesture mới và GestureDetector phải gắn lại handler.
  const gesture = useMemo(() => {
    const release = (velocity: number) => {
      'worklet';
      if (sheet.value < DISMISS_AT || velocity > FLING_VELOCITY) runOnJS(goBack)();
      else sheet.value = withSpring(1, SPRING);
    };
    const follow = (distance: number, span: number) => {
      'worklet';
      sheet.value = Math.max(1 - Math.max(distance, 0) / span, GESTURE_FLOOR);
    };

    const edge = Gesture.Pan()
      .enabled(edgeSwipe && atStackRoot)
      .hitSlop({ left: 0, width: EDGE_WIDTH })
      .activeOffsetX(12)
      .failOffsetY([-16, 16])
      .onUpdate((e) => follow(e.translationX, W * 0.6))
      .onEnd((e) => release(e.velocityX));

    // Kéo xuống: vẫn chạy cả khi đã drill vào màn con, giống sheet của iOS.
    const drag = Gesture.Pan()
      .enabled(dragDown)
      .activeOffsetY(12)
      .failOffsetY(-12)
      .onUpdate((e) => follow(e.translationY, DRAG_DISTANCE))
      .onEnd((e) => release(e.velocityY));

    return Gesture.Race(edge, drag);
  }, [sheet, goBack, edgeSwipe, dragDown, atStackRoot, W]);

  /* --- vỏ morph: rect card ↔ full screen ---------------------------------- */
  const cardRadius = config.radius.card;
  const sheetRadius = config.radius.sheet;
  const sh = config.shadow;

  const shell = useAnimatedStyle(() => {
    const p = sheet.value;
    const o = origin.value.w > 0 ? origin.value : fallbackOrigin(W, H, cardRadius);
    const i = (a: number, b: number) =>
      interpolate(p, [0, 1], [a, b], Extrapolation.CLAMP);
    // Vỏ mang đúng shadow của card ở p ≈ 0, để lúc cắt sang overlay (xem
    // morph/visibility.ts) shadow không đổi — hai lớp không bao giờ cùng hiện
    // nên không có shadow kép. Giữa chừng tắt: xem TỐI ƯU 2.
    const shadow = restShadow(p);
    return {
      width: i(o.w, W),
      height: i(o.h, H),
      borderRadius: i(o.r, sheetRadius),
      transform: [{ translateX: i(o.x, 0) }, { translateY: i(o.y, 0) }],
      shadowOpacity: sh.opacity * shadow,
      elevation: sh.elevation * shadow,
      // Chiều về: đục hoàn toàn tới khi trùng card rồi cắt sang overlay.
      opacity: shellOpacity(handoff.value, p),
    };
  });

  /* Nội dung màn và mặt menu crossfade BÊN TRONG vỏ (một lớp, không lệch
     nhau), hai khoảng gối lên nhau (0.4–0.5) để vỏ không lúc nào là khối
     trắng trống. Chạy cả hai chiều: lúc mở, vỏ bắt đầu bằng đúng mặt card nên
     giao ca từ overlay liền mạch; lúc đóng, vỏ "nhập" vào card menu.

     Safe area: nội dung là khung W × H cố định neo góc trên-trái vỏ. Khi vỏ
     còn nhỏ, phần lộ ra là dải `insets.top` (status bar / Dynamic Island) —
     trống trơn. Đẩy nội dung lên đúng `insets.top` khi vỏ nhỏ, trả về 0 khi
     full-screen, để thứ lộ ra trong card là header thật. Chỉ là transform,
     không gây layout lại.                                                    */
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheet.value, [0.4, 0.75], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(sheet.value, [0, 1], [-topInset, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  const faceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheet.value, [0.15, 0.5], [1, 0], Extrapolation.CLAMP),
  }));

  const backdrop = useAnimatedStyle(() => ({
    opacity: interpolate(sheet.value, [0, 1], [0, 0.25], Extrapolation.CLAMP),
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdrop]} pointerEvents="none" />

      <GestureDetector gesture={gesture}>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.shell,
            {
              shadowColor: sh.color,
              shadowRadius: sh.radius,
              shadowOffset: { width: 0, height: sh.offsetY },
            },
            shell,
          ]}
          // TỐI ƯU 3: báo cho overlay biết route đã có mặt thật trên màn hình.
          onLayout={() => {
            // onLayout chạy trên JS và bắn lại mỗi khi vỏ đổi size (Reanimated
            // commit layout). Ở bản dev JS chậm, event tới muộn sau khi đã bắt
            // đầu rời đi — không được giật handoff về ROUTE lúc đó.
            if (!leavingRef.current && handoff.value === HANDOFF.MENU) {
              handoff.value = HANDOFF.ROUTE;
            }
          }}
        >
          {/* Kích thước CỐ ĐỊNH — navigator không bị đo lại mỗi frame. */}
          <Animated.View style={[styles.fixed, { width: W, height: H }, contentStyle]}>
            <SettledContext.Provider value={settled}>
              <Stack
                screenOptions={{
                  contentStyle: { backgroundColor: '#fff' },
                  headerBackButtonDisplayMode: 'minimal',
                }}
              >
                <Stack.Screen name="[key]" options={{ headerShown: false }} />
              </Stack>
            </SettledContext.Provider>
          </Animated.View>

          {/* Mặt card neo góc dưới-phải vỏ: card gốc nằm góc dưới-phải màn,
              nên khi vỏ co/giãn mặt này gần như đứng yên tại chỗ. */}
          <Animated.View style={[StyleSheet.absoluteFill, faceStyle]} pointerEvents="none">
            <MenuFace />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: '#000' },
  shell: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
    backgroundColor: '#fff',
    // shadowColor/Radius/Offset lấy từ config (morph/config.ts), đặt inline.
  },
  fixed: { position: 'absolute', left: 0, top: 0 },
});
