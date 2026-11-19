import { observeFontBoundary32 } from './ui-font-boundary32.mjs';
// Real locator/input/click actions only. No substitute API calls, response fulfillment or DOM injection.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { lifecycleEvidence18, instant } from './ui-lifecycle18-policy.mjs';
export const SOURCE_BASE_SHA256 = '52addde6eab92076ea50970e597754bf426fc21a87019c91e25714b40068fe0c';
const origin = 'http://127.0.0.1:44551', root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const unwrap = value => value?.data ?? value, json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
function operations() {
  const spec = JSON.parse(fs.readFileSync(`${root}/libs/shared/api-spec/openapi.json`)), map = new Map();
  for (const [template, item] of Object.entries(spec.paths)) for (const [method, operation] of Object.entries(item)) {
    if (!operation.operationId) continue; assert(!map.has(operation.operationId));
    const success = Object.keys(operation.responses ?? {}).filter(key => /^2\d\d$/.test(key)); assert.equal(success.length, 1);
    const pattern = template.split(/(\{[^}]+\})/).map(part => part.startsWith('{') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');
    map.set(operation.operationId, { method: method.toUpperCase(), template, pattern: new RegExp(`^${pattern}$`), status: Number(success[0]) });
  }
  return map;
}
export async function executeCase(browser, expect, test, directory, server) {
  assert.equal(test.kind, 'eo-lifecycle'); assert(test.writeAction?.kind === test.kind);
  const action = test.writeAction, map = operations(), requests = [], errors = [], consoleErrors = [], blockedOrigins = [], actual = [], businessTimes = [];
  const context = await browser.newContext({ baseURL: origin, locale: 'zh-CN', timezoneId: 'Asia/Shanghai', viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', acceptDownloads: true });
  const page = await context.newPage(); page.setDefaultTimeout(90_000); const fontBoundary32 = observeFontBoundary32(page);
  const save = (name, value) => fs.writeFileSync(path.join(directory, name), Buffer.isBuffer(value) ? value : json(value), { flag: 'wx', mode: 0o600 });
  const watch = (id, params = null) => { const operation = map.get(id); assert(operation); const exactPath = params ? operation.template.replace(/\{([^}]+)\}/g, (_, key) => { assert(params[key]); return encodeURIComponent(params[key]); }) : null;
    const waiting = page.waitForResponse(response => response.request().method() === operation.method && (exactPath ? new URL(response.url()).pathname === exactPath : operation.pattern.test(new URL(response.url()).pathname))); void waiting.catch(() => {}); return waiting; };
  const response = async (id, waiting) => { const value = await waiting, operation = map.get(id); assert.equal(value.status(), operation.status, 'One actual canonical status required'); assert(value.headers()['x-poms-r4ghi-ui-run']); const data = unwrap(await value.json()); actual.push({ operationId: id, status: value.status() }); await server.settle(); return { data, response: value }; };
  const component = () => page.locator('app-project-lifecycle-authoring');
  async function openLifecycle() { await expect(page.getByRole('button', { name: '执行、验收与完成', exact: true })).toBeEnabled(); await page.getByRole('button', { name: '执行、验收与完成', exact: true }).click(); await expect(component()).toBeVisible(); await expect(component().getByRole('button', { name: '重新核对当前事实', exact: true })).toBeEnabled(); }
  async function upload(phase) {
    const file = lifecycleEvidence18({ projectId: test.projectId, actorId: test.actor.id, evidenceText: action.evidenceText }, phase), completed = watch('AttachmentUploadSessionController_complete');
    await component().getByLabel('上传已完成的交付或验收材料', { exact: true }).setInputFiles({ name: file.name, mimeType: file.mimeType, buffer: file.bytes });
    const value = (await response('AttachmentUploadSessionController_complete', completed)).data;
    assert.equal(value.checksumSha256, file.checksumSha256); assert.equal(value.sizeBytes, file.sizeBytes); await expect(component()).toContainText(file.name); return value;
  }
  // Read the real backend Date from an actual UI reload. It must be at/after the
  // source instant, so no host-clock guess, truncation or future business time.
  async function businessLocal(minimum) {
    for (let count = 0; count < 8; count++) {
      const current = watch('ProjectController_listAcceptanceRecords', { projectId: test.projectId });
      await component().getByRole('button', { name: '重新核对当前事实', exact: true }).click(); const value = await current; assert.equal(value.status(), map.get('ProjectController_listAcceptanceRecords').status);
      const header = value.headers().date; assert(header, 'Actual backend Date required'); const iso = new Date(header).toISOString(); await server.settle();
      await expect(component().getByRole('button', { name: '重新核对当前事实', exact: true })).toBeEnabled();
      if (instant(iso) >= instant(minimum)) { const local = new Date(Date.parse(iso) + 8 * 3_600_000).toISOString().slice(0, 19); businessTimes.push({ sourceInstant: minimum, actualBackendReadDate: header, exactUTC: iso, enteredLocal: local }); return local; }
      await page.waitForTimeout(200);
    }
    throw new Error('Actual UI backend read clock did not reach the source instant');
  }
  let result;
  try {
    await context.addCookies(Object.entries(test.actor.cookies).map(([name, value]) => ({ name, value, url: origin, httpOnly: name === 'poms_session', sameSite: 'Lax' })));
    await context.route('**/*', async route => { const url = new URL(route.request().url()); if (!['http:', 'https:'].includes(url.protocol) || url.origin === origin) await route.continue(); else { blockedOrigins.push(url.origin); await route.abort('blockedbyclient'); } });
    page.on('request', request => { const url = new URL(request.url()); if (url.origin === origin && url.pathname.startsWith('/api/')) requests.push({ method: request.method(), path: url.pathname }); });
    page.on('pageerror', error => errors.push(error.stack || String(error))); page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    const auth = watch('AuthController_getCurrentAuthSession', {}), initial = watch('ProjectController_getById', { id: test.projectId });
    await page.goto(`/projects/${test.projectId}/governance`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    const session = (await response('AuthController_getCurrentAuthSession', auth)).data; assert(session.authenticated && session.user.id === test.actor.id); assert.deepEqual([...session.permissions].sort(), ['project:read', 'project:write'].sort());
    const full = (await response('ProjectController_getById', initial)).data; assert.equal(full.scopeKind, 'full-project'); assert.equal(full.id, test.projectId); assert.equal(full.currentStage, 'execution'); assert(full.currentStageRecordId);
    await openLifecycle(); await upload('delivery');
    await component().locator('textarea[name="readiness-summary"]').fill(action.readinessSummary); await component().locator('textarea[name="delivery-evidence-summary"]').fill(action.deliveryEvidenceSummary);
    const entering = watch('ProjectController_startAcceptance', { id: test.projectId }), afterEntry = watch('ProjectController_getById', { id: test.projectId }); await component().getByRole('button', { name: '固定交付证据并进入验收', exact: true }).click();
    const entry = (await response('ProjectController_startAcceptance', entering)).data; assert.equal(entry.businessStatusAfter, 'acceptance');
    assert.equal((await response('ProjectController_getById', afterEntry)).data.currentStage, 'acceptance');
    await openLifecycle(); await upload('acceptance');
    await component().locator('select[name="acceptance-type"]').selectOption('final-acceptance'); await component().locator('select[name="acceptance-result"]').selectOption('accepted');
    await component().locator('textarea[name="scope-summary"]').fill(action.scopeSummary); await component().locator('textarea[name="acceptance-evidence-summary"]').fill(action.acceptanceEvidenceSummary);
    const accepting = watch('ProjectController_createAcceptanceRecord', { projectId: test.projectId }), afterAcceptance = watch('ProjectController_getById', { id: test.projectId }); await component().getByRole('button', { name: '确认并固定本次验收结论', exact: true }).click();
    const accepted = (await response('ProjectController_createAcceptanceRecord', accepting)).data; assert.equal(accepted.acceptanceType, 'final-acceptance'); assert.equal(accepted.acceptanceResult, 'accepted');
    assert.equal((await response('ProjectController_getById', afterAcceptance)).data.currentStage, 'acceptance');
    await openLifecycle(); await upload('completion'); await component().locator('select[name="completion-acceptance"]').selectOption(accepted.id);
    await component().locator('input[name="completed-at"]').fill(await businessLocal(accepted.confirmedAt));
    await component().locator('textarea[name="completion-summary"]').fill(action.completionSummary); await component().locator('textarea[name="completion-evidence-summary"]').fill(action.completionEvidenceSummary);
    const completing = watch('ProjectController_createProjectCompletionRecord', { projectId: test.projectId }), afterCompletion = watch('ProjectController_getById', { id: test.projectId }); await component().getByRole('button', { name: '确认最终完成结论', exact: true }).click();
    const completed = (await response('ProjectController_createProjectCompletionRecord', completing)).data; assert.equal(completed.completionResult, 'completed'); assert.equal(completed.conditionStatus, 'not-applicable');
    assert.equal((await response('ProjectController_getById', afterCompletion)).data.currentStage, 'completed');
    await openLifecycle(); await component().locator('input[name="archived-at"]').fill(await businessLocal(completed.completedAt));
    await component().locator('textarea[name="archive-summary"]').fill(action.archiveSummary); await component().locator('textarea[name="archive-evidence-summary"]').fill(action.archiveEvidenceSummary);
    const archiving = watch('ProjectController_createProjectArchiveRecord', { projectId: test.projectId }), afterArchive = watch('ProjectController_getById', { id: test.projectId }); await component().getByRole('button', { name: '固定归档事实', exact: true }).click();
    const archived = (await response('ProjectController_createProjectArchiveRecord', archiving)).data; assert.equal(archived.archiveAnchorStage, 'completed'); assert.equal(archived.status, 'recorded');
    assert.equal((await response('ProjectController_getById', afterArchive)).data.currentStage, 'completed');
    await server.settle(); for (const id of ['CommissionController_getCurrentRoleAssignment', 'CommissionRoleAssignmentController_getRoleAssignmentDetail']) assert(!requests.some(request => map.get(id).method === request.method && map.get(id).pattern.test(request.path)), 'EO lifecycle requested Role GET');
    assert.equal(errors.length, 0); fontBoundary32.assertExpected({ consoleErrors, blocked: blockedOrigins }); 
    result = { kind: test.kind, status: 'passed', actualProjectNavigationObserved: true, actualFormGroups: ['start-acceptance', 'final-acceptance', 'completion', 'archive'], actualOperations: actual,
      stageRecordId: entry.projectStageRecordId, acceptanceId: accepted.id, completionId: completed.id, archiveId: archived.id, businessTimes, allA08FormsPassed: false, G3Certified: false };
  } catch (error) { save('failure.log', Buffer.from(error.stack || String(error))); result = { kind: test.kind, status: 'failed', actualOperations: actual, allA08FormsPassed: false, G3Certified: false }; }
  finally { save('font-boundary32.json', fontBoundary32.snapshot()); save('requests.json', requests); save('page-errors.json', { errors, consoleErrors, blockedOrigins }); save('result.json', result); save('page.html', Buffer.from(await page.content())); await page.screenshot({ path: path.join(directory, 'page.png'), fullPage: true }); await context.close(); }
  return result;
}
