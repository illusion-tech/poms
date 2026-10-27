import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { normalizeRun, epochMicros, compareReports, validateOwnerCloseout } from './http-compat-compare.mjs';
import { assertCompleteCoverage, completeCasePlan, coverageManifest, dtoCases, frozenGolden, operationNames, requiredGroups } from './http-compat-cases.mjs';
import { expectedSessionVersionDelta } from './http-compat.mjs';

function fixture(backend = 'nest', shift = 0, providedRunId) {
    const runId = providedRunId ?? randomUUID(),
        actor = randomUUID(),
        viewer = randomUUID(),
        orgId = randomUUID(),
        secondId = randomUUID(),
        sessionId = randomUUID();
    const time = (milliseconds) => new Date(Date.UTC(2026, 9, 27) + shift + milliseconds).toISOString();
    const org = (id, slot) => ({
        id,
        name: `R2C ${slot} ${runId.slice(0, 8)}`,
        code: `r2c_${runId.replaceAll('-', '')}_${slot}`,
        description: null,
        parent_id: null,
        is_active: true,
        display_order: 0,
        row_version: 1,
        created_at: time(-1000),
        updated_at: time(-1000),
        created_by: null,
        updated_by: null
    });
    const main = org(orgId, 'main'),
        second = org(secondId, 'second');
    const summary = (row) => ({ id: row.id, name: row.name, code: row.code, description: row.description, parentId: row.parent_id, isActive: row.is_active, displayOrder: row.display_order, createdAt: row.created_at, updatedAt: row.updated_at });
    const session = { id: sessionId, rowVersion: 2, status: 'active', lastSeenAt: time(0), idleExpiresAt: time(900000), absoluteExpiresAt: time(28800000), updatedAt: time(0), revokedAt: null, revokedReason: null };
    const snapshot = { session, audits: [], securityEvents: [] };
    const fact = { org: main, memberships: [], children: [] };
    const organizationFacts = (rows, start = 1010, end = 1020) => ({ database: 'poms_r2c_' + backend, readOnly: true, requestedIds: rows.map((row) => row.id), organizations: structuredClone(rows), startedAt: time(start), finishedAt: time(end) });
    const body = [summary(main), summary(second)],
        length = Buffer.byteLength(JSON.stringify(body));
    const row = {
        id: 'pure-list',
        group: 'business',
        operation: 'list',
        account: 'admin',
        monitorAccount: 'admin',
        due: false,
        method: 'GET',
        route: '/api/platform/org-units',
        request: {},
        startedAt: time(1000),
        finishedAt: time(1100),
        status: 200,
        response: body,
        responseOrgFacts: organizationFacts([main, second]),
        headers: { 'content-type': 'application/json; charset=utf-8', 'content-length': String(length) },
        bodyByteLength: length,
        setCookieCount: 0,
        before: structuredClone(snapshot),
        after: structuredClone(snapshot),
        orgBefore: { main: structuredClone(fact) },
        orgAfter: { main: structuredClone(fact) },
        auditDelta: 0,
        securityDelta: 0,
        sessionVersionDelta: 0,
        orgVersionDeltas: { main: 0 },
        expected: { status: 200, auditDelta: 0, securityDelta: 0, sessionVersionDelta: 0, orgVersionDeltas: { main: 0 } }
    };
    return {
        formatVersion: 1,
        result: 'observed',
        backend,
        platform: 'linux',
        runId,
        identities: { admin: actor, viewer, orgs: { main: orgId, second: secondId } },
        baselineOrganizations: structuredClone(body),
        baselineOrganizationFacts: organizationFacts([main, second], 20, 30),
        baselineOrganizationRequest: { startedAt: time(10), finishedAt: time(100) },
        regressionRoles: [],
        observations: [row],
        fixtureActions: [],
        sourceFiles: [{ file: 'frozen', normalizedLfSha256: '1'.repeat(64) }],
        serverReceipt: {
            sha256: 'a'.repeat(64),
            value: {
                backend,
                origin: backend === 'nest' ? 'http://127.0.0.1:5300' : 'http://127.0.0.1:5301',
                pid: 123,
                binarySha256: 'b'.repeat(64),
                sourceHead: '705973835d4c823ae8aa3988976e8d6a13b31dfe',
                aliveBefore: true,
                processIdentity: { pid: 123, startTicks: '123456' },
                sourceFiles: [{ file: 'apps/poms-api-rust/src/lib.rs', sha256: 'd'.repeat(64) }]
            }
        },
        cleanupCompleted: true,
        zeroResidual: { matched: 0, changed: 0 },
        coverage: { complete: false, groups: [], expectedCaseIds: ['pure-list'] }
    };
}
test('only registered identities and validated time instants normalize; complete response order survives', () => {
    const left = fixture(),
        right = fixture('rust', 86400000);
    assert.deepEqual(normalizeRun(right), normalizeRun(left));
    const reversed = structuredClone(right);
    reversed.observations[0].response.reverse();
    reversed.observations[0].responseOrgFacts.requestedIds.reverse();
    reversed.observations[0].responseOrgFacts.organizations.reverse();
    assert.notDeepEqual(normalizeRun(reversed), normalizeRun(left), 'Flat and tree arrays must never sort away differences');
    const unknown = structuredClone(right);
    unknown.observations[0].response[0].id = randomUUID();
    assert.throws(() => normalizeRun(unknown));
});
test('status, versions, audit history, membership history and wire-to-database dates cannot disappear', () => {
    for (const mutate of [
        (run) => {
            run.observations[0].status = 201;
        },
        (run) => {
            run.observations[0].after.session.rowVersion++;
        },
        (run) => {
            run.observations[0].orgAfter.main.org.row_version++;
        },
        (run) => {
            run.observations[0].orgAfter.main.org.created_at = '2020-01-01T00:00:00Z';
        },
        (run) => {
            run.observations[0].response[0].updatedAt = '2020-01-01T00:00:00.000Z';
        },
        (run) => {
            run.observations[0].orgAfter.main.org.updated_at = '2020-01-01T00:00:00Z';
        },
        (run) => {
            run.observations[0].headers['content-length'] = '1';
        }
    ]) {
        const value = fixture();
        mutate(value);
        assert.throws(() => normalizeRun(value));
    }
    const history = fixture();
    history.observations[0].before.audits.push({ id: randomUUID(), eventType: 'old' });
    assert.throws(() => normalizeRun(history));
    const memberships = fixture(),
        member = { id: randomUUID(), user_id: memberships.identities.admin, org_unit_id: memberships.identities.orgs.main, membership_type: 'primary', status: 'active', assigned_at: '2026-10-26T00:00:00Z' };
    memberships.observations[0].orgBefore.main.memberships = [member];
    memberships.observations[0].orgAfter.main.memberships = [{ ...member, assigned_at: '2026-10-25T00:00:00Z' }];
    assert.throws(() => normalizeRun(memberships));
});
test('timestamps preserve PG microseconds and reject malformed or unzoned values', () => {
    assert.equal(epochMicros('2026-01-01T08:00:00.1239+08:00') - epochMicros('2026-01-01T00:00:00.1231Z'), 800n);
    for (const value of ['not-time', '2026-01-01', '2026-01-01T00:00:00', '2026-01-01T00:00:00.1234567Z', '2026-02-30T00:00:00Z']) assert.throws(() => epochMicros(value));
});
test('successful HEAD validates its own GET length and never inherits a response body', () => {
    const run = fixture(),
        row = run.observations[0];
    row.method = 'HEAD';
    row.headReferenceOrgFacts = structuredClone(row.responseOrgFacts);
    row.headReference = { status: 200, body: row.response, headers: { 'content-length': row.headers['content-length'] }, bodyByteLength: row.bodyByteLength };
    row.responseOrgFacts.requestedIds = [];
    row.responseOrgFacts.organizations = [];
    row.response = null;
    row.bodyByteLength = 0;
    assert.doesNotThrow(() => normalizeRun(run));
    const wrongLength = structuredClone(run);
    wrongLength.observations[0].headReference.bodyByteLength++;
    assert.throws(() => normalizeRun(wrongLength));
    const body = structuredClone(run);
    body.observations[0].bodyByteLength = 1;
    assert.throws(() => normalizeRun(body));
});
test('renewal requires request-bound timestamps and the original capped idle expiry relation', () => {
    const run = fixture(),
        row = run.observations[0];
    const changed = new Date(Date.parse(row.startedAt) + 5).toISOString();
    row.due = true;
    row.after.session.lastSeenAt = changed;
    row.after.session.updatedAt = changed;
    row.after.session.idleExpiresAt = new Date(Date.parse(changed) + 900000).toISOString();
    row.after.session.rowVersion++;
    row.sessionVersionDelta = 1;
    row.expected.sessionVersionDelta = 1;
    assert.doesNotThrow(() => normalizeRun(run));
    const wrongExpiry = structuredClone(run);
    wrongExpiry.observations[0].after.session.idleExpiresAt = row.before.session.idleExpiresAt;
    assert.throws(() => normalizeRun(wrongExpiry));
    const outside = structuredClone(run);
    outside.observations[0].after.session.updatedAt = '2020-01-01T00:00:00.000Z';
    assert.throws(() => normalizeRun(outside));
});

