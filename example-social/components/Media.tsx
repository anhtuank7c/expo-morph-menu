import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Media as MediaData } from '../api/types';

/**
 * Placeholder for a photo: a colored tile with soft shapes and an icon.
 * Stands in for an <Image> so the example has no network dependency.
 */
export function Media({
  media,
  style,
  iconSize = 44,
}: {
  media: MediaData;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
}) {
  return (
    <View style={[styles.tile, { backgroundColor: media.color }, style]}>
      <View style={[styles.blob, styles.blobA]} />
      <View style={[styles.blob, styles.blobB]} />
      <Ionicons name={media.icon} size={iconSize} color="rgba(255,255,255,0.9)" />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
  blobA: { width: '90%', aspectRatio: 1, top: '-35%', left: '-30%' },
  blobB: { width: '70%', aspectRatio: 1, bottom: '-30%', right: '-20%', backgroundColor: 'rgba(0,0,0,0.12)' },
});
