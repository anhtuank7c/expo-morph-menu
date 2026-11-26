/**
 * Overlay: FAB → card menu. Không phải route, và cố ý như vậy.
 *
 * Một menu đang mở không phải là điểm đến — không ai deep link vào nó, không
 * ai muốn thấy nó khi khôi phục phiên làm việc. Nhưng nó *phải* nuốt nút back
 * của Android, nếu không người dùng sẽ bị văng khỏi màn hình khi chỉ định đóng
 * menu.
 *
 * Chọn một dòng thì nó ghi rect hiện tại vào `origin` rồi push route. Việc nở
 * tiếp thành full-screen là của route.
 */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ITEMS } from '../data/items';
import { prefetchSheet } from '../data/sheetData';
import { CARD_W, FAB, PAD, ROW_H, metrics, restShadow } from '../morph/geometry';
import { HANDOFF, useMorph } from '../morph/MorphProvider';
import { ARRIVED, overlayOpacity } from '../morph/visibility';
import { SPRING } from '../morph/springs';
import { MenuRowContent, menuRowStyle } from './MenuFace';
import { Surface, surfaceBackground, surfaceProps } from './Surface';

export default function MorphingMenu() {
  // Cùng nguồn kích thước với vỏ sheet (xem (sheet)/_layout.tsx): FAB và card
  // phải đo từ đúng mép đáy thật, nếu không rect `origin` lệch với vỏ.
  const { width: W, height: H } = useSafeAreaFrame();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { menu, sheet, origin, handoff, config, registerSheetDismissed } = useMorph();
  const closeOnDismiss = config.closeMenuOnDismiss;
  const sh = config.shadow;

  /**
   * closed  chỉ có FAB, nhận chạm.
   * open    card đang mở: scrim + các dòng nhận chạm, back cứng đóng menu.
   * route   đã chọn một dòng, route đang hiện. Overlay KHÔNG nhận chạm và
   *         KHÔNG giữ back cứng — trên Android overlay nằm TRÊN route, nếu còn
   *         'open' thì scrim nuốt mất cú chạm nút × và back cứng đóng menu ẩn
   *         thay vì đóng sheet (đã đo được bằng morph/trace.tsx).
   */
  const [mode, setMode] = useState<'closed' | 'open' | 'route'>('closed');
  const open = mode === 'open';
  const hovered = useSharedValue(-1);
  const openedByDrag = useSharedValue(false);
  /**
   * Cổng của scrim, độc lập với `menu`. Khi route nhận chỗ, scrim mờ đi
   * (backdrop của route thay thế). Chiều về: menu còn mở thì scrim hiện lại;
   * `closeMenuOnDismiss` thì giữ 0 để lúc card thu về FAB không có lớp tối nào
   * hiện lại rồi tắt.
   */
  const scrimGate = useSharedValue(1);

  const geo = useMemo(
    () => metrics(W, H, insets.bottom, ITEMS.length, config.radius.card),
    [W, H, insets.bottom, config.radius.card],
  );

  const setOpenJS = useCallback((v: boolean) => setMode(v ? 'open' : 'closed'), []);

  const close = useCallback(() => {
    setMode('closed');
    hovered.value = -1;
    menu.value = withSpring(0, SPRING);
  }, [menu, hovered]);

  /* --- full screen thu về card ---------------------------------------------
     Phản ứng NGAY trên UI thread, đúng frame vỏ chạm card (sheet ≤ ARRIVED),
     không chờ spring "finished" (nó lắc thêm ~7 frame quanh 0 mới báo xong,
     card đứng khựng ~115ms) và không chờ JS.

       closeMenuOnDismiss = false  menu ở lại mở như trước khi chọn: scrim
                                   hiện lại, các dòng bấm được tiếp.
       closeMenuOnDismiss = true   card thu tiếp về FAB.                    */
  useAnimatedReaction(
    () => handoff.value === HANDOFF.RETURNING && sheet.value <= ARRIVED,
    (arrived, was) => {
      if (!arrived || was) return;
      if (closeOnDismiss) {
        if (menu.value > 0.5) menu.value = withSpring(0, SPRING);
      } else {
        scrimGate.value = withTiming(1, { duration: 200 });
      }
    },
    [closeOnDismiss],
  );

  // Route gọi khi đã pop xong: chỉ đồng bộ state JS. Không đụng `menu.value`
  // để khỏi restart spring giữa chừng (mất vận tốc → khựng).
  const onSheetDismissed = useCallback(() => {
    hovered.value = -1;
    setMode(closeOnDismiss ? 'closed' : 'open');
  }, [hovered, closeOnDismiss]);
  useEffect(
    () => registerSheetDismissed(onSheetDismissed),
    [registerSheetDismissed, onSheetDismissed],
  );

  // Back cứng Android đóng menu thay vì thoát màn hình.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [open, close]);

  /* --- TỐI ƯU 1: nạp trước ngay khi ngón tay rê lên dòng ----------------
     Ta biết người dùng sắp chọn gì trước khi họ nhả tay 150–400ms. Đó là
     khoảng thời gian miễn phí để nạp dữ liệu, và nó thường xoá sạch khoảng
     trống đầu màn — thứ người dùng thực sự cảm nhận là "lag".               */
  const onHover = useCallback((index: number) => {
    const item = ITEMS[index];
    if (!item) return;
    Haptics.selectionAsync();
    prefetchSheet(item.key);
  }, []);

  useAnimatedReaction(
    () => hovered.value,
    (cur, prev) => {
      if (cur !== prev && cur >= 0) runOnJS(onHover)(cur);
    },
  );

  const committingRef = useRef(false);
  useEffect(() => {
    if (mode !== 'route') committingRef.current = false;
  }, [mode]);

  const commit = useCallback(
    (index: number) => {
      const item = ITEMS[index];
      if (!item || committingRef.current) return;
      committingRef.current = true; // chạm đúp không push hai lần
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      origin.value = geo.card;
      // Lần đóng trước để handoff ở RETURNING (xem (sheet)/_layout.tsx).
      handoff.value = HANDOFF.MENU;
      hovered.value = -1;
      scrimGate.value = withTiming(0, { duration: 220 });
      setMode('route');
      router.push({ pathname: '/(sheet)/[key]', params: { key: item.key } });
    },
    [geo, origin, router, hovered, scrimGate, handoff],
  );

  const hitTest = useCallback(
    (x: number, y: number) => {
      'worklet';
      if (menu.value < 0.6) return -1;
      if (x < geo.card.x - 28 || x > geo.card.x + CARD_W + 28) return -1;
      const rel = y - (geo.card.y + PAD);
      if (rel < 0) return -1;
      const i = Math.floor(rel / ROW_H);
      return i >= 0 && i < ITEMS.length ? i : -1;
    },
    [geo, menu],
  );

  /* --- chọn dòng bằng cử chỉ: chờ card nở xong rồi mới push ---------------
     Rê nhanh rồi nhả khi card mới nở 70–80%: nếu push ngay, vỏ sheet mọc ra
     ở rect card ĐẦY ĐỦ trong khi card overlay còn nhỏ hơn → hai lớp lệch
     nhau, mắt thấy nháy (trace: FLICKER ở m=0.79). Giữ lệnh lại tới khi card
     đã nằm đúng rect `origin`, chậm nhất vài frame.                        */
  const pendingCommit = useSharedValue(-1);
  const MENU_SETTLED = 0.995;

  useAnimatedReaction(
    () => pendingCommit.value >= 0 && menu.value >= MENU_SETTLED,
    (ready) => {
      if (!ready) return;
      const target = pendingCommit.value;
      pendingCommit.value = -1;
      runOnJS(commit)(target);
    },
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin(() => {
          pendingCommit.value = -1;
          openedByDrag.value = menu.value < 0.5;
          if (menu.value < 0.5) {
            scrimGate.value = 1;
            menu.value = withSpring(1, SPRING);
            runOnJS(setOpenJS)(true);
          }
        })
        .onUpdate((e) => {
          // Chưa rê thì chưa có gì để chọn: vị trí FAB nằm ĐÚNG trong dòng
          // cuối của card, giữ tay hơi lâu là dòng đó bị highlight.
          const moved = Math.hypot(e.translationX, e.translationY) > 8;
          hovered.value = moved ? hitTest(e.absoluteX, e.absoluteY) : -1;
        })
        .onFinalize((e) => {
          hovered.value = -1;
          const moved = Math.hypot(e.translationX, e.translationY) > 8;
          // Chạm rồi nhả tại chỗ → chỉ mở menu, KHÔNG bao giờ chọn dòng. Bản
          // trước để hitTest quyết: giữ tay > ~100ms là menu đã ≥ 0.6 và điểm
          // FAB rơi vào dòng "Check In" → tự mở sheet (Maestro bắt được).
          if (openedByDrag.value && !moved) return;
          const target = hitTest(e.absoluteX, e.absoluteY);
          if (target >= 0) {
            if (menu.value >= MENU_SETTLED) runOnJS(commit)(target);
            else pendingCommit.value = target;
            return;
          }
          menu.value = withSpring(0, SPRING);
          runOnJS(setOpenJS)(false);
        }),
    [hitTest, commit, setOpenJS, menu, hovered, openedByDrag, scrimGate, pendingCommit],
  );

  /* --- styles ------------------------------------------------------------ */

  const boxStyle = useAnimatedStyle(() => {
    const p = menu.value;
    const i = (a: number, b: number) =>
      interpolate(p, [0, 1], [a, b], Extrapolation.CLAMP);
    const shadow = restShadow(p);
    return {
      width: i(geo.fab.w, geo.card.w),
      height: i(geo.fab.h, geo.card.h),
      borderRadius: i(geo.fab.r, geo.card.r),
      transform: [
        { translateX: i(geo.fab.x, geo.card.x) },
        { translateY: i(geo.fab.y, geo.card.y) },
      ],
      /* TỐI ƯU 2: bounds đổi mỗi frame nghĩa là shadow phải dựng lại mỗi
         frame. Cộng với overflow:hidden + borderRadius đang cắt view con, đó
         là cặp đôi gây offscreen render. Tắt trong lúc bay (ramp ngắn ở hai
         đầu thay vì công tắc, xem restShadow).                              */
      shadowOpacity: sh.opacity * shadow,
      elevation: sh.elevation * shadow,
      /* TỐI ƯU 3: chỉ biến mất khi route đã thực sự layout xong, chứ không
         dựa vào tiến trình của nó. Route mount bất đồng bộ.
         iOS: không bao giờ đụng opacity — xem OVERLAY_BELOW_ROUTE.            */
      opacity: overlayOpacity(handoff.value, sheet.value),
    };
  });

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: Math.min(
      interpolate(menu.value, [0, 1], [0, 1], Extrapolation.CLAMP),
      scrimGate.value,
    ),
  }));

  const plusStyle = useAnimatedStyle(() => ({
    opacity: interpolate(menu.value, [0, 0.4], [1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(menu.value, [0, 0.4], [1, 0.5], Extrapolation.CLAMP) },
      {
        rotate: `${interpolate(menu.value, [0, 0.4], [0, 45], Extrapolation.CLAMP)}deg`,
      },
    ],
  }));

  const listStyle = useAnimatedStyle(() => ({
    opacity: interpolate(menu.value, [0.35, 0.7], [0, 1], Extrapolation.CLAMP),
  }));

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: hovered.value >= 0 ? 1 : 0,
    transform: [{ translateY: PAD + Math.max(hovered.value, 0) * ROW_H }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[styles.scrim, scrimStyle]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <Pressable testID="menu-scrim" style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <Surface
        {...surfaceProps}
        style={[
          styles.box,
          {
            backgroundColor: surfaceBackground,
            shadowColor: sh.color,
            shadowRadius: sh.radius,
            shadowOffset: { width: 0, height: sh.offsetY },
          },
          boxStyle,
        ]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <Animated.View style={[styles.fabLayer, plusStyle]} pointerEvents="none">
          <Ionicons name="add" size={26} color="#1c1c1e" />
        </Animated.View>

        <Animated.View style={[styles.list, { height: geo.cardH }, listStyle]}>
          <Animated.View style={[styles.highlight, highlightStyle]} pointerEvents="none" />
          {ITEMS.map((it, i) => (
            <Pressable
              key={it.key}
              style={menuRowStyle}
              testID={`menu-item-${it.key}`}
              accessibilityRole="menuitem"
              accessibilityLabel={it.label}
              onPressIn={() => {
                hovered.value = i;
              }}
              onPressOut={() => {
                hovered.value = -1;
              }}
              onPress={() => commit(i)}
            >
              <MenuRowContent item={it} />
            </Pressable>
          ))}
        </Animated.View>
      </Surface>

      <GestureDetector gesture={pan}>
        <View
          accessibilityRole="button"
          testID="morph-fab"
          accessibilityLabel="Mở menu"
          style={[styles.hit, { left: geo.fab.x, top: geo.fab.y }]}
          pointerEvents={mode === 'closed' ? 'auto' : 'none'}
        />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.08)' },
  box: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
    // shadowColor/Radius/Offset lấy từ config (morph/config.ts), đặt inline.
  },
  fabLayer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: FAB,
    height: FAB,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { position: 'absolute', right: 0, bottom: 0, width: CARD_W, paddingVertical: PAD },
  highlight: {
    position: 'absolute',
    left: 6,
    right: 6,
    top: 0,
    height: ROW_H,
    borderRadius: 14,
    backgroundColor: 'rgba(120,120,128,0.14)',
  },
  hit: { position: 'absolute', width: FAB, height: FAB, borderRadius: FAB / 2 },
});
