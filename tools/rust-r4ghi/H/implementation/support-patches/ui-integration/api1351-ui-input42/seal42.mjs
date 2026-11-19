// H-owned artifact sealing only; no business imports or active-state reads.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const expense = json(root + '/tmp/rust-r4ghi/root/ui-runtime14/expense18-source12-02/receipt18-04.json');
assert.equal(expense.status, 'passed-bound-cases-only'); assert.equal(expense.actualDOMExecuted, true); assert.equal(expense.allExpenseGroupsPassed, true);
assert.equal(expense.cases.length, 1); assert.equal(expense.cases[0].status, 'passed');
assert.deepEqual(expense.cases[0].actualWriteObserver.map(value => value.operationId), ['ProjectCostController_createExpenseRecord', 'ProjectCostController_confirmExpenseRecord', 'ProjectCostController_createProjectActualCostRecord', 'ProjectCostController_confirmCostStageAttribution']);
const files = ['tools/rust-r4ghi/business/prepare-ui-cookie-scope27.mjs', 'tools/rust-r4ghi/business/ui-cookie-scope27.mjs', 'tools/rust-r4ghi/business/ui-gh18-fixtures.mjs', 'tools/rust-r4ghi/business/ui-gh18-policy.mjs', 'tools/rust-r4ghi/business/ui-lifecycle18-fixtures.mjs', 'tools/rust-r4ghi/business/ui-lifecycle18-policy.mjs', 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16/prepare-plan16.mjs', 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16/collect-actor-proof16.mjs', 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16/generate-binding16.mjs', 'tools/rust-r4ghi/business/same-source-process1351.mjs'];
const sourcePins = files.map(file => { const bytes = fs.readFileSync(root + '/' + file); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; });
const checks = json(path.join(dir, 'checks42.json')); assert.equal(checks.status, 'pass'); assert.equal(checks.immutablePinsVerified.length, 29); assert.equal(checks.h38ExactPromotedProducts.length, 5);
for (const product of checks.h38ExactPromotedProducts) assert.equal(sha(fs.readFileSync(root + '/' + product.file)), product.afterSHA256);
for (const name of ['frozen-role', 'gh', 'lifecycle']) {
  const fragment = json(path.join(dir, name + '42.fragment.json'));
  assert.equal(fragment.replacePrepareInputFields.apiProcess.rawBytesSha256, 'fd81b926dbaad79debc0343ac63b6cff7c967ac4a52cd64db0a7d0e7d4dbc2a1');
  assert.equal(fragment.replacePrepareInputFields.candidateReceipt.rawBytesSha256, '1dde0fda6f0c23682568f8256ea98da4137ebd7793da7915238e0ac066a9740c');
  assert.deepEqual(fragment.replacePrepareInputFields.sourceManifest, fragment.replacePrepareInputFields.candidateReceipt);
  assert.equal(fragment.actualRuntimeClaimed, false);
}
const frozen = json(path.join(dir, 'frozen-role42.fragment.json')); assert.equal(frozen.replacePlanFields.writeActions.length, 0); assert.equal(frozen.replacePlanFields.cases[0].kind, 'frozen-role-readback');
write('verification42.json', { kind: 'FS-and-pure-only-guide42-verification', fixedPinsVerified: 29, H38ExactAppliedFiles: 5, existingReadonly38Tests: { node: 'v24.19.0', pass: 5, fail: 0, exitCode: 0 }, expense02ActualUIOperations: expense.cases[0].actualWriteObserver.map(value => value.operationId), sourcePins, newScopeProofGenerated: false, newActorProofGenerated: false, newRuntimePlanGenerated: false, activeStateRead: false, RootWritten: false, HTTP: false, SQL: false, browser: false, G3Certified: false });
const inventory = fs.readdirSync(dir).filter(file => file !== 'manifest42.json').sort().map(file => { const bytes = fs.readFileSync(path.join(dir, file)); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; });
write('manifest42.json', { kind: 'Root-reviewable-1351-frozen-role-GH-lifecycle-field-guide42', status: 'sealed-FS-pure-only', products: [], existingProductChanges: 0, files: inventory, priorSealsUnchanged: ['H38', 'H33', 'H39', 'H40', 'H41', 'Role03', 'Expense02'], newCurrentAuthority: 'Root-actual-1351-pins-referenced-no-authority-minted', RootWritten: false, SQL: false, HTTP: false, G3Certified: false, G4Certified: false });
console.log(JSON.stringify({ files: inventory.length, manifest42SHA256: sha(fs.readFileSync(path.join(dir, 'manifest42.json'))), runtimeExecuted: false }));
