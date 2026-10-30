// SOURCE-only G1 countercondition. Root runs through the existing bounded owner
// and original producer/SDK/PG/HTTP/private-evidence lifecycle; no I/O on import.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { runCommissionConsumersActual, commissionBuildBinding } from './l-commission-http-actual.mjs';

const SOURCE = 'tools/rust-r2l/l-retention-freeze-gap.mjs';
const FINANCE = '00000000-0000-4000-8000-000000000014';
const sha = value => createHash('sha256').update(value).digest('hex');
const pairTables = ['commission_final_settlement_snapshot', 'commission_rule_explanation_snapshot'];
const businessTables = ['approval_record', 'todo_item', 'commission_payout', ...pairTables];

export const retentionFreezeGapPlan = Object.freeze({
    kind: 'source-only-original-second-freeze-and-retention-consumer-countercondition',
    requiredBy: 'docs/design/rust-r2l-lookup-baseline.md section9; l-source-input.md section6 and matrix original-no-checks',
    currentEvidence: 'Native/Rust114 retention.approve before-current FSS.freeze_version_id equals the actual current frozen role; no mismatch was exercised.',
    producerSources: [
        'apps/poms-api/src/app/features/commission/commission.service.ts:createRoleAssignment260-302',
        'apps/poms-api/src/app/features/commission/commission.service.ts:freezeCommissionRoleAssignment304-366',
        'apps/poms-api/src/app/features/commission/commission.service.ts:createDepartureExceptionDecision574-701',
    ],
    originalBranch: 'A new departure decision rewrites current FSS only when its freeze_version_id already equals the new decision freeze. Here it deliberately does not.',
    minimalOwnedCountercondition: 'Update only the old-current FSS departure_exception_decision_id to the actual newly created/current departure for the new frozen role. Preserve old FSS.freeze_version_id.',
    purpose: 'Prevent the original departure-current/freeze guard from masking the absent FSS/current-freeze equality check.',
    preparationIsNativeProducer: false, nonLProducersAreOriginalNativeOnly: true,
    runtimeStatus: 'Pending Root actual execution; no self-certified equality/G3/G4.',
});

async function currentPair(ctx) {
    const facts = await ctx.facts();
    const finals = facts.commission_final_settlement_snapshot.filter(row => row.project_id === ctx.project.id && row.is_current);
    const rules = facts.commission_rule_explanation_snapshot.filter(row => row.project_id === ctx.project.id && row.is_current);
    assert.equal(finals.length, 1); assert.equal(rules.length, 1);
    assert.equal(rules[0].final_settlement_snapshot_id, finals[0].id);
    return { final: finals[0], rule: rules[0], facts };
}
async function approval(ctx, name, status) {
    const record = await ctx.ownedRow('approval_record', ctx.approval.id); assert.equal(record.current_status, 'pending');
    const request = ctx.recipe.approvalRequests({ id: record.id, rowVersion: record.row_version }, {
        targetType: 'commission-payout', payoutStage: 'retention', comment: 'L G1 actual second freeze countercondition',
    }).approve;
    return ctx.send(ctx.decisionSession, name, request, status, ctx.snapshotWatch(FINANCE), { shadow: true, snapshots: status === 200 });
}

