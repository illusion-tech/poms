import { pathToFileURL } from 'node:url';
import { serveRelay24 } from './ui-relay-common24.mjs';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const startup = setTimeout(() => { console.error('Owned Windows byte relay startup deadline'); process.exit(1); }, 30000);
  try { await serveRelay24('windows', process.argv.slice(2), import.meta.url); } finally { clearTimeout(startup); }
}
