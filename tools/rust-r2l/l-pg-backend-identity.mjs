// Root validation instrumentation. Passive wire identity, process/socket proof,
// and exact worker closeout; no product, SQL, network or service configuration.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readOwnedRustSockets } from './l-rust-socket-observation.mjs';
import { databaseClient } from './database-client.mjs';
import { startActualRust } from './rust-app.mjs';
const ROOT = '/home/wangzishi/projects/poms-rust-r2l';
const SOURCE = 'tools/rust-r2l/l-pg-backend-key-observer.py';
const PRIVATE = '/home/wangzishi/.local/share/poms-r2l/private/pg-backend-identities';
const sha = value => createHash('sha256').update(value).digest('hex');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function identity(pid) { const raw = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'); return { pid, startTicks: raw.slice(raw.lastIndexOf(')') + 2).split(' ')[19] }; }
function journal(file) {
    const stat = fs.lstatSync(file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && (stat.mode & 0o077) === 0 && stat.uid === process.getuid());
    const value = JSON.parse(fs.readFileSync(file)); assert.equal(value.payloadsOrCancelKeysPersisted, false);
    assert.equal(value.sourceSha256, sha(fs.readFileSync(SOURCE))); return value;
}
export async function startPgBackendIdentityObserver({ tag, buildTag = 'candidate06' }) {
    assert.equal(process.cwd(), ROOT); assert.equal(process.platform, 'linux'); assert(process.getuid() > 0);
    assert(/^[a-z0-9-]{1,30}$/.test(tag) && /^candidate[0-9]{2}$/.test(buildTag));
    const file = PRIVATE + '/' + tag + '.json'; assert(!fs.existsSync(file));
    const args = ['-d', 'Debian', '-u', 'root', '--cd', ROOT, '--', 'python3', SOURCE, tag, buildTag];
    const child = spawn('/mnt/c/Windows/System32/wsl.exe', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let exited = false, exitCode, spawnError, output = '', stderr = '', closed = false, owner;
    child.once('error', error => { spawnError = error; });
    child.once('close', code => { exited = true; exitCode = code; });
    child.stdout.on('data', bytes => { output += bytes.toString('utf8'); if (output.length > 32768) child.stdin.end(); });
    child.stderr.on('data', bytes => { stderr = (stderr + bytes.toString('utf8')).slice(-8192); });
    const report = { kind: 'passive-PG-backend-key-owned-worker', tag, buildTag, startedAt: new Date().toISOString(),
        source: { file: SOURCE, rawBytesSha256: sha(fs.readFileSync(SOURCE)) }, payloadsPersisted: false,
        rootPrivilegeUse: 'AF_PACKET open and bind only, followed by permanent uid/gid drop before input', admissions: [] };
    function assertWorker() {
        assert(owner); assert.deepEqual(identity(owner.pid), owner);
        assert.equal(fs.realpathSync(`/proc/${owner.pid}/exe`), fs.realpathSync('/usr/bin/python3'));
        const argv = fs.readFileSync(`/proc/${owner.pid}/cmdline`).toString().split('\0').filter(Boolean);
        assert.deepEqual(argv.slice(-3), [SOURCE, tag, buildTag]);
        const status = fs.readFileSync(`/proc/${owner.pid}/status`, 'utf8');
        assert(new RegExp('^Uid:\\s+' + process.getuid() + '\\s+' + process.getuid() + '\\s+' + process.getuid() + '\\s+' + process.getuid() + '$', 'm').test(status));
    }
    async function close() {
        if (closed) return; closed = true;
        if (!exited) child.stdin.end(JSON.stringify({ stop: true }) + '\n');
        for (let n = 0; n < 200 && !exited; n++) await pause(50);
        report.forcedWorkerStop = false;
        if (!exited && owner) {
            assertWorker(); process.kill(owner.pid, 'SIGTERM'); report.forcedWorkerStop = true;
            for (let n = 0; n < 100 && !exited; n++) await pause(50);
        }
        assert(exited, 'Owned passive worker did not finish within closeout bound');
        report.workerExitCode = exitCode; report.stderrBytes = Buffer.byteLength(stderr); report.stderrSha256 = sha(stderr);
        if (fs.existsSync(file)) { const value = journal(file); report.workerCloseout = value.closeout; report.rawSocketClosed = value.rawSocketClosed; }
        assert.equal(exitCode, 0, 'Passive identity worker failed; diagnostic content remains private');
        assert.equal(report.rawSocketClosed, true); report.closedAt = new Date().toISOString(); report.closed = true;
    }
    try {
        for (let n = 0; n < 600; n++) {
            if (spawnError) throw spawnError;
            if (exited) throw new Error('Passive worker exited before readiness; code=' + exitCode);
            if (fs.existsSync(file)) {
                const value = journal(file); assert.equal(value.result, 'ready'); owner = value.workerIdentity;
                assert.equal(value.kernelFilter.attachedBeforeProtocolBind, true); assert.equal(value.kernelFilter.locked, true);
                assertWorker(); report.workerIdentity = owner; report.uidAfterDrop = value.uidAfterDrop;
                report.kernelFilter = value.kernelFilter; break;
            }
            await pause(50);
        }
        assert(owner, 'Passive PG identity worker readiness deadline');
        return { report, file,
            async admit(runtimeReport) {
                assertWorker(); const sockets = readOwnedRustSockets(runtimeReport); assert(sockets.sockets.length > 0);
                const before = journal(file); assert.equal(before.result, 'ready');
                child.stdin.write(JSON.stringify({ admit: runtimeReport.processIdentity }) + '\n');
                let value;
                for (let n = 0; n < 200; n++) {
                    assert(!exited, 'Passive worker ended during admission');
                    value = journal(file); if (value.revision > before.revision) break; await pause(25);
                }
                assert(value.revision > before.revision); assert.equal(value.result, 'ready');
                assert.deepEqual(value.proofs.map(row => row.localPort).sort(), sockets.sockets.map(row => row.localPort).sort());
                for (const row of value.proofs) {
                    assert.deepEqual(row.ownedRustProcess, runtimeReport.processIdentity);
                    assert(sockets.sockets.some(socket => socket.localPort === row.localPort && socket.inode === row.inode));
                    assert.equal(row.cancelKeyParsedOrExported, false); assert.equal(row.payloadRetained, false);
                }
                const proof = { kind: 'owned-proc-socket-original-BackendKeyData-hard-binding', observedAt: new Date().toISOString(),
                    sockets, backendProofs: value.proofs, workerIdentity: owner, journalRevision: value.revision };
                report.admissions.push(proof); return proof;
            }, close };
    } catch (error) { try { await close(); } catch (closeError) { report.closeFailure = { name: closeError.name, message: closeError.message }; } throw Object.assign(error, { passiveWorkerReport: report }); }
}

async function actualCheck(tag, buildTag) {
    const file = `tmp/rust-r2l/pg-backend-key-observation-${tag}.json`; assert(!fs.existsSync(file));
    const report = { kind: 'read-only-original-wire-Rust-PG-hard-binding', result: 'pending', tag, startedAt: new Date().toISOString(), businessDml: false, resources: [] };
    let observer, client, runtime;
    try {
        observer = await startPgBackendIdentityObserver({ tag, buildTag });
        client = await databaseClient('rust');
        const before = (await client.query("select pid from pg_stat_activity where datname=current_database() and usename=current_user and application_name='poms-api-rust'")).rows; assert.equal(before.length, 0);
        const binding = JSON.parse(fs.readFileSync(`tmp/rust-r2l/rust-${buildTag}-binary-source.json`));
        runtime = await startActualRust({ tag, expectedBinarySha256: binding.binary.rawBytesSha256 }); report.runtime = runtime.report;
        report.proof = await observer.admit(runtime.report);
        report.sessions = (await client.query("select pid,backend_start,client_addr::text,client_port,application_name from pg_stat_activity where datname=current_database() and usename=current_user and application_name='poms-api-rust' order by pid")).rows;
        assert.deepEqual(report.sessions.map(row => row.pid).sort(), report.proof.backendProofs.map(row => row.backendPid).sort());
        report.result = 'pass-read-only-hard-binding';
    } catch (error) { report.result = 'fail'; report.failure = { name: error.name, message: error.message }; if (error.passiveWorkerReport) report.passiveWorker = error.passiveWorkerReport; process.exitCode = 1; }
    finally {
        for (const [name, close] of [['rust-owner-close', async () => runtime?.close()], ['client-close', async () => client?.end()], ['passive-worker-close', async () => observer?.close()]]) {
            try { await close(); report.resources.push({ name, result: 'pass' }); }
            catch (error) { report.resources.push({ name, result: 'fail', failure: { name: error.name, message: error.message } }); report.result = 'fail'; process.exitCode = 1; }
        }
        if (observer) report.passiveWorker = observer.report;
        report.finishedAt = new Date().toISOString(); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
        console.log(JSON.stringify({ result: report.result, file, resources: report.resources, failure: report.failure ?? null }));
    }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await actualCheck(process.argv[2], process.argv[3] ?? 'candidate06');