export function createRetentionFreezeMismatchHooks() {
    return { beforeRetentionApprove: async ctx => {
        const before = await currentPair(ctx), originalFreeze = await ctx.ownedRow('commission_role_assignment', ctx.currentAssignment.id);
        assert.equal(before.final.freeze_version_id, originalFreeze.id);
        assert.equal(originalFreeze.status, 'frozen'); assert.equal(originalFreeze.is_current, true);
        assert.equal(before.final.final_settlement_status, 'pending-retention-settlement');
        assert.equal(before.final.retention_settlement_status, 'ready-retention');
        const originalDepartureId = before.final.departure_exception_decision_id; assert(originalDepartureId);
        const assignment = await ctx.send(ctx.sessions.admin, 'freeze-gap.producer.role-create',
            ctx.recipe.roleAssignmentRequest(ctx.project, ctx.sessions.admin.profile), 201,
            [['commission_role_assignment', { project_id: ctx.project.id }]]);
        await ctx.ownedRow('commission_role_assignment', assignment.id);
        const frozen = await ctx.send(ctx.sessions.admin, 'freeze-gap.producer.role-freeze',
            ctx.recipe.freezeAssignmentRequest(assignment, ctx.prepared), 200);
        assert.equal(frozen.targetId, assignment.id); assert.notEqual(frozen.targetId, originalFreeze.id);
        // Freeze result is a command/evidence DTO, so obtain the version from
        // the real current GET and the independently owned row, never View.id.
        const current = await ctx.send(ctx.sessions.admin, 'freeze-gap.producer.role-current', {
            method: 'GET', path: `/projects/${ctx.project.id}/commission-role-assignment`,
        }, 200);
        assert.equal(current.id, assignment.id); assert.equal(current.status, 'frozen');
        const newFreeze = await ctx.ownedRow('commission_role_assignment', current.id);
        const oldFreeze = await ctx.ownedRow('commission_role_assignment', originalFreeze.id);
        assert.equal(newFreeze.is_current, true); assert.equal(newFreeze.status, 'frozen');
        assert.equal(newFreeze.version, originalFreeze.version + 1); assert.equal(newFreeze.supersedes_id, originalFreeze.id);
        assert.equal(oldFreeze.is_current, false); assert.equal(oldFreeze.status, 'superseded');

        const beforeDeparture = await ctx.facts();
        const departure = await ctx.send(ctx.sessions.admin, 'freeze-gap.producer.departure',
            ctx.recipe.departureRequest(ctx.project, frozen, ctx.prepared, {
                departureScenarioCode: 'employee-left-company', decisionCode: 'allow-retention-with-successor',
                decisionSummary: 'G1 actual new-freeze departure', confirmationRequirementSummary: null,
            }), 201, [['commission_departure_exception_decision', { project_id: ctx.project.id, freeze_version_id: newFreeze.id }],
                ...ctx.snapshotWatch(ctx.f.actors.admin)]);
        const newDeparture = await ctx.ownedRow('commission_departure_exception_decision', departure.id);
        assert.equal(newDeparture.freeze_version_id, newFreeze.id); assert.equal(newDeparture.is_current, true); assert.equal(newDeparture.status, 'active');
        const afterDeparture = await ctx.facts();
        for (const table of pairTables) assert.deepEqual(afterDeparture[table], beforeDeparture[table],
            'Original departure branch must not rewrite snapshots whose freeze still names the old role');

        const masked = await approval(ctx, 'freeze-gap.approve-before-countercondition', 400);
        assert.equal(masked.message, `Current departure / exception decision ${originalDepartureId} is invalid for project ${ctx.project.id}`);
        const failed = ctx.report.requests.at(-1);
        for (const table of businessTables) assert.deepEqual(failed.after[table], failed.before[table]);
        await ctx.f.updateOwned('commission_final_settlement_snapshot', before.final.id, {
            departure_exception_decision_id: newDeparture.id,
        }, 'G1 named owned countercondition: keep old FSS.freeze but satisfy independent current-departure/new-freeze guard with actual original producer ID');
        const countercondition = await ctx.ownedRow('commission_final_settlement_snapshot', before.final.id);
        assert.equal(countercondition.freeze_version_id, originalFreeze.id); assert.notEqual(countercondition.freeze_version_id, newFreeze.id);
        assert.equal(countercondition.departure_exception_decision_id, newDeparture.id);
        await ctx.due(ctx.decisionSession);
        const result = await approval(ctx, 'freeze-gap.approve-mismatched-current-freeze', 200), after = await currentPair(ctx);
        assert.equal(result.snapshotId, after.final.id);
        assert.equal(after.final.freeze_version_id, newFreeze.id); assert.equal(after.final.departure_exception_decision_id, newDeparture.id);
        assert.equal(after.final.supersedes_id, before.final.id); assert.equal(after.final.version, before.final.version + 1);
        assert.equal(after.rule.supersedes_id, before.rule.id); assert.equal(after.rule.version, before.rule.version + 1);
        assert.equal(after.final.retention_settlement_status, 'ready-retention');
        return { finish: true, evidence: { plan: retentionFreezeGapPlan, originalFreeze, newFreeze, oldFreezeAfterProducer: oldFreeze,
            newDeparture, countercondition, maskingGuardStatus: 400, approvalResult: result,
            currentPair: { final: after.final, rule: after.rule },
            boundary: 'Actual second frozen assignment/departure producers plus one explicitly prepared owned reference; no fabricated new producer or modified fixed approver.',
            G3Certified: false, G4Certified: false } };
    } };
}

// Root may call this from its bounded owner. It shares all original114 private
// raw bytes, SDK/PG certification, catalog, exact cleanup and closeout logic.
export async function runRetentionFreezeMismatchActual({ tag, backend, buildTag = 'candidate06' }) {
    assert(['nest', 'rust'].includes(backend));
    const binding = backend === 'rust' ? commissionBuildBinding(buildTag) : null;
    return runCommissionConsumersActual({ tag, backend, consumerBackend: backend === 'rust' ? 'rust' : 'native',
        buildBinding: binding, expectedBinarySha256: binding?.expectedBinarySha256,
        hooks: createRetentionFreezeMismatchHooks(), hookSource: { file: SOURCE, sha256: sha(fs.readFileSync(SOURCE)) } });
}
