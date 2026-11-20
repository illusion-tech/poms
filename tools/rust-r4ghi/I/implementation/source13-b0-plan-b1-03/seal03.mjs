import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const here = path.dirname(fileURLToPath(import.meta.url)), old = path.resolve(here, '../source13-b0-plan-b1-02'), sha = value => createHash('sha256').update(value).digest('hex'), root = process.platform === 'win32' ? 'E:/projects/worktrees/poms-r3hijk-next28/poms' : '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
assert(!fs.existsSync(here + '/manifest13-03.json'));
const prior = fs.readFileSync(old + '/manifest13-02.json'); assert.equal(sha(prior), 'c973ce7f9f4ace3f5a50c7c04c92cab47498d3f6dc7042806f39f845f2f16ec4');
const target = 'tools/rust-r4ghi/construct-source13-bindings.mjs', before = fs.readFileSync(old + '/proposed/' + target), next = fs.readFileSync(here + '/proposed/' + target); assert.equal(sha(before), '64587795d83f2d8583c73e38453668730373d2f352f8a6271fbd06ce9daa85bf');
const observedTarget = fs.existsSync(root + '/' + target) ? sha(fs.readFileSync(root + '/' + target)) : null; assert(observedTarget === null || observedTarget === sha(before));
const mask = bytes => { const value = bytes.toString(), a = value.indexOf('export function assertBuildFacts13('), b = value.indexOf('export function assertReadinessFacts13(', a); assert(a >= 0 && b > a); return value.slice(0, a) + 'ASSERT_BUILD_FACTS_ONLY_CHANGED\n' + value.slice(b); }; assert.equal(mask(before), mask(next));
assert.equal(sha(fs.readFileSync(old + '/input-templates13.json')), sha(fs.readFileSync(here + '/input-templates13.json')));
const validation = JSON.parse(fs.readFileSync(here + '/validation13.json')); assert.equal(validation.purePass, 12); assert.equal(validation.pureFail, 0); assert(validation.constructorSourceStable && validation.actual139IndexStateAfterPinsVerified);
const saved = here + '/before13/' + target; fs.mkdirSync(path.dirname(saved), { recursive: true }); fs.writeFileSync(saved, before, { flag: 'wx' });
const sidecars = ['README03.md', 'build-shapes03.json', 'input-templates13.json', 'construct13.test.mjs', 'check13.mjs', 'prepare03.mjs', 'seal03.mjs', 'validation13.json', 'pure13.stdout.log', 'pure13.stderr.log', 'syntax13.stdout.log', 'syntax13.stderr.log', 'help13.stdout.log', 'help13.stderr.log'].map(file => { const bytes = fs.readFileSync(here + '/' + file); return { file, rawBytesSha256: sha(bytes), bytes: bytes.length }; });
const manifest = { kind: 'Root-reviewable-Source13-constructor03-exact-mirror-cargo-protocol', schemaVersion: 1, closesInToolScope: 'IR107-02', predecessorManifestSHA256: sha(prior), predecessorsUnmodified: true,
  candidate: { target, file: 'proposed/' + target, observedRootTargetSHA256: observedTarget, applyIfAbsentOrExactBeforeSHA256: sha(before), beforeConstructorSHA256: sha(before), afterSHA256: sha(next), beforeConstructor: 'before13/' + target, bytes: next.length },
  onlyAssertBuildFactsChanged: true, nullInputTemplatesByteIdentical: true, exactArgvProtocol: JSON.parse(fs.readFileSync(here + '/build-shapes03.json')).expectedProtocolOnly, sidecars, validation,
  RootObservationSemantics: 'actual-source-inventory-and-copy-no-Root-compile', mirrorObservationSemantics: 'one-actual-owned-mirror-fixed-fmt-clippy-test-build-and-summary-example',
  actualSource13: null, actualRootInventory: null, actualMirrorCargo: null, actualAPI136: null, actualB0: null, actualR3: null, actualB1: null,
  RootWritesByAuthor: 0, SQLConnectionsByAuthor: 0, HTTPRequestsByAuthor: 0, actualModeExecutedByAuthor: false, processesStartedByAuthor: 0, G3Certified: false, G4Certified: false };
const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n'); fs.writeFileSync(here + '/manifest13-03.json', bytes, { flag: 'wx' }); process.stdout.write(JSON.stringify({ manifestSHA256: sha(bytes), constructorSHA256: sha(next), purePass: 12 }) + '\n');
