// Root's bounded, private-stdout process owner. Legacy/current never share a VM.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), runtime = require('../e2e/runtime.cjs');
const [variant, backend, tag] = process.argv.slice(2);
assert(['legacy', 'current'].includes(variant) && ['nest', 'rust'].includes(backend) && /^[a-z0-9-]{1,25}$/.test(tag ?? ''));
assert.equal(process.cwd(), '/home/wangzishi/projects/poms-rust-r2l');
const sha = raw => createHash('sha256').update(raw).digest('hex');
const privateDirectory = '/home/wangzishi/.local/share/poms-r2l/private/execution-logs';
const stat = fs.lstatSync(privateDirectory); assert(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0);
const log = privateDirectory + `/lookup-${variant}-${backend}-${tag}.log`, file = `tmp/rust-r2l/lookup-native-${variant}-${backend}-${tag}-owner.json`;
assert(!fs.existsSync(file) && !fs.existsSync(log));
const report = { formatVersion: 1, result: 'pending', kind: 'bounded-owned-actual-lookup-process', variant, backend, tag, startedAt: new Date().toISOString(), privateStdoutExported: false };
try {
    await runtime.assertPortAvailable(runtime.resolveTarget({ mode: 'external', baseUrl: 'http://127.0.0.1:9700' }));
    const result = await runtime.runOwnedCommand({ executable: process.execPath,
        args: ['tools/rust-r2l/lookup-native-actual.mjs', variant, backend, tag], cwd: process.cwd(),
        env: Object.fromEntries(['PATH', 'HOME', 'LANG'].filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]])),
        logPath: path.resolve(log), timeoutMs: 300000 });
    report.exitCode = result.code; report.result = 'pass';
} catch (error) { report.result = 'fail'; report.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
finally {
    if (fs.existsSync(log)) { fs.chmodSync(log, 0o600); const raw = fs.readFileSync(log); report.privateLog = { bytes: raw.length, rawBytesSha256: sha(raw), contentsExported: false }; }
    report.finishedAt = new Date().toISOString(); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(report));
}
