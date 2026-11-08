import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { assertSource140Identity139, verifySourceZip140ReadOnly139 } from './isolated/tools/rust-r4ghi/retention-process1351-139-lib.mjs';
const sha = value => createHash('sha256').update(value).digest('hex'), here = path.dirname(fileURLToPath(import.meta.url));
test('140 identity must match exact1351 candidate/process/source406 and successful raw readback claims', () => {
  const pins = Array.from({ length: 406 }, (_, i) => ({ file: 'src/' + i + '.rs', sha256: sha('unit-' + i) })), state = { apiProcess: { record: { binary: '/unit/bin', binarySha256: 'binary' } }, processRestart1351: { registry: { file: '/unit/restart' } } }, ctx = { epoch: 'g2-business12', run: 'main01', pins, state }, active = { activeCandidate: { file: '/unit/newcandidate', rawBytesSha256: 'new' } };
  const receipt = { kind: 'actual-raw-candidate-code-retention-packet-created-and-fully-read-back', epoch: ctx.epoch, run: ctx.run, frozenSourceFiles: 406, sourceStableDuringPackaging: true, candidateOriginal: active.activeCandidate, actualApiProcessState: state.apiProcess, processRestart1351: state.processRestart1351, activeExecution: active, retainedBinary: { file: '/unit/bin', rawBytesSha256: 'binary', actualRunningPIDVerified: true } }, source = { kind: 'exact-raw-final12-frozen-source-packet', epoch: ctx.epoch, run: ctx.run, sourcePinsSHA256: sha(JSON.stringify(pins)), files: pins, activeExecution: active, binarySHA256: 'binary' };
  for (const key of ['databaseDataIncluded','credentialsIncluded','periodPositiveAccepted','G3Certified','G4Certified','old135EvidenceRelabelledAs1351']) receipt[key] = false;
  for (const key of ['businessDataIncluded','credentialsIncluded','binaryIncluded','G3Certified','G4Certified','old135EvidenceRelabelledAs1351']) source[key] = false;
  assertSource140Identity139(ctx, active, receipt, source);
  for (const mutate of [x => { x.receipt.candidateOriginal = { file: '/old135', rawBytesSha256: 'old' }; }, x => { x.receipt.sourceStableDuringPackaging = false; }, x => { x.source.files[0].sha256 = 'different'; }, x => { x.source.sourcePinsSHA256 = 'wrong'; }, x => { x.receipt.actualApiProcessState = { record: { pid: 108720 } }; }]) { const value = structuredClone({ receipt, source }); mutate(value); assert.throws(() => assertSource140Identity139(ctx, active, value.receipt, value.source)); }
});
test('ZIP must be freshly CRC and per-member SHA read, not merely have a recorded outer hash', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poms-order02-pure-')); try {
    const pins = Array.from({ length: 406 }, (_, i) => ({ file: 'src/' + i + '.rs', sha256: sha('unit-' + i) }));
    const writeFixture = (name, corrupt) => { const file = dir + '/' + name, script = "import json,sys,zipfile\npins=json.load(sys.stdin)\nwith zipfile.ZipFile(sys.argv[1],'x') as z:\n for i,p in enumerate(pins): z.writestr(p['file'],('unit-'+str(i)+('bad' if sys.argv[2]=='yes' and i==0 else '')).encode())\n"; const result = spawnSync('/usr/bin/python3', ['-c', script, file, corrupt ? 'yes' : 'no'], { input: JSON.stringify(pins), encoding: 'utf8' }); assert.equal(result.status, 0); return file; };
    const good = writeFixture('synthetic-good.zip', false), originalHash = sha(fs.readFileSync(good)); assert.equal(verifySourceZip140ReadOnly139(good, pins).members, 406); assert.equal(sha(fs.readFileSync(good)), originalHash);
    const bad = writeFixture('synthetic-bad.zip', true); assert.throws(() => verifySourceZip140ReadOnly139(bad, pins));
  } finally { const actual = fs.realpathSync(dir); assert.equal(path.dirname(actual), fs.realpathSync(os.tmpdir())); assert(path.basename(actual).startsWith('poms-order02-pure-')); fs.rmSync(actual, { recursive: true }); }
});
test('139 validates completed140 before lock/out mkdir/stop; original140 and six UI checks remain intact', () => {
  const text = fs.readFileSync(here + '/proposed/tools/rust-r4ghi/retain-epoch12-before-source13-139.mjs', 'utf8'), gate = text.indexOf('const completedSource140 = assertCompletedSource140BeforeRetention139(ctx)'); assert(gate >= 0); assert(gate < text.indexOf('const lock =')); assert(gate < text.indexOf('fs.mkdirSync(out')); assert(gate < text.indexOf("'stop', '1351'")); assert(text.includes('executionEvidence, completedSource140'));
  assert.equal(fs.readFileSync(here + '/proposed/tools/rust-r4ghi/package-retained-candidate140.mjs', 'utf8'), fs.readFileSync(here + '/before33e/tools/rust-r4ghi/package-retained-candidate140.mjs', 'utf8'));
});
