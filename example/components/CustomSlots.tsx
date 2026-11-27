/**
 * Slot example: every visible part is replaced with the app's own UI.
 *
 * Every slot here is pure (same props, same output) and does not animate its
 * own size, as the slot contract of expo-morph-menu requires. The hover state
 * is read from the `hovered` shared value and animated with Reanimated.
 */

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
  renderIcon,
  type MorphBackgroundProps,
  type MorphComponents,
  type MorphConfigInput,
  type MorphItem,
  type MorphItemProps,
  type MorphLayerProps,
  type MorphTriggerProps,
} from 'expo-morph-menu';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';

const NAVY = '#1f2a44';

function Background(_: MorphBackgroundProps) {
  return <View style={[StyleSheet.absoluteFill, styles.bg]} />;
}

function Item({ item, index, hovered, colors }: MorphItemProps) {
  const subtitle = item.data?.subtitle as string | undefined;
  const hover = useAnimatedStyle(() => ({
    backgroundColor: hovered.value === index ? 'rgba(255,255,255,0.12)' : 'transparent',
  }));
  return (
    <Animated.View style={[styles.item, hover]}>
      <View style={[styles.badge, { backgroundColor: item.tint ?? '#334' }]}>
        {renderIcon(item.icon, { size: 16, color: colors.iconForeground })}
      </View>
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {item.label}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.4)" />
    </Animated.View>
  );
}

function Separator() {
  return <View style={styles.sep} />;
}

function Trigger({ progress }: MorphTriggerProps) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35], [1, 0], Extrapolation.CLAMP),
    transform: [{ rotate: `${interpolate(progress.value, [0, 0.35], [0, 90], Extrapolation.CLAMP)}deg` }],
  }));
  return (
    <Animated.View style={style}>
      <Ionicons name="apps" size={22} color="#fff" />
    </Animated.View>
  );
}

function Scrim(_: MorphLayerProps) {
  return <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />;
}

export const CUSTOM_COMPONENTS: MorphComponents = {
  Background,
  Item,
  Separator,
  Trigger,
  Scrim,
  // The Item slot draws its own hover state, so the default highlight is turned off.
  Highlight: null,
};

export const CUSTOM_CONFIG: MorphConfigInput = {
  radius: { card: 18, fab: 18 },
  layout: { cardWidth: 260, separatorHeight: StyleSheet.hairlineWidth },
  colors: { light: { iconForeground: '#fff' }, dark: { iconForeground: '#fff' } },
};

/** Rows with a subtitle are taller. A pure function of the item data. */
export const customItemHeight = (item: MorphItem) => (item.data?.subtitle ? 58 : 46);

const styles = StyleSheet.create({
  bg: { backgroundColor: NAVY, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)' },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginHorizontal: 6,
    borderRadius: 12,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  texts: { flex: 1 },
  title: { color: '#fff', fontSize: 15, fontWeight: '600' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  sep: { flex: 1, marginHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.15)' },
});
