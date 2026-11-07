import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildManifest, sha256, startUiServer } from './ui-server06.mjs';

const fixed = Object.freeze({ namespace: 'poms-r4ghi', epoch: 'g2-business08', run: 'main01', root: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', mirror: '/home/wangzishi/projects/poms-rust-r4ghi', stateRoot: '/home/wangzishi/.local/share/poms-r4ghi', origin: 'http://127.0.0.1:44551' });
const kinds = ['creator', 'legacy-anchor', 'own-condition', 'execution-owner', 'money-max', 'sensitive-mask'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const digest = /^[0-9a-f]{64}$/;
const sameFile = (left, right) => fs.realpathSync(left) === fs.realpathSync(right);
const jsonBytes = (value) => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const privateBytes = (file) => { const stat = fs.lstatSync(file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'Private input must be a regular unlinked file'); assert.equal(fs.realpathSync(file), path.resolve(file), 'Private input redirection is forbidden'); return fs.readFileSync(file); };
const inside = (root, file) => { const relative = path.relative(root, file); return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative); };
const noExistingRedirect = (file) => { let existing = path.resolve(file); while (!fs.existsSync(existing)) existing = path.dirname(existing); assert.equal(fs.realpathSync(existing), existing, 'Output ancestor is redirected'); };
const unwrap = (body) => body && typeof body === 'object' && Object.hasOwn(body, 'data') ? body.data : body;
const globalPrefixes = new Set(['auth', 'me', 'platform', 'dictionaries', 'health', 'security-events', 'security-events:recordRouteDenied']);
const isDomainRequest = (request) => { const pathname = new URL(request.path, fixed.origin).pathname; return pathname.startsWith('/api/') && !globalPrefixes.has(pathname.split('/')[2]); };
const exactKeys = (value, keys) => assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), 'Narrow response contains a missing or extra field');

