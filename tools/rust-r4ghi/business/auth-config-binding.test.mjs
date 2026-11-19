import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { authKeys, parseEnvFileValues, chooseEnvFile, mergeAuthSettings, selectedProcessValues, assertStartupFileIdentity } from './auth-config-binding.mjs';

const oracle = JSON.parse(fs.readFileSync(new URL('./auth-config-oracle17a.json', import.meta.url)));
test('env parser matches all26 captured Node17.4.2/Rust startup oracle cases', () => {
  assert.equal(oracle.oracle.version, '17.4.2'); assert.equal(oracle.cases.length, 26);
  for (const c of oracle.cases) assert.deepEqual(parseEnvFileValues(c.input, Object.keys(c.expected)), c.expected, c.name);
});
test('actual explicit file overrides process; default selected file fills absent keys only', () => {
  const [throttle, idle] = authKeys;
  assert.deepEqual(mergeAuthSettings({ [throttle]: '13', [idle]: '700' }, { [throttle]: '7', [idle]: '200' }, true),
    { throttleSeconds: 7, idleSeconds: 200, origins: { [throttle]: 'actual-selected-file', [idle]: 'actual-selected-file' } });
  assert.deepEqual(mergeAuthSettings({ [throttle]: '13' }, { [throttle]: '7', [idle]: '200' }, false),
    { throttleSeconds: 13, idleSeconds: 200, origins: { [throttle]: 'actual-process', [idle]: 'actual-selected-file' } });
});
test('pinned defaults require both places absent; empty assignment is actual0 and idle0 is invalid', () => {
  const [throttle, idle] = authKeys;
  const defaults = mergeAuthSettings({}, {}, true); assert.equal(defaults.throttleSeconds, 60); assert.equal(defaults.idleSeconds, 900);
  assert(Object.values(defaults.origins).every(v => v === 'pinned-Rust-default-both-absent'));
  assert.equal(mergeAuthSettings({ [throttle]: '' }, {}, false).throttleSeconds, 0);
  assert.throws(() => mergeAuthSettings({}, { [idle]: '' }, true));
  assert.equal(mergeAuthSettings({}, { [throttle]: ' 0x10 ', [idle]: '9e2' }, true).throttleSeconds, 16);
  for (const invalid of ['-1', '1.5', '9007199254740992', 'Infinity', '${ACTUAL}', '0b2']) assert.throws(() => mergeAuthSettings({}, { [throttle]: invalid }, true));
});
test('selection is one explicit path or first existing default, never recursive POMS file reassignment', () => {
  const cwd = path.resolve('/owned/mirror');
  const explicit = chooseEnvFile({ POMS_ENV_FILE: ' private/edition.env ' }, cwd, () => true);
  assert.deepEqual(explicit, { selected: path.resolve(cwd, 'private/edition.env'), overrideExisting: true });
  const files = [path.join(cwd, '.env'), path.join(cwd, 'apps/poms-api/.env')];
  assert.deepEqual(chooseEnvFile({}, cwd, p => files.includes(p)), { selected: files[0], overrideExisting: false });
  assert.deepEqual(chooseEnvFile({ POMS_ENV_FILE: ' ' }, cwd, p => p === files[1]), { selected: files[1], overrideExisting: false });
  assert.deepEqual(chooseEnvFile({}, cwd, () => false), { selected: null, overrideExisting: false });
  assert.throws(() => chooseEnvFile({ POMS_ENV_FILE: 'missing.env' }, cwd, () => false));
});
test('only two nonsecret keys retained and quoted multiline decoys cannot inject settings', () => {
  const [throttle, idle] = authKeys;
  const input = `SECRET="line1\n${throttle}=1\nline3"\n${idle}=600\n${throttle}=7 # final actual\nSECRET_AGAIN=do-not-return\n`;
  assert.deepEqual(parseEnvFileValues(input), { [idle]: '600', [throttle]: '7' });
  assert.deepEqual(selectedProcessValues(Buffer.from(`SECRET=do-not-return\0POMS_ENV_FILE=/owned/private/edition.env\0${idle}=800\0`)), { POMS_ENV_FILE: '/owned/private/edition.env', [idle]: '800' });
  assert.throws(() => selectedProcessValues(Buffer.from(`${idle}=800\0${idle}=900\0`)));
});
test('startup wx file proof rejects changed/replaced/linked/world-readable files', () => {
  const now = Date.parse('2026-11-07T08:10:56.239Z'), older = BigInt(now - 1000) * 1000000n;
  const stat = { isFile: () => true, isSymbolicLink: () => false, nlink: 1n, uid: 1000n, mode: 0o100600n, mtimeNs: older, ctimeNs: older, birthtimeNs: older };
  const options = { startedAt: '2026-11-07T08:10:56.239Z', processUid: 1000n };
  assertStartupFileIdentity(stat, options);
  for (const change of [{ nlink: 2n }, { uid: 1001n }, { mode: 0o100644n }, { isSymbolicLink: () => true }, { isFile: () => false },
    { mtimeNs: BigInt(now + 1) * 1000000n }, { ctimeNs: BigInt(now + 1) * 1000000n }, { birthtimeNs: BigInt(now + 1) * 1000000n }]) {
    assert.throws(() => assertStartupFileIdentity({ ...stat, ...change }, options));
  }
});
