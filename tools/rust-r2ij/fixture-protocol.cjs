'use strict';
const { createHash } = require('node:crypto');
const { realpathSync } = require('node:fs');
const path = require('node:path');
const workspaceRoot = path.resolve(__dirname, '../..');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const accounts = ['admin', 'viewer'];
const userSlots = Array.from({ length: 256 }, (_, i) => `u${String(i).padStart(3, '0')}`);
const referenceSlots = ['admin', 'viewer', 'alpha', 'inactive'];
const sessionActions = ['snapshot', 'session-due', 'session-non-due', 'session-bump-version', 'expire-idle', 'expire-absolute', 'revoke'];
const userActions = [
    'user-plan',
    'user-adopt',
    'user-snapshot',
    'user-set-active',
    'user-set-inactive',
    'user-bump-version',
    'user-profile-null',
    'user-profile-values',
    'user-profile-verified',
    'user-profile-unverified',
    'user-nullable-null-no-version',
    'user-nullable-values-no-version',
    'user-membership-matrix',
    'user-role-matrix',
    'user-null-last-login',
    'user-created-at',
    'user-membership-without-active-primary'
];
const referenceActions = ['role-set-active', 'role-set-inactive', 'role-delete-owned', 'role-duplicate-names', 'org-set-values', 'org-delete-owned'];
const accountActions = ['disable', 'restore', 'permissions-none', 'permissions-default', 'permissions-lead-write', 'permissions-lead-assign', 'permissions-project-write', 'permissions-users-manage', 'permissions-orgs-manage'];
const actions = new Set(['prepare', 'cleanup', 'facts', ...sessionActions, ...userActions, ...accountActions, ...referenceActions]);
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
function validateRunId(value) {
    if (typeof value !== 'string' || !uuid.test(value)) fail('invalid_run_id');
}
function fixtureCredentials(runId, account) {
    validateRunId(runId);
    if (!accounts.includes(account)) fail('invalid_account');
    return Object.freeze({ username: `r2ij_${account}_${runId.replaceAll('-', '')}`, password: `R2IJ_${runId}_synthetic_only` });
}
function fixtureRequestIdentity(runId) {
    validateRunId(runId);
    return Object.freeze({ requestId: `r2ij:${runId}`, userAgent: `poms-r2ij-fixture/${runId}` });
}
function userFixtureSpec(runId, slot) {
    validateRunId(runId);
    if (!userSlots.includes(slot)) fail('invalid_user_slot');
    return Object.freeze({ slot, username: `r2ij_${slot}_${runId.replaceAll('-', '')}`, displayName: `R2IJ ${slot} ${runId.slice(0, 8)}` });
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
    if (Object.keys(value).some((k) => !['formatVersion', 'runId', 'backend', 'action', 'account', 'sessionToken', 'userSlot', 'roleSlot', 'orgSlot', 'timeCase'].includes(k))) fail('unknown_field');
    if (value.formatVersion !== 1) fail('invalid_format');
    validateRunId(value.runId);
    if (!['nest', 'rust'].includes(value.backend)) fail('invalid_backend');
    if (!actions.has(value.action)) fail('invalid_action');
    const isUser = userActions.includes(value.action);
    const isReference = referenceActions.includes(value.action);
    if (['prepare', 'cleanup', 'facts'].includes(value.action) || isUser || isReference) {
        if (value.account !== 'none') fail('invalid_account');
    } else if (!accounts.includes(value.account)) fail('invalid_account');
    let sessionHash;
    if (sessionActions.includes(value.action)) {
        if (typeof value.sessionToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value.sessionToken)) fail('invalid_session_token');
        sessionHash = createHash('sha256').update(value.sessionToken).digest('hex');
    } else if (Object.hasOwn(value, 'sessionToken')) fail('unexpected_session_token');
    if (isUser) {
        const slots = ['user-plan', 'user-adopt'].includes(value.action) ? userSlots : [...accounts, ...userSlots];
        if (!slots.includes(value.userSlot)) fail('invalid_user_slot');
    } else if (Object.hasOwn(value, 'userSlot')) fail('unexpected_user_slot');
    const referenceKey = isReference ? (value.action.startsWith('role-') ? 'roleSlot' : 'orgSlot') : null;
    for (const key of ['roleSlot', 'orgSlot']) {
        if (key === referenceKey) {
            if (!referenceSlots.includes(value[key]) || ((value.action.endsWith('-delete-owned') || value.action === 'role-duplicate-names') && value[key] !== 'alpha')) fail('invalid_reference_slot');
        } else if (Object.hasOwn(value, key)) fail('unexpected_reference_slot');
    }
    if (value.action === 'user-created-at') {
        if (!['micro-low', 'micro-high', 'tie-first', 'tie-second'].includes(value.timeCase)) fail('invalid_time_case');
    } else if (Object.hasOwn(value, 'timeCase')) fail('unexpected_time_case');
    return Object.freeze({
        formatVersion: 1,
        runId: value.runId,
        backend: value.backend,
        action: value.action,
        account: value.account,
        ...(sessionHash ? { sessionHash } : {}),
        ...(isUser ? { userSlot: value.userSlot } : {}),
        ...(referenceKey ? { [referenceKey]: value[referenceKey] } : {}),
        ...(value.action === 'user-created-at' ? { timeCase: value.timeCase } : {})
    });
}
function fixtureCommand({ platform = process.platform, cwd = workspaceRoot } = {}) {
    if (!['win32', 'linux'].includes(platform)) fail('unsupported_platform');
    if (!path.isAbsolute(cwd) || realpathSync(cwd) !== realpathSync(workspaceRoot)) fail('invalid_fixture_workspace');
    const allowed = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA', 'LANG', 'LC_ALL']);
    const env = {};
    for (const [k, v] of Object.entries(process.env)) if (allowed.has(k.toUpperCase()) && typeof v === 'string') env[k] = v;
    return Object.freeze(
        platform === 'win32'
            ? { executable: 'wsl.exe', args: ['--distribution', 'Debian', '--user', 'wangzishi', '--cd', '/home/wangzishi/projects/poms-rust-r2ij', '--', 'bash', 'tools/rust-r2ij/fixture.sh'], cwd: workspaceRoot, env }
            : { executable: '/usr/bin/bash', args: [path.join(workspaceRoot, 'tools/rust-r2ij/fixture.sh')], cwd: workspaceRoot, env }
    );
}
module.exports = { FixtureError, fixtureCredentials, fixtureRequestIdentity, userFixtureSpec, fixtureCommand, parseFixtureRequest, accounts, userSlots, referenceSlots };
