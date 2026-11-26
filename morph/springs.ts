import { ReduceMotion } from 'react-native-reanimated';

/**
 * Xấp xỉ `.snappy` của SwiftUI: ~0.46s, gần như không nảy.
 *
 * `ReduceMotion.System` là mặc định của Reanimated, nhưng ghi ra tường minh để
 * người đọc sau biết rằng Reduce Motion đã được tôn trọng — khi người dùng bật
 * tuỳ chọn đó, spring sẽ nhảy thẳng tới giá trị cuối thay vì nội suy.
 */
export const SPRING = {
  duration: 460,
  dampingRatio: 0.85,
  reduceMotion: ReduceMotion.System,
} as const;
