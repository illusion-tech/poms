// Import-safe PURE planner/assertions. No filesystem, DB, HTTP, process or timer I/O.
// Root supplies actual sealed rows/catalog/ownership and executes reviewed intents.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';

const NUMBER = Symbol('lossless-json-number');
const hash = value => createHash('sha256').update(value).digest('hex');
const clone = value => structuredClone(value);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const ident = value => { assert(/^[a-z_][a-z_0-9]*$/.test(value), 'Only actual safe catalog identifiers'); return '"' + value + '"'; };
const qtable = name => 'poms.' + ident(name);
const stable = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(stable) : Object.fromEntries(Object.keys(value).sort(compare).map(k => [k, stable(value[k])])) : value;
const jsonHash = value => hash(JSON.stringify(stable(value)));
function frozen(value) { if (value && typeof value === 'object') { for (const item of Object.values(value)) frozen(item); Object.freeze(value); } return value; }
export const initialPlan70 = () => ({ status: 'not-run', DBExecuted: false, filesDeleted: false, processStopped: false, actualRowGraphValidated: false, G3Certified: false, G4Certified: false });
export const CYCLE_POINTERS70 = frozen([
    { table: 'commercial_release_baseline', columns: ['latest_diff_result_id'] },
    { table: 'contract_readiness_package', columns: ['current_preparation_id', 'contract_amendment_id'] },
    { table: 'contract_term_snapshot', columns: ['source_preparation_id', 'source_readiness_id', 'source_amendment_id'] },
    { table: 'contract_term_preparation', columns: ['contract_amendment_id', 'before_snapshot_id'] },
    { table: 'contract_review_binding', columns: ['contract_amendment_id'] },
    { table: 'project_handover', columns: ['handover_rebaseline_record_id'] },
]);
export const BORROWED_ORIGINALS70 = frozen([
    { backend: 'rust', table: 'business_number_sequence', primaryKey: { id: '52b0d05d-7e0b-430d-9aa5-1d8007e03fba' }, action: 'restore-columns', columns: ['next_value', 'updated_at'] },
    { backend: 'rust', table: 'local_credential', primaryKey: { id: '70000000-0000-4000-8000-000000000008' }, action: 'restore-columns', columns: ['password_hash', 'updated_at'] },
    { backend: 'rust', table: 'user_role_assignment', primaryKey: { id: '50000000-0000-4000-8000-000000000081' }, action: 'restore-missing-original' },
]);

