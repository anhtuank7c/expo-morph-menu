import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { MorphMenu, MorphProvider, MorphTrace, morphSheetScreenOptions } from 'expo-morph-menu';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CUSTOM_COMPONENTS, CUSTOM_CONFIG, customItemHeight } from '../components/CustomSlots';
import { DemoContext, type UiVariant } from '../context/demo';
import { ITEMS } from '../data/items';
import { prefetchSheet } from '../data/sheetData';

/** `npm run example:trace` enables the per-frame trace used by the end-to-end tests. */
const TRACE = process.env.EXPO_PUBLIC_MORPH_TRACE === '1';

/** A deep link into the sheet keeps the home screen below it, so closing has a screen to return to. */
export const unstable_settings = { anchor: 'index' };

export default function RootLayout() {
  const [variant, setVariant] = useState<UiVariant>('default');
  const demo = useMemo(() => ({ variant, setVariant }), [variant]);
  const custom = variant === 'custom';

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <DemoContext.Provider value={demo}>
          <MorphProvider
            items={ITEMS}
            // Called while the pointer is on a row, before the row is selected.
            onHover={(item) => prefetchSheet(item.key)}
            // Icon for every <MorphCloseButton>: an element, an image source, or a function.
            closeIcon={({ size, color }) => <Ionicons name="close" size={size} color={color} />}
            // The custom variant replaces every visible part through slots.
            components={custom ? CUSTOM_COMPONENTS : undefined}
            itemHeight={custom ? customItemHeight : undefined}
            // The screens of this app are light only, so the close button uses light colors too.
            config={custom ? { ...CUSTOM_CONFIG, colorScheme: 'light' } : { colorScheme: 'light' }}
          >
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(sheet)" options={morphSheetScreenOptions} />
            </Stack>

            {/* After the navigator, so the button and the card are drawn above every screen.
                The menu has no route of its own. */}
            <MorphMenu />
            {TRACE && <MorphTrace />}
            <StatusBar style="auto" />
          </MorphProvider>
        </DemoContext.Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
