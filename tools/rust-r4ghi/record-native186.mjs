import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const sha = value => createHash('sha256').update(value).digest('hex'), root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(root + '/' + file)) });
const lintFile = 'tmp/rust-r4ghi/root/api-lint08-closure62/receipt.json', buildFile = 'tmp/rust-r4ghi/root/api-build05-closure62/receipt.json', oldFile = 'tmp/rust-r4ghi/root/api-build04-closure62/receipt.json';
const lint = JSON.parse(fs.readFileSync(root + '/' + lintFile)), build = JSON.parse(fs.readFileSync(root + '/' + buildFile)), old = JSON.parse(fs.readFileSync(root + '/' + oldFile));
for (const value of [lint, build]) { assert.equal(value.exitCode, 0); assert.equal(value.sourceStable, true); assert.equal(value.underlyingCheck.exitCode, 0); }
assert.deepEqual(lint.inputs, build.inputs); const prior = new Map(old.inputs.map(item => [item.file, item.rawBytesSha256])), after = new Map(build.inputs.map(item => [item.file, item.rawBytesSha256]));
const added = build.inputs.filter(item => !prior.has(item.file)), changed = build.inputs.filter(item => prior.has(item.file) && prior.get(item.file) !== item.rawBytesSha256), removed = old.inputs.filter(item => !after.has(item.file));
assert.deepEqual(changed, []); assert.deepEqual(removed, []); assert.equal(added.length, 1); assert.equal(added[0].file, 'apps/poms-api/src/migrations/Migration20261108090000_rust_frozen_assignment_parent_lock.ts'); assert.equal(added[0].rawBytesSha256, 'daf3656ec2a726c30ebaba8b0ba91945404f9b7a5848d8d293546bc3c7fa4916');
const lintLog = fs.readFileSync(root + '/tmp/rust-r4ghi/root/api-lint08/stdout.log', 'utf8'), oldLog = fs.readFileSync(root + '/tmp/rust-r4ghi/root/api-lint07/stdout.log', 'utf8');
const warnings = text => text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').split(/\r?\n/).filter(line => /\bwarning\b.*@typescript-eslint/.test(line)).map(line => line.trim()); assert.deepEqual(warnings(lintLog), warnings(oldLog)); assert.equal(warnings(lintLog).length, 2);
const result = { kind: 'Root-actual-Source13-Native-static-validation186', lint: pin(lintFile), build: pin(buildFile), previousNativeInputObservation: pin(oldFile), currentInputs: build.inputs.length, previousInputs: old.inputs.length, exactAddedNativeInputs: added, changedPriorInputs: changed, removedPriorInputs: removed,
  lintExitCode: lint.exitCode, buildExitCode: build.exitCode, sourceStable: true, existingWarnings: 2, newWarnings: 0, warningBoundary: 'Unchanged unused _selection parameters in contract-readiness.service.ts', controllerDTOSharedOpenAPIAndClientSourcesUnchanged: true,
  actualNativeReferenceHTTPRepeated: false, migrationAppliedByTheseChecks: false, RustOrSource13RuntimeCertified: false, G3Certified: false, G4Certified: false };
const file = 'docs/design/rust-r4ghi/source13-native186-static.json', raw = Buffer.from(JSON.stringify(result, null, 2) + '\n'); fs.writeFileSync(root + '/' + file, raw, { flag: 'wx' }); console.log(JSON.stringify({ report: pin(file), currentInputs: build.inputs.length, lintExitCode: 0, buildExitCode: 0, newWarnings: 0, addedFiles: added.length }));
