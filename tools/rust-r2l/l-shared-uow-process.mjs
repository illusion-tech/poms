// SOURCE-only direct-ELF owner for Root's controlled example. Import is pure.
// No private environment is read here; the caller supplies its presealed copy.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';

export const UOW_ROOT = '/home/wangzishi/projects/poms-rust-r2l';
export const UOW_PRIVATE = '/home/wangzishi/.local/share/poms-r2l/private';
export const UOW_PROBE = '/home/wangzishi/.local/share/poms-r2l/target/release/examples/l_shared_uow_probe';
export const UOW_PROBE_BINDING = 'tmp/rust-r2l/shared-uow-candidate08-binary-source.json';
export const UOW_PROBE_BINDING_SHA256 = '02ce51e544c48ef594f7632bc75685047af821d6c530bf56ded1caffcd742407';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function privateDirectory(directory) {
    assert(directory === UOW_PRIVATE || directory.startsWith(UOW_PRIVATE + '/'));
    let current = UOW_PRIVATE;
    for (const component of directory.slice(UOW_PRIVATE.length).split('/').filter(Boolean)) {
        assert(/^[a-zA-Z0-9_.-]+$/.test(component));
        const parent = fs.lstatSync(current);
        assert(parent.isDirectory() && !parent.isSymbolicLink() && (parent.mode & 0o077) === 0);
        current = path.join(current, component);
        if (!fs.existsSync(current)) fs.mkdirSync(current, { mode: 0o700 });
    }
    const stat = fs.lstatSync(directory);
    assert(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0);
}
export function writePrivate(file, value, first = false) {
    privateDirectory(path.dirname(file));
    if (!first) {
        const stat = fs.lstatSync(file);
        assert(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0);
    }
    const temporary = first ? file : file + '.' + randomUUID() + '.tmp';
    const fd = fs.openSync(temporary, 'wx', 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(value) + '\n'); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    if (!first) fs.renameSync(temporary, file);
    const directory = fs.openSync(path.dirname(file), 'r');
    try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
}
export function privateBytes(file, bytes) {
    assert(Buffer.isBuffer(bytes)); privateDirectory(path.dirname(file));
    const fd = fs.openSync(file, 'wx', 0o600);
    try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    const directory = fs.openSync(path.dirname(file), 'r');
    try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
    return bytesReceipt(file);
}
export function bytesReceipt(file) {
    const stat = fs.lstatSync(file);
    assert(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0);
    return { file, bytes: stat.size, rawBytesSha256: hash(fs.readFileSync(file)), contentsExported: false };
}
function publicSource(file) {
    assert(typeof file === 'string' && !path.isAbsolute(file) && !file.includes('\\'));
    assert(!file.split('/').some(part => !part || part === '..' || part === '.' || /^(?:private|secrets|node_modules|\.git)$/i.test(part)));
    assert(!/(?:^|\/)[^/]*\.env(?:\.|$)/i.test(file));
    const absolute = path.resolve(UOW_ROOT, file);
    assert(absolute.startsWith(UOW_ROOT + '/'));
    const stat = fs.lstatSync(absolute); assert(stat.isFile() && !stat.isSymbolicLink());
    return absolute;
}
export function probeBuildBinding({ file, expectedSha256, mainBinding }) {
    assert.equal(process.platform, 'linux'); assert.equal(process.cwd(), UOW_ROOT);
    assert.equal(file, UOW_PROBE_BINDING); assert.equal(expectedSha256, UOW_PROBE_BINDING_SHA256);
    const raw = fs.readFileSync(publicSource(file)); assert.equal(hash(raw), expectedSha256);
    const binding = JSON.parse(raw);
    assert.equal(binding.result, 'pass-validation-example-build-binding-not-runtime');
    assert.equal(binding.tag, 'candidate08'); assert.equal(binding.binary.file, UOW_PROBE);
    assert.equal(binding.productHttpApiAdded, false); assert.equal(binding.runtimeExecuted, false);
    assert.equal(binding.binary.bytes, 11702064);
    assert.equal(binding.binary.rawBytesSha256, '6ca1076b38f3e15d99d371da0b6da520a5a24860d271a6aa3190305bcb527dd5');
    assert.equal(mainBinding.file, 'tmp/rust-r2l/rust-candidate08-binary-source.json');
    assert.equal(mainBinding.rawBytesSha256, 'f9c79ee04f593645715e48f680236dc4c807d64bca63dacdf5e8f4bfecbe7dbb');
    assert.deepEqual(binding.successfulFiveStepBuildBinding, { file: mainBinding.file, rawBytesSha256: mainBinding.rawBytesSha256 });
    const mainRaw = fs.readFileSync(publicSource(mainBinding.file));
    assert.equal(hash(mainRaw), mainBinding.rawBytesSha256);
    const main = JSON.parse(mainRaw);
    assert.equal(main.result, 'pass-build-source-binding-not-runtime');
    assert.deepEqual(binding.mainApplication, main.binary);
    assert(Array.isArray(main.files) && main.files.length === 169 && main.files.length === mainBinding.sourceFiles);
    assert.equal(binding.source.file, 'tools/rust-r2l/l-shared-uow-probe.rs');
    const source = main.files.filter(row => row.file === binding.source.file); assert.equal(source.length, 1);
    assert.deepEqual(binding.source, source[0], 'The example source row must exactly equal the actual candidate08 source row');
    assert.equal(fs.statSync(publicSource(binding.source.file)).size, binding.source.bytes);
    assert(main.files.some(row => row.file === 'apps/poms-api-rust/Cargo.toml'));
    for (const row of main.files) assert.equal(hash(fs.readFileSync(publicSource(row.file))), row.rawBytesSha256, row.file);
    verifyElf(binding.binary);
    return Object.freeze({ file, rawBytesSha256: expectedSha256, binary: Object.freeze({ ...binding.binary }),
        successfulFiveStepBuildBinding: Object.freeze({ ...binding.successfulFiveStepBuildBinding }), sourceFiles: main.files.length,
        probeSource: Object.freeze({ ...binding.source }) });
}
function verifyElf(binary) {
    assert.equal(binary.file, UOW_PROBE);
    const stat = fs.lstatSync(binary.file);
    assert(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o111) !== 0);
    const bytes = fs.readFileSync(binary.file);
    assert.equal(bytes.length, binary.bytes); assert.equal(hash(bytes), binary.rawBytesSha256);
    assert(bytes.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])), 'Execute the real ELF, never a shell/transport wrapper');
}
export function parseLinuxStat(raw) {
    const close = raw.lastIndexOf(')');
    assert(close > 0);
    const pid = Number(raw.slice(0, raw.indexOf(' '))), fields = raw.slice(close + 2).trim().split(/\s+/);
    assert(Number.isSafeInteger(pid) && pid > 1 && fields.length > 19 && /^[0-9]+$/.test(fields[19]));
    return { pid, parentPid: Number(fields[1]), state: fields[0], startTicks: fields[19] };
}
function actualIdentity(pid, binary) {
    const identity = parseLinuxStat(fs.readFileSync('/proc/' + pid + '/stat', 'utf8'));
    assert.equal(identity.pid, pid); assert.equal(identity.parentPid, process.pid);
    assert.equal(fs.realpathSync('/proc/' + pid + '/exe'), fs.realpathSync(binary.file));
    assert.equal(hash(fs.readFileSync('/proc/' + pid + '/exe')), binary.rawBytesSha256);
    assert.deepEqual(fs.readFileSync('/proc/' + pid + '/cmdline').toString('utf8').split('\0').filter(Boolean), [binary.file]);
    return { pid, parentPid: identity.parentPid, startTicks: identity.startTicks, executable: binary.file, executableRawBytesSha256: binary.rawBytesSha256 };
}
function sameLiveChild(expected, binary) {
    const actual = actualIdentity(expected.pid, binary);
    assert.deepEqual(actual, expected, 'Never signal an unregistered or PID-reused process');
}

