// Root-invoked local object proof; cloud peers remain separately owner-certified.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { selectId } from './fixture-references.mjs';
import { sameIdentity } from './fixture-core.mjs';

export function objectPath(fixture, key) {
    assert.equal(process.platform, 'linux');
    assert(['nest', 'rust'].includes(fixture.backend));
    const prefix = 'poms-r2m/' + fixture.runId + '/';
    assert(typeof key === 'string' && key.startsWith(prefix) && !key.includes('\\') && !key.split('/').some(part => !part || part === '.' || part === '..'));
    const root = '/home/wangzishi/.local/share/poms-r2m/objects/' + fixture.backend + '/server01';
    const file = path.resolve(root, key); assert(file.startsWith(root + '/poms-r2m/' + fixture.runId + '/'));
    for (let directory = root; directory !== path.dirname(file);) {
        const relative = path.relative(directory, path.dirname(file)).split(path.sep)[0];
        let stat;
        try { stat = fs.lstatSync(directory); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        if (stat) assert(stat.isDirectory() && !stat.isSymbolicLink(), 'Object parent symlink/type');
        if (!relative) break;
        directory = path.join(directory, relative);
    }
    let finalParent;
    try { finalParent = fs.lstatSync(path.dirname(file)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (finalParent) assert(finalParent.isDirectory() && !finalParent.isSymbolicLink(), 'Object final parent symlink/type');
    return { root, file, prefix: path.join(root, 'poms-r2m', fixture.runId) };
}
function regularDigest(file) {
    const before = fs.lstatSync(file, { bigint: true }); assert(before.isFile() && !before.isSymbolicLink() && before.nlink === 1n);
    const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    try {
        const opened = fs.fstatSync(fd, { bigint: true }); assert.equal(opened.ino, before.ino); assert.equal(opened.dev, before.dev);
        const bytes = fs.readFileSync(fd), after = fs.fstatSync(fd, { bigint: true });
        for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(opened[key], after[key]);
        return { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    } finally { fs.closeSync(fd); }
}
export function planObjectPrefix(fixture) {
    assert(!fixture.j.writerDrain && !fixture.j.localObjects);
    const { root, prefix } = objectPath(fixture, 'poms-r2m/' + fixture.runId + '/planned');
    const rootStat = fs.lstatSync(root); assert(rootStat.isDirectory() && !rootStat.isSymbolicLink());
    const parent = path.dirname(prefix);
    if (fs.existsSync(parent)) { const stat = fs.lstatSync(parent); assert(stat.isDirectory() && !stat.isSymbolicLink()); }
    let present;
    try { present = fs.lstatSync(prefix); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    assert(!present, 'Run object prefix must be absent before any producer');
    fixture.j.localObjects = { root, prefix, beforePrefixAbsent: true, files: [] }; fixture.save();
    return { keyPrefix: 'poms-r2m/' + fixture.runId, beforePrefixAbsent: true };
}
export async function certifyLocalObject(fixture, table, id, key) {
    assert(!fixture.j.writerDrain && fixture.j.localObjects?.beforePrefixAbsent);
    assert(['attachment', 'attachment_upload_session', 'attachment_download_package'].includes(table));
    const object = fixture.j.objects.find(item => item.table === table && item.id === id); assert(object?.creationProof && object.postcondition?.independentlyVisible);
    const actual = await selectId(fixture.client, table, id); assert(actual && sameIdentity(table, actual.row, object.identity));
    assert.equal(actual.row.storage_key, key); assert.equal(actual.row.storage_provider ?? actual.row.provider_type, 'local');
    const { file, prefix } = objectPath(fixture, key); assert.equal(prefix, fixture.j.localObjects.prefix);
    const proof = { table, id, key, file, ...regularDigest(file), actualRowStorageKeyConfirmed: true };
    const previous = fixture.j.localObjects.files.find(item => item.key === key);
    if (previous) { assert.equal(previous.sha256, proof.sha256); assert.equal(previous.bytes, proof.bytes); }
    else fixture.j.localObjects.files.push(proof);
    fixture.save(); return { key, bytes: proof.bytes, sha256: proof.sha256 };
}
export function preflightLocalObjects(fixture) {
    fixture.assertDrained(); const ledger = fixture.j.localObjects;
    if (!ledger) return { proof: [], directories: [], observed: false };
    assert(ledger.beforePrefixAbsent); const directories = [], files = [];
    const walk = directory => {
        const stat = fs.lstatSync(directory); assert(stat.isDirectory() && !stat.isSymbolicLink()); directories.push(directory);
        for (const name of fs.readdirSync(directory)) {
            const file = path.join(directory, name), item = fs.lstatSync(file); assert(!item.isSymbolicLink());
            if (item.isDirectory()) walk(file); else { assert(item.isFile()); files.push(file); }
        }
    };
    let prefixStat;
    try { prefixStat = fs.lstatSync(ledger.prefix); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (prefixStat) walk(ledger.prefix);
    const proof = files.map(file => { const expected = ledger.files.find(item => item.file === file); assert(expected, 'Uncertified object remains; never adopt by directory match'); const actual = regularDigest(file); assert.equal(actual.sha256, expected.sha256); assert.equal(actual.bytes, expected.bytes); return { file, ...actual }; });
    return { proof, directories, observed: true };
}
export function cleanupLocalObjects(fixture) {
    const { proof, directories, observed } = preflightLocalObjects(fixture), ledger = fixture.j.localObjects;
    for (const item of proof) fs.unlinkSync(item.file);
    for (const directory of directories.reverse()) { assert.equal(fs.readdirSync(directory).length, 0); fs.rmdirSync(directory); }
    return { matched: proof.length, changed: proof.length, observed, exactKeys: proof.map(item => ledger.files.find(entry => entry.file === item.file).key) };
}
