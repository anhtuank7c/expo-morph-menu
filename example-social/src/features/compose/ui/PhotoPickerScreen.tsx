/**
 * Photo picker, the root screen of a two-step flow inside the sheet:
 * photo (pick) then edit (crop and post). The second step is a regular push
 * on the sheet's inner native Stack.
 */

import { router } from 'expo-router';
import { useMorphSettled } from 'expo-morph-menu';
import { memo, useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions, type ListRenderItem } from 'react-native';

import type { Media as MediaData } from '../../../core/api/dto';
import { theme } from '../../../shared/theme';
import { Media } from '../../../shared/ui/Media';
import { SheetHeader } from '../../../shared/ui/SheetHeader';
import { GALLERY } from '../model/gallery';

const COLUMNS = 3;
const GAP = 2;
const keyOf = (_: MediaData, index: number) => String(index);
const openEditor = (index: number) =>
  router.push({ pathname: '/compose/crop', params: { index: String(index) } });

export function PhotoPickerScreen() {
  const settled = useMorphSettled();
  const { width } = useWindowDimensions();
  // One style object for every tile, recomputed only when the width changes.
  const tileStyle = useMemo(() => {
    const size = (width - GAP * (COLUMNS - 1)) / COLUMNS;
    return { width: size, height: size };
  }, [width]);
  const renderItem = useCallback<ListRenderItem<MediaData>>(
    ({ item, index }) => <PhotoTile photo={item} index={index} style={tileStyle} />,
    [tileStyle],
  );

  return (
    <View style={styles.screen}>
      <SheetHeader title="Recent photos" />
      {settled ? (
        <FlatList
          data={GALLERY}
          numColumns={COLUMNS}
          keyExtractor={keyOf}
          renderItem={renderItem}
          columnWrapperStyle={styles.gap}
          contentContainerStyle={styles.gap}
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

const PhotoTile = memo(function PhotoTile({
  photo,
  index,
  style,
}: {
  photo: MediaData;
  index: number;
  style: { width: number; height: number };
}) {
  return (
    <Pressable onPress={() => openEditor(index)} testID={`photo-${index}`}>
      <Media media={photo} style={style} iconSize={32} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  gap: { gap: GAP },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: theme.textMuted },
});
