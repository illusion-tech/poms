// Read only explicit, raw-byte-pinned repository sources. No import/eval of an
// input, no private/environment lookup, and no runtime-tree discovery.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SHA256 = /^[0-9a-f]{64}$/;
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const copy = (value) => JSON.parse(JSON.stringify(value));
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, stable(child)])) : value;

export function sourcePath(value) {
    assert(typeof value === 'string' && value.length > 0 && !value.includes('\\') && !value.includes('\0'), 'Source path must be relative slash-separated text');
    assert(!path.posix.isAbsolute(value) && !/^[a-z]:/i.test(value), 'Absolute source path refused');
    const parts = value.split('/');
    assert(parts.every((part) => part && part !== '.' && part !== '..'), 'Ambiguous source path refused');
    assert(!parts.some((part) => /^(?:private|\.git|node_modules|target)$/i.test(part) || /^\.env(?:\.|$)/i.test(part)), 'Private, environment, dependency or build tree refused');
    assert(!value.startsWith('tmp/'), 'Runtime trees are not SourceReader inputs');
    return value;
}

function contained(root, target) {
    const relative = path.relative(root, target);
    return relative !== '' && !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative);
}

export class SourceReader {
    #root;
    #pins;
    #reads = new Map();

    constructor({ root, pins, sourceEpoch }) {
        assert(typeof sourceEpoch === 'string' && sourceEpoch.length > 0, 'Explicit source epoch required');
        assert(Array.isArray(pins) && pins.length > 0, 'Explicit source pins required');
        this.#root = fs.realpathSync(root);
        assert(fs.statSync(this.#root).isDirectory(), 'Source root must be a directory');
        this.#pins = new Map();
        for (const pin of pins) {
            const file = sourcePath(pin.file);
            assert(SHA256.test(pin.rawBytesSha256 ?? pin.sha256 ?? ''), 'Raw-byte SHA256 pin required: ' + file);
            assert(!this.#pins.has(file), 'Duplicate source pin: ' + file);
            if (pin.normalizedLfSha256 !== undefined) assert(SHA256.test(pin.normalizedLfSha256), 'Invalid LF pin');
            this.#pins.set(file, { file, rawBytesSha256: pin.rawBytesSha256 ?? pin.sha256, ...(pin.normalizedLfSha256 ? { normalizedLfSha256: pin.normalizedLfSha256 } : {}), ...(pin.bytes === undefined ? {} : { bytes: pin.bytes }) });
        }
        this.sourceEpoch = sourceEpoch;
        Object.freeze(this);
    }

    read(file) {
        sourcePath(file);
        const pin = this.#pins.get(file);
        assert(pin, 'Unpinned source refused: ' + file);
        let current = this.#root;
        for (const part of file.split('/')) {
            current = path.join(current, part);
            assert(!fs.lstatSync(current).isSymbolicLink(), 'Source symlink refused: ' + file);
        }
        const actual = fs.realpathSync(current);
        assert(contained(this.#root, actual) && fs.statSync(actual).isFile(), 'Source root escape or non-regular file refused');
        const bytes = fs.readFileSync(actual), rawBytesSha256 = digest(bytes);
        assert.equal(rawBytesSha256, pin.rawBytesSha256, 'Raw source changed: ' + file);
        if (pin.bytes !== undefined) assert.equal(bytes.length, pin.bytes, 'Source byte length changed: ' + file);
        // TextDecoder preserves no hidden normalization: the BOM is retained,
        // and only literal CRLF becomes LF for the optional secondary digest.
        let normalized = {};
        if (pin.normalizedLfSha256) {
            const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
            const normalizedLfSha256 = digest(Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8'));
            assert.equal(normalizedLfSha256, pin.normalizedLfSha256, 'LF source changed: ' + file);
            normalized = { normalizedLfSha256 };
        }
        this.#reads.set(file, { file, bytes: bytes.length, rawBytesSha256, ...normalized });
        return Buffer.from(bytes);
    }

    text(file) { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(this.read(file)); }
    json(file) { return JSON.parse(this.text(file)); }
    receipt() {
        const files = [...this.#reads.values()].sort((a, b) => a.file.localeCompare(b.file));
        return { kind: 'r2m-pinned-source-read', sourceEpoch: this.sourceEpoch, files: copy(files), digest: digest(Buffer.from(JSON.stringify(stable(files)))), privateRead: false, inputExecuted: false };
    }
    assertUnchanged() {
        const before = this.receipt();
        for (const file of this.#reads.keys()) this.read(file);
        assert.deepEqual(this.receipt(), before, 'Previously read source changed');
        return before;
    }
}

export function verifySourceCap(cap, { candidate, files = null } = {}) {
    assert(cap && cap.kind === 'r2m-source-cap' && cap.complete === true && cap.privateCopied === false, 'Complete current public source cap required');
    assert(/^[0-9a-f]{40}$/.test(cap.candidate ?? '') && (!candidate || cap.candidate === candidate), 'Candidate source-cap mismatch');
    assert(typeof cap.id === 'string' && SHA256.test(cap.manifestSha256 ?? ''), 'Cap identity/hash missing');
    assert(Array.isArray(cap.files) && cap.files.length > 0 && new Set(cap.files.map((item) => item.file)).size === cap.files.length, 'Cap source list missing or duplicated');
    for (const row of cap.files) { sourcePath(row.file); assert(SHA256.test(row.rawBytesSha256 ?? '') && Number.isSafeInteger(row.bytes) && row.bytes >= 0, 'Cap raw source hash/length missing'); }
    if (files) for (const file of files) assert(cap.files.some((row) => row.file === file), 'Source omitted from cap: ' + file);
    const canonicalFiles = cap.files.map(({ file, bytes, rawBytesSha256 }) => ({ file, bytes, rawBytesSha256 })).sort((a, b) => a.file.localeCompare(b.file));
    assert.equal(digest(Buffer.from(JSON.stringify(stable(canonicalFiles)))), cap.manifestSha256, 'Source-cap manifest digest mismatch');
    assert(Array.isArray(cap.artifacts) && cap.artifacts.length > 0, 'Exact executable artifact identities required');
    for (const artifact of cap.artifacts) assert(['native-main', 'rust-release', 'rust-internal-probe', 'ui-build'].includes(artifact.kind) && SHA256.test(artifact.rawBytesSha256 ?? '') && Number.isSafeInteger(artifact.bytes) && artifact.bytes > 0, 'Invalid source-cap artifact');
    return { capId: cap.id, candidate: cap.candidate, manifestSha256: cap.manifestSha256, files: cap.files.length, artifacts: cap.artifacts.map(({ kind, bytes, rawBytesSha256 }) => ({ kind, bytes, rawBytesSha256 })) };
}

export function sourceCapDigest(files) {
    return digest(Buffer.from(JSON.stringify(stable(files.map(({ file, bytes, rawBytesSha256 }) => ({ file: sourcePath(file), bytes, rawBytesSha256 })).sort((a, b) => a.file.localeCompare(b.file))))));
}
