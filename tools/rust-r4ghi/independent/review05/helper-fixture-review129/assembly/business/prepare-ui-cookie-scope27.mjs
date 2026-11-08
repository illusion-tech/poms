// Root metadata-only preparation from explicitly pinned actual login headers.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { readCookiePin27, deriveScopeProof27 } from './ui-cookie-scope27.mjs';
export function prepareCookieScope27(inputPin, outputFile) {
  const input = JSON.parse(readCookiePin27(inputPin)); assert.deepEqual(Object.keys(input).sort(), ['apiProcess', 'authReceipts']);
  const proof = deriveScopeProof27(input); const privateRoot = process.platform === 'win32' ? '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private' : '/home/wangzishi/.local/share/poms-r4ghi/private';
  const relative = path.relative(path.resolve(privateRoot), path.resolve(outputFile)); assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative)); assert.equal(fs.realpathSync(path.dirname(outputFile)), path.resolve(path.dirname(outputFile)));
  const bytes = Buffer.from(JSON.stringify(proof, null, 2) + '\n'); fs.writeFileSync(outputFile, bytes, { flag: 'wx', mode: 0o600 });
  return { file: outputFile, rawBytesSha256: createHash('sha256').update(bytes).digest('hex'), cookieValuesStored: false, authAuthorityGranted: false, RootPlanReviewStillRequired: true };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const args = process.argv.slice(2); assert(args.length === 6 && args[0] === '--input' && args[2] === '--approved-input-sha' && args[4] === '--output'); console.log(JSON.stringify(prepareCookieScope27({ file: args[1], rawBytesSha256: args[3] }, args[5]))); }
  catch { console.error('Cookie scope metadata preparation failed; inspect exact private inputs, without printing token/header/assertion values.'); process.exitCode = 1; }
}
