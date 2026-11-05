// ROOT EXECUTION ONLY. Author uses node --check and never invokes this entry.
// The explicit flag and final three-source/binary fence are required before I/O.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createLatePut84, contextFromRaces73, OPERATIONS84, PRODUCT_FILES84 } from './runner84.mjs';

assert(process.argv.includes('--allow-root-execution'), 'Root must explicitly admit actual execution');
const args = Object.fromEntries(process.argv.slice(2).filter(s => s !== '--allow-root-execution').map(s => { const m = /^--([A-Za-z]+)=(.+)$/.exec(s); assert(m); return [m[1], m[2]]; }));
for (const name of Object.keys(args)) assert(['runtimeEdition', 'binarySha', 'finalRuntimeReceipt', 'tag'].includes(name));
assert(process.platform === 'linux' && /^\d+$/.test(args.runtimeEdition ?? '') && /^[0-9a-f]{64}$/.test(args.binarySha ?? '') && args.finalRuntimeReceipt, 'Concrete final runtime and source authority receipt required');
const ROOT = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', STATE = '/home/wangzishi/.local/share/poms-r4def', tag = args.tag ?? 'k84-' + randomUUID().slice(0, 8); assert(/^[a-z0-9-]{1,24}$/.test(tag));
const privateRoot = STATE + '/private/late-put84-' + tag, publicRoot = ROOT + '/tmp/rust-r4def/root/late-put84-' + tag;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const parse = async file => JSON.parse(await fs.readFile(file, 'utf8'));
await fs.mkdir(privateRoot, { mode: 0o700 }); await fs.mkdir(publicRoot);
let proofSequence = 0, result, failure;
async function preserve(label, body) {
    const bytes = Buffer.from(JSON.stringify(body, null, 2) + '\n'), file = privateRoot + '/' + String(++proofSequence).padStart(4, '0') + '-' + label.replace(/[^a-zA-Z0-9-]/g, '_') + '.json'; await fs.writeFile(file, bytes, { flag: 'wx', mode: 0o600 }); return { receiptId: file, bytes: bytes.length, rawBytesSha256: sha(bytes) };
}
try {
    const identity = await parse(STATE + '/identity.json'); assert(identity.namespace === 'poms-r4def' && identity.base === '756d813c9578090fcf8e56821acce01b46b40420' && identity.port === 25433);
    // Root supplies the latest independent source/build/runtime binding. No epoch
    // number is hardcoded: K98 or a later admitted correction can be bound.
    const authorityPath = path.resolve(ROOT, args.finalRuntimeReceipt); assert(authorityPath.startsWith(ROOT + '/') && !authorityPath.includes('/private/')); const authority = await parse(authorityPath); assert(authority.finalRuntime === true && authority.epoch && authority.namespace === identity.namespace && authority.instanceId === identity.marker && authority.binarySha256 === args.binarySha && authority.runtimeReceiptId && authority.authorityReceiptIds?.length, 'Concrete Root final source/binary binding receipt required'); assert.deepEqual(authority.productSources?.map(p => p.file).sort(), [...PRODUCT_FILES84].sort()); const authorityPin = await preserve('final-runtime-source-authority', { file: authorityPath, rawBytesSha256: sha(await fs.readFile(authorityPath)), body: authority });
    const { createApiHarness } = await import(pathToFileURL(ROOT + '/tools/rust-r4def/api-harness32.mjs').href), { connect } = await import(pathToFileURL(ROOT + '/tools/rust-r4def/db33.mjs').href);
    const h = createApiHarness(), spec = h.spec; for (const [id, [method, expectedPath, status]] of Object.entries(OPERATIONS84)) { const actual = h.operations.get(id); assert(actual && actual.method === method && actual.template.replace(/\{[^}]+\}/g, '{id}') === expectedPath && Object.hasOwn(actual.spec.responses, String(status)), 'Canonical route/status changed:' + id); }
    await preserve('final-live-process-before-any-HTTP', await observeRuntime({ binarySha256: args.binarySha, productSources: authority.productSources }));
    const source = await parse(h.out + '/races73-context.json'), fixtures = (await parse(h.priv + '/actors33.json')).actors;
    await h.login(fixtures.full);
    const sessions = {}, actorKeys = { A: 'lateA84-' + tag, B: 'lateB84-' + tag }, c = await connect('rust');
    try {
        for (const side of ['A', 'B']) {
            const before = (await c.query('SELECT id::text FROM poms.auth_session WHERE user_id=$1', [fixtures.full.id])).rows.map(x => x.id);
            await h.login({ ...fixtures.full, key: actorKeys[side] });
            const added = (await c.query('SELECT id::text,user_id::text,status,row_version,last_seen_at FROM poms.auth_session WHERE user_id=$1', [fixtures.full.id])).rows.filter(x => !before.includes(x.id)); assert.equal(added.length, 1); sessions[side] = added[0];
        }
    } finally { await c.end(); }
    const sessionProof = await preserve('real-independent-auth-session-IDs', { userId: fixtures.full.id, actorKeys, sessions, onlyRealAPILogin: true });
    async function observeRuntime(fence) {
        const recordFile = h.priv + '/rust-api' + args.runtimeEdition + '-process.json', record = await parse(recordFile); assert(record.namespace === identity.namespace && record.port === 31341 && record.binarySha256 === fence.binarySha256);
        const proc = await fs.readFile(`/proc/${record.pid}/stat`, 'utf8'), fields = proc.slice(proc.lastIndexOf(')') + 2).split(' '); assert.equal(fields[19], record.startTime); assert.notEqual(fields[0], 'Z');
        const command = (await fs.readFile(`/proc/${record.pid}/cmdline`, 'utf8')).split('\0'); assert.equal(command[0], record.binary); const actualSHA = sha(await fs.readFile(`/proc/${record.pid}/exe`)); assert.equal(actualSHA, fence.binarySha256, 'Hash actual running executable, not a rebuilt disk pathname');
        const productSources = []; for (const pin of fence.productSources) { assert(PRODUCT_FILES84.includes(pin.file) && /^[0-9a-f]{64}$/.test(pin.rawBytesSha256)); const actual = sha(await fs.readFile(ROOT + '/' + pin.file)); assert.equal(actual, pin.rawBytesSha256, 'Final three-source working bytes changed'); productSources.push({ file: pin.file, rawBytesSha256: actual }); }
        return { namespace: record.namespace, pid: record.pid, port: record.port, startTime: record.startTime, binarySha256: actualSHA, binary: record.binary, productSources, alive: true, recordFile };
    }
    async function observeObject(location, meta) {
        assert(location.provider === 'local' && location.bucket === null && location.storageKey.startsWith(meta.keyPrefix + '/') && path.posix.normalize(location.storageKey) === location.storageKey && !path.posix.isAbsolute(location.storageKey));
        const root = STATE + '/objects/rust', file = root + '/' + location.storageKey; assert((await fs.realpath(root)) === root && (await fs.realpath(file)) === file);
        for (let p = root; p !== path.dirname(file);) { const remainder = path.relative(p, path.dirname(file)).split(path.sep)[0]; p = path.join(p, remainder); const stat = await fs.lstat(p); assert(stat.isDirectory() && !stat.isSymbolicLink()); }
        const before = await fs.lstat(file); assert(before.isFile() && !before.isSymbolicLink() && before.nlink === 1); const bytes = await fs.readFile(file), after = await fs.lstat(file); assert(before.dev === after.dev && before.ino === after.ino && after.size === bytes.length && before.size === after.size);
        const rawFile = privateRoot + '/object-' + String(++proofSequence).padStart(4, '0') + '.bin'; await fs.writeFile(rawFile, bytes, { flag: 'wx', mode: 0o600 });
        const body = { namespace: meta.namespace, instanceId: meta.instanceId, path: file, realPath: file, regular: true, symlink: false, parentSymlinks: false, nlink: 1, dev: String(after.dev), ino: String(after.ino), bytes: bytes.length, sha256: sha(bytes), rawOriginal: { file: rawFile, bytes: bytes.length, rawBytesSha256: sha(bytes) } }; return { body, ...(await preserve(meta.label, body)) };
    }
    const context = contextFromRaces73(source, { author: h.actor('full'), actorA: h.actor(actorKeys.A), actorB: h.actor(actorKeys.B), sessionProof: { receiptId: sessionProof.receiptId, userId: fixtures.full.id, A: sessions.A.id, B: sessions.B.id }, environment: { namespace: identity.namespace, instanceId: identity.marker, receiptId: ROOT + '/tmp/rust-r4def/root/environment21/provision01.json' }, runtimeFence: { finalRuntime: true, epoch: authority.epoch, binarySha256: args.binarySha, productSources: authority.productSources, authorityReceiptId: authorityPin.receiptId }, tag, legacyAttachmentId: '5151e346-59d4-4d3b-8254-ccaae6bd3699' });
    const runner = createLatePut84({ allowRootExecution: true, context, harness: h, connectOwner: connect, recordEvidence: preserve, observeObject, observeRuntime });
    await fs.writeFile(publicRoot + '/before84.json', JSON.stringify({ context: { projectId: context.projectId, legacyAttachmentId: context.legacyAttachmentId, projectProducerReceiptId: context.projectProducerReceiptId, runtimeFence: context.runtimeFence }, initial: runner.manifest() }, null, 2) + '\n', { flag: 'wx' });
    result = await runner.run();
} catch (e) { failure = { name: e.name }; await preserve('entry-failure-original', { name: e.name, message: e.message, stack: e.stack }); }
const receipt = { kind: 'actual-Root-late-put84-entry-receipt', result, failure, rawOriginalsOnlyInNewPrivate: true, G3Certified: false, G4Certified: false };
const bytes = Buffer.from(JSON.stringify(receipt, null, 2) + '\n'); await fs.writeFile(publicRoot + '/result84.json', bytes, { flag: 'wx' }); console.log(JSON.stringify({ receiptId: publicRoot + '/result84.json', rawBytesSha256: sha(bytes), complete: result?.complete ?? false, failure, infrastructureRestored: result?.infrastructureRestored ?? false })); if (!result?.complete) process.exitCode = 1;