test('a due permission/CSRF rejection consumes native touch plus security-event flush; the one-version expectation rejects the real two-version relation', () => {
    const run = fixture(),
        row = run.observations[0];
    Object.assign(row, { id: 'guard:forbidden:tree', group: 'guards', operation: 'tree', account: 'viewer', monitorAccount: 'viewer', due: true, route: '/api/platform/org-unit-tree', status: 403, securityDelta: 1, sessionVersionDelta: 2 });
    const at = (offset) => new Date(Date.parse(row.startedAt) + offset).toISOString();
    row.before.session.lastSeenAt = at(-61245);
    row.after.session.lastSeenAt = at(1);
    row.after.session.updatedAt = at(10);
    row.after.session.idleExpiresAt = at(900001);
    row.after.session.rowVersion = row.before.session.rowVersion + 2;
    row.after.securityEvents = [
        {
            id: randomUUID(),
            eventType: 'authz.permission.denied',
            actorId: run.identities.viewer,
            principal: `r2c_viewer_${run.runId.replaceAll('-', '')}`,
            requestId: 'r2c:' + run.runId,
            path: row.route,
            method: 'GET',
            permissionKey: 'platform:org-units:manage',
            result: 'blocked',
            details: { userPermissions: [], requiredPermissions: ['platform:org-units:manage'] },
            occurredAt: at(9)
        }
    ];
    row.response = { statusCode: 403, code: 'permission_denied', message: 'Insufficient permissions' };
    row.bodyByteLength = Buffer.byteLength(JSON.stringify(row.response));
    row.headers['content-length'] = String(row.bodyByteLength);
    row.responseOrgFacts.requestedIds = [];
    row.responseOrgFacts.organizations = [];
    row.expected.status = 403;
    row.expected.securityDelta = 1;
    row.expected.sessionVersionDelta = expectedSessionVersionDelta(row);
    assert.equal(row.expected.sessionVersionDelta, 2);
    assert.doesNotThrow(() => normalizeRun(run));
    const oldWrongExpectation = structuredClone(run);
    oldWrongExpectation.observations[0].expected.sessionVersionDelta = 1;
    assert.throws(() => normalizeRun(oldWrongExpectation), 'Preserve the measured two-version transition; never weaken the snapshot assertion');
    for (const [input, expected] of [
        [{ account: 'admin', due: true, auditDelta: 0, securityDelta: 1 }, 2],
        [{ account: 'admin', due: false, auditDelta: 0, securityDelta: 1 }, 0],
        [{ account: 'viewer', due: false, auditDelta: 0, securityDelta: 2 }, 0],
        [{ account: 'admin', due: true, auditDelta: 0, securityDelta: 0 }, 1],
        [{ account: 'none', due: true, securityDelta: 1 }, 0],
        [{ account: 'admin', due: true, parserFirst: true, securityDelta: 1 }, 0],
        [{ account: 'admin', due: true, auditDelta: 1 }, 2],
        [{ account: 'admin', due: true, committed: true }, 2],
        [{ account: 'admin', due: true, securityDelta: 1, sessionDelta: 1 }, 1]
    ])
        assert.equal(expectedSessionVersionDelta(input), expected);
});
test('a failed, incomplete, missing-cleanup or unowned pair is never a parity pass', () => {
    const left = fixture(),
        right = fixture('rust');
    const owner = (run) => ({
        ...run.serverReceipt.value,
        serverReceiptSha256: run.serverReceipt.sha256,
        result: 'pass',
        sourceUnchanged: true,
        aliveAfter: true,
        stopped: true,
        processIdentityAfter: structuredClone(run.serverReceipt.value.processIdentity),
        binarySha256After: run.serverReceipt.value.binarySha256,
        sourceFilesAfter: structuredClone(run.serverReceipt.value.sourceFiles)
    });
    assert.doesNotThrow(() => validateOwnerCloseout(left, owner(left)));
    assert.throws(() => validateOwnerCloseout(left, { ...owner(left), pid: 999 }));
    assert.throws(() => validateOwnerCloseout(left, { ...owner(left), aliveAfter: false }));
    for (const mutate of [
        (value) => {
            value.result = 'fail';
        },
        (value) => {
            value.sourceUnchanged = false;
        },
        (value) => {
            delete value.sourceUnchanged;
        },
        (value) => {
            delete value.processIdentityAfter;
        },
        (value) => {
            value.processIdentityAfter.startTicks = '999999';
        },
        (value) => {
            value.processIdentityAfter.pid++;
        },
        (value) => {
            value.binarySha256After = 'e'.repeat(64);
        },
        (value) => {
            value.sourceFilesAfter[0].sha256 = 'e'.repeat(64);
        },
        (value) => {
            delete value.sourceFilesAfter;
        }
    ]) {
        const value = owner(left);
        mutate(value);
        assert.throws(() => validateOwnerCloseout(left, value));
    }
    assert.throws(() => compareReports(left, right, { nest: owner(left), rust: owner(right) }), 'A matching prefix is incomplete');
    for (const mutate of [
        (run) => {
            run.result = 'fail';
        },
        (run) => {
            run.cleanupCompleted = false;
        },
        (run) => {
            run.zeroResidual.changed = 1;
        }
    ]) {
        const value = fixture();
        mutate(value);
        assert.throws(() => compareReports(value, right, { nest: owner(value), rust: owner(right) }));
    }
});