export async function runOwnedSharedUowProbe({ input, sealedEnvironment, binding, directory, retain, timeoutMs = 60000 }) {
    assert.equal(process.platform, 'linux'); assert.equal(process.cwd(), UOW_ROOT);
    assert.equal(typeof retain, 'function'); assert(Number.isInteger(timeoutMs) && timeoutMs >= 1000 && timeoutMs <= 60000);
    assert.equal(sealedEnvironment.POMS_ENV_FILE, UOW_PRIVATE + '/rust.env');
    assert.equal(sealedEnvironment.DB_DATABASE, 'poms_r2l_rust'); assert.equal(sealedEnvironment.DB_USER, 'poms_r2l_app');
    verifyElf(binding.binary); privateDirectory(directory);
    const stdin = Buffer.from(JSON.stringify(input)); assert(stdin.length > 0 && stdin.length <= 32768);
    const stdoutFile = directory + '/probe.stdout.jsonl', stderrFile = directory + '/probe.stderr.log';
    const record = { kind: 'private-direct-ELF-shared-UoW-process', state: 'spawn-intended', binaryBinding: binding,
        actualBinaryBytesRetained: privateBytes(directory + '/probe-input.elf', fs.readFileSync(binding.binary.file)),
        stdin: { bytes: stdin.length, rawBytesSha256: hash(stdin), sealedOnStdin: true, argvContainsInput: false },
        environment: { presealedBeforeOriginalNativeStartup: true, contentsExported: false },
        startedAt: new Date().toISOString(), timeoutMs, signals: [], unregisteredProcessesStopped: 0, closeObserved: false };
    let child, identity, closed, closedResult, stdoutFd, stderrFd, timedOut = false, inputError;
    try {
        stdoutFd = fs.openSync(stdoutFile, 'wx', 0o600); stderrFd = fs.openSync(stderrFile, 'wx', 0o600);
        await retain(record);
        child = spawn(binding.binary.file, [], { cwd: UOW_ROOT, env: sealedEnvironment, windowsHide: true, detached: false,
            stdio: ['pipe', stdoutFd, stderrFd] });
        closed = new Promise(resolve => {
            child.once('close', (code, signal) => { closedResult = { code, signal }; record.closeObserved = true; resolve(closedResult); });
        });
        child.stdin.on('error', error => { inputError = { name: error.name, message: error.message }; });
        await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
        // The actual example waits for stdin EOF before any configuration/DB I/O.
        // Admit its real Linux identity durably before sending that sealed input.
        identity = actualIdentity(child.pid, binding.binary);
        record.processIdentity = identity; record.state = 'identity-admitted-before-stdin'; await retain(record);
        child.stdin.end(stdin); record.stdinSentAt = new Date().toISOString(); record.state = 'running'; await retain(record);
        const deadline = Date.now() + timeoutMs;
        while (!closedResult && Date.now() < deadline) {
            if (fs.fstatSync(stdoutFd).size > 4 * 1024 * 1024 || fs.fstatSync(stderrFd).size > 1024 * 1024) break;
            await Promise.race([closed, sleep(25)]);
        }
        if (!closedResult) {
            timedOut = true; record.state = 'bounded-stop-required'; await retain(record);
            for (const [signal, waitMs] of [['SIGTERM', 3000], ['SIGKILL', 3000]]) {
                if (closedResult) break;
                sameLiveChild(identity, binding.binary);
                process.kill(identity.pid, signal);
                record.signals.push({ signal, at: new Date().toISOString(), exactIdentityRechecked: true }); await retain(record);
                await Promise.race([closed, sleep(waitMs)]);
            }
        }
        assert(closedResult, 'Controlled example did not close; preserve Partial and do not proceed to PG drain/cleanup');
        record.exit = closedResult; record.inputError = inputError ?? null;
        assert(!timedOut && !inputError && closedResult.code === 0 && closedResult.signal === null, 'Controlled example failed or exceeded its bounded execution');
        record.state = 'closed-successfully-before-PG-drain';
    } catch (error) {
        record.state = 'partial'; record.failure = { name: error.name, message: error.message };
        // Empty input/EOF fails the example before DB I/O if identity admission
        // failed. No process signal is sent without the exact registered identity.
        if (child && !closedResult) {
            child.stdin?.destroy();
            if (identity) {
                for (const [signal, waitMs] of [['SIGTERM', 3000], ['SIGKILL', 3000]]) {
                    if (closedResult) break;
                    sameLiveChild(identity, binding.binary); process.kill(identity.pid, signal);
                    record.signals.push({ signal, at: new Date().toISOString(), exactIdentityRechecked: true }); await retain(record);
                    await Promise.race([closed, sleep(waitMs)]);
                }
            } else if (closed) await Promise.race([closed, sleep(3000)]);
        }
        record.exit = closedResult ?? null; throw Object.assign(error, { sharedUowProcessObservation: record });
    } finally {
        for (const fd of [stdoutFd, stderrFd].filter(Number.isInteger)) { try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } }
        const dir = fs.openSync(directory, 'r'); try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
        record.stdout = fs.existsSync(stdoutFile) ? bytesReceipt(stdoutFile) : null;
        record.stderr = fs.existsSync(stderrFile) ? bytesReceipt(stderrFile) : null;
        record.finishedAt = new Date().toISOString(); await retain(record);
    }
    verifyElf(binding.binary);
    assert(record.closeObserved && closedResult && closedResult.code === 0);
    const rawBytes = fs.readFileSync(stdoutFile);
    assert(rawBytes.length > 0 && rawBytes.length <= 4 * 1024 * 1024);
    return { rawBytes, processObservation: record, closedBeforeDecodeAndPGDrain: true };
}
