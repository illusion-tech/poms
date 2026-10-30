// Root bounded process owner for the reviewed second-freeze countercondition.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const [tag, backend, buildTag = 'candidate08'] = process.argv.slice(2);
assert(/^[a-z0-9-]{1,24}$/.test(tag ?? '') && ['nest', 'rust'].includes(backend) && /^candidate[0-9]{2}$/.test(buildTag));
assert.equal(process.cwd(), '/home/wangzishi/projects/poms-rust-r2l');
if (process.argv.includes('--owner-child')) {
    const { runRetentionFreezeMismatchActual } = await import('./l-retention-freeze-gap.mjs');
    const actual = await runRetentionFreezeMismatchActual({ tag, backend, buildTag });
    if (actual.result !== 'edges-observed' || actual.doubleZero !== true) process.exitCode = 1;
} else {
    const require = createRequire(import.meta.url), runtime = require('../e2e/runtime.cjs');
    const directory = '/home/wangzishi/.local/share/poms-r2l/private/execution-logs';
    const stat = fs.lstatSync(directory); assert(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0);
    const log = directory + `/retention-freeze-${backend}-${tag}.log`, output = `tmp/rust-r2l/retention-freeze-${backend}-${tag}-owner.json`;
    assert(!fs.existsSync(log) && !fs.existsSync(output));
    const report = { kind: 'bounded-original-second-freeze-countercondition-owner', result: 'pending', tag, backend, buildTag, startedAt: new Date().toISOString(), privateStdoutExported: false };
    try {
        for (const port of [9700, 9701]) await runtime.assertPortAvailable(runtime.resolveTarget({ mode: 'external', baseUrl: 'http://127.0.0.1:' + port }));
        const env = Object.fromEntries(['PATH', 'HOME', 'LANG'].filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
        const result = await runtime.runOwnedCommand({ executable: process.execPath,
            args: ['tools/rust-r2l/run-retention-freeze-gap.mjs', tag, backend, buildTag, '--owner-child'], cwd: process.cwd(), env,
            logPath: path.resolve(log), timeoutMs: 300000 }); report.exitCode = result.code; report.result = 'pass-owner-not-cross-backend-comparison';
    } catch (error) { report.result = 'fail'; report.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
    finally {
        if (fs.existsSync(log)) { const raw = fs.readFileSync(log); fs.chmodSync(log, 0o600); report.privateLog = { bytes: raw.length, rawBytesSha256: createHash('sha256').update(raw).digest('hex'), contentsExported: false }; }
        report.finishedAt = new Date().toISOString(); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(report));
    }
}
