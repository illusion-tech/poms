// FS-only candidate; no business imports, requests, browser launch or Root writes.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto'; import { fileURLToPath } from 'node:url'; import { spawnSync } from 'node:child_process';
const dir = path.dirname(fileURLToPath(import.meta.url)), root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', privateRoot = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
const sha = bytes => createHash('sha256').update(bytes).digest('hex'), sources = [];
function read(file) { const bytes = fs.readFileSync(file), stat = fs.statSync(file); sources.push({ file, bytes: bytes.length, rawBytesSha256: sha(bytes), observedMtimeUTC: stat.mtime.toISOString() }); return bytes; }
const json = file => JSON.parse(read(file)); const local = root + '/tmp/rust-r4ghi/private/ui-runtime14/lifecycle18-source12-01/case-0';
const receipt = json(root + '/tmp/rust-r4ghi/root/ui-runtime14/lifecycle18-source12-01/receipt18-03.json'), requests = json(local + '/requests.json'), result = json(local + '/result.json');
assert.equal(receipt.status, 'failed'); assert.equal(requests.length, 13); assert(requests.every(request => request.method === 'GET')); assert.equal(receipt.exchanges.length, 13); assert(receipt.exchanges.every(exchange => exchange.method === 'GET' && exchange.status === 200)); assert.equal(receipt.observerReceipts.length, 13); assert.deepEqual(receipt.proxyFailures, []); assert.deepEqual(receipt.cases[0].actualWriteObserver, []); assert.equal(result.status, 'failed');
for (const observed of receipt.observerReceipts) { const bytes = read('//wsl.localhost/Debian' + observed.ledger.file); assert.equal(sha(bytes), observed.ledger.rawBytesSha256); const ledger = JSON.parse(bytes); assert(ledger.ownershipComplete); assert.deepEqual(ledger.blockers, []); }
const failure = read(local + '/failure.log').toString('utf8'); assert(failure.includes('Timeout:  5000ms') && failure.includes('Received: disabled') && failure.includes('at openLifecycle'));
const html = read(local + '/page.html').toString('utf8'), component = html.split('<app-project-lifecycle-authoring')[1]?.split('</app-project-lifecycle-authoring>')[0]; assert(component); assert(component.includes('正在读取或保存当前事实…')); assert(/<button[^>]*disabled[^>]*>重新核对当前事实<\/button>/.test(component));
for (const field of ['readiness-summary', 'delivery-evidence-summary', 'archived-at', 'archive-summary', 'archive-evidence-summary']) assert(component.includes('name="' + field + '"'), 'Do not replace actual name selectors that exist');
const reads = [['007247', 'ProjectController_listProjectCompletionRecords'], ['007249', 'ProjectController_listAcceptanceRecords'], ['007251', 'ProjectController_listProjectArchiveRecords']];
for (const [number, operationId] of reads) { const original = json(privateRoot + '/business/g2-business12/main01/' + number + '-ui10-http-browser-response.json'); assert.equal(original.attempt.operationId, operationId); assert.equal(original.attempt.status, 200); assert(original.attempt.responseComplete && !original.attempt.transportFailure); if (number === '007247') assert.equal(original.attempt.body.scopeKind, 'full-project'); else assert(Array.isArray(original.attempt.body)); }
const source = read(root + '/apps/poms-admin/src/app/features/project/project-lifecycle-authoring.ts').toString('utf8'); assert.equal(sha(Buffer.from(source)), '178c09faff3295d75235eecb76d46aded5a458bd205df29099d06f36b2e081c8');
const reload = source.split('    async reload(): Promise<void> {')[1]?.split('    async startExecution()')[0]; assert(reload); assert(reload.indexOf('await this.api().loadCompletionRecords') < reload.indexOf('await Promise.all([')); assert(reload.includes('this.api().loadAcceptanceRecords(projectId), this.api().loadArchiveRecords(projectId)')); assert(reload.includes('if (epoch === this.epoch) this.busy.set(false)'));
const product = 'tools/rust-r4ghi/business/ui-lifecycle18-browser.mjs', before = read(root + '/' + product), beforeSHA256 = sha(before); assert.equal(beforeSHA256, '836163074fdd55fd36d61caf2ca4b2e015d0132b87812618ea768a63038d409a');
let candidate = before.toString('utf8'); const eol = candidate.includes('\r\n') ? '\r\n' : '\n';
const previousOpen = "  async function openLifecycle() { await expect(page.getByRole('button', { name: '执行、验收与完成', exact: true })).toBeEnabled(); await page.getByRole('button', { name: '执行、验收与完成', exact: true }).click(); await expect(component()).toBeVisible(); await expect(component().getByRole('button', { name: '重新核对当前事实', exact: true })).toBeEnabled(); }";
const nextOpen = `  // Each actual reload awaits its three real canonical reads before checking UI readiness.
  const readIds = ['ProjectController_listProjectCompletionRecords', 'ProjectController_listAcceptanceRecords', 'ProjectController_listProjectArchiveRecords'];
  const watchLifecycleFacts = () => readIds.map(id => [id, watch(id, { projectId: test.projectId })]);
  async function readLifecycleFacts(pending) {
    const received = new Map();
    for (const [id, waiting] of pending) {
      const value = await response(id, waiting);
      if (id === 'ProjectController_listProjectCompletionRecords') { assert.equal(value.data.projectId, test.projectId); assert.equal(value.data.scopeKind, 'full-project'); }
      else { assert(Array.isArray(value.data)); assert(value.data.every(row => row.projectId === test.projectId)); }
      received.set(id, value);
    }
    await expect(component().getByRole('button', { name: '重新核对当前事实', exact: true })).toBeEnabled({ timeout: 10_000 });
    await expect(component().getByRole('alert')).toHaveCount(0, { timeout: 10_000 });
    return received;
  }
  async function openLifecycle() {
    const open = page.getByRole('button', { name: '执行、验收与完成', exact: true });
    await expect(open).toBeEnabled({ timeout: 10_000 });
    const pending = watchLifecycleFacts(); await open.click();
    await expect(component()).toBeVisible({ timeout: 10_000 }); await readLifecycleFacts(pending);
  }`.replaceAll('\n', eol);
