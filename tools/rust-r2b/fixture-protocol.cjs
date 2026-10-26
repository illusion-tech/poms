'use strict';

const { createHash } = require('node:crypto');
const { realpathSync } = require('node:fs');
const path = require('node:path');

const workspaceRoot = path.resolve(__dirname, '../..');
const backends = new Set(['nest', 'rust']);
const accounts = new Set(['admin', 'viewer']);
const sessionActions = new Set(['session-due', 'session-non-due', 'expire-idle', 'expire-absolute', 'revoke', 'snapshot']);
const accountActions = new Set(['disable', 'restore', 'permissions-none', 'permissions-and-partial', 'permissions-and-full']);
const actions = new Set(['prepare', ...sessionActions, ...accountActions, 'cleanup']);
const roleActions = new Set(['role-plan','role-adopt','role-snapshot','role-bind-viewer','role-insert-historical','role-set-system']);
const { roleFixtureSlots } = require('./role-fixture-spec.cjs');
for (const action of roleActions) actions.add(action);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

class FixtureError extends Error {
    constructor(code) {
        super(code);
        this.name = 'FixtureError';
        this.code = code;
    }
}
function fail(code) {
    throw new FixtureError(code);
}
function validateRunId(runId) {
    if (typeof runId !== 'string' || !uuid.test(runId)) fail('invalid_run_id');
}
function fixtureCredentials(runId, account) {
    validateRunId(runId);
    if (!accounts.has(account)) fail('invalid_account');
    return Object.freeze({ username: `r2b_${account}_${runId.replaceAll('-', '')}`, password: `R2B_${runId}_synthetic_only` });
}
function fixtureRequestIdentity(runId) {
    validateRunId(runId);
    return Object.freeze({ requestId: `r2b:${runId}`, userAgent: `poms-r2b-fixture/${runId}` });
}
function parseFixtureRequest(bytes) {
    if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > 16384) fail('invalid_input_size');
    let value;
    try {
        value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch {
        fail('invalid_json');
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail('invalid_request');
    const keys = new Set(['formatVersion', 'runId', 'backend', 'action', 'account', 'sessionToken', 'roleSlot']);
    if (Object.keys(value).some((key) => !keys.has(key))) fail('unknown_field');
    if (value.formatVersion !== 1) fail('invalid_format');
    validateRunId(value.runId);
    if (!backends.has(value.backend)) fail('invalid_backend');
    if (!actions.has(value.action)) fail('invalid_action');
    if (value.action === 'prepare' || value.action === 'cleanup' || roleActions.has(value.action)) {
        if (value.account !== 'none') fail('invalid_account');
    } else if (!accounts.has(value.account)) fail('invalid_account');
    let sessionHash;
    if (sessionActions.has(value.action)) {
        if (typeof value.sessionToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value.sessionToken)) fail('invalid_session_token');
        sessionHash = createHash('sha256').update(value.sessionToken, 'utf8').digest('hex');
    } else if (Object.hasOwn(value, 'sessionToken')) fail('unexpected_session_token');
    if (roleActions.has(value.action)) {
        if (!roleFixtureSlots.includes(value.roleSlot)) fail('invalid_role_slot');
    } else if (Object.hasOwn(value, 'roleSlot')) fail('unexpected_role_slot');
    return Object.freeze({ formatVersion: 1, runId: value.runId, backend: value.backend, action: value.action, account: value.account, ...(sessionHash ? { sessionHash } : {}), ...(roleActions.has(value.action) ? { roleSlot: value.roleSlot } : {}) });
}
function fixtureCommand({ platform = process.platform, cwd = workspaceRoot } = {}) {
    if (!['win32', 'linux'].includes(platform)) fail('unsupported_platform');
    if (!path.isAbsolute(cwd) || realpathSync(cwd) !== realpathSync(workspaceRoot)) fail('invalid_fixture_workspace');
    const allowed = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA', 'LANG', 'LC_ALL']);
    const env = {};
    for (const [key, value] of Object.entries(process.env)) if (allowed.has(key.toUpperCase()) && typeof value === 'string') env[key] = value;
    return Object.freeze(
        platform === 'win32'
            ? { executable: 'wsl.exe', args: ['--distribution', 'Debian', '--user', 'wangzishi', '--cd', '/home/wangzishi/projects/poms-rust-r2b', '--', 'bash', 'tools/rust-r2b/fixture.sh'], cwd: workspaceRoot, env }
            : { executable: process.execPath, args: [path.join(workspaceRoot, 'tools/rust-r2b/fixture-cli.mjs')], cwd: workspaceRoot, env }
    );
}

module.exports = { FixtureError, fixtureCredentials, fixtureRequestIdentity, fixtureCommand, parseFixtureRequest };
