// Root-reviewed metadata fork only. Uses the existing read-only snapshot/guard.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext, sourcePins, FIXED } from './context.mjs';
import { sha, keyOf, segment } from './pure.mjs';
import { capture, loadSnapshot, readRows } from './snapshot.mjs';
import { assertRecorded } from './ledger.mjs';
import { readPin54, pointer54, producerProjection54 } from './consumer-admission54.mjs';
import { makeChainedAdmissions62, validateRegistryLineage62, quarantineEvidence62, assertImpactReview62 } from './registry-lineage62.mjs';

export function assertSameRetained54(old, current, databases, read = readRows) {
  assert.deepEqual(Object.keys(old.databases).sort(), Object.keys(current.databases).sort());
  for (const database of databases) {
    assert.deepEqual(current.databases[database].meta, old.databases[database].meta, 'No catalog/OID/ACL/role/function/trigger/sequence drift is admitted');
    assert.deepEqual(current.objects[database], old.objects[database], 'No object key/byte/directory drift is admitted');
    const a = old.databases[database].tables, b = current.databases[database].tables;
    assert.deepEqual(Object.keys(a), Object.keys(b)); assert.equal(Object.keys(a).length, 139);
    for (const table of Object.keys(a)) assert.deepEqual(read(b[table]).map(row => [row.key, row.sha256, row.xmin]), read(a[table]).map(row => [row.key, row.sha256, row.xmin]), `Retained rows/xmin changed: ${database}.${table}`);
  }
}
function receiptPin54(value) { return { file: value.file, rawBytesSha256: value.rawBytesSha256 }; }
function filePin54(file) { const bytes = fs.readFileSync(file); return { file, rawBytesSha256: sha(bytes) }; }
export function fixtureAdmissions54(state, retained, database, pinFile = filePin54) {
  const entries = [], add = (registryPath, projectIds, mode, paths, receipts = []) => {
    const record = pointer54(state, registryPath); if (!record) return;
    const ids = [...new Set(projectIds.filter(Boolean))].sort(); assert(ids.length);
    for (const id of ids) {
      const row = readRows(retained.databases[database].tables.project).find(row => row.key[0] === id), owned = state.owned[keyOf(database, 'project', [id])];
      assert(row && owned && !owned.deleted && owned.latestSha256 === row.sha256 && owned.latestXmin === row.xmin, 'Every admitted resource must be an exact real retained owned project');
    }
    const identity = paths.filter(path => pointer54(record, path) !== undefined).map(path => ({ path, value: pointer54(record, path) }));
    entries.push({ registryPath, mode, projectIds: ids, producerRecordSHA256: sha(JSON.stringify(record)), producerProjectionSHA256: sha(JSON.stringify(producerProjection54(record))), identity,
      receipts: receipts.filter(Boolean).map(receiptPin54) });
  };
  for (const key of ['eo', 'own']) {
    const record = state.fixtures.uiFixtureViews23?.[key]; if (!record) continue;
    add(`/fixtures/uiFixtureViews23/${key}`, [record.fixtures.project?.id], 'immutable-ui-producer', ['/key', '/classification', '/sourcePinsSHA256', '/fixtures/project/id', '/pause/result/projectId', '/pause/result/commandActorId', '/pause/result/parentCompletionRecordId']);
  }
  const creator = state.fixtures.creatorOwnership23;
  if (creator) {
    const id = creator.uiSpareProjectId; assert(id && creator.uiSpareAnchor?.view?.projectId === id);
    const origin = readRows(retained.databases[database].tables.project_ownership_origin).find(row => row.key[0] === id), owned = state.owned[keyOf(database, 'project_ownership_origin', [id])];
    assert(origin && owned && owned.latestSha256 === origin.sha256 && owned.latestXmin === origin.xmin);
    add('/fixtures/creatorOwnership23', [id], 'immutable-ui-producer', ['/uiSpareProjectId', '/uiSpareAnchor', '/keepUISpareUnassigned'], [creator.projects?.['ui-spare']?.proof, pinFile(creator.uiSpareAnchor.receipt)]);
    entries.at(-1).ownershipOrigin = { projectId: id, rowSHA256: origin.sha256, xmin: origin.xmin, sourcePayloadHash: JSON.parse(origin.raw).source_payload_hash };
  }
  const legacy = state.fixtures.legacyCompatibilityFixture;
  if (legacy) add('/fixtures/legacyCompatibilityFixture', [legacy.projectId], 'legacy-compatibility', ['/projectId', '/fixtureClassification', '/receipt'], [legacy.receipt]);
  for (const [name, record] of Object.entries(state.fixtures.a05Boundaries26?.views ?? {})) add(`/fixtures/a05Boundaries26/views/${name}`, [record.fixtures.project?.id], 'continuable-project-producer',
    ['/name', '/sourcePinsSHA256', '/scenario', '/fixtures/project/id', '/fixtures/cost/id', '/fixtures/bid/id', '/fixtures/contract/id']);
  return entries;
}
export async function admitRetained54({ planFile, approvedPlanSHA256 }) {
  assert.equal(process.platform, 'linux'); const planBytes = fs.readFileSync(planFile); assert.equal(sha(planBytes), approvedPlanSHA256); const plan = JSON.parse(planBytes);
  assert.equal(plan.kind, 'retained-data-consumer-admission54'); assert([1, 2].includes(plan.schemaVersion));
  if (plan.schemaVersion === 1) { assert.equal(plan.consumer.epoch, 'g2-business11'); assert.equal(plan.consumer.run, 'main01'); }
  else { segment(plan.consumer.epoch); segment(plan.consumer.run); assert.notEqual(plan.consumer.epoch, plan.producer.epoch); }
  const index = JSON.parse(readPin54(plan.producer.retentionIndex));
  assert.equal(index.producerEpoch, plan.producer.epoch); assert.equal(index.run, plan.producer.run);
  assert.deepEqual(receiptPin54(index.frozenState), plan.producer.frozenState); assert.deepEqual(receiptPin54(index.retainedSnapshot), plan.producer.retainedSnapshot);
  const old = JSON.parse(readPin54(plan.producer.frozenState)); assert.equal(old.marker, index.marker); assert.equal(old.epoch, plan.producer.epoch);
  assert.equal(sha(JSON.stringify(old.sourcePins)), plan.producer.sourcePinsSHA256); assert(!old.activeFault && !old.blockedObservation && !old.cleaned && !old.cleanupPlan);
  if (plan.schemaVersion === 2) {
    assert(old.consumerAdmission54?.registry && plan.producer.priorRegistry);
    assert.deepEqual(receiptPin54(old.consumerAdmission54.registry), plan.producer.priorRegistry, 'Keep the exact original producer consumer-registry chain');
    const impact = JSON.parse(readPin54(plan.consumer.impactReview));
    assertImpactReview62(impact, plan.producer, plan.consumer);
  }
  const expected = JSON.parse(readPin54(plan.consumer.sourcePins)); assert.deepEqual(sourcePins(), expected, 'Actual new source list must exactly match the explicit reviewed input');
  assert.equal(sha(JSON.stringify(expected)), plan.consumer.sourcePinsSHA256); assert.equal(expected.length, plan.consumer.sourceCount);
  assert(expected.some(pin => pin.file === 'docs/design/rust-r4ghi/g2-consumed-evidence-corrective54.md'));
  if (plan.schemaVersion === 2) assert(expected.some(pin => pin.file === 'docs/design/rust-r4ghi/g2-project-metadata-noop61.md'));
  assert.notEqual(plan.consumer.sourcePinsSHA256, plan.producer.sourcePinsSHA256);
  const candidate = JSON.parse(readPin54(plan.consumer.candidateReceipt));
  assert.equal(pointer54(candidate, plan.consumer.candidateSourceDigestPointer), plan.consumer.sourcePinsSHA256); assert.equal(pointer54(candidate, plan.consumer.candidateBinaryHashPointer), plan.consumer.binarySHA256);
  const processRecord = JSON.parse(readPin54(plan.consumer.apiProcess));
  assert.equal(processRecord.namespace, FIXED.namespace); assert.equal(processRecord.root, FIXED.mirror); assert.equal(processRecord.port, 31441); assert.equal(processRecord.binarySha256, plan.consumer.binarySHA256);
  assert.equal(fs.realpathSync(`/proc/${processRecord.pid}/exe`), processRecord.binary); assert.equal(sha(fs.readFileSync(processRecord.binary)), processRecord.binarySha256);
  const stat = fs.readFileSync(`/proc/${processRecord.pid}/stat`, 'utf8'); assert.equal(stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], processRecord.startTime);
  const oldProcess = old.apiProcess.record;
  if (fs.existsSync(`/proc/${oldProcess.pid}/stat`)) assert.notEqual(fs.readFileSync(`/proc/${oldProcess.pid}/stat`, 'utf8').slice(fs.readFileSync(`/proc/${oldProcess.pid}/stat`, 'utf8').lastIndexOf(') ') + 2).split(' ')[19], oldProcess.startTime, 'Old physical API must remain stopped');
  const folder = `${FIXED.private}/business/${plan.consumer.epoch}/${plan.consumer.run}`;
  if (fs.existsSync(`${folder}/state.json`)) {
    const pending = JSON.parse(fs.readFileSync(`${folder}/state.json`)); assert.equal(pending.admissionPending54, approvedPlanSHA256, 'Do not overwrite a real consumer state'); assert(!pending.baseline && !Object.keys(pending.owned).length);
  }
  const ctx = createContext({ epoch: plan.consumer.epoch, run: plan.consumer.run }, { admissionPlanSHA256: approvedPlanSHA256 });
  const lock = `${ctx.priv}/driver.lock`; fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'retained-consumer-admission54', approvedPlanSHA256 }) + '\n', { flag: 'wx', mode: 0o600 });
  try {
    const retained = loadSnapshot(ctx, index.retainedSnapshot), currentLabel = ctx.next('admission54-current'); ctx.persist();
    const current = await capture(ctx, currentLabel);
    assert.equal(ctx.state.marker, old.marker); assertSameRetained54(retained, current, ctx.databases);
    assertRecorded({ ...ctx, state: old }, current);
    let fixtureAdmissions = fixtureAdmissions54(old, retained, ctx.database);
    let registry = { schemaVersion: plan.schemaVersion, kind: 'verified-retained-data-consumer-registry54', namespace: ctx.namespace, marker: old.marker,
      approvedPlanSHA256, producer: { epoch: old.epoch, run: old.run, sourcePinsSHA256: plan.producer.sourcePinsSHA256, sourceCount: old.sourcePins.length, binarySHA256: oldProcess.binarySha256 },
      consumer: { ...plan.consumer }, retentionIndex: plan.producer.retentionIndex, producerState: plan.producer.frozenState, retainedSnapshot: plan.producer.retainedSnapshot,
      freshEquivalentSnapshot: current.manifest, originalBaseline: old.baseline, fixtureAdmissions,
      inheritedProducerEvidenceIsNotCurrentConsumerAcceptance: true, newConsumerHTTPOrFIAlreadyCertified: false, businessWrites: 0, G3Certified: false, G4Certified: false };
    if (plan.schemaVersion === 2) {
      registry.priorRegistry = plan.producer.priorRegistry; registry.impactReview = plan.consumer.impactReview;
      const chained = makeChainedAdmissions62(ctx, registry, fixtureAdmissions); fixtureAdmissions = chained.entries;
      registry = { ...registry, sourceHistory: chained.sources, fixtureAdmissions }; validateRegistryLineage62(ctx, registry);
    }
    for (const entry of fixtureAdmissions) for (const pin of entry.receipts) readPin54(pin);
    const registryName = `${ctx.next('consumer-admission54-registry')}.json`; ctx.persist(); const registryPin = ctx.artifact(registryName, registry);
    const next = structuredClone(old), activeProcess = { file: plan.consumer.apiProcess.file, rawBytesSha256: plan.consumer.apiProcess.rawBytesSha256, record: processRecord };
    next.epoch = ctx.epoch; next.run = ctx.run; next.createdAt = new Date().toISOString(); next.sourcePins = expected; next.apiProcess = activeProcess;
    const historicalEvidence = { producerState: plan.producer.frozenState, retentionIndex: plan.producer.retentionIndex,
      oldProcessBinding: old.apiProcess, oldStatusSourcePins: old.statusSourcePins, oldAuthConfigurations: old.actualAuthConfigurations, oldTrustedSummarySeam: old.trustedSummarySeam,
      oldRequiredWriteSweeps: old.requiredWriteSweeps, oldEFRequiredWriteSweeps40: old.efRequiredWriteSweeps40,
      ...(plan.schemaVersion === 1 ? { oldProducerAPI: '133', newConsumerAPI: '134' } : { priorRegistry: plan.producer.priorRegistry, impactReview: plan.consumer.impactReview }),
      producerFactsAndOriginalReceiptsUnchanged: true, inheritedSuccessesNotCertifiedForNewConsumer: true };
    if (plan.schemaVersion === 1) next.inheritedProducerEvidence54 = historicalEvidence;
    else quarantineEvidence62(next, old, historicalEvidence);
    // These are NEW active consumer registries, not rewritten old evidence.
    next.actualAuthConfigurations = {}; next.requiredWriteSweeps = {}; next.efRequiredWriteSweeps40 = {};
    delete next.trustedSummarySeam; delete next.statusSourcePins; delete next.admissionPending54;
    next.consumerAdmission54 = { registry: registryPin, approvedPlanSHA256, producerEpoch: old.epoch, consumerEpoch: ctx.epoch, currentConsumerCoverageMustUseNewPrivateAndPublicDirectories: true };
    assert.deepEqual(next.baseline, old.baseline); assert.deepEqual(next.owned, old.owned); assert.deepEqual(next.borrowed, old.borrowed); assert.deepEqual(next.fixtures, old.fixtures); assert.deepEqual(next.objects, old.objects);
    // Persist in place: the existing Root closures retain this same object.
    for (const key of Object.keys(ctx.state)) delete ctx.state[key]; Object.assign(ctx.state, next); ctx.persist();
    return { kind: 'actual-retained-data-new-consumer-admission54', epoch: ctx.epoch, run: ctx.run, registry: registryPin, retainedSnapshotEquivalent: true,
      oldProducerSourceCount: old.sourcePins.length, newConsumerSourceCount: expected.length, originalStateAndSourcePinsUnchanged: true, businessDatabaseWrites: 0, businessHTTPRequests: 0,
      originalNamespaceVolumeRetained: true, databaseRestoreExecuted: false, oldProducerSuccessesPromotedToNewConsumerAcceptance: false, G3Certified: false, G4Certified: false };
  } finally { const owner = JSON.parse(fs.readFileSync(lock)); assert.equal(owner.pid, process.pid); fs.unlinkSync(lock); }
}
