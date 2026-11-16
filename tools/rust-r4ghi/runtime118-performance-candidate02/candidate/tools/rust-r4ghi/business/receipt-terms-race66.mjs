import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { data, sha, uuid, keyOf } from './pure.mjs';
import { createApi } from './http.mjs';
import { capture, readRows } from './snapshot.mjs';
import { assertRecorded } from './ledger.mjs';
import { assertRollbackRows } from './fault-sweep.mjs';
import { requireOwnedScope } from './required-write-inventory.mjs';
import { directWait66, expectedCash66, assertFrozenReceipt66 } from './receipt-terms-proof66.mjs';

const confirmOperation = 'ContractFinanceController_confirmReceipt';
const ref = value => ({ kind: value.kind, id: uuid(value.id), expectedVersion: value.rowVersion, payloadHash: value.payloadHash });
function owned66(ctx, table, id) { const value = ctx.state.owned[keyOf(ctx.database, table, [id])]; assert(value && !value.deleted, `Only actual owned ${table} may enter this case`); return value; }
function reserveCheck66(ctx, projectId) {
  const f = ctx.state.fixtures, reserved = [f.project?.id, f.creatorOwnership23?.uiSpareProjectId,
    ...Object.values(f.uiFixtureViews23 ?? {}).map(v => v.pause?.result?.projectId ?? v.fixtures?.project?.id),
    ...Object.values(f.uiFormFixtureViews18 ?? {}).map(v => v.pause?.result?.projectId ?? v.fixtures?.project?.id),
    ...Object.values(f.a05Boundaries26?.views ?? {}).map(v => v.fixtures.project?.id)].filter(Boolean);
  assert(!reserved.includes(projectId), 'Do not consume Main, UI spares, H form fixtures or A05 financial boundary projects');
}
async function term66(ctx, plan) {
  return ctx.db(async c => {
    const values = (await c.query('SELECT t.id::text,t.contract_id::text,t.version,t.row_version,t.snapshot_status,t.source_preparation_id::text,t.payload_hash,t.currency_code,t.tax_rate::text,t.xmin::text AS xmin,row_to_json(t)::text AS raw FROM poms.contract_term_snapshot t WHERE t.id=$1::uuid AND t.contract_id=$2::uuid', [plan.termSnapshotId, plan.contractId])).rows;
    assert.equal(values.length, 1); const value = values[0], owned = owned66(ctx, 'contract_term_snapshot', value.id);
    assert.equal(sha(value.raw), owned.latestSha256); assert.equal(value.xmin, owned.latestXmin);
    assert(value.source_preparation_id && /^[a-f0-9]{64}$/.test(value.payload_hash)); assert(['active', 'superseded'].includes(value.snapshot_status));
    assert(typeof value.currency_code === 'string' && /^[A-Z]{3}$/.test(value.currency_code)); expectedCash66(plan.gross, value.tax_rate); return value;
  });
}
async function graph66(ctx) {
  return ctx.db(async c => (await c.query('SELECT pid::int,usename,state,wait_event_type,query,pg_blocking_pids(pid) AS blocked_by FROM pg_stat_activity WHERE datname=current_database()')).rows);
}

