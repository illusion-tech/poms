'use strict';
const { fixtureCommand } = require('./fixture-protocol.cjs');
const path = require('node:path');

const steps = Object.freeze([
    'admin-reject-minimum', 'viewer-reject-minimum',
    'admin-edit', 'viewer-edit',
    'admin-deactivate', 'admin-activate', 'viewer-deactivate', 'viewer-activate',
    'admin-retain-all', 'viewer-minimum-only', 'viewer-readd-original'
]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const maxLeaseMs = 600000;
const maxMessageBytes = 16384;
function reject() { throw new Error('system_lease_protocol'); }
function parseMessage(bytes) {
    if (!Buffer.isBuffer(bytes) || bytes.length < 2 || bytes.length > maxMessageBytes) reject();
    let value;
    try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { reject(); }
    if (!value || Array.isArray(value) || value.formatVersion !== 1 || !uuid.test(value.runId) ||
        !['nest','rust'].includes(value.backend) || !['acquire','before','after','release'].includes(value.action) ||
        !Number.isSafeInteger(value.sequence) || value.sequence < 0 || value.sequence > 128) reject();
    const expected = ['formatVersion','runId','backend','action','sequence'];
    if (value.action === 'acquire') {
        if (value.sequence !== 0) reject();
    } else {
        expected.push('leaseId');
        if (!uuid.test(value.leaseId) || value.sequence === 0) reject();
    }
    if (value.action === 'before' || value.action === 'after') {
        expected.push('step');
        if (!steps.includes(value.step)) reject();
    }
    if (Object.keys(value).sort().join(',') !== expected.sort().join(',')) reject();
    return value;
}
function systemLeaseCommand(options) {
    const command = fixtureCommand(options);
    if ((options?.platform ?? process.platform) === 'win32') {
        return { ...command, args: ['--distribution','Debian','--user','wangzishi','--cd','/home/wangzishi/projects/poms-rust-r2b','--','bash','tools/rust-r2b/system-lease.sh'] };
    }
    return { ...command, args: [path.join(command.cwd, 'tools/rust-r2b/system-lease.mjs')] };
}
module.exports = { steps, uuid, maxLeaseMs, maxMessageBytes, parseMessage, systemLeaseCommand };
