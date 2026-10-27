'use strict';

const { createHash } = require('node:crypto');
const { realpathSync } = require('node:fs');
const path = require('node:path');

const workspaceRoot = path.resolve(__dirname, '../..');
const backends = new Set(['nest', 'rust']);
const accounts = new Set(['admin', 'viewer']);
const sessionActions = new Set(['session-due', 'session-non-due', 'expire-idle', 'expire-absolute', 'revoke', 'session-bump-version', 'snapshot']);
const accountActions = new Set(['disable', 'restore', 'permissions-none', 'permissions-and-partial', 'permissions-and-full']);
const actions = new Set(['prepare', ...sessionActions, ...accountActions, 'cleanup']);
const orgActions = new Set([
    'org-plan',
    'org-adopt',
    'org-snapshot',
    'org-bump-version',
    'org-null-description',
    'org-delete-owned-leaf',
    'org-set-inactive',
    'org-set-active',
    'org-max-order',
    'org-negative-order',
    'org-membership-matrix',
    'org-sort-ties'
]);
const { orgFixtureSlots } = require('./org-fixture-spec.cjs');
for (const action of orgActions) actions.add(action);
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
    return Object.freeze({ username: `r2c_${account}_${runId.replaceAll('-', '')}`, password: `R2C_${runId}_synthetic_only` });
}
function fixtureRequestIdentity(runId) {
    validateRunId(runId);
    return Object.freeze({ requestId: `r2c:${runId}`, userAgent: `poms-r2c-fixture/${runId}` });
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
    const keys = new Set(['formatVersion', 'runId', 'backend', 'action', 'account', 'sessionToken', 'orgSlot', 'parentSlot']);
    if (Object.keys(value).some((key) => !keys.has(key))) fail('unknown_field');
    if (value.formatVersion !== 1) fail('invalid_format');
    validateRunId(value.runId);
    if (!backends.has(value.backend)) fail('invalid_backend');
    if (!actions.has(value.action)) fail('invalid_action');
    if (value.action === 'prepare' || value.action === 'cleanup' || orgActions.has(value.action)) {
        if (value.account !== 'none') fail('invalid_account');
    } else if (!accounts.has(value.account)) fail('invalid_account');
    let sessionHash;
    if (sessionActions.has(value.action)) {
        if (typeof value.sessionToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value.sessionToken)) fail('invalid_session_token');
        sessionHash = createHash('sha256').update(value.sessionToken, 'utf8').digest('hex');
    } else if (Object.hasOwn(value, 'sessionToken')) fail('unexpected_session_token');
    if (orgActions.has(value.action)) {
        if (!orgFixtureSlots.includes(value.orgSlot)) fail('invalid_org_slot');
        if ((value.action === 'org-membership-matrix' && value.orgSlot !== 'main') || (value.action === 'org-sort-ties' && value.orgSlot !== 'tie-a')) fail('invalid_org_slot');
    } else if (Object.hasOwn(value, 'orgSlot')) fail('unexpected_org_slot');
    if (Object.hasOwn(value, 'parentSlot') && (value.action !== 'org-plan' || !orgFixtureSlots.includes(value.parentSlot) || value.parentSlot === value.orgSlot)) fail('invalid_parent_slot');
    return Object.freeze({
        ...(Object.hasOwn(value, 'parentSlot') ? { parentSlot: value.parentSlot } : {}),
        formatVersion: 1,
        runId: value.runId,
        backend: value.backend,
        action: value.action,
        account: value.account,
        ...(sessionHash ? { sessionHash } : {}),
        ...(orgActions.has(value.action) ? { orgSlot: value.orgSlot } : {})
    });
}
function fixtureCommand({ platform = process.platform, cwd = workspaceRoot } = {}) {
    if (!['win32', 'linux'].includes(platform)) fail('unsupported_platform');
    if (!path.isAbsolute(cwd) || realpathSync(cwd) !== realpathSync(workspaceRoot)) fail('invalid_fixture_workspace');
    const allowed = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA', 'LANG', 'LC_ALL']);
    const env = {};
    for (const [key, value] of Object.entries(process.env)) if (allowed.has(key.toUpperCase()) && typeof value === 'string') env[key] = value;
    return Object.freeze(
        platform === 'win32'
            ? { executable: 'wsl.exe', args: ['--distribution', 'Debian', '--user', 'wangzishi', '--cd', '/home/wangzishi/projects/poms-rust-r2c', '--', 'bash', 'tools/rust-r2c/fixture.sh'], cwd: workspaceRoot, env }
            : { executable: process.execPath, args: [path.join(workspaceRoot, 'tools/rust-r2c/fixture-cli.mjs')], cwd: workspaceRoot, env }
    );
}

module.exports = { FixtureError, fixtureCredentials, fixtureRequestIdentity, fixtureCommand, parseFixtureRequest };