export async function receiptTermsRace66(ctx, plan, planPin) {
  reserveCheck66(ctx, plan.projectId); owned66(ctx, 'project', plan.projectId); owned66(ctx, 'contract', plan.contractId); owned66(ctx, 'contract_term_snapshot', plan.termSnapshotId);
  ctx.state.consumerChecks ??= {}; ctx.state.consumerChecks.receiptTermsRace66 ??= {};
  const key = `${ctx.epoch}:${plan.caseId}`; assert(!ctx.state.consumerChecks.receiptTermsRace66[key], 'An existing case needs exact original reconciliation, never re-create/re-confirm or blindly replay');
  const producerFixturesBefore = sha(JSON.stringify(ctx.state.fixtures)), record = ctx.state.consumerChecks.receiptTermsRace66[key] = { actualEpoch: ctx.epoch, approvedPlan: planPin, phase: 'setup-starting', sourcePinsSHA256: sha(JSON.stringify(ctx.pins)) }; ctx.persist();
  const api = createApi(ctx); assert.equal(api.success(confirmOperation), 200); await api.login(plan.actorKey);
  const project = data(await api.request('ProjectController_getById', { id: plan.projectId }, null, plan.actorKey)); assert.equal(project.scopeKind, 'full-project'); assert.equal(project.id, plan.projectId);
  let contract = data(await api.request('ContractController_getById', { id: plan.contractId }, null, plan.actorKey)); assert.equal(contract.projectId, plan.projectId); assert.equal(contract.status, 'active');
  record.phase = 'public-receipt-create-starting'; ctx.persist();
  const created = await api.request('ContractFinanceController_createReceipt', { contractId: plan.contractId }, { receiptAmount: plan.gross, receiptDate: await ctx.instant(), sourceType: 'manual' }, plan.actorKey,
    { responseBirths: [{ table: 'receipt_record', pointer: '/id' }] });
  const receipt = data(created); record.receipt = { value: receipt, receipt: created.receiptId }; record.phase = 'pending-receipt-created'; ctx.persist();
  assert.equal(receipt.projectId, plan.projectId); assert.equal(receipt.contractId, plan.contractId); assert.equal(receipt.status, 'pending-confirmation'); assert.equal(receipt.receiptAmount, plan.gross);
  const prepared = await api.request('ProjectCostController_getProjectUnifiedAccounting', { projectId: plan.projectId }, null, plan.actorKey, { query: { view: 'preparation', intent: 'receipt-basis', receiptId: receipt.id } });
  const candidates = data(prepared).preparation.sourceRows.filter(value => value.sourceRef?.kind === 'ContractTermSnapshot' && value.sourceRef.id === plan.termSnapshotId && value.state === 'ready'); assert.equal(candidates.length, 1, 'Only an explicit genuinely ready original term may be selected; never silently latest');
  const original = await term66(ctx, plan), reference = ref(candidates[0].sourceRef); assert.equal(reference.expectedVersion, original.row_version);
  contract = data(await api.request('ContractController_getById', { id: plan.contractId }, null, plan.actorKey)); assert.equal(contract.projectId, plan.projectId); assert.equal(contract.status, 'active');
  const body = { inputVersion: 'server-derived-v1', mode: 'confirm', expectedVersion: receipt.rowVersion, expectedContractVersion: contract.rowVersion,
    basis: { termSnapshotRef: reference, currencyBasisRef: reference, evidenceRefs: [], selectionPolicy: 'receipt-date-effective-terms', reason: '真实pending回款与实际原合同条款的锁争用防御验收；SQL负控不提交、不变更条款或税务事实。' } };
  assert(Number.isInteger(body.expectedVersion) && body.expectedVersion > 0 && Number.isInteger(body.expectedContractVersion) && body.expectedContractVersion > 0);
  record.prepared = { receipt: prepared.receiptId, body, originalTerm: original, expectedFromActualOriginalTerms: expectedCash66(plan.gross, original.tax_rate) }; record.phase = 'prepared'; ctx.persist();
  assert.equal(await ctx.db(async c => (await c.query('SELECT count(*)::int AS n FROM poms.receipt_accounting_basis WHERE receipt_id=$1::uuid', [receipt.id])).rows[0].n), 0, 'An idempotent old C result cannot count as this race');
  const before = await capture(ctx, ctx.next('c-terms66-before')); assertRecorded(ctx, before);
  record.race = { phase: 'barrier-starting', before: before.manifest, bodySHA256: sha(JSON.stringify(body)), statementPolicy: 'one public C request; terms no-op UPDATE only; every control transaction rolls back' }; ctx.persist();
  let barrier, mutator, barrierReleased = false, mutatorClosed = false, confirmPending = null, confirmSettled = false, mutationPending = null;
  let appPid = null, barrierPid = null, mutatorPid = null, originalResult = null, mutation = null, controlError = null, applicationWait = null, mutationWait = null;
  const samples = [];
  try {
    barrier = await ctx.client(); await barrier.query('BEGIN'); barrierPid = (await barrier.query('SELECT pg_backend_pid()::int AS pid')).rows[0].pid;
    await barrier.query('LOCK TABLE poms.receipt_accounting_basis IN SHARE MODE');
    confirmPending = api.request(confirmOperation, { id: receipt.id }, body, plan.actorKey, { mutableTables: ['receipt_record'], updatedAnchors: [{ table: 'receipt_record', id: receipt.id, requestBinding: 'path:id' }] })
      .then(value => { record.confirmation = { receipt: value.receiptId, before: value.before, after: value.after, phase: 'success-proof-pending' }; ctx.persist(); return { value }; }, error => ({ error: { name: error.name, message: error.message } })).finally(() => { confirmSettled = true; });
    for (let n = 0; n < 100; n += 1) {
      const graph = await graph66(ctx), waiters = graph.filter(value => value.usename === ctx.apps[1] && /INSERT\s+INTO\s+poms\.receipt_accounting_basis/i.test(value.query) && directWait66(graph, value.pid, barrierPid));
      if (waiters.length) { assert.equal(waiters.length, 1); applicationWait = graph; appPid = waiters[0].pid; break; } if (confirmSettled) break; await delay(50);
    }
    assert(appPid, 'The actual new C must be waiting at basis INSERT after taking original-term SHARE');
    mutator = await ctx.client(); await mutator.query('BEGIN ISOLATION LEVEL READ COMMITTED'); mutatorPid = (await mutator.query('SELECT pg_backend_pid()::int AS pid')).rows[0].pid;
    await mutator.query("SELECT set_config('lock_timeout',$1,true),set_config('statement_timeout','10000ms',true)", [`${plan.lockTimeoutMs}ms`]);
    let mutationSettled = false;
    // This statement requests the normal row-update lock without changing any
    // value. It is never a financial producer, and is always rolled back.
    mutationPending = mutator.query('UPDATE poms.contract_term_snapshot SET payment_terms=payment_terms WHERE id=$1::uuid AND contract_id=$2::uuid AND row_version=$3', [plan.termSnapshotId, plan.contractId, original.row_version])
      .then(value => ({ unexpectedSuccess: true, rowCount: value.rowCount }), error => ({ code: error.code, message: error.message, severity: error.severity, routine: error.routine })).finally(() => { mutationSettled = true; });
    for (let n = 0; n < Math.ceil(plan.lockTimeoutMs / 50) + 30; n += 1) {
      const graph = await graph66(ctx); if (samples.length < 6) samples.push(graph);
      if (directWait66(graph, mutatorPid, appPid)) mutationWait ??= graph;
      if (mutationSettled) break; await delay(50);
    }
    mutation = await mutationPending; await mutator.query('ROLLBACK'); await mutator.end(); mutatorClosed = true;
    assert(mutationWait, 'Require actual original-term row-lock wait on this C PID, not a guessed timeout'); assert.equal(mutation.code, '55P03'); assert(!mutation.unexpectedSuccess);
  } catch (error) { controlError = { name: error.name, message: error.message, code: error.code }; }
  finally {
    if (mutationPending && !mutation) mutation = await mutationPending;
    if (mutator && !mutatorClosed) { try { await mutator.query('ROLLBACK'); } catch (error) { controlError ??= { name: error.name, message: error.message, code: error.code }; } try { await mutator.end(); } catch (error) { controlError ??= { name: error.name, message: error.message }; } }
    if (barrier) { try { await barrier.query('ROLLBACK'); barrierReleased = true; } catch (error) { controlError ??= { name: error.name, message: error.message, code: error.code }; } try { await barrier.end(); } catch (error) { controlError ??= { name: error.name, message: error.message }; } }
    if (confirmPending) originalResult = await confirmPending;
  }
  const after = await capture(ctx, ctx.next('c-terms66-after')); record.race.phase = 'observed'; record.race.after = after.manifest;
  const observation = ctx.artifact(`${ctx.next('c-terms66-observation')}.json`, { originalTerm: original, body, before: before.manifest, after: after.manifest, barrierPid, appPid, mutatorPid, applicationWait, mutationWait, samples, mutation, controlError, barrierReleased, confirmation: record.confirmation ?? originalResult, SQLValueChangeOrCommit: false });
  record.race.observation = observation; ctx.persist();
  if (controlError || !originalResult?.value || !applicationWait || !mutationWait || mutation?.code !== '55P03' || !barrierReleased) { ctx.state.blockedObservation = observation; ctx.persist(); throw new Error('C defensive race was not fully observed; inspect actual HTTP/SQL/ledger, no retry/reconfirmation inference'); }
  const response = originalResult.value, confirmed = data(response); assert.equal(response.status, 200); assert.equal(confirmed.id, receipt.id); assert.equal(confirmed.status, 'confirmed'); assert.equal(confirmed.rowVersion, receipt.rowVersion + 1);
  assert.equal(confirmed.receiptAmount, receipt.receiptAmount); assert.equal(confirmed.receiptDate, receipt.receiptDate); assert.equal(confirmed.confirmedBy, ctx.state.actors[plan.actorKey].id); assert(confirmed.confirmedAt);
  const finalTerm = await term66(ctx, plan); assert.equal(sha(finalTerm.raw), sha(original.raw)); assert.equal(finalTerm.xmin, original.xmin);
  const bases = await ctx.db(async c => (await c.query('SELECT id::text,receipt_id::text,project_id::text,contract_id::text,receipt_row_version,term_snapshot_id::text,term_snapshot_version,term_snapshot_row_version,term_payload_hash,currency,currency_source_kind,currency_source_id::text,currency_source_version,currency_source_hash,cash_gross::text,amount_excluding_tax::text,tax_amount::text,tax_rate::text,capture_mode,rounding_policy,producer_version,captured_by::text,frozen_payload,payload_hash FROM poms.receipt_accounting_basis WHERE receipt_id=$1::uuid', [receipt.id])).rows);
  assert.equal(bases.length, 1); const expected = assertFrozenReceipt66(bases[0], original, { gross: plan.gross, receiptId: receipt.id, projectId: plan.projectId, contractId: plan.contractId, ref: reference }, ctx.state.actors[plan.actorKey].id);
  assert.equal(bases[0].receipt_row_version, confirmed.rowVersion);
  const rows = table => readRows(after.databases[ctx.database].tables[table]), basisRow = rows('receipt_accounting_basis').find(value => value.key[0] === bases[0].id), receiptRow = rows('receipt_record').find(value => value.key[0] === receipt.id);
  const audits = rows('audit_log').filter(value => { const parsed = JSON.parse(value.raw); return parsed.request_id === response.requestId && parsed.event_type === confirmOperation; }); assert.equal(audits.length, 1);
  assert.equal(basisRow.xmin, receiptRow.xmin); assert.equal(audits[0].xmin, receiptRow.xmin); assertRecorded(ctx, after);
  const actorId = ctx.state.actors[plan.actorKey].id, sessionId = requireOwnedScope(ctx, before, { projectId: plan.projectId, actorId, actorKey: plan.actorKey }), authTouches = [];
  for (const database of ctx.databases) {
    assert.deepEqual(before.databases[database].meta, after.databases[database].meta); assert.deepEqual(before.objects[database], after.objects[database]);
    for (const table of Object.keys(before.databases[database].tables)) {
      const allowed = database !== ctx.database ? new Set() : table === 'receipt_record' ? new Set([receipt.id]) : table === 'receipt_accounting_basis' ? new Set([bases[0].id]) : table === 'audit_log' ? new Set(audits.map(value => value.key[0])) : new Set();
      const keep = value => !allowed.has(value.key[0]);
      const touches = assertRollbackRows(readRows(before.databases[database].tables[table]).filter(keep), readRows(after.databases[database].tables[table]).filter(keep), { allowSession: database === ctx.database && table === 'auth_session' ? sessionId : null, actorId });
      authTouches.push(...touches.map(value => ({ database, table, ...value })));
    }
  }
  assert.equal(sha(JSON.stringify(ctx.state.fixtures)), producerFixturesBefore, 'The original producer/Main/UI/A05 fixture record changed');
  record.proof = ctx.artifact(`${ctx.next('c-terms66-proof')}.json`, { kind: 'actual-public-receipt-confirmation-vs-original-terms-row-lock', actualEpoch: ctx.epoch, approvedPlan: planPin, observation, confirmation: response.receiptId, ledger: response.ledger, expectedFromOriginal: expected, basis: bases, termBeforeRawSHA256: sha(original.raw), termAfterRawSHA256: sha(finalTerm.raw), originalTermXminUnchanged: true, actualSharedBusinessXmin: receiptRow.xmin,
    actualFailedControlSQLSTATE: mutation.code, exactOriginalTermRef: reference, allUnrelatedRowsXminCatalogSequencesObjectsUnchanged: true, separateActualAuthTouches: authTouches, termsOrTaxFactsSubmittedBySQL: false, G3Certified: false, G4Certified: false });
  record.phase = 'verified'; record.confirmation.phase = 'verified'; ctx.persist(); return { proof: record.proof, G3Certified: false, G4Certified: false };
}
