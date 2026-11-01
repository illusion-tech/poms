// Narrow original K source plan only. No DB/ORM/old-private read on import.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { digest, uuid, identities, SEED_ACTORS } from './fixture-core.mjs';
import { canonicalDefinitions } from './fixture-policy.mjs';

const readerFile = 'tools/rust-r2k/r4-prepared-source.mjs';
const readerSha256 = '70978ae60f59e1331964894d7ec50abf75060f2b0f1e639667aaac27380b1e36';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const tables = new Set(['project','contract','contract_term_snapshot','receipt_record','payment_record','commercial_release_baseline','commercial_baseline_diff_result','contract_readiness_package','approval_summary_snapshot','project_handover','confirmation_record','confirmation_participant','project_receipt_judgment_freeze']);

export async function validateHandoverPreparedPlan(fixture, plan, caseId) {
    assert.equal(plan?.kind, 'originalSeeder-prepared-state-pure-source-plan'); assert.equal(plan.result, 'pure-plan');
    assert.equal(plan.recipe.entry, 'seedProjectHandoverE2EFixture'); assert.deepEqual(plan.recipe.conditionalSourceExecuted, []);
    assert(!plan.recipe.fixture.handoverStatus || plan.recipe.fixture.handoverStatus === 'draft', 'This slice requires prepared draft then current actual Native confirmation');
    assert.equal(plan.boundary.actualSqlExecutions, 0); assert.equal(plan.boundary.definitionInsertOrUpsert, false);
    const raw = fs.readFileSync(new URL('../../' + readerFile, import.meta.url));
    assert.equal(sha(raw.toString('utf8').replace(/\r\n/g, '\n')), readerSha256, 'Reviewed original K reader changed');
    const mapping = name => { const matches = plan.allowedMappings.filter(item => item.name === name); assert.equal(matches.length, 1); return uuid(matches[0].to); };
    const borrowedDefinitions = {
        contractSummaryPackageId: mapping('CONTRACT_HANDOVER_SUMMARY_PACKAGE_ID'),
        projectHandoverSummaryPackageId: mapping('PROJECT_HANDOVER_SUMMARY_PACKAGE_ID')
    };
    const scope = fixture.scope(caseId);
    for (const id of Object.values(borrowedDefinitions)) assert(scope.borrowedDefinitions.includes(id) && fixture.j.borrowed.definitions.some(row => row.id === id && row.readOnly && row.fullRowSha256 === digest(row.row)) && canonicalDefinitions.some(row => row.id === id));
    const input = {
        fixture: structuredClone(plan.recipe.fixture),
        actorId: { adminId: fixture.actors.admin, viewerId: fixture.actors.viewer },
        orgId: fixture.base.accounts.find(item => item.account === 'admin').orgId,
        borrowedDefinitions,
        participantRowIds: { executionOwner: mapping('original handoverParticipantId(fixture,1)'), salesOwner: mapping('original handoverParticipantId(fixture,2)') }
    };
    const { buildPreparedPlan } = await import('../rust-r2k/r4-prepared-source.mjs');
    const rebuilt = await buildPreparedPlan(input); assert.equal(digest(rebuilt), digest(plan), 'Original source/args/columns/SQL/mapping plan drift');
    const declared = new Map();
    for (const statement of plan.statements) {
        assert.equal(statement.schema, 'poms'); assert(tables.has(statement.table) && Object.hasOwn(identities, statement.table));
        assert(['INSERT', 'UPDATE'].includes(statement.kind));
        if (statement.kind === 'UPDATE') assert(statement.table === 'commercial_release_baseline' && statement.columns.every(name => ['latest_diff_result_id', 'id'].includes(name)), 'Only original fresh baseline back-pointer UPDATE admitted');
        assert.equal(sha(statement.sql), statement.sqlSha256); assert.equal(sha(statement.rawSql), statement.rawSqlSha256);
        const primaryKeys = statement.uuidRefs.filter(item => item.column === 'id');
        if (statement.kind === 'INSERT') assert.equal(primaryKeys.length, statement.rows, 'Every original INSERT row needs its explicit planned UUID');
        for (const ref of primaryKeys) {
            const id = uuid(ref.uuid), key = statement.table + ':' + id;
            assert(!SEED_ACTORS.includes(id) && !canonicalDefinitions.some(row => row.id === id));
            if (statement.kind === 'INSERT') { assert(!declared.has(key) && !fixture.j.objects.some(row => row.id === id)); declared.set(key, { table: statement.table, id }); }
            else assert(declared.has(key), 'UPDATE target must be its fresh preceding INSERT');
        }
    }
    assert(declared.size > 0 && declared.size <= 64 && new Set([...declared.values()].map(row => row.id)).size === declared.size);
    // The original contract snapshot carries this logical UUID without a
    // receivable-plan table. It is source-bound, never row ownership/delete.
    const logicalId = uuid(plan.recipe.fixture.receivablePlanVersionId);
    assert.notEqual(logicalId, fixture.runId);
    assert(![...declared.values()].some(row => row.id === logicalId) && !fixture.j.objects.some(row => row.id === logicalId));
    assert(!SEED_ACTORS.includes(logicalId) && !canonicalDefinitions.some(row => row.id === logicalId));
    const logicalOccurrences = plan.statements.flatMap(statement => statement.uuidRefs.filter(ref => uuid(ref.uuid) === logicalId).map(ref => ({ table: statement.table, column: ref.column })));
    assert.deepEqual(logicalOccurrences, [{ table: 'contract_readiness_package', column: 'initialized_receivable_plan_version_id' }], 'Logical UUID is admitted at its one original physical occurrence only');
    const known = new Set([...fixture.j.objects.map(row => row.id), ...declared.values()].map(row => typeof row === 'string' ? uuid(row) : row.id));
    known.add(logicalId);
    known.add(fixture.runId);
    for (const statement of plan.statements) for (const ref of statement.uuidRefs) {
        const id = uuid(ref.uuid);
        if (ref.borrowedDefinition) assert(ref.column === 'summary_package_id' && Object.values(borrowedDefinitions).includes(id));
        else assert(known.has(id), 'Original prepared recipe contains an unregistered UUID');
    }
    const originalPlan = { kind: 'R2M-original-handover-draft-source-cohort', originalKPlan: structuredClone(plan), rebuildInput: input,
        rows: [...declared.values()].map(row => ({ table: row.table, values: { id: row.id } })), logicalReferences: [{ id: logicalId, role: 'receivable-plan-version-no-row', table: 'contract_readiness_package', rowId: uuid(plan.recipe.fixture.readinessPackageId), column: 'initialized_receivable_plan_version_id' }] };
    return { plan, rows: [...declared.values()], logicalId, originalPlan, sourcePlanSha256: digest(originalPlan),
        defaultSources: { reader: { file: readerFile, normalizedLfSha256: readerSha256 }, originalSeeder: plan.source },
        sourceBoundary: { actualNativeProducerClaimed: false, preparedDraftOnly: true, actualNativeConfirmationRequired: true,
            sourceTables: [...new Set(plan.statements.map(item => item.table))], logicalReceivablePlanRowSynthesized: false } };
}
