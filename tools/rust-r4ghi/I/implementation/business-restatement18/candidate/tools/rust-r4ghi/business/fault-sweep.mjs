// Root-only real FI controls; importing this file performs no SQL, HTTP or I/O.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { sha, quote, uuid, keyOf } from './pure.mjs';
import { loadSnapshot, readRows } from './snapshot.mjs';
import { requiredWriteInventory, selectorSql, writeMatches, requireOwnedScope } from './required-write-inventory.mjs';
import { loadActualAuthConfig } from './auth-config-binding.mjs';

const kind = 'source-bound-required-write-sweep17';
const identitySHA = value => sha(JSON.stringify(value));
const exactStatus = attempt => assert(attempt.status === 500 && attempt.responseComplete === true && attempt.transportFailure === false, 'FI requires an actual complete500; no missing-ACK rollback inference');
function verifySources(ctx) {
  const pins = JSON.parse(fs.readFileSync(new URL('./required-write-sources17.json', import.meta.url)));
  for (const pin of pins) assert.equal(ctx.pins.find(p => p.file === pin.file)?.sha256, pin.sha256, `Reviewed FI source changed: ${pin.file}`);
  return pins;
}
function controlNames(ctx, table, event, suffix, deferred = false) {
  const prefix = `${ctx.state.prefix}_${suffix}`;
  const control = { table, event, deferred, function: `${prefix}_fn`, trigger: `${prefix}_tg`, sequence: `${prefix}_hits` };
  for (const name of [control.function, control.trigger, control.sequence]) { quote(name); assert(name.length <= 63); }
  return control;
}
async function inspect(c, control) {
  const fn = (await c.query("SELECT p.oid::text oid,pg_get_functiondef(p.oid) definition,p.proacl::text acl,pg_get_userbyid(p.proowner) owner,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='r4ghi_control' AND p.proname=$1", [control.function])).rows;
  const trigger = (await c.query('SELECT oid::text,pg_get_triggerdef(oid,true) definition,tgenabled FROM pg_trigger WHERE tgname=$1 AND tgrelid=$2::regclass', [control.trigger, `poms.${control.table}`])).rows;
  const sequence = (await c.query("SELECT c.oid::text,pg_get_userbyid(c.relowner) owner,c.relacl::text acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='r4ghi_control' AND c.relname=$1 AND c.relkind='S'", [control.sequence])).rows;
  assert.equal(fn.length, 1); assert.equal(trigger.length, 1); assert.equal(sequence.length, 1);
  return { fn, trigger, sequence };
}
async function createControl(c, ctx, control, selector, marker) {
  assert(/^[a-z0-9-]+$/.test(marker));
  await c.query(`CREATE SEQUENCE r4ghi_control.${quote(control.sequence)} START 1 MINVALUE 1 NO CYCLE`);
  await c.query(`CREATE FUNCTION r4ghi_control.${quote(control.function)}() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $r4ghi_sweep17$
DECLARE j jsonb:=to_jsonb(NEW);
BEGIN
 IF current_user<>'${ctx.owner}' THEN RAISE EXCEPTION 'Unexpected FI definer'; END IF;
 IF ${selector} THEN
  PERFORM nextval('r4ghi_control.${control.sequence}'::regclass);
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='r4ghi-required-write-${marker}';
 END IF;
 RETURN NEW;
END; $r4ghi_sweep17$`);
  await c.query(`REVOKE ALL ON FUNCTION r4ghi_control.${quote(control.function)}() FROM PUBLIC`);
  await c.query(`GRANT EXECUTE ON FUNCTION r4ghi_control.${quote(control.function)}() TO ${quote(ctx.apps[1])}`);
  const timing = control.deferred ? 'CREATE CONSTRAINT TRIGGER' : 'CREATE TRIGGER';
  const phase = control.deferred ? 'AFTER' : 'BEFORE';
  const deferral = control.deferred ? ' DEFERRABLE INITIALLY DEFERRED' : '';
  await c.query(`${timing} ${quote(control.trigger)} ${phase} ${control.event} ON poms.${quote(control.table)}${deferral} FOR EACH ROW EXECUTE FUNCTION r4ghi_control.${quote(control.function)}()`);
}
export async function installSweepFault(ctx, descriptor, requestId, before) {
  assert.equal(process.platform, 'linux'); assert(!ctx.state.activeFault);
  assert.equal(descriptor.kind, kind); assert(/^[A-Za-z0-9_-]{1,100}$/.test(requestId));
  const sourcePins = verifySources(ctx);
  const inventory = requiredWriteInventory(descriptor.operationId, descriptor.scope);
  const selected = inventory.find(d => d.key === descriptor.key); assert(selected);
  assert.deepEqual(selected, descriptor.selected, 'Never accept client-provided SQL or an altered write inventory');
  const sessionId = requireOwnedScope(ctx, before, descriptor.scope);
  const binding = { requestId, sessionId }, suffix = ctx.next('sweep-fi').replaceAll('-', '_');
  const primary = controlNames(ctx, selected.table, selected.event, `${suffix}_p`);
  const fallback = controlNames(ctx, 'audit_log', 'INSERT', `${suffix}_f`, true);
  const audit = inventory.find(d => d.match.kind === 'audit'); assert(audit);
  for (const control of [primary, fallback]) assert(before.databases[ctx.database].tables[control.table]);
  const active = { kind, phase: 'install-intent', requestId, operationId: descriptor.operationId, key: selected.key, sessionId, scope: descriptor.scope,
    selected, sourcePins, before: before.manifest, primary, fallback };
  const intent = ctx.artifact(`${ctx.next('sweep-install-intent')}.json`, active, { kind: 'exact-source-bound-required-write-FI-intent', operationId: active.operationId, writeFamily: active.key, businessFixtureSQL: false });
  active.intent = intent; ctx.state.activeFault = active; ctx.persist();
  await ctx.db(async c => {
    await c.query('BEGIN');
    try {
      await createControl(c, ctx, primary, selectorSql(selected, binding), 'primary');
      // This fires at COMMIT, after pending-auth flush. A missed primary still
      // rolls back instead of silently committing an untested business command.
      await createControl(c, ctx, fallback, selectorSql(audit, binding), 'missed-primary-fallback');
      active.primary.identity = await inspect(c, primary); active.primary.identitySHA = identitySHA(active.primary.identity);
      active.fallback.identity = await inspect(c, fallback); active.fallback.identitySHA = identitySHA(active.fallback.identity);
      active.phase = 'commit-pending'; ctx.persist();
      await c.query('COMMIT');
    } catch (error) { await c.query('ROLLBACK'); throw error; }
  });
  active.phase = 'installed'; ctx.persist();
  ctx.artifact(`${ctx.next('sweep-installed')}.json`, active, { kind: 'actual-source-bound-required-write-FI-installed', operationId: active.operationId, writeFamily: active.key, twoOwnedControls: true });
  return active;
}
export async function removeSweepFault(ctx) {
  const active = ctx.state.activeFault; assert.equal(active?.kind, kind);
  assert(['installed', 'commit-pending'].includes(active.phase) && active.primary.identitySHA && active.fallback.identitySHA, 'Interrupted install needs exact Root catalog reconciliation; never drop unverifiable objects');
  const counts = await ctx.db(async c => {
    await c.query('BEGIN');
    try {
      for (const control of [active.primary, active.fallback]) assert.equal(identitySHA(await inspect(c, control)), control.identitySHA, 'OID/definition/owner/ACL changed; preserve controls and stop');
      const result = {};
      for (const [name, control] of [['primary', active.primary], ['fallback', active.fallback]]) {
        const hit = (await c.query(`SELECT last_value::text,is_called FROM r4ghi_control.${quote(control.sequence)}`)).rows[0];
        result[name] = hit.is_called ? Number(hit.last_value) : 0; assert(Number.isSafeInteger(result[name]));
        await c.query(`DROP TRIGGER ${quote(control.trigger)} ON poms.${quote(control.table)}`);
        await c.query(`DROP FUNCTION r4ghi_control.${quote(control.function)}()`);
        await c.query(`DROP SEQUENCE r4ghi_control.${quote(control.sequence)}`);
      }
      await c.query('COMMIT'); return result;
    } catch (error) { await c.query('ROLLBACK'); throw error; }
  });
  const receipt = ctx.artifact(`${ctx.next('sweep-disarmed')}.json`, { active, counts, identityMatched: true }, { kind: 'actual-source-bound-required-write-FI-disarmed', operationId: active.operationId, writeFamily: active.key, primaryHits: counts.primary, fallbackHits: counts.fallback, exactOwnedControlsOnly: true });
  delete ctx.state.activeFault; ctx.persist();
  return { hitCount: counts.primary, fallbackHitCount: counts.fallback, sessionId: active.sessionId, key: active.key, receipt };
}

