/**
 * "Mặt" của card menu: nội dung từng dòng.
 *
 * Dùng ở hai nơi để hai bên giống nhau tới từng pixel:
 *  - overlay (MorphMenu) bọc từng dòng trong Pressable (variant 'menu');
 *  - vỏ sheet vẽ lại đúng mặt này ở góc neo trong lúc thu/nở (variant
 *    'sheet'), để vỏ không bao giờ là một khối trống và lúc giao ca với
 *    overlay thì hai bên trùng khít.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { renderIcon } from './icon';
import { useMorph } from './MorphProvider';
import type { MorphItem, MorphItemProps, MorphSlotVariant } from './types';

/** Dòng mặc định: icon trong vòng tròn `tint` + nhãn. */
export function DefaultItem({ item, colors }: MorphItemProps) {
  const { config } = useMorph();
  const size = config.layout.iconSize;
  const badge = size + 11;
  // Không có vòng tròn tint thì icon mang màu chữ, không phải trắng.
  const color = item.tint ? colors.iconForeground : colors.text;
  return (
    <View style={styles.row}>
      {item.icon != null && (
        <View
          style={[
            styles.icon,
            { width: badge, height: badge, borderRadius: badge / 2 },
            item.tint ? { backgroundColor: item.tint } : null,
          ]}
        >
          {renderIcon(item.icon, { size, color, tint: item.iconTint ?? true })}
        </View>
      )}
      <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
        {item.label}
      </Text>
    </View>
  );
}

/** Nội dung một dòng: slot `Item` của người dùng, hoặc DefaultItem. */
export function RowContent(props: {
  item: MorphItem;
  index: number;
  variant: MorphSlotVariant;
  hovered: SharedValue<number>;
}) {
  const { components, colors, list } = useMorph();
  const Item = components.Item ?? DefaultItem;
  return <Item {...props} height={list.heights[props.index] ?? 0} colors={colors} />;
}

/** Vạch ngăn sau dòng `index` (không có sau dòng cuối). */
export function RowSeparator({ index }: { index: number }) {
  const { components, colors, config, items } = useMorph();
  const Separator = components.Separator;
  if (!Separator || index >= items.length - 1) return null;
  return (
    <View style={{ height: config.layout.separatorHeight }}>
      <Separator index={index} colors={colors} />
    </View>
  );
}

/** Bản tĩnh của cả danh sách, neo góc dưới theo `anchor` (variant 'sheet'). */
export function MenuFace() {
  const { items, config, list } = useMorph();
  // Bản trên vỏ không bao giờ có dòng đang hover.
  const none = useSharedValue(-1);
  const right = config.anchor !== 'bottom-left';
  return (
    <View
      pointerEvents="none"
      style={[
        styles.face,
        right ? { right: 0 } : { left: 0 },
        {
          width: config.layout.cardWidth,
          height: list.cardH,
          paddingVertical: config.layout.padding,
        },
      ]}
    >
      {items.map((it, i) => (
        <React.Fragment key={it.key}>
          <View style={{ height: list.heights[i] }}>
            <RowContent item={it} index={i} variant="sheet" hovered={none} />
          </View>
          <RowSeparator index={i} />
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  face: { position: 'absolute', bottom: 0 },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  icon: { alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  label: { flexShrink: 1, fontSize: 16, fontWeight: '600' },
});
