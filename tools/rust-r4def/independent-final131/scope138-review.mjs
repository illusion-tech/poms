// Independent public-only scope review; never imports or executes Root runners.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const out = 'tools/rust-r4def/independent-final131';
assert.equal(path.resolve(process.cwd()).toLowerCase(), path.resolve(root).toLowerCase());
const sha = b => createHash('sha256').update(b).digest('hex');
const cache = new Map();
function rel(f) {
  let s = f.replaceAll('\\', '/');
  const prefix = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/';
  if (s.startsWith(prefix)) s = s.slice(prefix.length);
  assert(!s.includes('/private/') && !s.includes('..') && !path.isAbsolute(s), 'private-or-outside-read-forbidden');
  return s;
}
function bytes(f) { const s = rel(f); if (!cache.has(s)) cache.set(s, fs.readFileSync(path.join(root, s))); return cache.get(s); }
const json = f => JSON.parse(bytes(f));
const pin = f => { const b = bytes(f); return { file: rel(f), bytes: b.length, sha256: sha(b) }; };
function check(p) { const actual = pin(p.file); assert.equal(actual.sha256, p.rawBytesSha256 ?? p.sha256); assert.equal(actual.bytes, p.bytes); }
const stable = v => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v;
const hjson = v => sha(JSON.stringify(stable(v)));
const files = [
  'tmp/rust-r4def/root/supplement138/receipt138.json',
  'tmp/rust-r4def/root/objects132/receipt132.json',
  'tmp/rust-r4def/root/object-provenance136/projection136.json',
  'tmp/rust-r4def/root/orphan137/proof137.json',
  'tmp/rust-r4def/root/resume135/receipt135.json',
  'tools/rust-r4def/supplement138.mjs', 'tools/rust-r4def/objects132.mjs',
  'tools/rust-r4def/object-provenance136.mjs', 'tools/rust-r4def/orphan137.mjs',
  'tools/rust-r4def/E/cleanup70/authority70.json', 'tools/rust-r4def/E/cleanup70/core70.mjs',
  'tools/rust-r4def/E/cleanup-wrapper103/io123.mjs',
];
const s138 = json(files[0]), inv = json(files[1]), proj = json(files[2]), orphan = json(files[3]), resume = json(files[4]);
const instance = '0c945ec2-e3ec-4705-8bd3-660a46e8cafc';
for (const r of [s138, inv, proj, orphan, resume]) assert.equal(r.instanceId, instance);
for (const p of [s138.schemaACL.exactOriginalProvisionGrantProgram, s138.schemaACL.originalCreationReceipt, s138.schemaACL.migrationReceipt, s138.nativeWitness.baseline, s138.precision56.originalCleanup]) { check(p); files.push(rel(p.file)); }
const authority = json('tools/rust-r4def/E/cleanup70/authority70.json');
for (const c of s138.comparisons) {
  check(c.originalCatalog); files.push(rel(c.originalCatalog.file));
  const catalog = json(c.originalCatalog.file);
  assert.equal(hjson({ columns: catalog.columns, constraints: catalog.constraints, indexes: catalog.indexes }), c.structuralHash);
  assert.equal(c.structuralHash, authority.structuralHash);
  assert(c.originalColumnsIndexesConstraintsExact && c.originalTableACLAndRLSFlagsExact && c.originalFiveImmutableTriggersExact && c.temporaryPolicies === 0);
  assert(c.current.file.includes('/poms-r4def/private/supplement138/'));
  assert(/^[0-9a-f]{64}$/.test(c.current.rawBytesSha256) && c.current.bytes > 0);
}
assert(s138.nativeWitness.all120Tables532OriginalRowsExact && s138.nativeWitness.noOwnedNewRows);
assert(s138.nativeWitness.note.includes('not a falsely claimed pre-test'));
assert.deepEqual(s138.commonSupplement.map(c => [c.component, c.entries]), [['functions', 2], ['columnACL', 2902], ['sequences', 1], ['gateSchemas', 1]]);
assert(s138.commonSupplement.every(c => c.equal && c.untouchedNativeControlSHA256 === c.rustSHA256));
assert(s138.schemaACL.ownerAndOnlyPerBackendAppUsageGrantExact && s138.sequenceValuesAndControlFunctionsEqual);
assert.deepEqual(s138.precision56.actualCurrentAbsent, { databases: [], roles: [] });
assert.equal(s138.DDLSQLOrBusinessDMLExecuted, 0);
const provision = json(s138.schemaACL.originalCreationReceipt.file);
assert.equal(provision.marker, instance);
assert.equal(resume.containerId, provision.containerId);
assert.equal(resume.volume, provision.volume);
assert(resume.startExistingContainerExecuted && resume.running && resume.resetSeedMigrationDDLOrBusinessDML === 0);
assert.deepEqual(resume.databases.map(d => [d.backend, d.oid, d.migrations, d.appconnections]), [['native', '16385', 94, 0], ['rust', '16387', 94, 0]]);
const program = bytes(s138.schemaACL.exactOriginalProvisionGrantProgram.file).toString();
assert(program.includes("GRANT USAGE ON SCHEMA poms,r4def_control TO "));
assert(program.includes("assert(!fs.existsSync(state),'Never overwrite existing task state')"));
assert.equal(inv.files.length, 62); assert.equal(inv.files.reduce((n, f) => n + f.bytes, 0), 5743);
assert.equal(inv.bytes, 5743); assert.equal(inv.unmatched, 1); assert.equal(inv.unlinkExecuted, false);
assert.equal(proj.inventorySHA256, inv.privateInventory.rawBytesSha256);
assert.equal(proj.objects.length, 62);
assert.equal(new Set(inv.files.map(f => f.pathSHA256)).size, 62);
const mappings = [];
for (const f of inv.files) {
  const p = proj.objects.find(p => p.index === f.index); assert(p);
  for (const field of ['backend', 'pathSHA256', 'bytes', 'sha256']) assert.equal(p[field], f[field]);
  assert.equal(p.sourceCandidates.length, f.exactSourceCandidates);
  assert(p.rowBindings.every(b => ['attachment', 'attachment_upload_session', 'attachment_download_package'].includes(b.table) && b.field === 'storage_key' && /^[0-9a-f-]{36}$/.test(b.id)));
  mappings.push({ index: f.index, backend: f.backend, pathSHA256: f.pathSHA256, bytes: f.bytes, sha256: f.sha256, rowBindings: p.rowBindings });
}
assert.equal(mappings.filter(f => f.rowBindings.length).length, 61);
assert.deepEqual(mappings.filter(f => !f.rowBindings.length).map(f => f.index), [16]);
const actualOrphan = mappings.find(f => f.index === 16);
assert.equal(orphan.objectIndex, 16);
assert.equal(orphan.pathSHA256, actualOrphan.pathSHA256);
assert.equal(orphan.actualBytes, actualOrphan.bytes);
assert.equal(orphan.actualSHA256, actualOrphan.sha256);
assert.equal(orphan.sourceCaseId, 'complete-deferred-audit');
assert.equal(orphan.commitDisposition, 'unknown-retain');
assert(orphan.exactAttemptIdInCompletedDirectory && orphan.oneActualNonceFinalInOriginalProof && orphan.actualNoCommittedAttachmentInFrozenGraph);
assert.equal(orphan.realLostCommitACKClaimed, false);
assert.equal(orphan.DMLOrUnlinkExecuted, false);
for (const key of ['originalAttemptObjectProof', 'originalScopedFault']) {
  const bound = orphan[key]; check(bound.public); files.push(bound.public.file);
  const p = json(bound.public.file);
  assert.deepEqual(p.privateOriginal, bound.private);
  assert.equal(p.identity.instance_id, instance);
  assert.equal(p.identity.database, 'poms_r4def_rust');
  assert.equal(p.meta.caseId, 'complete-deferred-audit');
}
const core = json('tmp/rust-r4def/root/K78-k78c/result.json');
const fault = core.scopedFaultResults.find(f => f.caseId === orphan.sourceCaseId);
assert.equal(fault.receiptId, orphan.originalScopedFault.public.file);
assert.equal(fault.retryPending, false);
const failure = core.records.find(r => r.caseId === 'K78-' + orphan.sourceCaseId && r.httpStatus === 500);
assert(failure); const failureHTTP = json(failure.receiptId); assert.equal(failureHTTP.status, 500);
assert.equal(failureHTTP.requestBody.checksumSha256, actualOrphan.sha256);
const retry = json(fault.retryReceiptId); assert.equal(retry.status, 200);
assert.equal(retry.path, failureHTTP.path);
files.push('tmp/rust-r4def/root/K78-k78c/result.json', failure.receiptId, fault.retryReceiptId, 'tools/rust-r4def/F/K78/RootRunner118.mjs');
const reviewedPins = [...new Set(files)].map(f => {
  const p = pin(f), target = path.join(root, out, 'scope138-inputs', p.file + '.bin');
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes(f), { flag: 'wx' });
  return { ...p, snapshot: path.relative(root, target).replaceAll('\\', '/') };
});
const report = {
  kind: 'independent-R4DEF-final131-supplement138-and-object-scope-review', reviewedAtUtc: new Date().toISOString(),
  status: 'Public proof is sufficiently specific for bounded cleanup plan review; execution and terminal gates still pending',
  instanceId: instance,
  supplement138: {
    currentCatalogAndOriginalAuthorityBindingAccepted: true,
    originalTableACLAndFiveTriggersBound: true,
    substituteEvidenceAccepted: true,
    substitute: 'Untouched Native control current facts plus original environment21 creation/grants; poms function definitions, column attributes/ACL, sequence definitions and current sequence values/control-functions compared between databases',
    preTestSeparateSupplementSnapshotExists: false,
    noHistoricalUntouchedStateFromCurrentEqualityAloneClaimed: true,
    rootActualPrivateReadbackHashesBoundButNotRecomputedByReviewer: true,
    precisionProbeCurrentAbsenceRecorded: true,
    limitation: 'Measured catalog/security/function-definition components only; do not describe the substitute as a separately captured pre-test supplemental snapshot or byte-identical raw JSON rows',
  },
  objectScope: { objects: 62, bytes: 5743, uniquePathHashes: 62, backend: 'rust', objectRowsBound: 61, rowBindingOccurrences: mappings.reduce((n, f) => n + f.rowBindings.length, 0), orphanIndex: 16, orphanUnknownRetainSourceAccepted: true, originalPublicToPrivatePinEqualityVerified: true, rawPrivateKeysNotRead: true, inventoryProofDoesNotMeanUnlinkExecuted: true, mappings },
  pendingBeforeAnyUnlink: ['Both original DB baselines actually restored with COMMIT ACK and double fresh noops', 'All APIs actually stopped in current instance', 'Reobserve exact original path/dev/ino/nlink/bytes/SHA against sealed inventory', 'Exclusive backup copy with original/copy bytes/SHA equality before per-key literal unlink', 'Fresh empty owned roots and per-key unlink receipts; retain private originals/archive/volume'],
  pendingDBPlan: ['Full exact perPK/fingerprint producer ledger and current same-instance plan', 'Ledger row set must include each61 row-bound object parent with exact provenance', 'Current quiet full-graph sameTx equality; no old128-only admission'],
  reviewedPins, newFindingsP0P1P2: [], scopeReviewPass: true, terminalCleanupCertified: false, G3Pass: false, G4Pass: false,
  reviewer: { privateRead: false, DBHTTPGitGHExecuted: false, productOrOldEvidenceModified: false, writesOnly: out + '/**' },
};
fs.writeFileSync(path.join(root, out, 'scope138-review131.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify({ report: pin(out + '/scope138-review131.json'), reviewedPins: reviewedPins.length, objectCount: 62, bytes: 5743, rowsBound: 61, orphan: 16, scopeReviewPass: true, G3Pass: false, G4Pass: false }) + '\n');
