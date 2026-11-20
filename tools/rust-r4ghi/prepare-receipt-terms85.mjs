import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { sha, uuid } from './business/pure.mjs';
assert.equal(process.platform, 'linux');
const ctx = createContext({ epoch: 'g2-business12', run: 'main01' });
assert(!fs.existsSync(ctx.priv + '/driver.lock'));
const record = ctx.state.fixtures.efReceiver40;
assert.equal(record.kind, 'ordinary-actual-EF-receiver-producer-not-FI');
assert(record.fixtures.executionComplete && record.fixtures.contractFinishComplete);
const slot = record.fixtures.contractRuns[0]; assert(slot.activated.snapshotId && slot.contract.id);
const template = ctx.win + '/tools/rust-r4ghi/I/implementation/business-receipt-terms-race66/plan66.template.json';
const templateBytes = fs.readFileSync(template);
assert.equal(sha(templateBytes), 'db1a620457276f93e6d5d2e017bd31c5422fd6cf6e5a3cc9a6b73ae49af334a7');
const plan = JSON.parse(templateBytes);
Object.assign(plan, { projectId: uuid(record.fixtures.project.id), contractId: uuid(slot.contract.id), termSnapshotId: uuid(slot.activated.snapshotId),
  caseId: 'original-terms85-01', lockTimeoutMs: 1000,
  expectedSourcePinsSHA256: sha(JSON.stringify(ctx.pins)), reviewedHelperPinsSHA256: sha(JSON.stringify(ctx.helperPins)),
  expectedBinarySHA256: ctx.state.apiProcess.record.binarySha256,
  apiProcess: { file: ctx.state.apiProcess.file, rawBytesSha256: ctx.state.apiProcess.rawBytesSha256 } });
assert.notEqual(plan.projectId, ctx.state.fixtures.project.id);
assert.equal(plan.expectedSourcePinsSHA256, '5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa');
assert.equal(plan.expectedBinarySHA256, 'de8eaaf6ce15a2054380e25f3151c21611cf0bf760230c7336745d80850d9cff');
const file = ctx.priv + '/receipt-terms85-plan.json';
fs.writeFileSync(file, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ kind: 'Root-actual-C66-resource-source-helper-plan85', plan: { file, rawBytesSha256: sha(fs.readFileSync(file)) },
  resourcePath: '/fixtures/efReceiver40/fixtures/contractRuns/0', originalProducerRecordChanged: false,
  projectId: plan.projectId, actualSourceCount: ctx.pins.length, HTTPExecuted: false, SQLExecuted: false, G3Certified: false }));
