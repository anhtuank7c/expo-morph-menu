import { Stack } from 'expo-router';
import { MorphSheetLayout } from 'expo-morph-menu';

/** Mọi route trong nhóm (sheet) nở ra từ card menu và thu về lại card. */
export default function SheetLayout() {
  return (
    <MorphSheetLayout>
      <Stack.Screen name="[key]" options={{ headerShown: false }} />
    </MorphSheetLayout>
  );
}