function numericToken(token) {
    const m = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(token); assert(m, 'Actual JSON numeric token required');
    let digits = (m[2] + (m[3] ?? '')).replace(/^0+/, ''), exponent = BigInt(m[4] ?? '0') - BigInt((m[3] ?? '').length);
    if (!digits) return '0e0';
    while (digits.endsWith('0')) { digits = digits.slice(0, -1); exponent++; }
    return m[1] + digits + 'e' + exponent;
}
function parseLossless(raw) {
    assert(typeof raw === 'string');
    return JSON.parse(raw, (_key, value, context) => {
        if (typeof value !== 'number') return value;
        assert(typeof context?.source === 'string', 'Root Node must support JSON.parse source context; never silently lose money precision');
        return Object.freeze({ [NUMBER]: numericToken(context.source) });
    });
}
function canonical(value) {
    if (value === null) return ['null'];
    if (value && typeof value === 'object' && Object.hasOwn(value, NUMBER)) return ['number', value[NUMBER]];
    if (Array.isArray(value)) return ['array', value.map(canonical)];
    if (value && typeof value === 'object') return ['object', Object.keys(value).sort(compare).map(k => [k, canonical(value[k])])];
    return [typeof value, value];
}
export const rowFingerprint70 = raw => hash(JSON.stringify(canonical(parseLossless(typeof raw === 'string' ? raw : JSON.stringify(raw)))));
const rawOf = value => typeof value === 'string' ? value : typeof value?.raw === 'string' ? value.raw : JSON.stringify(value);
function recordOf(table, value, pk) {
    const raw = rawOf(value), row = JSON.parse(raw), lossless = parseLossless(raw);
    assert(row && typeof row === 'object' && !Array.isArray(row));
    const key = Object.fromEntries(pk.map(c => { assert(row[c] !== null && row[c] !== undefined, 'Real nonnull PK required'); return [c, row[c]]; }));
    return { table, pk, key, id: table + ':' + JSON.stringify(stable(key)), raw, row, lossless, fingerprint: rowFingerprint70(raw), rawSource: { kind: 'sealed-live-raw', raw } };
}
function identifierList(text) { return text.split(',').map(v => { const name = v.trim().replace(/^"([a-z_0-9]+)"$/, '$1'); ident(name); return name; }); }
export function normalizeCatalog70(catalog) {
    assert(Array.isArray(catalog.columns) && Array.isArray(catalog.constraints) && Array.isArray(catalog.indexes));
    const primaryKeys = new Map(), foreignKeys = [];
    for (const c of catalog.constraints) {
        ident(c.table_name); assert(c.convalidated === true, 'Unvalidated catalog constraint requires explicit review');
        if (c.contype === 'p') { const m = /^PRIMARY KEY \(([^)]+)\)$/.exec(c.definition); assert(m, 'Unexpected real PK expression'); primaryKeys.set(c.table_name, identifierList(m[1])); }
        if (c.contype !== 'f') continue;
        const m = /^FOREIGN KEY \(([^)]+)\) REFERENCES (?:poms\.)?([a-z_0-9]+)\(([^)]+)\)(.*)$/.exec(c.definition); assert(m, 'Unknown actual FK definition:' + c.conname);
        const columns = identifierList(m[1]), referencedColumns = identifierList(m[3]); assert.equal(columns.length, referencedColumns.length); ident(m[2]);
        const del = /ON DELETE (NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)/.exec(m[4]);
        foreignKeys.push({ name: c.conname, child: c.table_name, parent: m[2], columns, referencedColumns, match: /MATCH FULL/.test(m[4]) ? 'FULL' : 'SIMPLE', deleteAction: del?.[1] ?? 'NO ACTION', deferrable: !!c.condeferrable, definition: c.definition });
    }
    const tables = [...primaryKeys.keys()].sort(compare);
    assert.equal(new Set(catalog.columns.map(c => c.table_name)).size, tables.length);
    return { tables, primaryKeys, foreignKeys, structuralHash: jsonHash({ columns: catalog.columns, constraints: catalog.constraints, indexes: catalog.indexes }) };
}
function keyedGraph(graph, catalog) {
    const normalized = normalizeCatalog70(catalog), records = new Map(), byTable = new Map();
    assert.deepEqual(Object.keys(graph).sort(compare), normalized.tables, 'Snapshot must contain every actual table, including empty ones');
    for (const table of normalized.tables) {
        assert(Array.isArray(graph[table])); const rows = graph[table].map(value => recordOf(table, value, normalized.primaryKeys.get(table)));
        byTable.set(table, rows); for (const row of rows) { assert(!records.has(row.id), 'Duplicate snapshot PK'); records.set(row.id, row); }
    }
    return { ...normalized, records, byTable, graphHash: jsonHash([...records.values()].map(r => [r.id, r.fingerprint]).sort((a, b) => compare(a[0], b[0]))) };
}
function scalar(value) { if (typeof value === 'number') assert(Number.isSafeInteger(value), 'FK/PK numeric key needs exact safe representation'); assert(['number', 'string', 'boolean'].includes(typeof value)); return JSON.stringify(value); }
function tuple(row, columns, match = 'SIMPLE') {
    const values = columns.map(c => row[c]); assert(!values.some(v => v === undefined), 'Snapshot missing actual FK column'); const nulls = values.filter(v => v === null).length;
    if (nulls) { assert(match !== 'FULL' || nulls === values.length, 'MATCH FULL partial-null row cannot be a valid live fact'); return null; }
    return values.map(scalar).join('|');
}
function allEdges(state, fks) {
    const byTable = new Map(); for (const r of state.values()) { if (!byTable.has(r.table)) byTable.set(r.table, []); byTable.get(r.table).push(r); }
    const edges = [];
    for (const fk of fks) {
        const parents = new Map();
        for (const row of byTable.get(fk.parent) ?? []) { const key = tuple(row.row, fk.referencedColumns); if (key !== null) { assert(!parents.has(key), 'Referenced catalog key must be unique'); parents.set(key, row); } }
        for (const child of byTable.get(fk.child) ?? []) { const key = tuple(child.row, fk.columns, fk.match); if (key === null) continue; const parent = parents.get(key); assert(parent, 'Real FK parent missing in consistent sealed snapshot:' + fk.name); edges.push({ child: child.id, parent: parent.id, fk }); }
    }
    return edges;
}
export function stronglyConnected70(nodes, edges) {
    const next = new Map(nodes.map(n => [n, []])); for (const edge of edges) { assert(next.has(edge.child) && next.has(edge.parent)); next.get(edge.child).push(edge.parent); }
    let seq = 0; const indices = new Map(), low = new Map(), stack = [], active = new Set(), groups = [];
    function visit(node) { indices.set(node, seq); low.set(node, seq++); stack.push(node); active.add(node);
        for (const parent of next.get(node)) { if (!indices.has(parent)) { visit(parent); low.set(node, Math.min(low.get(node), low.get(parent))); } else if (active.has(parent)) low.set(node, Math.min(low.get(node), indices.get(parent))); }
        if (low.get(node) === indices.get(node)) { const group = []; let current; do { current = stack.pop(); active.delete(current); group.push(current); } while (current !== node); groups.push(group.sort(compare)); }
    }
    for (const node of [...nodes].sort(compare)) if (!indices.has(node)) visit(node); return groups;
}
function checkedAuthority(authority, backend, catalog, guards) {
    assert(['native', 'rust'].includes(backend)); const actual = normalizeCatalog70(catalog);
    assert.equal(actual.tables.length, 120); assert.equal(actual.foreignKeys.length, 294); assert.equal(actual.structuralHash, authority.structuralHash, 'Exact original columns/PK/FK/CHECK/index catalog required');
    assert.equal(authority.namespace, 'poms-r4def'); assert.equal(authority.base, '756d813c9578090fcf8e56821acce01b46b40420');
    assert.deepEqual(authority.borrowedOriginals, BORROWED_ORIGINALS70, 'Exactly the three authorized borrowed originals, no general seed restoration');
    assert.deepEqual(guards.triggers, authority.immutableUpdateTriggers, 'Five exact enabled UPDATE triggers must remain installed'); assert.equal(guards.triggers.length, 5); assert.deepEqual(guards.policies, [], 'All temporary RLS gate policies must already be exactly restored');
    assert.equal(hash(JSON.stringify(guards.acl)), authority.backend[backend].aclHash, 'Exact original table ACL/RLS flags required');
    assert(guards.supplement && Object.keys(guards.supplement).length > 0, 'Root must also seal functions/schema/column ACL and full DDL supplement');
    return actual;
}
export function validateCyclePolicy70(policy, catalog, triggers) {
    const { table, columns } = policy; assert(Array.isArray(columns) && columns.length > 0); ident(table);
    assert(CYCLE_POINTERS70.some(p => p.table === table && JSON.stringify([...p.columns].sort(compare)) === JSON.stringify([...columns].sort(compare))), 'Only the exact frozen cycle-pointer groups, never arbitrary nullable columns');
    assert(!triggers.some(t => t.table_name === table && /\bUPDATE\b/.test(t.definition)), 'Never UPDATE any immutable/unknown trigger table');
    for (const column of columns) assert(catalog.columns.some(c => c.table_name === table && c.column_name === column && c.is_nullable === 'YES'), 'Only formally nullable cycle pointer columns');
    const affected = catalog.constraints.filter(c => c.table_name === table && c.contype === 'c' && columns.some(name => new RegExp('\\b' + name + '\\b').test(c.definition)));
    assert.deepEqual(affected.map(c => ({ name: c.conname, definition: c.definition })), policy.affectedChecks, 'Every touched CHECK must have an exact reviewed rule');
    if (affected.length) {
        assert.equal(policy.rule, 'preparation-amendment-pair-null'); assert.deepEqual([...columns].sort(compare), ['before_snapshot_id', 'contract_amendment_id']); assert.equal(affected.length, 1); assert.equal(affected[0].conname, 'chk_r4d_preparation_amendment');
    } else assert.equal(policy.rule, 'nullable-pointers-with-no-touched-CHECK');
    assert(!['project_actual_cost_record', 'cost_stage_attribution_snapshot', 'cost_governance_evidence'].includes(table), 'Cost stage/status/evidence is never a cycle-break target');
    return true;
}
export function analyzePotentialSchema70(catalog, authority) {
    const n = normalizeCatalog70(catalog); for (const p of authority.cyclePolicies) validateCyclePolicy70(p, catalog, authority.immutableUpdateTriggers);
    const edges = n.foreignKeys.filter(f => f.child !== f.parent).map(f => ({ child: f.child, parent: f.parent, fk: f }));
    const before = stronglyConnected70(n.tables, edges).filter(g => g.length > 1);
    const cut = edges.filter(e => !authority.cyclePolicies.some(p => p.table === e.child && e.fk.columns.some(c => p.columns.includes(c))));
    const after = stronglyConnected70(n.tables, cut).filter(g => g.length > 1);
    return { classification: 'STATIC catalog potential graph only; no actual business row graph supplied', tables: n.tables.length, foreignKeys: n.foreignKeys.length, beforeCrossTableSCCs: before, afterWhitelistedPointerCutsCrossTableSCCs: after, selfForeignKeysRequireActualChildFirstOrder: n.foreignKeys.filter(f => f.child === f.parent).map(f => ({ table: f.child, constraint: f.name })), actualRowsPlanned: false, cleanupExecuted: false };
}
function admittedScope(input) {
    const s = input.scope; assert(s && s.namespace === 'poms-r4def' && s.base === '756d813c9578090fcf8e56821acce01b46b40420' && s.host === '127.0.0.1' && s.hostPort === 25433 && s.serverPort === 15432 && s.serverVersionNum === 150012 && s.isolated === 'on' && s.instanceId && s.environmentReceiptId);
    assert.equal(s.database, 'poms_r4def_' + input.backend); assert(s.databaseOid && s.containerId); return clone(s);
}
function publicOperation(op) { return { id: op.id, kind: op.kind, table: op.table, primaryKey: op.primaryKey, columns: op.columns, expectedBefore: op.expectedBefore, expectedAfter: op.expectedAfter, removedEdges: op.removedEdges, checkRule: op.checkRule, expectedRows: op.expectedRows }; }
function currentPlanHash(plan) { return jsonHash({ scope: plan.scope, backend: plan.backend, sealedLiveGraphHash: plan.sealedLiveGraphHash, catalogHash: plan.catalogHash, guardsHash: plan.guardsHash, operations: plan.operations.map(publicOperation) }); }
export function planDatabaseTeardown70(input) {
    const { authority, catalog, guards, baselineRows, liveRows, ownershipLedger, backend } = input, scope = admittedScope(input);
    const n = checkedAuthority(authority, backend, catalog, guards), baseline = keyedGraph(baselineRows, catalog), live = keyedGraph(liveRows, catalog);
    assert.equal(baseline.records.size, 532, 'Exactly every original seed row must be present in baseline authority');
    for (const summary of authority.backend[backend].baselineSummary) { assert.equal(baselineRows[summary.table].length, summary.count); assert.equal(hash(JSON.stringify(baselineRows[summary.table])), summary.sha256, 'Actual original baseline table array must match public catalog25 raw authority'); }
    for (const policy of authority.cyclePolicies) validateCyclePolicy70(policy, catalog, guards.triggers);
    allEdges(baseline.records, n.foreignKeys);
    const modified = [], missing = [], added = [...live.records.values()].filter(r => !baseline.records.has(r.id));
    for (const original of baseline.records.values()) { const current = live.records.get(original.id); if (!current) missing.push(original); else if (current.fingerprint !== original.fingerprint) modified.push({ original, current }); }
    assert.equal(ownershipLedger.namespace, scope.namespace); assert.equal(ownershipLedger.instanceId, scope.instanceId); assert.equal(ownershipLedger.backend, backend); assert.equal(ownershipLedger.liveGraphHash, live.graphHash); assert(ownershipLedger.sealReceiptId && ownershipLedger.catalogHash === n.structuralHash);
    const ledger = new Map(); for (const own of ownershipLedger.rows) { assert(own.table && own.primaryKey && own.rowFingerprint && own.beforeAbsent === true && Array.isArray(own.receiptIds) && own.receiptIds.length > 0 && ['http-command', 'internal-producer', 'auth-fixture', 'managed-auth-audit-security'].includes(own.producerKind)); const id = own.table + ':' + JSON.stringify(stable(own.primaryKey)); assert(!ledger.has(id)); ledger.set(id, own); }
    assert.equal(ledger.size, added.length, 'Ledger must exactly cover every new PK; no prefix/table inference');
    for (const row of added) assert.equal(ledger.get(row.id)?.rowFingerprint, row.fingerprint, 'Every exact new row must be sealed as owned');
    const restored = [];
    for (const pair of modified) {
        const policy = authority.borrowedOriginals.find(p => p.backend === backend && p.table === pair.current.table && JSON.stringify(stable(p.primaryKey)) === JSON.stringify(stable(pair.current.key)) && p.action === 'restore-columns'); assert(policy, 'Unknown baseline modification must stop');
        const fields = Object.keys(pair.original.row).filter(k => JSON.stringify(canonical(pair.original.lossless[k])) !== JSON.stringify(canonical(pair.current.lossless[k])));
        assert(fields.every(f => policy.columns.includes(f)), 'Restore only specifically authorized borrowed columns');
        restored.push({ kind: 'restore-borrowed-columns', table: pair.current.table, record: pair.current, original: pair.original, columns: policy.columns, policy });
    }
    for (const row of missing) { const policy = authority.borrowedOriginals.find(p => p.backend === backend && p.table === row.table && JSON.stringify(stable(p.primaryKey)) === JSON.stringify(stable(row.key)) && p.action === 'restore-missing-original'); assert(policy, 'Unknown missing baseline row must stop'); restored.push({ kind: 'restore-missing-borrowed-original', table: row.table, original: row, policy }); }
    assert.equal(new Set(restored.map(r => r.table + ':' + JSON.stringify(stable(r.original.key)))).size, restored.length);
    const owned = new Set(added.map(r => r.id)), state = new Map([...live.records].map(([id, r]) => [id, { ...r, row: { ...r.row }, lossless: parseLossless(r.raw) }])), remaining = new Set(owned), operations = [];
    const originalEdges = allEdges(state, n.foreignKeys);
    assert(!originalEdges.some(e => !owned.has(e.child) && owned.has(e.parent)), 'A baseline/nonowned FK child may never be cascaded, nulled or deleted');
    function nextId() { return 'cleanup70-' + String(operations.length + 1).padStart(5, '0'); }
    function pushDelete(row) {
        operations.push({ id: nextId(), kind: 'delete-owned-PK', table: row.table, primaryKey: clone(row.key), expectedBefore: row.fingerprint, expectedRows: 1, rawSource: row.rawSource, ownershipReceiptIds: ledger.get(row.id).receiptIds }); remaining.delete(row.id); state.delete(row.id);
    }
    while (remaining.size) {
        const edges = allEdges(state, n.foreignKeys), incoming = new Set(edges.filter(e => remaining.has(e.child) && remaining.has(e.parent)).map(e => e.parent));
        const leaves = [...remaining].filter(id => !incoming.has(id)).sort(compare);
        if (leaves.length) { for (const id of leaves) pushDelete(state.get(id)); continue; }
        const ownEdges = edges.filter(e => remaining.has(e.child) && remaining.has(e.parent));
        const cyclic = stronglyConnected70([...remaining], ownEdges).filter(g => g.length > 1 || ownEdges.some(e => e.child === g[0] && e.parent === g[0]));
        let chosen;
        for (const policy of authority.cyclePolicies) {
            for (const id of [...remaining].sort(compare)) {
                const row = state.get(id); if (row.table !== policy.table || !policy.columns.some(c => row.row[c] !== null)) continue;
                const group = cyclic.find(g => g.includes(id)); if (!group) continue;
                const removed = ownEdges.filter(e => e.child === id && group.includes(e.parent) && e.fk.columns.some(c => policy.columns.includes(c))); if (!removed.length) continue;
                // UPDATE of a referenced composite key must not trigger hidden CASCADE
                // or violate still-live children. Drain those children first.
                if (edges.some(e => e.parent === id && e.fk.referencedColumns.some(c => policy.columns.includes(c)))) continue;
                chosen = { row, policy, removed }; break;
            }
            if (chosen) break;
        }
        if (!chosen) { const error = new Error('Unknown/non-null/CHECK/immutable/inbound-key cycle: stop; never disable constraints'); error.code = 'unknown-owned-cycle70'; error.cycleDetails = cyclic.map(group => ({ rows: group.map(id => ({ table: state.get(id).table, primaryKey: state.get(id).key })), constraints: [...new Set(ownEdges.filter(e => group.includes(e.child) && group.includes(e.parent)).map(e => e.fk.name))].sort(compare) })); throw error; }
        const { row, policy, removed } = chosen, before = row.fingerprint, rawSource = row.rawSource, id = nextId();
        for (const c of policy.columns) { row.row[c] = null; row.lossless[c] = null; }
        if (policy.rule === 'preparation-amendment-pair-null') assert(row.row.contract_amendment_id === null && row.row.before_snapshot_id === null);
        row.fingerprint = hash(JSON.stringify(canonical(row.lossless))); row.rawSource = { kind: 'actual-update-returned-raw', operationId: id };
        operations.push({ id, kind: 'clear-owned-nullable-cycle-pointers', table: row.table, primaryKey: clone(row.key), columns: [...policy.columns], expectedBefore: before, expectedAfter: row.fingerprint, rawSource, removedEdges: removed.map(e => ({ child: e.child, parent: e.parent, constraint: e.fk.name })), checkRule: policy.rule, expectedRows: 1 });
    }
    for (const restore of restored.sort((a, b) => compare(a.table, b.table))) {
        const before = restore.record?.fingerprint ?? null, original = restore.original;
        operations.push({ id: nextId(), kind: restore.kind, table: restore.table, primaryKey: clone(original.key), columns: restore.columns, expectedBefore: before, expectedAfter: original.fingerprint, expectedRows: 1, rawSource: restore.record?.rawSource, originalRaw: original.raw, insertColumns: n.tables.includes(original.table) ? catalog.columns.filter(c => c.table_name === original.table).sort((a, b) => a.ordinal_position - b.ordinal_position).map(c => c.column_name) : [] });
    }
    const plan = { kind: 'owned-only-exact-PK-teardown70-plan', status: 'planned-not-executed', scope, backend, baselineGraphHash: baseline.graphHash, sealedLiveGraphHash: live.graphHash, catalogHash: n.structuralHash, guardsHash: jsonHash(guards), baselineSummary: authority.backend[backend].baselineSummary, operations, expectedDeleted: added.length, expectedRestored: restored.length, originalBaselineRows: 532, allTables: n.tables, noOp: operations.length === 0, ownershipSealReceiptId: ownershipLedger.sealReceiptId, baselineRows, catalog, guards, authority, actualRowGraphValidatedFromInjectedRows: true, DBExecuted: false, G3Certified: false, G4Certified: false };
    plan.planHash = currentPlanHash(plan); return plan;
}