/** Fixture pointers may never address actor credentials, API records or prototype keys. */
export function fixturePointer(state, pointer) {
  assert.equal(typeof pointer, 'string', 'A real private fixture pointer is required');
  assert(/^\/(fixtures|objects)\//.test(pointer), 'Only fixtures/objects may supply business IDs or sentinels');
  const segments = pointer.slice(1).split('/').map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
  let value = state;
  for (const segment of segments) {
    assert(!['__proto__', 'constructor', 'prototype', 'password', 'cookies'].includes(segment), 'Unsafe fixture pointer');
    assert(value !== null && typeof value === 'object' && Object.hasOwn(value, segment), 'Private fixture pointer is not bound');
    value = value[segment];
  }
  return value;
}

export function resolveCases(state, bindings) {
  assert(Array.isArray(bindings) && bindings.length > 0 && bindings.length <= kinds.length, 'Explicit real DOM cases must be bound');
  assert(bindings.every((item) => kinds.includes(item.kind)) && new Set(bindings.map((item) => item.kind)).size === bindings.length, 'Duplicate or unknown DOM case');
  return bindings.map((item) => {
    assert.deepEqual(Object.keys(item).sort(), ['actorKey', 'forbiddenTextPointers', 'kind', 'projectIdPointer', ...(item.kind === 'sensitive-mask' ? ['sourceRefPointer'] : [])].sort(), 'Unknown case binding field');
    assert.equal(typeof item.actorKey, 'string');
    assert(Object.hasOwn(state.actors, item.actorKey), 'Actor must already exist in business08 private state');
    const actor = state.actors[item.actorKey], projectId = fixturePointer(state, item.projectIdPointer);
    assert.equal(typeof projectId, 'string'); assert(uuid.test(projectId), 'Project pointer is not a real UUID');
    assert(actor && uuid.test(actor.id) && actor.cookies && typeof actor.cookies === 'object', 'Actual actor session is not ready');
    assert.deepEqual(Object.keys(actor.cookies).sort(), ['poms_csrf', 'poms_session']);
    for (const value of Object.values(actor.cookies)) assert(typeof value === 'string' && value.length > 0, 'Actual actor cookie is missing');
    assert(Array.isArray(item.forbiddenTextPointers), 'Explicit real-text sentinel bindings are required');
    const forbiddenTexts = item.forbiddenTextPointers.map((pointer) => {
      const value = fixturePointer(state, pointer);
      assert(typeof value === 'string' && value.trim().length >= 8, 'A private absence sentinel must be a nontrivial real string');
      return value.trim();
    });
    if (['own-condition', 'sensitive-mask'].includes(item.kind)) assert(forbiddenTexts.length > 0, 'A real parent/sensitive sentinel is required for this negative DOM assertion');
    let expectedSourceRef = null;
    if (item.kind === 'sensitive-mask') {
      expectedSourceRef = fixturePointer(state, item.sourceRefPointer);
      assert.equal(expectedSourceRef.kind, 'ProjectActualCostRecord'); assert(uuid.test(expectedSourceRef.id));
      assert(Number.isSafeInteger(expectedSourceRef.rowVersion) && expectedSourceRef.rowVersion > 0 && expectedSourceRef.rowVersion <= 2147483647 && digest.test(expectedSourceRef.payloadHash), 'Real recorded mask truth sourceRef is required');
    }
    return { kind: item.kind, actor, projectId, forbiddenTexts, expectedSourceRef };
  });
}

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

function assertSourcePins(root, pins) {
  assert(Array.isArray(pins) && pins.length > 0, 'Business source pins are absent');
  for (const pin of pins) {
    assert(typeof pin.file === 'string' && digest.test(pin.sha256), 'Malformed business source pin');
    const file = path.resolve(root, pin.file);
    assert(inside(root, file) && inside(fs.realpathSync(root), fs.realpathSync(file)), 'Source pin escaped the Root checkout');
    assert.equal(sha256(fs.readFileSync(file)), pin.sha256, 'Business source pin changed; preserve this run and ask Root to bind a reviewed epoch');
  }
}

function assertApiProcess(state) {
  assert.equal(process.platform, 'linux', 'Execute beside the owned WSL API so /proc PID identity can be verified');
  const binding = state.apiProcess;
  assert(binding?.file && inside(`${fixed.stateRoot}/private`, binding.file), 'Owned private API process record required');
  const bytes = privateBytes(binding.file), record = JSON.parse(bytes);
  assert.equal(sha256(bytes), binding.rawBytesSha256); assert.deepEqual(record, binding.record);
  assert.equal(record.namespace, fixed.namespace); assert.equal(record.port, 31441); assert.equal(record.root, fixed.mirror);
  assert(Number.isSafeInteger(record.pid) && record.pid > 1 && typeof record.startTime === 'string');
  // /proc stat's command may contain spaces: field 22 is index 19 after the final ') '.
  const stat = fs.readFileSync(`/proc/${record.pid}/stat`, 'utf8');
  assert.equal(stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], record.startTime, 'Owned API process stopped or PID was reused');
  assert.equal(fs.realpathSync(`/proc/${record.pid}/exe`), record.binary);
  assert.equal(sha256(fs.readFileSync(record.binary)), record.binarySha256, 'Owned API binary changed');
  return { recordRawBytesSha256: sha256(bytes), binarySha256: record.binarySha256, backendPort: record.port };
}

