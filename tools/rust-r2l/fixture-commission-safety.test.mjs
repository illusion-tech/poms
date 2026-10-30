// Pure source assertions and explicit fake SELECT clients only. No connection,
// actual prepare/borrow/INSERT/DDL/cleanup, private journal or HTTP is invoked.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { columns, digest, identities, insertParameters, rowIdentity, SEED_ACTORS, supportedTables, unsupportedTables } from './fixture-core.mjs';
import { canonicalDefinitions, commissionIdentities } from './fixture-commission-policy.mjs';
import { assertCaseScope, assertNotBorrowed, assertRowReferences, resolveOwnedProjectIds, uuidReferences } from './fixture-references.mjs';
import { canonicalDefinitionSnapshot, assertSeedUnchanged, baseRows, plannedBase, viewerPermissionPlan } from './fixture-users.mjs';
import { expectedPreparedIdentity, inspectPreparedDefaultSources, validateCommissionPreparedPlan, verifyPreparedPhysicalDefaults } from './fixture-prepared.mjs';
import { inspectCommissionPreparedSource, buildCommissionPreparedRows } from './commission-prepared-source.mjs';
import { memoryStore, plannedJournal } from './fixture-journal.mjs';
import { databaseFor, marker } from './fixture-guard.mjs';
import { LFixture } from './l-fixture.mjs';

const run = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', actor = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const project = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', contract = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const directProof = { kind: 'direct-committed-insert', beforeAbsent: true, transaction: '10', xmin: '10', commitAcknowledged: true };
const manifest = JSON.parse(fs.readFileSync(new URL('../rust-r1b/shared-manifest.json', import.meta.url), 'utf8')).declarations.find(({ name }) => name === 'PERMISSION_KEYS').value;
function owned(table, row, caseId = 'bootstrap') { return { table, id: row.id, caseId, identity: rowIdentity(table, row), creationProof: directProof, postcondition: { independentlyVisible: true } }; }
function fixture(query = async () => { throw new Error('Unexpected fake SQL'); }) {
    const f = new LFixture({ query }, 'nest', run, { store: memoryStore('nest', run) }); f.j.state = 'prepared';
    f.j.base = { accounts: [{ account: 'admin', userId: actor }], roles: [], orgs: [] };
    f.j.objects.push(owned('platform_user', { id: actor, username: 'r2l_actor' }, 'base'), owned('project', { id: project, project_no: 'fresh', created_by: actor })); f.save(); return f;
}
function definitionRows() { return canonicalDefinitions.map((entry) => ({ ...entry, status: 'active', field_rule_version: 'original', created_by: SEED_ACTORS[0], arbitrary_full_row_field: { doNotDrop: true } })); }
let cachedPlan;
async function originalPlan() {
    if (!cachedPlan) {
        const source = await inspectCommissionPreparedSource();
        cachedPlan = await buildCommissionPreparedRows({ uuidMappings: Object.fromEntries(source.requiredUuidMappings.map(({ from }) => [from, randomUUID()])), names: { projectNo: 'fresh-' + run, projectName: 'fresh project ' + run, contractNo: 'fresh-contract-' + run }, logicalIds: [run] });
    }
    return structuredClone(cachedPlan);
}

