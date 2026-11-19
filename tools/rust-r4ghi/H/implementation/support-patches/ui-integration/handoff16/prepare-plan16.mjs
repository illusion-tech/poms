// Root-only metadata capture. No HTTP/DB, module import of business code, browser or process launch.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exactKeys, sha } from './binding-input16.mjs';
import { inventoryClosure, leafManifest } from './source-closure16.mjs';
import { validatePlanIdentity } from '../runtime14/dom-common14.mjs';
const ROOT = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', PRIVATE = '/home/wangzishi/.local/share/poms-r4ghi/private';
function readPin(item) { exactKeys(item, ['file', 'rawBytesSha256']); assert.equal(path.resolve(item.file), item.file); assert(item.file.startsWith(PRIVATE + '/') || item.file.startsWith(ROOT + '/')); const stat = fs.lstatSync(item.file); assert(stat.isFile() && !stat.isSymbolicLink()); assert.equal(fs.realpathSync(item.file), item.file); const bytes = fs.readFileSync(item.file); assert.equal(sha(bytes), item.rawBytesSha256); return JSON.parse(bytes); }
function write(file, value) { const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n'); fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); return { file, rawBytesSha256: sha(bytes) }; }
export function prepare(input, inputBytes, approvedInputSHA256) {
  assert.equal(process.platform, 'linux'); assert.equal(sha(inputBytes), approvedInputSHA256); exactKeys(input, ['schemaVersion', 'kind', 'purpose', 'plan', 'sourceManifest', 'candidateReceipt', 'apiProcess'], ['promotedToolClosure']);
  assert.equal(input.schemaVersion, 1); assert.equal(input.kind, 'prepare-real-ui16-plan'); assert(['fixtures', 'dom'].includes(input.purpose));
  const plan = structuredClone(input.plan), locations = validatePlanIdentity(plan); assert.equal(fs.realpathSync(plan.linuxNodeExecutable), fs.realpathSync(process.execPath));
  const source = readPin(input.sourceManifest), candidate = readPin(input.candidateReceipt), processRecord = readPin(input.apiProcess);
  assert.equal(candidate.epoch, plan.epoch); assert.equal(candidate.run, plan.run); assert.equal(candidate.tables, 139); assert.equal(candidate.migrations, 97); assert.deepEqual(candidate.process.record, processRecord); assert.equal(input.apiProcess.rawBytesSha256, candidate.process.rawBytesSha256);
  assert.deepEqual(source.sourcePins, candidate.sourcePins); assert.equal(source.sourcePinsSHA256, sha(Buffer.from(JSON.stringify(source.sourcePins))));
  const copyPlanBytes = fs.readFileSync(new URL('./exact-copy-plan16.json', import.meta.url)), copyPlan = JSON.parse(copyPlanBytes); assert.equal(copyPlan.kind, 'proposed-exact-sealed-UI14-runtime-file-copy-only');
  const promoted = input.promotedToolClosure ? readPin(input.promotedToolClosure) : null;
  if (promoted) assert.equal(promoted.baseCopyPlanRawBytesSha256, sha(copyPlanBytes));
  const closure = inventoryClosure(ROOT, copyPlan, source.sourcePins, input.purpose, promoted), build = leafManifest(`${ROOT}/dist/apps/poms-admin/browser`);
  const configDirectory = path.dirname(locations.linuxPlan); fs.mkdirSync(configDirectory, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(configDirectory), configDirectory);
  assert(!fs.existsSync(locations.linuxPlan) && !fs.existsSync(locations.linuxBinding));
  const buildPin = write(`${configDirectory}/${plan.uiRun}-build16.json`, { kind: 'actual-dist-browser-leaf-manifest16', namespace: plan.namespace, epoch: plan.epoch, run: plan.run, directoryRelative: 'dist/apps/poms-admin/browser', ...build });
  // Both sealed14 workers already verify every sourceBases member before use.
  plan.sourceBases = [...closure, ...build.files.map(item => ({ ...item, file: `dist/apps/poms-admin/browser/${item.file}` }))];
  plan.metadata16 = { purpose: input.purpose, buildManifest: buildPin, buildManifestSha256: build.manifestSha256, buildLeafCount: build.memberCount,
    sourceClosureSHA256: sha(Buffer.from(JSON.stringify(closure))), sourceClosureMemberCount: closure.length,
    linuxNode: { executable: fs.realpathSync(process.execPath), version: process.version, rawBytesSha256: sha(fs.readFileSync(process.execPath)) }, actualPrepareInputRawSHA256: approvedInputSHA256,
    promotedToolClosure: input.promotedToolClosure ?? null, toolPromotionReceipt: promoted?.promotionReceipt ?? null };
  const planPin = write(locations.linuxPlan, plan);
  const collectInput = write(`${configDirectory}/${plan.uiRun}-collect-input16.json`, { schemaVersion: 1, kind: 'collect-real-current-auth16', purpose: input.purpose, plan: planPin,
    sourceManifest: input.sourceManifest, candidateReceipt: input.candidateReceipt, apiProcess: input.apiProcess });
  return { kind: 'captured-actual-plan-tools-helpers-products-and-dist16', plan: planPin, collectInput, buildManifest: buildPin, buildLeafCount: build.memberCount, sourceClosureMemberCount: closure.length,
    actorsFinal: false, HTTPExecuted: false, DBExecuted: false, browserExecuted: false };
}
function main() { const args = process.argv.slice(2); assert(args.length === 5 && args[0] === '--input' && args[2] === '--approved-input-sha' && args[4] === '--execute'); const bytes = fs.readFileSync(args[1]); console.log(JSON.stringify(prepare(JSON.parse(bytes), bytes, args[3]))); }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
