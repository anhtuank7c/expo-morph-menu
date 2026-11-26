import { StyleSheet, View } from 'react-native';

/** Giữ chỗ trong lúc vỏ đang nở, để không phải mount nội dung nặng giữa animation. */
export function Skeleton() {
  return (
    <View style={styles.root}>
      {[0.9, 0.7, 0.8, 0.5].map((w, i) => (
        <View key={i} style={[styles.line, { width: `${w * 100}%` }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12, paddingHorizontal: 24, paddingTop: 8 },
  line: { height: 14, borderRadius: 7, backgroundColor: 'rgba(120,120,128,0.12)' },
});
