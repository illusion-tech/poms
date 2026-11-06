import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import { sha, quote, keyOf, deleteOrder } from './pure.mjs';
import { capture, loadSnapshot, readRows, difference, catalog } from './snapshot.mjs';
import { controlIdentity } from './control.mjs';

function stripOwnedControl(normative, control) {
  if (!control) return normative;
  const ownedRelations = new Set([control.table, control.hit, control.raw, control.gate]);
  const triggers = new Set(control.triggers.map(t => t.name));
  return Object.fromEntries(Object.entries(normative).map(([kind, rows]) => [kind, rows.filter(raw => {
    const r = JSON.parse(raw);
    if (kind === 'triggers') return !triggers.has(r.tgname);
    if (kind === 'functions') return !(r.schema === 'r4ghi_control' && r.proname === control.function);
    if (kind === 'relations') return !(r.schema === 'r4ghi_control' && ownedRelations.has(r.name));
    if (['columns', 'constraints'].includes(kind)) return !(r.schema === 'r4ghi_control' && r.table_name === control.table);
    if (kind === 'indexes') return !(r.schemaname === 'r4ghi_control' && r.tablename === control.table);
    return true;
  })]));
}
function stableSequences(meta, control) {
  return meta.sequences.filter(seq => !(seq.schema === 'r4ghi_control' && control && [control.hit, control.raw, control.gate].includes(seq.name)));
}
async function changedColumns(ctx, before, after) {
  return ctx.db(async c => (await c.query("SELECT k FROM jsonb_object_keys($1::jsonb) AS keys(k) WHERE ($1::jsonb->k) IS DISTINCT FROM ($2::jsonb->k) ORDER BY k", [before, after])).rows.map(r => r.k));
}
export async function planCleanup(ctx, label) {
  const baseline = loadSnapshot(ctx, 'baseline'), current = await capture(ctx, `${label}-cleanup-current`);
  const changes = difference(baseline, current), blockers = [], deletes = [], restores = [];
  for (const database of ctx.databases) for (const [table, meta] of Object.entries(current.databases[database].tables)) {
    const original = baseline.databases[database].tables[table];
    if (!meta.pk.length && meta.rawBytesSha256 !== original.rawBytesSha256) blockers.push({ reason: 'no-PK-table-raw-multiset-drift-no-delete-authority', database, table });
  }
  for (const change of changes) {
    if (change.database !== ctx.database) { blockers.push({ reason: 'native-database-changed', database: change.database, table: change.table }); continue; }
    for (const row of change.missing) blockers.push({ reason: 'pre-existing-row-missing', database: change.database, table: change.table, key: row.key });
    for (const row of change.added) {
      const proof = ctx.state.owned[keyOf(change.database, change.table, row.key)];
      if (!proof || proof.latestSha256 !== row.sha256 || !current.databases[change.database].tables[change.table].pk.length) {
        blockers.push({ reason: proof ? 'owned-row-latest-hash-or-PK-not-proven' : 'unknown-new-row-no-cleanup-authority', database: change.database, table: change.table, key: row.key, observedSha256: row.sha256 }); continue;
      }
      deletes.push({ database: change.database, table: change.table, pk: current.databases[change.database].tables[change.table].pk, ...row, birthProof: proof.proof });
    }
    for (const pair of change.changed) {
      const borrowed = change.table === 'platform_user' ? ctx.state.borrowed?.[pair.after.key[0]] : null;
      if (!borrowed || borrowed.baselineSha256 !== pair.before.sha256) { blockers.push({ reason: 'unknown-pre-existing-row-change', database: change.database, table: change.table, key: pair.after.key }); continue; }
      const columns = await changedColumns(ctx, pair.before.raw, pair.after.raw);
      if (!columns.every(col => borrowed.allowedColumns.includes(col))) { blockers.push({ reason: 'borrowed-seed-unapproved-column-change', table: change.table, key: pair.after.key, columns }); continue; }
      restores.push({ database: change.database, table: change.table, pk: current.databases[change.database].tables[change.table].pk, key: pair.after.key, columns, expectedRaw: pair.after.raw, expectedSha256: pair.after.sha256, baselineRaw: pair.before.raw, baselineSha256: pair.before.sha256 });
    }
  }
  for (const database of ctx.databases) {
    const b = baseline.databases[database].meta, a = current.databases[database].meta;
    const control = database === ctx.database ? ctx.state.control : null;
    if (JSON.stringify(b.normative) !== JSON.stringify(stripOwnedControl(a.normative, control))) blockers.push({ reason: 'unowned-catalog-ACL-trigger-function-drift', database });
    if (JSON.stringify(b.sequences) !== JSON.stringify(stableSequences(a, control))) blockers.push({ reason: 'existing-sequence-drift-without-exact-producer-ownership', database });
  }
  let control = null;
  if (ctx.state.control) {
    const observed = await controlIdentity(ctx); assert.equal(observed.sha256, ctx.state.control.definition.sha256);
    const config = await ctx.db(async c => (await c.query(`SELECT row_to_json(t)::text raw FROM r4ghi_control.${quote(ctx.state.control.table)} t WHERE id=1`)).rows[0]);
    assert(config);
    if (JSON.parse(config.raw).mode !== '') blockers.push({ reason: 'owned-FI-or-race-gate-still-armed' });
    control = { ...ctx.state.control, expectedConfigRaw: config.raw, expectedConfigSha256: sha(config.raw), currentIdentity: observed };
  }
  let ordered = [];
  try { ordered = deleteOrder(deletes, current.databases[ctx.database].meta.foreignKeys); }
  catch { blockers.push({ reason: 'row-FK-delete-cycle-requires-explicit-review' }); }
  const plan = { schemaVersion: 1, kind: 'dryrun-exact-userfix-cleanup-plan', epoch: ctx.epoch, run: ctx.run, marker: ctx.identity.marker, namespace: ctx.namespace, status: blockers.length ? 'blocked-no-mutation-authorized' : 'ready-for-Root-review', baseline: ctx.state.baseline, current: current.manifest,
    generatedAt: new Date().toISOString(), blockers, deleteRows: ordered, restoreRows: restores, control,
    expectedCatalog: current.databases[ctx.database].meta.normative, expectedSequences: current.databases[ctx.database].meta.sequences,
    existingSequenceRestoration: 'None inferred; any existing sequence drift blocks. Only this run exact-owned FI sequences are dropped without CASCADE.',
    applyGuards: ['Root supplies reviewed exact raw plan SHA', 'Actual lifecycle stopped receipt for this namespace/31441', '31441 connection refused and both app-role connection counts zero', 'All poms tables locked in deterministic order, each PK+raw row SHA/byte equality checked', 'Row-level FK child-before-parent deletes; borrowed seed changed allowed fields only; no cascade', 'Control OIDs/definitions/ACL/config exact before exact drop', 'Final poms/catalog/sequences baseline equality inside transaction, then one commit; new connections verify noop twice'],
  };
  const pin = ctx.artifact(`${label}-cleanup-plan.json`, plan, { kind: plan.kind, status: plan.status, blockers, deleteCount: ordered.length, restoreCount: restores.length, deleteByTable: Object.fromEntries([...new Set(ordered.map(r => r.table))].map(t => [t, ordered.filter(r => r.table === t).length])), requiresRootReviewOfExactPlanHash: true });
  ctx.state.cleanupPlan = { ...pin, status: plan.status }; ctx.persist();
  return { plan: pin, status: plan.status, blockerCount: blockers.length, deleteRows: ordered.length, restoreRows: restores.length };
}
async function assertStopped(ctx) {
  const input = ctx.options['api-stopped-receipt']; assert(input, 'Root lifecycle stopped receipt required');
  const file = path.resolve(input), real = fs.realpathSync(file);
  assert.equal(file, real);
  assert(file.startsWith(ctx.private + '/') || file.startsWith(`${ctx.win}/tmp/rust-r4ghi/`), 'Stop receipt must belong to this new namespace');
  const bytes = fs.readFileSync(file), receipt = JSON.parse(bytes);
  assert.equal(receipt.namespace, ctx.namespace);
  assert(typeof receipt.kind === 'string' && receipt.processGone === true && receipt.portFree === true && receipt.port === 31441, 'Use Root actual lifecycle processGone/portFree stop evidence');
  assert(Number.isSafeInteger(receipt.pid) && receipt.pid > 1 && /^[a-f0-9]{64}$/.test(receipt.binarySha256));
  assert(Number.isFinite(Date.parse(receipt.capturedAt)));
  const processRecordFile = `${ctx.private}/rust-api01-process.json`, processRecordBytes = fs.readFileSync(processRecordFile), record = JSON.parse(processRecordBytes);
  assert.equal(record.namespace, ctx.namespace); assert.equal(record.port, 31441); assert.equal(record.root, ctx.mirror);
  assert.equal(record.pid, receipt.pid); assert.equal(record.binarySha256, receipt.binarySha256);
  assert(record.startTime && typeof record.binary === 'string', 'Stop evidence must bind actual started process identity');
  let processExists = false;
  try { process.kill(receipt.pid, 0); processExists = true; } catch (error) { assert.equal(error.code, 'ESRCH', 'Cannot establish original process disappearance'); }
  assert.equal(processExists, false, 'Original PID still exists; Root must reconcile possible reuse before cleanup');
  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port: 31441 });
    socket.setTimeout(2000, () => { socket.destroy(); reject(new Error('Listener state could not be established')); });
    socket.once('connect', () => { socket.destroy(); reject(new Error('Owned API is still listening')); });
    socket.once('error', error => error.code === 'ECONNREFUSED' ? resolve() : reject(error));
  });
  for (const name of ctx.databases) await ctx.db(async c => {
    const { rows } = await c.query("SELECT pid::text,usename,datname,state FROM pg_stat_activity WHERE datname=ANY($1::text[]) AND usename=ANY($2::text[])", [ctx.databases, ['poms_r4ghi_native_app', 'poms_r4ghi_rust_app']]);
    assert.equal(rows.length, 0, 'An application-role DB connection remains; stop/drain before cleanup');
  }, name);
  return { file, rawBytesSha256: sha(bytes), processRecord: { file: processRecordFile, rawBytesSha256: sha(processRecordBytes) }, actualPidGone: true, actualPortRefused: true, applicationConnections: 0 };
}
const whereKey = (pk, offset = 1, alias = 't') => pk.map((p, i) => `${alias}.${quote(p)}::text=$${offset + i}`).join(' AND ');
async function lockedRaw(c, row) {
  const { rows } = await c.query(`SELECT row_to_json(t)::text raw FROM poms.${quote(row.table)} t WHERE ${whereKey(row.pk)} FOR UPDATE`, row.key);
  assert.equal(rows.length, 1, 'Planned PK no longer resolves exactly once'); return rows[0].raw;
}
async function assertBaselineInConnection(c, baselineDb) {
  const current = await catalog(c);
  assert.deepEqual(current.normative, baselineDb.meta.normative, 'Final logical catalog/ACL/trigger/function differs');
  assert.deepEqual(current.sequences, baselineDb.meta.sequences, 'Final sequence state differs');
  for (const table of current.tables) {
    const rows = (await c.query(`SELECT row_to_json(t)::text raw FROM poms.${quote(table.name)} t ORDER BY ${table.pk.length ? table.pk.map(k => `t.${quote(k)}`).join(',') : 'row_to_json(t)::text'}`)).rows;
    const original = readRows(baselineDb.tables[table.name]);
    assert.deepEqual(rows.map(r => r.raw), original.map(r => r.raw), `Baseline mismatch in ${table.name}`);
  }
}
export async function applyCleanup(ctx, label) {
  assert(ctx.state.cleanupPlan && !ctx.state.cleaned);
  const bytes = fs.readFileSync(ctx.state.cleanupPlan.file), actualSha = sha(bytes);
  assert.equal(actualSha, ctx.state.cleanupPlan.rawBytesSha256); assert.equal(actualSha, ctx.options['approved-plan-sha'], 'Exact Root-reviewed plan hash required');
  const plan = JSON.parse(bytes); assert.equal(plan.epoch, ctx.epoch); assert.equal(plan.run, ctx.run); assert.equal(plan.marker, ctx.identity.marker); assert.equal(plan.status, 'ready-for-Root-review'); assert.equal(plan.blockers.length, 0);
  const stopped = await assertStopped(ctx), baseline = loadSnapshot(ctx, 'baseline');
  // The inactive native DB must remain byte-equal before touching Rust rows.
  await ctx.db(c => assertBaselineInConnection(c, baseline.databases[ctx.databases[0]]), ctx.databases[0]);
  ctx.artifact(`${label}-apply-intent.json`, { planSha256: actualSha, stopped, deleteCount: plan.deleteRows.length, restoreCount: plan.restoreRows.length });
  await ctx.db(async c => {
    await c.query('BEGIN');
    try {
      await c.query("SET LOCAL lock_timeout='5s'");
      const inventory = await catalog(c);
      for (const table of inventory.tables) await c.query(`LOCK TABLE poms.${quote(table.name)} IN EXCLUSIVE MODE`);
      assert.deepEqual(inventory.normative, plan.expectedCatalog, 'Catalog changed since reviewed plan');
      assert.deepEqual(inventory.sequences, plan.expectedSequences, 'Sequence state changed since reviewed plan');
      for (const row of plan.deleteRows) { const raw = await lockedRaw(c, row); assert.equal(sha(raw), row.sha256); assert.equal(raw, row.raw); }
      for (const row of plan.restoreRows) { const raw = await lockedRaw(c, row); assert.equal(sha(raw), row.expectedSha256); assert.equal(raw, row.expectedRaw); }
      if (plan.control) {
        assert.equal((await controlIdentity(ctx, c)).sha256, plan.control.currentIdentity.sha256);
        const { rows: [config] } = await c.query(`SELECT row_to_json(t)::text raw FROM r4ghi_control.${quote(plan.control.table)} t WHERE id=1 FOR UPDATE`);
        assert.equal(config.raw, plan.control.expectedConfigRaw); assert.equal(sha(config.raw), plan.control.expectedConfigSha256);
      }
      for (const row of plan.deleteRows) {
        const query = `DELETE FROM poms.${quote(row.table)} t WHERE ${whereKey(row.pk)} AND row_to_json(t)::text=$${row.key.length + 1} RETURNING 1`;
        const result = await c.query(query, [...row.key, row.raw]); assert.equal(result.rowCount, 1);
      }
      for (const row of plan.restoreRows) {
        assert.equal(row.table, 'platform_user');
        assert(row.columns.every(k => ['last_login_at', 'updated_at', 'row_version'].includes(k)));
        const baseParam = row.key.length + 1, rawParam = baseParam + 1;
        const assignments = row.columns.map(k => `${quote(k)}=(jsonb_populate_record(NULL::poms.${quote(row.table)},$${baseParam}::jsonb)).${quote(k)}`).join(',');
        const result = await c.query(`UPDATE poms.${quote(row.table)} t SET ${assignments} WHERE ${whereKey(row.pk)} AND row_to_json(t)::text=$${rawParam} RETURNING 1`, [...row.key, row.baselineRaw, row.expectedRaw]);
        assert.equal(result.rowCount, 1);
      }
      if (plan.control) {
        for (const trigger of plan.control.triggers) await c.query(`DROP TRIGGER ${quote(trigger.name)} ON poms.${quote(trigger.table)}`);
        await c.query(`DROP FUNCTION r4ghi_control.${quote(plan.control.function)}()`);
        await c.query(`DROP TABLE r4ghi_control.${quote(plan.control.table)}`);
        for (const kind of ['hit', 'raw', 'gate']) await c.query(`DROP SEQUENCE r4ghi_control.${quote(plan.control[kind])}`);
      }
      await assertBaselineInConnection(c, baseline.databases[ctx.database]);
      await c.query('COMMIT');
    } catch (error) { await c.query('ROLLBACK'); throw error; }
  });
  ctx.state.cleaned = true; ctx.state.cleanedByPlanSha256 = actualSha; ctx.persist();
  const noop = await noopCleanup(ctx, `${label}-postcommit`, stopped);
  return { kind: 'actual-exact-cleanup-commit-and-new-connection-noop', planSha256: actualSha, stopped, deleteCount: plan.deleteRows.length, restoreCount: plan.restoreRows.length, noop, noCascade: true };
}
export async function noopCleanup(ctx, label, alreadyStopped = null) {
  const stopped = alreadyStopped ?? await assertStopped(ctx), baseline = loadSnapshot(ctx, 'baseline');
  const receipts = [];
  for (let n = 1; n <= 2; n++) {
    // capture opens a new independently guarded connection to each database.
    const current = await capture(ctx, `${label}-noop-${n}`);
    assert.equal(difference(baseline, current).length, 0);
    for (const name of ctx.databases) {
      for (const table of Object.keys(baseline.databases[name].tables)) assert.equal(current.databases[name].tables[table].rawBytesSha256, baseline.databases[name].tables[table].rawBytesSha256, `Exact original raw row inventory differs in ${name}.${table}`);
      assert.deepEqual(current.databases[name].meta.normative, baseline.databases[name].meta.normative);
      assert.deepEqual(current.databases[name].meta.sequences, baseline.databases[name].meta.sequences);
    }
    receipts.push(current.manifest);
  }
  return { stopped, freshConnectionRounds: 2, tablesPerDatabase: 120, databases: ctx.databases, receipts, byteExactRowsAndLogicalCatalogAndSequences: true };
}
export async function cleanupMode(ctx, mode, label) {
  if (mode === 'plan-cleanup') return planCleanup(ctx, label);
  if (mode === 'apply-cleanup') return applyCleanup(ctx, label);
  assert.equal(mode, 'noop'); return noopCleanup(ctx, label);
}
