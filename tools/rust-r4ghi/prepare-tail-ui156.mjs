// Bind new, not-yet-executed UI runs to the actual admitted physical process.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createContext } from './business/context.mjs';
import { verifyProcessRestart1351 } from './business/same-source-process1351.mjs';
import { usedActorKeys } from './H/implementation/support-patches/ui-integration/handoff16/binding-input16.mjs';
assert.equal(process.platform, 'linux'); const mode = process.argv[2]; assert(['gh', 'lifecycle', 'frozen-role'].includes(mode));
const root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', prefix = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/', sha = value => createHash('sha256').update(value).digest('hex'), pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
const ctx = createContext({ epoch: 'g2-business12', run: 'main01' }); assert(!fs.existsSync(ctx.priv + '/driver.lock'));
const registry = verifyProcessRestart1351(ctx, JSON.parse(fs.readFileSync(ctx.state.consumerAdmission54.registry.file)), { liveProcess: true }); assert.equal(ctx.helperPins.length, 175);
assert.equal(registry.newApiProcess.rawBytesSha256, 'fd81b926dbaad79debc0343ac63b6cff7c967ac4a52cd64db0a7d0e7d4dbc2a1');
const specs = { gh: { run: 'gh18-source12-02', fragment: 'form-plans33/gh33.fragment.json', worker: 'gh18', actor: 'manager' },
  lifecycle: { run: 'lifecycle18-source12-01', fragment: 'form-plans33/lifecycle33.fragment.json', worker: 'lifecycle18', actor: 'execution' },
  'frozen-role': { run: 'role18-source12-frozen01', fragment: 'frozen-role38/frozen-role38.fragment.json', worker: 'role18', actor: 'manager' } }, spec = specs[mode];
const template = fs.readFileSync(root + '/' + prefix + 'ui-runtime32/ui06-prepare-input32.unbound.json', 'utf8'), input = JSON.parse(template.replaceAll('dom14-source12-06', spec.run)), fragment = JSON.parse(fs.readFileSync(root + '/' + prefix + spec.fragment));
input.plan.cases = fragment.cases; input.plan.writeActions = fragment.writeActions; input.plan.relay24.workerKind = spec.worker;
input.sourceManifest = { file: registry.candidateReceipt.file, rawBytesSha256: registry.candidateReceipt.rawBytesSha256 }; input.candidateReceipt = { ...input.sourceManifest }; input.apiProcess = { file: registry.newApiProcess.file, rawBytesSha256: registry.newApiProcess.rawBytesSha256 };
const dir = ctx.private + '/ui-config/runtime14'; input.promotedToolClosure = pin(dir + '/consumer12-promoted20-frozen154-01.json'); assert.equal(input.promotedToolClosure.rawBytesSha256, '060cff7959e3166fb736502ac13e0a8d02e038e35a6fb4188f7d0501d80add91');
input.plan.cookieScopeProof = pin(dir + '/api1351-cookie-scope-proof155.json');
const cookieProof = JSON.parse(fs.readFileSync(input.plan.cookieScopeProof.file)); assert.deepEqual(cookieProof.apiProcess, input.apiProcess);
assert.equal(input.plan.relay24.wslIPv4, '172.22.207.203');
assert.equal(input.plan.sourceBases.length, 0); assert(!input.plan.metadata16 && !input.plan.actorProofKeys); assert.deepEqual(usedActorKeys(input.plan), [spec.actor]);
if (mode === 'lifecycle') { const eo = ctx.state.fixtures.uiFixtureViews23.eo; assert.equal(eo.UICommandObserved, true); assert(ctx.state.uiExpense18Receipts[eo.pause.result.projectId]); assert(!ctx.state.uiLifecycle18Receipts?.[eo.pause.result.projectId]); }
if (mode === 'gh') assert(!ctx.state.uiGH18Receipts?.['f9044951-dfa3-41ec-a655-66234697c672']);
if (mode === 'frozen-role') { assert.equal(input.plan.writeActions.length, 0); assert.equal(ctx.state.fixtures.uiFormFixtureViews18['role-create'].UICommandObserved, true); }
const bytes = Buffer.from(JSON.stringify(input, null, 2) + '\n'), file = dir + '/' + spec.run + '-prepare-input16.json'; fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ mode, input: pin(file), uiRun: spec.run, actorKeys: usedActorKeys(input.plan), sourceCount: registry.sourceCount, helperCount: ctx.helperPins.length, newPhysicalProcess: input.apiProcess, actualHTTPExecuted: false }));
