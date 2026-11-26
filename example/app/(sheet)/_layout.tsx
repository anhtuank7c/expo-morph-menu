import { Stack } from 'expo-router';
import { MorphSheetLayout } from 'expo-morph-menu';

/** Every route in the (sheet) group expands from the menu card and collapses back into it. */
export default function SheetLayout() {
  return (
    <MorphSheetLayout>
      <Stack.Screen name="[key]" options={{ headerShown: false }} />
    </MorphSheetLayout>
  );
}
