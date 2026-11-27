/**
 * Overlay: FAB → card menu. Không phải route, và cố ý như vậy.
 *
 * Một menu đang mở không phải là điểm đến — không ai deep link vào nó. Nhưng
 * nó *phải* nuốt nút back của Android (và phím Esc trên web), nếu không người
 * dùng bị văng khỏi màn hình khi chỉ định đóng menu.
 *
 * Chọn một dòng thì nó ghi rect card vào `origin` rồi push `item.href`. Việc
 * nở tiếp thành full screen là của MorphSheetLayout.
 *
 * Đặt SAU navigator gốc, trong <MorphProvider>:
 *
 *   <MorphProvider items={items}>
 *     <Stack>…</Stack>
 *     <MorphMenu />
 *   </MorphProvider>
 */

import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ARRIVED, HANDOFF, MENU_SETTLED } from './constants';
import { metrics, restShadow, rowAt } from './geometry';
import { renderIcon } from './icon';
import { RowContent, RowSeparator } from './MenuFace';
import { useMorph } from './MorphProvider';
import { haptics } from './optional';
import { animatedShadow, shadowSpec, staticShadowStyle } from './shadow';
import { resolveSurface, surfaceFor } from './Surface';
import type { MorphHighlightProps, MorphTriggerProps } from './types';
import { overlayOpacity } from './visibility';
import { useWebKey } from './web';

const IS_WEB = Platform.OS === 'web';

export type MorphMenuProps = {
  /** Nhãn trình đọc màn hình của FAB. */
  fabAccessibilityLabel?: string;
  /**
   * Ẩn FAB (thu nhỏ và mờ đi, không nhận chạm). Chỉ có tác dụng khi menu đang
   * đóng: menu đang mở thì được đóng trước; khi full screen đang hiện thì bỏ
   * qua, vì card là điểm thu về của full screen. Dùng để ẩn nút ở các màn
   * không phải tab (ví dụ màn chat).
   */
  hidden?: boolean;
  /**
   * Khoảng cách thêm tính từ mép dưới, cộng với safe area và `layout.margin`.
   * Dùng để đặt FAB phía trên tab bar: truyền chiều cao tab bar KHÔNG gồm
   * inset dưới.
   */
  bottomOffset?: number;
};

