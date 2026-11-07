// Root-authorized controlled synthetic compatibility fixture. Not a business producer.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { data, sha, uuid, keyOf } from './pure.mjs';
import { capture, loadSnapshot, readRows } from './snapshot.mjs';
import { assertRecorded } from './ledger.mjs';
import { assertLegacyView, assertOneControlledLegacyBirth, originalLegacyCandidates } from './ownership-assertions.mjs';
import { ownershipProtocol, ensureOwnershipCustomer } from './creator-ownership.mjs';
const fixtureSQL = `WITH instant AS (SELECT clock_timestamp() AS fixture_now)
INSERT INTO poms.project AS inserted(id,project_no,project_name,source_lead_id,customer_id,customer_name,status,current_stage,owner_org_id,owner_user_id,row_version,created_at,created_by,updated_at,updated_by)
SELECT $1::uuid,$2::text,$3::text,NULL,$4::uuid,$5::text,'active','assessment',NULL,$6::uuid,1,fixture_now,$6::uuid,fixture_now,$6::uuid FROM instant
RETURNING row_to_json(inserted)::text AS raw,inserted.xmin::text AS xmin`;

async function createControlledLegacyFixture(ctx, api) {
  assert.equal(process.platform, 'linux'); const f = ctx.state.fixtures;
  assert(f.platformComplete && f.customer?.id && ctx.state.actors.manager?.id);
  if (f.legacyCompatibilityFixture) return f.legacyCompatibilityFixture;
  assert(!f.legacyFixtureAttempt, 'An earlier controlled fixture attempt needs exact Root reconciliation; never insert a second compatibility row');
  const projectId = randomUUID(), projectNo = `R4GHI-LEGACY-${projectId}`, actorId = ctx.state.actors.manager.id;
  const before = await capture(ctx, ctx.next('legacy-controlled-before')); assertRecorded(ctx, before);
  const original = loadSnapshot(ctx);
  assert(!readRows(original.databases[ctx.database].tables.project).some(r => r.key[0] === projectId));
  assert(!readRows(before.databases[ctx.database].tables.project).some(r => r.key[0] === projectId));
  assert(ctx.state.owned[keyOf(ctx.database, 'platform_user', [actorId])]); assert(ctx.state.owned[keyOf(ctx.database, 'customer', [f.customer.id])]);
  const parameters = [projectId, projectNo, `R4GHI 受控兼容负例 ${projectId}`, uuid(f.customer.id), null, actorId];
  const plan = ctx.artifact(`${ctx.next('legacy-controlled-plan')}.json`, { kind: 'controlled-synthetic-legacy-unverified-compatibility-negative-fixture', fixtureSQL, proposedParameters: parameters, before: before.manifest,
    sourceAuthority: 'Root explicit bounded authorization; acceptance-plan fixture labels/A08, G2 corrective8/20',
    scopeConditionsConstructed: { ownerUserId: actorId, ownerOrgId: null, noVersion1OriginOrModernDutyChain: true, lawfulAssessmentAndOwnedCustomer: true },
    directFixtureSQL: true, producerDelivery: false, actualHistoricalData: false, businessGateException: false, counted32Producer: false });
  f.legacyFixtureAttempt = { projectId, before: before.manifest, plan, phase: 'planned' }; ctx.persist();
  let returned, intent, after;
  try {
    returned = await ctx.db(async c => {
      await c.query('BEGIN');
      try {
        const actor = (await c.query('SELECT id::text FROM poms.platform_user WHERE id=$1::uuid AND is_active FOR SHARE', [actorId])).rows; assert.equal(actor.length, 1);
        const customers = (await c.query("SELECT id::text,display_name FROM poms.customer WHERE id=$1::uuid AND status='active' FOR SHARE", [f.customer.id])).rows; assert.equal(customers.length, 1); parameters[4] = customers[0].display_name;
        assert.equal((await c.query('SELECT id FROM poms.project WHERE id=$1::uuid', [projectId])).rows.length, 0);
        intent = ctx.artifact(`${ctx.next('legacy-controlled-exact-intent')}.json`, { plan, fixtureSQL, parametersActuallyExecuted: [...parameters], before: before.manifest,
          lockedActiveActor: actorId, lockedActiveOwnedCustomer: f.customer.id, exactlyOneNewProjectPK: projectId, actualDatabaseClock: true,
          directFixtureSQL: true, scopeConditionsConstructed: true, producerDelivery: false, actualHistoricalData: false, counted32Producer: false });
        f.legacyFixtureAttempt.intent = intent; f.legacyFixtureAttempt.phase = 'executing'; ctx.persist();
        const rows = (await c.query(fixtureSQL, parameters)).rows; assert.equal(rows.length, 1);
        assert.equal((await c.query('SELECT project_id FROM poms.project_ownership_origin WHERE project_id=$1::uuid', [projectId])).rows.length, 0);
        assert.equal((await c.query('SELECT id FROM poms.project_handover WHERE project_id=$1::uuid', [projectId])).rows.length, 0);
        assert.equal((await c.query('SELECT id FROM poms.project_stage_record WHERE project_id=$1::uuid', [projectId])).rows.length, 0);
        await c.query('COMMIT'); return rows[0];
      } catch (error) { await c.query('ROLLBACK'); throw error; }
    });
    f.legacyFixtureAttempt.phase = 'commit-acknowledged-proof-pending'; f.legacyFixtureAttempt.returned = returned; ctx.persist();
  } catch (error) {
    after = await capture(ctx, ctx.next('legacy-controlled-error-after'));
    const pin = ctx.artifact(`${ctx.next('legacy-controlled-unresolved')}.json`, { plan, intent: intent ?? null, before: before.manifest, after: after.manifest, projectId, SQLCommitAcknowledged: false, requiresRootReconciliation: true });
    ctx.state.blockedObservation = pin; ctx.persist(); throw error;
  }
  after = await capture(ctx, ctx.next('legacy-controlled-after'));
  let actual;
  try {
    actual = assertOneControlledLegacyBirth(ctx, before, after, projectId, readRows);
    assert.equal(actual.raw, returned.raw); assert.equal(actual.xmin, returned.xmin);
    const value = JSON.parse(actual.raw);
    // PG clock_timestamp, not a client date or fabricated historical timestamp.
    assert(Number.isFinite(Date.parse(value.created_at))); assert(Date.parse(value.created_at) >= Date.parse(before.capturedAt) - 1000 && Date.parse(value.created_at) <= Date.parse(after.capturedAt) + 1000);
  } catch (error) {
    ctx.state.blockedObservation = ctx.artifact(`${ctx.next('legacy-controlled-proof-pending')}.json`, { plan, intent, before: before.manifest, after: after.manifest, projectId,
      SQLCommitAcknowledged: true, returned, failure: { name: error.name, message: error.message }, requiresRootReconciliation: true }); ctx.persist(); throw error;
  }
  ctx.own(ctx.database, 'project', actual, { kind: 'Root-authorized-controlled-synthetic-legacy-scope-fixture', transport: 'direct-controlled-fixture-SQL', beforeAbsent: true,
    beforeSnapshot: before.manifest, afterSnapshot: after.manifest, intent, SQLCommitAcknowledged: true, scopeConditionsConstructed: true,
    producerDelivery: false, actualHistoricalData: false, counted32Producer: false });
  const receipt = ctx.artifact(`${ctx.next('legacy-controlled-created')}.json`, { intent, parametersActuallyExecuted: parameters, before: before.manifest, after: after.manifest,
    projectId, rowSHA256: actual.sha256, xmin: actual.xmin, rawRow: actual.raw, onlyOneNewProjectPK: true, oldRowsUnchanged: true,
    noOriginOrModernChain: true, scopeConditionsConstructed: true, directFixtureSQL: true, producerDelivery: false, actualHistoricalData: false, counted32Producer: false },
    { kind: 'actual-controlled-synthetic-legacy-compatibility-fixture', projectId, exactOwnedPK: true, scopeConditionsConstructed: true, producerDelivery: false, actualHistoricalData: false, counted32Producer: false });
  f.legacyCompatibilityFixture = { projectId, receipt, rowSHA256: actual.sha256, xmin: actual.xmin, keepForLegacyDOM: true, fixtureClassification: 'controlled-synthetic-legacy-unverified-compatibility-negative', counted32Producer: false }; ctx.persist();
  f.legacyFixtureAttempt.phase = 'exact-owned-proof-verified'; ctx.persist();
  return f.legacyCompatibilityFixture;
}
function unchangedFixture(ctx, fixture, response) {
  const snapshot = loadSnapshot(ctx, response.after), row = readRows(snapshot.databases[ctx.database].tables.project).find(r => r.key[0] === fixture.projectId);
  assert(row && row.sha256 === fixture.rowSHA256 && row.xmin === fixture.xmin, 'A compatibility negative/read changed the exact controlled scope fixture');
}
export async function legacyCompatibility(ctx, api) {
  const pins = ownershipProtocol(ctx, api), f = ctx.state.fixtures;
  await api.login('manager'); const all = api.spec.components.schemas.AssignRolePermissionsRequest.properties.permissionKeys.items.enum;
  assert.deepEqual(new Set(ctx.state.actors.manager.permissions), new Set(all), 'Use the real fresh all-permission manager so RBAC is not the claimed denial cause');
  await ensureOwnershipCustomer(ctx, api);
  const baseline = loadSnapshot(ctx), originalRows = readRows(baseline.databases[ctx.database].tables.project).map(r => JSON.parse(r.raw));
  const modernProjectIds = readRows(baseline.databases[ctx.database].tables.project_ownership_origin).map(r => JSON.parse(r.raw).project_id);
  const originalCandidateCount = originalLegacyCandidates(originalRows, modernProjectIds).length;
  const fixture = await createControlledLegacyFixture(ctx, api), raw = fs.readFileSync(fixture.receipt.file); assert.equal(sha(raw), fixture.receipt.rawBytesSha256);
  const originalFixture = JSON.parse(JSON.parse(raw).rawRow);
  const detail = await api.request('ProjectController_getById', { id: fixture.projectId }, null, 'manager');
  assertLegacyView(data(detail), originalFixture, api.spec.components.schemas.LegacyOwnerAnchorView); unchangedFixture(ctx, fixture, detail);
  fixture.legacyDetailReceipt = detail.receiptId; fixture.denialReceipts ??= {}; ctx.persist();
  for (const operationId of ['ProjectCostController_getCurrentOperatingBaselinePackage', 'ProjectCostController_getProjectUnifiedAccounting',
    'ProjectCostController_getProjectBusinessOutcomeOverview', 'ProjectCostController_getProjectVarianceRiskExplanation', 'ProjectCostController_getBusinessAccountingFeedback',
    'CommissionController_getCurrentRoleAssignment', 'ProjectController_listAcceptanceRecords', 'ProjectController_listProjectCompletionRecords', 'ProjectController_listProjectArchiveRecords']) {
    if (fixture.denialReceipts[operationId]) continue;
    const result = await api.request(operationId, { projectId: fixture.projectId }, null, 'manager', { expectedStatus: 403 }); unchangedFixture(ctx, fixture, result);
    fixture.denialReceipts[operationId] = result.receiptId; ctx.persist();
  }
  if (!fixture.reassignDenied) {
    const result = await api.request('ProjectController_reassignOwner', { id: fixture.projectId }, { ownerUserId: ctx.state.actors.execution.id, ownerOrgId: f.org.id,
      reason: '受控legacy兼容负例：全RBAC不授予补组织或改派权限。', expectedVersion: originalFixture.row_version }, 'manager', { expectedStatus: 403,
      responseBirths: [{ table: 'project_owner_reassignment_record', pointer: '/projectOwnerReassignmentRecordId', optional: true }], mutableTables: ['project'],
      updatedAnchors: [{ table: 'project', id: fixture.projectId, requestBinding: 'path:id' }] });
    unchangedFixture(ctx, fixture, result); fixture.reassignDenied = result.receiptId; ctx.persist();
  }
  if (!fixture.unrelatedDenied) {
    await api.login('unrelated'); const result = await api.request('ProjectController_getById', { id: fixture.projectId }, null, 'unrelated', { expectedStatus: 404 });
    unchangedFixture(ctx, fixture, result); fixture.unrelatedDenied = result.receiptId; ctx.persist();
  }
  // Root safety29 now gates ordinary update with real OwnerWrite. An unexpected
  // success remains a failed original; the exact fixture may still be owned for cleanup.
  if (!fixture.ordinaryUpdateDenied) {
    const result = await api.request('ProjectController_updateBasicInfo', { id: fixture.projectId }, { projectName: '受控legacy负例：此权限单独不足以修改项目。' }, 'manager', { expectedStatus: 403, mutableTables: ['project'],
      updatedAnchors: [{ table: 'project', id: fixture.projectId, requestBinding: 'path:id' }] });
    unchangedFixture(ctx, fixture, result); fixture.ordinaryUpdateDenied = result.receiptId; ctx.persist();
  }
  fixture.verified = true; ctx.persist();
  return { kind: 'actual-controlled-synthetic-legacy-compatibility-negative', completed: true, fixtureProjectId: fixture.projectId, keptForLegacyDOM: true, sourcePins: pins,
    originalSeedLegacyCandidateCount: originalCandidateCount, scopeConditionsConstructed: true, directFixtureSQL: true, producerDelivery: false, actualHistoricalData: false,
    counted32Producer: false, originalRowsOrOriginsModified: false, CreatorFirstAssignmentCertified: false, G3Certified: false, G4Certified: false };
}
