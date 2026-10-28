'use strict';
const { parseFixtureRequest, FixtureError } = require('./fixture-protocol.cjs');
const fail = () => {
    throw new FixtureError('invalid_batch_request');
};
function parseBatchRequest(bytes) {
    let value;
    try {
        if (bytes.length > 32768) fail();
        value = JSON.parse(bytes.toString('utf8'));
    } catch {
        fail();
    }
    if (!value || Array.isArray(value) || value.formatVersion !== 1 || !['nest', 'rust'].includes(value.backend) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value.runId ?? '')) fail();
    const extra = {
        prepare: [],
        cleanup: [],
        facts: [],
        plan: ['key', 'table', 'selector', 'max'],
        adopt: ['key'],
        'plan-derived': ['key', 'table', 'parentKey', 'column', 'max'],
        'configure-upstream': ['upstreamTag'],
        permissions: ['account', 'permissions']
    }[value.action];
    if (!extra) return parseFixtureRequest(bytes);
    const keys = new Set(['formatVersion', 'runId', 'backend', 'action', 'account', ...extra]);
    if (Object.keys(value).some((key) => !keys.has(key)) || extra.some((key) => !Object.hasOwn(value, key))) fail();
    if (value.action !== 'permissions' && value.account !== undefined && value.account !== 'none') fail();
    if (['plan', 'adopt', 'plan-derived'].includes(value.action) && !/^[a-z0-9:-]{1,100}$/.test(value.key ?? '')) fail();
    if (['plan', 'plan-derived'].includes(value.action) && (!Number.isSafeInteger(value.max) || value.max < 1 || value.max > 2000)) fail();
    if (value.action === 'plan' && (!value.selector || typeof value.selector !== 'object' || Array.isArray(value.selector))) fail();
    if (value.action === 'configure-upstream' && !/^[a-z0-9-]{1,35}$/.test(value.upstreamTag ?? '')) fail();
    if (
        value.action === 'permissions' &&
        (!['admin', 'viewer'].includes(value.account) || !Array.isArray(value.permissions) || value.permissions.some((permission) => typeof permission !== 'string') || new Set(value.permissions).size !== value.permissions.length)
    )
        fail();
    return value;
}
module.exports = { parseBatchRequest };
