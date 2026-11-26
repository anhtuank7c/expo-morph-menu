/**
 * Photo picker, the root screen of a two-step flow inside the sheet:
 * photo (pick) → crop (edit and post). The second step is a regular push on
 * the sheet's inner native Stack.
 */

import { useRouter } from 'expo-router';
import { useMorphSettled } from 'expo-morph-menu';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Media } from '../../components/Media';
import { SheetHeader } from '../../components/SheetHeader';
import { PHOTOS } from '../../api/seed';
import { theme } from '../../theme';

const COLUMNS = 3;
const GAP = 2;

export default function PhotoPicker() {
  const router = useRouter();
  const settled = useMorphSettled();
  const { width } = useWindowDimensions();
  const size = (width - GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <View style={styles.screen}>
      <SheetHeader title="Recent photos" />
      {settled ? (
        <FlatList
          data={PHOTOS}
          numColumns={COLUMNS}
          keyExtractor={(_, i) => String(i)}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{ gap: GAP }}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/compose/crop', params: { index: String(index) } })}
              testID={`photo-${index}`}
            >
              <Media media={item} style={{ width: size, height: size }} iconSize={32} />
            </Pressable>
          )}
        />
      ) : (
        // Lightweight placeholder while the sheet expands.
        <View style={styles.placeholder}>
          <Text style={styles.muted}>Loading photos...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: theme.textMuted },
});