export function privateStatement70(operation, catalog, previousOutputs = {}) {
    const table = qtable(operation.table), n = normalizeCatalog70(catalog), pk = n.primaryKeys.get(operation.table); assert(pk);
    let currentRaw;
    if (operation.rawSource?.kind === 'sealed-live-raw') currentRaw = operation.rawSource.raw;
    else if (operation.rawSource?.kind === 'actual-update-returned-raw') currentRaw = previousOutputs[operation.rawSource.operationId]?.raw;
    if (operation.kind !== 'restore-missing-borrowed-original') assert.equal(rowFingerprint70(currentRaw), operation.expectedBefore, 'Actual expected-before raw source is mandatory; never synthesize a rounded row');
    const predicate = pk.map(c => `t.${ident(c)} IS NOT DISTINCT FROM e.${ident(c)}`).join(' AND ') + ' AND to_jsonb(t)=$1::jsonb';
    let text, values;
    if (operation.kind === 'delete-owned-PK') { text = `DELETE FROM ${table} t USING jsonb_populate_record(NULL::${table},$1::jsonb) e WHERE ${predicate} RETURNING to_jsonb(t)::text AS raw`; values = [currentRaw]; }
    else if (operation.kind === 'clear-owned-nullable-cycle-pointers') { text = `UPDATE ${table} t SET ${operation.columns.map(c => ident(c) + '=NULL').join(',')} FROM jsonb_populate_record(NULL::${table},$1::jsonb) e WHERE ${predicate} RETURNING to_jsonb(t)::text AS raw`; values = [currentRaw]; }
    else if (operation.kind === 'restore-borrowed-columns') { text = `UPDATE ${table} t SET ${operation.columns.map(c => `${ident(c)}=o.${ident(c)}`).join(',')} FROM jsonb_populate_record(NULL::${table},$1::jsonb) e,jsonb_populate_record(NULL::${table},$2::jsonb) o WHERE ${predicate} RETURNING to_jsonb(t)::text AS raw`; values = [currentRaw, operation.originalRaw]; }
    else { assert.equal(operation.kind, 'restore-missing-borrowed-original'); assert.equal(operation.table, 'user_role_assignment'); const columns = operation.insertColumns; text = `INSERT INTO ${table} AS restored(${columns.map(ident).join(',')}) SELECT ${columns.map(c => 'o.' + ident(c)).join(',')} FROM jsonb_populate_record(NULL::${table},$1::jsonb) o WHERE NOT EXISTS(SELECT 1 FROM ${table} t WHERE ${pk.map(c => `t.${ident(c)} IS NOT DISTINCT FROM o.${ident(c)}`).join(' AND ')}) RETURNING to_jsonb(restored)::text AS raw`; values = [operation.originalRaw]; }
    return { text, values, expectedRows: 1, keepPrivate: true };
}
export function assertOperationResult70(operation, result) {
    assert.equal(result.rowCount, 1); assert.equal(result.rows?.length, 1); const raw = result.rows[0].raw;
    assert.equal(rowFingerprint70(raw), operation.kind === 'delete-owned-PK' ? operation.expectedBefore : operation.expectedAfter, 'Exact guarded row/allowed null changes/original restore must match'); return { raw, rowFingerprint: rowFingerprint70(raw) };
}
export function publicPlan70(plan) { return { kind: plan.kind, status: plan.status, backend: plan.backend, scope: plan.scope, planHash: plan.planHash, sealedLiveGraphHash: plan.sealedLiveGraphHash, baselineGraphHash: plan.baselineGraphHash, expectedDeleted: plan.expectedDeleted, expectedRestored: plan.expectedRestored, originalBaselineRows: 532, operations: plan.operations.map(publicOperation), noOp: plan.noOp, actualRowGraphValidatedFromInjectedRows: plan.actualRowGraphValidatedFromInjectedRows, rawRowsOrCredentialsPublished: false, DBExecuted: false, G3Certified: false, G4Certified: false }; }
export function snapshotFingerprint70(rows, catalog) { return keyedGraph(rows, catalog).graphHash; }
export function listNewRowsForOwnership70({ baselineRows, liveRows, catalog }) {
    const baseline = keyedGraph(baselineRows, catalog), live = keyedGraph(liveRows, catalog);
    return [...live.records.values()].filter(r => !baseline.records.has(r.id)).map(r => ({ table: r.table, primaryKey: clone(r.key), rowFingerprint: r.fingerprint, beforeAbsent: true, ownershipReceiptRequired: true }));
}
export function assertApplyAdmission70(plan, { liveRows, catalog, guards, stopped, receiptId }) {
    assert.equal(currentPlanHash(plan), plan.planHash, 'Reviewable sealed operation plan changed');
    assert(receiptId && stopped?.allOwnedAPIsStopped === true && stopped.allBatchPortsReleased === true && stopped.testGatesRestored === true && stopped.latestLedgerFrozen === true && stopped.noUnknownConnectionsOrWriters === true && stopped.instanceId === plan.scope.instanceId);
    assert.equal(snapshotFingerprint70(liveRows, catalog), plan.sealedLiveGraphHash); assert.equal(normalizeCatalog70(catalog).structuralHash, plan.catalogHash); assert.equal(jsonHash(guards), plan.guardsHash); return { admitted: true, status: 'admitted-not-executed', receiptId, planHash: plan.planHash };
}
export function assertRestored70(plan, { liveRows, catalog, guards, receiptId }) {
    assert(receiptId); const live = keyedGraph(liveRows, catalog); assert.equal(live.records.size, 532); assert.equal(live.graphHash, plan.baselineGraphHash, 'Every one of all120 tables must exactly match original532 seed facts'); assert.equal(live.structuralHash, plan.catalogHash); assert.equal(jsonHash(guards), plan.guardsHash); return { baselineExact: true, tables: 120, rows: 532, graphHash: live.graphHash, catalogHash: live.structuralHash, guardsHash: jsonHash(guards), receiptId };
}
export function assertTwoNoOps70(plan, reads) {
    assert.equal(reads.length, 2); assert(reads[0].receiptId !== reads[1].receiptId, 'Two distinct actual post-commit read-only passes');
    return reads.map(read => { assert.deepEqual(read.executedDML, [], 'Verification passes issue no writes'); return assertRestored70(plan, read); });
}

