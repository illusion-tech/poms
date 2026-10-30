// The twelve already recorded G1 windows. This module opens no runtime or DB.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const nativeBinary = '0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4';
export const rustBinary = '5b9ec4424e17e4e9bfd57055e6141e80594526dc437fde497ab95bfc2f464b16';
export const snapshotTables = Object.freeze(['commission_final_settlement_snapshot', 'commission_rule_explanation_snapshot']);
export const financeId = '00000000-0000-4000-8000-000000000014';
const epoch01 = { hook: '0781f314501ee70ed44f4aea9d99f468b2cc4f193482dbc500a186a8d5a5a664', driver: '57134763edacec38431b0d583f5f6359c1c422a567ddf2a97c80ea476c89f5e3' };
const epoch03 = { hook: '2ad2031b8416c0b02168b5139cd22495c46e8977287bb26d23f5b07d0c79cdb8', driver: '7d0af42efcaa0a32807d6c57b5ad6ab79553f44cceeb4c172d78c53ca60bc461' };
const row = (code, suffix, scenario, phase, records, owned, hookRequests, source) => Object.freeze({
    scenario, phase, records, owned, hookRequests, direct: 69, generated: owned - 69,
    nest: `eg${code}-n${suffix}`, rust: `eg${code}-r${suffix}`, ...source,
});
export const edgeCases = Object.freeze([
    row('fg', '01', 'final-gate', 'beforeInitialFinal', 83, 102, 4, epoch01),
    row('rg', '01', 'retention-gate', 'beforeRetentionApprove', 113, 125, 6, epoch01),
    row('rd', '01', 'retention-date', 'beforeRetentionApprove', 110, 125, 3, epoch01),
    row('rn', '01', 'retention-approve-nonret', 'beforeRetentionApprove', 108, 125, 1, epoch01),
    row('rp', '01', 'retention-approve-payout-status', 'beforeRetentionApprove', 108, 125, 1, epoch01),
    row('rc', '01', 'retention-approve-confirmation', 'beforeRetentionApprove', 108, 125, 1, epoch01),
    row('rs', '01', 'retention-approve-summary', 'beforeRetentionApprove', 108, 125, 1, epoch01),
    row('rr', '02', 'retention-approve-gate-record', 'beforeRetentionApprove', 109, 126, 2, epoch03),
    row('ic', '03', 'initial-current-race', 'beforeInitialFinal', 93, 108, 14, epoch03),
    row('xc', '03', 'replacement-current-race', 'beforeReplacementFinal', 102, 114, 14, epoch03),
    row('li', '03', 'late-initial', 'beforeInitialFinal', 84, 101, 5, epoch03),
    row('lr', '03', 'late-replacement', 'beforeReplacementFinal', 93, 107, 5, epoch03),
]);
export const failedEpochs = Object.freeze([
    { backend: 'nest', tag: 'egrr-n01', reason: 'Original producer rejected the prepared gate action; partial, not a successful edge window' },
    { backend: 'nest', tag: 'egic-n02', reason: 'Typed pg Date admission lost milliseconds; actual responses were saved but not certified; recovery is cleanup only' },
]);
export function edgePlan(scenario) {
    const result = edgeCases.find(item => item.scenario === scenario);
    assert(result, 'Unknown/unreviewed edge scenario'); return result;
}
export function planForReport(report) {
    assert(['nest', 'rust'].includes(report.backend));
    const plan = edgeCases.find(item => item[report.backend] === report.tag);
    assert(plan, 'Only the twelve exact successful tag pairs are admitted; old partial/recovery epochs remain excluded');
    assert.equal(report.result, 'edges-observed'); assert.equal(report.requests.length, plan.records);
    assert.equal(report.phaseHooks.length, 1); const hook = report.phaseHooks[0];
    assert.equal(hook.name, plan.phase); assert.equal(hook.state, 'observed');
    assert.equal(hook.requestIndex, plan.records - plan.hookRequests);
    assert.equal(report.finishedEdgePhase, plan.phase); assert.equal(report.hookSource.sha256, plan.hook);
    assert.equal(report.runtimeInput.files.find(item => item.source === 'tools/rust-r2l/l-commission-http-actual.mjs')?.rawBytesSha256, plan.driver);
    assert.equal(report.default114Only, false); assert.equal(report.authFreshnessPolicy ?? 'natural', 'natural');
    assert.equal(report.authInputPreparations?.length ?? 0, 0);
    return plan;
}
export function actualUnits(report) {
    const batches = report.captureBatches ?? [], used = new Set(), units = [];
    for (const [sourceIndex, request] of report.requests.entries()) {
        if (!request.captureBatch) { units.push({ ...request, sourceIndex }); continue; }
        const matches = batches.filter(batch => batch.name === request.captureBatch); assert.equal(matches.length, 1);
        const batch = matches[0]; if (used.has(batch.name)) continue; used.add(batch.name);
        const requests = report.requests.filter(item => item.captureBatch === batch.name);
        assert.equal(requests.length, batch.plan.requestCount);
        const httpFinishedAt = requests.map(item => item.httpFinishedAt).sort().at(-1);
        units.push({ ...batch, sourceIndex, httpFinishedAt, requests, method: 'SHARED', path: '', request: {},
            response: { status: null, body: null, parseError: null } });
    }
    assert.equal(used.size, batches.length); return units;
}
export function assertExecutionPartition(backend,unit) {
    assert(['nest','rust'].includes(backend));
    const isL=!!unit.requests||unit.path.startsWith('/api/approval-records/')||unit.path==='/api/me/todos';
    const expected=backend==='rust'&&isL?'rust':'native',c=unit.certificates;
    assert.equal(unit.executionBackend,expected,'Original producer/L operation executed on the wrong backend');
    assert.equal(c.executionBackend,expected);assert.equal(c.sdkComplete,true);
    for(const key of ['sdkCreates','pgCommittedCreates','pgShadow','pg7SdkCreatesWithoutShadow','sdkOnlyGeneratedTables'])assert(Array.isArray(c[key]));
    assert.equal(c.pg7SdkCreatesWithoutShadow.length,0,'A preplanned PG shadow failed to match an original SDK birth');
    if(expected==='native') {
        assert(/^[0-9a-f-]{36}$/.test(c.sdkAuthorityId));assert.equal(c.pgUsedAsOwnershipAuthority,false);assert.equal(c.pgCommittedCreates.length,0);
        for(const row of c.pgShadow)assert(c.sdkCreates.some(item=>item.table===row.table&&item.id===row.id),'PG shadow cannot replace original Native SDK ownership');
    } else {
        assert.equal(c.sdkAuthorityId,null);assert.equal(c.sdkCreates.length,0);assert.equal(c.pgUsedAsOwnershipAuthority,true);assert.equal(c.pgShadowDeclared,false);assert.equal(c.pgShadow.length,0);assert.equal(c.sdkOnlyGeneratedTables.length,0);
    }
    return expected;
}
export function assertNativeSdkOnlyDepartureSnapshots(unit) {
    const route=/^\/api\/projects\/([0-9a-f-]{36})\/commission-departure-exception-decisions$/.exec(unit.path),c=unit.certificates;
    assert(unit.name==='producer.departure-create'&&unit.method==='POST'&&route&&unit.executionBackend==='native'&&unit.response.status===201,'Only the exact original Native departure producer has this source-declared SDK-only snapshot provenance');
    assert.equal(c.pgShadowDeclared,false);assert.equal(c.pgShadow.length,0);assert.equal(c.pgCommittedCreates.length,0);assert.equal(c.pgUsedAsOwnershipAuthority,false);
    assert.deepEqual(c.sdkCreates.map(x=>x.table).sort(),['commission_departure_exception_decision',...snapshotTables].sort());
    const created=Object.fromEntries(c.sdkCreates.map(item=>{assert(!unit.before[item.table].some(row=>row.id===item.id));const rows=unit.after[item.table].filter(row=>row.id===item.id);assert.equal(rows.length,1);return[item.table,rows[0]];}));
    const departure=created.commission_departure_exception_decision,fss=created[snapshotTables[0]],rule=created[snapshotTables[1]];
    assert.deepEqual(c.sdkOnlyGeneratedTables,[{table:'commission_departure_exception_decision',id:departure.id}]);
    assert([departure,fss,rule].every(row=>row.project_id===route[1]));assert.equal(unit.response.body.id,departure.id);assert.equal(unit.response.body.projectId,route[1]);assert.equal(rule.final_settlement_snapshot_id,fss.id);
    return {caseId:unit.name,projectId:route[1],departureId:departure.id,snapshots:snapshotTables.map(table=>({table,id:created[table].id})),
        sourceRule:'Original producer creates non-PG7 departure parent plus both snapshots in one original SDK outer commit; SDK alone owns these producer rows. Every actual L decision snapshot retains its declared independent PG7 evidence.',PGShadowOrOwnershipClaimed:false};
}