const touchColumns = new Set(['last_seen_at', 'last_ip', 'idle_expires_at', 'row_version', 'updated_at']);
export function exactRawTouch(before, after, sessionId, actorId) {
  if (before.key.length !== 1 || before.key[0] !== sessionId || after.key[0] !== sessionId) return false;
  const b = JSON.parse(before.raw), a = JSON.parse(after.raw);
  if (b.user_id !== actorId || a.user_id !== actorId || b.status !== 'active' || a.status !== 'active' || a.row_version !== b.row_version + 1) return false;
  if (!Number.isFinite(Date.parse(a.last_seen_at)) || Date.parse(a.last_seen_at) <= Date.parse(b.last_seen_at) || Date.parse(a.updated_at) !== Date.parse(a.last_seen_at)) return false;
  if (Date.parse(a.idle_expires_at) > Date.parse(a.absolute_expires_at) || Date.parse(a.idle_expires_at) < Date.parse(b.idle_expires_at)) return false;
  const stable = value => Object.fromEntries(Object.entries(value).filter(([key]) => !touchColumns.has(key)));
  return JSON.stringify(stable(b)) === JSON.stringify(stable(a));
}
export function assertRollbackRows(beforeRows, afterRows, { allowSession, actorId }) {
  const b = new Map(beforeRows.map(r => [JSON.stringify(r.key), r]));
  assert.equal(afterRows.length, b.size, 'FI left inserted or deleted rows');
  const touches = [];
  for (const a of afterRows) {
    const old = b.get(JSON.stringify(a.key)); assert(old, 'FI changed a primary key');
    if (old.sha256 === a.sha256 && old.xmin === a.xmin) continue;
    assert(allowSession && exactRawTouch(old, a, allowSession, actorId), 'FI left a business/audit/security/version-only change or unbound authentication mutation');
    touches.push({ key: a.key, beforeSHA256: old.sha256, afterSHA256: a.sha256, beforeXmin: old.xmin, afterXmin: a.xmin });
  }
  return touches;
}
export function assertSweepRollback(ctx, before, after, fault, actorId) {
  const rawTouches = [];
  assert.deepEqual(Object.keys(before.databases), Object.keys(after.databases));
  for (const database of ctx.databases) {
    assert.deepEqual(before.databases[database].meta, after.databases[database].meta, 'FI controls must be removed with catalog/sequence identities restored before observation');
    assert.deepEqual(before.objects[database], after.objects[database], 'FI changed file bytes, keys or directories');
    assert.deepEqual(Object.keys(before.databases[database].tables), Object.keys(after.databases[database].tables));
    for (const table of Object.keys(before.databases[database].tables)) {
      const touches = assertRollbackRows(readRows(before.databases[database].tables[table]), readRows(after.databases[database].tables[table]),
        { allowSession: database === ctx.database && table === 'auth_session' ? fault.sessionId : null, actorId });
      rawTouches.push(...touches.map(t => ({ database, table, ...t })));
    }
  }
  return { allBusinessAuditSecurityRowsAndXminUnchanged: true, catalogSequencesAndObjectsUnchanged: true, separateActualRawAuthTouches: rawTouches };
}