export function MorphMenu({
  fabAccessibilityLabel = 'Open menu',
  hidden = false,
  bottomOffset = 0,
}: MorphMenuProps) {
  // Cùng nguồn kích thước với vỏ sheet: KHÔNG dùng useWindowDimensions — trên
  // Android edge-to-edge "window" không tính thanh điều hướng, rect lệch vỏ.
  const { width: W, height: H } = useSafeAreaFrame();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    menu,
    sheet,
    origin,
    handoff,
    items,
    list,
    config,
    colors,
    scheme,
    spring,
    components,
    callbacks,
    selectedRef,
    registerSheetDismissed,
    closeMenuOverride,
  } = useMorph();
  const closeOnDismiss = config.closeMenuOnDismiss;
  const sh = config.shadow;
  const shadowSpecValue = useMemo(() => shadowSpec(sh), [sh]);
  const { cardWidth, padding, fabSize } = config.layout;
  const count = items.length;
  const { offsets, heights } = list;

  /**
   * closed  chỉ có FAB, nhận chạm.
   * open    card đang mở: scrim + các dòng nhận chạm, back cứng đóng menu.
   * route   đã chọn một dòng, route đang hiện. Overlay KHÔNG nhận chạm và
   *         KHÔNG giữ back cứng — trên Android/web overlay nằm TRÊN route,
   *         nếu còn 'open' thì scrim nuốt mất cú chạm nút đóng và back cứng
   *         đóng menu ẩn thay vì đóng sheet.
   */
  const [mode, setMode] = useState<'closed' | 'open' | 'route'>('closed');
  /**
   * Ngón tay / chuột còn đang nhấn trên FAB. Trong lúc đó vùng bấm của FAB
   * PHẢI giữ `pointerEvents="auto"` dù menu đã sang 'open': trên web, phần tử
   * bị `pointer-events: none` giữa chừng không nhận `pointerup`, Gesture
   * Handler không thấy cú nhấn kết thúc và kẹt luôn — mọi cú bấm sau đều bị
   * bỏ qua (lần đầu mở được, sau đó FAB "chết"). Native không bị, nhưng giữ
   * chung một luật cho cả hai.
   */
  const [pressing, setPressing] = useState(false);
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
    () => metrics(W, H, insets.bottom + bottomOffset, list.cardH, config),
    [W, H, insets.bottom, bottomOffset, list.cardH, config],
  );
  const right = geo.side === 'right';

  // Có slot Background thì bề mặt là View trong suốt, nền do người dùng vẽ.
  const Background = components.Background;
  const surface = useMemo(() => {
    const kind = Background ? 'solid' : resolveSurface(config.surface);
    return { kind, ...surfaceFor(kind, scheme) };
  }, [Background, config.surface, scheme]);

  // Một lần gọi JS cho cả hai state để React gộp vào cùng một render: tách
  // làm hai thì có thể lọt một render 'open' + chưa 'pressing' → lại kẹt.
  const onPressStart = useCallback(
    (opening: boolean) => {
      setPressing(true);
      if (opening) {
        setMode('open');
        callbacks.onOpen?.();
      }
    },
    [callbacks],
  );
  const onPressEnd = useCallback(() => setPressing(false), []);

  const setOpenJS = useCallback(
    (v: boolean) => {
      setMode(v ? 'open' : 'closed');
      if (v) callbacks.onOpen?.();
      else callbacks.onClose?.();
    },
    [callbacks],
  );

  const close = useCallback(() => {
    setMode('closed');
    hovered.value = -1;
    menu.value = withSpring(0, spring);
    callbacks.onClose?.();
  }, [menu, hovered, spring, callbacks]);

  /* --- full screen thu về card ---------------------------------------------
     Phản ứng NGAY trên UI thread, đúng frame vỏ chạm card (sheet ≤ ARRIVED),
     không chờ spring "finished" (nó lắc thêm ~7 frame quanh 0 mới báo xong,
     card đứng khựng ~115ms) và không chờ JS.                                */
  useAnimatedReaction(
    () => handoff.value === HANDOFF.RETURNING && sheet.value <= ARRIVED,
    (arrived, was) => {
      if (!arrived || was) return;
      const o = closeMenuOverride.value;
      if (o === 1 || (o === -1 && closeOnDismiss)) {
        if (menu.value > 0.5) menu.value = withSpring(0, spring);
      } else {
        scrimGate.value = withTiming(1, { duration: 200 });
      }
    },
    // Reanimated 4 only reads the dependency list on web; on native it warns.
    Platform.OS === 'web' ? [closeOnDismiss, spring, closeMenuOverride] : undefined,
  );

  // Route gọi khi đã pop xong: chỉ đồng bộ state JS. Không đụng `menu.value`
  // để khỏi restart spring giữa chừng (mất vận tốc → khựng).
  const onSheetDismissed = useCallback(() => {
    const o = closeMenuOverride.value;
    const closeMenu = o === 1 || (o === -1 && closeOnDismiss);
    closeMenuOverride.value = -1;
    hovered.value = -1;
    setMode(closeMenu ? 'closed' : 'open');
    if (closeMenu) callbacks.onClose?.();
  }, [hovered, closeOnDismiss, callbacks, closeMenuOverride]);

  /* --- ẩn / hiện FAB --------------------------------------------------------
     Chỉ ẩn khi menu đóng. Đang mở mà bị yêu cầu ẩn (ví dụ deep link sang màn
     khác) thì đóng menu trước; effect chạy lại khi mode = 'closed'.          */
  const presence = useSharedValue(hidden ? 0 : 1);
  const concealed = hidden && mode === 'closed';
  useEffect(() => {
    if (hidden && mode === 'open') {
      close();
      return;
    }
    presence.value = withTiming(concealed ? 0 : 1, { duration: 180 });
  }, [hidden, mode, concealed, close, presence]);
  useEffect(() => registerSheetDismissed(onSheetDismissed), [registerSheetDismissed, onSheetDismissed]);

  // Back cứng Android / phím Esc trên web đóng menu thay vì thoát màn hình.
  useEffect(() => {
    if (!open || Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [open, close]);
  useWebKey('Escape', open, close);

  /* --- rê tay / hover lên dòng: haptics + onHover (chỗ để prefetch) ------- */
  const onHover = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) return;
      if (config.haptics) haptics.selection();
      callbacks.onHover?.(item);
    },
    [items, config.haptics, callbacks],
  );

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
      const item = items[index];
      if (!item || committingRef.current) return;
      committingRef.current = true; // chạm đúp không push hai lần
      if (config.haptics) haptics.impact();
      callbacks.onSelect?.(item);
      selectedRef.current = item;
      origin.value = geo.card;
      // Lần đóng trước để handoff ở RETURNING (xem MorphSheetLayout).
      handoff.value = HANDOFF.MENU;
      hovered.value = -1;
      scrimGate.value = withTiming(0, { duration: 220 });
      setMode('route');
      router.push(item.href);
    },
    [items, config.haptics, callbacks, selectedRef, geo, origin, router, hovered, scrimGate, handoff],
  );

  const hitTest = useCallback(
    (x: number, y: number) => {
      'worklet';
      if (menu.value < 0.6) return -1;
      if (x < geo.card.x - 28 || x > geo.card.x + cardWidth + 28) return -1;
      return rowAt(y - geo.card.y, offsets, heights);
    },
    [geo, menu, cardWidth, offsets, heights],
  );

  /* --- chọn dòng bằng cử chỉ: chờ card nở xong rồi mới push ---------------
     Rê nhanh rồi nhả khi card mới nở 70–80%: nếu push ngay, vỏ sheet mọc ra
     ở rect card ĐẦY ĐỦ trong khi card overlay còn nhỏ hơn → hai lớp lệch
     nhau, mắt thấy nháy. Giữ lệnh lại tới khi card đã nằm đúng rect `origin`. */
  const pendingCommit = useSharedValue(-1);

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
          const opening = menu.value < 0.5;
          openedByDrag.value = opening;
          if (opening) {
            scrimGate.value = 1;
            menu.value = withSpring(1, spring);
          }
          runOnJS(onPressStart)(opening);
        })
        .onUpdate((e) => {
          // Chưa rê thì chưa có gì để chọn: vị trí FAB nằm trong dòng cuối
          // của card, giữ tay hơi lâu là dòng đó bị highlight.
          const moved = Math.hypot(e.translationX, e.translationY) > 8;
          hovered.value = moved ? hitTest(e.absoluteX, e.absoluteY) : -1;
        })
        .onFinalize((e) => {
          runOnJS(onPressEnd)();
          hovered.value = -1;
          const moved = Math.hypot(e.translationX, e.translationY) > 8;
          // Chạm rồi nhả tại chỗ → chỉ mở menu, KHÔNG bao giờ chọn dòng.
          if (openedByDrag.value && !moved) return;
          const target = hitTest(e.absoluteX, e.absoluteY);
          if (target >= 0) {
            if (menu.value >= MENU_SETTLED) runOnJS(commit)(target);
            else pendingCommit.value = target;
            return;
          }
          menu.value = withSpring(0, spring);
          runOnJS(setOpenJS)(false);
        }),
    [
      hitTest,
      commit,
      setOpenJS,
      onPressStart,
      onPressEnd,
      menu,
      hovered,
      openedByDrag,
      scrimGate,
      pendingCommit,
      spring,
    ],
  );

  /* --- styles ------------------------------------------------------------ */

  const boxStyle = useAnimatedStyle(() => {
    const p = menu.value;
    const i = (a: number, b: number) => interpolate(p, [0, 1], [a, b], Extrapolation.CLAMP);
    const shadow = restShadow(p);
    return {
      width: i(geo.fab.w, geo.card.w),
      height: i(geo.fab.h, geo.card.h),
      borderRadius: i(geo.fab.r, geo.card.r),
      transform: [
        { translateX: i(geo.fab.x, geo.card.x) },
        { translateY: i(geo.fab.y, geo.card.y) },
        { scale: 0.6 + 0.4 * presence.value },
      ],
      // Bounds đổi mỗi frame → shadow dựng lại mỗi frame: tắt lúc đang bay.
      ...animatedShadow(shadowSpecValue, shadow),
      // Chỉ biến mất khi route đã thực sự layout xong (xem visibility.ts).
      opacity: overlayOpacity(handoff.value, sheet.value) * presence.value,
    };
  });

  const scrimProgress = useDerivedValue(() =>
    Math.min(interpolate(menu.value, [0, 1], [0, 1], Extrapolation.CLAMP), scrimGate.value),
  );
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimProgress.value }));

  const listStyle = useAnimatedStyle(() => ({
    opacity: interpolate(menu.value, [0.35, 0.7], [0, 1], Extrapolation.CLAMP),
  }));

  const Surface = surface.Component;
  const corner = right ? { right: 0 } : { left: 0 };
  const Trigger = components.Trigger ?? DefaultTrigger;
  const Highlight = components.Highlight === undefined ? DefaultHighlight : components.Highlight;
  const Scrim = components.Scrim;
  const pointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]} pointerEvents={open ? 'auto' : 'none'}>
        <Pressable
          testID="morph-scrim"
          accessibilityLabel="Close menu"
          style={StyleSheet.absoluteFill}
          onPress={close}
        >
          {Scrim ? (
            <Scrim progress={scrimProgress} colors={colors} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} />
          )}
        </Pressable>
      </Animated.View>

      <Surface
        {...surface.props}
        style={[
          styles.box,
          {
            backgroundColor: Background || surface.transparent ? 'transparent' : colors.surface,
            ...staticShadowStyle(sh),
          },
          boxStyle,
        ]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        {Background && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Background variant="menu" progress={menu} colors={colors} />
          </View>
        )}

        <View style={[styles.fabLayer, corner, { width: fabSize, height: fabSize }]} pointerEvents="none">
          <Trigger progress={menu} size={fabSize} colors={colors} />
        </View>

        <Animated.View
          style={[
            styles.list,
            corner,
            { width: cardWidth, height: geo.cardH, paddingVertical: padding },
            listStyle,
          ]}
        >
          {Highlight && <HighlightLayer Highlight={Highlight} hovered={hovered} />}
          {items.map((it, i) => (
            <React.Fragment key={it.key}>
              <Pressable
                style={[{ height: heights[i] }, pointer]}
                testID={`morph-item-${it.key}`}
                accessibilityRole="menuitem"
                accessibilityLabel={it.accessibilityLabel ?? it.label}
                onPressIn={() => {
                  hovered.value = i;
                }}
                onPressOut={() => {
                  hovered.value = -1;
                }}
                // Web: hover chuột đóng vai trò "rê tay" — highlight + onHover.
                onHoverIn={() => {
                  hovered.value = i;
                }}
                onHoverOut={() => {
                  if (hovered.value === i) hovered.value = -1;
                }}
                onPress={() => commit(i)}
              >
                <RowContent item={it} index={i} variant="menu" hovered={hovered} />
              </Pressable>
              <RowSeparator index={i} />
            </React.Fragment>
          ))}
        </Animated.View>
      </Surface>

      {/* Web: KHÔNG đặt role="button" lên view gắn gesture. Gesture Handler
          (web/tools/PointerEventManager) cố ý bỏ qua setPointerCapture khi view
          có role="button" — chuột rời FAB lên card là mất dấu, pointerup rơi
          vào card, gesture kẹt: long press không chọn được dòng và FAB "chết"
          luôn. Role + nhãn chuyển xuống một view con phủ kín (trình đọc màn
          hình vẫn thấy nút). userSelect/touchAction: không bôi đen chữ khi
          kéo, không để trình duyệt di động hiểu cú kéo là cuộn trang. */}
      <GestureDetector gesture={pan} userSelect="none" touchAction="none">
        <View
          accessibilityRole={IS_WEB ? undefined : 'button'}
          testID="morph-fab"
          accessibilityLabel={IS_WEB ? undefined : fabAccessibilityLabel}
          style={[
            styles.hit,
            pointer,
            {
              left: geo.fab.x,
              top: geo.fab.y,
              width: fabSize,
              height: fabSize,
              borderRadius: geo.fab.r,
            },
          ]}
          pointerEvents={(mode === 'closed' && !concealed) || pressing ? 'auto' : 'none'}
        >
          {IS_WEB && (
            <View role="button" aria-label={fabAccessibilityLabel} style={StyleSheet.absoluteFill} />
          )}
        </View>
      </GestureDetector>
    </View>
  );
}

