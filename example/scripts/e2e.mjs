#!/usr/bin/env node
/**
 * E2E cho morph: chạy Maestro, rồi quét logcat tìm flicker.
 *
 * Maestro kiểm tra HÀNH VI (mở/đóng đúng, chạm đúng chỗ). Còn flicker xảy ra
 * trong vài frame, nằm dưới tầm screenshot của Maestro, nên bắt bằng trace
 * từng frame của morph/trace.tsx (in ra logcat qua console.log).
 *
 *   npm run e2e                     # mọi flow trong .maestro/
 *   npm run e2e -- .maestro/02-sheet-close-button.yaml
 *
 * Cần: Metro chạy bằng `npm run start:trace`, thiết bị Android có Expo Go
 * (nhiều thiết bị thì chọn bằng ANDROID_SERIAL; Metro khác cổng thì METRO_PORT),
 * `maestro` trong PATH (hoặc ~/.maestro/maestro/bin) và Java 17+
 * (JAVA_HOME; nếu thiếu sẽ thử JBR của Android Studio).
 *
 * Thoát với mã ≠ 0 khi Maestro trượt HOẶC trace có FLICKER / HOLE / GHOST / OVERLAP.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { homedir, networkInterfaces } from 'node:os';
import { join } from 'node:path';

const isWin = process.platform === 'win32';
const env = { ...process.env };

if (!env.JAVA_HOME) {
  const jbr = isWin
    ? 'C:/Program Files/Android/Android Studio/jbr'
    : '/Applications/Android Studio.app/Contents/jbr/Contents/Home';
  if (existsSync(jbr)) env.JAVA_HOME = jbr;
}
const maestroBin = join(homedir(), '.maestro', 'maestro', 'bin');
env.PATH = [env.JAVA_HOME && join(env.JAVA_HOME, 'bin'), maestroBin, env.PATH]
  .filter(Boolean)
  .join(isWin ? ';' : ':');
// Git Bash trên Windows đổi "/sdcard/..." thành đường dẫn Windows.
env.MSYS_NO_PATHCONV = '1';

// adb là .exe nên KHÔNG cần shell — và không được dùng: kill() một tiến trình
// chạy qua shell trên Windows chỉ giết cmd.exe, `adb logcat` sống tiếp mồ côi.
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { env, encoding: 'utf8', ...opts });

const serials = (run('adb', ['devices']).stdout ?? '')
  .split(/\r?\n/)
  .map((l) => l.match(/^(\S+)\tdevice$/)?.[1])
  .filter(Boolean);
if (serials.length === 0) {
  console.error('Không thấy thiết bị Android nào trong `adb devices`.');
  process.exit(2);
}
// Nhiều thiết bị: chọn bằng ANDROID_SERIAL (adb tự đọc biến này).
const serial = env.ANDROID_SERIAL ?? (serials.length === 1 ? serials[0] : undefined);
if (!serial || !serials.includes(serial)) {
  console.error(`Có ${serials.length} thiết bị: ${serials.join(', ')}.`);
  console.error('Chọn một bằng ANDROID_SERIAL, ví dụ: ANDROID_SERIAL=emulator-5554 npm run e2e');
  process.exit(2);
}
env.ANDROID_SERIAL = serial;
console.log(`Thiết bị: ${serial}`);

const port = env.METRO_PORT ?? '8081';
run('adb', ['reverse', `tcp:${port}`, `tcp:${port}`]);
run('adb', ['logcat', '-c']);

/* URL Metro cho Expo Go. Ưu tiên METRO_URL người dùng đặt; không thì dùng IP
   LAN của máy. Không mặc định 127.0.0.1: `adb reverse` không chạy trên một số
   emulator kết nối adb qua TCP (MEmu, LDPlayer…) và Expo Go kẹt ở màn tải. */
function lanIp() {
  const all = Object.values(networkInterfaces()).flat().filter(Boolean);
  const v4 = all.filter((a) => a.family === 'IPv4' && !a.internal);
  return (v4.find((a) => /^(192\.168|10)\./.test(a.address)) ?? v4[0])?.address;
}
const metroUrl = env.METRO_URL ?? `exp://${lanIp() ?? '127.0.0.1'}:${port}`;
console.log(`Metro: ${metroUrl}`);

/* Đọc logcat LIÊN TỤC trong lúc test chạy. Đọc một lần ở cuối (`logcat -d`)
   thì mất phần lớn trace: driver của Maestro log rất nhiều, bộ đệm logcat
   (~256KB) xoay vòng giữa chừng. */
let logBuf = '';
const logcat = spawn('adb', ['logcat', '-v', 'raw', '-s', 'ReactNativeJS:V'], { env });
logcat.stdout.setEncoding('utf8');
logcat.stdout.on('data', (chunk) => {
  logBuf += chunk;
});

const targets = process.argv.slice(2);
const maestro = await new Promise((resolve) => {
  const p = spawn(
    'maestro',
    ['--device', serial, 'test', '-e', `METRO_URL=${metroUrl}`, ...(targets.length ? targets : ['.maestro'])],
    { env, shell: isWin, stdio: 'inherit' },
  );
  p.on('close', (status) => resolve({ status }));
});

await new Promise((r) => setTimeout(r, 1500)); // vét nốt dòng cuối
logcat.kill();

const frames = logBuf
  .split(/\r?\n/)
  .filter((l) => l.includes('[morph]'))
  .map((l) => l.slice(l.indexOf('[morph]')));
writeFileSync('e2e-trace.log', frames.join('\n') + '\n');

const bad = frames.filter((l) => / (FLICKER|HOLE|GHOST|OVERLAP)\b/.test(l));
const handoffs = frames.filter((l) => / handoff\b/.test(l)).length;

console.log('\n── Trace morph ─────────────────────────────────────────');
const drops = frames.filter((l) => / DROP\(/.test(l)).length;
console.log(
  `frames: ${frames.length}   handoff có chủ đích: ${handoffs}   rớt frame: ${drops}   lỗi: ${bad.length}`,
);
console.log('chi tiết: e2e-trace.log');
if (frames.length === 0) {
  console.log('⚠ Không có frame nào — hãy chạy Metro bằng `npm run start:trace` (bật MORPH_TRACE).');
}
for (const l of bad.slice(0, 20)) console.log('  ' + l);

const ok = maestro.status === 0 && bad.length === 0 && frames.length > 0;
console.log(ok ? '\n✔ PASS' : '\n✘ FAIL');
process.exit(ok ? 0 : 1);
