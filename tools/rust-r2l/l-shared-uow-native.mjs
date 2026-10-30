// SOURCE-only consumer of Root's original-app SDK port. No application, ORM,
// pool, HTTP endpoint or database connection is created by this module.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { sharedUowMeasurementContract } from './l-shared-uow-measurements.mjs';
const require = createRequire(import.meta.url);
const { wrap } = require('@mikro-orm/core');
const uuid = value => { assert(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)); return value.toLowerCase(); };

export const sharedUowGapPlan = Object.freeze({
    kind: 'source-only-original-positive-L-domain-in-caller-owned-UoW',
    requiredBy: 'docs/design/rust-r2l-lookup-baseline.md section9: outer rollback, failure and parent memory; l-source-input.md sections9/12',
    oldL1Boundary: 'Old seven-table unsupported-only Native adapter/probe cannot certify the current positive OriginalApprovalDomain or domain middle flushes.',
    rows: 'Two different actual owned TodoItem rows; TodoB.summary is dirtied in the parent before actual approve mutates TodoA in its nested child.',
    variants: ['success/outer-commit', 'success/outer-rollback', 'gate-failure/outer-rollback', 'gate-failure/caller-continues-and-outer-commit'],
    SQL: 'Capture actual Native grouping/RETURNING/savepoint SQL; do not preset batching, SQL count, clock equivalence or ideal atomicity.',
    memory: 'Observe held scalar properties, managed/original snapshots, cached reread and post-clear reread independently. Caller rollback need not rewind held objects.',
    creation: 'Preintent and PG begin must precede this SDK scope. Only an actual outer COMMIT may issue a creation certificate; released savepoints are not sufficient.',
    auth: 'Internal service entry does not run HTTP guards; request-auth coflush is already a separate HTTP114/edge witness.',
    runner: 'Root bounded owner, real app DI provider + same original RequestContext/em/ALS, full facts and private bytes; no product test API.',
    result: 'Pending actual execution and source-bound Rust example build.',
});
function encode(value) {
    if (value === undefined) return { kind: 'undefined' };
    if (Object.prototype.toString.call(value) === '[object Date]') return { kind: 'date', value: value.toISOString() };
    if (Array.isArray(value)) return { kind: 'array', value: value.map(encode) };
    if (value && typeof value === 'object') return { kind: 'object', value: Object.fromEntries(Object.keys(value).sort().map(key => [key, encode(value[key])])) };
    return { kind: value === null ? 'null' : typeof value, value };
}
function failure(error) {
    return { name: error.name, message: error.message, status: typeof error.getStatus === 'function' ? error.getStatus() : null,
        response: typeof error.getResponse === 'function' ? encode(error.getResponse()) : null };
}