test('every un-watched list row and nested tree/detail/HEAD timestamp needs exact same-request database coverage', () => {
    for (const mutate of [
        (run) => {
            run.observations[0].response[1].createdAt = '2000-01-01T00:00:00.000Z';
        },
        (run) => {
            run.observations[0].response[1].updatedAt = '2000-01-01T00:00:00.000Z';
        },
        (run) => {
            run.observations[0].responseOrgFacts.organizations.pop();
        },
        (run) => {
            run.observations[0].responseOrgFacts.requestedIds.pop();
        },
        (run) => {
            run.observations[0].responseOrgFacts.organizations.push(structuredClone(run.observations[0].responseOrgFacts.organizations[0]));
        },
        (run) => {
            delete run.observations[0].responseOrgFacts;
        },
        (run) => {
            run.observations[0].responseOrgFacts.database = 'poms_r2b_nest';
        },
        (run) => {
            run.observations[0].responseOrgFacts.readOnly = false;
        },
        (run) => {
            run.observations[0].responseOrgFacts.startedAt = '2000-01-01T00:00:00.000Z';
        },
        (run) => {
            run.baselineOrganizations[1].createdAt = '2000-01-01T00:00:00.000Z';
        }
    ]) {
        const run = fixture();
        // Reproduce B's query:list watch=[] gap exactly.
        run.observations[0].orgBefore = {};
        run.observations[0].orgAfter = {};
        run.observations[0].orgVersionDeltas = {};
        run.observations[0].expected.orgVersionDeltas = {};
        mutate(run);
        assert.throws(() => normalizeRun(run));
    }
    const tree = fixture(),
        row = tree.observations[0];
    row.operation = 'tree';
    row.response[0].children = [{ ...row.response[1], children: [] }];
    row.response = [row.response[0]];
    assert.doesNotThrow(() => normalizeRun(tree));
    row.response[0].children[0].updatedAt = '2000-01-01T00:00:00.000Z';
    assert.throws(() => normalizeRun(tree));
    const detail = fixture(),
        detailRow = detail.observations[0];
    detailRow.operation = 'detail';
    detailRow.response = detailRow.response[1];
    detailRow.responseOrgFacts.requestedIds.shift();
    detailRow.responseOrgFacts.organizations.shift();
    assert.doesNotThrow(() => normalizeRun(detail));
    detailRow.response.updatedAt = '2000-01-01T00:00:00.000Z';
    assert.throws(() => normalizeRun(detail));
    const head = fixture(),
        headRow = head.observations[0];
    headRow.method = 'HEAD';
    headRow.headReferenceOrgFacts = structuredClone(headRow.responseOrgFacts);
    headRow.headReference = { status: 200, body: headRow.response, headers: { 'content-length': headRow.headers['content-length'] }, bodyByteLength: headRow.bodyByteLength };
    headRow.response = null;
    headRow.bodyByteLength = 0;
    headRow.responseOrgFacts.requestedIds = [];
    headRow.responseOrgFacts.organizations = [];
    assert.doesNotThrow(() => normalizeRun(head));
    headRow.headReference.body[1].createdAt = '2000-01-01T00:00:00.000Z';
    assert.throws(() => normalizeRun(head));
});

