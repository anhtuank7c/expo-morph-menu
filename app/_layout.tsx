import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import MorphingMenu from '../components/MorphingMenu';
import { MorphProvider } from '../morph/MorphProvider';
import { MORPH_TRACE, MorphTrace } from '../morph/trace';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Cấu hình mặc định theo platform (morph/config.ts). Ghi đè ví dụ:
            <MorphProvider config={{ closeMenuOnDismiss: true }}> */}
        <MorphProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen
              name="(sheet)"
              options={{
                // Route thật, nhưng tắt animation mặc định vì morph do ta lái.
                presentation: 'transparentModal',
                animation: 'none',
                gestureEnabled: false,
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
          </Stack>

          {/* Overlay nằm NGOÀI navigator: nó là affordance tạm thời,
              không phải điểm đến, nên không cần URL. */}
          <MorphingMenu />
          {MORPH_TRACE && <MorphTrace />}
          <StatusBar style="dark" />
        </MorphProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