// Root must durably save this returned full observation privately before any
// public classification. Original SDK errors/snapshots are not HTTP DTOs.
export async function runNativeSharedUow({ fixture: f, native, context, approvalId, dirtyTodoId, actorId,
    dirtySummary, outer = 'rollback', continueAfterServiceError = false, onStage = async () => undefined }) {
    // Reject this combination before context registration, em.begin or any
    // product/fixture write. Native SDK internal-UoW certificates are Nest-only.
    assert.equal(f.backend, 'nest', 'Original SDK internal-UoW calibration requires the Nest fixture/database');
    assert.equal(f.j.backend, 'nest');
    assert.equal(native.report().databaseBackend, 'nest', 'Original SDK internal-UoW provider must actually use the Nest database before context admission');
    assert.equal(typeof native?.withOriginalSdkScope, 'function'); assert.equal(typeof native?.admitOriginalSdkContext, 'function');
    assert.equal(typeof onStage, 'function');
    assert.equal(native.report().internalSdkPort?.kind, 'actual-original-Nest-provider-and-MikroORM-RequestContext');
    assert.equal(native.report().internalSdkPort.publicHttpApiAdded, false);
    assert.equal(f.j.namespace, 'poms-r2l'); assert.equal(f.j.marker, '04aadee8-4ec6-4a3b-9d27-ee8d51721029');
    assert(context?.runId === f.runId && context.op === 'l.internal-uow');
    assert(['commit', 'rollback'].includes(outer) && typeof continueAfterServiceError === 'boolean');
    assert(typeof dirtySummary === 'string' && dirtySummary.length <= 500);
    const scope = f.scope(context.caseId); assert([...scope.actors, ...scope.borrowedActors].includes(uuid(actorId)));
    const owns = (table, id) => assert(f.j.objects.some(item => item.table === table && item.id === uuid(id) && item.creationProof && item.postcondition?.independentlyVisible));
    owns('approval_record', approvalId); owns('todo_item', dirtyTodoId);
    context = native.admitOriginalSdkContext(context);
    return native.withOriginalSdkScope(context, async ({ em, orm, approval }) => {
        assert(em && orm && approval && typeof approval.approveRecord === 'function');
        const metadata = [...orm.getMetadata().getAll().values()];
        const meta = table => { const found = metadata.filter(item => item.tableName === table && item.schema === 'poms'); assert.equal(found.length, 1); return found[0]; };
        const find = (table, id) => em.findOne(meta(table).className, { id: uuid(id) });
        const observation = { kind: 'private-actual-original-shared-parent-UoW-observation', context, outer,
            continueAfterServiceError, measurementContract: sharedUowMeasurementContract, stages: [],
            originalProvider: true, idealAtomicityAssumed: false, creationCertificatesIssuedHere: false };
        let active = false, held, returnedSnapshotId, returnedSnapshotBinding;
        const snapshot = (table, entity) => {
            if (!entity) return null;
            const info = meta(table), helper = wrap(entity, true), properties = Object.values(info.properties).filter(property => property.persist !== false && (property.kind === 'scalar' || property.mapToPk)).map(property => property.name).sort();
            const original = helper.__originalEntityData;
            // clear() empties MikroORM7's identity map but does not clear the
            // helper EM reference. Membership must inspect the exact held
            // object, so a new object with the same PK cannot reattach it.
            const managed = em.getUnitOfWork().getIdentityMap().values().includes(entity);
            return { table, id: String(entity.id), managed,
                helperHasEm: !!helper.__em, helperEmIsParent: helper.__em === em,
                managedByParent: helper.__em === em, // Legacy raw alias only; see measurementContract.
                queued: em.getUnitOfWork().getPersistStack().has(entity),
                properties: Object.fromEntries(properties.map(name => [name, encode(entity[name])])),
                original: original == null ? null : Object.fromEntries(Object.keys(original).sort().map(name => [name, encode(original[name])])),
                originalOwnKeys: original == null ? [] : Object.keys(original).sort(),
                helperOriginalPresence: original === undefined ? 'undefined' : original === null ? 'null' : typeof original };
        };
        const stage = async name => {
            const managed = em.getUnitOfWork().getIdentityMap().values().map(entity => {
                const info = orm.getMetadata().find(entity.constructor); assert(info?.tableName); return snapshot(info.tableName, entity);
            });
            const row = { name, at: new Date().toISOString(), managed, held: held ? {
                approval: snapshot('approval_record', held.approval), todoA: snapshot('todo_item', held.todoA),
                todoB: snapshot('todo_item', held.todoB), payout: snapshot('commission_payout', held.payout),
                returnedSnapshot: snapshot('commission_final_settlement_snapshot', returnedSnapshotBinding),
            } : null };
            // onStage is a private durable-file callback. Running fixture SQL
            // inside this ALS scope would pollute the original-query witness;
            // Root performs independent full facts outside this callback.
            observation.stages.push(row); await onStage({ name, observation });
        };
        try {
            assert.equal(em.isInTransaction(), false); await em.begin(); active = true;
            const record = await find('approval_record', approvalId); assert(record);
            assert.equal(record.currentStatus, 'pending'); assert.equal(record.currentApproverUserId, actorId);
            assert.equal(record.targetObjectType, 'commission-payout'); owns('commission_payout', record.targetObjectId);
            const payout = await find('commission_payout', record.targetObjectId); assert(payout && ['final', 'retention'].includes(payout.stageType));
            const todoA = await em.findOne(meta('todo_item').className, { sourceType: 'approval-record', sourceId: record.id,
                assigneeUserId: actorId, status: { $in: ['open', 'processing'] } });
            const todoB = await find('todo_item', dirtyTodoId); assert(todoA && todoB); owns('todo_item', todoA.id);
            assert(scope.projects.includes(record.projectId)); assert.equal(todoB.projectId, record.projectId);
            assert.notEqual(todoA.id, todoB.id); held = { approval: record, todoA, todoB, payout }; await stage('parent-loaded');
            todoB.summary = dirtySummary; await stage('parent-second-Todo-dirty');
            try {
                const result = await approval.approveRecord(record.id, actorId, { expectedVersion: record.rowVersion, comment: 'L caller-owned same-metadata UoW' });
                returnedSnapshotId = result.snapshotId ?? null; observation.serviceResult = encode(result);
                observation.serviceSucceeded = true;
            } catch (error) { observation.serviceSucceeded = false; observation.serviceError = failure(error); }
            await stage('after-original-service-child');
            if (returnedSnapshotId) {
                // Diagnostic SQL in this validation adapter, outside the
                // product method. Use the actual parent transaction context;
                // this proves materialization before a deliberate rollback,
                // never independent visibility or an outer-COMMIT certificate.
                const diagnosticFrom = native.sql.length;
                const rows = await em.getConnection().execute('select to_jsonb(t)::text as row_json,t.xmin::text as source_xmin,pg_current_xact_id()::text as outer_xid8 from poms.commission_final_settlement_snapshot t where id=?::uuid',
                    [returnedSnapshotId], 'all', em.getTransactionContext());
                assert.equal(rows.length, 1);
                const diagnosticQueries = native.sql.slice(diagnosticFrom);
                assert(diagnosticQueries.some(row => row.phase === 'start') && diagnosticQueries.some(row => row.phase === 'end'));
                assert(diagnosticQueries.every(row => row.context?.caseId === context.caseId && row.command === 'SELECT' && row.relations.includes('commission_final_settlement_snapshot')));
                for (const row of diagnosticQueries) row.validationAdapterStatement = {
                    kind: 'same-caller-outer-materialization-read', source: 'tools/rust-r2l/l-shared-uow-native.mjs', productStatementClaimed: false,
                };
                observation.innerDatabaseSnapshot = { kind: 'same-caller-outer-transaction-materialized-snapshot-read', snapshotId: returnedSnapshotId,
                    rowJson: rows[0].row_json, sourceXmin: rows[0].source_xmin, outerXid8: rows[0].outer_xid8, outerCommitObserved: false,
                    nativeQueryEvidence: [...new Set(diagnosticQueries.map(row => row.queryId))] };
            }
            if (!observation.serviceSucceeded && !continueAfterServiceError) {
                await em.rollback(); active = false; observation.outerActualAction = 'rollback-after-service-error';
            } else if (outer === 'commit') {
                // Genuine original EM.commit flushes dirty parent objects. A
                // caller explicitly continuing after nested failure is measured,
                // never replaced by an ideal all-or-nothing policy in the tool.
                await em.commit(); active = false; observation.outerActualAction = 'commit';
            } else { await em.rollback(); active = false; observation.outerActualAction = 'rollback'; }
            await stage('after-outer-action-held-bindings');
            observation.cachedReread = { approval: snapshot('approval_record', await find('approval_record', approvalId)),
                todoB: snapshot('todo_item', await find('todo_item', dirtyTodoId)) };
            if (returnedSnapshotId) { returnedSnapshotBinding = await find('commission_final_settlement_snapshot', returnedSnapshotId);
                observation.cachedReread.returnedSnapshot = snapshot('commission_final_settlement_snapshot', returnedSnapshotBinding); }
            await stage('after-cached-reread');
            em.clear(); observation.afterClearReread = { approval: snapshot('approval_record', await find('approval_record', approvalId)),
                todoB: snapshot('todo_item', await find('todo_item', dirtyTodoId)) };
            if (returnedSnapshotId) observation.afterClearReread.returnedSnapshot = snapshot('commission_final_settlement_snapshot', await find('commission_final_settlement_snapshot', returnedSnapshotId));
            await stage('after-clear-reread-with-held-bindings'); observation.result = 'observed';
        } catch (error) { observation.result = 'partial'; observation.failure = failure(error); throw Object.assign(error, { sharedUowObservation: observation }); }
        finally {
            if (active && em.isInTransaction()) { await em.rollback(); observation.finallyRolledBackCallerTransaction = true; }
            observation.finishedAt = new Date().toISOString();
        }
        return observation;
    });
}