test('epoch02 activates only the individually reviewed 25 entries and retains 67 unsupported tables', () => {
    assert.equal(supportedTables.length, 40); assert.equal(unsupportedTables.length, 67);
    for (const [table, fields] of Object.entries(commissionIdentities)) assert.deepEqual(identities[table], fields);
    for (const table of ['business_number_sequence', 'approval_summary_package_definition', 'change_package_baseline', 'commercial_release_baseline']) assert(unsupportedTables.includes(table));
});
test('viewer permissions default to nav-only and are an exact immutable manifest subset', () => {
    assert.deepEqual(viewerPermissionPlan(manifest).viewerPermissions, ['nav:dashboard:view']);
    assert.deepEqual(viewerPermissionPlan(manifest, ['project:read', 'nav:dashboard:view']).viewerPermissions, ['nav:dashboard:view', 'project:read']);
    for (const value of [['unknown:read'], ['project:read', 'project:read'], [' project:read'], 'project:read', [null]]) assert.throws(() => viewerPermissionPlan(manifest, value));
    const store = memoryStore('nest', run), journal = plannedJournal('nest', run);
    journal.basePreparationConfig = viewerPermissionPlan(manifest, ['project:read']); store.write(journal);
    journal.basePreparationConfig = viewerPermissionPlan(manifest); assert.throws(() => store.write(journal), /Immutable planned viewer/);
});
test('base rows configure only the fresh viewer role; admin 37 and default nav-only remain exact', async () => {
    const base = plannedBase(run), viewerRole = base.accounts.find(({ account }) => account === 'viewer').roleId;
    const regular = await baseRows(run, base, manifest), masked = await baseRows(run, base, manifest, ['nav:dashboard:view', 'project:read']);
    const permissions = (rows, roleId) => rows.filter(({ table, values }) => table === 'role_permission_assignment' && values.role_id === roleId).map(({ values }) => values.permission_key).sort();
    assert.deepEqual(permissions(regular, viewerRole), ['nav:dashboard:view']);
    assert.deepEqual(permissions(masked, viewerRole), ['nav:dashboard:view', 'project:read']);
    assert.deepEqual(permissions(masked, base.accounts.find(({ account }) => account === 'admin').roleId), [...manifest].sort());
    assert(!masked.some(({ values }) => SEED_ACTORS.includes(values.id) || SEED_ACTORS.includes(values.role_id)));
});
test('three canonical definitions use full readonly snapshots; changes to any full-row field are rejected', async () => {
    const journal = plannedJournal('nest', run), rows = definitionRows(); journal.borrowed.definitions = canonicalDefinitionSnapshot(rows);
    for (const { id } of canonicalDefinitions) assert.throws(() => assertNotBorrowed(journal, id));
    const calls = [];
    const fake = { query: async (sql) => { calls.push(sql); assert(sql.startsWith('select ')); return { rows: rows.map((row) => ({ row })) }; } };
    await assertSeedUnchanged(fake, journal); assert.equal(journal.borrowed.definitionChecks.length, 1);
    rows[1].arbitrary_full_row_field.doNotDrop = false;
    await assert.rejects(assertSeedUnchanged(fake, journal), /full-row snapshot changed/);
    assert(calls.every((sql) => !/insert|update|delete|upsert/i.test(sql)));
});
test('readonly definition before snapshots cannot be replaced and must be registered before case scope', () => {
    const f = fixture(); assert.throws(() => f.defineCase('commission', { actors: [actor], projects: [project], borrowedDefinitions: [canonicalDefinitions[0].id] }), /readonly before snapshot/);
    f.j.borrowed.definitions = canonicalDefinitionSnapshot(definitionRows()); f.save();
    f.defineCase('commission', { actors: [actor], projects: [project], borrowedDefinitions: canonicalDefinitions.map(({ id }) => id) });
    f.j.borrowed.definitions[0].row.field_rule_version = 'changed'; f.j.borrowed.definitions[0].fullRowSha256 = digest(f.j.borrowed.definitions[0].row);
    assert.throws(() => f.save(), /Readonly definition before snapshot changed/);
});
test('typed non-project parent chains resolve across creation cases only under explicit project scope', () => {
    const f = fixture(); f.j.objects.push(owned('contract', { id: contract, project_id: project, contract_no: 'fresh', created_by: actor }));
    const term = { id: randomUUID(), contract_id: contract, source_readiness_id: null, source_baseline_id: null, created_by: actor };
    const scope = f.defineCase('commission', { actors: [actor], projects: [project] });
    assert.deepEqual(resolveOwnedProjectIds(f.j, 'contract_term_snapshot', term), [project]); assertCaseScope(f.j, 'contract_term_snapshot', term, scope);
    assert.throws(() => assertCaseScope(f.j, 'contract_term_snapshot', term, { ...scope, projects: [] }), /outside explicit case/);
    assert.throws(() => resolveOwnedProjectIds(f.j, 'contract_term_snapshot', { ...term, contract_id: randomUUID() }), /Unproven project parent/);
});
test('summary/projection/confirmation/review rows follow only their named immutable parent tables', () => {
    const f = fixture(), scope = f.defineCase('commission', { actors: [actor], projects: [project] });
    const handover = { id: randomUUID(), project_id: project, created_by: actor };
    const summary = { id: randomUUID(), target_type: 'project-handover', target_id: handover.id, approval_scenario_key: 'project-handover', summary_package_id: canonicalDefinitions[1].id, summary_package_key: canonicalDefinitions[1].summary_package_key, created_by: actor };
    const confirmation = { id: randomUUID(), confirmation_type: 'test', business_domain: 'project', target_type: 'project-handover', target_id: handover.id, project_id: project, created_by: actor };
    const signal = { id: randomUUID(), project_id: project, referenced_snapshot_id: randomUUID(), created_by: actor };
    const binding = { id: randomUUID(), project_id: project, signal_evaluation_id: signal.id, created_by: actor };
    f.j.objects.push(owned('project_handover', handover), owned('approval_summary_snapshot', summary), owned('confirmation_record', confirmation), owned('operating_signal_evaluation_result', signal), owned('operating_signal_gate_binding', binding));
    for (const [table, row] of [
        ['approval_summary_field_projection', { id: randomUUID(), summary_snapshot_id: summary.id, field_key: 'field' }],
        ['confirmation_participant', { id: randomUUID(), confirmation_record_id: confirmation.id, participant_id: actor, participant_role_key: 'role' }],
        ['operating_signal_review_record', { id: randomUUID(), signal_evaluation_id: signal.id, created_by: actor }],
        ['commission_gate_review_record', { id: randomUUID(), binding_id: binding.id, created_by: actor }]
    ]) { assert.deepEqual(resolveOwnedProjectIds(f.j, table, row), [project]); assertCaseScope(f.j, table, row, scope); }
    assert.throws(() => resolveOwnedProjectIds(f.j, 'approval_summary_snapshot', { ...summary, target_type: 'unknown' }), /Unreviewed summary target/);
    assert.throws(() => resolveOwnedProjectIds(f.j, 'project_handover', { ...handover, project_id: null }), /Missing explicit project parent/);
    // The reviewed parent types form a DAG. A logical self/cycle cannot be
    // reclassified as the required different parent table, even with equal IDs.
    assert.throws(() => resolveOwnedProjectIds(f.j, 'approval_summary_snapshot', { ...summary, target_id: summary.id }), /Unproven project parent/);
    assert.throws(() => resolveOwnedProjectIds(f.j, 'contract_term_snapshot', { id: summary.id, contract_id: summary.id }), /Unproven project parent/);
    const otherProject = randomUUID(); f.j.objects.push(owned('project', { id: otherProject, project_no: 'other-fresh', created_by: actor }));
    f.j.objects.find(({ id }) => id === handover.id).identity.project_id = otherProject;
    assert.throws(() => assertCaseScope(f.j, 'approval_summary_field_projection', { id: randomUUID(), summary_snapshot_id: summary.id, field_key: 'field' }, scope), /outside explicit case scope/);
});
test('fresh global commission rule preserves original nullable created_by and requires a real actor scope', () => {
    const f = fixture(), scope = f.defineCase('rule', { actors: [actor] });
    const row = { id: randomUUID(), rule_code: 'fresh-' + run, created_by: null };
    assert.equal(rowIdentity('commission_rule_version', row).created_by, null); assertCaseScope(f.j, 'commission_rule_version', row, scope);
    assert.throws(() => assertCaseScope(f.j, 'commission_rule_version', { ...row, rule_code: 'shared-rule' }, scope), /fresh run/);
    assert.throws(() => assertCaseScope(f.j, 'commission_rule_version', row, { ...scope, actors: [], borrowedActors: [] }), /actual case actor/);
});
test('logical JSON keys and values both reject unregistered UUIDs', () => {
    const f = fixture(), scope = f.defineCase('commission', { actors: [actor], projects: [project] });
    const foreign = randomUUID(), value = { metadata: { [foreign]: actor } };
    assert(uuidReferences(value).some(({ id, path }) => id === foreign && path.includes('<key>')));
    assert.throws(() => assertRowReferences(f.j, 'commission_calculation', value, scope), /unregistered_uuid_reference/);
});
test('single INSERT cannot borrow a planned future UUID as if it were owned', async () => {
    let calls = 0; const f = fixture(async () => { calls++; throw new Error('No fake SQL permitted'); });
    const scope = f.defineCase('contract', { actors: [actor], projects: [project] }), future = randomUUID();
    f.j.plans = [{ table: 'contract_term_snapshot', id: future, caseId: scope.caseId, beforePkAbsent: true }];
    await assert.rejects(f.insert('contract', { id: contract, project_id: project, contract_no: 'fresh', created_by: actor, current_snapshot_id: future }, { caseId: scope.caseId }), /unregistered_uuid_reference/);
    assert.equal(calls, 0);
});
test('exact prepared plan includes funding receipt as prepared: 18 rows /15 tables; only two omitted identity fields are materialized', async () => {
    const plan = await originalPlan(), validated = await validateCommissionPreparedPlan(plan);
    assert.equal(plan.rows.length, 18); assert.equal(plan.selectedTables.length, 15); assert(plan.selectedTables.includes('receipt_record'));
    assert.equal(validated.sourceBoundary.historicalProposal01PreparedTables, 14);
    const term = validated.rows.find(({ table }) => table === 'contract_term_snapshot');
    assert.deepEqual(term.omitted.map(({ column }) => column).sort(), ['source_baseline_id', 'source_readiness_id']);
    for (const { column } of term.omitted) { assert(!Object.hasOwn(term.values, column)); assert.equal(term.expectedIdentity[column], null); }
    assert.equal(validated.rows.flatMap(({ omitted }) => omitted).length, 2);
    assert(!plan.selectedTables.includes('change_package_baseline')); assert.equal(plan.boundary.NativeProducerSuccessCertified, false);
});
test('all 18 original prepared rows satisfy exact typed batch closure without owning borrowed definitions', async () => {
    const f = fixture(), viewer = randomUUID(), org = randomUUID();
    f.j.objects.push(owned('platform_user', { id: viewer, username: 'fresh_viewer' }, 'base'), owned('org_unit', { id: org, code: 'fresh_org' }, 'base'));
    f.j.borrowed.definitions = canonicalDefinitionSnapshot(definitionRows()); f.save();
    const scope = f.defineCase('prepared', { actors: [actor, viewer], borrowedDefinitions: canonicalDefinitions.map(({ id }) => id) });
    const source = await inspectCommissionPreparedSource(), mappings = Object.fromEntries(source.requiredUuidMappings.map(({ from }) => [from, randomUUID()]));
    mappings['00000000-0000-4000-8000-000000000001'] = actor; mappings['00000000-0000-4000-8000-000000000002'] = viewer; mappings['10000000-0000-4000-8000-000000000001'] = org;
    const plan = await buildCommissionPreparedRows({ uuidMappings: mappings, names: { projectNo: 'fresh-' + run, projectName: 'fresh-project-' + run, contractNo: 'fresh-contract-' + run }, logicalIds: [run] });
    const validated = await validateCommissionPreparedPlan(plan), additional = validated.rows.map(({ table, values, expectedIdentity }) => ({ table, id: values.id, caseId: scope.caseId, row: { ...values, ...expectedIdentity } }));
    for (const { table, values, expectedIdentity } of validated.rows) { assertRowReferences(f.j, table, values, scope, additional); assertCaseScope(f.j, table, { ...values, ...expectedIdentity }, scope, additional); }
    assert.equal(f.j.objects.length, 4); assert(!f.j.objects.some(({ id }) => canonicalDefinitions.some((entry) => entry.id === id)));
});
test('forged prepared rows, extra SQL columns and changed source values fail before any fake SQL', async () => {
    for (const alter of [
        (p) => { p.rows[0].values.created_by = randomUUID(); },
        (p) => { p.rows[2].values.source_readiness_id = null; p.rows[2].source.columns.push('source_readiness_id'); },
        (p) => { p.rows.pop(); },
        (p) => { p.rows[0].source.rawSqlSha256 = '0'.repeat(64); }
    ]) { const plan = await originalPlan(); alter(plan); await assert.rejects(validateCommissionPreparedPlan(plan), /Prepared source\/column\/value\/mapping plan drift/); }
    assert.throws(() => expectedPreparedIdentity('commission_rule_version', { id: randomUUID(), rule_code: 'fresh-' + run }), /Unreviewed omitted immutable/);
});
test('physical nullable and absent SQL default are each mandatory before omitted identity can be null', async () => {
    const values = { id: randomUUID(), contract_id: contract, created_by: actor };
    const entry = { table: 'contract_term_snapshot', values, ...expectedPreparedIdentity('contract_term_snapshot', values) };
    const fake = (changes = {}) => ({ query: async (sql, [table, column]) => { assert(sql.startsWith('select ')); return { rows: [{ table_name: table, column_name: column, nullable: true, default_expression: null, ...changes }] }; } });
    const evidence = await verifyPreparedPhysicalDefaults(fake(), [entry]); assert.equal(evidence.length, 2); assert(evidence.every((entry) => entry.INSERTColumnAdded === false));
    await assert.rejects(verifyPreparedPhysicalDefaults(fake({ default_expression: 'gen_random_uuid()' }), [entry]), /physical SQL default/);
    await assert.rejects(verifyPreparedPhysicalDefaults(fake({ nullable: false }), [entry]), /physically nullable/);
    assert.equal(inspectPreparedDefaultSources().migrations.verifiedCount, 92);
});
test('prepared parameters preserve SQL NULL and JSON scalar/object semantics without adding columns', () => {
    const table = 'commission_rule_version', field = [...columns.get(table)].find(([, column]) => ['json', 'jsonb'].includes(column.udt))[0];
    assert.deepEqual(insertParameters(table, { [field]: null }), { names: [field], params: [null] });
    for (const value of [{ amount: 100000 }, ['a', false], 'literal', false]) assert.deepEqual(insertParameters(table, { [field]: value }).params, [JSON.stringify(value)]);
});
test('unknown ACK plus invisible PKs remains unresolved until an independent aborted status', async () => {
    const make = (status) => {
        const f = fixture(async (sql) => { assert(sql.startsWith('select ')); return { rows: sql.includes('pg_xact_status') ? [{ status }] : [] }; });
        f.j.directCreates.push({ id: randomUUID(), caseId: 'bootstrap', rows: [{ table: 'contract', id: contract }], beforeAbsent: true, transaction: '100', expectedXmin: '100', captured: [], state: 'outcome-unknown' });
        return f;
    };
    for (const status of ['in progress', 'committed', null]) { const f = make(status); await assert.rejects(f.recoverDirectCreates(), /Invisible PKs alone/); assert.equal(f.j.directCreates[0].state, 'outcome-unknown'); }
    const aborted = make('aborted'); await aborted.recoverDirectCreates(); assert.equal(aborted.j.directCreates[0].state, 'absent'); assert.equal(aborted.j.directCreates[0].absenceProof.independentTransactionStatus, 'aborted');
});
test('unknown mutation ACK resolves aborted only when the complete independent before row matches', async () => {
    const before = { id: contract, project_id: project, contract_no: 'fresh', created_by: actor, status: 'draft' };
    const f = fixture(async (sql) => ({ rows: sql.includes('pg_xact_status') ? [{ status: 'aborted' }] : [{ row: before, xmin: '10' }] }));
    f.j.objects.push(owned('contract', before)); f.j.mutations.push({ table: 'contract', id: contract, transaction: '100', expectedXmin: '100', before: structuredClone(before), state: 'outcome-unknown' });
    await f.recoverMutations(); assert.equal(f.j.mutations[0].state, 'rolled-back'); assert.equal(f.j.mutations[0].recoveredByIndependentAbortedStatus, true);
    f.j.mutations[0].state = 'outcome-unknown'; f.j.mutations[0].before.status = 'different';
    await assert.rejects(f.recoverMutations(), /independently visible before row/);
});
test('exact same-batch forward logical references are allowed without making other UUIDs known', () => {
    const f = fixture(), scope = f.defineCase('commission', { actors: [actor], projects: [project] });
    const term = { id: randomUUID(), contract_id: contract, source_readiness_id: null, source_baseline_id: null, created_by: actor };
    const row = { id: contract, project_id: project, contract_no: 'fresh', created_by: actor, current_snapshot_id: term.id };
    const additional = [{ table: 'contract', id: row.id, caseId: scope.caseId, row }, { table: 'contract_term_snapshot', id: term.id, caseId: scope.caseId, row: term }];
    assertRowReferences(f.j, 'contract', row, scope, additional); assertCaseScope(f.j, 'contract_term_snapshot', term, scope, additional);
    assert.throws(() => assertRowReferences(f.j, 'contract', { ...row, current_snapshot_id: randomUUID() }, scope, additional), /unregistered_uuid_reference/);
    assert.equal(f.j.objects.filter(({ table }) => table === 'contract_term_snapshot').length, 0);
});
test('adoption accepts Todo-before-Approval cohort and preserves INSERT xmin versus later visible xmin', async () => {
    const approvalId = randomUUID(), todoId = randomUUID(), authorityId = randomUUID();
    const approval = { id: approvalId, approval_type: 'contract-review', business_domain: 'contract', target_object_type: 'contract', target_object_id: contract, project_id: project, initiator_user_id: actor };
    const todo = { id: todoId, source_type: 'approval-record', source_id: approvalId, todo_type: 'approval', business_domain: 'contract', target_object_type: 'contract', target_object_id: contract, project_id: project };
    const f = fixture(async (sql, [id]) => { assert(sql.startsWith('select ')); const row = [approval, todo].find((row) => row.id === id); assert(row); return { rows: [{ row, xmin: '103' }] }; });
    f.j.objects.push(owned('contract', { id: contract, project_id: project, contract_no: 'fresh', created_by: actor }));
    const scope = f.defineCase('submit', { actors: [actor], projects: [project] });
    f.j.authorities.push({ id: authorityId, kind: 'pg-after-insert-observed-outer-commit', database: databaseFor('nest'), marker, sourceAuthority: 'pure-test-source', observerId: authorityId, functionOid: 123 });
    const certificates = [['todo_item', todo], ['approval_record', approval]].map(([table, row], index) => {
        const intent = { id: randomUUID(), table, selector: { project_id: project }, caseId: scope.caseId, beforeObserved: true, beforeIds: [], state: 'planned' }; f.j.intents.push(intent);
        return { table, id: row.id, identity: rowIdentity(table, row), authorityId, intentId: intent.id, proof: { kind: 'pg-after-insert-observed-outer-commit', createContext: { runId: run, caseId: scope.caseId, index, op: 'l.native' }, database: databaseFor('nest'), marker, sourceAuthority: 'pure-test-source', observerId: authorityId, functionOid: 123, topXid8: '100', eventXid8: '101', eventXmin: '101', sourceXminAtDrain: '102', observedFullXid8: '104', outerCommitObserved: true, outerStatus: 'committed', topXidStatus: 'committed', eventXminStatus: 'committed', visibleFromIndependentOwnerConnection: true, eventId: String(index + 1) } };
    });
    f.recordCommittedCreates(certificates); await f.adoptIntents();
    const item = f.j.objects.find(({ id }) => id === todoId); assert(item);
    assert.equal(item.postcondition.sourceInsertXmin, '101'); assert.equal(item.postcondition.sourceXminAtDrain, '102'); assert.equal(item.postcondition.observedXmin, '103');
    assert.equal(item.creationProof.outerCommitAcknowledged, undefined);
    assert.deepEqual(item.identity, rowIdentity('todo_item', todo));
});
