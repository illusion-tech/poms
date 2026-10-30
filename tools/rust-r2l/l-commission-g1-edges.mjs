// SOURCE-only until Root runs a reviewed, captured epoch. No product changes.
// Uses the same original producers/owned facts as the default114 driver; only
// the existing four L operations select the consumer backend.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { toBusinessDateString } from '../../apps/poms-api/src/app/core/date/business-date.utils.ts';
import { digest } from './fixture-core.mjs';
import { runCommissionConsumersActual, commissionBuildBinding } from './l-commission-http-actual.mjs';
import { withSnapshotSqlBarrier } from './l-snapshot-sql-barrier.mjs';
import { admitNativeSnapshotWaiters, admitRustSnapshotWaiters } from './l-snapshot-waiter-admission.mjs';
import { startPgBackendIdentityObserver } from './l-pg-backend-identity.mjs';

const require = createRequire(import.meta.url);
const SOURCE = 'tools/rust-r2l/l-commission-g1-edges.mjs';
const DRIVER = 'tools/rust-r2l/l-commission-http-actual.mjs';
const ROOT = '/home/wangzishi/projects/poms-rust-r2l';
const PRIVATE = '/home/wangzishi/.local/share/poms-r2l/private';
const FINANCE = '00000000-0000-4000-8000-000000000014';
const sha = value => createHash('sha256').update(value).digest('hex');
const commonAndDomain = ['approval_record', 'todo_item', 'commission_payout',
    'commission_final_settlement_snapshot', 'commission_rule_explanation_snapshot'];
const sourceReferences = Object.freeze({
    finalGate: 'apps/poms-api/src/app/features/approval/approval.service.ts:681-703,1098-1110',
    retentionSubmit: 'apps/poms-api/src/app/features/approval/approval.service.ts:749-854',
    retentionApprove: 'apps/poms-api/src/app/features/approval/approval.service.ts:855-977',
    businessDate: 'apps/poms-api/src/app/core/date/business-date.utils.ts:1-32',
    gateBindingPhysicalCheck: 'apps/poms-api/src/app/features/project-cost/operating-signal-gate-binding.entity.ts:43-47',
    gateReviewFreeString: 'apps/poms-api/src/app/features/project-cost/commission-gate-review-record.entity.ts:26',
    originalProducer: 'tools/rust-r2l/l-commission-native-calibration.mjs@e660f97c',
});

export const commissionG1EdgePlan = Object.freeze({
    kind: 'source-only-commission-G1-edge-plan', sources: sourceReferences,
    scenarios: {
        'final-gate': 'Binding block; review decision exact/mixed-case block-prefix; final permits review/review-prefix.',
        'retention-gate': 'Binding review/block and review/block decision-prefix veto; restored prompt/allow permits approval.',
        'retention-date': 'Actual frozen term snapshot missing/tomorrow-HK/today-HK; no wall-clock or service-clock override.',
        'retention-approve-nonret': 'After actual submit, owned current FSS non-retention status becomes pending; approve does not repeat submit guard.',
        'retention-approve-payout-status': 'Actual pending approval with owned payout changed to draft; approve does not validate payout status.',
        'retention-approve-confirmation': 'Owned prepared confirmation changed to pending; approve does not read ConfirmationRecord.',
        'retention-approve-summary': 'Current FSS points to another owned same-project summary; approve does not repeat submit summary equality.',
        'retention-approve-gate-record': 'A second actual Native gate review becomes latest; approve does not require old FSS gate-review equality.',
        'initial-current-race': 'Two real pending final payouts for different calculations; both actual FSS INSERTs blocked before release.',
        'replacement-current-race': 'Two real pending final payouts; both actual owned old-current FSS UPDATEs blocked before release.',
        'late-initial': 'Rule table SHARE lock; cancel the one hard-bound actual Rule INSERT after earlier work.',
        'late-replacement': 'Owned old Rule row lock; cancel the one hard-bound actual Rule UPDATE after second-flush FSS INSERT.',
    },
    fixturePreconditions: 'Only fresh owned rows may be changed by fixture.updateOwned. Seed finance14/VP8/definitions are readonly.',
    concurrency: 'Two independent finance sessions, one case, one PG begin before locker, one drain/certify; no concurrent normal call.',
    authBoundary: 'Due auth raw guard touch can survive outside the business transaction. Record its actual delta separately.',
    cancellation: 'Actual pg_cancel_backend of a hard-bound owned waiting statement; not a network-failure simulation.',
    runtimeStatus: 'Pending Root actual execution and cross-backend strict comparison.',
    notCovered: ['all R3-R5 producers', 'every original DTO/permission/error vector', 'arbitrary dirty same-metadata caller-owned UoW',
        'freeze-version mismatch countercondition without a separately reviewed actual second frozen-assignment producer'],
    G3Certified: false, G4Certified: false,
});

