// Read-only support library. No top-level IO, argv/env discovery or execution.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ARCHIVE_AUTHORITY, E1_INPUTS } from './e1-registry01.mjs';

const ARCHIVE_PREFIX = 'docs/design/archive/slices/';
const SHA256 = /^[a-f0-9]{64}$/;

export class E1Error extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'E1Error';
        this.code = code;
    }
}

export function requireE1(condition, code, message) {
    if (!condition) throw new E1Error(code, message);
}

export function relativePath(file, canonical = false) {
    requireE1(typeof file === 'string' && file.length > 0, 'E1_UNSAFE_PATH', 'A relative file path is required');
    requireE1(!/[\\\0:]/.test(file) && !path.posix.isAbsolute(file) && !path.win32.isAbsolute(file), 'E1_UNSAFE_PATH', 'Absolute, drive, backslash or NUL paths are forbidden');
    requireE1(file.split('/').every(part => part !== '' && part !== '.' && part !== '..'), 'E1_UNSAFE_PATH', 'Empty and traversal path components are forbidden');
    if (canonical) requireE1(file.startsWith(ARCHIVE_PREFIX), 'E1_NOT_CANONICAL', 'Targets must be inside the canonical archive');
    return file;
}

export function normalizedPin(input, canonical = false) {
    requireE1(input && typeof input === 'object', 'E1_BAD_PIN', 'A complete pinned identity is required');
    const file = relativePath(input.file, canonical);
    requireE1(Number.isSafeInteger(input.bytes) && input.bytes >= 0, 'E1_BAD_PIN', 'Pin bytes must be a nonnegative safe integer');
    requireE1(typeof input.rawBytesSha256 === 'string' && SHA256.test(input.rawBytesSha256), 'E1_BAD_PIN', 'Pin SHA256 must be 64 lowercase hexadecimal characters');
    return Object.freeze({ file, bytes: input.bytes, rawBytesSha256: input.rawBytesSha256 });
}

export function verifyPinnedBytes(input, rawBytes) {
    const pin = normalizedPin(input);
    requireE1(Buffer.isBuffer(rawBytes) || rawBytes instanceof Uint8Array, 'E1_BAD_BYTES', 'Raw bytes must be a Buffer or Uint8Array');
    const bytes = Buffer.from(rawBytes);
    requireE1(bytes.length === pin.bytes, 'E1_CONTENT_MISMATCH', `Length mismatch: ${pin.file}`);
    requireE1(createHash('sha256').update(bytes).digest('hex') === pin.rawBytesSha256, 'E1_CONTENT_MISMATCH', `SHA256 mismatch: ${pin.file}`);
    return bytes;
}

const identity = pin => JSON.stringify([pin.file, pin.bytes, pin.rawBytesSha256]);

// Supports both recorded move schemas and the exact immutable snapshot schema.
// Same-identity snapshots override a move; competing targets at one rank fail.
export function buildArchiveIndex(authorityInputs) {
    requireE1(Array.isArray(authorityInputs) && authorityInputs.length > 0, 'E1_BAD_AUTHORITY', 'At least one pinned authority is required');
    const slots = new Map();
    const add = (input, target, kind, authority) => {
        const logical = normalizedPin(input);
        const canonical = normalizedPin(target, true);
        requireE1(logical.bytes === canonical.bytes && logical.rawBytesSha256 === canonical.rawBytesSha256, 'E1_MAP_CONFLICT', 'A relocation must preserve the complete raw identity');
        const key = identity(logical);
        const slot = slots.get(key) ?? { snapshot: null, move: null };
        const previous = slot[kind];
        requireE1(!previous || identity(previous.canonical) === identity(canonical), 'E1_MAP_CONFLICT', `Competing ${kind} targets: ${logical.file}`);
        slot[kind] = previous ?? Object.freeze({ logical, canonical, kind, authority });
        slots.set(key, slot);
    };
    for (const input of authorityInputs) {
        const authority = normalizedPin(input.pin, true);
        let map;
        try {
            map = JSON.parse(verifyPinnedBytes(authority, input.rawBytes).toString('utf8'));
        } catch (error) {
            if (error instanceof E1Error) throw error;
            throw new E1Error('E1_BAD_AUTHORITY', `Invalid JSON authority: ${authority.file}`);
        }
        requireE1(Array.isArray(map.records), 'E1_BAD_AUTHORITY', 'Authority records must be an array');
        for (const row of map.records) {
            if (row.source && row.destination) {
                add(row.source, row.destination, 'move', authority);
            } else {
                requireE1(typeof row.originalPath === 'string' && typeof row.archivePath === 'string', 'E1_BAD_AUTHORITY', 'Unrecognized move record');
                add({ file: row.originalPath, bytes: row.bytes, rawBytesSha256: row.rawBytesSha256 }, { file: row.archivePath, bytes: row.bytes, rawBytesSha256: row.rawBytesSha256 }, 'move', authority);
            }
        }
        requireE1(map.immutableInputSnapshots === undefined || Array.isArray(map.immutableInputSnapshots), 'E1_BAD_AUTHORITY', 'Immutable snapshots must be an array');
        for (const row of map.immutableInputSnapshots ?? []) add(row.original, row.snapshot, 'snapshot', authority);
    }
    return Object.freeze({
        identities: slots.size,
        resolve(input) {
            const pin = normalizedPin(input);
            const slot = slots.get(identity(pin));
            requireE1(Boolean(slot), 'E1_UNKNOWN_PIN', `Unregistered historical identity: ${pin.file}`);
            return slot.snapshot ?? slot.move;
        },
    });
}

