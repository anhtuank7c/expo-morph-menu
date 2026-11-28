import { chat } from './chat';
import { delivery } from './delivery';
import { music } from './music';
import { notes } from './notes';
import { shop } from './shop';
import type { Scene } from './types';
import { wallet } from './wallet';

/** The demo apps, in the order of the list on the home screen. */
export const SCENES: Scene[] = [wallet, chat, delivery, shop, music, notes];

export const findScene = (id?: string): Scene | undefined => SCENES.find((s) => s.id === id);
