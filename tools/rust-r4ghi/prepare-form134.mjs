import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { usedActorKeys } from './H/implementation/support-patches/ui-integration/handoff16/binding-input16.mjs';
const root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', author = '/mnt/e/projects/worktrees/poms-r4h-signals/poms', prefix = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/';
const mode = process.argv[2]; assert(['role', 'expense', 'gh', 'lifecycle'].includes(mode)); const sha = b => createHash('sha256').update(b).digest('hex'), pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
const p33 = prefix + 'form-plans33', manifestBytes = fs.readFileSync(author + '/' + p33 + '/manifest33.json'); assert.equal(sha(manifestBytes), 'f3fb9d387a87017fe9bb2020e42ea8df3ec05cec9aaa85301b0be4bff2d84d7d');
for (const p of [...JSON.parse(manifestBytes).files, { file: 'manifest33.json', rawBytesSha256: sha(manifestBytes) }]) { const b = fs.readFileSync(author + '/' + p33 + '/' + p.file); assert.equal(sha(b), p.rawBytesSha256); const dest = root + '/' + p33 + '/' + p.file; fs.mkdirSync(path.dirname(dest), { recursive: true }); if (fs.existsSync(dest)) assert.equal(sha(fs.readFileSync(dest)), p.rawBytesSha256); else fs.writeFileSync(dest, b, { flag: 'wx' }); }
const spec = { role: { dir: 'role-plan31', leaf: 'role31.fragment.json', run: 'role18-source12-01', worker: 'role18' },
  expense: { dir: 'form-plans33', leaf: 'expense33.fragment.json', run: 'expense18-source12-01', worker: 'expense18' },
  gh: { dir: 'form-plans33', leaf: 'gh33.fragment.json', run: 'gh18-source12-01', worker: 'gh18' },
  lifecycle: { dir: 'form-plans33', leaf: 'lifecycle33.fragment.json', run: 'lifecycle18-source12-01', worker: 'lifecycle18' } }[mode];
const template = fs.readFileSync(root + '/' + prefix + 'ui-runtime32/ui06-prepare-input32.unbound.json', 'utf8'), input = JSON.parse(template.replaceAll('dom14-source12-06', spec.run));
const fragment = JSON.parse(fs.readFileSync(root + '/' + prefix + spec.dir + '/' + spec.leaf)); input.plan.cases = fragment.cases; input.plan.writeActions = fragment.writeActions; input.plan.relay24.workerKind = spec.worker;
assert.equal(input.plan.uiRun, spec.run); assert.equal(input.plan.sourceBases.length, 0); assert(!Object.hasOwn(input.plan, 'metadata16')); assert(!Object.hasOwn(input.plan, 'actorProofKeys'));
const dir = '/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14'; input.promotedToolClosure = pin(dir + '/consumer12-promoted20-role143-01.json'); assert.equal(input.promotedToolClosure.rawBytesSha256, '0e12a4b99350d5157715de916befcbc34c829c5eac8f665328ca972e018a1a9d');
const actors = usedActorKeys(input.plan); assert.deepEqual(actors, mode === 'role' ? ['manager', 'execution', 'finance', 'manager-role-peer'] : [mode === 'lifecycle' ? 'execution' : 'manager']);
const file = dir + '/' + spec.run + '-prepare-input16.json'; fs.writeFileSync(file, JSON.stringify(input, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ mode, input: pin(file), actorKeys: actors, cases: input.plan.cases.map(c => c.kind), workerKind: spec.worker, metadataAndAuthStillRequire132: true, HTTPExecuted: false }));
