import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const here = path.dirname(fileURLToPath(import.meta.url)), old = path.resolve(here, '../source13-b0-plan-b1-03'), sha = value => createHash('sha256').update(value).digest('hex'), root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', target = 'tools/rust-r4ghi/construct-source13-bindings.mjs';
assert(!fs.existsSync(here + '/manifest13-04.json')); const prior = fs.readFileSync(old + '/manifest13-03.json'); assert.equal(sha(prior), '8149b6e581859f4020b52a4d50eea10385d4e6c562ed14abc8cc34d4b3537a64');
const before = fs.readFileSync(old + '/proposed/' + target), next = fs.readFileSync(here + '/proposed/' + target), beforeSHA = '0b89c24251ab561a08e15983e9931bc9b2a3b433d1aa66866621d3c607471c4e'; assert.equal(sha(before), beforeSHA); assert.equal(sha(fs.readFileSync(root + '/' + target)), beforeSHA);
const from = "clippy: ['--all-targets', '--', '-D', 'warnings']", to = "clippy: ['--lib', '--no-deps', '--', '-D', 'warnings']"; assert.equal(before.toString().split(from).length, 2); assert.equal(next.toString(), before.toString().replace(from, to));
assert.equal(sha(fs.readFileSync(old + '/input-templates13.json')), sha(fs.readFileSync(here + '/input-templates13.json')));
const validation = JSON.parse(fs.readFileSync(here + '/validation13.json')); assert.equal(validation.purePass, 13); assert.equal(validation.pureFail, 0); assert(validation.constructorSourceStable && validation.actual139IndexStateAfterPinsVerified);
const saved = here + '/before13/' + target; fs.mkdirSync(path.dirname(saved), { recursive: true }); fs.writeFileSync(saved, before, { flag: 'wx' });
const sidecars = ['README04.md', 'build-shapes04.json', 'input-templates13.json', 'construct13.test.mjs', 'check13.mjs', 'prepare04.mjs', 'seal04.mjs', 'validation13.json', 'pure13.stdout.log', 'pure13.stderr.log', 'syntax13.stdout.log', 'syntax13.stderr.log', 'help13.stdout.log', 'help13.stderr.log'].map(file => { const raw = fs.readFileSync(here + '/' + file); return { file, rawBytesSha256: sha(raw), bytes: raw.length }; });
const manifest = { kind: 'Root-reviewable-Source13-constructor04-production-library-clippy-protocol', schemaVersion: 1, predecessorManifestSHA256: sha(prior), predecessorsAndActualFailed180_02Unmodified: true,
  candidate: { target, file: 'proposed/' + target, observedRootTargetSHA256: beforeSHA, beforeConstructorSHA256: beforeSHA, afterSHA256: sha(next), beforeConstructor: 'before13/' + target, bytes: next.length },
  onlyClippySuffixChangedInEntireSource: true, beforeClippySuffix: ['--all-targets', '--', '-D', 'warnings'], afterClippySuffix: ['--lib', '--no-deps', '--', '-D', 'warnings'], otherThreeArgvAndAllOtherSemanticsByteIdentical: true, nullInputTemplatesByteIdentical: true,
  exactArgvProtocol: JSON.parse(fs.readFileSync(here + '/build-shapes04.json')).expectedProtocolOnly, sidecars, validation,
  actualSource13: null, actualRootInventory: null, actualMirrorCargo: null, actualAPI136: null, actualB0: null, actualR3: null, actualB1: null,
  RootWritesByAuthor: 0, SQLConnectionsByAuthor: 0, HTTPRequestsByAuthor: 0, actualModeExecutedByAuthor: false, processesStartedByAuthor: 0, G3Certified: false, G4Certified: false };
const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n'); fs.writeFileSync(here + '/manifest13-04.json', bytes, { flag: 'wx' }); process.stdout.write(JSON.stringify({ manifestSHA256: sha(bytes), constructorSHA256: sha(next), purePass: 13 }) + '\n');
