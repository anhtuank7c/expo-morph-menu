/**
 * A fake data source, slow enough to show the effect of prefetching.
 *
 * In a real app, replace this with your data library (TanStack Query
 * `prefetchQuery`, SWR, RTK Query `util.prefetch`). What matters is when the
 * prefetch is called: from the menu's `onHover`, while the finger is on a
 * row, which is 150 to 400 ms before the finger is released.
 */

import { useEffect, useState } from 'react';

export type SheetPayload = { summary: string };

const LATENCY_MS = 700;

const SUMMARIES: Record<string, string> = {
  camera: 'In a real app this screen would show the camera preview and the shutter button.',
  store: 'In a real app this screen would list products. Here it shows how the screen was opened.',
  audio: 'In a real app this screen would hold a recorder with a waveform.',
  checkin: 'In a real app this screen would show a map with nearby places.',
};

const cache = new Map<string, Promise<SheetPayload>>();

function load(key: string): Promise<SheetPayload> {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ summary: SUMMARIES[key] ?? SUMMARIES.camera }), LATENCY_MS),
  );
}

/** Starts loading the data for a sheet. Safe to call repeatedly. */
export function prefetchSheet(key: string): void {
  if (!cache.has(key)) cache.set(key, load(key));
}

/** Data for a sheet, and how long the screen waited for it after mounting. */
export function useSheetData(key: string) {
  const [data, setData] = useState<SheetPayload | null>(null);
  const [waitedMs, setWaitedMs] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    prefetchSheet(key);
    const mountedAt = Date.now();
    cache.get(key)!.then((payload) => {
      if (!alive) return;
      setData(payload);
      setWaitedMs(Date.now() - mountedAt);
    });
    return () => {
      alive = false;
    };
  }, [key]);

  return { data, waitedMs };
}
