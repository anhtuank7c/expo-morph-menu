// Copies the demo GIFs (docs/demo) into public/media for the gallery pages.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const from = path.resolve(here, '..', '..', 'docs', 'demo');
const to = path.resolve(here, '..', 'public', 'media');
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log(`media: copied ${from} to ${to}`);
