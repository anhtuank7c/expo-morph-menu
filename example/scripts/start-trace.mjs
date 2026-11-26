#!/usr/bin/env node
// `expo start` cho app ví dụ, với bộ trace morph bật (EXPO_PUBLIC_MORPH_TRACE=1).
// Dùng cho `npm run e2e`. Tham số thêm được chuyển tiếp:
//   npm run example:trace -- --port 8082 --no-dev --minify
//
// Gọi thẳng CLI của Expo trong node_modules của thư mục cha, KHÔNG qua `npx`:
// example/ không có node_modules riêng, `npx expo` sẽ tải một bản Expo khác
// về cache thay vì dùng bản của project.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const exampleDir = dirname(here);
const require = createRequire(`${exampleDir}/package.json`);
const cli = require.resolve('expo/bin/cli');

const child = spawn(process.execPath, [cli, 'start', ...process.argv.slice(2)], {
  cwd: exampleDir,
  stdio: 'inherit',
  // API faults off: the end-to-end flows assert timing-sensitive UI. Use the
  // Network screen (or EXPO_PUBLIC_API_CHAOS=low) to test retries by hand.
  env: { ...process.env, EXPO_PUBLIC_MORPH_TRACE: '1', EXPO_PUBLIC_API_CHAOS: process.env.EXPO_PUBLIC_API_CHAOS ?? 'off' },
});
child.on('exit', (code) => process.exit(code ?? 0));
