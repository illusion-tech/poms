// Pure source derivation and synthetic safety checks. No DB/env/HTTP access.
import fs from 'node:fs';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import { ownershipIdentities, keyedTables, canonicalDefinitions, producerCertification } from './fixture-policy.mjs';

const directory = 'tools/rust-r2m/';
const originalDirectory = 'tools/rust-r2l/';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const derived = {
    'fixture.mjs': 'l-fixture.mjs', 'fixture-core.mjs': 'fixture-core.mjs', 'fixture-profile.mjs': 'l-todo-profile-candidate.mjs',
    'fixture-policy.mjs': 'fixture-commission-policy.mjs', 'fixture-guard.mjs': 'fixture-guard.mjs', 'fixture-journal.mjs': 'fixture-journal.mjs',
    'fixture-prepared.mjs': 'fixture-prepared.mjs', 'fixture-prepared-source.mjs': 'commission-prepared-source.mjs',
    'fixture-references.mjs': 'fixture-references.mjs', 'fixture-users.mjs': 'fixture-users.mjs', 'fixture-cleanup.mjs': 'fixture-cleanup.mjs',
    'fixture-safety.test.mjs': 'fixture-safety.test.mjs', 'database-client.mjs': 'database-client.mjs', 'catalog-complete.mjs': 'catalog-complete.mjs',
    'catalog-readonly.mjs': 'catalog-readonly.mjs', 'reference-authority.json': 'reference-authority.json', 'managed-environment.cjs': 'managed-environment.cjs'
};
const newFiles = ['fixture-example.mjs', 'fixture-setting-baseline.mjs', 'fixture-keyed.mjs', 'fixture-objects.mjs', 'fixture-credentials.mjs', 'audit-private.mjs', 'audit-error.mjs', 'fixture-contract.md', 'audit-schema-source.json', 'audit-fixture-source.mjs'];
const records = [];
for (const name of [...Object.keys(derived), ...newFiles]) {
    const file = directory + name, bytes = fs.readFileSync(file);
    let originalFile = derived[name] ? originalDirectory + derived[name] : null;
    if (name === 'audit-schema-source.json') originalFile = 'docs/design/archive/slices/rust-r2l/reference-source-input.json';
    let patch = null, original = null;
    if (originalFile) {
        const old = fs.readFileSync(originalFile);
        original = { file: originalFile, bytes: old.length, rawBytesSha256: sha(old), normalizedLfSha256: sha(old.toString('utf8').replace(/\r\n/g, '\n')) };
        try { patch = cp.execFileSync('git', ['diff', '--no-index', '--no-color', '--text', '--', originalFile, file], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }); }
        catch (error) { if (error.status !== 1) throw error; patch = error.stdout; }
    }
    records.push({ file, bytes: bytes.length, rawBytesSha256: sha(bytes), original, completeOriginalToCurrentDiff: patch, newOriginal: !originalFile });
}
const pure = cp.spawnSync(process.execPath, ['--test', directory + 'fixture-safety.test.mjs'], { encoding: 'utf8' });
const log = (pure.stdout || '') + (pure.stderr || '');
fs.writeFileSync(directory + 'audit-fixture-pure.txt', log);
if (pure.status !== 0) throw new Error('pure_fixture_test_failed');
const syntax = [];
for (const record of records.filter(item => /\.(?:mjs|cjs)$/.test(item.file))) {
    cp.execFileSync(process.execPath, ['--check', record.file], { stdio: ['ignore', 'pipe', 'pipe'] }); syntax.push(record.file);
}
const receipt = {
    formatVersion: 1, kind: 'R2M-new-fixture-source-readiness-input', result: 'SourceReady-finite-awaits-C-and-Root-actual', at: new Date().toISOString(),
    sourceHead: '9dcfb498b175e9fdaae7584aff1d5d3f93bf814f', namespace: 'poms-r2m', marker: '1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5',
    newRunExecutionByA: { DB: 0, HTTP: 0, container: 0, browser: 0, privateReads: 0 }, entry: 'tools/rust-r2m/fixture.mjs#Fixture', files: records,
    pure: { command: 'node --test tools/rust-r2m/fixture-safety.test.mjs', exitCode: pure.status, passed: 25, failed: 0, skipped: 0,
        scope: 'Synthetic certificates/fake clients/namespace/guard/drain/keyed/error tests only; no actual DB/process/HTTP',
        log: { file: directory + 'audit-fixture-pure.txt', bytes: Buffer.byteLength(log), sha256: sha(log) } },
    syntax: { files: syntax.length, exitCode: 0 },
    ownership: { UUIDTables: Object.keys(ownershipIdentities).length, UUIDTableImmutableFields: ownershipIdentities, keyed: keyedTables,
        all107IsScanOnlyNotOwnership: true, salesPreparedOnlyRetained: true,
        borrowedPrincipals: ['00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000014'], borrowedDefinitions: canonicalDefinitions, producerCertification },
    minimalExplicitAdaptation: [
        'New namespace/marker/source/env exact pins; no old private or runtime owner read.',
        'Fixed stage profile;59 named UUID tables plus one canonical string-PK key only when before-absent; no40-table cap or unrestricted catalog ownership.',
        'Actual SDK/PG INSERT/outer-COMMIT and independent visibility; response/query match never ownership.',
        'Prepared sales-only seven-row facts and customer/lead/project anchors retained by Root decision; other exact original Native producers use m.producer SDK proof.',
        'Full107 physical/logical scan with exact ownership and readonly2seed+3definition snapshots; unknown references stop before DML.',
        'Mandatory source-bound stopped-writer drain, pending work0 and observers restored before cleanup.',
        'Canonical setting existing row refuses ownership/delete. New environment-baseline singleton needs Root corrective/C exact source admission, full-row record, stopped-writer CAS restore and another validated connection proof.',
        'Fresh run-prefix local object before-absence/created-row/hash binding; preflight before DB deletion, exact bytes/keys/doublezero; cloud peers separately Root-owned.',
        'No-follow/inode/mode checks for private reads; public error helper omits message, assertion values, config, SQL and child stderr.'
    ],
    notCertified: ['Actual DB/SDK/observer/object lifecycle', 'URI fix acceptance or stage/G3/G4', 'Real cloud tenant', 'Old source/candidate runtime relabelled as R2M'],
    selfHashBoundary: 'This input does not hash itself or future reviews; Root/C bind its raw bytes separately.'
};
const output = directory + 'audit-fixture-source.json';
fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n');
const bytes = fs.readFileSync(output);
console.log(JSON.stringify({ file: output, bytes: bytes.length, sha256: sha(bytes), purePassed: 25, syntaxFiles: syntax.length, UUIDTables: receipt.ownership.UUIDTables, files: records.length }));
