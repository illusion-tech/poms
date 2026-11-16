// Assemble immutable plan metadata from actual inputs only; never mints a state.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const sha = x => createHash('sha256').update(x).digest('hex');
export function strictOperationPin15(p) { assert(p && typeof p.file === 'string' && p.file.startsWith('/') && path.resolve(p.file) === p.file && !p.file.includes('\\') && /^[a-f0-9]{64}$/.test(p.rawBytesSha256)); const st = fs.lstatSync(p.file); assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1); assert.equal(fs.realpathSync(p.file), p.file); const b = fs.readFileSync(p.file); assert.equal(sha(b), p.rawBytesSha256); if (p.bytes !== undefined) assert.equal(b.length, p.bytes); return b; }
const json = p => JSON.parse(strictOperationPin15(p)); const same = (a, b) => { assert(a && b); assert.equal(a.file, b.file); assert.equal(a.rawBytesSha256, b.rawBytesSha256); };
export function assertOperationApproval15(inputPin, input, approval, kind, mode) { assert.equal(input.kind, kind); assert.equal(input.mode, mode); assert.equal(approval.kind, 'Root-exact-source15-119-operation'); same(approval.input, inputPin); assert.equal(approval.mode, mode); same(approval.toolingManifest, input.tooling.manifest); assert.equal(approval.domainHTTP, false); assert.equal(approval.stateMinted, false); assert.equal(approval.ordinaryContextCreated, false); }
export function preimportOperation15(input, expectedEntry) {
  assert.equal(input.tooling.entry.file, expectedEntry); strictOperationPin15(input.tooling.entry);
  const manifest = json(input.tooling.manifest); assert.equal(manifest.kind, 'source15-admission119-code-candidate'); assert.equal(manifest.production.length, 14);
  assert(Array.isArray(input.tooling.executionSources) && input.tooling.executionSources.length === 14); assert.equal(new Set(input.tooling.executionSources.map(x => x.file)).size, 14);
  for (const e of manifest.production) { const p = input.tooling.executionSources.find(x => x.file === ROOT + '/' + e.file); assert(p); assert.equal(p.rawBytesSha256, e.afterSHA256); strictOperationPin15(p); }
  const declared = json(input.helperPins), actual = fs.readdirSync(ROOT + '/tools/rust-r4ghi/business').filter(n => /\.(mjs|json)$/.test(n)).sort().map(n => { const file = ROOT + '/tools/rust-r4ghi/business/' + n, b = fs.readFileSync(file), pin = { file, rawBytesSha256: sha(b) }; strictOperationPin15(pin); return { file: 'tools/rust-r4ghi/business/' + n, sha256: pin.rawBytesSha256 }; });
  assert.deepEqual(actual, declared); return actual;
}
export function parseOperationArgs15(args) { assert.equal(args.length, 9); assert.deepEqual([args[0], args[2], args[4], args[6], args[8]], ['--input', '--input-sha', '--approval', '--approval-sha', '--execute']); return [{ file: args[1], rawBytesSha256: args[3] }, { file: args[5], rawBytesSha256: args[7] }]; }
export async function runPlanAssembly15(inputPin, approvalPin) {
  assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert(!process.env.NODE_OPTIONS && !process.env.NODE_PATH); assert.deepEqual(process.execArgv, []);
  assert(inputPin.file.startsWith(P + '/') && approvalPin.file.startsWith(P + '/'));
  const input = json(inputPin), approval = json(approvalPin); assertOperationApproval15(inputPin, input, approval, 'Root-source15-119-plan-assembly-input', 'assemble-plan');
  preimportOperation15(input, fileURLToPath(import.meta.url));
  assert(['pre-observe', 'bootstrap', 'inspect', 'publish'].includes(input.stage));
  assert(!fs.existsSync(P + '/business/g2-business15/main01/state.json'));
  assert(typeof input.outputFile === 'string' && input.outputFile.startsWith(P + '/source15-plan119-') && path.basename(input.outputFile).endsWith('.json'));
  const core = await import(pathToFileURL(ROOT + '/tools/rust-r4ghi/business/source15-admission-core.mjs').href), native = await import(pathToFileURL(ROOT + '/tools/rust-r4ghi/business/source15-admission.mjs').href), retained = await import(pathToFileURL(ROOT + '/tools/rust-r4ghi/business/retained-source14-for15.mjs').href);
  const p = json(input.draftPlan); assert.equal(p.resources, null, 'Resource list must be derived from actual published14 scope, not supplied');
  const parent = retained.verifyRetained14For15(p.parent14); p.resources = core.resourceEntries15(parent); core.assertStateTransfer15(p.stateTransfer, parent.state);
  core.assertPlanShape15(p, input.stage); same(p.consumer.helperPins, input.helperPins); same(p.tooling.manifest, input.tooling.manifest);
  assert.equal(core.scope15(p), approval.scope15);
  const directory = path.dirname(input.outputFile); assert.equal(fs.realpathSync(directory), directory);
  const bytes = Buffer.from(JSON.stringify(p, null, 2) + '\n'), fd = fs.openSync(input.outputFile, 'wx', 0o600);
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  const output = { file: input.outputFile, bytes: bytes.length, rawBytesSha256: sha(bytes) }; strictOperationPin15(output);
  native.verifyPlan15(output, { stage: input.stage });
  console.log(JSON.stringify({ plan: output, scope15: core.scope15(p), stateMinted: false, effectsGranted: false })); return output;
}
export async function mainPlan15(args = process.argv.slice(2)) { if (args.length === 1 && args[0] === '--help') { console.log('Root-only FS assembly --input FILE --input-sha SHA --approval FILE --approval-sha SHA --execute; no context, candidate, registry or state mint.'); return; } return runPlanAssembly15(...parseOperationArgs15(args)); }
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) mainPlan15().catch(e => { console.error(JSON.stringify({ kind: 'source15-plan-assembly-stopped', message: e.message, preserveAllArtifacts: true })); process.exitCode = 1; });
