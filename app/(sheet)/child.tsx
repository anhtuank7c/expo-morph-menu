import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function Child() {
  const { from } = useLocalSearchParams<{ from: string }>();
  return (
    <>
      <Stack.Screen options={{ title: 'Màn hình con' }} />
      <View style={styles.root}>
        <Text style={styles.text}>Được push từ “{from}”.</Text>
        <Text style={styles.note}>
          Đây là native-stack lồng bên trong vỏ morph. Swipe-back của iOS và nút
          back của Android đều hoạt động nguyên bản, không phải mô phỏng — vì
          navigator này là UINavigationController / Fragment thật.
        </Text>
        <Text style={styles.note}>
          Vuốt cạnh trái ở đây là back về màn gốc của sheet (native). Kéo xuống
          (nếu bật trong config) vẫn đóng cả sheet, giống sheet của iOS.
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  text: { fontSize: 18, fontWeight: '600', color: '#1c1c1e' },
  note: { fontSize: 13, color: '#8e8e93', textAlign: 'center', lineHeight: 19 },
});