export async function executeNativeSharedUow(parameters, { retainStage } = {}) {
    assert.equal(typeof retainStage, 'function');
    const observation = await runNativeSharedUow({ ...parameters, onStage: retainStage });
    return { observation, byteSource: 'capture-encoding-of-original-SDK-values', rawBytes: Buffer.from(JSON.stringify(observation)) };
}

// Root seals these IDs from exact owned rows and invokes the compiled example
// through its private bounded process owner. This constructs input only.
export function sharedUowProbeInput({ fixture: f, context, approval, dirtyTodo, dirtySummary,
    outer = 'rollback', continueAfterServiceError = false }) {
    // Reject incompatible input before invoking the controlled process. The
    // capture envelope separately enforces this before opening its PG case;
    // the compiled probe also rejects every other database before I/O.
    assert.equal(f.backend, 'rust', 'The controlled Rust internal-UoW example requires the Rust fixture/database');
    assert.equal(f.j.backend, 'rust');
    assert.equal(f.j.namespace, 'poms-r2l'); assert.equal(context.runId, f.runId); assert.equal(context.op, 'l.internal-uow');
    for (const [table, row] of [['approval_record', approval], ['todo_item', dirtyTodo]]) {
        assert(f.j.objects.some(item => item.table === table && item.id === uuid(row.id) && item.creationProof && item.postcondition?.independentlyVisible));
    }
    assert.equal(approval.project_id, dirtyTodo.project_id); assert.equal(approval.current_status, 'pending');
    assert.equal(approval.target_object_type, 'commission-payout'); assert.equal(typeof dirtySummary, 'string');
    assert(['commit', 'rollback'].includes(outer));
    return { runId: f.runId, caseId: context.caseId, index: context.index, approvalId: approval.id, dirtyTodoId: dirtyTodo.id,
        actorId: approval.current_approver_user_id, initiatorId: approval.initiator_user_id, projectId: approval.project_id,
        dirtySummary, outer, continueAfterServiceError, marker: f.j.marker };
}
