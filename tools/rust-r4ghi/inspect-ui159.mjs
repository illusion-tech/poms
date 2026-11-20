import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const run = process.argv[2]; assert(/^[a-z0-9-]+$/.test(run)); const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const publicDir = root + '/tmp/rust-r4ghi/root/ui-runtime14/' + run, privateDir = root + '/tmp/rust-r4ghi/private/ui-runtime14/' + run;
const reports = fs.existsSync(publicDir) ? fs.readdirSync(publicDir).filter(file => /^receipt.*\.json$/.test(file)).map(file => { const value = JSON.parse(fs.readFileSync(publicDir + '/' + file)); return { file, keys: Object.keys(value), status: value.status, cases: value.cases, observerCount: value.observerReceipts?.length, summary: value.summary }; }) : [];
const cases = [];
if (fs.existsSync(privateDir)) for (const name of fs.readdirSync(privateDir).filter(file => /^case-\d+$/.test(file))) {
  const folder = privateDir + '/' + name, resultFile = folder + '/result.json', failureFile = folder + '/failure.log';
  const result = fs.existsSync(resultFile) ? JSON.parse(fs.readFileSync(resultFile)) : null;
  const failure = fs.existsSync(failureFile) ? fs.readFileSync(failureFile, 'utf8').split('\n').filter(line => /^\S*(?:Error|AssertionError)|^\s+at |^\s+Call log:|^\s+- /i.test(line)).slice(0, 14) : null;
  const files = fs.readdirSync(folder).filter(file => /requests|errors/.test(file)); cases.push({ name, result, failure, metadataFiles: files });
}
const state = JSON.parse(fs.readFileSync('//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/state.json'));
console.log(JSON.stringify({ run, reports, cases, state: { sequence: state.sequence, activeFault: Boolean(state.activeFault), blockedObservation: Boolean(state.blockedObservation), GH: state.fixtures.uiFormFixtureViews18['gh-capture']?.UICommandObserved, role: state.fixtures.uiFormFixtureViews18['role-create']?.UICommandObserved,
  expenseProjects: Object.keys(state.uiExpense18Receipts ?? {}), lifecycleProjects: Object.keys(state.uiLifecycle18Receipts ?? {}) } }, null, 2));
