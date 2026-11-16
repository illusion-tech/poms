import {currentRuntime121,assertCurrentLease121,runtimeReference121} from './runtime-admission121.mjs';
import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sha, operationMap, exactPath, data, boundStatus } from './pure.mjs';
import { capture } from './snapshot.mjs';
import { assertRecorded, reconcileAttempt, allowBorrowed, allowNumberCounter } from './ledger.mjs';
import { statusBindings } from '../userfix/status.mjs';
import { ownedFile } from './context.mjs';
import { assertRestatementLaborNumberBinding } from './restatement-labor-number.mjs';
import { processReference1351 } from './same-source-process1351.mjs';

function bindActualApi(ctx) {
  const file = ctx.options['api-process-record'] ?? ctx.state.apiProcess?.file;
  assert(file && file.startsWith(ctx.private + '/'), 'Explicit actual owned API private process record required');
  const bytes = ownedFile(file), record = JSON.parse(bytes);
  assert.equal(record.namespace, ctx.namespace); assert.equal(record.port, 31441); assert.equal(record.root, ctx.mirror);
  assert(Number.isSafeInteger(record.pid) && record.pid > 1 && record.startTime && record.binarySha256);
  assert.equal(fs.readFileSync(`/proc/${record.pid}/stat`, 'utf8').split(' ')[21], record.startTime, 'Owned API PID was reused or stopped');
  assert.equal(fs.realpathSync(`/proc/${record.pid}/exe`), record.binary);
  assert.equal(sha(fs.readFileSync(record.binary)), record.binarySha256, 'Started binary identity changed');
  const binding = { file, rawBytesSha256: sha(bytes), record };
  if (ctx.state.apiProcess) assert.deepEqual(binding, ctx.state.apiProcess, 'Do not silently change the bound API process');
  else { ctx.state.apiProcess = binding; ctx.persist(); }
}

