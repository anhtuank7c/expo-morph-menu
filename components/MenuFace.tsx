/**
 * "Mặt" của card menu: icon + nhãn từng dòng, không có tương tác.
 *
 * Dùng ở hai nơi để hai bên giống nhau tới từng pixel:
 *  - overlay (MorphingMenu) bọc từng dòng trong Pressable;
 *  - vỏ sheet vẽ lại đúng mặt này ở góc dưới-phải trong lúc thu/nở, để vỏ
 *    không bao giờ là một khối trắng trống và lúc giao ca với overlay thì
 *    hai bên trùng khít, mắt không bắt được.
 */

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { ITEMS, type MorphItem } from '../data/items';
import { CARD_W, PAD, ROW_H } from '../morph/geometry';

export function MenuRowContent({ item }: { item: MorphItem }) {
  return (
    <>
      <View style={[styles.icon, { backgroundColor: item.tint }]}>
        <Ionicons name={item.icon} size={15} color="#fff" />
      </View>
      <Text style={styles.label}>{item.label}</Text>
    </>
  );
}

/** Bản tĩnh của cả danh sách, neo góc dưới-phải của view cha. */
export function MenuFace() {
  return (
    <View style={styles.face} pointerEvents="none">
      {ITEMS.map((it) => (
        <View key={it.key} style={menuRowStyle}>
          <MenuRowContent item={it} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: CARD_W,
    height: ITEMS.length * ROW_H + PAD * 2,
    paddingVertical: PAD,
  },
  row: { height: ROW_H, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  icon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  label: { fontSize: 16, fontWeight: '600', color: '#1c1c1e' },
});

export const menuRowStyle = styles.row;
