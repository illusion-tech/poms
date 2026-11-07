import fs from 'node:fs';
import net from 'node:net';
import assert from 'node:assert/strict';
import { ownedFile, guard } from './context.mjs';
import { sha, quote, keyOf, deleteOrder, foreignReferences, exactDeleteCTE } from './pure.mjs';
import { capture, loadSnapshot, readRows, difference, catalog } from './snapshot.mjs';
import { changedColumns } from './ledger.mjs';
import { objectDiff, objectPath, objectRoot, captureObjects } from './objects.mjs';

function actualCycleEvidence(ctx) {
  const file = ctx.options['cycle-sandbox-receipt'] ?? ctx.state.cycleSandbox?.file;
  if (!file) return null;
  assert(file.startsWith(ctx.private + '/business/'));
  const bytes = ownedFile(file), expected = ctx.options['cycle-sandbox-sha'] ?? ctx.state.cycleSandbox?.rawBytesSha256;
  assert.equal(sha(bytes), expected, 'Exact Root-observed sandbox raw SHA required');
  const report = JSON.parse(bytes);
  assert.equal(report.kind, 'actual-PG15-TEMP-only-RESTRICT-cycle-sandbox'); assert(report.allTEMPObjectsRolledBack && report.businessRowsChanged === false && report.catalogChanged === false);
  for (const name of ['intertable-cycle-a-then-b-cte', 'intertable-cycle-b-then-a-cte', 'self-cycle-single-exact-delete']) {
    const row = report.cases.find(c => c.name === name); assert(row?.commandAcknowledged === true && row.sqlState === null && row.exactOwnedCycleDeleted === true && row.originalTEMPStructureRestoredAfterCase === true);
  }
  const guard = report.cases.find(c => c.name === 'foreign-row-protects-owned-cycle'); assert(guard?.sqlState === '23503' && guard.foreignReferencePreserved === true);
  const beforeBytes = ownedFile(report.before.file); assert.equal(sha(beforeBytes), report.before.rawBytesSha256); const before = JSON.parse(beforeBytes);
  assert.equal(before.marker, ctx.identity.marker); assert.deepEqual(Object.keys(before.databases), ctx.databases);
  return { file, rawBytesSha256: sha(bytes), sameNamespaceMarker: true, actualMutualAndSelfRIObserved: true, actualForeignRIRefusalObserved: true, allTEMPRolledBack: true };
}

