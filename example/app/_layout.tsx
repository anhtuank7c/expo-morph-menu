import { Ionicons } from '@expo/vector-icons';
import { Stack, usePathname } from 'expo-router';
import { MorphMenu, MorphProvider, MorphTrace, morphSheetScreenOptions } from 'expo-morph-menu';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import { CUSTOM_COMPONENTS, CUSTOM_CONFIG, customItemHeight } from '../components/CustomSlots';
import { DemoContext, type UiVariant } from '../context/demo';
import { ITEMS } from '../data/items';
import { sheetApi } from '../api/sheetApi';
import { SessionGate } from '../components/SessionGate';
import { store } from '../store';

/**
 * Starts loading a sheet's data. RTK Query deduplicates: if the data is
 * cached or already loading, nothing new is sent. Before the session exists
 * there is no token yet, so prefetching waits for the screen itself.
 */
const prefetchSheet = (key: string) => {
  if (store.getState().auth.status !== 'signedIn') return;
  store.dispatch(sheetApi.util.prefetch('getSheet', key, { ifOlderThan: 300 }));
};

/** `npm run example:trace` bật trace từng frame cho e2e (scripts/e2e.mjs). */
const TRACE = process.env.EXPO_PUBLIC_MORPH_TRACE === '1';

/** Deep links into the sheet keep the home screen below it, so closing has a screen to return to. */
export const unstable_settings = { anchor: 'index' };

/** The button is hidden on the Network screen. */
function FloatingMenu() {
  return <MorphMenu hidden={usePathname() === '/dev'} />;
}

export default function RootLayout() {
  const [variant, setVariant] = useState<UiVariant>('default');
  const demo = useMemo(() => ({ variant, setVariant }), [variant]);
  const custom = variant === 'custom';

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <SessionGate />
          <DemoContext.Provider value={demo}>
            <MorphProvider
              items={ITEMS}
              // Rê tay (hoặc hover chuột trên web) lên dòng là lúc nạp trước dữ
              // liệu: sớm hơn lúc nhả tay 150–400ms.
              onHover={(item) => prefetchSheet(item.key)}
              // Icon nút đóng dùng chung cho mọi <MorphCloseButton>. Nhận được
              // element, ảnh (require/uri) hoặc hàm ({ size, color }) như dưới.
              closeIcon={({ size, color }) => <Ionicons name="close" size={size} color={color} />}
              // Bộ "tuỳ biến": mọi phần nhìn thấy được thay bằng slot.
              components={custom ? CUSTOM_COMPONENTS : undefined}
              itemHeight={custom ? customItemHeight : undefined}
              // Các màn của app ví dụ chỉ có giao diện sáng, nên ép 'light' — nếu không,
              // trình duyệt/OS ở chế độ tối sẽ cho nút đóng màu sáng trên nền trắng.
              config={custom ? { ...CUSTOM_CONFIG, colorScheme: 'light' } : { colorScheme: 'light' }}
            >
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(sheet)" options={morphSheetScreenOptions} />
                <Stack.Screen name="dev" options={{ headerShown: true, title: 'Network', presentation: 'modal' }} />
              </Stack>

              {/* Overlay nằm NGOÀI navigator, sau nó: menu là affordance tạm
                  thời, không phải điểm đến, nên không cần URL. */}
              <FloatingMenu />
              {TRACE && <MorphTrace />}
              <StatusBar style="auto" />
            </MorphProvider>
          </DemoContext.Provider>
        </Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
