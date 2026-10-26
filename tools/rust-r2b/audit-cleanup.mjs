import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, fsyncSync, lstatSync, openSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createConnection } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { sourceHead, validateAmbient, validateSource } from './fixture-guard.mjs';
import { validateJournal as validateRunJournal } from './fixture-journal.mjs';
import { validateJournal as validateLeaseJournal } from './system-lease-model.mjs';

const require = createRequire(import.meta.url);
const { invokeFixture } = require('./invoke-fixture.cjs');
const privateRoot = '/r2b-private';
const root = path.resolve(import.meta.dirname, '../..');
const receiptPath = '/r2b-private/audit-cleanup.json';
const ports = Object.freeze([5100, 5101, 5200]);
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const recordName = new RegExp('^(nest|rust)-(' + uuid + ')\\.json$');
const pointerName = /^(nest|rust)-active\.json$/;
const maximumInventoryBytes = 64 * 1024 * 1024;
const sourceDirectories = Object.freeze([
    'apps/poms-api/src', 'libs/api/contracts/src', 'libs/shared/contracts/src',
    'apps/poms-api-rust/src', 'apps/poms-api-rust/tests', 'tools/rust-r2b', 'tools/e2e'
]);
const sourceFiles = Object.freeze(['package.json', 'pnpm-lock.yaml', 'apps/poms-api-rust/Cargo.toml', 'apps/poms-api-rust/Cargo.lock']);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
function refuse(code = 'audit_cleanup_invalid_inventory') { throw new Error(code); }
function exact(value, keys) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== keys) refuse();
}
function json(bytes) {
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { refuse(); }
}
function privateDirectory(directory) {
    const stat = lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) refuse('audit_cleanup_directory');
}
function readRegular(file, limit, privateFile = false) {
    const before = lstatSync(file);
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || before.size > limit ||
        (privateFile && (before.mode & 0o077) !== 0)) refuse('audit_cleanup_file');
    const fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
        const opened = fstatSync(fd);
        if (opened.dev !== before.dev || opened.ino !== before.ino || !opened.isFile()) refuse('audit_cleanup_file');
        const bytes = readFileSync(fd);
        const after = fstatSync(fd);
        if (bytes.length !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs || bytes.length > limit) refuse('audit_cleanup_file_changed');
        return { mode: before.mode & 0o777, bytes };
    } finally { closeSync(fd); }
}
function sortEntries(entries) { return entries.sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0); }
function captureJournals() {
    privateDirectory(privateRoot);
    const entries = [];
    let total = 0;
    for (const directory of ['runs', 'system-leases']) {
        const location = path.join(privateRoot, directory);
        privateDirectory(location);
        const names = readdirSync(location);
        if (names.length === 0 || names.length > (directory === 'runs' ? 128 : 256)) refuse('audit_cleanup_inventory_size');
        for (const name of names) {
            if (!recordName.test(name) && !(directory === 'system-leases' && pointerName.test(name))) refuse('audit_cleanup_unknown_file');
            const limit = directory === 'runs' ? 16384 : pointerName.test(name) ? 256 : 2 * 1024 * 1024;
            const file = readRegular(path.join(location, name), limit, true);
            total += file.bytes.length;
            if (total > maximumInventoryBytes) refuse('audit_cleanup_inventory_size');
            entries.push({ key: directory + '/' + name, directory, name, ...file });
        }
    }
    return sortEntries(entries);
}
function captureSources() {
    const entries = [];
    let total = 0;
    function add(relative) {
        const file = readRegular(path.join(root, relative), maximumInventoryBytes);
        total += file.bytes.length;
        if (total > maximumInventoryBytes || entries.length >= 4096) refuse('audit_cleanup_source_size');
        entries.push({ key: relative, ...file });
    }
    function walk(relative) {
        const directory = path.join(root, relative);
        const stat = lstatSync(directory);
        if (!stat.isDirectory() || stat.isSymbolicLink()) refuse('audit_cleanup_source_directory');
        for (const name of readdirSync(directory)) {
            const next = relative + '/' + name;
            const stat = lstatSync(path.join(root, next));
            if (stat.isSymbolicLink()) refuse('audit_cleanup_source_file');
            if (stat.isDirectory()) walk(next); else add(next);
        }
    }
    for (const directory of sourceDirectories) walk(directory);
    for (const file of sourceFiles) add(file);
    return sortEntries(entries);
}
function snapshot() { return { journals: captureJournals(), sources: captureSources() }; }

