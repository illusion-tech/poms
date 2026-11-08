// Exact one-request required-write FI. The private originals distinguish the
// failed attempt and the same-body successful retry; no business fact SQL.
import assert from 'node:assert/strict';
import { sha, quote, uuid } from './pure.mjs';
import { difference, loadSnapshot } from './snapshot.mjs';

const definitionHash = identity => sha(JSON.stringify(identity));
async function identity(ctx, control) {
  return ctx.db(async c => {
    const fn = (await c.query("SELECT p.oid::text oid,pg_get_functiondef(p.oid) definition,p.proacl::text acl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='r4ghi_control' AND p.proname=$1", [control.function])).rows;
    const trigger = (await c.query('SELECT oid::text,pg_get_triggerdef(oid,true) definition FROM pg_trigger WHERE tgname=$1 AND tgrelid=$2::regclass', [control.trigger, `poms.${control.table}`])).rows;
    const sequence = (await c.query("SELECT c.oid::text,pg_get_userbyid(c.relowner) owner,c.relacl::text acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='r4ghi_control' AND c.relname=$1 AND c.relkind='S'", [control.sequence])).rows;
    assert.equal(fn.length, 1); assert.equal(trigger.length, 1); assert.equal(sequence.length, 1); return { fn, trigger, sequence };
  });
}
export async function installFault(ctx, descriptor, requestId, before) {
  if (descriptor.kind === 'source-bound-tax-continuation13-sweep') {
    const { installTax13Fault } = await import('./tax13-sweep.mjs'); return installTax13Fault(ctx, descriptor, requestId, before);
  }
  if (descriptor.kind === 'source-bound-shared-auto-batch-sweep58') {
    const { installSharedFault58 } = await import('./shared-source-sweep58.mjs'); return installSharedFault58(ctx, descriptor, requestId, before);
  }
  if (descriptor.kind === 'source-bound-ef-all-target-sweep40') {
    const { installEFFault40 } = await import('./ef-fault-sweep40.mjs'); return installEFFault40(ctx, descriptor, requestId, before);
  }
  if (descriptor.kind === 'source-bound-required-write-sweep17') {
    const { installSweepFault } = await import('./fault-sweep.mjs'); return installSweepFault(ctx, descriptor, requestId, before);
  }
  assert(!ctx.state.activeFault, 'Disarm any prior exact owned FI before a new attempt');
  assert(/^[a-zA-Z0-9_-]{1,100}$/.test(requestId));
  const table = descriptor.table, meta = before.databases[ctx.database].tables[table]; assert(meta);
  assert(['INSERT', 'UPDATE'].includes(descriptor.event));
  const field = descriptor.field; assert(meta.columns.includes(field));
  let value;
  if (field === 'request_id') { assert(['audit_log', 'security_event'].includes(table)); value = requestId; }
  else {
    value = uuid(descriptor.ownedId);
    assert(Object.values(ctx.state.owned).some(o => o.database === ctx.database && !o.deleted && o.key.length === 1 && o.key[0] === value), 'FI selector must identify this business run owned UUID');
    assert(['id', 'project_id', 'target_id', 'assignment_id', 'completion_record_id', 'source_context_id', 'snapshot_id'].includes(field));
  }
  assert(descriptor.eventType === undefined || /^[A-Za-z0-9_.:-]{1,150}$/.test(descriptor.eventType));
  const suffix = ctx.next('fi').replaceAll('-', '_'), prefix = `${ctx.state.prefix}_${suffix}`;
  const control = { table, field, value, event: descriptor.event, eventType: descriptor.eventType ?? null, requestId,
    function: `${prefix}_hook`, trigger: `${prefix}_trigger`, sequence: `${prefix}_hits` };
  for (const name of [control.function, control.trigger, control.sequence]) quote(name);
  const selector = `j->>'${field}'='${value}'` + (control.eventType ? ` AND j->>'event_type'='${control.eventType}'` : '');
  ctx.artifact(`${ctx.next('fi-intent')}.json`, { kind: 'exact-owned-required-write-fault-install-intent', control, descriptor, before: before.manifest, businessFixtureSQL: false });
  await ctx.db(async c => {
    await c.query('BEGIN');
    try {
      await c.query(`CREATE SEQUENCE r4ghi_control.${quote(control.sequence)} START 1 MINVALUE 1 NO CYCLE`);
      await c.query(`CREATE FUNCTION r4ghi_control.${quote(control.function)}() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $business_fi$
DECLARE j jsonb:=to_jsonb(NEW);
BEGIN
 IF current_user<>'${ctx.owner}' THEN RAISE EXCEPTION 'Unexpected FI definer role'; END IF;
 IF ${selector} THEN
  PERFORM nextval('r4ghi_control.${control.sequence}'::regclass);
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Exact owned business acceptance required-write failure';
 END IF;
 RETURN NEW;
END; $business_fi$`);
      await c.query(`REVOKE ALL ON FUNCTION r4ghi_control.${quote(control.function)}() FROM PUBLIC`);
      await c.query(`GRANT EXECUTE ON FUNCTION r4ghi_control.${quote(control.function)}() TO ${quote(ctx.apps[1])}`);
      await c.query(`CREATE TRIGGER ${quote(control.trigger)} BEFORE ${control.event} ON poms.${quote(table)} FOR EACH ROW EXECUTE FUNCTION r4ghi_control.${quote(control.function)}()`);
      await c.query('COMMIT');
    } catch (error) { await c.query('ROLLBACK'); throw error; }
  });
  control.identity = await identity(ctx, control); control.identitySHA = definitionHash(control.identity);
  ctx.state.activeFault = control; ctx.persist();
  ctx.artifact(`${ctx.next('fi-installed')}.json`, control, { kind: 'actual-exact-owned-FI-installed', table, event: descriptor.event, SQLBusinessFixtureCreated: false });
  return control;
}
export async function removeFault(ctx) {
  if (ctx.state.activeFault?.kind === 'source-bound-tax-continuation13-sweep') {
    const { removeTax13Fault } = await import('./tax13-sweep.mjs'); return removeTax13Fault(ctx);
  }
  if (ctx.state.activeFault?.kind === 'source-bound-shared-auto-batch-sweep58') {
    const { removeSharedFault58 } = await import('./shared-source-sweep58.mjs'); return removeSharedFault58(ctx);
  }
  if (ctx.state.activeFault?.kind === 'source-bound-ef-all-target-sweep40') {
    const { removeEFFault40 } = await import('./ef-fault-sweep40.mjs'); return removeEFFault40(ctx);
  }
  if (ctx.state.activeFault?.kind === 'source-bound-required-write-sweep17') {
    const { removeSweepFault } = await import('./fault-sweep.mjs'); return removeSweepFault(ctx);
  }
  const control = ctx.state.activeFault; assert(control);
  assert.equal(definitionHash(await identity(ctx, control)), control.identitySHA, 'Never disarm changed or foreign control objects');
  const hits = await ctx.db(async c => (await c.query(`SELECT last_value::text,is_called FROM r4ghi_control.${quote(control.sequence)}`)).rows[0]);
  await ctx.db(async c => {
    await c.query('BEGIN');
    try {
      // OID/definition/ACL binding was read immediately before exact object drops.
      await c.query(`DROP TRIGGER ${quote(control.trigger)} ON poms.${quote(control.table)}`);
      await c.query(`DROP FUNCTION r4ghi_control.${quote(control.function)}()`);
      await c.query(`DROP SEQUENCE r4ghi_control.${quote(control.sequence)}`); await c.query('COMMIT');
    } catch (error) { await c.query('ROLLBACK'); throw error; }
  });
  const hitCount = hits.is_called ? Number(hits.last_value) : 0;
  const pin = ctx.artifact(`${ctx.next('fi-disarmed')}.json`, { control, hitCount, identityMatched: true }, { kind: 'actual-exact-FI-disarmed', hitCount, exactObjectsOnly: true });
  delete ctx.state.activeFault; ctx.persist(); return { hitCount, receipt: pin };
}
export async function faultAndRetry(ctx, api, { operationId, params, body, actor = 'manager', binding = {}, fault }) {
  assert(fault && !binding.fi && !binding.expectedStatus);
  const failed = await api.request(operationId, params, body, actor, { ...binding, expectedStatus: 500, fi: fault });
  assert.equal(failed.fault.hitCount, 1, 'Required write must have been actually reached exactly once');
  const before = loadSnapshot(ctx, failed.before), after = loadSnapshot(ctx, failed.after);
  const changes = difference(before, after);
  const business = changes.filter(ch => !['auth_session', 'platform_user', 'security_event', 'audit_log'].includes(ch.table));
  assert.equal(business.length, 0, 'Required-write fault left business changes; do not retry');
  const successful = await api.request(operationId, params, body, actor, binding);
  const receipt = ctx.artifact(`${ctx.next('fault-retry')}.json`, { operationId, failed: { receipt: failed.receiptId, fault: failed.fault, before: failed.before, after: failed.after },
    retry: { receipt: successful.receiptId, status: successful.status }, sameBody: true, businessRollback: true, authenticationTouchesSeparatelyObserved: true },
    { kind: 'actual-one-hit-required-write-rollback-and-same-body-retry', operationId, faultHits: 1, businessRollback: true, retryStatus: successful.status });
  return { failed, successful, receipt };
}
