/**
 * Mock backend of the basic example.
 *
 *   POST /auth/device       anonymous session (no login screen in this app)
 *   POST /auth/refresh      token rotation (shared mock server)
 *   GET  /sheets/:key       content of a sheet screen
 *
 * Latency is fixed at about 700 ms so the effect of prefetching on hover is
 * visible: press and drag to a row, and the screen opens with data already
 * loaded; tap quickly, and the skeleton shows while the request runs.
 */

import { chaosFromEnv, createMockServer, error, json, route } from '../../example-shared/api/mockServer';

export const API_BASE_URL = 'https://api.morphmenu.mock/v1';

export type SheetPayload = { key: string; headline: string; paragraphs: string[] };

const KNOWN = new Set(['camera', 'store', 'audio', 'checkin']);

let deviceCount = 0;

export const server = createMockServer({
  baseUrl: API_BASE_URL,
  secret: 'morphmenu-mock-secret',
  anonymous: () => `device_${++deviceCount}`,
  accessTtlSec: 45,
  latencyMs: [650, 750],
  // `npm run example:trace` (end-to-end tests) sets EXPO_PUBLIC_API_CHAOS=off.
  chaos: chaosFromEnv('low'),
  routes: [
    route('GET', '/sheets/:key', ({ params }) => {
      if (!KNOWN.has(params.key)) return error(404, 'not_found', 'Unknown sheet');
      return json({
        key: params.key,
        headline: `Dữ liệu của ${params.key}`,
        paragraphs: [
          'Nội dung này được tải qua RTK Query từ một REST API giả lập, độ trễ khoảng 700 ms.',
          'Nếu bạn giữ nút “+” rồi rê ngón tay qua các dòng trước khi nhả, request đã bắt đầu từ lúc rê (onHover → prefetch), nên thời gian chờ bên dưới gần bằng 0.',
          'Nếu bạn chạm nhanh vào một dòng, không có pha rê để tranh thủ, và bạn sẽ thấy skeleton.',
          'Mở màn Network ở trang chủ để xem token, các lần thử lại và chế độ giả lập lỗi.',
        ],
      } satisfies SheetPayload);
    }),
  ],
});
