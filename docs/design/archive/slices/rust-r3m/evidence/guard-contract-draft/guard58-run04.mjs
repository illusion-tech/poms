// Root-only executor draft. This file has not been executed by its author.
// Its imports deliberately work from tmp/rust-r3m/guard-contract-draft/.
import fs from 'node:fs';
import {pin,sha} from '../../../tools/rust-r3m/source-guard.mjs';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { openAcceptanceContext } from '../../../tools/rust-r3m/acceptance-context04.mjs';
import { HttpSession } from '../../../tools/rust-r3m/wire-client.mjs';
import { buildGuard58Plan, permissionAllowed, guardEnvelope } from './guard58-plan01.mjs';

const source = 'tmp/rust-r3m/guard-contract-draft/guard58-run04.mjs';
const [tag, phase, runId] = process.argv.slice(2);
const ctx = await openAcceptanceContext({ backend: 'rust', tag, phase, runId, evidenceKind: 'candidate-guard' });
ctx.addSource(source); ctx.addSource('tmp/rust-r3m/guard-contract-draft/guard58-plan01.mjs');
ctx.addSource('docs/design/rust-r3-operation-slices.json');
const require = createRequire(import.meta.url), bcrypt = require('bcryptjs');
const plan = buildGuard58Plan(JSON.parse(fs.readFileSync('docs/design/rust-r3-operation-slices.json')), randomUUID());
for (const [i,policy] of plan.policies.entries()) policy.label = 'g' + phase + '_p' + i;
let completed = false, error = null, lifecycleActor = null;

