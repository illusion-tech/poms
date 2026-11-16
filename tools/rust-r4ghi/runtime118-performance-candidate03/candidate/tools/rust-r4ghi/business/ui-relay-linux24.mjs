import { pathToFileURL } from 'node:url';
import { serveRelay24, stopLinuxRelay24 } from './ui-relay-common24.mjs';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const stop = process.argv[2] === '--stop', args = process.argv.slice(stop ? 3 : 2);
  const startup = setTimeout(() => { console.error('Owned Linux byte relay startup deadline'); process.exit(1); }, 30000);
  try { await (stop ? stopLinuxRelay24(args, import.meta.url) : serveRelay24('linux', args, import.meta.url)); } finally { clearTimeout(startup); }
}
