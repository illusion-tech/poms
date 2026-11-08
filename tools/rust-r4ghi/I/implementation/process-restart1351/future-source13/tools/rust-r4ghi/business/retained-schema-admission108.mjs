// Explicit schema3 metadata fork after Root's separately executed normal M98.
// This tool never runs a migration, HTTP request, DML, process launch or cleanup.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createContext, sourcePins, FIXED } from './context.mjs';
import { sha, segment } from './pure.mjs';
import { capture, loadSnapshot } from './snapshot.mjs';
import { assertRecorded } from './ledger.mjs';
import { readPin54, pointer54 } from './consumer-admission54.mjs';
import { fixtureAdmissions54 } from './retained-admission54.mjs';
import { makeChainedAdmissions62, validateRegistryLineage62, quarantineEvidence62, assertImpactReview62 } from './registry-lineage62.mjs';
import { verifyProcessRestart1351, quarantineProcessRestartForEpochChange1351 } from './same-source-process1351.mjs';
import { verifyMigrationReceipt108, verifyM98Transition108, deriveComparisonBaseline108, verifySchemaBinding108 } from './schema-comparison108.mjs';
const pinOnly = value => ({ file: value.file, rawBytesSha256: value.rawBytesSha256 });
const read = pin => JSON.parse(readPin54(pin));
const samePin = (a, b) => a?.file === b?.file && a?.rawBytesSha256 === b?.rawBytesSha256;
export const POLICY108 = Object.freeze({ fromMigrations: 97, toMigrations: 98, tablesPerDatabase: 139, normalForwardOnly: true, businessBaselineReset: false, historicalBaselineReselection: false });
export function assertSchemaPlanShape108(plan) {
  assert.equal(plan.kind, 'retained-schema-consumer-admission108'); assert.equal(plan.schemaVersion, 3); assert.deepEqual(plan.policy, POLICY108);
  segment(plan.producer.epoch); segment(plan.producer.run); segment(plan.consumer.epoch); segment(plan.consumer.run); assert.notEqual(plan.producer.epoch, plan.consumer.epoch);
  for (const key of ['sourcePinsSHA256', 'binarySHA256']) assert(/^[a-f0-9]{64}$/.test(plan.consumer[key]));
  assert(/^[a-f0-9]{64}$/.test(plan.producer.sourcePinsSHA256)); assert(Number.isSafeInteger(plan.consumer.sourceCount) && plan.consumer.sourceCount > 0);
  assert.equal(typeof plan.schemaAdvance.migrationName, 'string');
  assert.equal(plan.actualM98Applied, true, 'Unexecuted M98 template is not an admission plan');
  assert.equal(plan.Source13Certified, false); assert.equal(plan.G3Certified, false); assert.equal(plan.G4Certified, false);
  return plan;
}
function assertCurrentProcess108(record, binary) {
  assert.equal(record.namespace, FIXED.namespace); assert.equal(record.root, FIXED.mirror); assert.equal(record.port, 31441); assert.equal(record.binarySha256, binary);
  const stat = fs.readFileSync('/proc/' + record.pid + '/stat', 'utf8'); assert.equal(stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], record.startTime);
  assert.equal(fs.realpathSync('/proc/' + record.pid + '/exe'), record.binary); assert.equal(sha(fs.readFileSync(record.binary)), binary);
}
export function validateSchemaPlanInputs108(plan) {
  assert.equal(process.platform, 'linux'); assertSchemaPlanShape108(plan); assert.equal(FIXED.migrations, 98); assert.equal(FIXED.tables, 139);
  const index = read(plan.producer.retentionIndex), old = read(plan.producer.frozenState);
  assert.equal(index.producerEpoch, plan.producer.epoch); assert.equal(index.run, plan.producer.run); assert.equal(old.epoch, plan.producer.epoch); assert.equal(old.run, plan.producer.run);
  assert(samePin(index.frozenState, plan.producer.frozenState)); assert(samePin(index.retainedSnapshot, plan.producer.retainedSnapshot)); assert.equal(index.marker, old.marker);
  assert(!old.activeFault && !old.blockedObservation && !old.cleaned && !old.cleanupPlan && !old.schemaComparison108, 'This one normal M97->M98 schema admission cannot conceal an active fault, cleanup or prior schema advance');
  assert([...Object.values(old.owned), ...Object.values(old.borrowed)].every(row => row.table !== 'poms_migrations'), 'Migration registration is canonical schema authority, never HTTP owned/borrowed fixture authority');
  assert.equal(sha(JSON.stringify(old.sourcePins)), plan.producer.sourcePinsSHA256); assert(samePin(old.consumerAdmission54?.registry, plan.producer.priorRegistry));
  assert(!fs.existsSync(FIXED.private + '/business/' + old.epoch + '/' + old.run + '/driver.lock'), 'Retained producer driver must be stopped');
  const expected = read(plan.consumer.sourcePins); assert.deepEqual(sourcePins(), expected); assert.equal(sha(JSON.stringify(expected)), plan.consumer.sourcePinsSHA256); assert.equal(expected.length, plan.consumer.sourceCount);
  assert.notEqual(plan.consumer.sourcePinsSHA256, plan.producer.sourcePinsSHA256);
  for (const file of ['docs/design/rust-r4ghi/g2-consumed-evidence-corrective54.md', 'docs/design/rust-r4ghi/g2-project-metadata-noop61.md']) assert(expected.some(pin => pin.file === file));
  for (const pin of [plan.schemaAdvance.approvedSQL, plan.schemaAdvance.approvedMigrationSource]) {
    const relative = path.relative(FIXED.win, pin.file).split(path.sep).join('/'); assert(!relative.startsWith('../') && !path.isAbsolute(relative));
    assert(expected.some(source => source.file === relative && source.sha256 === pin.rawBytesSha256), 'Actual approved M98 SQL and registered migration must be current source leaves');
  }
  const candidate = read(plan.consumer.candidateReceipt); assert.equal(pointer54(candidate, plan.consumer.candidateSourceDigestPointer), plan.consumer.sourcePinsSHA256); assert.equal(pointer54(candidate, plan.consumer.candidateBinaryHashPointer), plan.consumer.binarySHA256);
  const impact = read(plan.consumer.impactReview); assertImpactReview62(impact, plan.producer, plan.consumer);
  const processRecord = read(plan.consumer.apiProcess); assertCurrentProcess108(processRecord, plan.consumer.binarySHA256);
  if (old.processRestart1351) verifyProcessRestart1351({ ...FIXED, migrations: 97, epoch: old.epoch, run: old.run, priv: FIXED.private + '/business/' + old.epoch + '/' + old.run, state: old, pins: old.sourcePins }, read(old.consumerAdmission54.registry), { liveProcess: false });
  const oldProcess = old.apiProcess.record;
  if (fs.existsSync('/proc/' + oldProcess.pid + '/stat')) {
    const stat = fs.readFileSync('/proc/' + oldProcess.pid + '/stat', 'utf8'); assert.notEqual(stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], oldProcess.startTime, 'Old physical API must remain stopped');
  }
  const basis = { ...FIXED, state: old }; verifyMigrationReceipt108(basis, plan.schemaAdvance);
  const retained = read(plan.producer.retainedSnapshot), originalBaseline = read(old.baseline);
  const evidence = { kind: 'exact-owned-forward-schema-advance108', ...POLICY_FIELDS108, databases: plan.schemaAdvance.databases };
  const input = { originalBaseline, retained, before: read(plan.schemaAdvance.migrationBefore), after: read(plan.schemaAdvance.migrationAfter),
    approvedSQL: readPin54(plan.schemaAdvance.approvedSQL).toString(), migrationName: plan.schemaAdvance.migrationName, evidence };
  verifyM98Transition108(input);
  return { old, index, retained, originalBaseline, expected, processRecord, input };
}
const POLICY_FIELDS108 = Object.freeze({ fromMigrations: 97, toMigrations: 98, tablesPerDatabase: 139 });