export function createApi(ctx) {
  const lease121=Object.hasOwn(ctx.state,'runtimeAdmission121')?currentRuntime121(ctx):null;
  if(!lease121)bindActualApi(ctx);
  const spec = JSON.parse(fs.readFileSync(`${ctx.win}/libs/shared/api-spec/openapi.json`));
  const operations = operationMap(spec), actual = statusBindings(ctx);
  const success = id => {
    if (actual[id]) return actual[id].status;
    const candidates = Object.keys(operations.get(id)?.op.responses ?? {}).filter(s => /^2\d\d$/.test(s));
    assert.equal(candidates.length, 1, 'Success status needs exact source binding'); return Number(candidates[0]);
  };
  ctx.artifact(`${ctx.next('status-bindings')}.json`, { actual, sourcePins: ctx.state.statusSourcePins }, { kind: 'source-bound-platform-create-status', status: 201, blanketStatusWidening: false });
  async function request(operationId, params = {}, body = null, actorKey = 'bootstrap', binding = {}) {
    if(lease121)assertCurrentLease121(ctx,lease121);
    assert(!ctx.state.cleaned && !ctx.state.cleanupPlan && !ctx.state.blockedObservation && !ctx.state.activeFault, 'No HTTP after cleanup, unresolved observation or leftover FI');
    assert(ctx.state.baseline, 'Original immutable baseline required before any HTTP');
    const op = operations.get(operationId); assert(op, 'operationId absent from current full OpenAPI');
    const exactSuccess = success(operationId), expectedStatus = boundStatus(exactSuccess, binding.expectedStatus);
    assert(binding.csrf === undefined || ['omit', 'wrong'].includes(binding.csrf));
    assert(!['headers', 'cookie', 'authorization', 'url', 'path', 'method'].some(k => Object.hasOwn(binding, k)), 'Authentication and canonical route are harness-owned');
    for (const item of binding.updatedAnchors ?? []) {
      assert(typeof item.requestBinding === 'string');
      const bound = item.requestBinding.startsWith('path:') ? params[item.requestBinding.slice(5)] : item.requestBinding.startsWith('body:') ? item.requestBinding.slice(5).split('/').slice(1).reduce((v, k) => v?.[k], body) : null;
      assert.equal(bound, item.id, 'Updated transaction anchor must be the actual request path/body ID');
    }
    const url = new URL(ctx.api + exactPath(op.template, params));
    for (const [key, value] of Object.entries(binding.query ?? {})) if (value !== null && value !== undefined) {
      const values = Array.isArray(value) ? value : [value]; for (const item of values) url.searchParams.append(key, String(item));
    }
    assert.equal(url.origin, ctx.api); assert(!['GET', 'HEAD'].includes(op.method) || body === null, 'GET/HEAD body forbidden');
    const actor = ctx.state.actors[actorKey] ??= { cookies: {}, id: null, permissions: [] };
    const label = ctx.next('http'), requestId = `${ctx.state.prefix}-${label}-${randomUUID().slice(0, 8)}`;
    if (assertRestatementLaborNumberBinding(ctx, operationId, body, binding)) await allowNumberCounter(ctx, 'cost-labor');
    if (binding.number) await allowNumberCounter(ctx, binding.number.scope);
    const before = await capture(ctx, `${label}-before`); assertRecorded(ctx, before);
    let fault = null;
    if (binding.fi) { assert.equal(binding.expectedStatus, 500, 'FI attempts must keep an explicit failure status'); const { installFault } = await import('./faults.mjs'); await installFault(ctx, binding.fi, requestId, before); }
    const reference121=lease121?runtimeReference121(ctx,lease121):null;
    const headers = { Origin: ctx.origin, 'X-Request-Id': requestId, 'Accept-Encoding': 'identity' };
    if (Object.keys(actor.cookies).length) headers.Cookie = Object.entries(actor.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    if (!['GET', 'HEAD'].includes(op.method) && actor.cookies.poms_csrf && binding.csrf !== 'omit') headers['X-CSRF-Token'] = binding.csrf === 'wrong' ? 'deliberately-invalid-test-token' : decodeURIComponent(actor.cookies.poms_csrf);
    if (binding.rawJson !== undefined) { assert(typeof binding.rawJson === 'string' && body === null && !['GET', 'HEAD'].includes(op.method)); assert([400, 422].includes(binding.expectedStatus), 'Raw JSON only for explicit negative protocol/decimal-shape tests'); }
    const payload = binding.bytes ? Buffer.from(binding.bytes) : binding.rawJson !== undefined ? Buffer.from(binding.rawJson) : body === null ? Buffer.alloc(0) : Buffer.from(JSON.stringify(body));
    if (binding.bytes) { assert(op.method === 'PUT'); assert(op.op.requestBody?.content?.['application/octet-stream']); headers['Content-Type'] = 'application/octet-stream'; }
    else if (payload.length) headers['Content-Type'] = 'application/json';
    if (payload.length || binding.bytes) headers['Content-Length'] = payload.length;
    const originals = { requestConfig: ctx.artifact(`${label}-request.json`, { ...(reference121?{runtimeReference121:reference121}:{}), operationId, requestId, url: url.href, method: op.method, headers, binding: { ...binding, bytes: undefined, rawJson: undefined }, before: before.manifest }),
      requestBody: ctx.artifact(`${label}-request-body.bin`, payload) };
    ctx.persist(); const chunks = []; let response, failure;
    try {
      response = await new Promise((resolve, reject) => {
        const req = http.request(url, { method: op.method, headers, timeout: 45000 }, res => {
          originals.responseHeaders = ctx.artifact(`${label}-response-headers.json`, { status: res.statusCode, rawHeaders: res.rawHeaders });
          for (const cookie of res.headers['set-cookie'] ?? []) { const part = cookie.split(';', 1)[0], at = part.indexOf('='); if (at < 1) continue; const key = part.slice(0, at); if (/max-age=0/i.test(cookie)) delete actor.cookies[key]; else actor.cookies[key] = part.slice(at + 1); }
          res.on('data', b => chunks.push(Buffer.from(b))); res.once('aborted', () => reject(new Error('HTTP response aborted'))); res.once('error', reject);
          res.once('end', () => resolve({ status: res.statusCode, complete: res.complete, contentType: res.headers['content-type'] ?? null }));
        });
        req.once('error', reject); req.once('timeout', () => req.destroy(new Error('HTTP timeout'))); req.end(payload.length ? payload : undefined);
      });
    } catch (error) { failure = error; originals.failure = ctx.artifact(`${label}-transport-failure.json`, { name: error.name, message: error.message, stack: error.stack }); }
    const bytes = Buffer.concat(chunks); originals.responseBody = ctx.artifact(`${label}-response-body.bin`, bytes);
    let parsed = null; try { parsed = bytes.length ? JSON.parse(bytes.toString('utf8')) : null; } catch { /* Actual bytes are always retained. */ }
    const attempt = { ...(reference121?{runtimeReference121:reference121}:{}), ...(ctx.state.processRestart1351 ? { processBinding1351: processReference1351(ctx) } : {}), operationId, requestId, actorKey, actorId: actor.id, pathParams: params, requestValue: body, requestBodySha256: sha(payload), status: response?.status ?? null, expectedStatus, responseComplete: response?.complete === true, transportFailure: Boolean(failure), body: parsed };
    const publicReceipt = `${label}-http.json`;
    ctx.public(publicReceipt, { ...(reference121?{runtimeReference121:reference121}:{}), ...(ctx.state.processRestart1351 ? { processBinding1351: processReference1351(ctx) } : {}), kind: 'actual-business-HTTP-attempt', operationId, requestId, actorKey, method: op.method, canonicalTemplate: op.template,
      querySha256: sha(url.search), status: attempt.status, expectedStatus, responseComplete: attempt.responseComplete, transportFailure: attempt.transportFailure,
      originals, bodyByteBoundary: 'Configured headers and Node HTTP transfer-decoded entity bytes; not raw TCP capture', secretsHeadersAndPayloadPublished: false });
    ctx.persist();
    // Raw ACK/body/attempt are durable before a post-lease failure can STOP.
    if(lease121)assertCurrentLease121(ctx,lease121);
    if (binding.fi) { const { removeFault } = await import('./faults.mjs'); fault = await removeFault(ctx); }
    const after = await capture(ctx, `${label}-after`);
    const ledger = await reconcileAttempt(ctx, before, after, attempt, binding);
    if (failure || !attempt.responseComplete) throw new Error('Actual transport incomplete: reconcile committed state; never infer rollback from missing ACK');
    assert.equal(attempt.status, expectedStatus, 'Unexpected exact HTTP status; private original is authoritative');
    return { ...attempt, bytes, contentType: response.contentType, receiptId: `${ctx.out}/${publicReceipt}`, ledger, fault, before: before.manifest, after: after.manifest };
  }
  async function login(key) {
    const actor = ctx.state.actors[key]; assert(actor?.username && actor.password);
    actor.cookies = {}; ctx.persist();
    await request('AuthController_getCsrfToken', {}, null, key);
    await request('AuthController_createPasswordAuthSession', {}, { username: actor.username, password: actor.password }, key);
    const current = data(await request('AuthController_getCurrentAuthSession', {}, null, key));
    const user = current?.user ?? current?.currentUser ?? current; const id = user?.id ?? user?.userId ?? user?.sub;
    const permissions = user?.permissions ?? current?.permissions;
    assert(typeof id === 'string' && Array.isArray(permissions)); if (actor.id) assert.equal(id, actor.id);
    actor.id = id; actor.permissions = permissions; ctx.persist(); return actor;
  }
  async function bootstrap() {
    const baselineRows = JSON.parse(fs.readFileSync(ctx.state.baseline.file)).databases[ctx.database].tables.platform_user;
    const bytes = fs.readFileSync(baselineRows.file); assert.equal(sha(bytes), baselineRows.rawBytesSha256);
    const row = bytes.toString().split('\n').filter(Boolean).map(JSON.parse).find(r => JSON.parse(r.raw).username === 'admin');
    assert(row, 'Actual seeded bootstrap user required');
    allowBorrowed(ctx, 'platform_user', row.key, ['last_login_at', 'updated_at', 'row_version'], 'Seed bootstrap authentication timestamp/version changes only; no role/business change');
    const { registerOriginalSeedActor } = await import('./actors.mjs');
    registerOriginalSeedActor(ctx, { spec }, row.key[0], 'bootstrap'); ctx.persist();
  }
  return { request, login, bootstrap, operations, spec, success };
}
