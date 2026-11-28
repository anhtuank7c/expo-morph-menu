/**
 * Vỏ morph cho một nhóm route — dùng làm `_layout.tsx` của nhóm đó:
 *
 *   // app/(sheet)/_layout.tsx
 *   import { Stack } from 'expo-router';
 *   import { MorphSheetLayout } from 'expo-morph-menu';
 *   export default function Layout() {
 *     return (
 *       <MorphSheetLayout>
 *         <Stack.Screen name="[key]" options={{ headerShown: false }} />
 *       </MorphSheetLayout>
 *     );
 *   }
 *
 * và khai báo nhóm đó ở navigator gốc với `morphSheetScreenOptions`.
 *
 * Mấu chốt kiến trúc: khối animate chỉ là **vỏ ngoài**. `<Stack />` lồng bên
 * trong nằm trong một View **cố định W × H**. Vỏ co giãn mỗi frame, navigator
 * bên trong không đổi kích thước nên Yoga không phải đo lại cả cây. Nhờ vậy
 * push/pop màn con vẫn là native-stack thật: animation native, back gesture
 * native, back cứng Android, deep link đầy đủ.
 *
 * Mở: vỏ nở từ đúng rect card menu ra full screen.
 * Đóng: vỏ thu về đúng rect card; menu ở lại mở hay thu tiếp về FAB là do
 * `config.closeMenuOnDismiss`.
 */

import { Stack, useNavigation, usePreventRemove } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { HANDOFF } from './constants';
import { fallbackOrigin, restShadow, sheetRect } from './geometry';
import { MenuFace } from './MenuFace';
import { useMorph } from './MorphProvider';
import { SettledContext } from './settled';
import { animatedShadow, shadowSpec, staticShadowStyle } from './shadow';
import { resolveSurface } from './Surface';
import { shellOpacity } from './visibility';
import { useWebKey } from './web';

/** Bề rộng dải cạnh trái nhận cử chỉ vuốt (giống back gesture của iOS). */
const EDGE_WIDTH = 24;
/**
 * Quãng kéo ngắn nhất để vỏ co hết về card. Hành trình bình thường là từ chỗ
 * đặt tay tới mép màn; sàn này chỉ để chạm sát mép dưới không quá nhạy.
 */
const MIN_TRAVEL = 200;
/** Nhả tay dưới ngưỡng này (hoặc vuốt nhanh) thì đóng, không thì bật lại. */
const DISMISS_AT = 0.78;
const FLING_VELOCITY = 900;

/**
 * Options cho `Stack.Screen` của nhóm route dùng MorphSheetLayout, ở navigator
 * gốc. Route thật, nhưng tắt animation mặc định vì morph do ta lái.
 */
export const morphSheetScreenOptions = {
  presentation: 'transparentModal',
  animation: 'none',
  // Headers belong to the inner Stack. A header from the root navigator would
  // sit above the animated container and not move with it.
  headerShown: false,
  gestureEnabled: false,
  contentStyle: { backgroundColor: 'transparent' },
} as const;

export type MorphSheetLayoutProps = {
  /** Các `<Stack.Screen>` của nhóm route. */
  children?: React.ReactNode;
  /** screenOptions cho Stack bên trong (gộp với mặc định). */
  screenOptions?: React.ComponentProps<typeof Stack>['screenOptions'];
};

