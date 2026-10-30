// Read-only process/socket and PostgreSQL session observation. No business SQL.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { startActualRust } from './rust-app.mjs';
import { databaseClient } from './database-client.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function processIdentity(pid) {
    const raw = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    return { pid, startTicks: raw.slice(raw.lastIndexOf(')') + 2).split(' ')[19] };
}
export function readOwnedRustSockets(runtimeReport) {
    const { processIdentity: expected, binary, binaryRawBytesSha256 } = runtimeReport;
    assert.deepEqual(processIdentity(expected.pid), expected);
    assert.equal(fs.realpathSync(`/proc/${expected.pid}/exe`), binary);
    assert.equal(sha(fs.readFileSync(binary)), binaryRawBytesSha256);
    const directory = `/proc/${expected.pid}/fd`, inodes = new Set();
    for (const fd of fs.readdirSync(directory)) {
        let target; try { target = fs.readlinkSync(directory + '/' + fd); }
        catch (error) { if (error.code === 'ENOENT') continue; throw error; }
        const match = /^socket:\[(\d+)\]$/.exec(target); if (match) inodes.add(match[1]);
    }
    const rows = [];
    for (const line of fs.readFileSync(`/proc/${expected.pid}/net/tcp`, 'utf8').trim().split('\n').slice(1)) {
        const fields = line.trim().split(/\s+/), [localAddress, localPort] = fields[1].split(':'), [remoteAddress, remotePort] = fields[2].split(':');
        if (!inodes.has(fields[9]) || fields[3] !== '01' || remoteAddress !== '0100007F' || Number.parseInt(remotePort, 16) !== 19432) continue;
        assert.equal(localAddress, '0100007F');
        rows.push({ inode: fields[9], localAddress: '127.0.0.1', localPort: Number.parseInt(localPort, 16), remoteAddress: '127.0.0.1', remotePort: 19432 });
    }
    assert.deepEqual(processIdentity(expected.pid), expected);
    return { kind: 'actual-owned-Rust-proc-fd-tcp-observation', at: new Date().toISOString(), processIdentity: expected,
        binaryRawBytesSha256, sockets: rows.sort((a, b) => a.localPort - b.localPort) };
}

export async function observeRustSocketMapping(tag, buildTag = 'candidate06') {
    assert(/^[a-z0-9-]{1,30}$/.test(tag) && /^candidate[0-9]{2}$/.test(buildTag));
    assert.equal(process.cwd(), '/home/wangzishi/projects/poms-rust-r2l');
    const file = `tmp/rust-r2l/rust-socket-observation-${tag}.json`; assert(!fs.existsSync(file));
    const bindingFile = `tmp/rust-r2l/rust-${buildTag}-binary-source.json`, binding = JSON.parse(fs.readFileSync(bindingFile));
    assert.equal(binding.result, 'pass-build-source-binding-not-runtime');
    for (const row of binding.files) assert.equal(sha(fs.readFileSync(row.file)), row.rawBytesSha256);
    const report = { result: 'pending', kind: 'read-only-Rust-PG-socket-pairing-observation', tag, startedAt: new Date().toISOString(), resources: [], businessDml: false };
    let client, runtime;
    try {
        client = await databaseClient('rust');
        report.before = (await client.query("select pid,backend_start,client_addr::text,client_port,application_name from pg_stat_activity where datname=current_database() and usename=current_user and application_name='poms-api-rust' order by pid")).rows;
        assert.equal(report.before.length, 0);
        runtime = await startActualRust({ tag, expectedBinarySha256: binding.binary.rawBytesSha256 }); report.runtime = runtime.report;
        report.sockets = readOwnedRustSockets(runtime.report);
        report.sessions = (await client.query("select pid,backend_start,client_addr::text,client_port,application_name from pg_stat_activity where datname=current_database() and usename=current_user and application_name='poms-api-rust' order by pid")).rows;
        report.exactPortMatches = report.sessions.map(row => ({ pid: row.pid, clientPort: row.client_port,
            ownedSocketMatches: report.sockets.sockets.filter(socket => socket.localPort === row.client_port).length }));
        report.result = 'observed';
    } catch (error) { report.result = 'fail'; report.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
    finally {
        for (const [name, close] of [['runtime-close', async () => runtime?.close()], ['client-close', async () => client?.end()]]) {
            try { await close(); report.resources.push({ name, result: 'pass' }); }
            catch (error) { report.resources.push({ name, result: 'fail', failure: { name: error.name, message: error.message } }); report.result = 'fail'; process.exitCode = 1; }
        }
        report.finishedAt = new Date().toISOString(); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    }
    return { result: report.result, file, sockets: report.sockets?.sockets, sessions: report.sessions, exactPortMatches: report.exactPortMatches, resources: report.resources };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) console.log(JSON.stringify(await observeRustSocketMapping(process.argv[2], process.argv[3])));
