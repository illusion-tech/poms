import { observeFontBoundary32 } from './ui-font-boundary32.mjs';
// Root runs inside the already owned/pinned14 Windows adapter + Linux observer.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
const origin = 'http://127.0.0.1:44551', unwrap = value => value?.data ?? value;
export async function executeCreatorReadback29(browser, expect, test, directory, server) {
  assert.equal(test.kind, 'creator-assigned-readback'); assert(!test.writeAction); assert(test.readback28 && test.readback28.original04Passed === false);
  const context = await browser.newContext({ baseURL: origin, locale: 'zh-CN', timezoneId: 'Asia/Shanghai', viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' }), page = await context.newPage(); page.setDefaultTimeout(90000); const fontBoundary32 = observeFontBoundary32(page);
  const requests = [], errors = [], consoleErrors = [], blocked = [], views = [];
  const save = (name, value) => fs.writeFileSync(path.join(directory, name), Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n'), { flag: 'wx', mode: 0o600 });
  const watch = pathname => { const promise = page.waitForResponse(value => value.request().method() === 'GET' && new URL(value.url()).pathname === pathname); void promise.catch(() => {}); return promise; };
  async function projectResult(pending) { const response = await pending; assert.equal(response.status(), 200); assert(response.headers()['x-poms-r4ghi-ui-run']); const value = unwrap(await response.json());
    assert.equal(value.scopeKind, 'full-project'); assert.equal(value.id, test.projectId); assert.equal(value.ownerUserId, test.readback28.expectedOwnerUserId); assert.equal(value.ownerOrgId, test.readback28.expectedOwnerOrgId); assert.equal(value.projectRowVersion, test.readback28.expectedProjectRowVersion);
    assert(typeof value.ownerName === 'string' && value.ownerName.trim()); assert(typeof value.ownerOrgName === 'string' && value.ownerOrgName.trim());
    const region = page.getByRole('region', { name: '项目基本责任范围', exact: true }); await expect(region).toBeVisible(); await expect(region).toContainText('项目主责 ' + value.ownerName + ' · ' + value.ownerOrgName); await expect(page.locator('app-project-creator-first-assignment')).toHaveCount(0);
    views.push({ projectId: value.id, ownerUserId: value.ownerUserId, ownerOrgId: value.ownerOrgId, projectRowVersion: value.projectRowVersion, ownerName: value.ownerName, ownerOrgName: value.ownerOrgName }); await server.settle(); return value;
  }
  let result;
  try {
    await context.addCookies(Object.entries(test.actor.cookies).map(([name, value]) => ({ name, value, url: origin, httpOnly: name === 'poms_session', sameSite: 'Lax' })));
    await context.route('**/*', async route => { const request = route.request(), url = new URL(request.url()); if (!['http:', 'https:'].includes(url.protocol)) return route.continue(); if (url.origin !== origin || (url.pathname.startsWith('/api/') && request.method() !== 'GET')) { blocked.push({ method: request.method(), path: url.pathname }); return route.abort('blockedbyclient'); } return route.continue(); });
    page.on('request', value => { const url = new URL(value.url()); if (url.origin === origin && url.pathname.startsWith('/api/')) requests.push({ method: value.method(), path: url.pathname + url.search }); }); page.on('pageerror', error => errors.push(error.name)); page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    const auth = watch('/api/auth/session'), initial = watch('/api/projects/' + test.projectId); await page.goto('/projects/' + test.projectId + '/governance', { waitUntil: 'domcontentloaded' });
    const authResponse = await auth; assert.equal(authResponse.status(), 200); const session = unwrap(await authResponse.json()); assert(session.authenticated && session.user.id === test.actor.id && session.user.id === test.readback28.expectedOwnerUserId); await projectResult(initial);
    const buttonRead = watch('/api/projects/' + test.projectId); await page.getByRole('button', { name: '重新读取项目范围', exact: true }).click(); await projectResult(buttonRead);
    const reloadRead = watch('/api/projects/' + test.projectId); await page.reload({ waitUntil: 'domcontentloaded' }); await projectResult(reloadRead); await page.waitForLoadState('networkidle');
    assert(requests.every(request => request.method === 'GET')); const global = new Set(['/api/auth/session', '/api/auth/csrf-token', '/api/me/navigation', '/api/me/todos']); assert(requests.every(request => global.has(new URL(request.path, origin).pathname) || request.path === '/api/projects/' + test.projectId));
     assert.equal(errors.length, 0); fontBoundary32.assertExpected({ consoleErrors, blocked: blocked });
    const text = await page.locator('body').innerText(); for (const value of test.forbiddenTexts) assert(!text.includes(value));
    result = { kind: test.kind, status: 'passed', actualOwnerVisible: true, actualReadButtonAndFreshPageReload: true, verifiedProjectResponses: views.length, businessWritePerformed: false, original04Passed: false, originalAssignmentRequestId: test.readback28.originalRequestId, recoveryReceipt: test.readback28.recoveryReceipt, G3Certified: false };
  } catch (error) { save('failure.log', Buffer.from(error.stack || String(error))); result = { kind: test.kind, status: 'failed', businessWritePerformed: false, original04Passed: false, G3Certified: false }; }
  finally { save('font-boundary32.json', fontBoundary32.snapshot()); save('requests.json', requests); save('owner-readback-responses.json', views); save('browser-errors.json', { errors, consoleErrors, blocked }); save('result.json', result); save('dom.html', Buffer.from(await page.content())); await page.screenshot({ path: path.join(directory, 'page.png'), fullPage: true }); await context.close(); await server.settle(); }
  return result;
}