export function nextBusinessDate(key) {
    assert(/^\d{4}-\d{2}-\d{2}$/.test(key));
    const [year, month, day] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}
function unchangedBusinessRows(before, after) {
    for (const table of commonAndDomain) assert.deepEqual(after[table], before[table], 'Business transaction must roll back full owned rows: ' + table);
    return Object.fromEntries(commonAndDomain.map(table => [table, { before: digest(before[table]), after: digest(after[table]), equal: true }]));
}
function authDelta(before, after) {
    const rows = new Map((before.auth_session ?? []).map(row => [row.id, row]));
    return (after.auth_session ?? []).filter(row => digest(row) !== digest(rows.get(row.id) ?? null)).map(row => ({
        id: row.id, userId: row.user_id, beforeVersion: rows.get(row.id)?.row_version, afterVersion: row.row_version,
        beforeLastSeenAt: rows.get(row.id)?.last_seen_at, afterLastSeenAt: row.last_seen_at,
        beforeUpdatedAt: rows.get(row.id)?.updated_at, afterUpdatedAt: row.updated_at,
    }));
}
async function currentPair(ctx, all = null) {
    all ??= await ctx.facts();
    const finals = all.commission_final_settlement_snapshot.filter(row => row.project_id === ctx.project.id && row.is_current);
    const rules = all.commission_rule_explanation_snapshot.filter(row => row.project_id === ctx.project.id && row.is_current);
    assert.equal(finals.length, 1); assert.equal(rules.length, 1);
    assert.equal(finals[0].status, 'active'); assert.equal(rules[0].status, 'active');
    assert.equal(rules[0].final_settlement_snapshot_id, finals[0].id); return { final: finals[0], rule: rules[0] };
}
async function approve(ctx, name, expectedStatus, { snapshots = expectedStatus === 200 } = {}) {
    const stored = await ctx.ownedRow('approval_record', ctx.approval.id);
    assert.equal(stored.current_status, 'pending');
    const spec = ctx.recipe.approvalRequests({ id: stored.id, rowVersion: stored.row_version }, {
        targetType: 'commission-payout', payoutStage: ctx.stage, comment: 'L G1 edge ' + name,
    }).approve;
    const result = await ctx.send(ctx.decisionSession, name, spec, expectedStatus, ctx.snapshotWatch(FINANCE), { shadow: true, snapshots });
    const record = ctx.report.requests.at(-1);
    if (expectedStatus !== 200) {
        assert.equal((await ctx.ownedRow('approval_record', stored.id)).current_status, 'pending');
        unchangedBusinessRows(record.before, record.after);
    } else {
        assert.equal(result.targetId, ctx.payout.id); assert.equal(result.resultStatus, 'approved');
        assert.equal((await ctx.ownedRow('approval_record', stored.id)).current_status, 'approved');
    }
    return result;
}
async function change(ctx, table, id, values, reason) {
    return ctx.f.updateOwned(table, id, values, 'SOURCE-bound G1 edge owned fixture: ' + reason);
}
async function gateHook(ctx, retention) {
    const binding = await ctx.ownedRow('operating_signal_gate_binding', ctx.prepared.gateBindingId);
    const review = await ctx.ownedRow('commission_gate_review_record', ctx.gateReview.gateReviewRecordId);
    const attempts = [], prefix = retention ? 'edge.retention-gate' : 'edge.final-gate';
    const expectedMessage = `CommissionPayout ${ctx.payout.id} is blocked by the current final commission gate review`;
    // Physical binding_action CHECK admits prompt/review/block only. Mixed case
    // and prefixes belong in the original free-string review decision column.
    for (const action of retention ? ['review', 'block'] : ['block']) {
        await change(ctx, 'operating_signal_gate_binding', binding.id, { binding_action: action }, prefix + ' valid enum ' + action);
        const result = await approve(ctx, prefix + '.binding-' + action, 400); assert.equal(result.message, expectedMessage); attempts.push({ bindingAction: action, status: 400 });
    }
    await change(ctx, 'operating_signal_gate_binding', binding.id, { binding_action: 'prompt' }, prefix + ' restore a valid nonblocking binding');
    for (const [name, decision] of retention
        ? [['review-exact', ' ReViEw '], ['review-prefix', ' ReViEw-finance '], ['block-prefix', ' BlOcK-cash ']]
        : [['block-exact', ' BlOcK '], ['block-prefix', ' BlOcK-cash ']]) {
        await change(ctx, 'commission_gate_review_record', review.id, { gate_review_decision: decision }, prefix + ' free-string trim/lowercase ' + name);
        const result = await approve(ctx, prefix + '.' + name, 400); assert.equal(result.message, expectedMessage); attempts.push({ gateReviewDecision: decision, status: 400 });
    }
    await change(ctx, 'operating_signal_gate_binding', binding.id, { binding_action: retention ? binding.binding_action : 'review' }, prefix + ' positive condition');
    await change(ctx, 'commission_gate_review_record', review.id, { gate_review_decision: retention ? review.gate_review_decision : ' ReViEw-finance ' }, prefix + ' positive decision');
    const result = await approve(ctx, prefix + '.allow', 200), pair = await currentPair(ctx);
    if (retention) assert.equal(pair.final.retention_settlement_status, 'ready-retention');
    return { finish: true, evidence: { source: retention ? sourceReferences.retentionApprove : sourceReferences.finalGate,
        attempts, positiveResult: result, currentPair: pair, rule: 'final blocks block; retention additionally blocks review', G3Certified: false } };
}
async function dateHook(ctx) {
    const assignment = await ctx.ownedRow('commission_role_assignment', ctx.currentAssignment.id);
    assert(assignment.effective_handover_baseline_snapshot_id);
    const term = await ctx.ownedRow('contract_term_snapshot', assignment.effective_handover_baseline_snapshot_id);
    const sampledAt = new Date(), today = toBusinessDateString(sampledAt), tomorrow = nextBusinessDate(today), outcomes = [];
    for (const [name, value] of [['missing', null], ['future', tomorrow]]) {
        await change(ctx, 'contract_term_snapshot', term.id, { retention_due_date: value }, 'HK due-date ' + name);
        const result = await approve(ctx, 'edge.retention-date.' + name, 400);
        assert.equal(result.message, name === 'missing'
            ? `CommissionPayout ${ctx.payout.id} cannot approve retention payout without a current retention due date fact`
            : `CommissionPayout ${ctx.payout.id} cannot approve retention payout before retention due date ${tomorrow}`);
        outcomes.push({ name, value, status: 400, message: result.message });
    }
    // Re-sample before the positive request; never infer an HTTP clock from a
    // user display timezone or replace the service's actual new Date samples.
    const actualToday = toBusinessDateString(new Date());
    await change(ctx, 'contract_term_snapshot', term.id, { retention_due_date: actualToday }, 'actual HK today is due');
    const result = await approve(ctx, 'edge.retention-date.today', 200), pair = await currentPair(ctx);
    assert.equal(pair.final.retention_settlement_status, 'ready-retention');
    return { finish: true, evidence: { source: sourceReferences.businessDate, sampledAt: sampledAt.toISOString(), businessZone: 'Asia/Hong_Kong',
        originalDueDate: term.retention_due_date, outcomes, positiveDate: actualToday, positiveResult: result, currentPair: pair,
        clockWasOverridden: false, displayZoneUsedForBusinessDate: false, G3Certified: false } };
}
async function noSubmitGuardHook(ctx, scenario) {
    const pair = await currentPair(ctx), preconditions = [];
    if (scenario === 'retention-approve-nonret') {
        await change(ctx, 'commission_final_settlement_snapshot', pair.final.id, { non_retention_settlement_status: 'pending-non-retention' }, 'approve lacks submit non-retention-settled guard');
        preconditions.push({ table: 'commission_final_settlement_snapshot', id: pair.final.id, field: 'non_retention_settlement_status', value: 'pending-non-retention' });
    } else if (scenario === 'retention-approve-payout-status') {
        await change(ctx, 'commission_payout', ctx.payout.id, { status: 'draft' }, 'existing pending approval; approve has no payout-status assertion');
        preconditions.push({ table: 'commission_payout', id: ctx.payout.id, field: 'status', value: 'draft' });
    } else if (scenario === 'retention-approve-confirmation') {
        const rows = (await ctx.facts()).confirmation_record.filter(row => row.project_id === ctx.project.id);
        assert.equal(rows.length, 1);
        await change(ctx, 'confirmation_record', rows[0].id, { status: 'pending', confirmed_count: 0, confirmed_at: null }, 'prepared confirmation not queried by approval ready context');
        preconditions.push({ table: 'confirmation_record', id: rows[0].id, field: 'status', value: 'pending', preparedCountercondition: true });
    } else if (scenario === 'retention-approve-summary') {
        await ctx.ownedRow('approval_summary_snapshot', ctx.prepared.handoverSummarySnapshotId);
        assert.notEqual(pair.final.summary_snapshot_id, ctx.prepared.handoverSummarySnapshotId);
        await change(ctx, 'commission_final_settlement_snapshot', pair.final.id, { summary_snapshot_id: ctx.prepared.handoverSummarySnapshotId }, 'same-project owned different summary; ready context does not repeat submit equality');
        preconditions.push({ table: 'commission_final_settlement_snapshot', id: pair.final.id, field: 'summary_snapshot_id', value: ctx.prepared.handoverSummarySnapshotId });
    } else if (scenario === 'retention-approve-gate-record') {
        const binding = await ctx.ownedRow('operating_signal_gate_binding', ctx.prepared.gateBindingId);
        const signal = await ctx.ownedRow('operating_signal_evaluation_result', ctx.prepared.signalEvaluationId);
        // The original producer refuses an already resolved prompt binding.
        // Prepare only this owned mutable action; the new review itself must
        // still be created and committed by the actual original producer.
        const reviewable = await change(ctx, 'operating_signal_gate_binding', binding.id, { binding_action: 'review' },
            'prepared reviewable condition for original assertGateBindingReviewable; not a business-producer claim');
        assert.equal(reviewable.row_version, binding.row_version);
        preconditions.push({ fixturePreparation: true, table: 'operating_signal_gate_binding', id: binding.id,
            field: 'binding_action', before: binding.binding_action, value: 'review', productSource: 'ProjectCostService.assertGateBindingReviewable' });
        const spec = ctx.recipe.operatingReviewRequests(ctx.prepared, { signalVersion: signal.row_version, bindingVersion: binding.row_version,
            reviewComment: 'L edge actual second gate review' }).gate;
        const result = await ctx.send(ctx.sessions.admin, 'edge.second-native-gate-review', spec, 200,
            [['commission_gate_review_record', { binding_id: binding.id }]]);
        await ctx.ownedRow('commission_gate_review_record', result.gateReviewRecordId);
        assert.notEqual(result.gateReviewRecordId, pair.final.gate_review_record_id);
        assert.equal((await ctx.ownedRow('operating_signal_gate_binding', binding.id)).binding_action, 'prompt');
        preconditions.push({ actualNativeProducer: spec.path, oldSnapshotGateReviewId: pair.final.gate_review_record_id, latestGateReviewId: result.gateReviewRecordId });
    } else assert.fail('Unknown no-submit-guard scenario');
    const result = await approve(ctx, 'edge.' + scenario, 200), after = await currentPair(ctx);
    assert.equal(after.final.retention_settlement_status, 'ready-retention');
    return { finish: true, evidence: { source: sourceReferences.retentionApprove, submitSource: sourceReferences.retentionSubmit,
        preconditions, positiveResult: result, currentPair: after,
        submitHttpCounterexampleClaimed: false, boundary: 'Actual approval under the named post-submit countercondition; no synthetic submit response or new product guard.', G3Certified: false } };
}
async function independentFinance(ctx, name) {
    const session = await ctx.login(name, FINANCE, { username: 'finance_mgr', password: 'finance_mgr123' });
    await ctx.due(session); return session;
}
async function pendingRequest(ctx, payoutId, session) {
    const record = await ctx.approvalFor('commission-payout', payoutId, 'edge.pending-' + payoutId);
    const current = await ctx.ownedRow('approval_record', record.id);
    return { session, method: 'POST', route: `/api/approval-records/${record.id}:approve`,
        options: { json: { expectedVersion: current.row_version, comment: 'L actual snapshot barrier' } } };
}
async function barrierHook(ctx, scenario, admitWaiters) {
    assert.equal(typeof ctx.captureRequests, 'function', 'Apply the separately reviewed shared-case integration patch before any barrier epoch');
    assert.equal(typeof admitWaiters, 'function', 'Root hard-PID admission is mandatory');
    const race = scenario.endsWith('-race'), replacement = scenario.startsWith('replacement-') || scenario === 'late-replacement';
    const current = replacement ? await currentPair(ctx) : null;
    if (!replacement) {
        const before = await ctx.facts();
        assert.equal(before.commission_final_settlement_snapshot.filter(row => row.project_id === ctx.project.id && row.is_current).length, 0);
        assert.equal(before.commission_rule_explanation_snapshot.filter(row => row.project_id === ctx.project.id && row.is_current).length, 0);
    }
    const financeA = await independentFinance(ctx, 'edge.finance-a'), requests = [await pendingRequest(ctx, ctx.payout.id, financeA)];
    if (race) {
        const calculation = await ctx.createCalculation(ctx.activeRule, 'edge.fresh-calculation');
        const second = await ctx.createPayout(calculation, 'final', 'edge.fresh-final', '2400.00');
        await ctx.submitPayout(second, 'edge.fresh-final-submit');
        const financeB = await independentFinance(ctx, 'edge.finance-b'); assert.notEqual(financeA, financeB);
        const secondRequest = await pendingRequest(ctx, second.id, financeB); assert.notEqual(secondRequest.route, requests[0].route); requests.push(secondRequest);
        const original = await ctx.ownedRow('commission_payout', ctx.payout.id), other = await ctx.ownedRow('commission_payout', second.id);
        assert.notEqual(original.calculation_id, other.calculation_id, 'Two source-produced calculations avoid payout stage uniqueness masking the snapshot race');
    }
    const caseId = 'edge.' + scenario;
    const table = race ? 'commission_final_settlement_snapshot' : 'commission_rule_explanation_snapshot';
    const rowIds = replacement ? [race ? current.final.id : current.rule.id] : null;
    const command = replacement ? 'UPDATE' : 'INSERT';
    const captured = await ctx.captureRequests({ name: caseId, requests, watch: ctx.snapshotWatch(FINANCE),
        run: ({ send, bindings, before, pgCaseOpenedBeforeLocker }) => {
            assert.equal(pgCaseOpenedBeforeLocker, true);
            return withSnapshotSqlBarrier(ctx.f, { caseId, table, rowIds, command, waiters: requests.length,
                action: race ? 'release' : 'cancel', backend: ctx.consumerBackend === 'rust' ? 'rust' : 'nest', send,
                admitWaiters: (waiting, trace) => admitWaiters({ ctx, waiting, trace, bindings, requireFinishedFinalInsert: !race }),
                onBarrier: async trace => { trace.beforeBusinessRowsSha256 = digest(Object.fromEntries(commonAndDomain.map(name => [name, before[name]])));
                    trace.sharedCaseOnly = true; trace.requestCount = requests.length; ctx.f.save(); },
            });
        },
    });
    const evidence = { scenario, caseId, statuses: captured.responses.map(response => response.status), trace: captured.trace,
        snapshotCounts: captured.snapshotCounts, authDelta: authDelta(captured.before, captured.after),
        nativeSqlOnly: true, RustSqlStatementTraceClaimed: false, callerToIndividualRustPidClaimed: false, G3Certified: false };
    if (!race) {
        assert.equal(captured.responses[0].status, 500);
        evidence.businessRollback = unchangedBusinessRows(captured.before, captured.after);
        evidence.authBoundary = 'Actual raw guard touch is measured separately; no assertion that auth/session facts are unchanged.';
        assert.equal(captured.snapshotCounts.commission_final_settlement_snapshot, 0);
        assert.equal(captured.snapshotCounts.commission_rule_explanation_snapshot, 0);
    } else {
        evidence.currentPair = await currentPair(ctx, captured.after);
        evidence.outcome = 'Actual outcomes retained; Native/Rust status and complete fact equality are separate Root/B checks.';
        assert(captured.responses.some(response => response.status === 200));
    }
    return { finish: true, evidence };
}

