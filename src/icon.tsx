/**
 * `MorphIcon`: một icon ở bất kỳ dạng nào người dùng có sẵn.
 *
 *   <Ionicons name="camera" size={15} color="#fff" />   element (icon font, SVG…)
 *   <CameraSvg width={15} height={15} />               component từ react-native-svg
 *   require('./camera.png')                            ảnh trong bundle
 *   { uri: 'https://…/camera.png' }                    ảnh từ mạng
 *   ({ size, color }) => <Ionicons name="camera" size={size} color={color} />
 *                                                      hàm: nhận size/color theo theme
 */

import React from 'react';
import { Image, type ImageSourcePropType, type ImageStyle, type StyleProp } from 'react-native';

export type MorphIconRenderProps = { size: number; color: string };

export type MorphIcon =
  React.ReactElement | ImageSourcePropType | ((props: MorphIconRenderProps) => React.ReactNode);

export type RenderIconOptions = MorphIconRenderProps & {
  /**
   * Tô màu ảnh PNG đơn sắc bằng `color` (tintColor). Mặc định true — đúng với
   * icon glyph; đặt false cho ảnh nhiều màu.
   */
  tint?: boolean;
  style?: StyleProp<ImageStyle>;
};

function isImageSource(icon: unknown): icon is ImageSourcePropType {
  if (typeof icon === 'number') return true; // require('./x.png')
  if (Array.isArray(icon)) return icon.every((s) => s && typeof s === 'object' && 'uri' in s);
  return !!icon && typeof icon === 'object' && 'uri' in icon;
}

/** Vẽ một `MorphIcon`. Trả `null` khi không có icon. */
export function renderIcon(
  icon: MorphIcon | null | undefined,
  { size, color, tint = true, style }: RenderIconOptions,
): React.ReactNode {
  if (icon == null) return null;
  if (typeof icon === 'function') return icon({ size, color });
  if (React.isValidElement(icon)) return icon;
  if (isImageSource(icon)) {
    return (
      <Image
        source={icon}
        resizeMode="contain"
        style={[{ width: size, height: size }, tint ? { tintColor: color } : null, style]}
      />
    );
  }
  return null;
}
