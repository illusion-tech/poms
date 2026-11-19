import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', sha = value => createHash('sha256').update(value).digest('hex'), target = 'tools/rust-r4ghi/probe-m98-frozen-external.mjs';
assert(!fs.existsSync(here + '/manifest.json')); assert(!fs.existsSync(root + '/' + target));
const validation = JSON.parse(fs.readFileSync(here + '/validation.json')); assert.equal(validation.purePass, 10); assert.equal(validation.pureFail, 0); assert.equal(validation.sourceStable, true);
const plan = JSON.parse(fs.readFileSync(here + '/plan-template.json')); assert.equal(plan.actualInputsComplete, false); for (const key of ['approval', 'sourcePinsSHA256', 'helperH0', 'registry', 'apiProcess', 'originalM97Proof']) assert.equal(plan[key], null);
const candidate = fs.readFileSync(here + '/proposed/' + target), dependencies = ['context.mjs', 'consumer-admission54.mjs', 'schema-comparison108.mjs', 'snapshot.mjs', 'ledger.mjs', 'fault-sweep.mjs', 'pure.mjs'].map(name => { const file = 'tools/rust-r4ghi/business/' + name, raw = fs.readFileSync(root + '/' + file); return { file, rawBytesSha256: sha(raw), bytes: raw.length, RootReadOnlyAtSeal: true }; });
const sidecars = ['README.md', 'plan-template.json', 'frozen-external.test.mjs', 'check.mjs', 'seal.mjs', 'validation.json', 'pure.stdout.log', 'pure.stderr.log', 'syntax.stdout.log', 'syntax.stderr.log', 'help.stdout.log', 'help.stderr.log'].map(file => { const raw = fs.readFileSync(here + '/' + file); return { file, rawBytesSha256: sha(raw), bytes: raw.length }; });
const manifest = { kind: 'Root-reviewable-external-post-M98-frozen-negative-candidate', schemaVersion: 1, candidate: { target, file: 'proposed/' + target, beforeSHA256: null, RootPathMustBeAbsent: true, afterSHA256: sha(candidate), bytes: candidate.length }, dependencies, sidecars, validation,
  excludedFromBusinessH0: true, approvalSupportingToolKey: 'postM98FrozenNegative', expectedHistoricalM97Record: 'consumerChecks.frozenReparent58[1817b9ae-ec3a-4910-aebd-07a2b6963975]', historicalM97EvidenceMustRemainUnchanged: true,
  allControlledUpdateTransactionsLockBothParentsFirst: true, allControlledUpdateTransactionsAlwaysRollback: true, noParentlessOrCommitWindow: true, noBusinessCommandReplay: true,
  actualSource13: null, actualAPI136: null, actualR3: null, actualM98NegativeProof: null, actualM98AppliedByAuthor: false, SQLConnectionsByAuthor: 0, HTTPRequestsByAuthor: 0, RootWritesByAuthor: 0, processesStartedByAuthor: 0, G3Certified: false, G4Certified: false };
const raw = Buffer.from(JSON.stringify(manifest, null, 2) + '\n'); fs.writeFileSync(here + '/manifest.json', raw, { flag: 'wx' }); process.stdout.write(JSON.stringify({ manifestSHA256: sha(raw), candidateSHA256: sha(candidate), purePass: 10, actualSource13: null }) + '\n');
