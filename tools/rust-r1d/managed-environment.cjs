'use strict';

const { readFileSync, realpathSync, statSync } = require('node:fs');
const { resolve, basename } = require('node:path');
const { parse } = require('dotenv');

// Runtime admission is deliberately narrower than external mode. Database
// provisioning independently verifies the cluster and owner-only marker.
function loadManagedEnvironment({ mode, env = process.env, cwd = process.cwd() }) {
    if (!['managed-nest', 'managed-rust'].includes(mode)) throw new Error('Managed environment requires a managed backend');
    if (typeof env.POMS_ENV_FILE !== 'string' || !env.POMS_ENV_FILE.trim()) throw new Error('Managed mode requires explicit POMS_ENV_FILE');
    const envFile = realpathSync(resolve(cwd, env.POMS_ENV_FILE.trim()));
    if (!statSync(envFile).isFile()) throw new Error('POMS_ENV_FILE must be a regular file');
    if (basename(envFile).toLowerCase() === '.env' || envFile.replaceAll('\\', '/').toLowerCase().includes('/deploy/private/')) throw new Error('Managed E2E refuses default or deployment environment files');
    const parsed = parse(readFileSync(envFile));
    // A file must use this exact allowlist. Windows folds environment keys,
    // so a lowercase alias must never bypass the validated uppercase value.
    const fileKeys = new Set(['NODE_ENV', 'HOST', 'PORT', 'DB_CONNECT', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD', 'DB_SCHEMA', 'JWT_SECRET', 'CORS_ORIGIN']);
    for (const key of Object.keys(parsed)) {
        if (!fileKeys.has(key)) throw new Error(`Managed R1D environment contains forbidden override: ${key}`);
    }
    const database = mode === 'managed-nest' ? 'poms_r1d_nest' : 'poms_r1d_rust';
    for (const [key, value] of Object.entries({ DB_HOST: '127.0.0.1', DB_PORT: '15432', DB_DATABASE: database, DB_USER: 'poms_r1d_app', DB_SCHEMA: 'poms', DB_CONNECT: 'true', NODE_ENV: 'test' })) {
        if (parsed[key] !== value) throw new Error(`Managed R1D environment mismatch: ${key}`);
    }
    if (!/^[0-9a-f]{64}$/.test(parsed.DB_PASSWORD ?? '')) throw new Error('Managed R1D password format mismatch');
    if (!parsed.JWT_SECRET || parsed.JWT_SECRET.length < 32) throw new Error('Managed R1D JWT_SECRET is required');
    if (parsed.HOST !== '127.0.0.1') throw new Error('Managed R1D HOST must be loopback');
    if (!/^[1-9][0-9]{0,4}$/.test(parsed.PORT ?? '') || Number(parsed.PORT) > 65535) throw new Error('Managed R1D PORT is invalid');
    const childEnv = {};
    const systemKeys = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA', 'LANG', 'LC_ALL', 'PNPM_HOME']);
    for (const [key, value] of Object.entries(env)) {
        if (systemKeys.has(key.toUpperCase()) && typeof value === 'string') childEnv[key] = value;
    }
    Object.assign(childEnv, parsed, { POMS_ENV_FILE: envFile, NX_DAEMON: 'false', NX_SKIP_NX_CACHE: 'true', NO_PROXY: 'localhost,127.0.0.1,::1', no_proxy: 'localhost,127.0.0.1,::1' });
    return { childEnv, host: parsed.HOST, port: Number(parsed.PORT), envFile, database };
}

module.exports = { loadManagedEnvironment };
