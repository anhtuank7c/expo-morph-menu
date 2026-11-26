import { StyleSheet, View } from 'react-native';

import { theme } from '../theme';

/**
 * List separator. Defined once at module level: an inline
 * `ItemSeparatorComponent={() => <View />}` is a new component type on every
 * render, so React unmounts and remounts every separator each time.
 */
export function Separator() {
  return <View style={styles.line} />;
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border },
});
