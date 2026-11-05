// Author static/pure checks only. Never imports a Root runtime or uses DB/network.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const own = path.dirname(fileURLToPath(import.meta.url)), checks = own + '/checks';
assert(!fs.existsSync(checks), 'Preserve prior check evidence'); fs.mkdirSync(checks);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const reports = [];
const commands = ['core70.mjs', 'core70.test.mjs', 'capture-authority70.mjs', 'validate70.mjs', 'capture-manifest70.mjs'].map(file => ['--check', own + '/' + file]); commands.push(['--test', '--test-reporter=tap', own + '/core70.test.mjs']);
for (let i = 0; i < commands.length; i++) {
    const result = spawnSync(process.execPath, commands[i], { cwd: own, encoding: null, windowsHide: true, env: { SystemRoot: process.env.SystemRoot ?? '', TZ: 'UTC' }, timeout: 30000 });
    const streams = {};
    for (const name of ['stdout', 'stderr']) { const bytes = result[name] ?? Buffer.alloc(0), file = checks + '/' + String(i + 1).padStart(2, '0') + '-' + name + '.bin'; fs.writeFileSync(file, bytes, { flag: 'wx' }); streams[name] = { file: path.relative(own, file).replaceAll('\\', '/'), bytes: bytes.length, rawBytesSha256: sha(bytes) }; }
    reports.push({ command: [process.execPath, ...commands[i]], exitCode: result.status, signal: result.signal, streams }); assert.equal(result.status, 0, 'Static/pure command failed; originals retained');
}
const final = reports.at(-1), tap = fs.readFileSync(own + '/' + final.streams.stdout.file, 'utf8'); assert(/# pass 10\b/.test(tap) && /# fail 0\b/.test(tap));
const receipt = { kind: 'cleanup70-author-static-and-pure-only-checks', nodeVersion: process.version, commands: reports, pureTestsPassed: 10, pureTestsFailed: 0, actualPrivateRead: false, actualBusinessRowGraphSupplied: false, actualDBExecuted: false, actualObjectIOOrUnlinkExecuted: false, actualSignalOrContainerStopExecuted: false, G3Certified: false, G4Certified: false };
fs.writeFileSync(checks + '/receipt70.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ commands: reports.length, pureTests: 10, actualDBExecuted: false, actualRowGraphSupplied: false }));
