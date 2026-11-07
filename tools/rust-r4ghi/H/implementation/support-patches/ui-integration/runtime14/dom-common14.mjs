import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const fixed = Object.freeze({ namespace: 'poms-r4ghi', linuxRoot: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', windowsRoot: 'E:/projects/worktrees/poms-r3hijk-next28/poms', stateRoot: '/home/wangzishi/.local/share/poms-r4ghi', uncStateRoot: '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi', origin: 'http://127.0.0.1:44551', apiPort: 31441, uiPort: 44551 });
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
export const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export const segment = value => { assert(typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/.test(value)); return value; };
export const inside = (root, file, platform = path) => { const rel = platform.relative(platform.resolve(root), platform.resolve(file)); return rel && !rel.startsWith('..') && !platform.isAbsolute(rel); };
export function runtimePaths(run) {
  segment(run);
  return { linuxIPC: `${fixed.stateRoot}/private/ui/runtime14/${run}`, windowsIPC: `${fixed.uncStateRoot}/private/ui/runtime14/${run}`, linuxPlan: `${fixed.stateRoot}/private/ui-config/runtime14/${run}.json`, windowsPlan: `${fixed.uncStateRoot}/private/ui-config/runtime14/${run}.json`, windowsPrivate: `${fixed.windowsRoot}/tmp/rust-r4ghi/private/ui-runtime14/${run}`, linuxPublic: `${fixed.linuxRoot}/tmp/rust-r4ghi/root/ui-runtime14/${run}`, windowsPublic: `${fixed.windowsRoot}/tmp/rust-r4ghi/root/ui-runtime14/${run}`, linuxBinding: `${fixed.stateRoot}/private/ui-config/runtime14/${run}-binding.json`, windowsBinding: `${fixed.uncStateRoot}/private/ui-config/runtime14/${run}-binding.json` };
}
export function validatePlanIdentity(plan) {
  assert.equal(plan.schemaVersion, 1); assert.equal(plan.namespace, fixed.namespace); assert(segment(plan.epoch) && plan.epoch !== 'g2-business08' && segment(plan.run), 'Explicit new business epoch/run required');
  const locations = runtimePaths(plan.uiRun); assert.equal(plan.origin, fixed.origin); assert.equal(plan.backendPort, fixed.apiPort);
  assert.deepEqual(plan.paths, locations, 'Only fixed R4GHI Linux/UNC/task-private paths are allowed');
  return locations;
}
export function readPinned(file, expected) { assert(/^[0-9a-f]{64}$/.test(expected)); const bytes = fs.readFileSync(file); assert.equal(sha(bytes), expected, 'Pinned bytes changed'); return bytes; }
export function writeNew(file, value, privateFile = true) { fs.writeFileSync(file, Buffer.isBuffer(value) ? value : jsonBytes(value), { flag: 'wx', mode: privateFile ? 0o600 : 0o644 }); }
export function atomicJson(file, value) { const temp = `${file}.${randomUUID()}.tmp`; writeNew(temp, value); fs.renameSync(temp, file); }
export async function waitJson(file, predicate = () => true, timeout = 120_000, abort = () => {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) { const value = readJson(file); if (predicate(value)) return value; }
    abort();
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Owned private IPC deadline exceeded');
}
export function resolveOperation(operations, method, rawPath) {
  const url = new URL(rawPath, fixed.origin), matches = [];
  for (const [operationId, item] of operations) {
    if (item.method !== method) continue;
    const names = [], pattern = item.template.split(/(\{[^}]+\})/).map(part => {
      if (part.startsWith('{')) { names.push(part.slice(1, -1)); return '([^/]+)'; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('');
    const match = new RegExp(`^${pattern}$`).exec(url.pathname);
    if (match) matches.push({ operationId, item, pathParams: Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1])])) });
  }
  assert.equal(matches.length, 1, 'Browser API request must match one real canonical operation');
  return { ...matches[0], querySHA256: sha(Buffer.from(url.search)) };
}
export function cookieMap(raw) {
  const pairs = String(raw ?? '').split(';').map(part => part.trim()).filter(Boolean), result = {};
  for (const pair of pairs) { const at = pair.indexOf('='); assert(at > 0); const key = pair.slice(0, at); assert(!Object.hasOwn(result, key), 'Duplicate cookie key'); result[key] = pair.slice(at + 1); }
  return result;
}
