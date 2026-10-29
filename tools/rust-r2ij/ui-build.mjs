import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
const require = createRequire(import.meta.url), runtime = require('../e2e/runtime.cjs');
const tag = process.argv[2]; assert(/^[a-z0-9-]{1,35}$/.test(tag));
const output = `tmp/rust-r2ij/ui-host-${tag}.json`; assert(!existsSync(output));
const nxPackage = require.resolve('nx/package.json'), metadata = JSON.parse(readFileSync(nxPackage));
const nx = path.resolve(path.dirname(nxPackage), typeof metadata.bin === 'string' ? metadata.bin : metadata.bin.nx);
const log = `tmp/rust-r2ij/ui-host-${tag}.log`;
const report = { formatVersion: 1, node: process.version, result: 'pending', scope: 'Original Angular components in tool-only fixture host; R3 business pages remain outside', log };
try {
    await runtime.runOwnedCommand({ executable: process.execPath, args: [nx, 'run', 'poms-admin:build:development', '--browser=tools/rust-r2ij/ui-host/main.ts', '--tsConfig=tools/rust-r2ij/ui-host/tsconfig.json', '--index=tools/rust-r2ij/ui-host/index.html', '--outputPath=dist/tools/rust-r2ij-ui-host', '--skip-nx-cache'], cwd: process.cwd(), env: { ...process.env, NX_DAEMON: 'false', NX_TUI: 'false', NX_SKIP_NX_CACHE: 'true', NG_CLI_ANALYTICS: 'false', CI: 'true' }, logPath: path.resolve(log), timeoutMs: 300000 });
    report.result = 'pass';
} catch (error) { report.result = 'fail'; report.failureType = error.name; process.exitCode = 1; }
finally { report.logSha256 = createHash('sha256').update(readFileSync(log)).digest('hex'); writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(report)); }
