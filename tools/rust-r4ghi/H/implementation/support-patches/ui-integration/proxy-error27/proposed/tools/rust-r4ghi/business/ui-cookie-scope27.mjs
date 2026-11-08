// Browser seed scope is proved by real successful auth response headers.
// No HTTP, browser launch, token mint, or top-level I/O.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', privateRoot = '/home/wangzishi/.local/share/poms-r4ghi/private/';
const names = ['poms_csrf', 'poms_session'], sha = value => createHash('sha256').update(value).digest('hex');
function location(file) { if (file.startsWith(privateRoot)) return process.platform === 'win32' ? '//wsl.localhost/Debian' + file : file; if (file.startsWith('/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tmp/rust-r4ghi/')) return process.platform === 'win32' ? root + file.slice('/mnt/e/projects/worktrees/poms-r3hijk-next28/poms'.length) : file; assert(process.platform === 'win32' && file.startsWith(root + '/tmp/rust-r4ghi/')); return file; }
export function readCookiePin27(pin) { assert(pin && typeof pin.file === 'string' && /^[a-f0-9]{64}$/.test(pin.rawBytesSha256)); const file = location(pin.file), stat = fs.lstatSync(file); assert(stat.isFile() && !stat.isSymbolicLink()); const bytes = fs.readFileSync(file); assert(sha(bytes) === pin.rawBytesSha256, 'Cookie metadata source changed'); return bytes; }
export function responseScopes27(rawHeaders, issuerOrigin) {
  const origin = new URL(issuerOrigin); assert.equal(origin.origin, 'http://127.0.0.1:31441'); assert(Array.isArray(rawHeaders) && rawHeaders.length % 2 === 0); const result = [];
  for (let index = 0; index < rawHeaders.length; index += 2) {
    if (String(rawHeaders[index]).toLowerCase() !== 'set-cookie') continue;
    const parts = String(rawHeaders[index + 1]).split(';'), first = parts.shift(), at = first.indexOf('='); assert(at > 0); const name = first.slice(0, at); assert(names.includes(name), 'Unexpected auth cookie name');
    const attributes = new Map(); for (const part of parts) { const delimiter = part.indexOf('='), key = (delimiter < 0 ? part : part.slice(0, delimiter)).trim().toLowerCase(); assert(!attributes.has(key), 'Duplicate Set-Cookie attribute'); attributes.set(key, delimiter < 0 ? true : part.slice(delimiter + 1).trim()); }
    assert(attributes.has('path'), 'Explicit real cookie Path is required'); const cookiePath = attributes.get('path'); assert(typeof cookiePath === 'string' && cookiePath.startsWith('/') && !/[;\r\n?#]/.test(cookiePath));
    const explicitDomain = attributes.get('domain'); assert(explicitDomain === undefined || explicitDomain === origin.hostname, 'This owned fixture cannot seed a foreign/superdomain cookie');
    const sameSite = attributes.get('samesite'); assert(['Lax', 'Strict', 'None'].includes(sameSite)); const secure = attributes.has('secure'); assert(sameSite !== 'None' || secure);
    assert(attributes.has('max-age') && /^[0-9]+$/.test(attributes.get('max-age')) && BigInt(attributes.get('max-age')) > 0n, 'A cleared/expired cookie is not an active seed source');
    const httpOnly = attributes.has('httponly'); assert.equal(httpOnly, name === 'poms_session');
    result.push({ name, domain: explicitDomain ?? origin.hostname, path: cookiePath, httpOnly, secure, sameSite, hostOnly: explicitDomain === undefined });
  }
  assert.deepEqual(result.map(cookie => cookie.name).sort(), names); return result.sort((a, b) => a.name.localeCompare(b.name));
}
export function deriveScopeProof27({ apiProcess, authReceipts }) {
  const processRecord = JSON.parse(readCookiePin27(apiProcess)); assert.equal(processRecord.namespace, 'poms-r4ghi'); assert.equal(processRecord.port, 31441); assert.equal(processRecord.root, '/home/wangzishi/projects/poms-rust-r4ghi');
  assert(Array.isArray(authReceipts) && authReceipts.length > 0); const receipts = []; let scopes = null;
  for (const pin of authReceipts) {
    const receipt = JSON.parse(readCookiePin27(pin)); assert.equal(receipt.kind, 'actual-business-HTTP-attempt'); assert.equal(receipt.operationId, 'AuthController_createPasswordAuthSession'); assert.equal(receipt.status, 200); assert.equal(receipt.responseComplete, true); assert.equal(receipt.transportFailure, false);
    const headerPin = receipt.originals.responseHeaders, headers = JSON.parse(readCookiePin27(headerPin)); assert.equal(headers.status, 200); const actual = responseScopes27(headers.rawHeaders, 'http://127.0.0.1:31441');
    if (scopes) assert.deepEqual(actual, scopes, 'One run must not combine inconsistent auth cookie issuers'); else scopes = actual;
    receipts.push({ receipt: pin, responseHeaders: headerPin, operationId: receipt.operationId, requestId: receipt.requestId, actorKey: receipt.actorKey });
  }
  return { kind: 'actual-API-auth-cookie-scope-proof27', issuerOrigin: 'http://127.0.0.1:31441', uiOrigin: 'http://127.0.0.1:44551', apiProcess, binarySHA256: processRecord.binarySha256, scopes, receipts,
    cookieValuesStored: false, grantsAuthentication: false, copiesAnotherActorsExpiry: false, seedLifetime: 'fresh-owned-browser-context-session-only-until-real-backend-Set-Cookie' };
}
export function seedsFromScopes27(submitted, scopes, origin) {
  assert.equal(origin, 'http://127.0.0.1:44551'); assert.deepEqual(scopes.map(cookie => cookie.name).sort(), names); assert.deepEqual(submitted.map(cookie => cookie.name).sort(), names);
  return submitted.map(cookie => {
    assert.equal(cookie.url, origin); assert(typeof cookie.value === 'string' && cookie.value.length > 0, 'Only an actual acknowledged actor cookie may be seeded');
    assert(Object.keys(cookie).every(key => ['name', 'value', 'url', 'httpOnly', 'sameSite'].includes(key)), 'No caller domain/path/expiry override');
    const scope = scopes.find(value => value.name === cookie.name); assert.equal(cookie.httpOnly, scope.httpOnly); assert.equal(cookie.sameSite, scope.sameSite);
    assert.equal(scope.domain, new URL(origin).hostname); return { name: cookie.name, value: cookie.value, domain: scope.domain, path: scope.path, httpOnly: scope.httpOnly, secure: scope.secure, sameSite: scope.sameSite };
  });
}
export function wrapCookieContext27(context, { plan, binding, metadataFile }) {
  assert(plan.cookieScopeProof, 'New Root-approved plan must explicitly pin actual cookie scope proof');
  const proof = JSON.parse(readCookiePin27(plan.cookieScopeProof)); assert.equal(proof.kind, 'actual-API-auth-cookie-scope-proof27'); assert.equal(proof.uiOrigin, plan.origin);
  assert.equal(proof.apiProcess.file, binding.apiProcess.file); assert.equal(proof.apiProcess.rawBytesSha256, binding.apiProcess.rawBytesSha256); assert.equal(proof.binarySHA256, binding.expectedCandidateBinarySHA256);
  const regenerated = deriveScopeProof27({ apiProcess: proof.apiProcess, authReceipts: proof.receipts.map(value => value.receipt) }); assert.deepEqual(proof, regenerated, 'Proved cookie scope must still match its actual raw auth sources');
  const resolved = path.resolve(metadataFile), rel = path.relative(path.resolve(root + '/tmp/rust-r4ghi/private'), resolved); assert(rel && !rel.startsWith('..') && !path.isAbsolute(rel)); assert(!fs.existsSync(resolved));
  let seeded = false, closed = false;
  const metadata = async phase => { const cookies = (await context.cookies()).filter(cookie => names.includes(cookie.name)); const values = cookies.map(({ name, domain, path, httpOnly, secure, sameSite, expires }) => ({ name, domain, path, httpOnly, secure, sameSite, expires }));
    fs.appendFileSync(resolved, JSON.stringify({ phase, scopeProof: plan.cookieScopeProof, cookies: values, cookieValuesStored: false }) + '\n', { mode: 0o600 });
    if (phase === 'after-real-actor-seed') assert.deepEqual(values.map(cookie => cookie.name).sort(), names, 'Both real actor cookies must exist in the fresh browser jar');
    assert.equal(new Set(values.map(cookie => cookie.name)).size, values.length, 'Same-name multi-scope cookies must still fail closed');
    for (const cookie of values) { const scope = proof.scopes.find(value => value.name === cookie.name); for (const key of ['domain', 'path', 'httpOnly', 'secure', 'sameSite']) assert.equal(cookie[key], scope[key], 'Actual browser cookie scope differs from real issuer'); }
  };
  return new Proxy(context, { get(target, property) {
    if (property === 'addCookies') return async supplied => { assert(!seeded, 'One actual actor seed per fresh context'); await target.addCookies(seedsFromScopes27(supplied, proof.scopes, plan.origin)); seeded = true; await metadata('after-real-actor-seed'); };
    if (property === 'close') return async (...args) => { if (!closed) { closed = true; try { if (seeded) await metadata('before-owned-context-close'); } finally { await target.close(...args); } } };
    const value = Reflect.get(target, property, target); return typeof value === 'function' ? value.bind(target) : value;
  } });
}