/** Lớp highlight bám theo dòng đang hover, cao bằng dòng đó. */
function HighlightLayer({
  Highlight,
  hovered,
}: {
  Highlight: React.ComponentType<MorphHighlightProps>;
  hovered: MorphHighlightProps['hovered'];
}) {
  const { list, colors } = useMorph();
  const { offsets, heights } = list;
  const style = useAnimatedStyle(() => {
    const i = hovered.value;
    const k = i >= 0 ? i : 0;
    return {
      opacity: i >= 0 ? 1 : 0,
      height: heights[k] ?? 0,
      // offsets tính từ mép trên card; list đã có paddingTop = padding đầu.
      transform: [{ translateY: offsets[k] ?? 0 }],
    };
  });
  return (
    <Animated.View style={[styles.highlight, style]} pointerEvents="none">
      <Highlight hovered={hovered} colors={colors} />
    </Animated.View>
  );
}

function DefaultHighlight({ colors }: MorphHighlightProps) {
  return <View style={[styles.highlightFill, { backgroundColor: colors.highlight }]} />;
}

/** Trigger mặc định: `fabIcon` (hoặc dấu "+"), mờ + xoay 45° khi mở. */
function DefaultTrigger({ progress, colors }: MorphTriggerProps) {
  const { fabIcon } = useMorph();
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4], [1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(progress.value, [0, 0.4], [1, 0.5], Extrapolation.CLAMP) },
      { rotate: `${interpolate(progress.value, [0, 0.4], [0, 45], Extrapolation.CLAMP)}deg` },
    ],
  }));
  return (
    <Animated.View style={[styles.center, style]}>
      {fabIcon != null ? (
        renderIcon(fabIcon, { size: 26, color: colors.fabIcon })
      ) : (
        <Plus color={colors.fabIcon} />
      )}
    </Animated.View>
  );
}

/** Dấu "+" mặc định, vẽ bằng View để không phụ thuộc thư viện icon. */
function Plus({ color }: { color: string }) {
  return (
    <View style={styles.plus}>
      <View style={[styles.plusBar, { backgroundColor: color }]} />
      <View style={[styles.plusBar, styles.plusBarV, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },
  fabLayer: { position: 'absolute', bottom: 0, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  list: { position: 'absolute', bottom: 0 },
  // top: 0 vì translateY dùng offsets tính từ mép trên card (đã gồm padding).
  highlight: { position: 'absolute', left: 6, right: 6, top: 0 },
  highlightFill: { flex: 1, borderRadius: 14 },
  hit: { position: 'absolute' },
  plus: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  plusBar: { position: 'absolute', width: 20, height: 2.5, borderRadius: 1.25 },
  plusBarV: { transform: [{ rotate: '90deg' }] },
});