// Pure validation accepts already-read bytes only. The CLI has no path, DB,
// backend, run, SQL or validation-override arguments.
export function inspectInventory(entries) {
    if (!Array.isArray(entries) || entries.length === 0 || entries.length > 384) refuse();
    const seen = new Set(), runs = new Map(), leases = new Map(), pointers = new Map();
    let total = 0;
    for (const entry of entries) {
        if (!entry || !['runs', 'system-leases'].includes(entry.directory) || typeof entry.name !== 'string' ||
            entry.key !== entry.directory + '/' + entry.name || !Buffer.isBuffer(entry.bytes) ||
            !Number.isSafeInteger(entry.mode) || (entry.mode & 0o077) !== 0 || seen.has(entry.key)) refuse();
        seen.add(entry.key); total += entry.bytes.length;
        if (total > maximumInventoryBytes) refuse();
        const record = recordName.exec(entry.name);
        const pointer = pointerName.exec(entry.name);
        if (entry.directory === 'runs') {
            if (!record || entry.bytes.length > 16384) refuse();
            const [, backend, runId] = record;
            const value = validateRunJournal(json(entry.bytes), { backend, runId });
            if (value.state !== 'cleaned') refuse('audit_cleanup_run_not_cleaned');
            runs.set(backend + ':' + runId, { backend, runId, value, sha256: sha256(entry.bytes) });
        } else if (pointer) {
            if (entry.bytes.length > 256) refuse();
            const value = json(entry.bytes);
            exact(value, 'backend,formatVersion,leaseId');
            if (value.formatVersion !== 1 || value.backend !== pointer[1] || typeof value.leaseId !== 'string' || !new RegExp('^' + uuid + '$').test(value.leaseId)) refuse();
            pointers.set(value.backend, { ...value, sha256: sha256(entry.bytes) });
        } else {
            if (!record || entry.bytes.length > 2 * 1024 * 1024) refuse();
            const [, backend, leaseId] = record;
            const value = validateLeaseJournal(json(entry.bytes), backend);
            if (value.leaseId !== leaseId || value.state !== 'restored' || value.pending !== null) refuse('audit_cleanup_lease_not_restored');
            if (new Set(value.completed.map((item) => item.auditId)).size !== value.completed.length) refuse();
            for (const item of value.completed) {
                const audit = value.authorized.audits.find((row) => row.id === item.auditId);
                if (!audit || audit.operator_id !== value.actorId) refuse();
            }
            leases.set(backend + ':' + leaseId, { backend, leaseId, value, sha256: sha256(entry.bytes) });
        }
    }
    for (const backend of ['nest', 'rust']) {
        if (![...runs.values()].some((run) => run.backend === backend) || !pointers.has(backend)) refuse('audit_cleanup_missing_backend');
        const pointer = pointers.get(backend);
        if (!leases.has(backend + ':' + pointer.leaseId)) refuse('audit_cleanup_pointer');
    }
    for (const lease of leases.values()) {
        const ordinary = runs.get(lease.backend + ':' + lease.value.runId);
        if (!ordinary || ordinary.value.accounts[0].userId !== lease.value.actorId) refuse('audit_cleanup_lease_origin');
    }
    return {
        runs: [...runs.values()].map((run) => ({ backend: run.backend, runId: run.runId, sha256: run.sha256 })).sort((left, right) => (left.backend + left.runId).localeCompare(right.backend + right.runId)),
        leases: [...leases.values()].map(({ value, ...safe }) => ({ ...safe, runId: value.runId, sourceHead: value.sourceHead, state: value.state })),
        pointers: [...pointers.values()]
    };
}
function fingerprint(entries) {
    return sha256(JSON.stringify(entries.map((entry) => ({ key: entry.key, mode: entry.mode, size: entry.bytes.length, sha256: sha256(entry.bytes) }))));
}
function unchanged(before, after) {
    for (const collection of ['journals', 'sources']) {
        if (before[collection].length !== after[collection].length) refuse('audit_cleanup_input_changed');
        for (let index = 0; index < before[collection].length; index++) {
            const first = before[collection][index], second = after[collection][index];
            if (first.key !== second.key || first.mode !== second.mode || !first.bytes.equals(second.bytes)) refuse('audit_cleanup_input_changed');
        }
    }
}
function closedPort(port) {
    return new Promise((resolve) => {
        const socket = createConnection({ host: '127.0.0.1', port });
        let finished = false;
        function done(closed) { if (!finished) { finished = true; socket.destroy(); resolve(closed); } }
        socket.on('connect', () => done(false));
        socket.on('error', (error) => done(error.code === 'ECONNREFUSED'));
        socket.setTimeout(1500, () => done(false));
    });
}
export async function assertPortsClosed(probe = closedPort) {
    const results = await Promise.all(ports.map(async (port) => ({ port, closed: await probe(port) })));
    if (results.some((result) => result.closed !== true)) refuse('audit_cleanup_listener');
    return results;
}
function zeroResult(value, run) {
    exact(value, 'action,backend,changed,formatVersion,matched,runId,state');
    if (value.formatVersion !== 1 || value.backend !== run.backend || value.runId !== run.runId || value.action !== 'cleanup' ||
        value.state !== 'cleaned' || value.matched !== 0 || value.changed !== 0) refuse('audit_cleanup_not_zero');
    return value;
}
// Dependency seams are for pure state-machine tests. Real execution below
// always supplies the fixed readers, loopback ports and reviewed fixture CLI.
export async function auditRegisteredRuns(adapter) {
    const before = adapter.snapshot();
    if (!Array.isArray(before.sources) || before.sources.length === 0) refuse('audit_cleanup_source_size');
    const inventory = inspectInventory(before.journals);
    await adapter.ports();
    const results = [];
    for (const run of inventory.runs) {
        unchanged(before, adapter.snapshot());
        await adapter.ports();
        const result = await adapter.cleanup({ formatVersion: 1, runId: run.runId, backend: run.backend, action: 'cleanup', account: 'none' });
        results.push(zeroResult(result, run));
        unchanged(before, adapter.snapshot());
    }
    await adapter.ports();
    const after = adapter.snapshot();
    unchanged(before, after);
    if (!isDeepStrictEqual(inventory, inspectInventory(after.journals))) refuse('audit_cleanup_input_changed');
    return {
        formatVersion: 1, result: 'pass', sourceHead,
        ports: { host: '127.0.0.1', namespace: 'current controlled container network namespace', checked: ports, allClosed: true },
        source: { files: before.sources.length, beforeSha256: fingerprint(before.sources), afterSha256: fingerprint(after.sources), bytesUnchanged: true },
        journals: { files: before.journals.length, beforeSha256: fingerprint(before.journals), afterSha256: fingerprint(after.journals), directoryListingAndBytesUnchanged: true },
        inventory, cleanups: results
    };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    let fd;
    let report = { formatVersion: 1, result: 'fail', sourceHead, startedAt: new Date().toISOString() };
    try {
        if (process.platform !== 'linux' || process.argv.length !== 2 || root !== '/workspace' || process.cwd() !== root) refuse('audit_cleanup_invocation');
        validateAmbient(process.env); validateSource();
        privateDirectory(privateRoot);
        fd = openSync(receiptPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
        report = { ...report, ...await auditRegisteredRuns({ snapshot, ports: () => assertPortsClosed(), cleanup: invokeFixture }) };
    } catch (error) {
        report.result = 'fail';
        report.code = typeof error.message === 'string' && /^audit_cleanup_[a-z_]+$/.test(error.message) ? error.message : 'audit_cleanup_failed';
        process.exitCode = 1;
    } finally {
        report.finishedAt = new Date().toISOString();
        if (fd !== undefined) {
            try {
                writeFileSync(fd, JSON.stringify(report, null, 2) + '\n'); fsyncSync(fd);
                const directory = openSync(privateRoot, constants.O_RDONLY);
                try { fsyncSync(directory); } finally { closeSync(directory); }
            } catch {
                report.result = 'fail'; report.code = 'audit_cleanup_receipt'; process.exitCode = 1;
            } finally {
                try { closeSync(fd); } catch { report.result = 'fail'; report.code = 'audit_cleanup_receipt'; process.exitCode = 1; }
            }
        }
    }
    console.log(JSON.stringify({ formatVersion: 1, result: report.result, code: report.code, registeredRuns: report.cleanups?.length, journalBytesUnchanged: report.journals?.directoryListingAndBytesUnchanged }));
}
