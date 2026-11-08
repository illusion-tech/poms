// FS-only proposal for the actual GH02 user-flow omission.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto'; import { fileURLToPath } from 'node:url'; import { spawnSync } from 'node:child_process';
const dir = path.dirname(fileURLToPath(import.meta.url)), root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const pin = file => { const bytes = fs.readFileSync(file); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; };
const verified = [], read = file => { const descriptor = pin(file); verified.push(descriptor); return fs.readFileSync(file); };
const json = file => JSON.parse(read(file));
const ipc = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/ui/runtime14/gh18-source12-02';
const local = root + '/tmp/rust-r4ghi/private/ui-runtime14/gh18-source12-02/case-0';
const receipt = json(root + '/tmp/rust-r4ghi/root/ui-runtime14/gh18-source12-02/receipt18-06.json');
const requests = json(local + '/requests.json'); assert.equal(requests.length, 10); assert(requests.every(value => value.method === 'GET'));
assert.equal(receipt.status, 'failed'); assert.equal(receipt.exchanges.length, 10); assert(receipt.exchanges.every(value => value.method === 'GET' && value.status === 200)); assert.deepEqual(receipt.proxyFailures, []);
assert.equal(receipt.observerReceipts.length, 10); assert(receipt.observerReceipts.every(value => value.status === 200));
const preparationRequests = requests.filter(value => value.path.includes('/unified-accounting?')); assert.equal(preparationRequests.length, 1);
const query = new URL(preparationRequests[0].path, 'http://127.0.0.1:44551').searchParams; assert.equal(query.get('intent'), 'snapshot-create'); assert.equal(query.get('snapshotMode'), 'realtime'); assert.equal(query.get('view'), 'preparation');
for (const observed of receipt.observerReceipts) { const file = '//wsl.localhost/Debian' + observed.ledger.file, ledgerBytes = read(file); assert.equal(sha(ledgerBytes), observed.ledger.rawBytesSha256); const ledger = JSON.parse(ledgerBytes); assert.equal(ledger.ownershipComplete, true); assert.deepEqual(ledger.blockers, []); }
// Actual static DOM and screenshot only; never instantiate a browser or synthesize a response.
const html = read(local + '/page.html').toString('utf8'); read(local + '/page.png');
const component = html.split('<app-project-operating-authoring>')[1]?.split('</app-project-operating-authoring>')[0]; assert(component);
assert.equal([...component.matchAll(/<select\b/g)].length, 1); assert(component.includes('value="baseline-activation"'));
assert.equal([...component.matchAll(/<button[^>]*>\s*读取编制依据\s*<\/button>/g)].length, 1);
assert.equal([...component.matchAll(/<button[^>]*disabled[^>]*>\s*采用正式基线\s*<\/button>/g)].length, 1, 'Actual changed intent already renders the baseline button');
const failure = read(local + '/failure.log').toString('utf8'); assert(failure.includes('ui-gh18-browser.mjs:10:21') && failure.includes('Timeout 90000ms'));
const sourceFile = root + '/apps/poms-admin/src/app/features/project/project-operating-authoring.ts', source = read(sourceFile).toString('utf8');
assert.equal(sha(Buffer.from(source)), 'd2712e52cafde5100e40555b5851c479a2449cdf360637ab968c2a476d24e4c9');
const changeIntent = source.split('    changeIntent(event: Event): void {')[1]?.split('    setPeriod(')[0]; assert(changeIntent && !changeIntent.includes('prepareRequested.emit') && !changeIntent.includes('reload()'));
const reload = source.split('    reload(): void {')[1]?.split('    chooseDecision(')[0]; assert(reload?.includes('this.prepareRequested.emit({'));
const product = 'tools/rust-r4ghi/business/ui-gh18-browser.mjs', before = read(root + '/' + product), beforeSHA256 = sha(before); assert.equal(beforeSHA256, '6808936a24e498470cd4a259edf426dc854ee8d6869842de99bc6ddedaaaf329');
let candidate = before.toString('utf8');
const oldBaseline = "await author.locator('label').filter({hasText:/^编制任务/}).locator('select').selectOption('baseline-activation');const p=(await actual('ProjectCostController_getProjectUnifiedAccounting',baselinePrep)).preparation;";
const newBaseline = "const intentSelect=author.locator('label').filter({hasText:/^编制任务/}).locator('select'),readBasis=author.getByRole('button',{name:'读取编制依据',exact:true});await expect(intentSelect).toHaveCount(1);await expect(readBasis).toHaveCount(1);await intentSelect.selectOption('baseline-activation');await expect(intentSelect).toHaveValue('baseline-activation');await readBasis.click();const p=(await actual('ProjectCostController_getProjectUnifiedAccounting',baselinePrep)).preparation;assert.equal(p.intent,'baseline-activation');";
const oldSnapshot = "await author.locator('label').filter({hasText:/^编制任务/}).locator('select').selectOption('snapshot-create');const prepared=(await actual('ProjectCostController_getProjectUnifiedAccounting',capturePrep)).preparation;";
const newSnapshot = "await intentSelect.selectOption('snapshot-create');await expect(intentSelect).toHaveValue('snapshot-create');await readBasis.click();const prepared=(await actual('ProjectCostController_getProjectUnifiedAccounting',capturePrep)).preparation;assert.equal(prepared.intent,'snapshot-create');";
for (const [oldText, next] of [[oldBaseline, newBaseline], [oldSnapshot, newSnapshot]]) { assert.equal(candidate.split(oldText).length, 2); candidate = candidate.replace(oldText, next); }
const proposed = dir + '/proposed/' + product; fs.mkdirSync(path.dirname(proposed), { recursive: true }); fs.writeFileSync(proposed, candidate, { flag: 'wx' });
const syntax = spawnSync(process.execPath, ['--check', proposed], { cwd: dir, encoding: 'utf8', windowsHide: true }); assert.equal(syntax.status, 0); assert.equal(syntax.stderr, '');
const diff = spawnSync('git', ['diff', '--no-index', '--no-ext-diff', '--', root + '/' + product, proposed], { cwd: dir, encoding: 'utf8', windowsHide: true }); assert.equal(diff.status, 1);
fs.writeFileSync(dir + '/gh43.diff', diff.stdout, { flag: 'wx' });
const write = (name, value) => fs.writeFileSync(dir + '/' + name, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
write('products43.json', [{ file: product, beforeSHA256, afterSHA256: sha(Buffer.from(candidate)), candidate: 'proposed/' + product }]);
write('diagnosis43.json', { kind: 'actual-GH02-FS-only-missing-explicit-read-click-diagnosis43', actualRunStatus: 'failed-preserved', actualRequestCount: 10, actualGET200: 10, actualDomainPOST: 0, baselineIntentReallyChangedInDOM: true, selectFailureClaimed: false, actualInitialPreparationIntent: 'snapshot-create', actualBaselinePreparationRequested: false, productChangeIntentDoesNotFetch: true, productExplicitReadButtonExists: true, omissionPresentAtBothIntentSwitches: true, sourceAndEvidencePins: verified, actualProductChangeProposed: false, previousSpareConsumedByDomainCommand: false, stateNotRead: true, candidateSyntaxCheck: { node: process.version, exitCode: syntax.status }, actualFixedGUIExecuted: false, RootWritten: false, HTTP: false, SQL: false, G3Certified: false });
console.log(JSON.stringify({ beforeSHA256, afterSHA256: sha(Buffer.from(candidate)), sourcePins: verified.length, syntaxExitCode: syntax.status, noDomainPOST: true }));
