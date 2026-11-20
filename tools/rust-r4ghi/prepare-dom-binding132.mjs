// Root-reviewed metadata/auth orchestration only; never starts Chrome or a domain command.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { usedActorKeys } from './H/implementation/support-patches/ui-integration/handoff16/binding-input16.mjs';
import { createContext } from './business/context.mjs';
import { createApi } from './business/http.mjs';
assert.equal(process.platform, 'linux'); const args = process.argv.slice(2); assert(args.length === 4 && args[0] === '--input' && args[2] === '--approved-input-sha');
const root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', base = root + '/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16/';
const sha = b => createHash('sha256').update(b).digest('hex'), raw = fs.readFileSync(args[1]); assert.equal(sha(raw), args[3]); const input = JSON.parse(raw);
assert.equal(input.kind, 'prepare-real-ui16-plan'); assert.equal(input.purpose, 'dom'); assert.equal(input.plan.epoch, 'g2-business12'); assert.equal(input.plan.run, 'main01');
const actors = usedActorKeys(input.plan); assert(actors.length > 0 && actors.length <= 8);
const output = '/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14/' + input.plan.uiRun + '-orchestration132'; fs.mkdirSync(output, { mode: 0o700 });
function command(name, module, argv) {
  const r = spawnSync(process.execPath, [base + module, ...argv], { cwd: root, env: process.env, encoding: 'utf8', timeout: 240000, maxBuffer: 1000000 });
  fs.writeFileSync(output + '/' + name + '-stdout.json', r.stdout ?? '', { flag: 'wx', mode: 0o600 }); fs.writeFileSync(output + '/' + name + '-stderr.log', r.stderr ?? '', { flag: 'wx', mode: 0o600 });
  assert.equal(r.status, 0, 'Metadata step failed; preserve originals and inspect committed effects before a new run'); return JSON.parse(r.stdout.trim());
}
const prepared = command('prepare', 'prepare-plan16.mjs', ['--input', args[1], '--approved-input-sha', args[3], '--execute']);
assert.equal(prepared.actorsFinal, false); console.log(JSON.stringify({ phase: 'metadata-prepared', uiRun: input.plan.uiRun, closureMembers: prepared.sourceClosureMemberCount, actorKeys: actors }));
const ctx = createContext({ epoch: 'g2-business12', run: 'main01' }), lock = ctx.priv + '/driver.lock';
fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'Root-real-auth-only-before-closed-DOM-binding132', uiRun: input.plan.uiRun, actors }), { flag: 'wx', mode: 0o600 });
try {
  assert(!ctx.state.activeFault && !ctx.state.blockedObservation); const api = createApi(ctx);
  for (const key of actors) { const actor = ctx.state.actors[key]; assert(actor?.id && actor.username && actor.password && actor.roleId && actor.orgId, 'Only already real actors may be authenticated'); await api.login(key); }
} catch (error) { const original = ctx.artifact(ctx.next('binding132-auth-partial') + '.json', { name: error.name, stack: error.stack }); ctx.persist(); console.error(JSON.stringify({ original, domainCommandReplayed: false })); throw new Error('Authentication metadata phase failed; inspect private originals'); }
finally { assert.equal(JSON.parse(fs.readFileSync(lock)).pid, process.pid); fs.unlinkSync(lock); }
const collected = command('collect', 'collect-actor-proof16.mjs', ['--input', prepared.collectInput.file, '--approved-input-sha', prepared.collectInput.rawBytesSha256, '--execute']); assert.equal(collected.actorBindingsFinal, true);
const generatedInput = command('generation-input', 'make-generation-input16.mjs', ['--collect-input', prepared.collectInput.file, '--approved-collect-input-sha', prepared.collectInput.rawBytesSha256,
  '--actor-index', collected.actorProofIndex.file, '--actor-index-sha', collected.actorProofIndex.rawBytesSha256, '--execute']);
const binding = command('binding', 'generate-binding16.mjs', ['--input', generatedInput.generationInput.file, '--approved-input-sha', generatedInput.generationInput.rawBytesSha256, '--execute']);
assert.equal(binding.actorsFinal, true); const final = { kind: 'Root-real-source12-DOM-metadata-and-auth-orchestration132', uiRun: input.plan.uiRun, input: { file: args[1], rawBytesSha256: args[3] },
  plan: prepared.plan, buildManifest: prepared.buildManifest, sourceClosureMemberCount: prepared.sourceClosureMemberCount, actorKeys: actors, actualAuthGETCount: collected.actualGETCount,
  actualActorProof: collected.actorProofIndex, actorManifest: binding.actorManifest, closedBinding: binding.closedBinding, authenticationPOSTExecuted: true, domainCommandsExecuted: false,
  ChromeExecuted: false, RootMustReviewExactBindingBeforeChrome: true, G3Certified: false, G4Certified: false };
fs.writeFileSync(output + '/receipt.json', JSON.stringify(final, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify(final));
