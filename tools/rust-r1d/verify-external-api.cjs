'use strict';
const assert = require('node:assert/strict');
const { mkdirSync, readFileSync } = require('node:fs');
const path = require('node:path');
const { startManagedBackend } = require('../e2e/api-server.cjs');
const { runOwnedCommand, waitForReadiness } = require('../e2e/runtime.cjs');

// This controller owns the independent server. The tested Jest subprocess is
// external and receives no usable DB configuration or environment file.
async function verifyExternalApi() {
    const cwd = path.resolve(__dirname, '../..');
    const backend = await startManagedBackend({ cwd });
    const serverPid = backend.handle.serverPid;
    const directory = path.join(cwd, 'tmp', 'rust-r1d');
    mkdirSync(directory, { recursive: true });
    const suffix = `${process.platform}-${backend.target.mode}`;
    const resultFile = path.join(directory, `external-${suffix}.json`);
    try {
        const env = {
            ...process.env,
            POMS_E2E_MODE: 'external',
            POMS_E2E_SUITE: 'foundation',
            POMS_API_BASE_URL: backend.target.origin,
            POMS_ENV_FILE: path.join(directory, 'deliberately-absent.env'),
            DB_HOST: 'invalid.example',
            DB_PORT: '5432',
            DATABASE_URL: 'this-is-deliberately-not-a-database-url',
            NX_DAEMON: 'false'
        };
        await runOwnedCommand({
            executable: process.execPath,
            args: [require.resolve('jest/bin/jest'), '--config', 'apps/poms-api-e2e/jest.config.ts', '--runInBand', '--json', '--outputFile', resultFile],
            cwd,
            env,
            timeoutMs: 180000,
            logPath: path.join(directory, `external-${suffix}.log`)
        });
        await waitForReadiness({ url: backend.target.readinessUrl, timeoutMs: 5000 });
        process.kill(serverPid, 0);
        assert.equal(backend.handle.serverPid, serverPid);
        const result = JSON.parse(readFileSync(resultFile, 'utf8'));
        assert.equal(result.success, true);
        assert.equal(result.numPendingTests, 0);
        console.log(
            JSON.stringify({
                kind: 'independent-external-api',
                platform: process.platform,
                backend: backend.target.mode,
                origin: backend.target.origin,
                tests: result.numPassedTests,
                serverPid,
                independentlyOwnedServerSurvived: true,
                unusableLocalDatabaseEnvironmentIgnored: true
            })
        );
    } finally {
        await backend.stop();
    }
}
verifyExternalApi().catch(() => {
    console.error('Independent external verification failed; inspect its retained local log.');
    process.exitCode = 1;
});
