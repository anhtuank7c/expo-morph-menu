import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LIQUID_GLASS } from '../components/Surface';

export default function Home() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, gap: 14 }}
    >
      <Text style={styles.title}>Morphing Menu</Text>

      <Text style={styles.caption}>Thử theo hai cách để thấy khác biệt</Text>
      <View style={styles.card}>
        <Text style={styles.step}>
          1. Giữ nút “+”, rê ngón tay xuống một dòng rồi nhả. Dữ liệu được nạp
          từ lúc rê, nên màn mở ra đã có sẵn nội dung.
        </Text>
        <Text style={styles.step}>
          2. Chạm “+” rồi chạm nhanh một dòng. Không có pha rê để tranh thủ, bạn
          sẽ thấy skeleton.
        </Text>
      </View>

      <Text style={styles.caption}>Deep link</Text>
      <View style={styles.card}>
        <Text style={styles.code}>npx uri-scheme open morphmenu://sheet/audio --ios</Text>
        <Text style={styles.step}>
          Mở thẳng route, không qua menu. Khi đó không có rect nguồn nên vỏ nở
          nhẹ từ giữa màn.
        </Text>
      </View>

      <Text style={styles.footer}>
        Bề mặt đang dùng: {LIQUID_GLASS ? 'Liquid Glass (iOS 26+)' : 'Blur / nền đặc'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: '800', color: '#1c1c1e' },
  caption: { fontSize: 13, fontWeight: '700', color: '#8e8e93', marginTop: 6 },
  card: { backgroundColor: 'rgba(120,120,128,0.08)', borderRadius: 16, padding: 14, gap: 10 },
  step: { fontSize: 14, color: '#3a3a3c', lineHeight: 20 },
  code: { fontFamily: 'Menlo', fontSize: 11, color: '#1c1c1e' },
  footer: { fontSize: 12, color: '#8e8e93', marginTop: 10 },
});