assert.equal(candidate.split(previousOpen).length, 2); candidate = candidate.replace(previousOpen, nextOpen);
const previousRead = "      const current = watch('ProjectController_listAcceptanceRecords', { projectId: test.projectId });\r\n      await component().getByRole('button', { name: '重新核对当前事实', exact: true }).click(); const value = await current; assert.equal(value.status(), map.get('ProjectController_listAcceptanceRecords').status);\r\n      const header = value.headers().date; assert(header, 'Actual backend Date required'); const iso = new Date(header).toISOString(); await server.settle();\r\n      await expect(component().getByRole('button', { name: '重新核对当前事实', exact: true })).toBeEnabled();";
const nextRead = "      const pending = watchLifecycleFacts();\r\n      await component().getByRole('button', { name: '重新核对当前事实', exact: true }).click(); const facts = await readLifecycleFacts(pending);\r\n      const value = facts.get('ProjectController_listAcceptanceRecords').response;\r\n      const header = value.headers().date; assert(header, 'Actual backend Date required'); const iso = new Date(header).toISOString();";
const exactPreviousRead = previousRead.replaceAll('\r\n', eol), exactNextRead = nextRead.replaceAll('\r\n', eol);
assert.equal(candidate.split(exactPreviousRead).length, 2); candidate = candidate.replace(exactPreviousRead, exactNextRead);
const proposed = dir + '/proposed/' + product; fs.mkdirSync(path.dirname(proposed), { recursive: true }); fs.writeFileSync(proposed, candidate, { flag: 'wx' });
const syntax = spawnSync(process.execPath, ['--check', proposed], { cwd: dir, encoding: 'utf8', windowsHide: true }); assert.equal(syntax.status, 0); assert.equal(syntax.stderr, '');
const diff = spawnSync('git', ['diff', '--no-index', '--no-ext-diff', '--', root + '/' + product, proposed], { cwd: dir, encoding: 'utf8', windowsHide: true }); assert.equal(diff.status, 1); fs.writeFileSync(dir + '/lifecycle44.diff', diff.stdout, { flag: 'wx' });
const write = (name, value) => fs.writeFileSync(dir + '/' + name, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
write('products44.json', [{ file: product, beforeSHA256, afterSHA256: sha(Buffer.from(candidate)), candidate: 'proposed/' + product }]);
write('diagnosis44.json', { kind: 'actual-Lifecycle01-FS-only-canonical-read-wait-diagnosis44', actualPriorRunStatus: 'failed-preserved', actualGET200: 13, actualDomainPOST: 0, actualUpload: 0, actualWriteObserver: [], failedDefaultExpectMs: 5000, lastArchiveLedgerMtimeAfterFailureFile: true, fileTimesAreObservedMetadataNotNetworkDuration: true, actualBusyDOMAtFailure: true, productReloadUsesThreeReadsThenFinallyClearsBusy: true, exactMissingResponseMustStillFail: true, newResponseDeadlineMs: 90000, postResponseUIReadyDeadlineMs: 10000, existingFieldSelectorsKept: true, sourceAndEvidencePins: sources, syntaxCheck: { node: process.version, exitCode: syntax.status }, actualFixedGUIExecuted: false, activeStateRead: false, RootWritten: false, HTTP: false, SQL: false, G3Certified: false });
console.log(JSON.stringify({ beforeSHA256, afterSHA256: sha(Buffer.from(candidate)), sourcePins: sources.length, syntaxExitCode: syntax.status }));