export function preflight(plan) {
  assert.equal(plan.schemaVersion, 1); assert.equal(plan.namespace, fixed.namespace);
  assert.equal(plan.root, fixed.root); assert.equal(plan.epoch, fixed.epoch); assert.equal(plan.run, fixed.run);
  const stateFile = `${fixed.stateRoot}/private/business/${fixed.epoch}/${fixed.run}/state.json`;
  assert.equal(plan.stateFile, stateFile); assert.equal(plan.identityFile, `${fixed.stateRoot}/identity.json`);
  const stateBytes = privateBytes(stateFile), state = JSON.parse(stateBytes), identity = JSON.parse(privateBytes(plan.identityFile));
  assert.equal(state.namespace, fixed.namespace); assert.equal(identity.namespace, fixed.namespace); assert.equal(state.marker, identity.marker);
  assert.equal(state.epoch, fixed.epoch); assert.equal(state.run, fixed.run);
  const browserDirectory = path.join(plan.root, 'dist/apps/poms-admin/browser');
  assert(sameFile(plan.distDirectory, browserDirectory), 'Only actual Root dist/browser may be served');
  assert.equal(fs.realpathSync(browserDirectory), path.resolve(browserDirectory), 'Root dist/browser is redirected');
  assert(inside(`${fixed.stateRoot}/private/ui`, path.resolve(plan.privateOutput)), 'New raw evidence must stay under this namespace private/ui');
  assert(inside(path.join(plan.root, 'tmp/rust-r4ghi/root'), path.resolve(plan.publicOutput)), 'Public receipt must stay under Root task tmp');
  assert(!fs.existsSync(plan.privateOutput) && !fs.existsSync(plan.publicOutput), 'Preserve prior runs; use new output directories');
  noExistingRedirect(plan.privateOutput); noExistingRedirect(plan.publicOutput);
  assert(plan.browser && digest.test(plan.browser.rawBytesSha256), 'Explicit actual browser raw-byte pin is required');
  assert.equal(sha256(fs.readFileSync(plan.browser.executablePath)), plan.browser.rawBytesSha256, 'Pinned browser changed');
  const env = plan.browser.environment ?? {};
  for (const [key, value] of Object.entries(env)) assert(['LD_LIBRARY_PATH', 'FONTCONFIG_PATH', 'FONTCONFIG_FILE', 'XDG_CACHE_HOME'].includes(key) && typeof value === 'string', 'Unexpected browser environment override');
  const args = plan.browser.args ?? [];
  assert(Array.isArray(args) && args.every((arg) => ['--no-sandbox', '--disable-dev-shm-usage'].includes(arg)), 'Unexpected browser launch argument');
  const runtime = plan.browser.playwright;
  assert(runtime && path.isAbsolute(runtime.requireFromPackageJson), 'Root must explicitly bind its existing usable Playwright installation');
  for (const key of ['requireFromPackageJsonRawBytesSha256', 'entryRawBytesSha256', 'packageRawBytesSha256']) assert(digest.test(runtime[key]), 'Playwright raw-byte pin is missing');
  assert.equal(sha256(fs.readFileSync(runtime.requireFromPackageJson)), runtime.requireFromPackageJsonRawBytesSha256);
  const playwrightRequire = createRequire(runtime.requireFromPackageJson);
  const entry = playwrightRequire.resolve('@playwright/test'), packageFile = playwrightRequire.resolve('@playwright/test/package.json');
  assert(sameFile(entry, runtime.entryFile) && sameFile(packageFile, runtime.packageFile), 'Resolved Playwright install differs from the explicit Root binding');
  assert.equal(sha256(fs.readFileSync(entry)), runtime.entryRawBytesSha256); assert.equal(sha256(fs.readFileSync(packageFile)), runtime.packageRawBytesSha256);
  const packageMetadata = readJson(packageFile); assert.equal(packageMetadata.name, '@playwright/test'); assert.equal(packageMetadata.version, runtime.version);
  const playwrightBinding = { version: packageMetadata.version, entryRawBytesSha256: runtime.entryRawBytesSha256, packageRawBytesSha256: runtime.packageRawBytesSha256, requireFromPackageJsonRawBytesSha256: runtime.requireFromPackageJsonRawBytesSha256 };
  const cases = resolveCases(state, plan.cases);
  assertSourcePins(plan.root, state.sourcePins);
  const api = assertApiProcess(state), build = buildManifest(browserDirectory);
  return { state, stateFile, stateBytes, cases, api, build, playwrightRequire, playwrightBinding, browserEnvironment: env, browserArgs: args };
}

