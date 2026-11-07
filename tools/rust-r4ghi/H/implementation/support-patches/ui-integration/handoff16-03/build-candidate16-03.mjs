// FS-only exact candidate builder. No Root/product writes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const file = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16/binding-input16.mjs';
const bytes = fs.readFileSync(`${root}/${file}`), sha = value => crypto.createHash('sha256').update(value).digest('hex');
assert.equal(sha(bytes), '3e4af863e2759efd2c24321970855ebbbf2a059881ddec7c6f27d6f9c892889a');
const before = bytes.toString('utf8');
const oldFunction = before.slice(before.indexOf('export function usedActorKeys(plan) {'), before.indexOf('export function assertActorResponse('));
assert(oldFunction && oldFunction.includes('plan.cases.map'));
const nextFunction = `export function usedActorKeys(plan) {
  assert(Array.isArray(plan.cases) && Array.isArray(plan.writeActions));
  const participants = plan.writeActions.flatMap(item => {
    if (!Object.hasOwn(item, 'participants')) return [];
    assert(Array.isArray(item.participants)); return item.participants.map(row => row.actorKey);
  });
  let additional = [];
  if (Object.hasOwn(plan, 'actorProofKeys')) {
    assert.equal(plan.metadata16?.purpose, 'fixtures', 'Additional actor proofs are fixture metadata only, never DOM cases');
    assert(Array.isArray(plan.actorProofKeys) && plan.actorProofKeys.length > 0 && plan.actorProofKeys.length <= 64);
    assert.equal(new Set(plan.actorProofKeys).size, plan.actorProofKeys.length, 'Additional actor keys must be explicit and unique');
    additional = plan.actorProofKeys;
  }
  const result = [...new Set([...plan.cases.map(item => item.actorKey), ...plan.writeActions.filter(item => item.targetOwnerActorKey).map(item => item.targetOwnerActorKey), ...participants, ...additional])];
  assert(result.length > 0 && result.every(key => typeof key === 'string' && /^[a-z][a-z0-9-]*$/.test(key)));
  return result;
}
`;
const after = before.replace(oldFunction, nextFunction); assert.notEqual(after, before); assert.equal(after.replace(nextFunction, oldFunction), before);
const candidate = `${dir}/proposed/${file}`; fs.mkdirSync(path.dirname(candidate), { recursive: true }); fs.writeFileSync(candidate, after, { flag: 'wx' });
const result = { file, beforeSHA256: sha(bytes), afterSHA256: sha(Buffer.from(after)), candidate: `proposed/${file}`, onlyUsedActorKeysChanged: true };
fs.writeFileSync(`${dir}/candidate16-03.json`, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(result));
