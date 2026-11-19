// Filesystem-only metadata. Never imports the business helpers it inventories.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sha } from './binding-input16.mjs';
const PREFIX = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration';
function metadataPin(pin) {
  assert.equal(path.resolve(pin.file), pin.file); assert(pin.file.endsWith('.json'));
  assert(pin.file.startsWith('/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/') || pin.file.startsWith('/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14/'));
  const stat = fs.lstatSync(pin.file); assert(stat.isFile() && !stat.isSymbolicLink()); assert.equal(fs.realpathSync(pin.file), pin.file);
  const bytes = fs.readFileSync(pin.file); assert.equal(sha(bytes), pin.rawBytesSha256); return JSON.parse(bytes);
}
export const entryFiles16 = ['binding-input16.mjs', 'source-closure16.mjs', 'prepare-plan16.mjs', 'collect-actor-proof16.mjs', 'make-generation-input16.mjs', 'generate-binding16.mjs', 'run-max-mask16.mjs', 'run-dom16.mjs', 'consumer-fixtures54.mjs'];
export function pinFile(root, relativeFile) {
  assert(typeof relativeFile === 'string' && relativeFile && !relativeFile.includes('\\') && !relativeFile.split('/').includes('..') && !path.isAbsolute(relativeFile));
  const file = path.join(root, ...relativeFile.split('/')), stat = fs.lstatSync(file); assert(stat.isFile() && !stat.isSymbolicLink());
  const bytes = fs.readFileSync(file); return { file: relativeFile, bytes: bytes.length, rawBytesSha256: sha(bytes) };
}
export function inventoryClosure(root, copyPlan, productPins, purpose, promotedToolClosure = null) {
  assert.equal(copyPlan.files.length, 20); const pins = new Map();
  const add = relative => { const item = pinFile(root, relative), previous = pins.get(relative); if (previous) assert.equal(previous.rawBytesSha256, item.rawBytesSha256); pins.set(relative, item); return item; };
  if (promotedToolClosure) {
    assert.equal(promotedToolClosure.schemaVersion, 1); assert.equal(promotedToolClosure.kind, 'Root-reviewed-exact-tool-corrective-closure54'); assert.equal(promotedToolClosure.files.length, 20);
    assert(promotedToolClosure.promotionReceipt?.file && /^[0-9a-f]{64}$/.test(promotedToolClosure.promotionReceipt.rawBytesSha256));
    metadataPin(promotedToolClosure.promotionReceipt);
    assert.deepEqual(promotedToolClosure.files.map(item => item.relativeFile).sort(), copyPlan.files.map(item => item.relativeFile).sort());
  }
  for (const original of copyPlan.files) {
    const item = promotedToolClosure ? promotedToolClosure.files.find(item => item.relativeFile === original.relativeFile) : original;
    if (promotedToolClosure) assert.equal(item.baseRawBytesSha256, original.rawBytesSha256, 'A correction must name the original sealed tool bytes');
    const actual = add(`${PREFIX}/${item.relativeFile}`); assert.equal(actual.rawBytesSha256, item.rawBytesSha256); assert.equal(actual.bytes, item.bytes);
  }
  for (const item of productPins) { const actual = add(item.file); assert.equal(actual.rawBytesSha256, item.sha256); }
  for (const file of entryFiles16) add(`${PREFIX}/handoff16/${file}`);
  // Root's ctx.helperPins inventories this exact directory. Bind all of those
  // current helper bytes, plus literal relative imports (including status).
  const pending = fs.readdirSync(path.join(root, 'tools/rust-r4ghi/business')).filter(file => /\.(mjs|json)$/.test(file)).map(file => `tools/rust-r4ghi/business/${file}`), visited = new Set();
  while (pending.length) {
    const relative = pending.pop(); if (visited.has(relative)) continue; visited.add(relative); add(relative);
    if (!relative.endsWith('.mjs')) continue;
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    for (const match of text.matchAll(/(?:from\s*|import\s*\(|new\s+URL\s*\()\s*['"](\.{1,2}\/[^'"\r\n]+\.(?:mjs|json))['"]/g)) {
      const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(relative), match[1])); assert(dependency.startsWith('tools/')); pending.push(dependency);
    }
  }
  if (purpose === 'fixtures') for (const file of ['runtime13/max13.mjs', 'runtime13/mask13.mjs', 'append06/max-fixture06.mjs', 'append06/mask-fixture09/user-proof09.mjs']) add(`${PREFIX}/${file}`);
  return [...pins.values()].sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
}
export function leafManifest(directory) {
  const files = [], root = fs.realpathSync(directory);
  const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name), stat = fs.lstatSync(file); assert(!stat.isSymbolicLink()); if (stat.isDirectory()) walk(file); else { assert(stat.isFile()); files.push(pinFile(root, path.relative(root, file).replaceAll('\\', '/'))); } } };
  walk(root); files.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0); assert(files.some(file => file.file === 'index.html'));
  return { files, memberCount: files.length, manifestSha256: sha(Buffer.from(JSON.stringify(files))) };
}
export function verifyPreparedPlan(root, plan) {
  assert(plan.metadata16 && ['fixtures', 'dom'].includes(plan.metadata16.purpose));
  for (const item of plan.sourceBases) assert.deepEqual(pinFile(root, item.file), item);
  const closure = plan.sourceBases.filter(item => !item.file.startsWith('dist/apps/poms-admin/browser/'));
  assert.equal(closure.length, plan.metadata16.sourceClosureMemberCount); assert.equal(sha(Buffer.from(JSON.stringify(closure))), plan.metadata16.sourceClosureSHA256);
  const actual = leafManifest(path.join(root, 'dist/apps/poms-admin/browser'));
  assert.equal(actual.manifestSha256, plan.metadata16.buildManifestSha256); assert.equal(actual.memberCount, plan.metadata16.buildLeafCount);
  if (plan.metadata16.promotedToolClosure) {
    const current = metadataPin(plan.metadata16.promotedToolClosure); assert.equal(current.kind, 'Root-reviewed-exact-tool-corrective-closure54'); assert.deepEqual(current.promotionReceipt, plan.metadata16.toolPromotionReceipt);
    metadataPin(current.promotionReceipt);
  }
  return actual;
}
