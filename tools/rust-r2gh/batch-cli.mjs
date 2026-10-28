import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import path from 'node:path';
import { OwnedFixture } from './owned-fixture.mjs';
const require = createRequire(import.meta.url),
    { parseBatchRequest } = require('./batch-protocol.cjs'),
    { FixtureError } = require('./fixture-protocol.cjs');
let fixture;
const sanitize = (value) => {
    if (Array.isArray(value)) return value.map(sanitize);
    if (value && typeof value === 'object')
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, /encrypted/i.test(key) && typeof item === 'string' ? { sanitized: true, length: item.length, sha256: createHash('sha256').update(item).digest('hex') } : sanitize(item)])
        );
    return value;
};
try {
    assert.equal(process.platform, 'linux');
    assert.equal(process.argv.length, 2);
    const chunks = [];
    let size = 0;
    for await (const chunk of process.stdin) {
        size += chunk.length;
        assert(size <= 32768);
        chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks),
        request = parseBatchRequest(bytes);
    bytes.fill(0);
    for (const chunk of chunks) chunk.fill(0);
    fixture = await OwnedFixture.connect(request.backend, request.runId);
    let result;
    if (request.action === 'prepare') {
        const extension = await fixture.prepare();
        result = { ...fixture.lastPrepareCounts, state: 'prepared', fixture: fixture.baseStore.read(), extension };
    } else if (request.action === 'cleanup') result = { ...(await fixture.cleanup()), state: 'cleaned' };
    else if (request.action === 'plan') {
        const intent = await fixture.plan(request.key, request.table, request.selector, request.max);
        result = { matched: 1, changed: 0, state: 'planned', intent };
    } else if (request.action === 'plan-derived') {
        await fixture.planDerived(request.key, request.table, request.parentKey, request.column, request.max);
        result = { matched: 1, changed: 0, state: 'planned' };
    } else if (request.action === 'adopt') {
        const rows = await fixture.adopt(request.key);
        result = { matched: rows.length, changed: 0, state: 'adopted', adoptedIds: rows.map((row) => row.id) };
    } else if (request.action === 'facts') result = { matched: 1, changed: 0, state: 'facts', facts: sanitize(await fixture.facts()), fixture: fixture.baseStore.read(), extension: fixture.describe() };
    else if (request.action === 'permissions') {
        assert(request.permissions.every((permission) => fixture.permissions.includes(permission)));
        const account = fixture.baseStore.read().accounts.find((account) => account.account === request.account);
        assert(account);
        await fixture.client.query('BEGIN');
        try {
            const owned = (await fixture.client.query('select role_key from poms.role where id=$1 for update', [account.roleId])).rows;
            assert.equal(owned.length, 1);
            assert(fixture.baseStore.read().roles.some((role) => role.id === account.roleId && role.key === owned[0].role_key));
            const removed = await fixture.client.query('delete from poms.role_permission_assignment where role_id=$1', [account.roleId]);
            for (const permission of request.permissions) await fixture.client.query('insert into poms.role_permission_assignment(role_id,permission_key)values($1,$2)', [account.roleId, permission]);
            await fixture.client.query('COMMIT');
            result = { matched: 1, changed: removed.rowCount + request.permissions.length, state: 'permissions' };
        } catch (error) {
            await fixture.client.query('ROLLBACK');
            throw error;
        }
    } else if (request.action === 'configure-upstream') {
        const start = path.resolve('tmp/rust-r2gh/upstream', request.upstreamTag, 'start.json'),
            receipt = JSON.parse(readFileSync(start));
        assert.equal(receipt.tag, request.upstreamTag);
        process.kill(receipt.pid, 0);
        const planFile = path.resolve('tmp/rust-r2gh/upstream', request.upstreamTag, 'plan.json');
        assert.equal(receipt.planFile, planFile);
        const context = fixture.describe(),
            compact = request.runId.replaceAll('-', ''),
            a = 'gh-a-' + compact,
            b = 'gh-b-' + compact,
            c = 'gh-c-' + compact,
            items = [
                { open_department_id: a, name: 'GH Parent ' + compact, order: 1 },
                { open_department_id: b, name: 'GH Other ' + compact, order: 2 }
            ],
            plan = {
                formatVersion: 1,
                caseId: request.runId + ':browser',
                appId: context.clientId,
                secretSha256: createHash('sha256').update(`synthetic-gh-secret-${compact}`).digest('hex'),
                subject: context.subject,
                code: 'gh-synthetic-code',
                tree: { 0: items, 'gh-root': items, [a]: [{ open_department_id: c, name: 'GH Child ' + compact, order: 3 }], [b]: [], [c]: [] }
            };
        const temp = planFile + '.' + randomUUID() + '.tmp';
        writeFileSync(temp, JSON.stringify(plan) + '\n', { flag: 'wx', mode: 0o600 });
        renameSync(temp, planFile);
        result = { matched: 1, changed: 0, state: 'controlled-upstream-configured', externalDepartmentIds: [a, b, c] };
    } else result = await fixture.base(request.action, request.account, request);
    process.stdout.write(JSON.stringify({ formatVersion: 1, runId: request.runId, backend: request.backend, action: request.action, ...result }) + '\n');
} catch (error) {
    process.stderr.write(JSON.stringify({ formatVersion: 1, code: error instanceof FixtureError ? error.code : 'guarded_gh_fixture_failed', ...(error instanceof assert.AssertionError ? { assertion: error.message } : {}) }) + '\n');
    process.exitCode = 1;
} finally {
    if (fixture) await fixture.close();
}
