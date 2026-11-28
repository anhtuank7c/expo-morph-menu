// The example apps' web builds are single-page apps; GitHub Pages has no
// rewrites, so the screens the pages link to get their own folder with a copy
// of index.html (the app reads the path and shows that screen).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROUTES = {
  playground: ['camera', 'store', 'audio', 'checkin'],
  'playground-social': ['login', 'compose/post', 'compose/photo', 'compose/poll', 'compose/live', 'compose/message'],
};
for (const [folder, routes] of Object.entries(ROUTES)) {
  const out = path.resolve(here, '..', 'public', folder);
  if (!fs.existsSync(path.join(out, 'index.html'))) continue;
  const index = fs.readFileSync(path.join(out, 'index.html'));
  for (const r of routes) {
    fs.mkdirSync(path.join(out, r), { recursive: true });
    fs.writeFileSync(path.join(out, r, 'index.html'), index);
  }
  console.log(`${folder}: ${routes.length} routes`);
}
