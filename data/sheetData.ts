/**
 * Một lớp dữ liệu giả, đủ chậm để nhìn thấy hiệu quả của prefetch.
 *
 * Trong app thật thay chỗ này bằng react-query (`prefetchQuery`), SWR, hay
 * `router.prefetch`. Điều đáng giữ lại là *thời điểm* gọi: ngay khi ngón tay
 * rê lên một dòng, tức là sớm hơn lúc nhả tay 150–400ms.
 */

import { useEffect, useState } from 'react';

export type SheetPayload = { headline: string; paragraphs: string[] };

const LATENCY = 700;

type Entry = { promise: Promise<SheetPayload>; startedAt: number };
const cache = new Map<string, Entry>();

function load(key: string): Promise<SheetPayload> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          headline: `Dữ liệu của ${key}`,
          paragraphs: [
            'Nội dung này được nạp bất đồng bộ với độ trễ giả lập 700ms.',
            'Nếu bạn giữ nút “+” rồi rê ngón tay qua các dòng trước khi nhả, phần nạp đã bắt đầu từ lúc rê — nên thời gian chờ bên dưới sẽ gần bằng 0.',
            'Nếu bạn chỉ chạm nhanh vào một dòng, không có pha rê nào để tranh thủ, và bạn sẽ thấy skeleton.',
          ],
        }),
      LATENCY,
    ),
  );
}

/** Gọi khi ngón tay rê lên dòng. Gọi nhiều lần vô hại. */
export function prefetchSheet(key: string): void {
  if (cache.has(key)) return;
  cache.set(key, { promise: load(key), startedAt: Date.now() });
}

export function useSheetData(key: string) {
  const [data, setData] = useState<SheetPayload | null>(null);
  const [waitedMs, setWaitedMs] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    prefetchSheet(key);
    const entry = cache.get(key)!;
    const subscribedAt = Date.now();
    entry.promise.then((payload) => {
      if (!alive) return;
      setData(payload);
      setWaitedMs(Date.now() - subscribedAt);
    });
    return () => {
      alive = false;
    };
  }, [key]);

  return { data, waitedMs };
}