test('a complete declaration cannot hide a common prefix, missing case, invented case or eleven-row shell', () => {
    const complete = { coverage: { complete: true, ...coverageManifest() }, observations: completeCasePlan().map((row) => ({ ...row, status: row.operation === 'create' ? 201 : 200 })) };
    assert.doesNotThrow(() => assertCompleteCoverage(complete));
    const shellRows = requiredGroups.map((group, index) => ({ id: 'shell:' + group, group, operation: operationNames[index % operationNames.length], method: 'GET', status: 200 }));
    const shell = { coverage: { complete: true, ...coverageManifest(), expectedCaseIds: shellRows.map((row) => row.id) }, observations: shellRows };
    assert.equal(new Set(shellRows.map((row) => row.group)).size, 11);
    assert.equal(new Set(shellRows.map((row) => row.operation)).size, 8);
    assert.throws(() => assertCompleteCoverage(shell), 'B counterexample covers all groups and successful operations but omits the actual independent plan');
    for (const mutate of [
        (value) => {
            value.observations.pop();
            value.coverage.expectedCaseIds.pop();
        },
        (value) => {
            value.observations.splice(44, 1);
            value.coverage.expectedCaseIds.splice(44, 1);
        },
        (value) => {
            value.observations[0].id = value.coverage.expectedCaseIds[0] = 'invented';
        },
        (value) => {
            value.coverage.planSha256 = 'a'.repeat(64);
        },
        (value) => {
            value.observations[0].method = 'GET';
        },
        (value) => {
            value.observations = value.observations.slice(0, 11);
            value.coverage.expectedCaseIds = value.observations.map((row) => row.id);
        }
    ]) {
        const left = structuredClone(complete),
            right = structuredClone(complete);
        mutate(left);
        mutate(right);
        assert.deepEqual(left, right, 'Both runs can share the same omission');
        assert.throws(() => assertCompleteCoverage(left));
        assert.throws(() => assertCompleteCoverage(right));
    }
});

