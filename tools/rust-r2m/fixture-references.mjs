import {assertExternalAuditRowScope} from './fixture-external-audit-identity.mjs';
import { stageGlobalTables } from './fixture-policy.mjs';
import assert from 'node:assert/strict';
import { authority, frozenTables, ident, verifyFullCatalog } from './catalog-complete.mjs';
import { columns, digest, identities, normalize, rowIdentity, rowKey, sameIdentity, uuid, uuidKey, SEED_ACTORS } from './fixture-core.mjs';
import { canonicalDefinitions, projectParentEdges, summaryTargetTables } from './fixture-policy.mjs';
import { fixtureProfile } from './fixture-core.mjs';
import { assertTodo42SalesScope, assertTodo42CurrentSalesClosure } from './fixture-profile.mjs';
import {assertAuditRowScope} from './fixture-audit-identity.mjs';

export function uuidReferences(value, path = []) {
    if (typeof value === 'string') {
        return [...value.matchAll(/(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|(?<![0-9a-f])[0-9a-f]{32}(?![0-9a-f]))/gi)].map((match) => ({ id: uuid(match[0]), path }));
    }
    if (!value || typeof value !== 'object') return [];
    return Object.entries(value).flatMap(([key, entry]) => [...uuidReferences(key, [...path, '<key>']), ...uuidReferences(entry, [...path, key])]);
}
export const ownedIds = (journal) => journal.objects.map((object) => object.id);
export function protectedBorrowedIds(journal) {
    return new Set((journal.borrowed?.principalSnapshot?.rows ?? []).flatMap((entry) => uuidReferences(entry.row).filter((ref) => ref.path[0] === 'id').map((ref) => ref.id)).concat((journal.borrowed?.definitions ?? []).map((entry) => entry.id)));
}
export function assertNotBorrowed(journal, id) {
    assert(!SEED_ACTORS.includes(uuid(id)) && !canonicalDefinitions.some((entry) => entry.id === uuid(id)) && !protectedBorrowedIds(journal).has(uuid(id)), 'Readonly seed rows never become owned/logical-delete ids');
}
export function resolveOwnedProjectIds(journal, table, row, { additional = [] } = {}) {
    const objects = [...journal.objects, ...additional], visiting = new Set();
    const find = (expectedTable, id) => {
        const found = objects.filter((entry) => entry.table === expectedTable && uuidKey(entry.id) === uuidKey(id));
        assert(found.length > 0, 'Unproven project parent: ' + expectedTable);
        const chosen = found[0];
        // A certified cohort may repeat a previously adopted object; its
        // immutable identity must still agree. No query result is admitted here.
        for (const other of found.slice(1)) assert.equal(digest(rowIdentity(expectedTable, other.row ?? other.identity)), digest(rowIdentity(expectedTable, chosen.row ?? chosen.identity)));
        return chosen.row ?? chosen.identity;
    };
    const visit = (currentTable, currentRow) => {
        const key = currentTable + ':' + uuid(currentRow.id);
        assert(!visiting.has(key), 'Cyclic project-parent ownership chain'); visiting.add(key);
        const result = new Set();
        const targetTables = { project: 'project', contract: 'contract', 'project-handover': 'project_handover' };
        if (currentTable === 'attachment') {
            for (const link of objects.filter(item => item.table === 'attachment_link' && uuidKey((item.row ?? item.identity).attachment_id) === uuidKey(currentRow.id))) {
                const value = find('attachment_link', link.id), targetTable = targetTables[value.target_type];
                if (targetTable) for (const id of visit(targetTable, find(targetTable, value.target_id))) result.add(id);
            }
        } else if (['attachment_link', 'attachment_upload_session'].includes(currentTable)) {
            const targetTable = targetTables[currentRow.target_type];
            if (targetTable && currentRow.target_id != null) for (const id of visit(targetTable, find(targetTable, currentRow.target_id))) result.add(id);
            else if (currentTable === 'attachment_upload_session' && currentRow.base_attachment_id != null) for (const id of visit('attachment', find('attachment', currentRow.base_attachment_id))) result.add(id);
        } else if (currentTable === 'project') { find('project', currentRow.id); result.add(uuid(currentRow.id)); }
        else if (identities[currentTable]?.includes('project_id')) {
            assert(currentRow.project_id != null, 'Missing explicit project parent: ' + currentTable);
            find('project', currentRow.project_id); result.add(uuid(currentRow.project_id));
        }
        const edges = [...(projectParentEdges[currentTable] ?? [])];
        if (currentTable === 'approval_summary_snapshot') {
            const target = summaryTargetTables[currentRow.target_type];
            assert(target, 'Unreviewed summary target type'); edges.push(['target_id', target]);
        }
        for (const [field, expectedTable] of edges) {
            assert(currentRow[field] != null, 'Missing immutable project parent: ' + currentTable + '.' + field);
            for (const id of visit(expectedTable, find(expectedTable, currentRow[field]))) result.add(id);
        }
        visiting.delete(key); return result;
    };
    return [...visit(table, row)].sort();
}
export function assertRowReferences(journal, table, row, scope, additional = [], preparedContext = {}) {
    const logical = (journal.logicalReferences ?? []).filter(entry => {
        const plan = journal.preparedBatches.find(plan => plan.id === entry.sourcePlanId && plan.sourcePlanSha256 === entry.sourcePlanSha256);
        const direct = journal.directCreates.find(intent => intent.sourcePlanId === plan?.id && intent.id === plan?.directCreateIntentId && intent.beforeAbsent === true);
        const committed = plan && direct && ['committed', 'promoted'].includes(plan.state) && ['committed', 'promoted'].includes(direct.state) && direct.independentPostCommitCaptureVerified === true && (direct.commitAcknowledged === true || direct.recoveredCommittedStatus === true);
        const executing = plan && direct && plan.state === 'executing' && direct.state === 'executing' && preparedContext.preparedSourcePlanId === plan.id && direct.transaction === preparedContext.transaction;
        const stateAllowed = committed || executing;
        return stateAllowed && plan.originalPlan.logicalReferences?.some(ref => digest(ref) === digest({ id:entry.id, role:entry.role, table:entry.table, rowId:entry.rowId, column:entry.column })) && (entry.caseId === scope.caseId || scope.projects.includes(entry.projectId));
    });
    const known = new Set([...ownedIds(journal), ...additional.map((entry) => uuid(entry.id)), journal.runId]);
    const actorColumns = new Set(['created_by', 'updated_by', 'generated_by', 'handled_by', 'approved_by', 'confirmed_by', 'frozen_by', 'initiator_user_id', 'current_approver_user_id', 'assignee_user_id', 'operator_id', 'actor_id', 'participant_id']);
    for (const ref of uuidReferences(row)) {
        if (known.has(ref.id)) continue;
        const column = ref.path[0];
        if (logical.some(entry => entry.id === ref.id && table === entry.table && row.id === entry.rowId && ref.path.length === 1 && column === entry.column)) continue;
        // Object-key UUIDs are opaque storage names, never row ownership. Only
        // a fresh run-prefixed key is admitted; actual objects need their own
        // before-absence/creation/hash ledger and exact cleanup.
        if (['storage_key', 'key_prefix'].includes(column) && ['attachment', 'attachment_upload_session', 'attachment_download_package', 'attachment_storage_provider_config'].includes(table)) {
            const key = row[column];
            assert(typeof key === 'string' && !key.startsWith('/') && !key.includes('\\') && !key.split('/').includes('..'));
            assert(key.replaceAll('-', '').includes(journal.runId.replaceAll('-', '')), 'Object key is outside this fresh run');
            continue;
        }
        if (SEED_ACTORS.includes(ref.id) && scope.borrowedActors.includes(ref.id) && journal.borrowed?.principalSnapshot && (actorColumns.has(column) || (table === 'auth_session' && column === 'user_id') || ['json', 'jsonb'].includes(columns.get(table)?.get(column)?.udt))) continue;
        if (column === 'summary_package_id' && scope.borrowedDefinitions.includes(ref.id) && journal.borrowed?.definitions.some((entry) => entry.id === ref.id)) continue;
        assert.fail('unregistered_uuid_reference: ' + table + '.' + ref.path.join('.'));
    }
}
export function assertCaseScope(journal, table, row, scope, additional = []) {
    const actors = new Set([...scope.actors, ...scope.borrowedActors]);
    const actor = row.created_by ?? row.operator_id ?? row.actor_id ?? row.initiator_user_id ?? row.reviewer_user_id ?? null;
    if (actor !== null) assert(actors.has(uuid(actor)), 'Row actor is outside the real case');
    if (assertTodo42SalesScope({ profile: fixtureProfile, journal, table, row, scope, additional })) return;
    if (table === 'project' || table === 'lead' || table === 'customer') {
        assert(scope.actors.includes(uuid(row.created_by)), 'Root facts require an owned case initiator');
        return;
    }
    if (table === 'commission_rule_version') {
        const key = row.rule_code;
        assert(typeof key === 'string' && key.replaceAll('-', '').includes(journal.runId.replaceAll('-', '')), 'Global definition key must name this fresh run');
        assert(actors.size > 0, 'Global rule requires an actual case actor; nullable created_by is preserved');
        return;
    }
    if (table === 'auth_session') { assert(actors.has(uuid(row.user_id)), 'Session principal is outside the case'); return; }
    if (table === 'audit_log' || table === 'security_event') {
        const external=table==='audit_log'?assertExternalAuditRowScope(journal,row,scope,additional):null;if(!external)assertAuditRowScope(journal,table,row,scope,additional);
        if(external?.allowNullOperator){assert(table==='audit_log'&&row.operator_id===null&&actor===null);return}
        assert((table === 'security_event' && actor === null && scope.anonymous) || (actor !== null && actors.has(uuid(actor))), 'Audit/security principal missing');
        return;
    }
    if (stageGlobalTables.includes(table)) {
        assert(scope.actors.length > 0 || scope.anonymous, 'Explicit stage case required');
        const refs = uuidReferences(row).filter(ref => ref.path[0] !== 'id');
        for (const ref of refs) {
            const owned = [...journal.objects, ...additional].find(item => uuidKey(item.id) === uuidKey(ref.id));
            if (owned && !(owned.caseId === scope.caseId || owned.caseId === 'base' || scope.actors.includes(ref.id))) {
                const projects = resolveOwnedProjectIds(journal, owned.table, owned.row ?? owned.identity, { additional });
                assert(projects.length > 0 && projects.every(id => scope.projects.includes(id)), 'Stage resource is outside the explicit proven project closure');
            }
        }
        return;
    }
    const projectIds = resolveOwnedProjectIds(journal, table, row, { additional });
    assert(projectIds.length > 0, 'Row has no proven project-domain parent');
    for (const projectId of projectIds) assert(scope.projects.includes(projectId) || additional.some((entry) => entry.table === 'project' && uuid(entry.id) === projectId && entry.caseId === scope.caseId), 'Project parent is outside explicit case scope');
}
export function whereIdentity(table, identity, start = 1) {
    const value = normalize(table, identity), names = Object.keys(value);
    assert(names.length > 0);
    return { sql: names.map((name, index) => ident(name) + ' is not distinct from $' + (start + index)).join(' and '), args: names.map((name) => value[name]) };
}
export async function selectId(client, table, id, lock = false) {
    assert(Object.hasOwn(identities, table), 'unsupported_fixture_table: ' + table);
    const { rows } = await client.query('select to_jsonb(t) as row,t.xmin::text as xmin from poms.' + ident(table) + ' t where id=$1::uuid' + (lock ? ' for update' : ''), [uuid(id)]);
    assert(rows.length <= 1);
    return rows[0] ?? null;
}
export function assertScannedRows(journal, rows) {
    const found = new Map();
    for (const { table, row } of rows) {
        if (table === 'system_setting') {
            const lease = journal.baselineSettingLease;
            if (lease && row.key === lease.key) {
                assert.equal(lease.owned, false); assert.equal(lease.deletionPermitted, false);
                assert.equal(digest(row), lease.expectedAfterSha256, 'Unrecorded baseline singleton change');
                continue;
            }
            const owned = journal.keyed?.objects?.find(item => item.key === row.key && item.creationProof && item.independentlyVisible);
            assert(owned, 'Unproven canonical setting reference'); continue;
        }
        const object = journal.objects.find((entry) => entry.table === table && uuidKey(entry.id) === uuidKey(row.id));
        assert(object && sameIdentity(table, row, object.identity), 'foreign_or_unproven_fixture_reference: ' + table);
        found.set(rowKey(table, row), row);
    }
    return found;
}
export async function scanReferences(client, journal, { lock = false } = {}) {
    const catalog = await verifyFullCatalog(client, { lock });
    const ids = [...new Set([journal.runId, ...ownedIds(journal), ...(journal.plans ?? []).map((entry) => entry.id), ...(journal.logicalReferences ?? []).map(entry => entry.id)])];
    assert(ids.every((id) => !SEED_ACTORS.includes(id)), 'Borrowed principals cannot be logical deletion ids');
    const needles = [...ids.map((id) => '%' + uuidKey(id) + '%'), ...(journal.keyed?.objects ?? []).map(item => '%' + item.key.replaceAll('-', '') + '%')], scanned = [];
    for (const table of frozenTables) {
        const { rows } = await client.query('select to_jsonb(t) as row from poms.' + ident(table) + " t where lower(replace(to_jsonb(t)::text,'-','')) like any($1::text[])" + (lock ? ' for update' : ''), [needles]);
        for (const item of rows) scanned.push({ table, row: item.row });
    }
    const found = assertScannedRows(journal, scanned);
    for (const object of journal.objects) {
        const current = await selectId(client, object.table, object.id, lock);
        if (current) { assert(sameIdentity(object.table, current.row, object.identity)); found.set(rowKey(object.table, current.row), current.row); }
    }
    assertTodo42CurrentSalesClosure(journal, found, fixtureProfile);
    return { catalog, found, tablesScanned: frozenTables.length, scanDigest: digest(scanned) };
}
export function deletionGraph(journal, rows) {
    const nodes = journal.objects.filter((object) => rows.has(rowKey(object.table, object))).map((object) => ({ ...object, row: rows.get(rowKey(object.table, object)) }));
    const edges = [];
    for (const fk of authority.allForeignKeys) {
        for (const source of nodes.filter((entry) => entry.table === fk.source_table)) {
            if (fk.source_columns.some((name) => source.row[name] === null || source.row[name] === undefined)) continue;
            for (const target of nodes.filter((entry) => entry.table === fk.target_table)) {
                if (fk.source_columns.every((name, index) => digest(source.row[name]) === digest(target.row[fk.target_columns[index]]))) edges.push({ source: rowKey(source.table, source), target: rowKey(target.table, target), fk });
            }
        }
    }
    const leaves = nodes.filter((node) => !edges.some((edge) => edge.target === rowKey(node.table, node)));
    const breakable = edges.filter((edge) => edge.fk.source_columns.length === 1 && columns.get(edge.fk.source_table).get(edge.fk.source_columns[0]).nullable && !identities[edge.fk.source_table].includes(edge.fk.source_columns[0]));
    return { nodes, edges, leaves, breakable };
}
