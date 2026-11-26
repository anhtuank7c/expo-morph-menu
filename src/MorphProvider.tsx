/**
 * Cầu nối giữa overlay (MorphMenu) và route (MorphSheetLayout).
 *
 *  menu    0 → 1   FAB nở thành card            (overlay sở hữu)
 *  sheet   0 → 1   card nở thành full screen    (route sở hữu)
 *  origin  rect    card ở đâu lúc push          (overlay ghi, route đọc)
 *  handoff HANDOFF ai đang hiện card            (cả hai ghi, xem constants.ts)
 *
 * Kèm cấu hình đã resolve, màu theo chế độ sáng/tối, danh sách item, bố cục
 * danh sách tính sẵn, các slot UI và callback — để overlay và vỏ sheet vẽ
 * CÙNG một mặt menu.
 */

import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { useColorScheme } from 'react-native';
import {
  ReduceMotion,
  useSharedValue,
  type SharedValue,
  type WithSpringConfig,
} from 'react-native-reanimated';

import { HANDOFF } from './constants';
import {
  resolveColors,
  resolveConfig,
  type MorphColors,
  type MorphConfig,
  type MorphConfigInput,
} from './config';
import { EMPTY_RECT, listLayout, type ListLayout, type Rect } from './geometry';
import type { MorphIcon } from './icon';
import type { MorphCallbacks, MorphComponents, MorphItem } from './types';

export type MorphContextValue = {
  menu: SharedValue<number>;
  sheet: SharedValue<number>;
  origin: SharedValue<Rect>;
  handoff: SharedValue<number>;
  items: MorphItem[];
  list: ListLayout;
  config: MorphConfig;
  colors: MorphColors;
  scheme: 'light' | 'dark';
  spring: WithSpringConfig;
  components: MorphComponents;
  fabIcon?: MorphIcon;
  closeIcon?: MorphIcon;
  callbacks: MorphCallbacks;
  /** Item vừa được chọn (để báo trong onSheetDismissed). */
  selectedRef: React.MutableRefObject<MorphItem | null>;
  /** Overlay đăng ký hàm đồng bộ state JS khi full screen đã đóng xong. */
  registerSheetDismissed: (fn: () => void) => void;
  sheetDismissed: () => void;
};

const Ctx = createContext<MorphContextValue | null>(null);

export type MorphProviderProps = MorphCallbacks & {
  children: React.ReactNode;
  /** Các dòng của menu. */
  items: MorphItem[];
  /** Ghi đè cấu hình mặc định — xem `MorphConfigInput`. */
  config?: MorphConfigInput;
  /**
   * Thay phần nhìn thấy bằng component của bộ UI bạn dùng — xem
   * `MorphComponents` và hợp đồng của slot trong types.ts.
   */
  components?: MorphComponents;
  /**
   * Chiều cao từng dòng, khi các dòng cao khác nhau. Mặc định
   * `config.layout.rowHeight` cho mọi dòng. Phải là hàm thuần.
   */
  itemHeight?: (item: MorphItem, index: number) => number;
  /**
   * Icon của FAB (dùng bởi Trigger mặc định), thay dấu "+". Element, ảnh,
   * hoặc `({ size, color }) => …`. Xoay 45° và mờ đi khi menu mở.
   */
  fabIcon?: MorphIcon;
  /** Icon mặc định của mọi `<MorphCloseButton>` (mỗi nút vẫn ghi đè được). */
  closeIcon?: MorphIcon;
};

const NO_COMPONENTS: MorphComponents = {};

export function MorphProvider({
  children,
  items,
  config: input,
  components = NO_COMPONENTS,
  itemHeight,
  fabIcon,
  closeIcon,
  onHover,
  onSelect,
  onOpen,
  onClose,
  onSheetDismissed,
}: MorphProviderProps) {
  const menu = useSharedValue(0);
  const sheet = useSharedValue(0);
  const handoff = useSharedValue<number>(HANDOFF.MENU);
  const origin = useSharedValue<Rect>(EMPTY_RECT);
  const dismissedRef = useRef<(() => void) | null>(null);
  const selectedRef = useRef<MorphItem | null>(null);

  // Phụ thuộc vào nội dung chứ không vào identity: `config={{…}}` viết inline
  // tạo object mới mỗi render, không được làm mọi consumer render lại.
  const key = JSON.stringify(input ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const config = useMemo(() => resolveConfig(input), [key]);

  const system = useColorScheme();
  const scheme: 'light' | 'dark' =
    config.colorScheme === 'auto' ? (system === 'dark' ? 'dark' : 'light') : config.colorScheme;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colors = useMemo(() => resolveColors(scheme, input?.colors), [scheme, key]);

  const spring = useMemo<WithSpringConfig>(
    () => ({
      duration: config.spring.duration,
      dampingRatio: config.spring.dampingRatio,
      // Tôn trọng Reduce Motion: spring nhảy thẳng tới đích.
      reduceMotion: ReduceMotion.System,
    }),
    [config.spring.duration, config.spring.dampingRatio],
  );

  // Bố cục danh sách tính một lần, dùng chung cho card, vỏ và hit-test.
  const heightsKey = items
    .map((it, i) => (itemHeight ? itemHeight(it, i) : config.layout.rowHeight))
    .join(',');
  const list = useMemo(
    () =>
      listLayout(
        heightsKey ? heightsKey.split(',').map(Number) : [],
        config.layout.padding,
        components.Separator ? config.layout.separatorHeight : 0,
      ),
    [heightsKey, config.layout.padding, config.layout.separatorHeight, components.Separator],
  );

  // Callback để trong ref: đổi callback không làm gesture/worklet dựng lại.
  const cbRef = useRef<MorphCallbacks>({});
  cbRef.current = { onHover, onSelect, onOpen, onClose, onSheetDismissed };
  const callbacks = useMemo<MorphCallbacks>(
    () => ({
      onHover: (i) => cbRef.current.onHover?.(i),
      onSelect: (i) => cbRef.current.onSelect?.(i),
      onOpen: () => cbRef.current.onOpen?.(),
      onClose: () => cbRef.current.onClose?.(),
      onSheetDismissed: (i) => cbRef.current.onSheetDismissed?.(i),
    }),
    [],
  );

  const registerSheetDismissed = useCallback((fn: () => void) => {
    dismissedRef.current = fn;
  }, []);
  const sheetDismissed = useCallback(() => {
    dismissedRef.current?.();
  }, []);

  const value = useMemo<MorphContextValue>(
    () => ({
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
      fabIcon,
      closeIcon,
      callbacks,
      selectedRef,
      registerSheetDismissed,
      sheetDismissed,
    }),
    [
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
      fabIcon,
      closeIcon,
      callbacks,
      registerSheetDismissed,
      sheetDismissed,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Truy cập trạng thái morph. Phải nằm trong `<MorphProvider>`. */
export function useMorph(): MorphContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMorph() must be used inside <MorphProvider>');
  return ctx;
}

/**
 * Tiến trình morph để animate UI của bạn theo:
 *   menu  0 → 1  FAB → card
 *   sheet 0 → 1  card → full screen
 * Chỉ đọc — ghi vào sẽ phá vỡ logic giao ca.
 */
export function useMorphProgress(): {
  menu: SharedValue<number>;
  sheet: SharedValue<number>;
} {
  const { menu, sheet } = useMorph();
  return useMemo(() => ({ menu, sheet }), [menu, sheet]);
}