async function actor(label, permissions) {
  assert(label.length<=20,'Fixture label must fit its 64-character run-scoped DB key');
  assert(!ctx.actors.some(a => a.label === label), 'Use a new phase/cohort after a partial setup');
  const a = { label, userId: randomUUID(), orgId: randomUUID(), roleId: randomUUID(), username: 'r3m_' + ctx.runId.replaceAll('-', '') + '_' + label, password: randomBytes(24).toString('hex') };
  const name = 'R3CO ' + ctx.runId + ' ' + label;
  await ctx.db.query('insert into poms.org_unit(id,name,code,is_active) values($1,$2,$3,true)', [a.orgId, name, 'r3m-' + ctx.runId + '-' + label]);
  await ctx.db.query('insert into poms.platform_user(id,username,display_name,is_active,primary_org_unit_id) values($1,$2,$3,true,$4)', [a.userId, a.username, name, a.orgId]);
  await ctx.db.query('insert into poms.local_credential(user_id,password_hash) values($1,$2)', [a.userId, await bcrypt.hash(a.password, 4)]);
  await ctx.db.query('insert into poms.role(id,role_key,name,is_active) values($1,$2,$3,true)', [a.roleId, 'r3m-' + ctx.runId + '-' + label, name]);
  await ctx.db.query('insert into poms.user_role_assignment(user_id,role_id) values($1,$2)', [a.userId, a.roleId]);
  for (const p of permissions) await ctx.db.query('insert into poms.role_permission_assignment(role_id,permission_key) values($1,$2)', [a.roleId, p]);
  await ctx.db.query("insert into poms.user_org_membership(user_id,org_unit_id,membership_type) values($1,$2,'primary')", [a.userId, a.orgId]);
  ctx.actors.push(a);
  for (const id of [a.userId, a.orgId, a.roleId]) ctx.ownedIds.add(id);
  ctx.saveContext();
  const client = new HttpSession('http://127.0.0.1:13500', { journal: ctx.directory + '/raw-wire', label });
  await client.login(a.username, a.password); ctx.clients[label] = client;
  return a;
}
async function graph() {
  const tables = (await ctx.db.query("select tablename from pg_tables where schemaname='poms' order by tablename")).rows.map(x => x.tablename);
  assert.equal(tables.length, 107);
  const excluded = ['auth_session', 'auth_csrf_token', 'audit_log', 'security_event'];
  const result = {};
  for (const table of tables.filter(x => !excluded.includes(x))) {
    assert.match(table, /^[a-z_0-9]+$/);
    result[table] = (await ctx.db.query('select to_jsonb(t)::text row from poms."' + table + '" t')).rows.map(x => x.row).sort();
  }
  assert(result.lead.length && result.customer.length && result.project.length, 'Require the real committed stage cohort; no empty graph oracle');
  return result;
}
function sealGraph(label,value){const file=ctx.directory+'/business-graph-'+label+'-original.json';fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});return{kind:'declared-safe-full-business-graph-digests',privateOriginal:pin(file),tables:Object.entries(value).map(([table,rows])=>({table,rows:rows.length,rawRowsSha256:sha(JSON.stringify(rows))})),requiredSafeRows:Object.fromEntries(['lead','customer','project'].map(table=>[table,value[table].map(raw=>{const r=JSON.parse(raw);return Object.fromEntries(['id','row_version','status','customer_id','source_lead_id','converted_project_id'].filter(k=>Object.hasOwn(r,k)).map(k=>[k,r[k]]));})])),rawCredentialRowsPublished:false};}
function envelope(response, code) {
  assert.equal(response.status, guardEnvelope[code].statusCode);
  assert.deepEqual(response.body, guardEnvelope[code]);
}
async function securityEvent(response, expected) {
  const rows = await ctx.rows('security_event', { request_id: response.requestId });
  assert.equal(rows.length, 1); const event = rows[0];
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(event[key], value, 'Required security source field ' + key);
  assert.equal((await ctx.audit(response.requestId)).length, 0, 'A guard rejection is not a successful business audit');
  return event;
}
async function safeSession(userId) {
  const rows = (await ctx.db.query('select id,user_id,status,row_version,last_seen_at,idle_expires_at,absolute_expires_at,revoked_at,revoked_reason from poms.auth_session where user_id=$1 order by id', [userId])).rows;
  assert.equal(rows.length, 1); return rows[0];
}
try {
  for (const policy of plan.policies) await actor(policy.label, policy.permissions);
  lifecycleActor = await actor('g' + phase + '_guard_lifecycle', plan.permissions);
  const refreshActor = await actor('g' + phase + '_guard_refresh', []);
  ctx.clients.anonymous = new HttpSession('http://127.0.0.1:13500', { journal: ctx.directory + '/raw-wire', label: 'anonymous' });
  const before = await graph();
  await ctx.case('guard58.auth-CSRF-all-any-policy-and-zero-business-delta', async () => {
    const outcomes = [];
    for (const o of plan.targets) {
      const anonymous = await ctx.step('guard.anonymous.' + o.operationId, o.method, o.route, { ...o.options, actor: 'anonymous' }); envelope(anonymous, 'session_missing');
      const item = { operationId: o.operationId, policy: o.permissions, anonymous };
      if (o.method !== 'GET') {
        item.csrf = await ctx.step('guard.csrf.' + o.operationId, o.method, o.route, { ...o.options, csrf: false }); envelope(item.csrf, 'csrf_failed');
        item.csrfSecurity = await securityEvent(item.csrf, { event_type: 'auth.csrf.failed', actor_id: ctx.ids.adminUserId, path: o.route, method: o.method, result: 'blocked', details: { reason: 'missing_header' } });
      }
      item.policies = [];
      for (const policy of plan.policies) {
        const allowed = permissionAllowed(o, policy.permissions);
        const response = await ctx.step('guard.' + policy.label + '.' + o.operationId, o.method, o.route, { ...o.options, actor: policy.label });
        if (allowed) assert([200, 400, 404].includes(response.status), 'Authorized guard must reach the read/validation/not-found handler: ' + o.operationId + '/' + policy.label + '=' + response.status);
        let security = null;
        if (!allowed) {
          envelope(response, 'permission_denied');
          security = await securityEvent(response, { event_type: 'authz.permission.denied', actor_id: ctx.actors.find(a => a.label === policy.label).userId, path: o.route, method: o.method, result: 'blocked', permission_key: o.permissions.all[0] || o.permissions.any[0], details: { requiredPermissions: o.permissions.all, ...(o.permissions.any.length ? { requiredAnyPermissions: o.permissions.any } : {}), userPermissions: [...policy.permissions].sort() } });
        }
        item.policies.push({ actor: policy.label, permissions: policy.permissions, expectedAllowed: allowed, response, security });
      }
      outcomes.push(item);
    }
    const after = await graph(); assert.deepEqual(after, before);
    return { operations: 58, outcomes, beforeGraph:sealGraph('before',before), afterGraph:sealGraph('after',after), nonemptyFullBusinessGraphUnchanged: true, exactDeniedEnvelopes: true, businessSuccessClaims: 0 };
  }, { kind: 'guard' });
  await ctx.case('guard58.raw-route-method-and-parser-order', async () => {
    const outcomes = [];
    for (const [i, c] of plan.raw.entries()) {
      const response = await ctx.step('guard.raw.' + i, c.method, c.route, { actor: 'anonymous', ...(c.malformed ? { raw: '{' } : c.method === 'GET' || c.method === 'OPTIONS' ? {} : { json: {} }) });
      assert.equal(response.status, c.status, c.method + ' ' + c.route);
      if (c.code) envelope(response, c.code);
      if (c.decodeSegment) assert.deepEqual(response.body, { statusCode: 400, message: "Failed to decode param '" + c.decodeSegment + "'", error: 'Bad Request' });
      if (c.html) { assert.equal(typeof response.body, 'string'); assert(response.body.includes('<pre>Cannot ' + c.method + ' ' + c.route.split('?')[0] + '</pre>')); }
      if (c.jsonNotFound) assert.deepEqual(response.body, { statusCode: 404, message: 'Cannot ' + c.method + ' ' + c.route, error: 'Not Found' });
      if (c.malformed) { assert.equal(response.body.statusCode, 400); assert.equal(response.body.error, 'Bad Request'); assert.match(response.body.message, /^Expected property name/); }
      outcomes.push({ input: c, response });
    }
    assert.deepEqual(await graph(), before);
    return { outcomes, businessGraphUnchanged: true };
  }, { kind: 'guard' });
  await ctx.case('guard58.shared-auth-lifecycle-each-adapter', async () => {
    const session = await safeSession(lifecycleActor.userId), outcomes = [];
    for (const code of ['session_expired', 'session_revoked', 'account_disabled']) {
      for (const o of plan.lifecycleTargets) {
        const original = await safeSession(lifecycleActor.userId);
        await ctx.db.query('update poms.platform_user set is_active=$2 where id=$1', [lifecycleActor.userId, code !== 'account_disabled']);
        await ctx.db.query("update poms.auth_session set status=$2::text,idle_expires_at=clock_timestamp()+$3::interval,absolute_expires_at=clock_timestamp()+interval '2 hours',revoked_at=case when $2::text='revoked' then clock_timestamp() else null end,revoked_reason=case when $2::text='revoked' then 'admin-revoked' else null end,row_version=row_version+1 where id=$1", [session.id, code === 'session_revoked' ? 'revoked' : 'active', code === 'session_expired' ? '-1 second' : '1 hour']);
        const prepared = await safeSession(lifecycleActor.userId);
        ctx.preparedFacts.push({ kind: 'owned-auth-lifecycle-fact-not-public-producer', original, prepared, userActive: code !== 'account_disabled' });
        const response = await ctx.step('guard.lifecycle.' + code + '.' + o.operationId, o.method, o.route, { ...o.options, actor: lifecycleActor.label }); envelope(response, code);
        const stored = await safeSession(lifecycleActor.userId);
        if (code === 'session_expired') assert.equal(stored.status, 'expired');
        if (code === 'session_revoked') assert.equal(stored.status, 'revoked');
        if (code === 'account_disabled') { assert.equal(stored.status, 'revoked'); assert.equal(stored.revoked_reason, 'account-disabled'); }
        const security = await securityEvent(response, { event_type: 'auth.session.invalid', actor_id: null, path: o.route, method: o.method, result: code === 'session_expired' ? 'expired' : 'failed', severity: code === 'account_disabled' ? 'high' : 'warning', details: { reason: code } });
        outcomes.push({ operationId: o.operationId, code, response, stored, security });
      }
    }
    // Return this actor to active so other case admission and later cleanup do
    // not inherit an intentionally disabled user. Retain all preparations.
    await ctx.db.query('update poms.platform_user set is_active=true where id=$1', [lifecycleActor.userId]);
    assert.deepEqual(await graph(), before);
    return { adapterResourceTargets: plan.lifecycleTargets.length, classes: 3, outcomes, businessGraphUnchanged: true, DBOptInTestsExecuted: 0 };
  }, { kind: 'guard' });
  await ctx.case('guard58.existing-session-next-authorization-refresh', async () => {
    const path = '/api/leads/' + ctx.ids.leadId;
    assert(ctx.ids.leadId, 'Real stage bootstrap lead required');
    const deniedBefore = await ctx.step('guard.refresh.before', 'GET', path, { actor: refreshActor.label }); envelope(deniedBefore, 'permission_denied');
    await ctx.db.query('insert into poms.role_permission_assignment(role_id,permission_key) values($1,$2)', [refreshActor.roleId, 'lead:read']);
    let allowed;
    try { allowed = await ctx.step('guard.refresh.granted-existing-session', 'GET', path, { actor: refreshActor.label }, 200); assert.equal(allowed.body.id, ctx.ids.leadId); }
    finally { await ctx.db.query('delete from poms.role_permission_assignment where role_id=$1 and permission_key=$2', [refreshActor.roleId, 'lead:read']); }
    const deniedAfter = await ctx.step('guard.refresh.revoked-existing-session', 'GET', path, { actor: refreshActor.label }); envelope(deniedAfter, 'permission_denied');
    assert.deepEqual(await graph(), before);
    return { deniedBefore, allowed, deniedAfter, sameHttpSessionObject: true, permissionsImmediatelyReloaded: true, businessGraphUnchanged: true };
  }, { kind: 'guard' });
  completed = true;
} catch (e) {
  error = { name: e.name, message: e.message.split('\n')[0] };
  fs.writeFileSync(ctx.directory + '/original-error.log', e.stack || String(e), { flag: 'wx', mode: 0o600 });
  process.exitCode = 1;
} finally {
  // A failed assertion must not leave a QA-only actor disabled and prevent a
  // later new-phase admission from logging in the registered cohort actors.
  if (lifecycleActor) await ctx.db.query('update poms.platform_user set is_active=true where id=$1', [lifecycleActor.userId]);
  await ctx.finish(completed, error);
}
