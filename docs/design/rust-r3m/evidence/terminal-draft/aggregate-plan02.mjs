// Pure aggregate ownership classifier. No filesystem, private, HTTP, PG or Git.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
export const sha = v => createHash('sha256').update(v).digest('hex');
export const DELETE_ORDER = Object.freeze(['business_discussion_comment','business_discussion_thread','project_archive_record','project_completion_record','acceptance_record','project_handover','contract_term_snapshot','approval_summary_snapshot','approval_summary_package_definition','contract','todo_item','sales_follow_up_record','project_pricing_margin_condition_item','project_pricing_margin_review','project_bid_commercial_material_item','project_bid_commercial_timeline_item','project_bid_commercial_process','project_technical_scope_item','project_technical_risk_item','project_technical_cost_item','project_technical_cost_package','opportunity_stakeholder','competitor_intelligence_record','sales_discovery_record','lead_score_snapshot','lead_score_override','lead_owner_assignment_record','attachment_upload_session','attachment_link','attachment','project_owner_reassignment_record','project','lead','customer_contact','customer_alias','customer','dictionary_item','audit_log','security_event','auth_session','role_permission_assignment','user_role_assignment','user_org_membership','local_credential','platform_user','org_unit','role','business_number_sequence']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const identifier = /^[a-z_][a-z_0-9]*$/;
const SCOPE = new Set(['customer', 'project', 'lead']);
const GUARD_EVENTS = new Set(['auth.session.invalid', 'auth.csrf.failed', 'authz.permission.denied']);
export function primaryKeys(value) {
  const keys = Array.isArray(value) ? value : value === '{}' ? [] : value.slice(1, -1).split(',').map(s => s.replaceAll('"', ''));
  assert(keys.every(k => identifier.test(k))); assert.equal(new Set(keys).size, keys.length); return keys;
}
function tuple(row, columns) {
  return JSON.stringify(columns.map(column => { assert(Object.hasOwn(row, column), 'Missing key/foreign-key column ' + column); const v = row[column]; if (typeof v === 'number') assert(Number.isSafeInteger(v), 'Unsafe numeric identity'); return v; }));
}
export function rowIdentity(table, pk, row) { assert(pk.length); for (const k of pk) assert(row[k] !== null && row[k] !== undefined); return table + '\0' + tuple(row, pk); }
export function safeIdentity(record) { return { table: record.table, primaryKeyColumns: record.pk, primaryKeySha256: sha(record.nodeId) }; }
function numberRow(row, periods, specs) {
  assert(SCOPE.has(row.scope), 'Unapproved independent-number scope'); assert(periods.includes(row.period), 'Unapproved number period');
  const spec = specs[row.scope]; assert(spec); assert.equal(row.prefix, spec.prefix); assert.equal(row.padding, spec.padding); assert.equal(row.description, spec.description);
  assert(Number.isSafeInteger(row.next_value) && row.next_value >= 1); assert(Number.isSafeInteger(row.row_version) && row.row_version >= 1); assert(uuid.test(row.id));
}
function counterChange(before, after, periods, specs) {
  numberRow(after, periods, specs); assert.equal(after.scope, before.scope); assert.equal(after.period, before.period);
  assert(after.next_value >= before.next_value, 'Number allocator cannot go backwards before terminal restoration');
  // The two unchanged allocators update these five columns. They do not update
  // row_version, identity, scope/period or created_at.
  for (const k of Object.keys(before)) if (!['next_value','prefix','padding','description','updated_at'].includes(k)) assert.deepEqual(after[k], before[k], 'Unexpected changed sequence field ' + k);
  assert.deepEqual(Object.keys(after).sort(), Object.keys(before).sort());
}

export function classifyAggregate({ baseline, current, actors, foreignKeys, guardRequests = [], allowedNumberPeriods, numberSpecs }) {
  assert.equal(baseline.length, 107); assert.equal(current.length, 107);
  assert(Array.isArray(allowedNumberPeriods) && allowedNumberPeriods.length > 0 && allowedNumberPeriods.every(p => /^\d{4}$/.test(p)));
  const baselineMap = new Map(baseline.map(t => [t.name, { ...t, pk: primaryKeys(t.pk) }])); assert.equal(baselineMap.size, 107);
  const currentMap = new Map(current.map(t => [t.name, { ...t, pk: primaryKeys(t.pk) }])); assert.equal(currentMap.size, 107); assert.deepEqual([...currentMap.keys()].sort(), [...baselineMap.keys()].sort());
  const added = new Map(), allRows = new Map(), changedSeedRows = [], baselineActors = {};
  for (const table of ['platform_user','org_unit','role']) baselineActors[table] = new Set(baselineMap.get(table).rows.map(raw => JSON.parse(raw).id));
  for (const [name, reference] of baselineMap) {
    assert(identifier.test(name)); const actual = currentMap.get(name); assert.deepEqual(actual.pk, reference.pk);
    if (!reference.pk.length) {
      assert.deepEqual(actual.rows, reference.rows, 'Keyless original table must remain exact');
      for (const [index, raw] of actual.rows.entries()) { const nodeId = name + '\0keyless\0' + index + '-' + sha(raw); allRows.set(nodeId, { table:name, pk:[], row:JSON.parse(raw), raw, nodeId, isSeed:true }); }
      continue;
    }
    const before = new Map(reference.rows.map(raw => { const row = JSON.parse(raw); return [rowIdentity(name, reference.pk, row), raw]; })); assert.equal(before.size, reference.rows.length);
    const now = new Map();
    for (const raw of actual.rows) {
      const row = JSON.parse(raw), nodeId = rowIdentity(name, reference.pk, row), record = { table: name, pk: reference.pk, row, raw, nodeId, isSeed: before.has(nodeId) };
      assert(!now.has(nodeId), 'Duplicate current primary key'); now.set(nodeId, record); allRows.set(nodeId, record);
      if (!before.has(nodeId)) { assert(DELETE_ORDER.includes(name), 'New row outside the complete approved delete-table set: ' + name); added.set(nodeId, record); }
      else if (before.get(nodeId) !== raw) {
        assert.equal(name, 'business_number_sequence', 'Any non-number changed seed blocks all cleanup');
        counterChange(JSON.parse(before.get(nodeId)), row, allowedNumberPeriods, numberSpecs);
        changedSeedRows.push({ table: name, pk: reference.pk, nodeId, before: before.get(nodeId), current: raw });
      }
    }
    for (const nodeId of before.keys()) assert(now.has(nodeId), 'An original seed row is missing');
  }
  const actorMaps = { platform_user: new Map(), org_unit: new Map(), role: new Map() }, registeredUsers = new Map();
  for (const a of actors) {
    assert(uuid.test(a.runId)); for (const k of ['userId','orgId','roleId']) assert(uuid.test(a[k]));
    const usernamePrefix = 'r3m_' + a.runId.replaceAll('-', '') + '_';
    assert(a.username.startsWith(usernamePrefix));
    const usernameSuffix = a.username.slice(usernamePrefix.length);
    // context03/04 and guard executors use the exact label. The unchanged
    // fixture-actor03 helper uses exactly randomUUID().slice(0,8), lower hex.
    // This validates an already registered identity; it never registers a row
    // merely because that row has a plausible prefix or suffix.
    assert(usernameSuffix === a.label || /^[a-f0-9]{8}$/.test(usernameSuffix), 'Unapproved registered actor username suffix');
    for (const [table, key] of [['platform_user','userId'],['org_unit','orgId'],['role','roleId']]) {
      assert(!baselineActors[table].has(a[key]), 'A registered actor must never lend a seed ID as an ownership root');
      const prior = actorMaps[table].get(a[key]);
      if (prior) assert.deepEqual({ runId: prior.runId, userId: prior.userId, orgId: prior.orgId, roleId: prior.roleId, username: prior.username, label: prior.label }, { runId: a.runId, userId: a.userId, orgId: a.orgId, roleId: a.roleId, username: a.username, label: a.label }, 'Conflicting registration for actor identity');
      else actorMaps[table].set(a[key], a);
    }
    registeredUsers.set(a.userId, a);
  }
  const owned = new Map();
  const give = (record, proof) => { assert(!record.isSeed); assert(!owned.has(record.nodeId)); owned.set(record.nodeId, { ...proof, depth: proof.depth ?? 0 }); };
  for (const record of added.values()) {
    if (!Object.hasOwn(actorMaps, record.table)) continue;
    const actor = actorMaps[record.table].get(record.row.id); assert(actor, 'Unregistered new actor ID blocks cleanup, even with a current-batch-looking prefix');
    if (record.table === 'platform_user') assert.equal(record.row.username, actor.username);
    const labelled = actor.username === 'r3m_' + actor.runId.replaceAll('-', '') + '_' + actor.label;
    if (record.table === 'org_unit') assert.equal(record.row.code, 'r3m-' + actor.runId + '-' + (labelled ? actor.label : actor.orgId.slice(0,8)), 'Exact registered organization code from its source naming rule');
    if (record.table === 'role') assert.equal(record.row.role_key, 'r3m-' + actor.runId + '-' + (labelled ? actor.label : actor.roleId.slice(0,8)), 'Exact registered role key from its source naming rule');
    give(record, { kind: 'exact-registered-actor', runId: actor.runId, actorId: record.row.id, registration: actor.registration });
  }
  const presentOwnedUsers = new Set([...added.values()].filter(r => r.table === 'platform_user' && owned.has(r.nodeId)).map(r => r.row.id));
  const requestMap = new Map();
  for (const request of guardRequests) {
    assert(uuid.test(request.runId)); assert.equal(request.backend, request.targetBackend);
    assert(typeof request.requestId === 'string' && request.requestId.length > 0); assert(request.rawWireVerified === true);
    const key = JSON.stringify([request.requestId, request.method, request.route]); assert(!requestMap.has(key), 'Duplicate guard request source'); requestMap.set(key, request);
  }
  const usedGuardRequests = new Map();
  for (const record of added.values()) {
    if (owned.has(record.nodeId)) continue;
    if (record.table === 'business_number_sequence') { numberRow(record.row, allowedNumberPeriods, numberSpecs); give(record, { kind: 'approved-independent-number-allocation', scope: record.row.scope, period: record.row.period }); continue; }
    const attribution = ['created_by', 'updated_by'].find(k => presentOwnedUsers.has(record.row[k]));
    if (attribution) { give(record, { kind: 'registered-own-actor-attribution', column: attribution, actorId: record.row[attribution] }); continue; }
    if (record.table === 'security_event' && record.row.actor_id === null && GUARD_EVENTS.has(record.row.event_type)) {
      const key = JSON.stringify([record.row.request_id, record.row.method, record.row.path]), source = requestMap.get(key);
      if (source) { assert(!usedGuardRequests.has(key), 'One registered source request must not silently own duplicate security rows'); usedGuardRequests.set(key, record.nodeId); give(record, { kind: 'actual-current-batch-guard-request', eventType: record.row.event_type, report: source.report, eventIndex: source.eventIndex, requestId: source.requestId, method: source.method, route: source.route, rawWire: source.rawWire, reportCompleted: source.reportCompleted, cleanupOwnershipOnly: true, acceptanceClaim: false, partialMayEstablishCleanupOwnershipOnly: !source.reportCompleted }); }
    }
  }
  // Build all real foreign-key edges from exact current row values. Seed rows
  // are metadata endpoints only, never ownership roots. Propagation is only
  // child -> already owned NEW parent; it never marks a parent via its child.
  const fkIndexes = new Map(), edges = new Map(), allEdges = [];
  for (const fk of foreignKeys) {
    assert(identifier.test(fk.table) && identifier.test(fk.refTable)); assert.equal(fk.refSchema, 'poms');
    assert(baselineMap.has(fk.table) && baselineMap.has(fk.refTable)); assert(fk.columns.length && fk.columns.length === fk.refColumns.length); assert(fk.columns.every(k => identifier.test(k)) && fk.refColumns.every(k => identifier.test(k)));
    const indexKey = JSON.stringify([fk.refTable, fk.refColumns]);
    if (!fkIndexes.has(indexKey)) {
      const index = new Map();
      for (const target of allRows.values()) if (target.table === fk.refTable && fk.refColumns.every(c => target.row[c] !== null)) { const key = tuple(target.row, fk.refColumns); assert(!index.has(key), 'Referenced FK unique key duplicated'); index.set(key, target); }
      fkIndexes.set(indexKey, index);
    }
    for (const child of allRows.values()) if (child.table === fk.table) {
      const values = fk.columns.map(c => child.row[c]); assert(values.every(v => v !== undefined));
      if (values.some(v => v === null)) continue; // Existing product MATCH SIMPLE.
      const parent = fkIndexes.get(indexKey).get(tuple(child.row, fk.columns)); assert(parent, 'Actual FK has no current target');
      if (child.isSeed && !parent.isSeed) assert.fail('An original seed FK points to a new candidate deletion row');
      const edge = { fk: fk.name, child: child.nodeId, parent: parent.nodeId, table: fk.table, refTable: fk.refTable, columns: fk.columns, refColumns: fk.refColumns, parentIsSeed: parent.isSeed };
      allEdges.push(edge); if (!child.isSeed) { if (!edges.has(child.nodeId)) edges.set(child.nodeId, []); edges.get(child.nodeId).push(edge); }
    }
  }
  let iterations = 0, grew;
  do {
    grew = false; iterations++; assert(iterations <= added.size + 1, 'Ownership must be monotone and bounded');
    for (const record of added.values()) if (!owned.has(record.nodeId)) {
      const edge = (edges.get(record.nodeId) || []).find(e => !e.parentIsSeed && owned.has(e.parent));
      if (edge) { give(record, { kind: 'actual-FK-to-already-owned-new-parent', fk: edge.fk, parent: edge.parent, depth: owned.get(edge.parent).depth + 1 }); grew = true; }
    }
  } while (grew);
  const orphans = [...added.values()].filter(r => !owned.has(r.nodeId)).map(r => ({ ...safeIdentity(r), reason: 'No registered own actor or rooted actual-FK path; seed, self-only and unrooted cycles cannot certify ownership', foreignKeys: (edges.get(r.nodeId) || []).map(e => ({ fk: e.fk, targetTable: e.refTable, targetIsSeed: e.parentIsSeed, targetOwned: owned.has(e.parent), targetPrimaryKeySha256: sha(e.parent) })) }));
  const deletionOrderViolations = [];
  for (const edge of allEdges) if (owned.has(edge.parent)) {
    assert(owned.has(edge.child), 'Deleting an owned parent cannot affect an unowned/seed child');
    if (edge.table === edge.refTable) continue; // One whole-table statement.
    const released = edge.table === 'lead' && edge.columns.length === 1 && edge.columns[0] === 'converted_project_id' && edge.refTable === 'project'
      || edge.table === 'project' && edge.columns.length === 1 && edge.columns[0] === 'source_lead_id' && edge.refTable === 'lead';
    if (!released && DELETE_ORDER.indexOf(edge.table) >= DELETE_ORDER.indexOf(edge.refTable)) deletionOrderViolations.push({ fk: edge.fk, childTable: edge.table, parentTable: edge.refTable });
  }
  return { added, allRows, changedSeedRows, owned, orphans, iterations, allEdges, deletionOrderViolations, usedGuardRequests: [...usedGuardRequests.keys()], ready: orphans.length === 0 && deletionOrderViolations.length === 0 };
}

export function publicPlan(plan) {
  const byTable = new Map(), rootCounts = {};
  for (const record of plan.added.values()) byTable.set(record.table, (byTable.get(record.table) || 0) + 1);
  for (const proof of plan.owned.values()) rootCounts[proof.kind] = (rootCounts[proof.kind] || 0) + 1;
  return { ready: plan.ready, addedRows: plan.added.size, ownedRows: plan.owned.size, tables: [...byTable].sort(([a], [b]) => a.localeCompare(b)).map(([table, rows]) => ({ table, rows })), ownershipKinds: rootCounts, ownershipIterations: plan.iterations, seedChanges: plan.changedSeedRows.map(c => ({ table: c.table, primaryKeySha256: sha(c.nodeId), scope: JSON.parse(c.before).scope, period: JSON.parse(c.before).period, beforeSha256: sha(c.before), currentSha256: sha(c.current) })), orphans: plan.orphans, deletionOrderViolations: plan.deletionOrderViolations, ownership: [...plan.owned].map(([nodeId, proof]) => ({ ...safeIdentity(plan.added.get(nodeId)), proof: proof.kind === 'actual-FK-to-already-owned-new-parent' ? { ...proof, parent: undefined, parentPrimaryKeySha256: sha(proof.parent) } : proof })), seedNeverOwnershipRoot: true, cyclicUnrootedRowsNeverSelfCertify: true, rememberIdsUsed: false };
}
