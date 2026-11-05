// Static incremental-package validation; never executes/imports the cleanup entry.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const own = path.dirname(fileURLToPath(import.meta.url)), root = process.argv[2] ?? 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const pin = (base, file) => { const bytes = fs.readFileSync(path.join(base, file)); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; };
const baseManifest = pin(own, 'manifest125.json');
assert.equal(baseManifest.rawBytesSha256, 'cbd797bb98fcac5f8ef01a29f96bf3eb2965b0c98910c7dcd3b69053d603985b');
const base = JSON.parse(fs.readFileSync(path.join(own, baseManifest.file), 'utf8'));
for (const p of base.products) assert.deepEqual(pin(own, p.file), p, 'Preserve frozen125 original');
const names = ['rules125a.mjs', 'ownership125a.mjs', 'io125a.mjs', 'cleanup125a.mjs', 'rules125a.test.mjs', 'capture-manifest125a.mjs', 'README125a.md'];
for (const file of names.filter(n => n.endsWith('.mjs'))) {
    const check = spawnSync(process.execPath, ['--check', path.join(own, file)], { encoding: 'utf8', windowsHide: true });
    assert.equal(check.status, 0, check.stderr);
}
const tests = spawnSync(process.execPath, ['--test', '--test-reporter=tap', path.join(own, 'rules125.test.mjs'), path.join(own, 'ownership125.test.mjs'), path.join(own, 'rules125a.test.mjs')], { encoding: 'utf8', windowsHide: true });
assert.equal(tests.status, 0, tests.stdout + tests.stderr);
assert.equal(Number(/^# pass (\d+)$/m.exec(tests.stdout)?.[1]), 24);
const wrapper = fs.readFileSync(path.join(own, 'ownership125a.mjs'), 'utf8'), entry = fs.readFileSync(path.join(own, 'cleanup125a.mjs'), 'utf8');
assert(wrapper.includes('const eligible = new Set(result.unclaimed.map') && wrapper.includes('if (!eligible.has(p.record.key)'));
assert(entry.includes("from './ownership125a.mjs'") && entry.includes("from './io125a.mjs'"));
assert(entry.includes("'actual-cleanup-wrapper125-private-bundle'") && entry.includes("assert.equal(source.kind, 'actual-cleanup-wrapper125a-private-bundle'"));
assert(entry.indexOf("assert(process.argv.includes('--allowRootExecution')") < entry.indexOf("'/tools/rust-r4def/db33.mjs'"));
const sourceNames = ['tmp/rust-r4def/root/cleanup-provenance140.json', 'apps/poms-api-rust/src/contract_support/mod.rs',
    'apps/poms-api-rust/src/contract_readiness/service.rs', 'apps/poms-api-rust/src/contracts/service.rs',
    'apps/poms-api-rust/src/contracts/amendment.rs', 'apps/poms-api-rust/src/project_handover/model.rs',
    'apps/poms-api-rust/src/project_handover/service.rs', 'tools/rust-r4def/E/cleanup70/core70.mjs'];
const publicSourcePins = sourceNames.map(file => pin(root, file));
assert.equal(publicSourcePins.at(-1).rawBytesSha256, base.frozenCoreSHA256);
const remainder = JSON.parse(fs.readFileSync(path.join(root, sourceNames[0]), 'utf8'));
assert.equal(remainder.unclaimed.length, 39); assert.equal(remainder.claimedReferencedParents.length, 22); assert.equal(remainder.HTTP.length, 3012);
assert.equal(remainder.unclaimed.filter(r => r.table === 'audit_log').length, 34);
assert.equal(remainder.unclaimed.filter(r => r.table === 'receivable_plan_node').length, 5);
const staticValidation = { kind: 'pure-incremental-remainder125a-static-validation', createdAt: new Date().toISOString(), nodeVersion: process.version,
    syntaxFiles: names.filter(n => n.endsWith('.mjs')), syntaxPassed: true, preserved125Originals: true,
    syntheticTests: { passed: 24, newlyAdded: 4, failed: 0, stdout: tests.stdout, stderr: tests.stderr },
    publicRoot140Diagnostic: { unclaimed: 39, audit: 34, timelessNodes: 5, referencedOwnedParents: 22, HTTP: 3012, actual125aLedgerGenerated: false },
    extraClaimsOnlyFromExactBaseUnclaimedPKs: true, core70Unchanged: true, actualDBOrHTTPExecuted: false };
fs.writeFileSync(path.join(own, 'validation125a.json'), JSON.stringify(staticValidation, null, 2) + '\n', { flag: 'wx' });
const products = [...names, 'validation125a.json'].map(file => pin(own, file));
for (const p of base.products) assert.deepEqual(pin(own, p.file), p);
for (const p of publicSourcePins) assert.deepEqual(pin(root, p.file), p, 'Public source changed during capture');
const manifest = { kind: 'E-owned-Root140-exact-remainder125a-candidate', createdAt: new Date().toISOString(), scope: 'tools/rust-r4def/E/cleanup-wrapper125/*125a* only',
    baseManifest, immutableBaseProducts: base.products, products, publicSourcePins, frozenCoreSHA256: base.frozenCoreSHA256,
    runtimeEntry: 'cleanup125a.mjs', outputNamespace: 'cleanup-wrapper125a-<edition>', outputBundle: 'bundle125a.json', expectedBaselineTimeZone: 'Etc/GMT-8',
    acceptsForReadOnlyRebuild: ['actual-cleanup-wrapper103-private-bundle', 'actual-cleanup-wrapper125-private-bundle', 'actual-cleanup-wrapper125a-private-bundle'],
    acceptsForApplyOrVerify: ['actual-cleanup-wrapper125a-private-bundle'],
    staticValidation: { file: 'validation125a.json', passedPureTests: 24, newlyAddedNecessaryCases: 4 },
    authorExecution: { privateRead: false, DBConnected: false, HTTPExecuted: false, cleanupEntryExecuted: false, actualOwnershipLedgerGenerated: false, actualRowCyclePlanExecuted: false, SQLDMLExecuted: false, borrowedOriginalsRestored: false, twoNoOpsExecuted: false, objectsHandled: false, servicesStopped: false, G3Certified: false, G4Certified: false },
    RootFilesChanged: [], productFilesChanged: [], original125Changed: false, old103Changed: false, GitOrGitHubChanged: false,
    RootNextStep: 'Import only new125a files; actual read-only rebuild from checked140 or fresh rows; stop on any remaining unclaimed or counter gap' };
fs.writeFileSync(path.join(own, 'manifest125a.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ manifest: pin(own, 'manifest125a.json'), rules: products.find(p => p.file === 'rules125a.mjs'), wrapper: products.find(p => p.file === 'ownership125a.mjs'), entry: products.find(p => p.file === 'cleanup125a.mjs'), basePreserved: true, pureTestsPassed: 24, actualDBOrHTTPExecuted: false }));
