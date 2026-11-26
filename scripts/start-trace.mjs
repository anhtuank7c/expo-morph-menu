#!/usr/bin/env node
// `expo start` với bộ trace morph bật (morph/trace.tsx). Dùng cho `npm run e2e`.
// Tham số thêm được chuyển tiếp: `npm run start:trace -- --clear`.
import { spawn } from 'node:child_process';

const child = spawn('npx', ['expo', 'start', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, EXPO_PUBLIC_MORPH_TRACE: '1' },
});
child.on('exit', (code) => process.exit(code ?? 0));