test('unknown uppercase, compact, braced, encoded and embedded UUID shapes fail closed; admitted known spelling stays distinct', () => {
    for (const spelling of [(id) => id, (id) => id.toUpperCase(), (id) => id.replaceAll('-', ''), (id) => '{' + id + '}', (id) => id.replace(/^./, (ch) => '%' + ch.charCodeAt(0).toString(16).toUpperCase())]) {
        const run = fixture();
        run.observations[0].request = { json: { unknownIdentity: 'prefix:' + spelling(randomUUID()) + ':suffix' } };
        assert.throws(() => normalizeRun(run));
    }
    const known = fixture();
    const sharedPrefix = fixture();
    sharedPrefix.observations[0].request = { json: { unknownIdentity: sharedPrefix.runId.slice(0, 8) + randomUUID().slice(8) } };
    assert.throws(() => normalizeRun(sharedPrefix), 'Run short-label replacement cannot hide an unknown full UUID');
    known.observations[0].request = { json: { identity: known.identities.orgs.main.toUpperCase() } };
    const uppercase = normalizeRun(known);
    known.observations[0].request.json.identity = known.identities.orgs.main;
    assert.notDeepEqual(uppercase, normalizeRun(known), 'Known aliases must preserve spelling markers');
    const upperShort = fixture('nest', 0, 'abcdefab-0000-4000-8000-000000000001');
    const numericShort = fixture('rust', 0, '12345678-0000-4000-8000-000000000001');
    for (const run of [upperShort, numericShort]) run.observations[0].request = { json: { generatedName: 'R2C CHILD ' + run.runId.slice(0, 8).toUpperCase(), unrelatedShort: 'DEADBEEF' } };
    assert.deepEqual(normalizeRun(upperShort), normalizeRun(numericShort), 'Only this registered generated short identity variant aligns, including all-digit short IDs');
    assert.equal(normalizeRun(upperShort).observations[0].request.json.unrelatedShort, 'DEADBEEF', 'Unknown short strings stay literal');
    upperShort.observations[0].request.json.generatedName = 'ABCDEFAB' + randomUUID().slice(8).toUpperCase();
    assert.throws(() => normalizeRun(upperShort), 'An unknown full UUID still fails before registered uppercase-short substitution');
    const probe = dtoCases(frozenGolden(), 'a0000000-0000-4000-8000-000000000001').find((row) => row.options?.body?.includes('a0000000-0000-0000-8000-000000000001'));
    assert(probe);
    const dto = fixture(),
        row = dto.observations[0];
    const oracle = frozenGolden().cases.find((entry) => `dto:${entry.schema}:${entry.name}` === probe.id);
    Object.assign(row, { id: probe.id, group: 'dto', operation: probe.operation, method: probe.method, request: probe.options, response: { statusCode: 400, message: 'Validation failed', errors: oracle.expected.errors }, status: 400 });
    row.expected.status = 400;
    row.responseOrgFacts.requestedIds = [];
    row.responseOrgFacts.organizations = [];
    assert.doesNotThrow(() => normalizeRun(dto), 'Exact independently frozen invalid DTO inputs remain admitted');
    row.request.body = row.request.body.replace('a0000000', 'b0000000');
    assert.throws(() => normalizeRun(dto), 'The exact DTO input exception cannot admit another UUID');
});

