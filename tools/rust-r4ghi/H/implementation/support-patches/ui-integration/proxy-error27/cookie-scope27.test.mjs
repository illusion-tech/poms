import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { responseScopes27, seedsFromScopes27, deriveScopeProof27 } from './proposed/tools/rust-r4ghi/business/ui-cookie-scope27.mjs';
const origin = 'http://127.0.0.1:44551', issuer = 'http://127.0.0.1:31441';
const header = name => `${name}=PURE-UNIT-ONLY-SECRET; Max-Age=60; Expires=Sun, 08 Nov 2026 06:50:46 GMT; Path=/api; SameSite=Lax${name === 'poms_session' ? '; HttpOnly' : ''}`;
const raw = ['Set-Cookie', header('poms_session'), 'Set-Cookie', header('poms_csrf')];
const seeds = () => ['poms_session', 'poms_csrf'].map(name => ({ name, value: 'ACTUAL-ACK-VALUE-PURE-TEST-' + name, url: origin, httpOnly: name === 'poms_session', sameSite: 'Lax' }));
test('real27 FS source proof records actual four login scopes and no header/token values', () => {
  const input = JSON.parse(fs.readFileSync(new URL('./cookie-source27-actual03-metadata-only.json', import.meta.url))), proof = deriveScopeProof27(input);
  assert.equal(proof.receipts.length, 4); assert.equal(proof.scopes.length, 2); for (const cookie of proof.scopes) { assert.equal(cookie.path, '/api'); assert.equal(cookie.domain, '127.0.0.1'); assert.equal(cookie.hostOnly, true); assert.equal(cookie.secure, false); }
  assert.equal(proof.cookieValuesStored, false); assert(proof.scopes.every(cookie => !Object.hasOwn(cookie, 'value')));
  const output = new URL('./actual-scope-proof27-readonly.json', import.meta.url), bytes = JSON.stringify(proof, null, 2) + '\n'; if (fs.existsSync(output)) assert.equal(fs.readFileSync(output, 'utf8'), bytes); else fs.writeFileSync(output, bytes, { flag: 'wx' });
});
test('Set-Cookie scope parser discards actual token/expiry and preserves only real scope attributes', () => {
  const result = responseScopes27(raw, issuer); assert(!JSON.stringify(result).includes('PURE-UNIT-ONLY-SECRET')); assert.equal(result.find(value => value.name === 'poms_session').httpOnly, true); assert.equal(result.find(value => value.name === 'poms_csrf').httpOnly, false); assert(result.every(value => !Object.hasOwn(value, 'expires')));
});
test('actual acknowledged values remain exact while URL-default root path becomes explicit proved path', () => {
  const submitted = seeds(), original = structuredClone(submitted), values = seedsFromScopes27(submitted, responseScopes27(raw, issuer), origin); assert.deepEqual(submitted, original);
  for (const value of values) { assert(value.value === submitted.find(cookie => cookie.name === value.name).value); assert.equal(value.path, '/api'); assert.equal(value.domain, '127.0.0.1'); assert.equal(Object.hasOwn(value, 'url'), false); assert.equal(Object.hasOwn(value, 'expires'), false); }
});
test('a same-name second scope is never collapsed or accepted to bypass duplicate checks', () => {
  assert.throws(() => responseScopes27([...raw, 'Set-Cookie', header('poms_csrf').replace('/api', '/')], issuer));
  assert.throws(() => seedsFromScopes27([...seeds(), seeds()[1]], responseScopes27(raw, issuer), origin));
});
test('no guessed default Path, cleared cookie, foreign issuer/domain, unsupported name or inconsistent flag is accepted', () => {
  for (const change of [value => value.replace('; Path=/api', ''), value => value.replace('Max-Age=60', 'Max-Age=0'), value => value + '; Domain=other.invalid', value => value.replace('poms_session=', 'unregistered='), value => value.replace('; HttpOnly', '')]) {
    const changed = [...raw]; changed[1] = change(changed[1]); assert.throws(() => responseScopes27(changed, issuer));
  }
  assert.throws(() => responseScopes27(raw, 'http://other.invalid:31441'));
});
test('duplicate Set-Cookie attributes and missing mandatory auth cookie fail closed', () => {
  const changed = [...raw]; changed[1] += '; Path=/'; assert.throws(() => responseScopes27(changed, issuer)); assert.throws(() => responseScopes27(raw.slice(0, 2), issuer));
});
test('case callers cannot override origin/domain/path/expiry, flags, or seed an empty actor value', () => {
  for (const patch of [{ url: 'http://other.invalid' }, { domain: '127.0.0.1' }, { path: '/' }, { expires: 0 }, { httpOnly: false }, { value: '' }]) { const input = seeds(); input[0] = { ...input[0], ...patch }; assert.throws(() => seedsFromScopes27(input, responseScopes27(raw, issuer), origin)); }
});
test('five worker candidates change only the explicit scope adapter import and return point', () => {
  const products = JSON.parse(fs.readFileSync(new URL('./products27.json', import.meta.url))), root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
  for (const product of products.filter(value => value.beforeSHA256 !== null)) { const before = fs.readFileSync(root + '/' + product.file, 'utf8'), candidate = fs.readFileSync(new URL('./' + product.candidate, import.meta.url), 'utf8');
    assert(candidate.startsWith('import { wrapCookieContext27 }')); assert.equal(candidate.slice(candidate.indexOf('\n') + 1).replace("        return wrapCookieContext27(context, { plan, binding, metadataFile: path.join(caseDirectory, 'cookie-metadata27.jsonl') });", '        return context;'), before);
  }
});
