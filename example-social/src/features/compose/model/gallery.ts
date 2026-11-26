/**
 * Photos in the device gallery, shown by the photo picker. Client-side data:
 * in a real app this comes from expo-media-library, not from the API.
 */

import type { Media } from '../../../core/api/dto';

export const GALLERY: Media[] = [
  { color: '#0f766e', icon: 'leaf', aspect: 1 },
  { color: '#c2410c', icon: 'sunny', aspect: 1 },
  { color: '#1d4ed8', icon: 'water', aspect: 1 },
  { color: '#7c2d12', icon: 'cafe', aspect: 1 },
  { color: '#4338ca', icon: 'moon', aspect: 1 },
  { color: '#15803d', icon: 'bicycle', aspect: 1 },
  { color: '#9d174d', icon: 'musical-notes', aspect: 1 },
  { color: '#334155', icon: 'airplane', aspect: 1 },
  { color: '#a16207', icon: 'pizza', aspect: 1 },
  { color: '#0369a1', icon: 'boat', aspect: 1 },
  { color: '#6d28d9', icon: 'planet', aspect: 1 },
  { color: '#be123c', icon: 'flower', aspect: 1 },
];