export async function admitSchemaRetained108({ planFile, approvedPlanSHA256 }) {
  assert.equal(process.platform, 'linux'); const planBytes = fs.readFileSync(planFile); assert.equal(sha(planBytes), approvedPlanSHA256); const plan = JSON.parse(planBytes);
  const { old, retained, expected, processRecord, input } = validateSchemaPlanInputs108(plan);
  const folder = FIXED.private + '/business/' + plan.consumer.epoch + '/' + plan.consumer.run;
  if (fs.existsSync(folder + '/state.json')) {
    const pending = JSON.parse(fs.readFileSync(folder + '/state.json')); assert.equal(pending.admissionPending54, approvedPlanSHA256, 'Never overwrite a real consumer state');
    assert(!pending.baseline && !Object.keys(pending.owned).length && !pending.consumerAdmission54 && !pending.schemaComparison108);
  }
  const ctx = createContext({ epoch: plan.consumer.epoch, run: plan.consumer.run }, { admissionPlanSHA256: approvedPlanSHA256 });
  assert.deepEqual(read(plan.consumer.helperPins), ctx.helperPins, 'Current complete helper graph must be explicit; old producer graphs remain original evidence');
  const lock = ctx.priv + '/driver.lock'; fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'retained-schema-admission108', approvedPlanSHA256 }) + '\n', { flag: 'wx', mode: 0o600 });
  try {
    const freshLabel = ctx.next('schema108-current'); ctx.persist(); const current = await capture(ctx, freshLabel);
    assert.equal(ctx.state.marker, old.marker); const verified = verifyM98Transition108({ ...input, fresh: current });
    const comparisonName = ctx.next('schema108-comparison-baseline') + '.json'; ctx.persist(); const comparisonPin = ctx.artifact(comparisonName, deriveComparisonBaseline108(input.originalBaseline, verified));
    const receipt = { kind: 'verified-M98-schema-comparison-receipt108', schemaVersion: 1, approvedPlanSHA256, producer: plan.producer, consumer: plan.consumer,
      originalBaseline: old.baseline, comparisonBaseline: comparisonPin, retentionIndex: plan.producer.retentionIndex, producerState: plan.producer.frozenState, priorRegistry: plan.producer.priorRegistry,
      retainedSnapshot: plan.producer.retainedSnapshot, migrationBefore: plan.schemaAdvance.migrationBefore, migrationAfter: plan.schemaAdvance.migrationAfter, freshCurrent: current.manifest,
      approvedSQL: plan.schemaAdvance.approvedSQL, actualMigrationReceipt: plan.schemaAdvance.actualMigrationReceipt, schemaAdvance: plan.schemaAdvance, migrationName: plan.schemaAdvance.migrationName,
      evidence: input.evidence, canonicalMetadataAdvanceOnly: true, originalBusinessBaselineRebased: false, businessRowsAndXminChangedByMigration: false, migrationExecutedByThisTool: false };
    const receiptName = ctx.next('schema108-verification') + '.json'; ctx.persist(); const receiptPin = ctx.artifact(receiptName, receipt);
    const binding = { kind: 'verified-schema-comparison-binding108', schemaVersion: 1, fromMigrations: 97, toMigrations: 98, originalBaseline: old.baseline, comparisonBaseline: pinOnly(comparisonPin), verificationReceipt: pinOnly(receiptPin) };
    const next = structuredClone(old);
    next.epoch = ctx.epoch; next.run = ctx.run; next.createdAt = new Date().toISOString(); next.sequence = ctx.state.sequence; next.sourcePins = expected;
    next.apiProcess = { ...pinOnly(plan.consumer.apiProcess), record: processRecord }; next.schemaComparison108 = binding;
    quarantineProcessRestartForEpochChange1351(next, old, plan.producer.frozenState);
    // Required inherited owned/borrowed still explain all retained business rows.
    // Only the independently verified schema comparison reader sees the M98 row.
    const compareCtx = { ...ctx, state: next }; verifySchemaBinding108(compareCtx, binding); assertRecorded(compareCtx, current);
    let entries = fixtureAdmissions54(old, retained, ctx.database);
    let registry = { schemaVersion: 3, kind: 'verified-retained-data-consumer-registry54', namespace: ctx.namespace, marker: old.marker, approvedPlanSHA256,
      producer: { epoch: old.epoch, run: old.run, sourcePinsSHA256: plan.producer.sourcePinsSHA256, sourceCount: old.sourcePins.length, binarySHA256: old.apiProcess.record.binarySha256 },
      consumer: plan.consumer, retentionIndex: plan.producer.retentionIndex, producerState: plan.producer.frozenState, retainedSnapshot: plan.producer.retainedSnapshot,
      freshSchemaAdvancedSnapshot: current.manifest, retainedSnapshotEquivalent: false, schemaAdvanceOnly: true, schemaComparison108: binding,
      originalBaseline: old.baseline, priorRegistry: plan.producer.priorRegistry, impactReview: plan.consumer.impactReview, fixtureAdmissions: entries,
      inheritedProducerEvidenceIsNotCurrentConsumerAcceptance: true, newConsumerHTTPOrFIAlreadyCertified: false, businessWrites: 0, migrationExecutedByAdmission: false, G3Certified: false, G4Certified: false };
    const chained = makeChainedAdmissions62(compareCtx, registry, entries); entries = chained.entries; registry = { ...registry, sourceHistory: chained.sources, fixtureAdmissions: entries };
    validateRegistryLineage62(compareCtx, registry); for (const entry of entries) for (const pin of entry.receipts) readPin54(pin);
    const registryName = ctx.next('consumer-admission108-registry') + '.json'; ctx.persist(); const registryPin = ctx.artifact(registryName, registry);
    const historicalEvidence = { producerState: plan.producer.frozenState, retentionIndex: plan.producer.retentionIndex, priorRegistry: plan.producer.priorRegistry, impactReview: plan.consumer.impactReview,
      oldProcessBinding: old.apiProcess, oldStatusSourcePins: old.statusSourcePins, oldAuthConfigurations: old.actualAuthConfigurations, oldTrustedSummarySeam: old.trustedSummarySeam,
      oldRequiredWriteSweeps: old.requiredWriteSweeps, oldEFRequiredWriteSweeps40: old.efRequiredWriteSweeps40, producerFactsAndOriginalReceiptsUnchanged: true, inheritedSuccessesNotCertifiedForNewConsumer: true };
    quarantineEvidence62(next, old, historicalEvidence); next.sequence = ctx.state.sequence;
    next.consumerAdmission54 = { registry: registryPin, approvedPlanSHA256, producerEpoch: old.epoch, consumerEpoch: ctx.epoch, currentConsumerCoverageMustUseNewPrivateAndPublicDirectories: true };
    for (const key of ['baseline', 'owned', 'borrowed', 'fixtures', 'objects']) assert.deepEqual(next[key], old[key], 'Only explicit consumer/schema metadata changes; preserve original business authority: ' + key);
    for (const key of Object.keys(ctx.state)) delete ctx.state[key]; Object.assign(ctx.state, next); ctx.persist();
    return { kind: 'actual-retained-schema-new-consumer-admission108', epoch: ctx.epoch, run: ctx.run, registry: registryPin, schemaComparison108: binding,
      retainedSnapshotEquivalent: false, exactApprovedM98AdvanceVerified: true, businessRowsAndOriginalMigrationRowsPreserved: true, originalM97BaselineRetained: true,
      businessDatabaseWrites: 0, businessHTTPRequests: 0, migrationExecutedByAdmission: false, databaseRestoreExecuted: false, inheritedSuccessesCertifiedForCurrentConsumer: false, G3Certified: false, G4Certified: false };
  } finally { const owner = JSON.parse(fs.readFileSync(lock)); assert.equal(owner.pid, process.pid); fs.unlinkSync(lock); }
}

async function main() {
  if (process.argv.includes('--help')) { process.stdout.write('Root only after normal M98, new process/source and exact review:\nnode retained-schema-admission108.mjs --plan <private.json> --approved-plan-sha <rawSHA> --execute\nNo migration/HTTP/DML/process/cleanup is performed.\n'); return; }
  const args = process.argv.slice(2); assert.equal(args.length, 5); assert.equal(args[0], '--plan'); assert.equal(args[2], '--approved-plan-sha'); assert.equal(args[4], '--execute');
  const result = await admitSchemaRetained108({ planFile: args[1], approvedPlanSHA256: args[3] }); process.stdout.write(JSON.stringify(result) + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