export async function waitForActualPendingAuth(ctx, actorKey) {
  assert.equal(process.platform, 'linux'); verifySources(ctx);
  const settings = loadActualAuthConfig(ctx), actor = ctx.state.actors[actorKey]; assert(actor?.cookies?.poms_session && actor.id);
  const tokenHash = sha(decodeURIComponent(actor.cookies.poms_session));
  assert(settings.throttleSeconds + 2 < settings.idleSeconds, 'Actual config cannot produce a due active session for this case; do not backdate or weaken it');
  let waits = 0, first = null;
  for (;;) {
    const rows = await ctx.db(async c => (await c.query("SELECT id::text,user_id::text,status,last_seen_at,clock_timestamp() now,idle_expires_at,absolute_expires_at FROM poms.auth_session WHERE token_hash=$1", [tokenHash])).rows);
    assert.equal(rows.length, 1); const row = rows[0];
    assert.equal(row.user_id, actor.id); assert.equal(row.status, 'active');
    assert(ctx.state.owned[keyOf(ctx.database, 'auth_session', [uuid(row.id)])]);
    const now = Date.parse(row.now), deadline = Math.min(Date.parse(row.idle_expires_at), Date.parse(row.absolute_expires_at));
    assert(deadline - now > 2000, 'Actual session expired/near expiry: Root must re-login, never treat401 as domain rejection');
    const remaining = Date.parse(row.last_seen_at) + settings.throttleSeconds * 1000 + 100 - now;
    first ??= { sessionId: row.id, actualLastSeen: row.last_seen_at, observedAt: row.now, settings };
    if (remaining <= 0) return ctx.artifact(`${ctx.next('auth-flush-due')}.json`, { kind: 'actual-session-real-throttle-due', first, observedAt: row.now, actualLastSeen: row.last_seen_at, waits, noSessionSQLMutation: true },
      { kind: 'actual-pending-auth-FI-precondition', actorKey, waitedForRealTime: waits > 0, businessFixtureSQL: false });
    assert(remaining + 2000 < deadline - now, 'Session would expire before actual throttle: Root must re-login');
    if (waits % 6 === 0) console.log(JSON.stringify({ kind: 'awaiting-real-auth-throttle', actorKey, remainingSeconds: Math.ceil(remaining / 1000), SQLSessionBackdating: false }));
    await delay(Math.min(5000, Math.ceil(remaining))); waits += 1;
  }
}