function ownedPath(repositoryRoot, file) {
    requireE1(typeof repositoryRoot === 'string' && path.isAbsolute(repositoryRoot), 'E1_BAD_ROOT', 'Root supplies an explicit absolute repositoryRoot');
    const root = fs.realpathSync(repositoryRoot);
    const candidate = path.resolve(root, ...relativePath(file).split('/'));
    const relative = path.relative(root, candidate);
    requireE1(relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative), 'E1_UNSAFE_PATH', 'Resolved path leaves the supplied repository');
    return { root, candidate };
}

function requireRegularParents(root, file) {
    const parts = file.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i += 1) {
        current = path.join(current, parts[i]);
        const stat = fs.lstatSync(current);
        requireE1(!stat.isSymbolicLink(), 'E1_UNSAFE_PATH', 'Symlink/junction archive components are forbidden');
        requireE1(i === parts.length - 1 ? stat.isFile() : stat.isDirectory(), 'E1_NOT_REGULAR', 'Archive target must be a regular file through directories');
    }
}

export function readCanonicalPin(repositoryRoot, input) {
    const pin = normalizedPin(input, true);
    const { root, candidate } = ownedPath(repositoryRoot, pin.file);
    requireRegularParents(root, pin.file);
    const descriptor = fs.openSync(candidate, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    try {
        const before = fs.fstatSync(descriptor);
        requireE1(before.isFile() && before.size === pin.bytes, 'E1_CONTENT_MISMATCH', `Non-file or length mismatch: ${pin.file}`);
        const bytes = verifyPinnedBytes(pin, fs.readFileSync(descriptor));
        const after = fs.fstatSync(descriptor);
        requireE1(before.dev === after.dev && before.ino === after.ino && before.size === after.size && before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs, 'E1_SOURCE_CHANGED', 'Archive source changed during the read');
        requireRegularParents(root, pin.file);
        const named = fs.lstatSync(candidate);
        requireE1(named.dev === after.dev && named.ino === after.ino, 'E1_SOURCE_CHANGED', 'Archive path changed during the read');
        return bytes;
    } finally {
        fs.closeSync(descriptor);
    }
}

// Called only by Root. Importing the module does not construct a resolver.
export function createE1Resolver({ repositoryRoot } = {}) {
    const authorityBytes = readCanonicalPin(repositoryRoot, ARCHIVE_AUTHORITY);
    const index = buildArchiveIndex([{ pin: ARCHIVE_AUTHORITY, rawBytes: authorityBytes }]);
    const read = input => {
        const resolved = index.resolve(input);
        return { ...resolved, rawBytes: readCanonicalPin(repositoryRoot, resolved.canonical) };
    };
    return Object.freeze({
        authority: ARCHIVE_AUTHORITY,
        registeredIdentities: index.identities,
        resolve: input => index.resolve(input),
        read,
        readJSON(input) {
            const resolved = read(input);
            try {
                return { ...resolved, value: JSON.parse(resolved.rawBytes.toString('utf8')) };
            } catch (error) {
                if (error instanceof E1Error) throw error;
                throw new E1Error('E1_BAD_JSON', `Invalid pinned JSON: ${resolved.canonical.file}`);
            }
        },
        aliasesAbsent() {
            const states = Object.values(E1_INPUTS).map(pin => {
                const { root, candidate } = ownedPath(repositoryRoot, pin.file);
                const relative = path.relative(root, path.dirname(candidate));
                let current = root;
                for (const part of relative.split(path.sep).filter(Boolean)) {
                    current = path.join(current, part);
                    try {
                        const stat = fs.lstatSync(current);
                        requireE1(!stat.isSymbolicLink() && stat.isDirectory(), 'E1_UNSAFE_PATH', 'Alias parent must not be a link or non-directory');
                    } catch (error) {
                        if (error.code === 'ENOENT') return { logical: pin, absent: true };
                        throw error;
                    }
                }
                try {
                    fs.lstatSync(candidate);
                    return { logical: pin, absent: false };
                } catch (error) {
                    if (error.code === 'ENOENT') return { logical: pin, absent: true };
                    throw error;
                }
            });
            return { allAbsent: states.every(row => row.absent), states };
        },
    });
}
