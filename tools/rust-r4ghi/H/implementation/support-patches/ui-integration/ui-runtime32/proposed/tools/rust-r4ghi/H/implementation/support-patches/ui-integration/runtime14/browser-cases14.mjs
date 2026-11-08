import { observeFontBoundary32 } from '../../../../../business/ui-font-boundary32.mjs';
import { performWriteAction14 } from './browser-actions14.mjs';
import { executeCreatorReadback29 } from '../../../../../business/ui-creator-readback-browser29.mjs';
// Derived without case behavior changes from sealed DOM08. Only observer-aware deadlines differ.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
export const SOURCE_BASE_SHA256='52addde6eab92076ea50970e597754bf426fc21a87019c91e25714b40068fe0c';
const fixed={origin:'http://127.0.0.1:44551'},digest=/^[0-9a-f]{64}$/;
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const jsonBytes=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const unwrap=body=>body&&typeof body==='object'&&Object.hasOwn(body,'data')?body.data:body;
const globalPrefixes=new Set(['auth','me','platform','dictionaries','health','security-events','security-events:recordRouteDenied']);
const isDomainRequest=request=>{const pathname=new URL(request.path,fixed.origin).pathname;return pathname.startsWith('/api/')&&!globalPrefixes.has(pathname.split('/')[2]);};
const exactKeys=(value,keys)=>assert.deepEqual(Object.keys(value).sort(),[...keys].sort(),'Narrow response contains a missing or extra field');
export function assertOwnInitialRequests(requests, projectId) {
  const domain = requests.filter(isDomainRequest);
  assert(domain.length > 0, 'No real project domain request was observed');
  assert.equal(domain[0].method, 'GET');
  assert.equal(new URL(domain[0].path, fixed.origin).pathname, `/api/projects/${projectId}/completion-records`, 'Own entry must first load its completion task list');
  for (const request of domain) {
    assert.equal(request.method, 'GET');
    assert.equal(new URL(request.path, fixed.origin).pathname, `/api/projects/${projectId}/completion-records`, 'Own entry read a full/project/finance/attachment list or other domain');
  }
}

function sensitiveVariants(text) {
  const result = [text];
  if (/^-?\d+(?:\.\d+)?$/.test(text)) {
    const [integer, fractional] = text.split('.');
    result.push(integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fractional === undefined ? '' : `.${fractional}`));
  }
  return result;
}