export function createCommissionG1EdgeHooks({ scenario, admitWaiters }) {
    assert(Object.hasOwn(commissionG1EdgePlan.scenarios, scenario));
    if (scenario === 'final-gate') return { beforeInitialFinal: ctx => gateHook(ctx, false) };
    if (scenario === 'retention-gate') return { beforeRetentionApprove: ctx => gateHook(ctx, true) };
    if (scenario === 'retention-date') return { beforeRetentionApprove: dateHook };
    if (scenario.startsWith('retention-approve-')) return { beforeRetentionApprove: ctx => noSubmitGuardHook(ctx, scenario) };
    const phase = scenario === 'replacement-current-race' || scenario === 'late-replacement' ? 'beforeReplacementFinal' : 'beforeInitialFinal';
    return { [phase]: ctx => barrierHook(ctx, scenario, admitWaiters) };
}

export async function runCommissionG1Edges({ tag, backend, scenario, buildTag = 'candidate06' }) {
    assert.equal(process.platform, 'linux'); assert.equal(process.cwd(), ROOT);
    assert(/^[a-z0-9-]{1,24}$/.test(tag) && ['nest', 'rust'].includes(backend));
    assert(Object.hasOwn(commissionG1EdgePlan.scenarios, scenario));
    const usesBarrier = scenario.includes('race') || scenario.startsWith('late-');
    if (usesBarrier) assert(fs.readFileSync(DRIVER, 'utf8').includes('createCommissionRequestCapture'), 'Capture integration is a separately pinned edge epoch');
    const output = `tmp/rust-r2l/commission-g1-edges-${backend}-${tag}.json`; assert(!fs.existsSync(output));
    const report = { kind: 'actual-commission-G1-edge-owner-companion', result: 'pending', tag, backend, scenario,
        startedAt: new Date().toISOString(), source: { file: SOURCE, sha256: sha(fs.readFileSync(SOURCE)) },
        driver: { file: DRIVER, sha256: sha(fs.readFileSync(DRIVER)) }, plan: commissionG1EdgePlan, G3Certified: false, G4Certified: false };
    let observer;
    try {
        const binding = backend === 'rust' ? commissionBuildBinding(buildTag) : null;
        if (usesBarrier && backend === 'rust') observer = await startPgBackendIdentityObserver({ tag: 'cme-' + tag, buildTag });
        const hooks = createCommissionG1EdgeHooks({ scenario, admitWaiters: async ({ ctx, waiting, trace, requireFinishedFinalInsert }) => {
            if (backend === 'nest') return admitNativeSnapshotWaiters({ native: ctx.native, runId: ctx.runId, caseId: trace.caseId, waiting, trace, requireFinishedFinalInsert });
            assert(observer); return admitRustSnapshotWaiters({ observer, runtimeReport: ctx.rustRuntime.report, runId: ctx.runId, caseId: trace.caseId, waiting, trace });
        } });
        const actual = await runCommissionConsumersActual({ tag, backend, consumerBackend: backend === 'rust' ? 'rust' : 'native',
            buildBinding: binding, expectedBinarySha256: binding?.expectedBinarySha256, hooks, hookSource: report.source });
        report.consumerReport = { file: `tmp/rust-r2l/commission-http-${backend}-${tag}.json`, result: actual.result,
            rawBytesSha256: sha(fs.readFileSync(`tmp/rust-r2l/commission-http-${backend}-${tag}.json`)), requestCount: actual.requests.length,
            doubleZero: actual.doubleZero, resourceCloseout: actual.resourceCloseout };
        assert.equal(actual.result, 'edges-observed'); assert.equal(actual.doubleZero, true);
        assert(actual.resourceCloseout.every(row => row.result === 'pass')); report.result = 'observed';
    } catch (error) { report.result = 'partial'; report.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
    finally {
        if (observer) {
            try { await observer.close(); report.passiveIdentityObserver = observer.report; }
            catch (error) { report.result = 'partial'; report.observerCloseoutFailure = { name: error.name, message: error.message }; process.exitCode = 1; }
        }
        report.finishedAt = new Date().toISOString(); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
        console.log(JSON.stringify({ result: report.result, file: output, scenario, backend, G3Certified: false }));
    }
    return report;
}
async function owner(tag, backend, scenario, buildTag = 'candidate06') {
    assert.equal(process.platform, 'linux'); assert.equal(process.cwd(), ROOT);
    assert(/^[a-z0-9-]{1,24}$/.test(tag ?? '') && ['nest', 'rust'].includes(backend));
    assert(Object.hasOwn(commissionG1EdgePlan.scenarios, scenario) && /^candidate[0-9]{2}$/.test(buildTag));
    const directory = PRIVATE + '/execution-logs';
    const stat = fs.lstatSync(directory); assert(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0);
    const log = `${directory}/commission-g1-edges-${backend}-${tag}.log`, output = `tmp/rust-r2l/commission-g1-edges-${backend}-${tag}-owner.json`;
    assert(!fs.existsSync(log) && !fs.existsSync(output));
    const runtime = require('../e2e/runtime.cjs'), report = { result: 'pending', tag, backend, scenario, timeoutMs: 300000, privateStdoutExported: false };
    try {
        for (const port of [9700, 9701]) await runtime.assertPortAvailable(runtime.resolveTarget({ mode: 'external', baseUrl: 'http://127.0.0.1:' + port }));
        const env = Object.fromEntries(['PATH', 'HOME', 'LANG', 'WSL_INTEROP', 'WSLENV'].filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
        env.LANG ??= 'C.UTF-8';
        const result = await runtime.runOwnedCommand({ executable: process.execPath, args: [SOURCE, tag, backend, scenario, buildTag, '--owner-child'],
            cwd: ROOT, env, logPath: path.resolve(log), timeoutMs: 300000 });
        report.exitCode = result.code; report.result = 'pass';
    } catch (error) { report.result = 'fail'; report.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
    finally {
        if (fs.existsSync(log)) { fs.chmodSync(log, 0o600); report.privateLog = { file: log, bytes: fs.statSync(log).size, sha256: sha(fs.readFileSync(log)), contentsExported: false }; }
        fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(report));
    }
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
    if (process.argv.includes('--check')) {
        assert.equal(toBusinessDateString(new Date('2040-01-01T15:30:00.000Z')), '2040-01-01');
        assert.equal(toBusinessDateString(new Date('2040-01-01T15:30:00.000Z'), 'Asia/Tokyo'), '2040-01-02');
        assert.equal(nextBusinessDate('2040-02-28'), '2040-02-29'); assert.equal(nextBusinessDate('2040-12-31'), '2041-01-01');
        for (const scenario of Object.keys(commissionG1EdgePlan.scenarios)) assert.equal(Object.keys(createCommissionG1EdgeHooks({ scenario })).length, 1);
        console.log(JSON.stringify({ kind: 'pure-commission-G1-edge-source-check', scenarios: Object.keys(commissionG1EdgePlan.scenarios).length,
            SQLExecuted: false, HTTPExecuted: false, NativeStarted: false, PostgreSQLExecuted: false, G3Certified: false }));
    } else if (process.argv.includes('--owner-child')) await runCommissionG1Edges({ tag: process.argv[2], backend: process.argv[3], scenario: process.argv[4], buildTag: process.argv[5] ?? 'candidate06' });
    else await owner(process.argv[2], process.argv[3], process.argv[4], process.argv[5] ?? 'candidate06');
}
