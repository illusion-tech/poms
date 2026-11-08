// Pure artifact consistency and syntax checks; no acceptance runtime imports.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url)), read = name => JSON.parse(fs.readFileSync(path.join(dir, name)));
const sha = b => createHash('sha256').update(b).digest('hex');
const local = file => process.platform !== 'win32' ? (/^[A-Za-z]:\//.test(file) ? `/mnt/${file[0].toLowerCase()}${file.slice(2)}` : file)
  : file.startsWith('/mnt/e/') ? `E:/${file.slice(7)}` : file.startsWith('/home/') ? `//wsl.localhost/Debian${file}` : file;
const original = p => { assert.equal(sha(fs.readFileSync(local(p.file))), p.rawBytesSha256); };
const m = read('operation-matrix67.json'), f = read('focused-evidence67.json'), s = read('supplemental-evidence67.json'), b = read('blockers67.json'), p = read('period-semantics67.json'), h = read('review-H22-67.json');
assert.deepEqual(m.currentState, f.currentState); assert.deepEqual(m.currentState, s.cut); assert.deepEqual(m.currentState, b.cut);
assert.equal(m.currentState.sequence, 5501); assert.equal(m.inconsistencies.length, 0); assert.equal(m.rows.length, 32);
assert.deepEqual(Object.fromEntries(['G', 'H', 'I', 'R5-min'].map(group => [group, m.rows.filter(row => row.group === group).length])), { G: 9, H: 8, I: 11, 'R5-min': 4 });
assert(m.rows.every(row => row.frozenMapSuccess === row.currentCanonicalSuccess));
const missing = m.rows.filter(row => !Object.values(row.versions).some(v => v.exactSuccessAndLedger)).map(row => row.operationId);
assert.deepEqual(missing, ['ProjectCostController_createPeriodClosingSnapshot', 'ProjectCostController_getPeriodClosingSnapshot']);
for (const [epoch, count] of Object.entries({ 'g2-business10': 21, 'g2-business11': 22, 'g2-business12': 14 })) assert.equal(m.rows.filter(row => row.versions[epoch].exactSuccessAndLedger).length, count);
for (const value of m.inputs) original(value); original(p.decision7.original); for (const value of p.files) original(value);
for (const value of h.evidence.exactPromotionFiles) { assert.equal(sha(fs.readFileSync(local(`/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/${value.file}`))), value.actualSHA256); original(value.manifest); }
original(h.evidence.actualPreflight); original(h.evidence.aclProof); assert.equal(h.actual81.HTTPExecuted, false); assert.equal(h.actual81.browserStarted, false);
assert.equal(s.modernProtocol.actualHTTPRows, 34); assert.equal(s.modernProtocol.NativeActualHTTP, false); assert.equal(s.C85.mutatorSQLSTATE, '55P03'); original(s.C85.proof);
assert.equal(f.actual78.actualListGETs, 2); assert.equal(f.actual78.actualDetailGETs, 3); assert.equal(f.actual78.producerAPI, 134); assert.equal(f.actual78.consumerReadAPI, 135); assert.equal(f.actual78.oldPOSTReplayed, false);
assert.equal(f.A07.sameTask, 'not-yet-observed-in-this-state'); assert.equal(s.storedHBoundary.exactly20PercentContexts, 0);
for (const file of fs.readdirSync(dir).filter(file => file.endsWith('.mjs'))) { const result = spawnSync(process.execPath, ['--check', path.join(dir, file)], { encoding: 'utf8', windowsHide: true }); assert.equal(result.status, 0, `${file}: ${result.stderr}`); }
console.log(JSON.stringify({ status: 'passed', runtime: process.version, actualFSCollectionCut: 5501, actualTargetHTTP: 529, canonical32StatusesEqual: true,
  positiveOperations: 30, missingPositiveOperations: missing, H22ActualPromotionAndCore7PinsRechecked: true, source12PeriodCodePinsRechecked: true,
  SQL: false, HTTP: false, RootWritten: false, browserStarted: false, G3Certified: false, G4Certified: false }));
