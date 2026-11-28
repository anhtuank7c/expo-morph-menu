import type { ViewStyle } from 'react-native';

/**
 * A centered column: on tablets and unfolded phones the screens of the
 * examples stop at a readable width instead of running across the display.
 */
export const column: ViewStyle = { width: '100%', maxWidth: 640, alignSelf: 'center' };
