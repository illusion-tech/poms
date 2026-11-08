// Actual frozen H0 Node tests. No context construction or business request.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const D = P + '/source13-helper207';
const sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH);
assert(!fs.existsSync(P + '/business/g2-business13/main01/driver.lock'));
const h0raw = fs.readFileSync(P + '/source13-preparation183/helperH0.json');
assert.equal(sha(h0raw), 'e65db96998f5dc15ed406bf5d30b2a1bfa95c82affb448b625ca3295227d0459');
const helpers = JSON.parse(h0raw), sourceRaw = fs.readFileSync(P + '/source13-preparation193/sourcePins.json'), sources = JSON.parse(sourceRaw);
assert.equal(sha(sourceRaw), 'e95a9c8e3cabf30095c463a577d2d70eb681eb7b22d6c7ee31375dbdcf55e22c');
const verify = () => { for (const item of [...sources, ...helpers]) assert.equal(sha(fs.readFileSync(R + '/' + item.file)), item.sha256, 'Frozen input changed: ' + item.file); };
verify(); fs.mkdirSync(D, { mode: 0o700 });
const tests = helpers.filter(p => p.file.endsWith('.test.mjs')).map(p => R + '/' + p.file).sort(); assert(tests.length > 0);
const argv = ['--test', '--test-reporter=tap', ...tests], out = D + '/stdout.tap', err = D + '/stderr.log';
const o = fs.openSync(out, 'wx', 0o600), e = fs.openSync(err, 'wx', 0o600); let result;
try { result = spawnSync(process.execPath, argv, { cwd: R, env: process.env, stdio: ['ignore', o, e], timeout: 1800000 }); }
finally { fs.closeSync(o); fs.closeSync(e); }
verify(); const output = fs.readFileSync(out, 'utf8');
const count = name => { const matches = [...output.matchAll(new RegExp('^# ' + name + ' (\\d+)$', 'gm'))]; return matches.length ? Number(matches.at(-1)[1]) : null; };
const pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
const receipt = { kind: 'actual-Source13-H0-complete-business-helper-node-tests207', executable: pin(process.execPath), nodeVersion: process.version, argv,
  testFiles: tests.length, sourceCount: sources.length, sourcePinsSHA256: sha(JSON.stringify(sources)), helperCount: helpers.length, helperH0SHA256: sha(h0raw),
  exitCode: result.status, signal: result.signal, tests: count('tests'), pass: count('pass'), fail: count('fail'), cancelled: count('cancelled'), skipped: count('skipped'),
  stdout: pin(out), stderr: pin(err), frozenInputsUnchanged: true, businessHTTPOrSQLExecutedByWrapper: false, G3Certified: false, G4Certified: false };
fs.writeFileSync(D + '/receipt207.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ ...receipt, argv: undefined, executable: undefined, receipt: pin(D + '/receipt207.json') }));
if (result.status !== 0) process.exitCode = 1;