function sensitiveVariants(text) {
  const result = [text];
  if (/^-?\d+(?:\.\d+)?$/.test(text)) {
    const [integer, fractional] = text.split('.');
    result.push(integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fractional === undefined ? '' : `.${fractional}`));
  }
  return result;
}

async function executeCase(browser, expect, test, directory, server) {
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
    page.setDefaultTimeout(15_000);
    const response = (pathname) => { const pending = page.waitForResponse((item) => item.request().method() === 'GET' && new URL(item.url()).pathname === pathname); void pending.catch(() => {}); return pending; };
    const authResponse = response('/api/auth/session');
    const own = test.kind === 'own-condition', execution = test.kind === 'execution-owner', max = test.kind === 'money-max', mask = test.kind === 'sensitive-mask', governance = execution || max || mask;
    const route = `/projects/${test.projectId}${own ? '/condition-tasks' : governance ? '/governance' : ''}`;
    const primaryResponse = response(`/api/projects/${test.projectId}${own ? '/completion-records' : ''}`);
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 });
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
    await page.waitForLoadState('networkidle');
    const text = await page.locator('body').innerText();
    for (const sentinel of test.forbiddenTexts) for (const variant of sensitiveVariants(sentinel)) assert(!text.includes(variant), 'A real private parent/sensitive sentinel leaked into the DOM');
    assert.equal(pageErrors.length, 0, 'Actual page raised a JavaScript exception');
    assert.equal(consoleErrors.length, 0, 'Actual browser console errors require Root classification');
    assert.equal(blockedOrigins.length, 0, 'Actual page attempted a non-namespace network request');
    result = { kind: test.kind, status: 'passed', requestCount: requests.length, exactOwnDownload: own, businessWritePerformed: false };
  } catch (error) {
    privateWrite('failure.log', error.stack || String(error));
    result = { kind: test.kind, status: 'failed', failure: 'private-assertion-log', requestCount: requests.length, businessWritePerformed: false };
  } finally {
    try { privateWrite('dom.html', Buffer.from(await page.content())); const screenshot = path.join(directory, 'page.png'); await page.screenshot({ path: screenshot, fullPage: true }); fs.chmodSync(screenshot, 0o600); } catch (error) { privateWrite('capture-failure.log', error.stack || String(error)); result = { ...result, status: 'failed', failure: 'private-capture-log' }; }
    privateWrite('browser-log.json', jsonBytes({ requests, pageErrors, consoleErrors, blockedOrigins }));
    await context.close(); await server.settle();
  }
  return { ...result, exchanges: server.exchanges.slice(start), pageErrors: pageErrors.length, consoleErrors: consoleErrors.length, blockedOrigins: blockedOrigins.length };
}

