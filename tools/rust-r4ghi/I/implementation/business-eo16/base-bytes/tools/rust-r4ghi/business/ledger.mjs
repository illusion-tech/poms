import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sha, keyOf, birthProof, valueAt, uuid, numberProof } from './pure.mjs';
import { loadSnapshot, readRows, difference } from './snapshot.mjs';
import { assertObjectsRecorded, reconcileObjects } from './objects.mjs';
import { platformBirthProof } from './platform-bindings.mjs';
import { readinessDiffReviewMutationProof } from './readiness-bindings.mjs';

export async function changedColumns(ctx, before, after) {
  return ctx.db(async c => (await c.query('SELECT k FROM jsonb_object_keys($1::jsonb) AS keys(k) WHERE ($1::jsonb->k) IS DISTINCT FROM ($2::jsonb->k) ORDER BY k', [before, after])).rows.map(r => r.k));
}
export function allowBorrowed(ctx, table, key, columns, reason) {
  assert(typeof reason === 'string' && reason.trim().length > 8);
  const baseline = loadSnapshot(ctx), meta = baseline.databases[ctx.database].tables[table]; assert(meta && meta.pk.length);
  const row = readRows(meta).find(r => JSON.stringify(r.key) === JSON.stringify(key)); assert(row, 'Only actual original baseline rows may be borrowed');
  assert(columns.length && columns.every(c => meta.columns.includes(c)));
  const k = keyOf(ctx.database, table, key), existing = ctx.state.borrowed[k];
  const entry = { database: ctx.database, table, key, allowedColumns: [...columns].sort(), reason, baselineSha256: row.sha256, latestSha256: row.sha256 };
  if (existing) { assert.deepEqual(existing.allowedColumns, entry.allowedColumns); assert.equal(existing.baselineSha256, row.sha256); }
  else ctx.state.borrowed[k] = entry;
  ctx.persist(); return entry;
}
export async function allowNumberCounter(ctx, scope) {
  const specs = JSON.parse(fs.readFileSync(`${ctx.win}/tools/rust-r2ef/e-authority.json`)).businessNumbers; assert(specs[scope]);
  const period = await ctx.db(async c => (await c.query("SELECT to_char(timezone('UTC',now()),'YYYY') period")).rows[0].period);
  const baseline = loadSnapshot(ctx), rows = readRows(baseline.databases[ctx.database].tables.business_number_sequence).filter(r => { const cell = JSON.parse(r.raw); return cell.scope === scope && cell.period === period; });
  assert(rows.length <= 1);
  for (const row of rows) allowBorrowed(ctx, 'business_number_sequence', row.key, ['next_value', 'prefix', 'padding', 'description', 'updated_at'], `Exact actual ${scope}/${period} API number producer counter; preserve original full row for reviewed cleanup`);
}
export function assertRecorded(ctx, observed) {
  const baseline = loadSnapshot(ctx), blockers = [];
  assertObjectsRecorded(ctx, baseline, observed);
  for (const database of ctx.databases) {
    assert.deepEqual(observed.databases[database].meta.normative, baseline.databases[database].meta.normative, 'Original catalog/OIDs/ACL/functions/triggers/roles changed');
    assert.deepEqual(observed.databases[database].meta.sequences, baseline.databases[database].meta.sequences, 'Unowned SQL sequence drift');
  }
  for (const change of difference(baseline, observed)) {
    if (change.database !== ctx.database) { blockers.push({ kind: 'native-database-drift', database: change.database, table: change.table }); continue; }
    for (const row of change.added) {
      const owned = ctx.state.owned[keyOf(change.database, change.table, row.key)];
      if (!owned || owned.latestSha256 !== row.sha256 || (owned.latestXmin && owned.latestXmin !== row.xmin) || owned.deleted) blockers.push({ kind: 'unknown-added-row-or-unobserved-change', table: change.table, key: row.key });
    }
    for (const pair of change.changed) {
      const borrowed = ctx.state.borrowed[keyOf(change.database, change.table, pair.after.key)];
      if (!borrowed || borrowed.baselineSha256 !== pair.before.sha256 || borrowed.latestSha256 !== pair.after.sha256) blockers.push({ kind: 'unobserved-original-row-change', table: change.table, key: pair.after.key });
    }
    for (const row of change.missing) blockers.push({ kind: 'original-row-deleted', table: change.table, key: row.key });
  }
  assert.equal(blockers.length, 0, 'Unattributed state before command; inspect private full before snapshot');
}
export async function reconcileAttempt(ctx, before, after, attempt, binding = {}) {
  const baseline = loadSnapshot(ctx), changes = difference(before, after), blockers = [], recorded = [];
  const numberSpecs = JSON.parse(fs.readFileSync(`${ctx.win}/tools/rust-r2ef/e-authority.json`)).businessNumbers;
  const additions = changes.flatMap(ch => ch.added.map(row => ({ database: ch.database, table: ch.table, row })));
  const anchors = [];
  for (const item of binding.responseBirths ?? []) {
    assert(baseline.databases[ctx.database].tables[item.table]);
    const value = valueAt(attempt.body, item.pointer);
    if (value === undefined || value === null) { if (attempt.status === attempt.expectedStatus && attempt.status >= 200 && attempt.status < 300 && !item.optional) blockers.push({ kind: 'expected-real-response-ID-missing', table: item.table, pointer: item.pointer }); continue; }
    const id = uuid(value), match = additions.find(a => a.database === ctx.database && a.table === item.table && a.row.key.length === 1 && a.row.key[0].toLowerCase() === id.toLowerCase());
    // A returned reference may point to an existing immutable row. It cannot
    // create an xmin ownership anchor for other rows in that case.
    if (match) anchors.push({ table: item.table, id, pointer: item.pointer, xmin: match.row.xmin });
  }
  let numberBody = attempt.body, storedNumberProof = null;
  if (binding.number?.rowSource && attempt.status >= 200 && attempt.status < 300) {
    const source = binding.number.rowSource, id = valueAt(attempt.body, source.responsePointer);
    const actual = additions.find(a => a.database === ctx.database && a.table === source.table && a.row.key.length === 1 && a.row.key[0] === id);
    assert(actual && anchors.some(a => a.table === source.table && a.id === id), 'Stored number must come from the actual newly returned owned command root');
    const value = JSON.parse(actual.row.raw)[source.column]; assert(typeof value === 'string' && /^\/[A-Za-z][A-Za-z0-9]*$/.test(binding.number.pointer));
    numberBody = { [binding.number.pointer.slice(1)]: value }; storedNumberProof = { numberSource: 'actual-new-response-root-stored-number', table: source.table, id, column: source.column, responsePointer: source.responsePointer, rowSha256: actual.row.sha256 };
  }
  // An explicitly addressed owned row that really changed can anchor its own
  // actual new transaction. The caller must bind that ID to the request path
  // or a request JSON pointer; existing read-only references grant nothing.
  for (const item of binding.updatedAnchors ?? []) {
    const id = uuid(item.id), change = changes.find(ch => ch.database === ctx.database && ch.table === item.table);
    const pair = change?.changed.find(p => p.after.key.length === 1 && p.after.key[0] === id);
    const owned = ctx.state.owned[keyOf(ctx.database, item.table, [id])];
    if (pair && owned?.latestSha256 === pair.before.sha256 && (binding.mutableTables ?? []).includes(item.table)) anchors.push({ table: item.table, id, pointer: `actual-updated-request-${item.requestBinding}`, xmin: pair.after.xmin });
  }
  const cookies = Object.values(ctx.state.actors).flatMap(a => a.cookies?.poms_session ? [sha(decodeURIComponent(a.cookies.poms_session))] : []);
  for (const a of additions.filter(a => a.database === ctx.database && ['audit_log', 'security_event', 'auth_session'].includes(a.table))) {
    const proof = birthProof(a.row, a.table, attempt, [], cookies);
    if (proof) anchors.push({ table: a.table, id: a.row.key[0], pointer: proof.kind, xmin: a.row.xmin });
  }
  for (const change of changes) {
    if (change.database !== ctx.database) { blockers.push({ kind: 'native-database-changed', table: change.table }); continue; }
    for (const row of change.added) {
      const oldMeta = baseline.databases[change.database].tables[change.table];
      if (!oldMeta.pk.length || readRows(oldMeta).some(r => JSON.stringify(r.key) === JSON.stringify(row.key))) { blockers.push({ kind: 'new-PK-not-proven-or-original-reused', table: change.table, key: row.key }); continue; }
      let proof = change.table === 'business_number_sequence' ? numberProof(row, null, binding.number, numberBody, numberSpecs) : birthProof(row, change.table, attempt, anchors, cookies);
      proof ??= platformBirthProof(ctx, change.table, row, attempt, anchors);
      if (proof && storedNumberProof && change.table === 'business_number_sequence') proof = { ...proof, ...storedNumberProof };
      if (!proof) { blockers.push({ kind: 'unknown-new-row', table: change.table, key: row.key, rowSha256: row.sha256 }); continue; }
      ctx.own(change.database, change.table, row, { ...proof, transport: attempt.transport ?? 'HTTP', requestId: attempt.requestId, operationId: attempt.operationId,
        status: attempt.status, responseComplete: attempt.responseComplete, beforeSnapshot: before.manifest, afterSnapshot: after.manifest, beforeAbsent: true });
      recorded.push({ kind: 'birth', table: change.table, key: row.key, proofKind: proof.kind });
    }
    for (const pair of change.changed) {
      const key = keyOf(change.database, change.table, pair.after.key), owned = ctx.state.owned[key], borrowed = ctx.state.borrowed[key];
      const counterProof = change.table === 'business_number_sequence' ? numberProof(pair.after, pair.before, binding.number, numberBody, numberSpecs) : null;
      if (change.table === 'business_number_sequence' && !counterProof) { blockers.push({ kind: 'counter-change-not-bound-to-real-returned-number', key: pair.after.key }); continue; }
      if (owned) {
        const exactReadinessReview = binding.readinessDiffReviewItems === true
          ? readinessDiffReviewMutationProof({ database: change.database, table: change.table, beforeRow: pair.before, afterRow: pair.after, attempt, before, after, readRows }) : null;
        if (owned.latestSha256 !== pair.before.sha256 || (owned.latestXmin && owned.latestXmin !== pair.before.xmin) || !(['auth_session', 'platform_user'].includes(change.table) || counterProof || (binding.mutableTables ?? []).includes(change.table) || exactReadinessReview)) {
          blockers.push({ kind: 'owned-mutation-not-in-command-allowlist', table: change.table, key: pair.after.key }); continue;
        }
        ctx.own(change.database, change.table, pair.after, { kind: 'HTTP-owned-row-update', requestId: attempt.requestId, operationId: attempt.operationId,
          beforeSha256: pair.before.sha256, beforeSnapshot: before.manifest, afterSnapshot: after.manifest, ...(exactReadinessReview ? { exactReadinessReview } : {}), ...(counterProof ? { counterProof } : {}) });
        recorded.push({ kind: 'owned-update', table: change.table, key: pair.after.key });
      } else if (borrowed && borrowed.latestSha256 === pair.before.sha256) {
        const columns = await changedColumns(ctx, pair.before.raw, pair.after.raw);
        if (!columns.every(c => borrowed.allowedColumns.includes(c))) { blockers.push({ kind: 'original-column-outside-exact-allowlist', table: change.table, key: pair.after.key, columns }); continue; }
        borrowed.latestSha256 = pair.after.sha256; borrowed.latestProof = { requestId: attempt.requestId, operationId: attempt.operationId, columns, beforeSha256: pair.before.sha256, afterSha256: pair.after.sha256, ...(counterProof ? { counterProof } : {}) };
        recorded.push({ kind: 'borrowed-allowlisted-update', table: change.table, key: pair.after.key, columns }); ctx.persist();
      } else blockers.push({ kind: 'original-row-unapproved-change', table: change.table, key: pair.after.key });
    }
    for (const row of change.missing) {
      const key = keyOf(change.database, change.table, row.key), owned = ctx.state.owned[key];
      if (!owned || owned.latestSha256 !== row.sha256 || !(binding.deleteTables ?? []).includes(change.table)) blockers.push({ kind: 'missing-row-without-exact-command-authority', table: change.table, key: row.key });
      else { owned.deleted = true; owned.deletionProof = { requestId: attempt.requestId, operationId: attempt.operationId, beforeSha256: row.sha256 }; ctx.persist(); }
    }
  }
  for (const database of ctx.databases) {
    if (JSON.stringify(before.databases[database].meta.normative) !== JSON.stringify(after.databases[database].meta.normative)) blockers.push({ kind: 'catalog-drift-during-HTTP', database });
    if (JSON.stringify(before.databases[database].meta.sequences) !== JSON.stringify(after.databases[database].meta.sequences)) blockers.push({ kind: 'SQL-sequence-drift-during-HTTP', database });
  }
  const objectResult = reconcileObjects(ctx, before, after, attempt, readRows); blockers.push(...objectResult.blockers); recorded.push(...objectResult.recorded);
  const result = { requestId: attempt.requestId, operationId: attempt.operationId, transport: attempt.transport ?? 'HTTP', before: before.manifest, after: after.manifest, recorded, blockers,
    ownershipComplete: blockers.length === 0, responseStatusIsAcceptance: false };
  const pin = ctx.artifact(`${ctx.next('ledger')}.json`, result, { kind: 'actual-command-ownership-reconciliation', transport: attempt.transport ?? 'HTTP', operationId: attempt.operationId, requestId: attempt.requestId,
    recordedCount: recorded.length, blockerCount: blockers.length, ownershipComplete: result.ownershipComplete });
  if (blockers.length) { ctx.state.blockedObservation = pin; ctx.persist(); }
  assert.equal(blockers.length, 0, 'HTTP ownership incomplete; inspect immutable private before/after/ledger before proceeding');
  return pin;
}