// Pure environment intents. Root alone captures/hashes/copies/unlinks/signals.
export function planOwnedObjects70({ instanceId, namespace, objectRoots, baselineFiles, liveFiles, evidenceArchiveRoot, ownershipReceiptId }) {
    assert.equal(namespace, 'poms-r4def'); assert(instanceId && ownershipReceiptId); assert.deepEqual([...objectRoots].sort(compare), ['/home/wangzishi/.local/share/poms-r4def/objects/native', '/home/wangzishi/.local/share/poms-r4def/objects/rust']); assert.equal(baselineFiles.length, 0, 'Only new originally-empty owned object roots');
    assert(evidenceArchiveRoot.startsWith('/home/wangzishi/.local/share/poms-r4def/private/cleanup70-') && path.posix.normalize(evidenceArchiveRoot) === evidenceArchiveRoot);
    assert.equal(new Set(liveFiles.map(f => f.path)).size, liveFiles.length, 'Each exact owned file appears once');
    return liveFiles.map(file => { assert(path.posix.isAbsolute(file.path) && path.posix.normalize(file.path) === file.path && file.realPath === file.path && file.regular === true && file.symlink === false && file.parentSymlinks === false && file.nlink === 1 && /^[0-9a-f]{64}$/.test(file.sha256) && Number.isSafeInteger(file.bytes) && file.bytes >= 0 && file.dev && file.ino); const root = objectRoots.find(root => file.path.startsWith(root + '/')); assert(root, 'No unlink outside actual new namespace object roots'); const backend = root.endsWith('/native') ? 'native' : 'rust'; const relative = file.path.slice(root.length + 1); assert(!relative.split('/').includes('..'));
        return { kind: 'preserve-verify-then-unlink-one-owned-file', source: file.path, destination: evidenceArchiveRoot + '/' + backend + '/' + relative, expected: { sha256: file.sha256, bytes: file.bytes, dev: file.dev, ino: file.ino }, requireExclusiveNewDestination: true, requireOriginalAndCopiedSHAEqualBeforeUnlink: true, recursiveDelete: false, status: 'not-run', ownershipReceiptId };
    });
}
export function assertObjectUnlinkAdmission70(intent, { live, copied, DBBaselinesRestored, allAPIsStopped, receiptId }) {
    assert(DBBaselinesRestored && allAPIsStopped && receiptId); assert.equal(live.path, intent.source); assert.equal(copied.path, intent.destination); assert.equal(live.realPath, intent.source); assert.equal(copied.realPath, intent.destination); assert(live.regular && !live.symlink && !live.parentSymlinks && live.nlink === 1); for (const k of ['sha256', 'bytes']) { assert.equal(live[k], intent.expected[k]); assert.equal(copied[k], intent.expected[k]); } assert.equal(live.dev, intent.expected.dev); assert.equal(live.ino, intent.expected.ino); assert(copied.createdExclusively && copied.regular && !copied.symlink && copied.parentSymlinks === false && copied.nlink === 1); return { admitted: true, execution: 'not-run', exactUnlinkPath: intent.source, receiptId };
}
export function assertOwnedObjectsCleared70({ intents, copiedFiles, unlinkReceipts, liveFiles, receiptId }) {
    assert(receiptId); assert.deepEqual(liveFiles, [], 'Fresh actual owned object-root inventory must be empty'); assert.equal(unlinkReceipts.length, intents.length);
    for (const intent of intents) { const copied = copiedFiles.find(x => x.path === intent.destination), removed = unlinkReceipts.find(x => x.path === intent.source); assert(copied && removed?.unlinked === true && removed.receiptId); assert.equal(copied.sha256, intent.expected.sha256); assert.equal(copied.bytes, intent.expected.bytes); }
    return { objectsCleared: true, preservedCopies: intents.length, recursiveDeleteUsed: false, privateAndVolumeRetained: true, receiptId };
}
export function planOwnedStops70({ instanceId, records, live, receiptId }) {
    assert(instanceId && receiptId); const seen = new Set();
    return records.map(record => { assert(record.namespace === 'poms-r4def' && record.instanceId === instanceId && record.ownershipReceiptId && Number.isSafeInteger(record.pid) && record.pid > 0 && !seen.has(record.pid)); seen.add(record.pid); const actual = live.find(x => x.pid === record.pid); assert(actual, 'Actual process observation required'); for (const k of ['startIdentity', 'executableSha256', 'argvSha256']) assert(record[k] && actual[k] === record[k], 'No PID reuse/command mismatch signaling'); for (const k of ['executableSha256', 'argvSha256']) assert(/^[0-9a-f]{64}$/.test(record[k])); assert.deepEqual(actual.loopbackPorts, record.loopbackPorts); assert(record.loopbackPorts.length > 0 && record.loopbackPorts.every(p => p.host === '127.0.0.1' && [31341, 31342, 31343, 44451].includes(p.port))); return { kind: 'stop-only-exact-owned-process', pid: record.pid, signal: 'SIGTERM', expectedStartIdentity: record.startIdentity, expectedExecutableSha256: record.executableSha256, expectedArgvSha256: record.argvSha256, ports: record.loopbackPorts, processNameKillForbidden: true, receiptId, status: 'not-run' }; });
}
export function planOwnedContainerStop70({ scope, observedContainer, restoredDatabases, objectsCleared, APIsStopped, receiptId }) {
    assert(receiptId && APIsStopped === true && objectsCleared?.objectsCleared === true); assert.equal(scope.namespace, 'poms-r4def'); assert.equal(scope.base, '756d813c9578090fcf8e56821acce01b46b40420');
    assert.equal(observedContainer.id, scope.containerId); assert.equal(observedContainer.name, 'poms-r4def-pg15'); assert.equal(observedContainer.scopeLabel, scope.namespace); assert.equal(observedContainer.baseLabel, scope.base); assert.equal(observedContainer.volume, 'poms-r4def-pg15-data'); assert.equal(observedContainer.host, '127.0.0.1'); assert.equal(observedContainer.hostPort, 25433); assert.equal(observedContainer.containerPort, 15432);
    assert.deepEqual([...restoredDatabases.map(x => x.backend)].sort(compare), ['native', 'rust']); for (const restored of restoredDatabases) assert(restored.noOpPasses === 2 && restored.tables === 120 && restored.rows === 532 && restored.baselineExact === true && restored.receiptId);
    return { kind: 'stop-only-owned-PG15-container-retain-volume-and-private', container: observedContainer.name, expectedContainerId: scope.containerId, removeContainer: false, removeVolume: false, privateRetained: true, status: 'not-run', receiptId };
}