export function verifyFinalWrites(ctx, before, after, attempt, inventory, sessionId) {
  const all = table => readRows(after.databases[ctx.database].tables[table]);
  const changed = table => {
    const b = new Map(readRows(before.databases[ctx.database].tables[table]).map(r => [JSON.stringify(r.key), r]));
    return all(table).filter(r => !b.has(JSON.stringify(r.key)) || b.get(JSON.stringify(r.key)).sha256 !== r.sha256 || b.get(JSON.stringify(r.key)).xmin !== r.xmin);
  };
  const binding = { requestId: attempt.requestId, sessionId };
  const auditDescriptor = inventory.find(d => d.match.kind === 'audit');
  const audits = changed('audit_log').filter(r => writeMatches(auditDescriptor, r, all, binding)); assert.equal(audits.length, 1);
  const xid = audits[0].xmin, writes = [];
  for (const descriptor of inventory) {
    const matches = changed(descriptor.table).filter(r => writeMatches(descriptor, r, all, binding));
    assert.equal(matches.length, 1, `Final success lacks exactly one actual selected mandatory write: ${descriptor.key}`);
    assert.equal(matches[0].xmin, xid, `Necessary ${descriptor.key} is not in the actual audit/business outer transaction`);
    writes.push({ family: descriptor.key, table: descriptor.table, key: matches[0].key, rowSHA256: matches[0].sha256, xmin: matches[0].xmin, source: descriptor.source });
  }
  return { actualSharedBusinessAuditAuthXmin: xid, writes };
}

