import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sha } from './pure.mjs';
import { rawSelected } from './context.mjs';
import { loadSnapshot, readRows } from './snapshot.mjs';
import { statusBindings } from './status.mjs';

const ACTORS = { admin: { username: 'admin', password: 'admin123' }, viewer: { username: 'viewer', password: 'viewer123' } };
const metadata = {
  PlatformController_createUser: ['platform_user', 'username', 'HTTP-user', 'platform.user.created'],
  PlatformController_createRole: ['role', 'roleKey', 'HTTP-role', 'platform.role.created'],
  PlatformController_createOrgUnit: ['org_unit', 'code', 'HTTP-org', 'platform.org-unit.created'],
};
const events = { PlatformController_deactivateRole: ['role', 'HTTP-role', 'platform.role.deactivated'], PlatformController_activateRole: ['role', 'HTTP-role', 'platform.role.activated'], PlatformController_deactivateOrgUnit: ['org_unit', 'HTTP-org', 'platform.org-unit.deactivated'], PlatformController_activateOrgUnit: ['org_unit', 'HTTP-org', 'platform.org-unit.activated'] };
export function api(ctx) {
  const spec = JSON.parse(fs.readFileSync(`${ctx.win}/libs/shared/api-spec/openapi.json`));
  const operations = new Map();
  for (const [template, methods] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(methods)) if (op.operationId) operations.set(op.operationId, { method: method.toUpperCase(), template, op });
  const baseline = loadSnapshot(ctx, 'baseline');
  const actualStatuses = statusBindings(ctx);
  ctx.artifact(`${ctx.next('status-bindings')}.json`, { actualStatuses, statusSourcePins: ctx.state.statusSourcePins }, { kind: 'actual-runtime-create-status-source-bindings', statuses: Object.fromEntries(Object.entries(actualStatuses).map(([id, b]) => [id, b.status])), declaredSwaggerDriftPreserved: true });
  ctx.persist();
  const success = operationId => {
    if (actualStatuses[operationId]) return actualStatuses[operationId].status;
    const statuses = Object.keys(operations.get(operationId)?.op.responses ?? {}).filter(s => /^2\d\d$/.test(s));
    assert.equal(statuses.length, 1, 'An unbound ambiguous success status needs an explicit source binding');
    return Number(statuses[0]);
  };
  const existed = new Set(Object.entries(baseline.databases[ctx.database].tables).flatMap(([table, meta]) => readRows(meta).map(row => JSON.stringify([table, row.key]))));
  const register = (table, row, proof) => {
    assert(!existed.has(JSON.stringify([table, row.key])), 'Cannot own a pre-existing baseline row');
    ctx.own(ctx.database, table, row, proof);
  };
  async function recordRelated(request, selector, actor) {
    await ctx.db(async c => {
      const proof = { requestId: request.requestId, operationId: request.operationId, actualHttpStatus: request.status, actualResponseComplete: request.responseComplete, receipt: request.receipt, beforeLocator: request.beforeLocator, sharedCaseKey: request.sharedCaseKey };
      if (selector) {
        const { table, column, value, kind, event } = selector;
        const rows = await rawSelected(c, table, `t."${column}"=$1`, [value]);
        assert(rows.length <= 1);
        for (const row of rows) {
          const existing = Object.values(ctx.state.owned).some(o => o.database === ctx.database && o.table === table && JSON.stringify(o.key) === JSON.stringify(row.key));
          if (!existing && (request.status !== success(request.operationId) || request.body?.id?.toLowerCase() !== row.key[0]?.toLowerCase())) {
            // A concurrent 409 may see the winner. This is an observation only;
            // its actual source-bound success+UUID must establish birth separately.
            ctx.artifact(`${ctx.next('unack-row')}.json`, { proof, selector, observed: row, ownershipGranted: false }, { kind: 'response-row-observation-without-create-ack', actualHttpStatus: request.status, ownershipGranted: false });
            continue;
          }
          register(table, row, { ...proof, kind, locator: { column, value } });
          const object = JSON.parse(row.raw); // Only UUID/username metadata; money raw is never reserialized.
          if (table === 'platform_user') {
            for (const relation of ['user_role_assignment', 'user_org_membership']) for (const child of await rawSelected(c, relation, 't.user_id=$1::uuid', [object.id])) register(relation, child, { ...proof, kind: 'HTTP-user-child', actualParentId: object.id, parentRowSha256: row.sha256 });
          }
          if (event) for (const audit of await rawSelected(c, 'audit_log', 't.target_id=$1 AND t.event_type=$2', [object.id, event])) register('audit_log', audit, { ...proof, kind: 'HTTP-target-audit', targetId: object.id, event });
        }
      }
      for (const row of await rawSelected(c, 'security_event', 't.request_id=$1', [request.requestId])) register('security_event', row, { ...proof, kind: 'HTTP-request-security', exactRequestId: request.requestId });
      // A cookie token hash binds the actual auth-session INSERT to its real login,
      // never to a whole time window. Values and token hashes stay private.
      for (const [key, current] of Object.entries(ctx.state.actors)) {
        if (!current.cookies?.poms_session) continue;
        const tokenHash = sha(decodeURIComponent(current.cookies.poms_session));
        const sessions = await rawSelected(c, 'auth_session', 't.token_hash=$1', [tokenHash]);
        assert(sessions.length <= 1);
        for (const row of sessions) {
          current.sessionId = row.key[0];
          register('auth_session', row, { ...proof, kind: 'HTTP-cookie-session', cookieHashBound: true, actorKey: key, loginRequestId: current.loginRequestId ?? request.requestId });
        }
      }
    });
    ctx.persist();
  }
  async function request(operationId, id, body, actorKey = 'admin', meta = {}) {
    const op = operations.get(operationId); assert(op, 'Operation absent from full frozen contract');
    assert(meta.csrf === undefined || ['omit', 'wrong'].includes(meta.csrf));
    const actor = ctx.state.actors[actorKey] ??= { cookies: {}, id: null, permissions: [] };
    let urlPath = op.template;
    for (const part of [...urlPath.matchAll(/\{([^}]+)\}/g)]) { assert(typeof id === 'string' && id); urlPath = urlPath.replace(part[0], encodeURIComponent(id)); }
    assert(urlPath.startsWith('/api/'));
    const n = ctx.next('http'), requestId = `${ctx.state.prefix}-${n}-${randomUUID().slice(0, 8)}`;
    const headers = { Origin: ctx.origin, 'X-Request-Id': requestId, 'Accept-Encoding': 'identity' };
    if (Object.keys(actor.cookies).length) headers.Cookie = Object.entries(actor.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    if (!['GET', 'HEAD'].includes(op.method) && actor.cookies.poms_csrf && meta.csrf !== 'omit') headers['X-CSRF-Token'] = meta.csrf === 'wrong' ? 'deliberately-invalid-test-token' : decodeURIComponent(actor.cookies.poms_csrf);
    const payload = body === null || body === undefined ? Buffer.alloc(0) : Buffer.from(JSON.stringify(body));
    if (payload.length) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = payload.length; }
    let selector;
    if (metadata[operationId]) {
      const [table, field, kind, event] = metadata[operationId], column = field === 'roleKey' ? 'role_key' : field;
      assert(typeof body?.[field] === 'string' && body[field].startsWith(ctx.state.prefix), 'Create fixtures need this exact run prefix');
      selector = { table, column, value: body[field], kind, event };
    } else if (events[operationId]) {
      const [table, kind, event] = events[operationId];
      assert(Object.values(ctx.state.owned).some(o => o.database === ctx.database && o.table === table && o.key[0] === id));
      selector = { table, column: 'id', value: id, kind, event };
    }
    const beforeLocator = selector ? await ctx.db(c => rawSelected(c, selector.table, `t."${selector.column}"=$1`, [selector.value])) : [];
    const configPin = ctx.artifact(`${n}-request-config.json`, { operationId, requestId, method: op.method, url: ctx.api + urlPath, headers, selector, beforeLocator });
    const bodyPin = ctx.artifact(`${n}-request-body.bin`, payload);
    ctx.persist(); // Reserve before I/O; failed/partial originals never reuse a slot.
    const chunks = []; let response, failure;
    try {
      response = await new Promise((resolve, reject) => {
        const req = http.request(ctx.api + urlPath, { method: op.method, headers, timeout: 45000 }, res => {
          ctx.artifact(`${n}-response-headers.json`, { statusCode: res.statusCode, rawHeaders: res.rawHeaders });
          for (const cookie of res.headers['set-cookie'] ?? []) {
            const part = cookie.split(';', 1)[0], at = part.indexOf('='); if (at < 1) continue;
            const key = part.slice(0, at), value = part.slice(at + 1);
            if (/max-age=0/i.test(cookie)) delete actor.cookies[key]; else actor.cookies[key] = value;
          }
          res.on('data', b => chunks.push(Buffer.from(b)));
          res.once('aborted', () => reject(new Error('Response body aborted')));
          res.once('error', reject); res.once('end', () => resolve({ status: res.statusCode, complete: res.complete }));
        });
        req.once('error', reject); req.once('timeout', () => req.destroy(new Error('HTTP timeout')));
        req.end(payload.length ? payload : undefined);
      });
    } catch (error) { failure = error; ctx.artifact(`${n}-transport-failure.json`, { name: error.name, message: error.message, stack: error.stack }); }
    const bytes = Buffer.concat(chunks), responsePin = ctx.artifact(`${n}-response-body.bin`, bytes);
    let value; try { value = bytes.length ? JSON.parse(bytes.toString('utf8')) : null; } catch { value = null; }
    const receipt = { requestId, operationId, actorKey, status: response?.status ?? null, responseComplete: response?.complete === true, transportFailure: Boolean(failure), configuredRequestHeaders: configPin, requestBody: bodyPin, responseBody: responsePin, payloadsPublished: false, byteBoundary: 'Node HTTP configured headers and transfer-decoded entity bytes; not a TCP wire capture' };
    ctx.public(`${n}-http.json`, receipt);
    const result = { ...receipt, body: value, receipt: `${ctx.out}/${n}-http.json`, beforeLocator, sharedCaseKey: sha(operationId + '\n' + payload.toString('utf8')) };
    if (operationId === 'AuthController_createPasswordAuthSession' && response?.status === 200) actor.loginRequestId = requestId;
    // Even a lost response can commit. Reconcile only its exact request-bound
    // username/key/code and token/request IDs, retaining the failed label.
    await recordRelated(result, selector, actor);
    if (failure || !response?.complete) throw new Error('Actual HTTP attempt incomplete; inspect immutable private originals and ownership journal');
    return result;
  }
  async function login(key = 'admin', seed = 'admin') {
    assert(ACTORS[seed]); ctx.state.actors[key] = { cookies: {}, id: null, permissions: [] };
    assert.equal((await request('AuthController_getCsrfToken', null, null, key)).status, 200);
    assert.equal((await request('AuthController_createPasswordAuthSession', null, ACTORS[seed], key)).status, 200);
    const current = await request('AuthController_getCurrentAuthSession', null, null, key); assert.equal(current.status, 200);
    const data = current.body?.data ?? current.body, user = data?.user ?? data?.currentUser;
    assert(user && Array.isArray(user.permissions));
    const actor = ctx.state.actors[key]; actor.id = user.id ?? user.userId ?? user.sub; actor.permissions = user.permissions;
    assert(typeof actor.id === 'string');
    const seeded = readRows(baseline.databases[ctx.database].tables.platform_user).find(row => row.key[0] === actor.id);
    assert(seeded && JSON.parse(seeded.raw).username === ACTORS[seed].username, 'Login must bind a real pre-baseline public dev-seeder actor');
    ctx.state.borrowed ??= {};
    ctx.state.borrowed[actor.id] = { table: 'platform_user', key: [actor.id], allowedColumns: ['last_login_at', 'updated_at', 'row_version'], baselineSha256: seeded.sha256 };
    ctx.persist(); return actor;
  }
  return { request, login, success, actualStatuses };
}
