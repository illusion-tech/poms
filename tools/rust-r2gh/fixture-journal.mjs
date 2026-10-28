import { randomUUID } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { FixtureError, fixtureCredentials, userFixtureSpec, accounts, userSlots, referenceSlots } = require('./fixture-protocol.cjs');
const fail = (code) => {
    throw new FixtureError(code);
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function exact(value, fields) {
    return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === fields.toSorted().join(',');
}
export function validateJournal(j, request) {
    if (!exact(j, ['formatVersion', 'runId', 'backend', 'state', 'accounts', 'users', 'roles', 'orgs']) || j.formatVersion !== 1 || j.runId !== request.runId || j.backend !== request.backend || !['planned', 'prepared', 'cleaned'].includes(j.state))
        fail('invalid_journal');
    const ids = [];
    for (const kind of ['roles', 'orgs']) {
        if (!Array.isArray(j[kind]) || j[kind].length !== referenceSlots.length) fail('invalid_journal');
        for (const [i, row] of j[kind].entries()) {
            if (!exact(row, ['slot', 'id', 'key']) || row.slot !== referenceSlots[i] || !uuid.test(row.id) || row.key !== `r2gh_${kind}_${row.slot}_${j.runId}`) fail('invalid_journal');
            ids.push(row.id);
        }
    }
    if (!Array.isArray(j.accounts) || j.accounts.length !== 2) fail('invalid_journal');
    for (const [i, a] of j.accounts.entries()) {
        if (
            !exact(a, ['account', 'userId', 'username', 'roleId', 'orgId']) ||
            a.account !== accounts[i] ||
            a.username !== fixtureCredentials(j.runId, a.account).username ||
            !uuid.test(a.userId) ||
            a.roleId !== j.roles[i].id ||
            a.orgId !== j.orgs[i].id
        )
            fail('invalid_journal');
        ids.push(a.userId);
    }
    if (!Array.isArray(j.users) || j.users.length > userSlots.length) fail('invalid_journal');
    const seen = new Set();
    for (const u of j.users) {
        if (!exact(u, ['slot', 'username', 'userId']) || !userSlots.includes(u.slot) || seen.has(u.slot) || u.username !== userFixtureSpec(j.runId, u.slot).username || (u.userId !== null && !uuid.test(u.userId))) fail('invalid_journal');
        seen.add(u.slot);
        if (u.userId !== null) ids.push(u.userId);
    }
    if (new Set(ids).size !== ids.length) fail('invalid_journal');
    return j;
}
function privateDirectory(dir, create = false) {
    if (!existsSync(dir) && create) mkdirSync(dir, { mode: 0o700 });
    const s = lstatSync(dir);
    if (!s.isDirectory() || s.isSymbolicLink() || (process.platform !== 'win32' && (s.mode & 0o077) !== 0)) fail('journal_directory');
}
export function journalStore(request, privateRoot = '/r2gh-private') {
    if (!uuid.test(request.runId) || !['nest', 'rust'].includes(request.backend)) fail('invalid_journal_target');
    privateDirectory(privateRoot);
    const dir = join(privateRoot, 'runs');
    privateDirectory(dir, true);
    const file = join(dir, `${request.backend}-${request.runId}.json`);
    if (resolve(file) !== file) fail('journal_path');
    function read() {
        let s;
        try {
            s = lstatSync(file);
        } catch (e) {
            if (e.code === 'ENOENT') return;
            throw e;
        }
        if (!s.isFile() || s.isSymbolicLink() || s.size > 131072 || (process.platform !== 'win32' && (s.mode & 0o077) !== 0)) fail('journal_file');
        let j;
        try {
            j = JSON.parse(readFileSync(file, 'utf8'));
        } catch {
            fail('invalid_journal');
        }
        return validateJournal(j, request);
    }
    function write(j) {
        validateJournal(j, request);
        if (existsSync(file)) read();
        const tmp = `${file}.${randomUUID()}.tmp`;
        let fd;
        try {
            fd = openSync(tmp, 'wx', 0o600);
            writeFileSync(fd, JSON.stringify(j) + '\n');
            fsyncSync(fd);
            closeSync(fd);
            fd = undefined;
            renameSync(tmp, file);
            if (process.platform !== 'win32') {
                const d = openSync(dir, 'r');
                try {
                    fsyncSync(d);
                } finally {
                    closeSync(d);
                }
            }
        } finally {
            if (fd !== undefined) closeSync(fd);
            if (existsSync(tmp)) unlinkSync(tmp);
        }
    }
    return { read, write };
}
export function plannedJournal(request) {
    const roles = referenceSlots.map((slot) => ({ slot, id: randomUUID(), key: `r2gh_roles_${slot}_${request.runId}` }));
    const orgs = referenceSlots.map((slot) => ({ slot, id: randomUUID(), key: `r2gh_orgs_${slot}_${request.runId}` }));
    return {
        formatVersion: 1,
        runId: request.runId,
        backend: request.backend,
        state: 'planned',
        accounts: accounts.map((account, i) => ({ account, userId: randomUUID(), username: fixtureCredentials(request.runId, account).username, roleId: roles[i].id, orgId: orgs[i].id })),
        users: [],
        roles,
        orgs
    };
}