export async function faultSweepAndRetry(ctx, api, { operationId, params, body, actor = 'manager', binding = {} }) {
  assert(!binding.fi && !binding.expectedStatus && !binding.rawJson && !binding.bytes);
  const sourcePins = verifySources(ctx), f = ctx.state.fixtures;
  const scope = { projectId: uuid(f.project.id), actorId: uuid(ctx.state.actors[actor].id), actorKey: actor, params, body };
  const inventory = requiredWriteInventory(operationId, scope), bodySHA256 = sha(JSON.stringify(body));
  const sweepKey = sha(JSON.stringify({ operationId, params, actorId: scope.actorId, bodySHA256 }));
  ctx.state.requiredWriteSweeps ??= {};
  let state = ctx.state.requiredWriteSweeps[sweepKey];
  if (!state) {
    state = { operationId, actorId: scope.actorId, bodySHA256, inventory, sourcePins, failures: [], finalSuccess: null };
    ctx.state.requiredWriteSweeps[sweepKey] = state; ctx.persist();
  }
  assert.deepEqual(state.inventory, inventory); assert.deepEqual(state.sourcePins, sourcePins);
  assert.equal(state.finalSuccess, null, 'This exact command already succeeded once; never execute another successful retry');
  for (const selected of inventory) {
    const previous = state.failures.find(failure => failure.key === selected.key);
    if (previous) {
      const bytes = fs.readFileSync(previous.observation.file); assert.equal(sha(bytes), previous.observation.rawBytesSha256);
      const actual = JSON.parse(bytes); assert.equal(actual.operationId, operationId); assert.equal(actual.descriptor.key, selected.key); assert.equal(actual.bodySHA256, bodySHA256);
      assert.equal(actual.failed.fault.hitCount, 1); assert.equal(actual.failed.fault.fallbackHitCount, 0);
      assert.equal(actual.rollback.allBusinessAuditSecurityRowsAndXminUnchanged, true); continue;
    }
    if (selected.match.kind === 'auth-coflush') await waitForActualPendingAuth(ctx, actor);
    assert.equal(sha(JSON.stringify(body)), bodySHA256, 'A sweep never edits the body or refreshes its CAS between failures');
    const failed = await api.request(operationId, params, body, actor, { ...binding, expectedStatus: 500,
      fi: { kind, key: selected.key, operationId, scope, selected } });
    exactStatus(failed); assert.equal(failed.requestBodySha256, bodySHA256);
    // Record rollback before enforcing coverage so a fallback miss remains an
    // immutable failed/uncovered observation, never a synthetic PASS or success.
    const rollback = assertSweepRollback(ctx, loadSnapshot(ctx, failed.before), loadSnapshot(ctx, failed.after), failed.fault, scope.actorId);
    const observation = ctx.artifact(`${ctx.next('sweep-failure')}.json`, { operationId, descriptor: selected, bodySHA256, failed: { receipt: failed.receiptId, before: failed.before, after: failed.after, fault: failed.fault }, rollback },
      { kind: 'actual-required-write-failure-observation', operationId, writeFamily: selected.key, primaryHits: failed.fault.hitCount, fallbackHits: failed.fault.fallbackHitCount, fullRollbackObserved: true, coveragePassed: failed.fault.hitCount === 1 && failed.fault.fallbackHitCount === 0 });
    assert.equal(failed.fault.hitCount, 1, 'Required primary was not actually hit once; fallback rolled back. Stop without successful retry');
    assert.equal(failed.fault.fallbackHitCount, 0, 'Fallback is not mandatory-write coverage');
    state.failures.push({ key: selected.key, observation, requestId: failed.requestId, requestBodySHA256: failed.requestBodySha256 }); ctx.persist();
  }
  assert.deepEqual(state.failures.map(f => f.key).sort(), inventory.map(d => d.key).sort());
  // Make the final real successful request exercise actual pending-auth too.
  await waitForActualPendingAuth(ctx, actor);
  assert.equal(sha(JSON.stringify(body)), bodySHA256);
  const successful = await api.request(operationId, params, body, actor, binding);
  // Persist the actual success before any postcondition. A failed verifier must
  // never make a resume replay this already committed command.
  state.finalSuccess = { receipt: successful.receiptId, requestId: successful.requestId, status: successful.status, postconditions: 'pending' }; ctx.persist();
  assert.equal(successful.requestBodySha256, bodySHA256);
  const before = loadSnapshot(ctx, successful.before), after = loadSnapshot(ctx, successful.after);
  const sessionId = requireOwnedScope(ctx, before, scope);
  const transaction = verifyFinalWrites(ctx, before, after, successful, inventory, sessionId);
  state.finalSuccess.transaction = transaction; state.finalSuccess.postconditions = 'verified'; ctx.persist();
  const receipt = ctx.artifact(`${ctx.next('sweep-complete')}.json`, { ...state, sameBodyAcrossEveryAttempt: true, successfulRequestsInThisSweep: 1,
    allRequiredFamiliesActuallyHitOnce: true, businessDataSQLFixtures: false }, { kind: 'actual-full-required-write-sweep-and-one-success', operationId,
    requiredWriteFamilies: inventory.length, actualOneHitFailures: state.failures.length, successfulRetries: 1, sameBody: true, actualCommonOuterTransactionVerified: true });
  return { successful, receipt, failures: state.failures };
}
