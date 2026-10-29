'use strict';

const { readFileSync, realpathSync, statSync } = require('node:fs');
const { resolve, basename } = require('node:path');
const { parse } = require('dotenv');

function admittedPath(filename, backend) {
    const normalized = filename.replaceAll('\\', '/');
    const paths = [`/r2k-private/${backend}.env`, `/home/wangzishi/.local/share/poms-r2k/private/${backend}.env`];
    if (process.platform === 'win32') return normalized.toLowerCase() === `//wsl.localhost/debian/home/wangzishi/.local/share/poms-r2k/private/${backend}.env`;
    return paths.includes(normalized);
}
// Runtime admission is deliberately narrower than external mode. Database
// provisioning independently verifies the cluster and owner-only marker.
function loadManagedEnvironment({ mode, env = process.env, cwd = process.cwd() }) {
    if (!['managed-nest', 'managed-rust'].includes(mode)) throw new Error('Managed environment requires a managed backend');
    if (Object.keys(env).some((key) => /^(?:PG|DB_|MIKRO_)/i.test(key) || /^(?:DATABASE_URL|JWT_SECRET|NODE_OPTIONS)$/i.test(key))) throw new Error('Managed R2L1 refuses ambient database/process overrides');
    if (typeof env.POMS_ENV_FILE !== 'string' || !env.POMS_ENV_FILE.trim()) throw new Error('Managed mode requires explicit POMS_ENV_FILE');
    const backend = mode === 'managed-nest' ? 'nest' : 'rust';
    const requestedPath = resolve(cwd, env.POMS_ENV_FILE.trim());
    const envFile = realpathSync(requestedPath);
    if (!statSync(envFile).isFile()) throw new Error('POMS_ENV_FILE must be a regular file');
    if (basename(envFile).toLowerCase() === '.env' || envFile.replaceAll('\\', '/').toLowerCase().includes('/deploy/private/')) throw new Error('Managed E2E refuses default or deployment environment files');
    if (!admittedPath(requestedPath, backend) || !admittedPath(envFile, backend)) throw new Error('Managed R2L1 environment requires its fixed private backend path');
    const parsed = parse(readFileSync(envFile));
    // A file must use this exact allowlist. Windows folds environment keys,
    // so a lowercase alias must never bypass the validated uppercase value.
    const fileKeys = new Set(['NODE_ENV', 'HOST', 'PORT', 'DB_CONNECT', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD', 'DB_SCHEMA', 'JWT_SECRET', 'CORS_ORIGIN', 'IDENTITY_PROVIDER_SECRET_KEY', 'IDENTITY_PROVIDER_STATE_KEY', 'FEISHU_OPEN_API_BASE_URL', 'FEISHU_OAUTH_AUTHORIZE_URL', 'FEISHU_OAUTH_TOKEN_URL', 'FEISHU_USER_INFO_URL', 'FEISHU_USER_SEARCH_URL', 'FEISHU_USER_BATCH_URL', 'FEISHU_DEPARTMENT_BATCH_URL', 'FEISHU_TENANT_ACCESS_TOKEN_URL', 'FEISHU_DEPARTMENT_CHILDREN_URL_TEMPLATE', 'FEISHU_API_TIMEOUT_MS', 'FEISHU_ORG_DEPARTMENT_PAGE_SIZE', 'ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY', 'POMS_ATTACHMENT_LOCAL_ROOT']);
    for (const key of Object.keys(parsed)) {
        if (!fileKeys.has(key)) throw new Error(`Managed R2L1 environment contains forbidden override: ${key}`);
    }
    const database = mode === 'managed-nest' ? 'poms_r2k_nest' : 'poms_r2k_rust';
    for (const [key, value] of Object.entries({ DB_HOST: '127.0.0.1', DB_PORT: '18432', DB_DATABASE: database, DB_USER: 'poms_r2k_app', DB_SCHEMA: 'poms', DB_CONNECT: 'true', NODE_ENV: 'test' })) {
        if (parsed[key] !== value) throw new Error(`Managed R2L1 environment mismatch: ${key}`);
    }
    if (!/^[0-9a-f]{64}$/.test(parsed.DB_PASSWORD ?? '')) throw new Error('Managed R2L1 password format mismatch');
    if (!/^[0-9a-f]{64}$/.test(parsed.JWT_SECRET ?? '')) throw new Error('Managed R2L1 JWT_SECRET format mismatch');
    if (parsed.HOST !== '127.0.0.1') throw new Error('Managed R2L1 HOST must be loopback');
    if (parsed.PORT !== (backend === 'nest' ? '8700' : '8701')) throw new Error('Managed R2L1 PORT mismatch');
    if (parsed.CORS_ORIGIN !== 'http://127.0.0.1:8800') throw new Error('Managed R2L1 CORS_ORIGIN mismatch');
    for (const key of ['IDENTITY_PROVIDER_SECRET_KEY', 'IDENTITY_PROVIDER_STATE_KEY']) {
        if (parsed[key] !== parsed.JWT_SECRET) throw new Error('Managed R2L1 identity key mismatch');
    }
    const endpoints = {"FEISHU_OPEN_API_BASE_URL":"http://127.0.0.1:8900","FEISHU_OAUTH_AUTHORIZE_URL":"http://127.0.0.1:8900/oauth/authorize","FEISHU_OAUTH_TOKEN_URL":"http://127.0.0.1:8900/oauth/token","FEISHU_USER_INFO_URL":"http://127.0.0.1:8900/oauth/user-info","FEISHU_USER_SEARCH_URL":"http://127.0.0.1:8900/search/users","FEISHU_USER_BATCH_URL":"http://127.0.0.1:8900/contact/users/batch","FEISHU_DEPARTMENT_BATCH_URL":"http://127.0.0.1:8900/contact/departments/batch","FEISHU_TENANT_ACCESS_TOKEN_URL":"http://127.0.0.1:8900/tenant-token","FEISHU_DEPARTMENT_CHILDREN_URL_TEMPLATE":"http://127.0.0.1:8900/departments/{departmentId}/children","FEISHU_API_TIMEOUT_MS":"1000","FEISHU_ORG_DEPARTMENT_PAGE_SIZE":"2"};
    for (const [key, value] of Object.entries(endpoints)) {
        if (parsed[key] !== value) throw new Error('Managed R2L1 controlled upstream mismatch: ' + key);
    }
    if (parsed.ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY !== parsed.JWT_SECRET || parsed.POMS_ATTACHMENT_LOCAL_ROOT !== `/home/wangzishi/.local/share/poms-r2k/objects/${backend}/server01`) throw new Error('Managed R2L1 attachment runtime mismatch');
    const childEnv = {};
    const systemKeys = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA', 'LANG', 'LC_ALL', 'PNPM_HOME']);
    for (const [key, value] of Object.entries(env)) {
        if (systemKeys.has(key.toUpperCase()) && typeof value === 'string') childEnv[key] = value;
    }
    Object.assign(childEnv, parsed, { POMS_ENV_FILE: envFile, NX_DAEMON: 'false', NX_SKIP_NX_CACHE: 'true', NO_PROXY: 'localhost,127.0.0.1,::1', no_proxy: 'localhost,127.0.0.1,::1' });
    return { childEnv, host: parsed.HOST, port: Number(parsed.PORT), envFile, database };
}

module.exports = { loadManagedEnvironment };
