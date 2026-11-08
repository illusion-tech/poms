// Independent, synthetic pinned-FS verification only. Does not mint a registry.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict';
import { createHash } from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url';
const out = path.dirname(fileURLToPath(import.meta.url)), sandbox = path.join(out, 'synthetic87');
const sha = b => createHash('sha256').update(b).digest('hex');
const pin = (rel, value) => { const file = path.join(sandbox, rel), b = Buffer.from(JSON.stringify(value)); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, b, { flag: 'wx' }); return { file, rawBytesSha256: sha(b) }; };
const existing = rel => { const file = path.join(sandbox, rel), bytes = fs.readFileSync(file); return { file, rawBytesSha256: sha(bytes) }; };
const read = p => { const b = fs.readFileSync(p.file); assert.equal(sha(b), p.rawBytesSha256); return JSON.parse(b); };
const api = await import(pathToFileURL('E:/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/schema-admission108/proposed/tools/rust-r4ghi/business/schema-comparison108.mjs'));
const originalBaseline = existing('private/snapshots/originalBaseline.json'), retainedSnapshot = existing('private/snapshots/retained.json'), migrationBefore = existing('private/snapshots/before.json'), migrationAfter = existing('private/snapshots/after.json');
const freshCurrent = pin('private/business/new13/main/fresh.json', read(existing('private/snapshots/fresh.json')));
const actualMigrationReceipt = existing('private/migration/receipt.json'), migration = read(actualMigrationReceipt), schemaAdvance = { actualMigrationReceipt, approvedSQL: migration.approvedSQL, approvedMigrationSource: migration.approvedMigrationSource, migrationBefore, migrationAfter, migrationName: migration.migrationName, databases: migration.databases };
const evidence = { kind: 'exact-owned-forward-schema-advance108', fromMigrations: 97, toMigrations: 98, tablesPerDatabase: 139, databases: migration.databases };
const input = { originalBaseline: read(originalBaseline), retained: read(retainedSnapshot), before: read(migrationBefore), after: read(migrationAfter), fresh: read(freshCurrent), approvedSQL: fs.readFileSync(migration.approvedSQL.file, 'utf8'), migrationName: migration.migrationName, evidence };
const derived = api.deriveComparisonBaseline108(input.originalBaseline, api.verifyM98Transition108(input));
const comparisonBaseline = pin('private/business/new13/main/derived.json', derived);
const producer = { epoch: 'old12', run: 'main', sourcePinsSHA256: sha('[]') };
const producerState = pin('private/retention/old12/state.json', { epoch: 'old12', run: 'main', marker: 'synthetic-review87-only', baseline: originalBaseline, sourcePins: [] });
const retentionIndex = pin('private/retention/old12/index.json', { producerEpoch: 'old12', run: 'main', marker: 'synthetic-review87-only', frozenState: producerState, retainedSnapshot });
const priorRegistry = pin('private/business/old12/main/registry.json', { marker: 'synthetic-review87-only', originalBaseline, consumer: producer });
const consumer = { epoch: 'new13', run: 'main', sourcePins: pin('private/business/new13/main/sources.json', []), sourcePinsSHA256: sha('[]'), sourceCount: 0 };
const receipt = { kind: 'verified-M98-schema-comparison-receipt108', schemaVersion: 1, canonicalMetadataAdvanceOnly: true, originalBusinessBaselineRebased: false, businessRowsAndXminChangedByMigration: false, migrationExecutedByThisTool: false,
  originalBaseline, comparisonBaseline, retainedSnapshot, migrationBefore, migrationAfter, freshCurrent, actualMigrationReceipt, approvedSQL: migration.approvedSQL, migrationName: migration.migrationName, schemaAdvance, evidence, producer, consumer, producerState, retentionIndex, priorRegistry };
const binding = { kind: 'verified-schema-comparison-binding108', schemaVersion: 1, fromMigrations: 97, toMigrations: 98, originalBaseline, comparisonBaseline, verificationReceipt: pin('private/business/new13/main/verification.json', receipt) };
const ctx = { namespace: 'poms-r4ghi', private: path.join(sandbox, 'private'), win: path.join(sandbox, 'root'), migrations: 98, state: { marker: 'synthetic-review87-only', baseline: originalBaseline, schemaComparison108: binding } };
assert.deepEqual(api.verifySchemaBinding108(ctx, binding).baseline, derived);
const cases = [];
{
  const changed = structuredClone(receipt), otherBinding = structuredClone(binding), otherCtx = structuredClone(ctx);
  changed.originalBaseline = otherBinding.originalBaseline = otherCtx.state.baseline = migrationBefore;
  otherBinding.verificationReceipt = pin('private/business/new13/main/rebased-verification.json', changed);
  assert.throws(() => api.verifySchemaBinding108(otherCtx, otherBinding), /frozen producer original M97/); cases.push('matching new fields cannot reset frozen producer/prior original baseline');
}
for (const [name, mutate] of [
  ['whole current business rows cannot become original', value => { value.databases.poms_r4ghi_rust.tables.project = input.fresh.databases.poms_r4ghi_rust.tables.project; }],
  ['owned objects cannot become original', value => { value.objects = structuredClone(input.fresh.objects); }]
]) {
  const altered = structuredClone(derived); mutate(altered); const changed = structuredClone(receipt), otherBinding = structuredClone(binding), stem = 'forged' + cases.length;
  changed.comparisonBaseline = otherBinding.comparisonBaseline = pin('private/business/new13/main/' + stem + '-comparison.json', altered);
  otherBinding.verificationReceipt = pin('private/business/new13/main/' + stem + '-verification.json', changed);
  assert.throws(() => api.verifySchemaBinding108(ctx, otherBinding)); cases.push(name);
}
const result = { kind: 'independent-schema108-double-baseline-FS-probes87b', exactBindingPassed: true, rejected: cases, syntheticOnly: true,
  note: 'These synthetic command receipts retain the separate argv-direction counterexample in probes87; they confer no real migration or runtime authority.',
  SQL: 0, HTTP: 0, registriesMinted: 0, Source13Certified: false, G3Certified: false, G4Certified: false };
fs.writeFileSync(path.join(out, 'baseline-probes87b.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(result));
