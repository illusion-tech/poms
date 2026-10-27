import { randomUUID } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fail } from './fixture-guard.mjs';

const require = createRequire(import.meta.url);
const { fixtureCredentials } = require('./fixture-protocol.cjs');
const { orgFixtureSpec, orgFixtureSlots } = require('./org-fixture-spec.cjs');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const fields = ['formatVersion', 'runId', 'backend', 'state', 'accounts', 'orgs'];
const accountFields = ['account', 'userId', 'roleId', 'orgId', 'username', 'roleKey', 'orgCode'];
export function validateJournal(value, request) {
    if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        Object.keys(value).length !== fields.length + (Object.hasOwn(value, 'membershipMatrix') ? 1 : 0) ||
        fields.some((key) => !Object.hasOwn(value, key)) ||
        value.formatVersion !== 3 ||
        value.runId !== request.runId ||
        value.backend !== request.backend ||
        !['planned', 'prepared', 'cleaned'].includes(value.state) ||
        !Array.isArray(value.accounts) ||
        value.accounts.length !== 2
    )
        fail('invalid_journal');
    const ids = [];
    for (const [index, account] of value.accounts.entries()) {
        const name = ['admin', 'viewer'][index];
        if (
            !account ||
            Object.keys(account).length !== accountFields.length ||
            accountFields.some((key) => !Object.hasOwn(account, key)) ||
            account.account !== name ||
            account.username !== fixtureCredentials(request.runId, name).username ||
            account.roleKey !== `r2c_${name}_${request.runId}` ||
            account.orgCode !== `r2c_${name}_${request.runId}`
        )
            fail('invalid_journal');
        for (const key of ['userId', 'roleId', 'orgId']) {
            if (typeof account[key] !== 'string' || !uuid.test(account[key])) fail('invalid_journal');
            ids.push(account[key]);
        }
    }
    if (new Set(ids).size !== ids.length) fail('invalid_journal');
    if (!Array.isArray(value.orgs) || value.orgs.length > orgFixtureSlots.length) fail('invalid_journal');
    const seenSlots = new Set();
    for (const org of value.orgs) {
        if (!org || Object.keys(org).sort().join(',') !== 'deleted,initialCode,orgId,parentSlot,slot' || !orgFixtureSlots.includes(org.slot) || seenSlots.has(org.slot)) fail('invalid_journal');
        if (org.initialCode !== orgFixtureSpec(request.runId, org.slot).databaseCode || (org.orgId !== null && (!uuid.test(org.orgId) || ids.includes(org.orgId))) || typeof org.deleted !== 'boolean' || (org.deleted && org.orgId === null))
            fail('invalid_journal');
        if (org.parentSlot !== null && (!seenSlots.has(org.parentSlot) || !value.orgs.some((parent) => parent.slot === org.parentSlot && parent.orgId !== null))) fail('invalid_journal');
        seenSlots.add(org.slot);
        if (org.orgId !== null) ids.push(org.orgId);
    }
    if (Object.hasOwn(value, 'membershipMatrix')) {
        const matrix = value.membershipMatrix;
        if (!matrix || Object.keys(matrix).sort().join(',') !== 'primaryId,revokedId,secondaryId,unknownId') fail('invalid_journal');
        for (const id of Object.values(matrix)) {
            if (typeof id !== 'string' || !uuid.test(id) || ids.includes(id)) fail('invalid_journal');
            ids.push(id);
        }
        if (!['main', 'child'].every((slot) => value.orgs.some((org) => org.slot === slot && org.orgId !== null && !org.deleted))) fail('invalid_journal');
    }
    return value;
}
function privateDirectory(directory, create = false) {
    if (!existsSync(directory) && create) mkdirSync(directory, { mode: 0o700 });
    const stat = lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)) fail('journal_directory');
}
export function journalStore(request, privateRoot = '/r2c-private') {
    if (!uuid.test(request.runId) || !['nest', 'rust'].includes(request.backend)) fail('invalid_journal_target');
    privateDirectory(privateRoot);
    const directory = join(privateRoot, 'runs');
    privateDirectory(directory, true);
    const path = join(directory, `${request.backend}-${request.runId}.json`);
    if (resolve(path) !== path) fail('journal_path');
    function read() {
        let stat;
        try {
            stat = lstatSync(path);
        } catch (error) {
            if (error.code === 'ENOENT') return undefined;
            throw error;
        }
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16384 || (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)) fail('journal_file');
        let value;
        try {
            value = JSON.parse(readFileSync(path, 'utf8'));
        } catch {
            fail('invalid_journal');
        }
        return validateJournal(value, request);
    }
    function write(value) {
        validateJournal(value, request);
        if (existsSync(path)) read();
        const temporary = `${path}.${randomUUID()}.tmp`;
        let fd;
        try {
            fd = openSync(temporary, 'wx', 0o600);
            writeFileSync(fd, `${JSON.stringify(value)}\n`);
            fsyncSync(fd);
            closeSync(fd);
            fd = undefined;
            renameSync(temporary, path);
            if (process.platform !== 'win32') {
                const directoryFd = openSync(directory, 'r');
                try {
                    fsyncSync(directoryFd);
                } finally {
                    closeSync(directoryFd);
                }
            }
        } finally {
            if (fd !== undefined) closeSync(fd);
            if (existsSync(temporary)) unlinkSync(temporary);
        }
    }
    return { read, write };
}
export function plannedJournal(request) {
    return {
        formatVersion: 3,
        runId: request.runId,
        backend: request.backend,
        state: 'planned',
        orgs: [],
        accounts: ['admin', 'viewer'].map((account) => ({
            account,
            userId: randomUUID(),
            roleId: randomUUID(),
            orgId: randomUUID(),
            username: fixtureCredentials(request.runId, account).username,
            roleKey: `r2c_${account}_${request.runId}`,
            orgCode: `r2c_${account}_${request.runId}`
        }))
    };
}