/** Does not invoke business/context.mjs, connect to a DB, create fixtures, or mutate helper pins. */
async function runUnlocked(plan, { afterResponse } = {}) {
  const prepared = preflight(plan);
  fs.mkdirSync(plan.privateOutput, { recursive: true, mode: 0o700 }); fs.mkdirSync(plan.publicOutput, { recursive: true });
  const privateWrite = (file, bytes) => fs.writeFileSync(path.join(plan.privateOutput, file), bytes, { flag: 'wx', mode: 0o600 });
  let server, browser;
  const report = { schemaVersion: 1, namespace: fixed.namespace, epoch: fixed.epoch, run: fixed.run, origin: fixed.origin, backendPort: 31441, actualDomRun: false, browserLaunched: false, businessG3: false, stateRawBytesSha256: sha256(prepared.stateBytes), api: prepared.api, build: prepared.build, playwright: prepared.playwrightBinding, cases: [], unboundCases: kinds.filter((kind) => !prepared.cases.some((test) => test.kind === kind)), allSixCasesPassed: false, status: 'failed' };
  try {
    const { chromium, expect } = prepared.playwrightRequire('@playwright/test');
    server = await startUiServer({ directory: plan.distDirectory, privateDirectory: path.join(plan.privateOutput, 'http'), afterResponse });
    browser = await chromium.launch({ executablePath: plan.browser.executablePath, headless: true, args: prepared.browserArgs, env: { ...process.env, ...prepared.browserEnvironment } });
    report.browserLaunched = true;
    for (const test of prepared.cases) {
      const directory = path.join(plan.privateOutput, test.kind); fs.mkdirSync(directory, { mode: 0o700 });
      report.cases.push(await executeCase(browser, expect, test, directory, server));
    }
    const afterStateBytes = privateBytes(prepared.stateFile), afterState = JSON.parse(afterStateBytes);
    report.stateAfterRawBytesSha256 = sha256(afterStateBytes);
    for (const key of ['namespace', 'marker', 'epoch', 'run', 'fixtures', 'sourcePins']) assert.deepEqual(afterState[key], prepared.state[key], 'Business fixture/source identity changed during this DOM run');
    if (!afterResponse) assert.equal(report.stateAfterRawBytesSha256, report.stateRawBytesSha256, 'Unexpected private state writer during a DOM run without a Root observer');
    assertSourcePins(plan.root, prepared.state.sourcePins); assertApiProcess(prepared.state);
    assert.equal(server.failures.length, 0, 'Owned static/proxy server failed');
    assert(server.exchanges.every((item) => item.status < 500), 'Actual API returned a server error');
    assert(report.cases.every((test) => test.status === 'passed'), 'One or more actual DOM cases failed');
    report.allSixCasesPassed = report.unboundCases.length === 0;
    report.status = report.allSixCasesPassed ? 'passed' : 'passed-bound-cases-only';
  } catch (error) { privateWrite('run-failure.log', error.stack || String(error)); }
  finally {
    report.actualDomRun = report.cases.length > 0;
    if (browser) { try { await browser.close(); } catch (error) { report.status = 'failed'; privateWrite('browser-close-failure.log', error.stack || String(error)); } }
    if (server) {
      try { report.close = await server.close(); } catch (error) { report.status = 'failed'; privateWrite('close-failure.log', error.stack || String(error)); }
      report.exchanges = server.exchanges; report.serverFailures = server.failures;
    }
    if (report.status === 'failed') report.allSixCasesPassed = false;
    fs.writeFileSync(path.join(plan.publicOutput, 'receipt06.json'), jsonBytes(report), { flag: 'wx' });
  }
  return report;
}

export async function runUi06(plan, options = {}) {
  assert.equal(process.platform, 'linux', 'Root runs this tool beside the owned WSL API');
  const lock = `${fixed.stateRoot}/private/business/${fixed.epoch}/${fixed.run}/driver.lock`;
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'H-DOM06-read', at: new Date().toISOString() }) + '\n', { flag: 'wx', mode: 0o600 });
  try { return await runUnlocked(plan, options); }
  finally { if (fs.existsSync(lock)) { const owner = readJson(lock); if (owner.pid === process.pid && owner.mode === 'H-DOM06-read') fs.unlinkSync(lock); } }
}

async function main() {
  const args = process.argv.slice(2);
  assert(args.length === 3 && args[0] === '--bindings' && args[2] === '--execute', 'Explicit Root execution only: node ui06.mjs --bindings /owned/private/bindings.json --execute');
  const report = await runUi06(readJson(args[1]));
  console.log(JSON.stringify({ namespace: report.namespace, status: report.status, cases: report.cases.map(({ kind, status }) => ({ kind, status })), businessG3: false }));
  if (!['passed', 'passed-bound-cases-only'].includes(report.status)) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('UI06 preflight failed; no browser result is claimed. Inspect the private bindings and pinned prerequisites.'); process.exitCode = 1; });
