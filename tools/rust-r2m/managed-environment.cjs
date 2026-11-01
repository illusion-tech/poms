'use strict';

const { readFileSync, realpathSync, lstatSync, openSync, closeSync, fstatSync, constants } = require('node:fs');
const { resolve, basename } = require('node:path');

function admittedPath(filename, backend) {
    const normalized = filename.replaceAll('\\', '/');
    const paths = [`/r2m-private/${backend}.env`, `/home/wangzishi/.local/share/poms-r2m/private/${backend}.env`];
    if (process.platform === 'win32') return normalized.toLowerCase() === `//wsl.localhost/debian/home/wangzishi/.local/share/poms-r2m/private/${backend}.env`;
    return paths.includes(normalized);
}
// Runtime admission is deliberately narrower than external mode. Database
// provisioning independently verifies the cluster and owner-only marker.
function loadManagedEnvironment({ mode, env = process.env, cwd = process.cwd() }) {
    if (!['managed-nest', 'managed-rust'].includes(mode)) throw new Error('Managed environment requires a managed backend');
    if (Object.keys(env).some((key) => /^(?:PG|DB_|MIKRO_)/i.test(key) || /^(?:DATABASE_URL|JWT_SECRET|NODE_OPTIONS)$/i.test(key))) throw new Error('Managed R2M refuses ambient database/process overrides');
    if (typeof env.POMS_ENV_FILE !== 'string' || !env.POMS_ENV_FILE.trim()) throw new Error('Managed mode requires explicit POMS_ENV_FILE');
    const backend = mode === 'managed-nest' ? 'nest' : 'rust';
    const requestedPath = resolve(cwd, env.POMS_ENV_FILE.trim());
    if (!admittedPath(requestedPath, backend)) throw new Error('r2m_environment_path');
    const requestedStat = lstatSync(requestedPath);
    if (!requestedStat.isFile() || requestedStat.isSymbolicLink()) throw new Error('r2m_environment_file_type');
    const privateDir = require('node:path').dirname(requestedPath);
    const directoryStat = lstatSync(privateDir);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) throw new Error('r2m_private_directory_type');
    if (process.platform !== 'win32' && ((requestedStat.mode & 0o077) !== 0 || (directoryStat.mode & 0o077) !== 0)) throw new Error('r2m_private_mode');
    const envFile = realpathSync(requestedPath);
    if (basename(envFile).toLowerCase() === '.env' || envFile.replaceAll('\\', '/').toLowerCase().includes('/deploy/private/')) throw new Error('Managed E2E refuses default or deployment environment files');
    if (!admittedPath(requestedPath, backend) || !admittedPath(envFile, backend)) throw new Error('Managed R2M environment requires its fixed private backend path');
    const realStat = lstatSync(envFile);
    if (!realStat.isFile() || realStat.isSymbolicLink() || requestedStat.dev !== realStat.dev || requestedStat.ino !== realStat.ino) throw new Error('r2m_environment_identity');
    const fd = openSync(envFile, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    let parsed;
    try {
        const opened = fstatSync(fd);
        if (!opened.isFile() || opened.dev !== realStat.dev || opened.ino !== realStat.ino || (process.platform !== 'win32' && (opened.mode & 0o077) !== 0)) throw new Error('r2m_environment_identity');
        parsed = require('dotenv').parse(readFileSync(fd));
    } finally { closeSync(fd); }
    // A file must use this exact allowlist. Windows folds environment keys,
    // so a lowercase alias must never bypass the validated uppercase value.
    const fileKeys = new Set(['NODE_ENV', 'HOST', 'PORT', 'DB_CONNECT', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD', 'DB_SCHEMA', 'JWT_SECRET', 'CORS_ORIGIN', 'IDENTITY_PROVIDER_SECRET_KEY', 'IDENTITY_PROVIDER_STATE_KEY', 'FEISHU_OPEN_API_BASE_URL', 'FEISHU_OAUTH_AUTHORIZE_URL', 'FEISHU_OAUTH_TOKEN_URL', 'FEISHU_USER_INFO_URL', 'FEISHU_USER_SEARCH_URL', 'FEISHU_USER_BATCH_URL', 'FEISHU_DEPARTMENT_BATCH_URL', 'FEISHU_TENANT_ACCESS_TOKEN_URL', 'FEISHU_DEPARTMENT_CHILDREN_URL_TEMPLATE', 'FEISHU_API_TIMEOUT_MS', 'FEISHU_ORG_DEPARTMENT_PAGE_SIZE', 'ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY', 'POMS_ATTACHMENT_LOCAL_ROOT']);
    for (const key of Object.keys(parsed)) {
        if (!fileKeys.has(key)) throw new Error(`Managed R2M environment contains forbidden override: ${key}`);
    }
    const database = mode === 'managed-nest' ? 'poms_r2m_nest' : 'poms_r2m_rust';
    for (const [key, value] of Object.entries({ DB_HOST: '127.0.0.1', DB_PORT: '20432', DB_DATABASE: database, DB_USER: 'poms_r2m_app', DB_SCHEMA: 'poms', DB_CONNECT: 'true', NODE_ENV: 'test' })) {
        if (parsed[key] !== value) throw new Error(`Managed R2M environment mismatch: ${key}`);
    }
    if (!/^[0-9a-f]{64}$/.test(parsed.DB_PASSWORD ?? '')) throw new Error('Managed R2M password format mismatch');
    if (!/^[0-9a-f]{64}$/.test(parsed.JWT_SECRET ?? '')) throw new Error('Managed R2M JWT_SECRET format mismatch');
    if (parsed.HOST !== '127.0.0.1') throw new Error('Managed R2M HOST must be loopback');
    if (parsed.PORT !== (backend === 'nest' ? '10070' : '10071')) throw new Error('Managed R2M PORT mismatch');
    if (parsed.CORS_ORIGIN !== 'http://127.0.0.1:10080') throw new Error('Managed R2M CORS_ORIGIN mismatch');
    for (const key of ['IDENTITY_PROVIDER_SECRET_KEY', 'IDENTITY_PROVIDER_STATE_KEY']) {
        if (parsed[key] !== parsed.JWT_SECRET) throw new Error('Managed R2M identity key mismatch');
    }
    const endpoints = {"FEISHU_OPEN_API_BASE_URL":"http://127.0.0.1:10090","FEISHU_OAUTH_AUTHORIZE_URL":"http://127.0.0.1:10090/oauth/authorize","FEISHU_OAUTH_TOKEN_URL":"http://127.0.0.1:10090/oauth/token","FEISHU_USER_INFO_URL":"http://127.0.0.1:10090/oauth/user-info","FEISHU_USER_SEARCH_URL":"http://127.0.0.1:10090/search/users","FEISHU_USER_BATCH_URL":"http://127.0.0.1:10090/contact/users/batch","FEISHU_DEPARTMENT_BATCH_URL":"http://127.0.0.1:10090/contact/departments/batch","FEISHU_TENANT_ACCESS_TOKEN_URL":"http://127.0.0.1:10090/tenant-token","FEISHU_DEPARTMENT_CHILDREN_URL_TEMPLATE":"http://127.0.0.1:10090/departments/{departmentId}/children","FEISHU_API_TIMEOUT_MS":"1000","FEISHU_ORG_DEPARTMENT_PAGE_SIZE":"2"};
    for (const [key, value] of Object.entries(endpoints)) {
        if (parsed[key] !== value) throw new Error('Managed R2M controlled upstream mismatch: ' + key);
    }
    if (parsed.ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY !== parsed.JWT_SECRET || parsed.POMS_ATTACHMENT_LOCAL_ROOT !== `/home/wangzishi/.local/share/poms-r2m/objects/${backend}/server01`) throw new Error('Managed R2M attachment runtime mismatch');
    const childEnv = {};
    const systemKeys = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA', 'LANG', 'LC_ALL', 'PNPM_HOME']);
    for (const [key, value] of Object.entries(env)) {
        if (systemKeys.has(key.toUpperCase()) && typeof value === 'string') childEnv[key] = value;
    }
    Object.assign(childEnv, parsed, { POMS_ENV_FILE: envFile, NX_DAEMON: 'false', NX_SKIP_NX_CACHE: 'true', NO_PROXY: 'localhost,127.0.0.1,::1', no_proxy: 'localhost,127.0.0.1,::1' });
    return { childEnv, host: parsed.HOST, port: Number(parsed.PORT), envFile, database };
}

module.exports = { loadManagedEnvironment };