export function MorphSheetLayout({ children, screenOptions }: MorphSheetLayoutProps) {
  // KHÔNG dùng useWindowDimensions: trên Android edge-to-edge, "window" không
  // tính thanh điều hướng, vỏ nở thiếu và hở một dải dưới đáy.
  const { width: W, height: H } = useSafeAreaFrame();
  const {
    sheet,
    origin,
    handoff,
    config,
    colors,
    spring,
    components,
    callbacks,
    selectedRef,
    sheetDismissed,
    registerDismiss,
  } = useMorph();
  const { Background, Backdrop } = components;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  /* --- rect đích khi mở hẳn: full screen, hoặc thẻ nổi trên màn rộng ------ */
  const target = sheetRect(W, H, insets, config);
  const { floating, x: TX, y: TY, w: TW, h: TH, r: TR } = target;
  // Thẻ nổi nằm trọn trong vùng an toàn: nội dung bên trong không cần chừa
  // status bar hay home indicator.
  const topInset = floating ? 0 : insets.top;
  const innerInsets = useMemo(() => ({ top: 0, bottom: 0, left: 0, right: 0 }), []);
  const innerFrame = useMemo(() => ({ x: TX, y: TY, width: TW, height: TH }), [TX, TY, TW, TH]);

  /** Khi true, thôi chặn và cho điều hướng đi tiếp. */
  const [allowLeave, setAllowLeave] = useState(false);
  /** Chỉ mount nội dung nặng khi vỏ đã đứng yên. */
  const [settled, setSettled] = useState(false);
  const repeatRef = useRef<(() => void) | null>(null);
  /** Đã bắt đầu rời đi: chặn chạy morph ngược hai lần và chặn onLayout muộn. */
  const leavingRef = useRef(false);
  /** Cử chỉ đã tự chạy spring đóng trên UI thread (xem `release`). */
  const gestureClosing = useSharedValue(false);
  /** translation lúc cử chỉ kích hoạt (đã vượt activeOffset). */
  const dragStart = useSharedValue(0);
  /** Quãng ngón tay đi từ lúc kích hoạt tới mép màn = co từ 1 về 0. */
  const dragTravel = useSharedValue(MIN_TRAVEL);

  /* --- giao ca card → vỏ trên web ------------------------------------------
     Native dựa vào onLayout của vỏ (view native có thể chưa lên màn khi
     effect chạy). Web thì ngược lại: DOM của vỏ đã gắn và được vẽ cùng frame
     với layout effect, còn onLayout (ResizeObserver) về trễ vài frame — đo
     được trong iframe 390×844: card overlay còn đè lên vỏ tới s = 0.16 rồi
     mới biến mất (trace: FLICKER).                                          */
  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    if (handoff.value === HANDOFF.MENU || handoff.value === HANDOFF.RETURNING) {
      handoff.value = HANDOFF.ROUTE;
    }
    // Chỉ lúc mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- vào màn: nở từ rect card ra full screen --------------------------- */
  useEffect(() => {
    // Deep link mở lại sau một lần đóng: handoff còn RETURNING từ lần trước.
    if (handoff.value === HANDOFF.RETURNING) handoff.value = HANDOFF.MENU;
    sheet.value = 0;
    sheet.value = withSpring(1, spring, (finished) => {
      'worklet';
      if (finished) runOnJS(setSettled)(true);
    });
    return () => {
      // KHÔNG đụng handoff ở đây. Trên Android react-native-screens gỡ view
      // native bất đồng bộ, vỏ có thể còn trên màn thêm một frame sau cleanup;
      // đặt MENU lúc này làm vỏ bật lại opacity 1 → card cũ chớp lên.
      // RETURNING với sheet = 0 đã cho overlay = 1, vỏ = 0 — đúng trạng thái
      // nghỉ. Overlay đặt lại MENU khi commit lần sau.
      sheet.value = 0;
    };
    // spring đổi giữa chừng không chạy lại animation vào màn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, handoff]);

  /* --- ra màn: chặn unmount, thu về card, rồi mới cho đi tiếp -------------
     Mọi đường thoát — nút đóng, back cứng, router.back(), vuốt cạnh, kéo
     xuống — đều chảy qua đây, nên chỉ có một chỗ lo việc đảo chiều morph.  */
  const disablePrevention = usePreventRemove(!allowLeave, ({ repeat }) => {
    repeatRef.current = repeat;
    // Chạm đóng hai lần / back + nút đóng cùng lúc: chỉ chạy morph ngược một lần.
    if (leavingRef.current) return;
    leavingRef.current = true;
    // KHÔNG hoãn nội dung lại (setSettled(false)): React sẽ gỡ cây nặng đúng
    // frame đầu của animation đóng — chính là cú khựng. Nội dung đang mờ dần
    // theo `contentStyle`, cứ để nguyên cho tới lúc pop.
    handoff.value = HANDOFF.RETURNING;
    // Nhả tay từ cử chỉ: spring đóng đã chạy sẵn trên UI thread, mang theo
    // vận tốc ngón tay. Chạy lại ở đây sẽ reset vận tốc về 0 → khựng.
    if (gestureClosing.value) return;
    sheet.value = withSpring(0, spring, (finished) => {
      'worklet';
      if (!finished) return;
      // `handoff` CỐ Ý giữ nguyên RETURNING, kể cả sau unmount (xem cleanup).
      runOnJS(setAllowLeave)(true);
    });
  });

  /* Web: usePreventRemove còn chặn cả việc tải lại / đóng tab (beforeunload)
     suốt lúc nó bật — tức suốt lúc full screen mở — và hiện hộp thoại "Leave
     site?" dù chẳng có gì chưa lưu. Hook không có tuỳ chọn tắt riêng phần đó,
     nhưng hàm `disablePrevention` nó trả về đặt cờ tắt đồng bộ.

     Listener của ta phải chạy TRƯỚC listener của React Navigation. Pha capture
     không giúp được (đích là chính `window`; đo được: listener của họ vẫn
     chạy trước, lần tải lại đầu tiên vẫn hiện hộp thoại). Nên dựa vào THỨ TỰ
     ĐĂNG KÝ: họ đăng ký trong useEffect, ta đăng ký trong useLayoutEffect —
     luôn chạy trước mọi useEffect. Trang đằng nào cũng đang rời đi, nên bỏ
     chặn lúc đó là vô hại. */
  const disableRef = useRef(disablePrevention);
  useLayoutEffect(() => {
    disableRef.current = disablePrevention;
  });
  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    const w = globalThis as any;
    if (!w.addEventListener) return;
    const onBeforeUnload = () => disableRef.current();
    w.addEventListener('beforeunload', onBeforeUnload);
    return () => w.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  useEffect(() => {
    if (!allowLeave) return;
    sheetDismissed(); // đồng bộ state JS của overlay
    callbacks.onSheetDismissed?.(selectedRef.current);
    repeatRef.current?.();
  }, [allowLeave, sheetDismissed, callbacks, selectedRef]);

  const goBack = useCallback(() => {
    if (__DEV__ && !navigation.canGoBack()) {
      console.warn(
        '[expo-morph-menu] The sheet is the first route of the root navigator (usually a deep link), so it cannot be closed. ' +
          "Export `unstable_settings = { anchor: '<your home route>' }` from the root layout.",
      );
    }
    navigation.goBack();
  }, [navigation]);

  // useMorphDismiss() ở bất kỳ màn nào bên trong đóng cả nhóm route: goBack
  // trên navigator GỐC (navigation của layout này), không phải Stack bên trong.
  useEffect(() => {
    registerDismiss(goBack);
    return () => registerDismiss(null);
  }, [registerDismiss, goBack]);

  // Web không có back cứng: Esc đóng full screen (chỉ khi đang ở màn gốc,
  // ở màn con thì để Esc cho màn đó / không làm gì).

  /* --- màn nào của stack bên trong đang hiện -------------------------------
     Vuốt cạnh trái chỉ đóng sheet khi đang ở màn GỐC. Ở màn con, cạnh trái
     là của back gesture native của stack đó (pop về màn gốc). Màn gốc = màn
     đầu tiên được focus trong vòng đời của layout này.                     */
  const [rootKey, setRootKey] = useState<string | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const screenListeners = useCallback(
    ({ route }: { route: { key: string } }) => ({
      focus: () => {
        setRootKey((key) => key ?? route.key);
        setFocusedKey(route.key);
      },
    }),
    [],
  );
  const atStackRoot = focusedKey === null || focusedKey === rootKey;
  useWebKey('Escape', atStackRoot, goBack);

  /* --- cử chỉ đóng (config.dismiss, mặc định theo platform) ---------------
     Cả hai cử chỉ chỉ lái `sheet` theo ngón tay. Nhả tay để đóng: spring
     đóng chạy ngay trên UI thread từ đúng giá trị và vận tốc lúc nhả, rồi
     mới goBack() → usePreventRemove ở trên (chỉ ghi nhận, không chạy lại
     spring). Spring xong thì cho điều hướng đi tiếp.                       */
  const { edgeSwipe, dragDown } = config.dismiss;
  const finishGestureClose = useCallback(() => setAllowLeave(true), []);

  // useMemo: không có nó, mỗi lần layout re-render lại tạo gesture mới và
  // GestureDetector phải gắn lại handler.
  const gesture = useMemo(() => {
    // Co tuyến tính theo ngón tay trên CẢ hành trình: từ chỗ đặt tay tới mép
    // màn, vỏ đi từ full screen về đúng rect card, không có điểm dừng nào.
    // Vỏ chạm card (sheet = 0) lúc nhả tay thì đó cũng là điểm cắt sang
    // overlay của đường đóng thường, nên không có frame lệch.
    const begin = (position: number, translation: number, extent: number) => {
      'worklet';
      dragStart.value = translation; // trừ quãng activeOffset: không nhảy cóc
      dragTravel.value = Math.max(extent - position, MIN_TRAVEL);
    };
    const follow = (translation: number) => {
      'worklet';
      if (gestureClosing.value) return;
      const d = Math.max(translation - dragStart.value, 0);
      sheet.value = Math.max(1 - d / dragTravel.value, 0);
    };
    const release = (velocity: number) => {
      'worklet';
      if (gestureClosing.value) return;
      // Vận tốc ngón tay (px/s) → vận tốc của `sheet` (đơn vị/s).
      const v = -velocity / dragTravel.value;
      if (sheet.value < DISMISS_AT || velocity > FLING_VELOCITY) {
        // Chạy spring đóng NGAY trên UI thread, không đợi JS xử lý goBack
        // (bản dev có thể trễ cả trăm ms — vỏ đứng im lúc vừa nhả tay).
        gestureClosing.value = true;
        handoff.value = HANDOFF.RETURNING;
        sheet.value = withSpring(0, { ...spring, velocity: v }, (finished) => {
          'worklet';
          if (finished) runOnJS(finishGestureClose)();
        });
        // Xếp hàng trước callback trên: usePreventRemove nhận `repeat` trước.
        runOnJS(goBack)();
      } else {
        sheet.value = withSpring(1, { ...spring, velocity: v });
      }
    };

    const edge = Gesture.Pan()
      .enabled(edgeSwipe && atStackRoot)
      .hitSlop({ left: 0, width: EDGE_WIDTH })
      .activeOffsetX(12)
      .failOffsetY([-16, 16])
      .onStart((e) => begin(e.absoluteX, e.translationX, TX + TW))
      .onUpdate((e) => follow(e.translationX))
      .onEnd((e) => release(e.velocityX));

    // Kéo xuống: vẫn chạy cả khi đã drill vào màn con, giống sheet của iOS.
    const drag = Gesture.Pan()
      .enabled(dragDown)
      .activeOffsetY(12)
      .failOffsetY(-12)
      .onStart((e) => begin(e.absoluteY, e.translationY, TY + TH))
      .onUpdate((e) => follow(e.translationY))
      .onEnd((e) => release(e.velocityY));

    return Gesture.Race(edge, drag);
  }, [
    sheet,
    handoff,
    gestureClosing,
    dragStart,
    dragTravel,
    goBack,
    finishGestureClose,
    edgeSwipe,
    dragDown,
    atStackRoot,
    TX,
    TY,
    TW,
    TH,
    spring,
  ]);

  /* --- vỏ morph: rect card ↔ full screen ---------------------------------- */
  const cardRadius = config.radius.card;
  const sh = config.shadow;
  const shadowSpecValue = useMemo(() => shadowSpec(sh), [sh]);
  // Nền vỏ ở p ≈ 0 phải trùng nền card (bề mặt đặc), nếu không lúc cắt sang
  // overlay sẽ đổi màu — thấy rõ ở dark mode. Bề mặt kính/blur thì trong suốt,
  // giữ nền sheet.
  // Có slot Background thì nó tự vẽ nền card (lớp riêng, mờ dần bên dưới),
  // vỏ chỉ cần nền sheet.
  const cardColor = Background
    ? colors.sheetBackground
    : resolveSurface(config.surface) === 'solid'
      ? colors.surface
      : colors.sheetBackground;
  const sheetColor = colors.sheetBackground;
  const backdropMax = config.backdropOpacity;

  const shell = useAnimatedStyle(() => {
    const p = sheet.value;
    const o = origin.value.w > 0 ? origin.value : fallbackOrigin(W, H, cardRadius);
    const i = (a: number, b: number) => interpolate(p, [0, 1], [a, b], Extrapolation.CLAMP);
    // Vỏ mang đúng shadow của card ở p ≈ 0, để lúc cắt sang overlay shadow
    // không đổi. Giữa chừng tắt (bounds đổi mỗi frame).
    const shadow = restShadow(p);
    return {
      width: i(o.w, TW),
      height: i(o.h, TH),
      borderRadius: i(o.r, TR),
      transform: [{ translateX: i(o.x, TX) }, { translateY: i(o.y, TY) }],
      backgroundColor: interpolateColor(p, [0, 0.4], [cardColor, sheetColor]),
      ...animatedShadow(shadowSpecValue, shadow),
      // Chiều về: đục hoàn toàn tới khi trùng card rồi cắt sang overlay.
      opacity: shellOpacity(handoff.value, p),
    };
  });

  /* Nội dung màn và mặt menu crossfade BÊN TRONG vỏ (một lớp, không lệch
     nhau), hai khoảng gối lên nhau để vỏ không lúc nào là khối trống.

     Safe area: nội dung là khung W × H cố định neo góc trên-trái vỏ. Khi vỏ
     còn nhỏ, phần lộ ra là dải `insets.top` (status bar) — trống trơn. Đẩy
     nội dung lên đúng `insets.top` khi vỏ nhỏ, trả về 0 khi full screen.   */
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheet.value, [0.4, 0.75], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(sheet.value, [0, 1], [-topInset, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  // Nền card của người dùng trên vỏ: đầy ở p ≈ 0 (trùng card), mờ hết khi vỏ
  // đã đủ lớn để nền sheet thay thế.
  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheet.value, [0, 0.4], [1, 0], Extrapolation.CLAMP),
  }));

  const faceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheet.value, [0.15, 0.5], [1, 0], Extrapolation.CLAMP),
  }));

  const backdrop = useAnimatedStyle(() => ({
    opacity: interpolate(sheet.value, [0, 1], [0, backdropMax], Extrapolation.CLAMP),
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, backdrop]} pointerEvents="none">
        {Backdrop ? (
          <Backdrop progress={sheet} colors={colors} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.backdrop }]} />
        )}
      </Animated.View>

      {/* Thẻ nổi: chạm ra ngoài thẻ để đóng, như form sheet của iPadOS. */}
      {floating && config.floatingSheet.dismissOnBackdropPress && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Close"
          testID="morph-backdrop"
        />
      )}

      <GestureDetector gesture={gesture}>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.shell,
            {
              ...staticShadowStyle(sh),
            },
            shell,
          ]}
          // Báo cho overlay biết route đã có mặt thật trên màn hình.
          onLayout={() => {
            // onLayout chạy trên JS và bắn lại mỗi khi vỏ đổi size. Ở bản dev
            // JS chậm, event tới muộn sau khi đã bắt đầu rời đi — không được
            // giật handoff về ROUTE lúc đó.
            if (!leavingRef.current && handoff.value === HANDOFF.MENU) {
              handoff.value = HANDOFF.ROUTE;
            }
          }}
        >
          {Background && (
            <Animated.View style={[StyleSheet.absoluteFill, backgroundStyle]} pointerEvents="none">
              <Background variant="sheet" progress={sheet} colors={colors} />
            </Animated.View>
          )}

          {/* Kích thước CỐ ĐỊNH — navigator không bị đo lại mỗi frame. */}
          <Animated.View style={[styles.fixed, { width: TW, height: TH }, contentStyle]}>
            <SettledContext.Provider value={settled}>
              <SafeArea floating={floating} insets={innerInsets} frame={innerFrame}>
                <Stack
                  screenListeners={screenListeners}
                  screenOptions={{
                    contentStyle: { backgroundColor: sheetColor },
                    headerBackButtonDisplayMode: 'minimal',
                    ...(screenOptions as object),
                  }}
                >
                  {children}
                </Stack>
              </SafeArea>
            </SettledContext.Provider>
          </Animated.View>

          {/* Mặt card neo góc dưới theo anchor: card gốc nằm ở góc đó, nên
              khi vỏ co/giãn mặt này gần như đứng yên tại chỗ. */}
          <Animated.View style={[StyleSheet.absoluteFill, faceStyle]} pointerEvents="none">
            <MenuFace />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/** Trong thẻ nổi: insets 0 và frame là khung thẻ cho mọi màn bên trong. */
function SafeArea({
  floating,
  insets,
  frame,
  children,
}: {
  floating: boolean;
  insets: { top: number; bottom: number; left: number; right: number };
  frame: { x: number; y: number; width: number; height: number };
  children: React.ReactNode;
}) {
  if (!floating) return <>{children}</>;
  return (
    <SafeAreaFrameContext.Provider value={frame}>
      <SafeAreaInsetsContext.Provider value={insets}>{children}</SafeAreaInsetsContext.Provider>
    </SafeAreaFrameContext.Provider>
  );
}

const styles = StyleSheet.create({
  shell: { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },
  fixed: { position: 'absolute', left: 0, top: 0 },
});
