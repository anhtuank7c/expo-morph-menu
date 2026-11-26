import { Link } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDemo, type UiVariant } from '../context/demo';

const VARIANTS: { key: UiVariant; label: string }[] = [
  { key: 'default', label: 'Mặc định' },
  { key: 'custom', label: 'Tuỳ biến (slot)' },
];

/** Chỉ để hiển thị: bề mặt mặc định ('auto') theo platform. */
const SURFACE_HINT =
  Platform.OS === 'ios' ? 'Liquid Glass (iOS 26+) hoặc blur' : 'nền đặc';

export default function Home() {
  const insets = useSafeAreaInsets();
  const { variant, setVariant } = useDemo();
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

      <Text style={styles.caption}>Giao diện</Text>
      <View style={styles.segment}>
        {VARIANTS.map((v) => (
          <Pressable
            key={v.key}
            testID={`variant-${v.key}`}
            onPress={() => setVariant(v.key)}
            style={[styles.segItem, variant === v.key && styles.segActive]}
          >
            <Text style={[styles.segText, variant === v.key && styles.segTextActive]}>
              {v.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.caption}>API giả lập</Text>
      <View style={styles.card}>
        <Text style={styles.step}>
          Dữ liệu của màn full screen được tải bằng RTK Query từ một REST API giả lập: JWT access token
          hết hạn sau 45 giây và được refresh tự động, lỗi mạng được thử lại theo exponential backoff.
        </Text>
        <Link href="/dev" style={styles.link} testID="open-dev">
          Mở màn Network
        </Link>
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
        Bề mặt mặc định: {SURFACE_HINT}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  link: { color: '#0a84ff', fontSize: 15, fontWeight: '600' },
  root: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: '800', color: '#1c1c1e' },
  caption: { fontSize: 13, fontWeight: '700', color: '#8e8e93', marginTop: 6 },
  card: { backgroundColor: 'rgba(120,120,128,0.08)', borderRadius: 16, padding: 14, gap: 10 },
  step: { fontSize: 14, color: '#3a3a3c', lineHeight: 20 },
  code: { fontFamily: 'Menlo', fontSize: 11, color: '#1c1c1e' },
  footer: { fontSize: 12, color: '#8e8e93', marginTop: 10 },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderRadius: 10,
    padding: 2,
  },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 1 },
  segText: { fontSize: 13, fontWeight: '600', color: '#8e8e93' },
  segTextActive: { color: '#1c1c1e' },
});
