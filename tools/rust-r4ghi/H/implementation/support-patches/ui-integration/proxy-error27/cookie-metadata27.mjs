// The six owned, already stopped UI03 profiles only. No browser launch.
// SQLite is opened read-only and selects no value/encrypted_value columns.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { DatabaseSync } from 'node:sqlite'; import { createHash } from 'node:crypto'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', base = root + '/tmp/rust-r4ghi/private/ui-runtime14/dom14-source12-03';
const ipc = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/ui/runtime14/dom14-source12-03', sha = bytes => createHash('sha256').update(bytes).digest('hex');
const profiles = [];
for (let index = 0; index < 6; index++) {
  const file = base + '/chrome-profile-' + index + '/Default/Network/Cookies'; assert(fs.lstatSync(file).isFile());
  const sqlite = new DatabaseSync(file, { readOnly: true });
  try { const rows = sqlite.prepare("SELECT name,host_key,path,is_secure,is_httponly,samesite,is_persistent,has_expires FROM cookies WHERE name IN ('poms_session','poms_csrf') ORDER BY name,host_key,path").all();
    profiles.push({ index, file, selectedColumns: ['name', 'host_key', 'path', 'is_secure', 'is_httponly', 'samesite', 'is_persistent', 'has_expires'], rows });
  } finally { sqlite.close(); }
}
function attributes(text) {
  const parts = String(text).split(';'), name = parts.shift().split('=', 1)[0], result = { name };
  for (const part of parts) { const at = part.indexOf('='), key = (at < 0 ? part : part.slice(0, at)).trim().toLowerCase();
    if (['path', 'domain', 'samesite', 'max-age', 'expires'].includes(key)) result[key] = at < 0 ? true : part.slice(at + 1).trim();
    if (['httponly', 'secure'].includes(key)) result[key] = true;
  } return result;
}
const exchanges = JSON.parse(fs.readFileSync(ipc + '/exchanges.json')), raw = [];
for (const exchange of exchanges.exchanges.filter(value => value.privateRaw)) {
  const pin = exchange.privateRaw, file = ipc + '/http/' + pin.file, bytes = fs.readFileSync(file); assert.equal(sha(bytes), pin.rawBytesSha256); const entry = JSON.parse(bytes);
  assert.equal(entry.request.method, 'GET'); assert.equal(entry.response.status, 200); assert.equal(entry.response.complete, true); assert.equal(entry.failure, null);
  raw.push({ index: exchange.index, method: entry.request.method, path: entry.request.path, rawBytesSha256: pin.rawBytesSha256,
    setCookieMetadata: (entry.response.headers['set-cookie'] ?? []).map(attributes) });
}
const result = { kind: 'H-FS-only-UI03-cookie-scope-metadata-diagnosis', profiles, actualForwardedAuthAndCSRFRawResponses: raw,
  requestBoundary: { total: exchanges.exchanges.length, actuallyForwardedRaw: raw.length, beforeForwardRejected: exchanges.failures.length, allIncomingRequestsGET: exchanges.exchanges.every(value => value.method === 'GET'), noBusinessPOSTOrPUTObserved: exchanges.exchanges.every(value => ['GET', 'HEAD'].includes(value.method)) },
  cookieValuesSelectedOrEmitted: false, CookieSQLiteReadOnly: true, businessPGAccess: false, newHTTPIssued: false, BrowserLaunched: false, RootProductWritten: false };
fs.writeFileSync(here + '/cookie-metadata27.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ profiles, distinctSetCookieScopes: [...new Set(raw.flatMap(value => value.setCookieMetadata.map(cookie => JSON.stringify({ name: cookie.name, path: cookie.path, domain: cookie.domain ?? null, httpOnly: cookie.httponly === true, secure: cookie.secure === true, sameSite: cookie.samesite }))))].map(JSON.parse), requestBoundary: result.requestBoundary, outputSHA256: sha(fs.readFileSync(here + '/cookie-metadata27.json')) }));
