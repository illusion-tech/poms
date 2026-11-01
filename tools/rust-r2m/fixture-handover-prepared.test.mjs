import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildPreparedPlan } from '../rust-r2k/r4-prepared-source.mjs';
import { validateHandoverPreparedPlan } from './fixture-handover-prepared.mjs';
import { digest } from './fixture-core.mjs';
import { canonicalDefinitions } from './fixture-policy.mjs';
import { Fixture } from './fixture.mjs';
import { memoryStore } from './fixture-journal.mjs';
import { assertRowReferences } from './fixture-references.mjs';

async function sourcePlan(overrides = {}) {
    const runId = randomUUID(), adminId = randomUUID(), viewerId = randomUUID(), orgId = randomUUID();
    const fixture = { key: 'r2m_draft_' + runId.replaceAll('-', ''), projectNo: 'M4-' + runId.slice(0, 8), projectName: 'Pure original source draft',
        contractNo: 'MC-' + runId.slice(0, 8), handoverStatus: 'draft', confirmedReceiptAmount: '100000', receiptRecordId: randomUUID() };
    for (const key of ['projectId','contractId','contractSnapshotId','baselineId','diffResultId','readinessPackageId','receivablePlanVersionId','contractSummarySnapshotId','handoverSummarySnapshotId','handoverId','confirmationRecordId']) fixture[key] = randomUUID();
    Object.assign(fixture, overrides);
    const borrowedDefinitions = { contractSummaryPackageId: canonicalDefinitions[0].id, projectHandoverSummaryPackageId: canonicalDefinitions[1].id };
    const input = { fixture, actorId: { adminId, viewerId }, orgId, borrowedDefinitions, participantRowIds: { executionOwner: randomUUID(), salesOwner: randomUUID() } };
    const plan = await buildPreparedPlan(input);
    const fake = { runId, actors: { admin: adminId, viewer: viewerId }, base: { accounts: [{ account: 'admin', orgId }] },
        j: { objects: [{ id: adminId }, { id: viewerId }, { id: orgId }], borrowed: { definitions: canonicalDefinitions.map(row => ({ ...row, readOnly: true, row: { ...row, status: 'active' }, fullRowSha256: digest({ ...row, status: 'active' }) })) } },
        scope: () => ({ borrowedDefinitions: Object.values(borrowedDefinitions) }) };
    return { plan, fake };
}
test('original draft source rebuild retains exact SQL/columns and one no-row logical reference', async () => {
    const { plan, fake } = await sourcePlan(); const result = await validateHandoverPreparedPlan(fake, plan, 'm4.integration');
    assert.equal(result.rows.length, 13); assert.equal(plan.statements.length, 12);
    assert.equal(result.sourceBoundary.preparedDraftOnly, true); assert.equal(result.sourceBoundary.actualNativeConfirmationRequired, true);
    assert(!result.rows.some(row => row.id === result.logicalId)); assert.equal(result.originalPlan.logicalReferences[0].role, 'receivable-plan-version-no-row');
    assert.equal(plan.boundary.actualSqlExecutions, 0); assert.equal(plan.boundary.ownershipOrCommitCertified, false);
});
test('SQL or actor metadata cannot replace the original rebuilt cohort', async () => {
    const { plan, fake } = await sourcePlan(); const changed = structuredClone(plan); changed.statements[0].sql += ' SELECT 1';
    await assert.rejects(validateHandoverPreparedPlan(fake, changed, 'm4.integration'));
    const foreign = { ...fake, actors: { ...fake.actors, admin: randomUUID() } };
    await assert.rejects(validateHandoverPreparedPlan(foreign, plan, 'm4.integration'));
});
test('prepared confirmed handover is not this run Native confirmation evidence', async () => {
    const { plan, fake } = await sourcePlan({ handoverStatus: 'confirmed' });
    await assert.rejects(validateHandoverPreparedPlan(fake, plan, 'm4.integration'), /prepared draft/);
});
test('the original amount string rule is retained rather than silently coercing a number', async () => {
    await assert.rejects(sourcePlan({ confirmedReceiptAmount: 100000 }), /replaceAll/);
});
test('handover-only tables cannot be inserted by the generic single-row API', async () => {
    let queries = 0; const runId = randomUUID(); const fixture = new Fixture({ query: async () => { queries++; throw new Error('unexpected fake SQL'); } }, 'nest', runId, { store: memoryStore('nest', runId) });
    for (const table of ['commercial_release_baseline','commercial_baseline_diff_result','contract_readiness_package']) await assert.rejects(fixture.insert(table, {}, { caseId: 'm4.integration' }), /exact original source cohort/);
    assert.equal(queries, 0);
});

function logicalFixture(state = 'promoted') {
    const runId=randomUUID(),logicalId=randomUUID(),rowId=randomUUID(),projectId=randomUUID(),planId=randomUUID(),intentId=randomUUID();
    const ref={id:logicalId,role:'receivable-plan-version-no-row',table:'contract_readiness_package',rowId,column:'initialized_receivable_plan_version_id'};
    const originalPlan={logicalReferences:[ref]},sourcePlanSha256=digest(originalPlan);
    const plan={id:planId,state,directCreateIntentId:intentId,sourcePlanSha256,originalPlan};
    const journal={runId,objects:[],preparedBatches:[plan],logicalReferences:[{...ref,sourcePlanId:planId,sourcePlanSha256,caseId:'m4.integration',projectId,rowOwned:false}],directCreates:[{id:intentId,sourcePlanId:planId,state,beforeAbsent:true,transaction:'100',commitAcknowledged:true,independentPostCommitCaptureVerified:true}]};
    const scope={caseId:'m4.integration',projects:[projectId],actors:[],borrowedActors:[],borrowedDefinitions:[]};
    const row={id:rowId,project_id:projectId,initialized_receivable_plan_version_id:logicalId};
    return {journal,scope,row,additional:[{id:rowId},{id:projectId}],logicalId,planId};
}
test('logical no-row ID is allowed only at its exact original row/table/column', () => {
    const f=logicalFixture();assertRowReferences(f.journal,'contract_readiness_package',f.row,f.scope,f.additional);
    assert.throws(()=>assertRowReferences(f.journal,'attachment_link',{id:f.row.id,target_type:'project',target_id:f.logicalId},f.scope,f.additional),/unregistered_uuid_reference/);
    assert.throws(()=>assertRowReferences(f.journal,'contract_readiness_package',{...f.row,other_json:{id:f.logicalId}},f.scope,f.additional),/unregistered_uuid_reference/);
});
test('rolled-back, absent and unknown plans grant no logical reference authority', () => {
    for(const state of ['rolled-back','absent','outcome-unknown','executing']){const f=logicalFixture(state);assert.throws(()=>assertRowReferences(f.journal,'contract_readiness_package',f.row,f.scope,f.additional),/unregistered_uuid_reference/)}
    const f=logicalFixture('executing');assertRowReferences(f.journal,'contract_readiness_package',f.row,f.scope,f.additional,{preparedSourcePlanId:f.planId,transaction:'100'});
});
