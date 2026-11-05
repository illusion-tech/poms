// Author static validation only. Never import/execute cleanup125 or any I/O helper.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const own = path.dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] ?? 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const edition = process.argv[3] ?? '125';
assert(/^125[a-z]?$/.test(edition));
const sha = value => createHash('sha256').update(value).digest('hex');
const pin = (base, file) => { const bytes = fs.readFileSync(path.join(base, file)); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; };
const names = ['rules125.mjs', 'ownership125.mjs', 'io125.mjs', 'cleanup125.mjs', 'rules125.test.mjs', 'ownership125.test.mjs', 'capture-manifest125.mjs', 'README.md'];
for (const file of names.filter(f => f.endsWith('.mjs'))) {
    const result = spawnSync(process.execPath, ['--check', path.join(own, file)], { windowsHide: true, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
}
const test = spawnSync(process.execPath, ['--test', '--test-reporter=tap', path.join(own, 'rules125.test.mjs'), path.join(own, 'ownership125.test.mjs')], { windowsHide: true, encoding: 'utf8' });
assert.equal(test.status, 0, test.stdout + test.stderr);
const passed = Number(/^# pass (\d+)$/m.exec(test.stdout)?.[1]);
assert.equal(passed, 20);
const entry = fs.readFileSync(path.join(own, 'cleanup125.mjs'), 'utf8'), io = fs.readFileSync(path.join(own, 'io125.mjs'), 'utf8'), index = fs.readFileSync(path.join(own, 'ownership125.mjs'), 'utf8');
assert(entry.indexOf("assert(process.argv.includes('--allowRootExecution')") < entry.indexOf("'/tools/rust-r4def/db33.mjs'"));
assert(!/SET\s+(?:TIME\s+ZONE|timezone)\b/i.test(io));
assert(io.includes("current_setting('TimeZone') presentation_time_zone") && io.includes('expectedBaselineTimeZone'));
assert(!/\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE|DROP\s+(?:TABLE|DATABASE))\s+poms\./i.test(entry));
assert(entry.includes('core.assertApplyAdmission70') && entry.includes('core.assertRestored70') && entry.includes('core.assertTwoNoOps70') && entry.includes('commitUnknown = true'));
assert.equal((index.match(/!protectedFromGeneric125\(row, all\)/g) ?? []).length, 1);
assert(index.includes('protectedFromGeneric125(child, all)') && index.includes("row.table === 'audit_log' || r.source !== 'actual-UI' || actor == null"));
assert(io.includes('let binaryRequestWitness = null') && io.includes('binaryRequestWitness }'));
for (const name of ['api32', 'api53', 'api7802', 'api7803', 'api7804', 'api7805']) assert(io.includes("'" + name + "'"));
const sourceNames = [
    'tmp/rust-r4def/root/cleanup-provenance125.json', 'tmp/rust-r4def/root/cleanup-provenance127.json',
    'tmp/rust-r4def/root/foundation77/receipt77.json', 'tmp/rust-r4def/root/foundation77/readback77.json',
    'tools/rust-r4def/E/cleanup-wrapper103/ownership103.mjs', 'tools/rust-r4def/E/cleanup-wrapper103/io123.mjs', 'tools/rust-r4def/E/cleanup-wrapper103/cleanup123.mjs',
    'tools/rust-r4def/E/cleanup-wrapper103/operation-authority103.json', 'tools/rust-r4def/E/cleanup-wrapper103/number-specs103.json',
    'tools/rust-r4def/E/cleanup70/core70.mjs', 'tools/rust-r4def/E/cleanup70/manifest70.json',
    'apps/poms-api-rust/src/attachments/service.rs', 'apps/poms-api-rust/src/attachments/handover.rs',
    'apps/poms-api-rust/src/attachment_storage/service.rs', 'apps/poms-api-rust/src/users/service.rs', 'apps/poms-api-rust/src/roles/service.rs',
    'apps/poms-api-rust/src/project_handover/service.rs', 'apps/poms-api-rust/src/project_cost_governance/mod.rs',
    'apps/poms-api-rust/src/project_cost_governance/service.rs', 'apps/poms-api-rust/src/project_cost_governance/evidence.rs',
    'apps/poms-api-rust/src/contract_readiness/service.rs', 'apps/poms-api-e2e/src/poms-api/foundation.e2e-spec.ts'
];
const publicSourcePins = sourceNames.map(file => pin(root, file));
const frozenCoreSHA256 = 'bb8fdaeb6eeff836ea85ce28f9c4f2ded703ad21a8ad943e8df22d641bd51435';
assert.equal(publicSourcePins.find(p => p.file.endsWith('/core70.mjs')).rawBytesSha256, frozenCoreSHA256);
assert.equal(pin(path.dirname(own), 'cleanup70/core70.mjs').rawBytesSha256, frozenCoreSHA256);
const projection = JSON.parse(fs.readFileSync(path.join(root, sourceNames[0]), 'utf8'));
const parents = JSON.parse(fs.readFileSync(path.join(root, sourceNames[1]), 'utf8'));
assert.equal(projection.unclaimed.length, 337); assert.equal(projection.HTTP.length, 3012);
assert.equal(parents.sessionsForUnclaimedAttachments.length, 30); assert.equal(parents.claimedBusinessParents.length, 158);
assert.equal(parents.anonymousEvents.length, 2); assert(projection.noNewDBHTTP && parents.noNewDBHTTP);
assert.equal(projection.instanceId, parents.instanceId);
const staticValidation = {
    kind: 'pure-synthetic-tests-and-public-static-source-validation125', capturedAt: new Date().toISOString(),
    nodeVersion: process.version, syntaxFiles: names.filter(n => n.endsWith('.mjs')), syntaxPassed: true,
    syntheticTests: { passed, failed: 0, stdout: test.stdout, stderr: test.stderr },
    explicitAllowBeforeDB33Import: true, directDMLOnlyThroughFrozenCore: true, noTimezoneSet: true,
    strictRulesCannotUseGenericResponseOrFKFallback: true, nullAuditCannotUseBroadUIFallback: true,
    publicDiagnosticOnly: { instanceId: projection.instanceId, old124Unclaimed: 337, indexedHTTP: 3012, completedSessions: 30, claimedBusinessParents: 158, anonymousCases: 2, actual125LedgerGenerated: false }
};
const validationName = 'validation' + edition + '.json';
fs.writeFileSync(path.join(own, validationName), JSON.stringify(staticValidation, null, 2) + '\n', { flag: 'wx' });
const products = [...names, validationName].map(file => pin(own, file));
for (const source of publicSourcePins) assert.deepEqual(pin(root, source.file), source, 'Public source changed during capture');
const manifest = {
    kind: 'E-owned-exact-provenance-correction-wrapper125-Root-candidate', createdAt: new Date().toISOString(),
    edition, scope: 'tools/rust-r4def/E/cleanup-wrapper125/** only', products, publicSourcePins, frozenCoreSHA256,
    compatibleProtocolExports: ['normalizeHTTP103', 'buildOwnership103', 'diagnoseRows103', 'sanitize103'],
    pureEditionExports: ['normalizeHTTP125', 'buildOwnership125', 'diagnoseRows125', 'sanitize125'],
    actualEntry: 'cleanup125.mjs', outputNamespace: 'cleanup-wrapper125-<edition>', expectedBaselineTimeZone: 'Etc/GMT-8',
    reusedReadOnlyMetadata: ['../cleanup-wrapper103/operation-authority103.json', '../cleanup-wrapper103/number-specs103.json'],
    staticValidation: { file: validationName, passedSyntheticTests: passed, syntaxPassed: true },
    modes: ['snapshot', 'probe-plan', 'plan', 'apply', 'verify'].map(mode => ({ mode, authorStatus: 'not-run' })),
    authorExecution: { privateRead: false, DBConnected: false, HTTPExecuted: false, cleanupEntryExecuted: false, actualOwnershipLedgerGenerated: false, actualRowCyclePlanExecuted: false, SQLDMLExecuted: false, borrowedOriginalsRestored: false, twoNoOpsExecuted: false, objectsHandled: false, servicesStopped: false, G3Certified: false, G4Certified: false },
    productFilesChanged: [], RootFilesChanged: [], oldPackagesChanged: false, GitOrGitHubChanged: false,
    RootNextStep: 'Import exact products; actual read-only 125 ledger rebuild; return remaining unclaimed before any final plan/apply'
};
const manifestName = 'manifest' + edition + '.json';
fs.writeFileSync(path.join(own, manifestName), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ manifest: pin(own, manifestName), entry: products.find(p => p.file === 'cleanup125.mjs'), index: products.find(p => p.file === 'ownership125.mjs'), rules: products.find(p => p.file === 'rules125.mjs'), pureTestsPassed: passed, actualDBExecuted: false }));