export async function executeCase(browser, expect, test, directory, server) {
  if(test.kind==='creator-assigned-readback') return executeCreatorReadback29(browser,expect,test,directory,server);
  const context = await browser.newContext({ baseURL: fixed.origin, locale: 'zh-CN', timezoneId: 'Asia/Shanghai', viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', acceptDownloads: true });
  const page = await context.newPage(), requests = [], pageErrors = [], consoleErrors = [], blockedOrigins = [];
  const privateWrite = (file, bytes) => fs.writeFileSync(path.join(directory, file), bytes, { flag: 'wx', mode: 0o600 });
  const start = server.exchanges.length;
  let result;
  try {
    await context.addCookies(Object.entries(test.actor.cookies).map(([name, value]) => ({ name, value, url: fixed.origin, httpOnly: name === 'poms_session', sameSite: 'Lax' })));
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (!['http:', 'https:'].includes(url.protocol) || url.origin === fixed.origin) await route.continue();
      else { blockedOrigins.push(url.origin); await route.abort('blockedbyclient'); }
    });
    page.on('request', (request) => { const url = new URL(request.url()); if (url.origin === fixed.origin && url.pathname.startsWith('/api/')) requests.push({ method: request.method(), path: url.pathname + url.search }); });
    page.on('pageerror', (error) => pageErrors.push(error.stack || String(error)));
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.setDefaultTimeout(90_000); const fontBoundary32 = observeFontBoundary32(page);
    const response = (pathname) => { const pending = page.waitForResponse((item) => item.request().method() === 'GET' && new URL(item.url()).pathname === pathname); void pending.catch(() => {}); return pending; };
    const authResponse = response('/api/auth/session');
    const own = test.kind === 'own-condition', execution = test.kind === 'execution-owner', max = test.kind === 'money-max', mask = test.kind === 'sensitive-mask', governance = execution || max || mask;
    const route = `/projects/${test.projectId}${own ? '/condition-tasks' : governance ? '/governance' : ''}`;
    const primaryResponse = response(`/api/projects/${test.projectId}${own ? '/completion-records' : ''}`);
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    const authenticated = await authResponse; assert.equal(authenticated.status(), 200);
    const auth = unwrap(await authenticated.json());
    assert.equal(auth.authenticated, true); assert.equal(auth.user?.id, test.actor.id, 'Actual live session is a different actor');
    const primary = await primaryResponse; assert.equal(primary.status(), 200);
    const data = unwrap(await primary.json());
    privateWrite('primary-response.json', jsonBytes(data));
    if (test.kind === 'creator') {
      assert.equal(data.scopeKind, 'creator-first-assignment-only'); assert.equal(data.projectId, test.projectId); assert.equal(data.creatorUserId, test.actor.id); assert.equal(data.ownerUserId, null);
      exactKeys(data, ['scopeKind', 'projectId', 'projectNo', 'projectRowVersion', 'ownerOrgId', 'ownerUserId', 'creatorUserId', 'ownershipOriginRowVersion', 'allowedActions']);
      assert(data.allowedActions.includes('reassign-owner') && auth.permissions.includes('project:write'), 'Real creator first-assignment action is not ready');
      await expect(page.locator('app-project-creator-first-assignment')).toBeVisible();
      await expect(page.getByRole('button', { name: '读取可指派人员和组织', exact: true })).toBeVisible();
      for (const selector of ['app-project-detail', 'app-project-operating-authoring', 'app-project-operating-review', 'app-project-lifecycle-authoring', 'app-project-role-assignment-authoring']) await expect(page.locator(selector)).toHaveCount(0);
      await page.waitForLoadState('networkidle');
      for (const item of requests.filter(isDomainRequest)) assert.equal(new URL(item.path, fixed.origin).pathname, `/api/projects/${test.projectId}`, 'Creator narrow branch fetched another business view');
    } else if (test.kind === 'legacy-anchor') {
      assert.equal(data.scopeKind, 'legacy-owner-anchor-only'); assert.equal(data.ownerOrgId, null); assert.deepEqual(data.allowedActions, []);
      assert.equal(data.projectId, test.projectId); assert.equal(data.sourceQualification, 'legacy-unverified');
      exactKeys(data, ['scopeKind', 'projectId', 'projectNo', 'projectName', 'currentStage', 'rowVersion', 'ownerUserId', 'ownerOrgId', 'sourceQualification', 'allowedActions', 'explanation']);
      await expect(page.getByRole('region', { name: '历史项目基础锚点', exact: true })).toBeVisible();
      await expect(page.locator('app-project-detail')).toHaveCount(0); await expect(page.locator('app-project-creator-first-assignment')).toHaveCount(0);
    } else if (own) {
      assert.equal(data.scopeKind, 'own-condition-only'); assert.equal(data.projectId, test.projectId);
      exactKeys(data, ['scopeKind', 'projectId', 'items']);
      for (const parent of data.items) {
        exactKeys(parent, ['completionRecordId', 'completionRowVersion', 'conditionStatus', 'ownTasks']);
        for (const task of parent.ownTasks) exactKeys(task, ['conditionId', 'conditionRowVersion', 'summary', 'responsibleUserId', 'dueAt', 'status', 'evidenceRefs', 'closure']);
      }
      const tasks = data.items.flatMap((parent) => parent.ownTasks.map((task) => ({ ...task, completionRecordId: parent.completionRecordId })));
      assert(auth.permissions.includes('project:write'), 'Own closure form proof needs the live existing write permission');
      assert(tasks.length > 0 && tasks.every((task) => task.responsibleUserId === test.actor.id), 'Real own task list is not ready or contains another actor');
      const task = tasks.find((task) => task.status === 'pending' && task.evidenceRefs.length > 0);
      assert(task, 'A real pending condition with frozen evidence is required');
      await expect(page.locator('app-project-own-condition-tasks')).toBeVisible();
      const article = page.locator('article').filter({ has: page.getByRole('heading', { name: task.summary, exact: true }) });
      await expect(article).toBeVisible(); await expect(article.getByRole('button', { name: '以本人身份闭合此条件', exact: true })).toBeVisible();
      await expect(article.getByLabel('上传本人闭合证据', { exact: true })).toBeVisible();
      await page.waitForLoadState('networkidle'); assertOwnInitialRequests(requests, test.projectId);
      const evidence = task.evidenceRefs[0]; assert(digest.test(evidence.checksumSha256));
      const downloadResponse = response(`/api/attachments/${evidence.attachmentId}/download`);
      const downloaded = page.waitForEvent('download');
      await article.getByRole('button', { name: evidence.fileName, exact: true }).click();
      const attachment = await downloadResponse; assert.equal(attachment.status(), 200);
      const download = await downloaded, file = path.join(directory, 'own-frozen-evidence.bin');
      await download.saveAs(file); fs.chmodSync(file, 0o600); assert.equal(await download.failure(), null);
      assert.equal(sha256(fs.readFileSync(file)), evidence.checksumSha256, 'Actual downloaded bytes do not match the frozen own evidence hash');
      for (const item of requests) {
        const pathname = new URL(item.path, fixed.origin).pathname;
        if (isDomainRequest(item)) assert([`/api/projects/${test.projectId}/completion-records`, `/api/attachments/${evidence.attachmentId}/download`].includes(pathname), 'Own precise download caused a full/list/history/domain fetch');
      }
    } else {
      assert.equal(data.scopeKind, 'full-project'); assert.equal(data.id, test.projectId);
      if (execution) {
        assert(auth.permissions.includes('project:write') && !auth.permissions.includes('commission:assignments:manage'), 'EO-only proof needs a live actor without role management permission');
        assert.equal(data.currentStage, 'handover'); assert(data.executionAdmissionContext, 'Actual server execution admission context is not ready');
        assert.deepEqual(Object.keys(data.executionAdmissionContext).sort(), ['commissionRoleAssignmentId', 'expectedRoleAssignmentVersion', 'handoverStageRecordId', 'handoverSummarySnapshotId', 'sourceHandoverId', 'sourcePayloadHash'].sort());
        assert(digest.test(data.executionAdmissionContext.sourcePayloadHash));
        await expect(page.locator('app-project-governance')).toBeVisible();
        await page.getByRole('button', { name: '执行、验收与完成', exact: true }).click();
        await expect(page.getByRole('button', { name: '核对当前移交与角色冻结并进入执行', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: '核对当前移交与角色冻结并进入执行', exact: true })).toBeEnabled();
        await expect(page.getByRole('button', { name: '提成角色职责', exact: true })).toHaveCount(0);
        await page.waitForLoadState('networkidle');
        assert(!requests.some((item) => /commission-role-assignment/.test(item.path)), 'EO execution entry fetched a forbidden role management resource');
      } else if (max) {
        assert.equal(data.currentStage, 'assessment', 'MAX must remain the independent assessment project');
        const preparedResponse = response(`/api/projects/${test.projectId}/unified-accounting`);
        await page.getByRole('button', { name: '经营核算编制', exact: true }).click();
        const observed = await preparedResponse; assert.equal(observed.status(), 200);
        assert.equal(new URL(observed.url()).searchParams.get('view'), 'preparation');
        const prepared = unwrap(await observed.json()); assert.equal(prepared.view, 'preparation'); assert.equal(prepared.preparation.kind, 'preparation-only');
        const costs = prepared.preparation.sourceRows.filter((row) => row.rowKind === 'direct-cost');
        assert.equal(costs.length, 1); assert.equal(costs[0].sourceRef.kind, 'ProjectActualCostRecord'); assert.equal(costs[0].financialProjection.mode, 'full');
        for (const key of ['net', 'gross']) { assert.equal(costs[0].financialProjection.value?.[key].knowledge, 'known'); assert.equal(costs[0].financialProjection.value[key].value, '9999999999999999.99'); }
        assert.equal(costs[0].financialProjection.value?.tax.value, '0.00');
        const row = page.locator('app-project-operating-authoring table tbody tr').filter({ hasText: costs[0].sourceRef.id });
        await expect(row).toContainText('未税 9999999999999999.99'); await expect(row).toContainText('含税 9999999999999999.99');
        assert.equal(prepared.officialCurrent, null, 'MAX read case must not invent an official G snapshot');
        privateWrite('MAX-preparation.json', jsonBytes(prepared));
      } else {
        assert(mask);
        assert.deepEqual([...auth.permissions].sort(), ['project:read', 'project:write', 'contract:finance:manage'].sort(), 'Mask requires the actual dedicated three-permission person session');
        assert.equal(data.ownerUserId, test.actor.id, 'Mask project was not really reassigned to this person');
        const maskedResponse = response(`/api/projects/${test.projectId}/unified-accounting`);
        await page.getByRole('button', { name: '经营核算编制', exact: true }).click();
        const observed = await maskedResponse; assert.equal(observed.status(), 200); assert.equal(new URL(observed.url()).searchParams.get('view'), 'preparation');
        const prepared = unwrap(await observed.json()); assert.equal(prepared.view, 'preparation');
        const rows = prepared.preparation.sourceRows.filter((row) => row.rowKind === 'direct-cost'); assert.equal(rows.length, 1);
        assert.deepEqual(rows[0].sourceRef, test.expectedSourceRef, 'Mask DOM source differs from the actual recorded MAX source version/hash');
        const projection = rows[0].financialProjection; assert(['masked', 'denied'].includes(projection.mode)); assert.equal(projection.value, null);
        const row = page.locator('app-project-operating-authoring table tbody tr').filter({ hasText: rows[0].sourceRef.id });
        await expect(row).toContainText(projection.displayText);
        assert.equal(prepared.officialCurrent, null);
        privateWrite('masked-preparation.json', jsonBytes(prepared));
      }
    }
    const uiWriteResult=test.writeAction?await performWriteAction14({page,expect,test,primaryData:data}):null;
    await page.waitForLoadState('networkidle');
    const text = await page.locator('body').innerText();
    for (const sentinel of test.forbiddenTexts) for (const variant of sensitiveVariants(sentinel)) assert(!text.includes(variant), 'A real private parent/sensitive sentinel leaked into the DOM');
    assert.equal(pageErrors.length, 0, 'Actual page raised a JavaScript exception');
    fontBoundary32.assertExpected({ consoleErrors, blocked: blockedOrigins });
    
    result = { kind: test.kind, status: 'passed', requestCount: requests.length, exactOwnDownload: own, businessWritePerformed: Boolean(uiWriteResult), uiWriteResult };
  } catch (error) {
    privateWrite('failure.log', error.stack || String(error));
    result = { kind: test.kind, status: 'failed', failure: 'private-assertion-log', requestCount: requests.length, businessWritePerformed: false };
  } finally { privateWrite('font-boundary32.json', jsonBytes(fontBoundary32.snapshot()));
    try { privateWrite('dom.html', Buffer.from(await page.content())); const screenshot = path.join(directory, 'page.png'); await page.screenshot({ path: screenshot, fullPage: true }); fs.chmodSync(screenshot, 0o600); } catch (error) { privateWrite('capture-failure.log', error.stack || String(error)); result = { ...result, status: 'failed', failure: 'private-capture-log' }; }
    privateWrite('browser-log.json', jsonBytes({ requests, pageErrors, consoleErrors, blockedOrigins }));
    await context.close(); await server.settle();
  }
  return { ...result, exchanges: server.exchanges.slice(start), pageErrors: pageErrors.length, consoleErrors: consoleErrors.length, blockedOrigins: blockedOrigins.length };
}