test('only the exact current-session regression may compare two complete equal raw permission arrays as the frozen37 set', () => {
    const expected = JSON.parse(readFileSync(new URL('../rust-r1b/shared-manifest.json', import.meta.url), 'utf8')).declarations.find((entry) => entry.name === 'PERMISSION_KEYS').value;
    const sample = (backend = 'nest', order = expected) => {
        const run = fixture(backend),
            row = run.observations[0];
        Object.assign(row, {
            id: 'regression:current-session',
            group: 'regression',
            operation: 'auth-session',
            route: '/api/auth/session',
            response: { authenticated: true, status: 'active', permissions: [...order], user: { id: run.identities.admin, permissions: [...order], roles: ['first', 'second'] } }
        });
        row.responseOrgFacts.requestedIds = [];
        row.responseOrgFacts.organizations = [];
        row.bodyByteLength = Buffer.byteLength(JSON.stringify(row.response));
        row.headers['content-length'] = String(row.bodyByteLength);
        return run;
    };
    const left = sample(),
        right = sample('rust', [...expected].reverse());
    const rawLeft = structuredClone(left.observations[0].response),
        rawRight = structuredClone(right.observations[0].response);
    assert.deepEqual(normalizeRun(left), normalizeRun(right));
    assert.deepEqual(left.observations[0].response, rawLeft, 'Actual response order is never modified');
    assert.deepEqual(right.observations[0].response, rawRight);
    const roles = sample('rust', [...expected].reverse());
    roles.observations[0].response.user.roles.reverse();
    assert.notDeepEqual(normalizeRun(left), normalizeRun(roles), 'Other arrays retain received order');
    for (const mutate of [
        (row) => {
            row.response.permissions.pop();
            row.response.user.permissions.pop();
        },
        (row) => {
            row.response.permissions[0] = row.response.permissions[1];
            row.response.user.permissions = [...row.response.permissions];
        },
        (row) => {
            row.response.permissions[0] = 'unknown:permission';
            row.response.user.permissions = [...row.response.permissions];
        },
        (row) => {
            row.response.permissions[0] = 1;
            row.response.user.permissions = [...row.response.permissions];
        },
        (row) => {
            row.response.user.permissions.reverse();
        },
        (row) => {
            row.id = 'regression:wrong-case';
        },
        (row) => {
            row.group = 'business';
        },
        (row) => {
            row.operation = 'list';
        },
        (row) => {
            row.account = 'viewer';
        },
        (row) => {
            row.method = 'HEAD';
        },
        (row) => {
            row.route = '/api/auth/profile';
        },
        (row) => {
            row.status = 201;
            row.expected.status = 201;
        },
        (row) => {
            row.response.authenticated = false;
        },
        (row) => {
            row.response.user.id = randomUUID();
        }
    ]) {
        const run = sample();
        mutate(run.observations[0]);
        assert.throws(() => normalizeRun(run));
    }
});