export async function planCleanup(ctx, label) {
  const baseline = loadSnapshot(ctx), current = await capture(ctx, `${label}-cleanup-current`);
  const blockers = [], deletes = [], restores = [], deleteObjects = [], deleteDirectories = [];
  for (const change of difference(baseline, current)) {
    if (change.database !== ctx.database) { blockers.push({ kind: 'Native-database-drift', table: change.table }); continue; }
    const meta = current.databases[change.database].tables[change.table];
    for (const row of change.added) {
      const owned = ctx.state.owned[keyOf(change.database, change.table, row.key)];
      if (!meta.pk.length || !owned || owned.deleted || owned.latestSha256 !== row.sha256 || (owned.latestXmin && owned.latestXmin !== row.xmin)) { blockers.push({ kind: 'new-PK-ownership-or-current-row-hash-unproved', table: change.table, key: row.key }); continue; }
      deletes.push({ database: change.database, table: change.table, pk: meta.pk, ...row, birthProof: owned.proof });
    }
    for (const row of change.missing) blockers.push({ kind: 'original-row-missing', table: change.table, key: row.key });
    for (const pair of change.changed) {
      const borrowed = ctx.state.borrowed[keyOf(change.database, change.table, pair.after.key)];
      if (!borrowed || borrowed.baselineSha256 !== pair.before.sha256 || borrowed.latestSha256 !== pair.after.sha256) { blockers.push({ kind: 'unapproved-original-row-change', table: change.table, key: pair.after.key }); continue; }
      const columns = await changedColumns(ctx, pair.before.raw, pair.after.raw);
      if (!columns.every(c => borrowed.allowedColumns.includes(c))) { blockers.push({ kind: 'original-row-column-outside-allowlist', table: change.table, key: pair.after.key, columns }); continue; }
      restores.push({ database: change.database, table: change.table, pk: meta.pk, key: pair.after.key, columns,
        expectedRaw: pair.after.raw, expectedSha256: pair.after.sha256, baselineRaw: pair.before.raw, baselineSha256: pair.before.sha256, reason: borrowed.reason });
    }
  }
  for (const database of ctx.databases) {
    if (JSON.stringify(current.databases[database].meta.normative) !== JSON.stringify(baseline.databases[database].meta.normative)) blockers.push({ kind: 'original-catalog-OID-ACL-role-trigger-function-drift', database });
    if (JSON.stringify(current.databases[database].meta.sequences) !== JSON.stringify(baseline.databases[database].meta.sequences)) blockers.push({ kind: 'unowned-SQL-sequence-drift', database });
    for (const [table, meta] of Object.entries(current.databases[database].tables)) if (!meta.pk.length && meta.logicalRowsSha256 !== baseline.databases[database].tables[table].logicalRowsSha256) blockers.push({ kind: 'no-PK-table-drift-no-delete-authority', database, table });
    assert(baseline.objects?.[database] && current.objects?.[database], 'Original object inventory required');
    const objects = objectDiff(baseline.objects[database], current.objects[database]);
    for (const row of objects.changed) blockers.push({ kind: 'original-object-changed', database, key: row.key });
    for (const row of objects.missing) blockers.push({ kind: 'original-object-missing', database, key: row.key });
    for (const row of objects.added) {
      const owned = ctx.state.objects?.[keyOf(database, 'object', [row.key])];
      if (database !== ctx.database || !owned || owned.deleted || owned.latestSha256 !== row.sha256) blockers.push({ kind: 'unproved-added-object', database, key: row.key });
      else deleteObjects.push({ database, ...row, birthProof: owned.proof });
    }
    for (const key of current.objects[database].directories.filter(d => !baseline.objects[database].directories.includes(d))) {
      const proof = Object.values(ctx.state.objects ?? {}).find(o => o.database === database && (key === '' || o.key.startsWith(key + '/')));
      if (database !== ctx.database || !proof) blockers.push({ kind: 'unproved-added-object-directory', database, key });
      else deleteDirectories.push({ database, key, proofObjectKey: proof.key });
    }
    for (const key of baseline.objects[database].directories) if (!current.objects[database].directories.includes(key)) blockers.push({ kind: 'original-object-directory-missing', database, key });
  }
  let deleteRows = [], hasCycle = false, maintenance = null;
  const foreign = foreignReferences(deletes, Object.fromEntries(Object.entries(current.databases[ctx.database].tables).map(([table, meta]) => [table, readRows(meta)])), current.databases[ctx.database].meta.foreignKeys);
  for (const reference of foreign) blockers.push({ kind: 'actual-foreign-row-references-owned-PK', ...reference });
  if (current.databases[ctx.database].meta.externalForeignKeys.length) blockers.push({ kind: 'external-schema-FK-needs-explicit-row-level-reference-review', constraints: current.databases[ctx.database].meta.externalForeignKeys });
  try { deleteRows = deleteOrder(deletes, current.databases[ctx.database].meta.foreignKeys); }
  catch { hasCycle = true; }
  const deleteTables = new Set(deletes.map(row => row.table));
  const guardTriggers = current.databases[ctx.database].meta.normative.triggers.map(raw => ({ raw, value: JSON.parse(raw) }))
    .filter(({ value }) => value.schema === 'poms' && deleteTables.has(value.table_name) && value.tgenabled !== 'D' && /\bBEFORE\b.*\bDELETE\b/.test(value.definition));
  const needsMaintenance = hasCycle || guardTriggers.length > 0;
  const sandbox = needsMaintenance ? actualCycleEvidence(ctx) : null;
  const reviewedGuardNames = new Set(['jghi_immutable', 'jghi_ownership_origin_guard', 'jghi_frozen_participant', 'jghi_condition_fact_guard']);
  const unknownGuards = guardTriggers.filter(({ value }) => !reviewedGuardNames.has(value.tgname) || !['O', 'A'].includes(value.tgenabled));
  for (const { value } of unknownGuards) blockers.push({ kind: 'unknown-delete-guard-not-eligible-for-maintenance-disable', table: value.table_name, trigger: value.tgname, triggerOID: value.oid });
  if (needsMaintenance && sandbox && unknownGuards.length === 0) {
    deleteRows = [...deletes].sort((a, b) => a.table.localeCompare(b.table) || JSON.stringify(a.key).localeCompare(JSON.stringify(b.key)));
    const command = exactDeleteCTE(deleteRows);
    const drain = ctx.state.constraintDrainSandbox;
    assert(drain?.file.startsWith(ctx.priv + '/'), 'Actual same-run deferred-constraint drain sandbox required');
    const drainBytes = ownedFile(drain.file); assert.equal(sha(drainBytes), drain.rawBytesSha256);
    const drainReport = JSON.parse(drainBytes);
    assert.equal(drainReport.kind, 'actual-PG15-TEMP-only-deferred-trigger-drain-sandbox');
    assert(drainReport.allTEMPObjectsRolledBack && drainReport.businessRowsAndXminUnchanged && drainReport.catalogAndSequencesUnchanged && drainReport.objectsUnchanged);
    assert.deepEqual(drainReport.cases.map(row => row.sqlState), ['55006', null, '23503']);
    assert(drainReport.cases[1].guardRestored && drainReport.cases[1].allSystemFKTriggersEnabled && drainReport.cases[2].violationRejected);
    maintenance = { kind: 'isolated-owned-fixture-maintenance-only', strategy: 'one-statement-exact-PK-CTE-original-RI-enabled', actualSandbox: sandbox,
      constraintDrainSandbox: drain, validateDeferredConstraintsBeforeGuardRestore: true,
      guardTriggers: guardTriggers.map(({ raw, value }) => ({ raw, ...value })), command: { text: command.text, values: command.values, expected: command.expected, rawSQLSha256: sha(command.text), parameterSHA256: sha(JSON.stringify(command.values)), tableCount: command.tableCount },
      originalSystemFKTriggersRemainEnabled: true, originalForeignKeysDroppedOrRecreated: false, factsTemporarilyRewritten: false, productImmutabilityChanged: false, WORMCertified: false };
  } else {
    if (hasCycle) blockers.push({ kind: 'exact-row-FK-cycle-needs-actual-sandbox-and-reviewed-maintenance-plan' });
    for (const { value } of guardTriggers) blockers.push({ kind: 'actual-delete-guard-requires-reviewed-isolated-maintenance', table: value.table_name, trigger: value.tgname, triggerOID: value.oid });
  }
  const plan = { schemaVersion: 1, kind: 'business-exact-owned-PK-cleanup-plan', marker: ctx.identity.marker, namespace: ctx.namespace, epoch: ctx.epoch, run: ctx.run,
    status: blockers.length ? 'blocked-no-mutation-authority' : 'ready-for-Root-review', baseline: ctx.state.baseline, current: current.manifest, generatedAt: new Date().toISOString(),
    blockers, deleteRows, restoreRows: restores, maintenance, maintenanceCandidate: { allProvenOwnedDeletes: deletes, foreignReferences: foreign, guardTriggers: guardTriggers.map(({ raw }) => raw), actualSandboxReceipt: ctx.state.cycleSandbox ?? null, strategy: maintenance?.strategy ?? 'unresolved-do-not-disable-or-break-facts-yet' },
    deleteObjects, deleteDirectories: deleteDirectories.sort((a, b) => b.key.split('/').length - a.key.split('/').length || b.key.localeCompare(a.key)),
    expectedObjects: current.objects, expectedCatalog: current.databases[ctx.database].meta.normative, expectedSequences: current.databases[ctx.database].meta.sequences,
    applyGuards: ['Exact Root-reviewed plan SHA', 'Actual stopped bound process record, dead PID and refused port', 'No app-role DB connections', 'Original marker/OIDs/PG15/role/gate/source pins',
      'All poms tables locked in deterministic order', 'Each exact PK plus raw full-row bytes and SHA', 'Child-before-parent exact deletes without cascade', 'Explicit original-column restoration only',
      'Exact logical DB baseline inside transaction', 'Preserve exact owned object bytes privately before exact file unlink; remove only reviewed empty directories', 'Two independent fresh noop snapshots after DB commit and file cleanup'], DBAndFilesystemAtomicity: false, credentialsAndPrivateEvidenceDeleted: false };
  const pin = ctx.artifact(`${label}-cleanup-plan.json`, plan, { kind: plan.kind, status: plan.status, deleteCount: deleteRows.length, restoreCount: restores.length, objectCount: deleteObjects.length, directoryCount: deleteDirectories.length, blockerCount: blockers.length, requiresExactRootReviewedPlanSHA: true });
  ctx.state.cleanupPlan = { ...pin, status: plan.status }; ctx.persist(); return { plan: pin, status: plan.status, blockers: blockers.length, deletes: deleteRows.length, restores: restores.length };
}
async function assertStopped(ctx) {
  const file = ctx.options['api-stopped-receipt']; assert(file && (file.startsWith(ctx.private + '/') || file.startsWith(ctx.win + '/tmp/rust-r4ghi/')));
  const bytes = ownedFile(file), stopped = JSON.parse(bytes), original = ctx.state.apiProcess; assert(original, 'Actual bound process evidence required');
  assert.equal(stopped.namespace, ctx.namespace); assert.equal(stopped.port, 31441); assert.equal(stopped.pid, original.record.pid); assert.equal(stopped.binarySha256, original.record.binarySha256);
  assert(stopped.processGone === true && stopped.portFree === true && Number.isFinite(Date.parse(stopped.capturedAt)));
  assert.equal(sha(ownedFile(original.file)), original.rawBytesSha256);
  let exists = false; try { process.kill(stopped.pid, 0); exists = true; } catch (e) { assert.equal(e.code, 'ESRCH'); } assert(!exists, 'PID still exists; Root must reconcile potential reuse');
  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port: 31441 }); socket.setTimeout(2000, () => { socket.destroy(); reject(new Error('Listener status unknown')); });
    socket.once('connect', () => { socket.destroy(); reject(new Error('API listener remains')); }); socket.once('error', e => e.code === 'ECONNREFUSED' ? resolve() : reject(e));
  });
  await ctx.db(async c => { const result = await c.query('SELECT pid FROM pg_stat_activity WHERE datname=ANY($1::text[]) AND usename=ANY($2::text[])', [ctx.databases, ctx.apps]); assert.equal(result.rowCount, 0); });
  return { file, rawBytesSha256: sha(bytes), boundProcessRecord: { file: original.file, rawBytesSha256: original.rawBytesSha256 }, actualPidGone: true, portActuallyRefused: true, appDBConnections: 0 };
}
const where = pk => pk.map((c, n) => `t.${quote(c)}::text=$${n + 1}`).join(' AND ');
async function assertBaseline(c, expected, tables) {
  const meta = await catalog(c, tables); assert.deepEqual(meta.normative, expected.meta.normative); assert.deepEqual(meta.sequences, expected.meta.sequences);
  assert.deepEqual(meta.externalForeignKeys, expected.meta.externalForeignKeys ?? []);
  for (const table of meta.tables) {
    const rows = (await c.query(`SELECT row_to_json(t)::text raw FROM poms.${quote(table.name)} t ORDER BY ${table.pk.length ? table.pk.map(k => `t.${quote(k)}`).join(',') : 'row_to_json(t)::text'}`)).rows;
    assert.deepEqual(rows.map(r => r.raw), readRows(expected.tables[table.name]).map(r => r.raw), 'Original logical full-row baseline mismatch');
  }
}
export async function noopCleanup(ctx, label, stopped = null) {
  const stop = stopped ?? await assertStopped(ctx), baseline = loadSnapshot(ctx), receipts = [];
  for (let n = 1; n <= 2; n++) {
    const current = await capture(ctx, `${label}-noop-${n}`); assert.equal(difference(baseline, current).length, 0);
    for (const database of ctx.databases) {
      assert.deepEqual(current.databases[database].meta.normative, baseline.databases[database].meta.normative);
      assert.deepEqual(current.databases[database].meta.sequences, baseline.databases[database].meta.sequences);
      for (const [table, meta] of Object.entries(current.databases[database].tables)) assert.equal(meta.logicalRowsSha256, baseline.databases[database].tables[table].logicalRowsSha256);
      assert.deepEqual(current.objects[database], baseline.objects[database]);
    }
    receipts.push(current.manifest);
  }
  return { kind: 'actual-two-fresh-connection-cleanup-noops', stop, freshRounds: 2, tablesPerDatabase: ctx.tables, receipts, rowXminRestoredClaim: false, exactLogicalRowsAndCatalogAndSequences: true };
}
export async function applyCleanup(ctx, label) {
  assert(ctx.state.cleanupPlan && !ctx.state.cleaned);
  const bytes = ownedFile(ctx.state.cleanupPlan.file), hash = sha(bytes); assert.equal(hash, ctx.state.cleanupPlan.rawBytesSha256); assert.equal(hash, ctx.options['approved-plan-sha']);
  const plan = JSON.parse(bytes); assert.equal(plan.marker, ctx.identity.marker); assert.equal(plan.epoch, ctx.epoch); assert.equal(plan.run, ctx.run); assert.equal(plan.status, 'ready-for-Root-review'); assert.equal(plan.blockers.length, 0);
  assert([...plan.deleteRows, ...plan.restoreRows].every(row => row.database === ctx.database), 'Native/other databases never receive cleanup DML');
  const stopped = await assertStopped(ctx), baseline = loadSnapshot(ctx);
  for (const database of ctx.databases) assert.deepEqual(captureObjects(ctx, database), plan.expectedObjects[database], 'Object file/hash/directory inventory changed since Root reviewed plan');
  for (const [index, object] of plan.deleteObjects.entries()) {
    const file = objectPath(ctx, object.database, object.key), bytes = ownedFile(file); assert.equal(sha(bytes), object.sha256); assert.equal(bytes.length, object.bytes);
    ctx.artifact(`${label}-object-original-${index}.bin`, bytes); // Preserve content before deletion; never delete private evidence.
  }
  await ctx.db(c => assertBaseline(c, baseline.databases[ctx.databases[0]], ctx.tables), ctx.databases[0]);
  ctx.artifact(`${label}-apply-intent.json`, { planSha256: hash, stopped, deletes: plan.deleteRows.length, restores: plan.restoreRows.length });
  await ctx.db(async c => {
    await c.query('BEGIN');
    try {
      await c.query('LOCK TABLE r4ghi_control.marker IN SHARE MODE'); await guard(ctx, c, ctx.database);
      const inventory = await catalog(c, ctx.tables);
      for (const table of inventory.tables) await c.query(`LOCK TABLE poms.${quote(table.name)} IN EXCLUSIVE MODE`);
      assert.equal(inventory.externalForeignKeys.length, 0, 'External schema foreign key appeared before cleanup');
      assert.equal((await c.query('SELECT pid FROM pg_stat_activity WHERE datname=ANY($1::text[]) AND usename=ANY($2::text[])', [ctx.databases, ctx.apps])).rowCount, 0, 'Application connections reappeared before cleanup writes');
      assert.deepEqual((await catalog(c, ctx.tables)).normative, plan.expectedCatalog); assert.deepEqual((await catalog(c, ctx.tables)).sequences, plan.expectedSequences);
      const allowedDeletes = new Set(plan.deleteRows.map(row => keyOf(row.database, row.table, row.key)));
      for (const parent of plan.deleteRows) for (const fk of inventory.foreignKeys.filter(f => f.parent === parent.table)) {
        const values = fk.parentColumns.map(col => parent.cells[col]); assert(values.every(value => value !== null && value !== undefined));
        const childMeta = inventory.tables.find(table => table.name === fk.child); assert(childMeta?.pk.length);
        const keySql = `json_build_array(${childMeta.pk.map(col => `t.${quote(col)}::text`).join(',')})::text key`;
        const matches = (await c.query(`SELECT ${keySql} FROM poms.${quote(fk.child)} t WHERE ${fk.childColumns.map((col, i) => `t.${quote(col)}::text=$${i + 1}`).join(' AND ')}`, values)).rows;
        for (const child of matches) assert(allowedDeletes.has(keyOf(ctx.database, fk.child, JSON.parse(child.key))), 'Foreign row references an owned target; cleanup must stop');
      }
      for (const row of [...plan.deleteRows, ...plan.restoreRows]) {
        const result = await c.query(`SELECT row_to_json(t)::text raw,t.xmin::text xmin FROM poms.${quote(row.table)} t WHERE ${where(row.pk)} FOR UPDATE`, row.key); assert.equal(result.rowCount, 1);
        assert.equal(result.rows[0].raw, row.raw ?? row.expectedRaw); assert.equal(sha(result.rows[0].raw), row.sha256 ?? row.expectedSha256);
        if (row.xmin) assert.equal(result.rows[0].xmin, row.xmin, 'Exact owned row transaction identity changed since review');
      }
      if (plan.maintenance) {
        assert.equal(plan.maintenance.strategy, 'one-statement-exact-PK-CTE-original-RI-enabled');
        assert(plan.maintenance.originalSystemFKTriggersRemainEnabled && plan.maintenance.originalForeignKeysDroppedOrRecreated === false && plan.maintenance.factsTemporarilyRewritten === false);
        for (const trigger of plan.maintenance.guardTriggers) {
          const actual = (await c.query('SELECT t.oid::text oid,t.tgenabled,pg_get_triggerdef(t.oid,true) definition FROM pg_trigger t WHERE t.oid=$1::oid AND t.tgrelid=$2::regclass AND t.tgname=$3 AND NOT t.tgisinternal', [trigger.oid, `poms.${trigger.table_name}`, trigger.tgname])).rows;
          assert.deepEqual(actual, [{ oid: trigger.oid, tgenabled: trigger.tgenabled, definition: trigger.definition }]);
          assert(['jghi_immutable', 'jghi_ownership_origin_guard', 'jghi_frozen_participant', 'jghi_condition_fact_guard'].includes(trigger.tgname));
          await c.query(`ALTER TABLE poms.${quote(trigger.table_name)} DISABLE TRIGGER ${quote(trigger.tgname)}`);
        }
        const command = exactDeleteCTE(plan.deleteRows); assert.equal(command.text, plan.maintenance.command.text); assert.deepEqual(command.values, plan.maintenance.command.values);
        assert.equal(sha(command.text), plan.maintenance.command.rawSQLSha256); assert.equal(sha(JSON.stringify(command.values)), plan.maintenance.command.parameterSHA256);
        const result = await c.query(command.text, command.values);
        assert.deepEqual(result.rows.map(row => JSON.stringify([row.table_name, JSON.parse(row.key)])).sort(), command.expected, 'Single-statement DELETE did not remove exactly the reviewed owned PK set');
        assert.equal(plan.maintenance.validateDeferredConstraintsBeforeGuardRestore, true);
        const drain = plan.maintenance.constraintDrainSandbox; assert(drain?.file.startsWith(ctx.priv + '/'));
        assert.equal(sha(ownedFile(drain.file)), drain.rawBytesSha256);
        // Validate queued FK/constraint events before ALTER TABLE restores the
        // reviewed user guards. This does not disable or defer any constraint.
        await c.query('SET CONSTRAINTS ALL IMMEDIATE');
        for (const trigger of plan.maintenance.guardTriggers) {
          assert(['O', 'A'].includes(trigger.tgenabled));
          await c.query(`ALTER TABLE poms.${quote(trigger.table_name)} ${trigger.tgenabled === 'A' ? 'ENABLE ALWAYS' : 'ENABLE'} TRIGGER ${quote(trigger.tgname)}`);
        }
      } else for (const row of plan.deleteRows) {
        const result = await c.query(`DELETE FROM poms.${quote(row.table)} t WHERE ${where(row.pk)} AND row_to_json(t)::text=$${row.key.length + 1} RETURNING 1`, [...row.key, row.raw]); assert.equal(result.rowCount, 1);
      }
      for (const row of plan.restoreRows) {
        const borrowed = ctx.state.borrowed[keyOf(row.database, row.table, row.key)]; assert(borrowed && borrowed.baselineSha256 === row.baselineSha256 && row.columns.every(col => borrowed.allowedColumns.includes(col)));
        const parameter = row.key.length + 1;
        const assignments = row.columns.map(col => `${quote(col)}=(jsonb_populate_record(NULL::poms.${quote(row.table)},$${parameter}::jsonb)).${quote(col)}`).join(',');
        const result = await c.query(`UPDATE poms.${quote(row.table)} t SET ${assignments} WHERE ${where(row.pk)} AND row_to_json(t)::text=$${parameter + 1} RETURNING 1`, [...row.key, row.baselineRaw, row.expectedRaw]); assert.equal(result.rowCount, 1);
      }
      await assertBaseline(c, baseline.databases[ctx.database], ctx.tables); await c.query('COMMIT');
    } catch (e) { await c.query('ROLLBACK'); throw e; }
  });
  ctx.state.databaseCleanupCommitted = true; ctx.state.cleanedByPlanSHA = hash; ctx.persist();
  for (const object of plan.deleteObjects) {
    const file = objectPath(ctx, object.database, object.key); assert.equal(sha(ownedFile(file)), object.sha256); fs.unlinkSync(file);
  }
  for (const directory of plan.deleteDirectories) {
    const root = objectRoot(ctx, directory.database), folder = directory.key === '' ? root : objectPath(ctx, directory.database, directory.key);
    assert.equal(fs.realpathSync(folder), folder); assert.equal(fs.readdirSync(folder).length, 0); fs.rmdirSync(folder); // Never recursive.
  }
  ctx.state.cleaned = true; ctx.persist();
  return { kind: 'actual-exact-business-cleanup-commit', planSha256: hash, deletes: plan.deleteRows.length, restores: plan.restoreRows.length, objectDeletes: plan.deleteObjects.length,
    DBAndFilesystemAtomicity: false, noop: await noopCleanup(ctx, `${label}-postcommit`, stopped), privateEvidenceRetained: true };
}
export async function cleanupMode(ctx, mode, label) {
  if (mode === 'plan-cleanup') return planCleanup(ctx, label);
  if (mode === 'apply-cleanup') return applyCleanup(ctx, label);
  assert.equal(mode, 'noop'); return noopCleanup(ctx, label);
}
