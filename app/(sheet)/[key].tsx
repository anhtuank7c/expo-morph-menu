import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from '../../components/Skeleton';
import { findItem } from '../../data/items';
import { useSheetData } from '../../data/sheetData';
import { useMorph } from '../../morph/MorphProvider';
import { useSettled } from '../../morph/SettledContext';

/** Gợi ý cách đóng, khớp với cử chỉ đang bật trong config. */
function dismissHint(d: { edgeSwipe: boolean; dragDown: boolean }) {
  const ways = [
    d.edgeSwipe && 'vuốt từ cạnh trái',
    d.dragDown && 'kéo xuống',
    Platform.OS === 'android' ? 'nút × hoặc back cứng' : 'nút ×',
  ].filter(Boolean);
  return `Đóng bằng ${ways.join(', ')}. Deep link chạy được vì đây là route thật.`;
}

export default function SheetRoot() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const item = findItem(key);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const settled = useSettled();
  const { config } = useMorph();
  const { data, waitedMs } = useSheetData(item.key);

  // Chỉ dựng nội dung khi vỏ đã đứng yên VÀ dữ liệu đã về.
  const ready = settled && data !== null;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable
          hitSlop={12}
          onPress={() => router.back()}
          style={styles.close}
          accessibilityRole="button"
          testID="sheet-close"
          accessibilityLabel="Đóng"
        >
          <Ionicons name="close" size={18} color="#1c1c1e" />
        </Pressable>
        <View style={styles.title}>
          <View style={[styles.icon, { backgroundColor: item.tint }]}>
            <Ionicons name={item.icon} size={15} color="#fff" />
          </View>
          <Text style={styles.titleText}>{item.label}</Text>
        </View>
        <View style={styles.ghost} />
      </View>

      {ready ? (
        <ScrollView
          testID="sheet-content"
          // Vỏ giờ phủ tới tận mép đáy, nên chừa chỗ cho home indicator /
          // thanh điều hướng để dòng cuối không bị che.
          contentContainerStyle={[styles.body, { paddingBottom: 24 + insets.bottom }]}
        >
          <Text style={styles.lead}>{data.headline}</Text>

          <View style={styles.badge}>
            <Ionicons
              name={waitedMs !== null && waitedMs < 80 ? 'flash' : 'hourglass-outline'}
              size={14}
              color={waitedMs !== null && waitedMs < 80 ? '#30d158' : '#8e8e93'}
            />
            <Text style={styles.badgeText}>
              {waitedMs !== null && waitedMs < 80
                ? `Chờ ${waitedMs}ms — đã nạp trước khi rê tay`
                : `Chờ ${waitedMs}ms — không có pha rê để tranh thủ`}
            </Text>
          </View>

          {data.paragraphs.map((p, i) => (
            <Text key={i} style={styles.para}>
              {p}
            </Text>
          ))}

          <Link
            href={{ pathname: '/(sheet)/child', params: { from: item.key } }}
            asChild
          >
            <Pressable style={styles.cta}>
              <Text style={styles.ctaText}>Mở màn hình con</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </Pressable>
          </Link>

          <Text style={styles.note}>{dismissHint(config.dismiss)}</Text>
        </ScrollView>
      ) : (
        <Skeleton />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  title: { alignItems: 'center', gap: 4 },
  titleText: { fontSize: 13, fontWeight: '600', color: '#1c1c1e' },
  icon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,120,128,0.12)',
  },
  ghost: { width: 32 },
  body: { padding: 24, gap: 16, alignItems: 'flex-start' },
  lead: { fontSize: 20, fontWeight: '700', color: '#1c1c1e' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(120,120,128,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, color: '#3a3a3c', fontWeight: '600' },
  para: { fontSize: 15, color: '#3a3a3c', lineHeight: 22 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0a84ff',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 4,
  },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  note: { fontSize: 13, color: '#8e8e93', lineHeight: 19 },
});
