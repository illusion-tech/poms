import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
assert.equal(process.platform, 'linux');
const root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const priv = '/home/wangzishi/.local/share/poms-r4ghi/private';
const prefix = root + '/tools/rust-r4ghi/H/implementation/support-patches/ui-integration';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
const uiRun = 'dom14-source12-01';
const plan = JSON.parse(fs.readFileSync(prefix + '/runtime14/plan14.template.json', 'utf8').replaceAll('dom14-01', uiRun));
Object.assign(plan, { epoch: 'g2-business12', run: 'main01', uiRun, linuxNodeExecutable: fs.realpathSync(process.execPath) });
plan.cases.push(
  { kind: 'legacy-anchor', actorKey: 'manager', projectIdPointer: '/fixtures/legacyCompatibilityFixture/projectId', forbiddenTextPointers: [] },
  { kind: 'money-max', actorKey: 'manager', projectIdPointer: '/fixtures/maxProject/id', forbiddenTextPointers: [] },
  { kind: 'sensitive-mask', actorKey: 'person', projectIdPointer: '/fixtures/maskProject/id', sourceRefPointer: '/fixtures/maskTruth/sourceRef', forbiddenTextPointers: ['/fixtures/maskTruth/amountIncludingTax'] },
);
assert(!Object.hasOwn(plan, 'actorProofKeys'));
const candidate = pin(priv + '/business/g2-business12/main01/004534-candidate-source-binding12.json');
assert.equal(candidate.rawBytesSha256, 'b5c86c8882657aac1e1affc153510a728bc304943265e51a230b6be19a0429b7');
const input = { schemaVersion: 1, kind: 'prepare-real-ui16-plan', purpose: 'dom', plan,
  sourceManifest: candidate, candidateReceipt: candidate, apiProcess: pin(priv + '/rust-api135-process.json'),
  promotedToolClosure: pin(priv + '/ui-config/runtime14/consumer11-promoted20-54-01.json') };
assert.equal(input.apiProcess.rawBytesSha256, 'a42333c74b7afd8aa7359bb3cf915444cc7cbbfebff9049a467c2cdb33ccef06');
assert.equal(input.promotedToolClosure.rawBytesSha256, '662953aca396435d4f82387017b85a68d7deb3166a3a162a5653034e796bd4b5');
const file = priv + '/ui-config/runtime14/' + uiRun + '-prepare-input16.json';
fs.writeFileSync(file, JSON.stringify(input, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ input: pin(file), purpose: 'dom', cases: plan.cases.map(item => item.kind), plannedWrites: plan.writeActions.length, actorsFinal: false, HTTPExecuted: false }));