test('only an exact frozen DTO request/status/full-error-body admits its exact regex literal at the exact issue pattern path', () => {
    const golden = frozenGolden();
    const oracle = golden.cases.find((entry) => !entry.expected.success && entry.expected.errors?.some((issue) => issue.format === 'uuid' && issue.pattern?.includes('ffffffff-ffff-ffff-ffff-ffffffffffff')));
    const probe = dtoCases(golden, 'a0000000-0000-4000-8000-000000000001').find((entry) => entry.id === `dto:${oracle.schema}:${oracle.name}`);
    assert(probe);
    const sample = () => {
        const run = fixture(),
            row = run.observations[0];
        Object.assign(row, {
            id: probe.id,
            group: 'dto',
            operation: probe.operation,
            method: probe.method,
            request: structuredClone(probe.options),
            response: { statusCode: 400, message: 'Validation failed', errors: structuredClone(oracle.expected.errors) },
            status: 400
        });
        row.expected.status = 400;
        row.responseOrgFacts.requestedIds = [];
        row.responseOrgFacts.organizations = [];
        row.bodyByteLength = Buffer.byteLength(JSON.stringify(row.response));
        row.headers['content-length'] = String(row.bodyByteLength);
        return run;
    };
    const exact = sample(),
        normalized = normalizeRun(exact);
    assert.equal(normalized.observations[0].response.errors[0].pattern, oracle.expected.errors[0].pattern, 'The original regex literal is retained, not treated as an entity ID or masked');
    for (const mutate of [
        (row) => {
            row.response.errors[0].pattern = row.response.errors[0].pattern.replace('[1-8]', '[0-8]');
        },
        (row) => {
            row.response.errors[0].pattern += randomUUID();
        },
        (row) => {
            row.response.errors[0].message += randomUUID();
        },
        (row) => {
            row.response.errors[0].format = 'other';
        },
        (row) => {
            row.response.errors[0].path = ['other'];
        },
        (row) => {
            row.response.otherPattern = row.response.errors[0].pattern;
        },
        (row) => {
            row.response.unknownId = randomUUID().toUpperCase();
        },
        (row) => {
            row.response.errors.push(structuredClone(row.response.errors[0]));
        },
        (row) => {
            row.id = dtoCases(golden, 'a0000000-0000-4000-8000-000000000001')[0].id;
        },
        (row) => {
            row.group = 'business';
        },
        (row) => {
            row.request.body += ' ';
        },
        (row) => {
            row.status = 500;
            row.expected.status = 500;
        }
    ]) {
        const run = sample();
        mutate(run.observations[0]);
        assert.throws(() => normalizeRun(run));
    }
    const ordinary = fixture();
    ordinary.observations[0].request = { json: { pattern: oracle.expected.errors[0].pattern } };
    assert.throws(() => normalizeRun(ordinary), 'The same pattern key and all-ffff literal outside a fully verified DTO error receive no exemption');
});
