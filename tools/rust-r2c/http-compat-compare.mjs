import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCompleteCoverage, dtoCases, frozenGolden, wireOrganizations } from './http-compat-cases.mjs';
import { validateSource } from './fixture-guard.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuidShaped = /\{?(?:(?:[0-9a-f]{8}|%[0-9a-f]{2}[0-9a-f]{7})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32})\}?/gi;
const timeKeys = new Set(['createdAt', 'updatedAt', 'occurredAt', 'lastSeenAt', 'idleExpiresAt', 'absoluteExpiresAt', 'revokedAt', 'expiresAt', 'lastLoginAt', 'created_at', 'updated_at', 'assigned_at', 'revoked_at', 'last_login_at']);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function epochMicros(value) {
    assert.equal(typeof value, 'string', 'Timestamp must be a string');
    const match = /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    assert(match, 'Timestamp must retain an explicit timezone and at most PG microsecond precision');
    const [year, month, day, hour, minute, second] = match[1].match(/\d+/g).map(Number);
    assert(month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate() && hour < 24 && minute < 60 && second < 60, 'Timestamp calendar components must be valid');
    const seconds = Date.parse(match[1] + match[3]);
    assert(Number.isFinite(seconds));
    return BigInt(seconds) * 1000n + BigInt((match[2] ?? '').padEnd(6, '0'));
}
function inRequest(value, row) {
    const time = epochMicros(value);
    assert(time >= epochMicros(row.startedAt) - 5000n && time <= epochMicros(row.finishedAt) + 5000n, row.id + ': changed timestamp must belong to this request');
}
function exactWireTime(value) {
    assert.equal(new Date(value).toISOString(), value, 'Wire organization dates retain Date.toISOString millisecond representation');
}
function assertPrefixes(row) {
    for (const name of ['audits', 'securityEvents']) assert.deepEqual(row.after[name].slice(0, row.before[name].length), row.before[name], row.id + ': prior audit/security history is immutable');
    assert.equal(row.after.audits.length - row.before.audits.length, row.auditDelta);
    assert.equal(row.after.securityEvents.length - row.before.securityEvents.length, row.securityDelta);
    assert.equal(row.after.session.rowVersion - row.before.session.rowVersion, row.sessionVersionDelta);
    assert.equal(row.before.session.id, row.after.session.id);
    assert.equal(row.before.session.absoluteExpiresAt, row.after.session.absoluteExpiresAt);
    for (const [key, expected] of Object.entries(row.expected ?? {})) {
        if (key === 'orgVersionDeltas') assert.deepEqual(row.orgVersionDeltas, expected, row.id + ': expected organization versions');
        else assert.deepEqual(row[key], expected, row.id + ': expected ' + key);
    }
}
export function validateOwnerCloseout(run, closeout) {
    assert.equal(closeout?.result, 'pass', 'Coordinator closeout must pass');
    assert.equal(closeout.sourceUnchanged, true, 'Coordinator must prove source unchanged');
    assert(closeout && closeout.aliveAfter === true && closeout.stopped === true, 'Coordinator must independently prove owner alive after HTTP and stopped');
    assert.equal(closeout.serverReceiptSha256, run.serverReceipt.sha256);
    for (const key of ['backend', 'origin', 'pid', 'binarySha256', 'sourceHead']) assert.equal(closeout[key], run.serverReceipt.value[key], 'Same server owner: ' + key);
    const before = run.serverReceipt.value;
    assert.equal(before.processIdentity?.pid, before.pid);
    assert(typeof before.processIdentity?.startTicks === 'string' && /^[0-9]+$/.test(before.processIdentity.startTicks) && BigInt(before.processIdentity.startTicks) > 0n, 'Owner before process start ticks required');
    assert(Array.isArray(before.sourceFiles) && before.sourceFiles.length > 0);
    for (const file of before.sourceFiles) assert(typeof file.file === 'string' && /^[0-9a-f]{64}$/.test(file.sha256));
    assert.equal(new Set(before.sourceFiles.map((file) => file.file)).size, before.sourceFiles.length);
    assert.deepEqual(closeout.processIdentityAfter, before.processIdentity, 'Owner PID/startTicks must remain identical');
    assert.equal(closeout.binarySha256After, before.binarySha256, 'Owner binary before/after must remain identical');
    assert.deepEqual(closeout.sourceFilesAfter, before.sourceFiles, 'Every owner source before/after file must remain identical');
}
export function validateResponseOrganizationFacts(run, response, operation, status, method, facts, request) {
    const organizations = wireOrganizations(response, operation, status, method);
    assert(facts && facts.database === 'poms_r2c_' + run.backend && facts.readOnly === true, 'Fixed low-privilege read-only response database facts required');
    assert.deepEqual(
        facts.requestedIds,
        organizations.map((row) => row.id),
        'Database observer must cover every response organization in its original order'
    );
    assert(Array.isArray(facts.organizations));
    assert.deepEqual(
        facts.organizations.map((row) => row.id),
        facts.requestedIds,
        'Database facts cannot omit, duplicate or add organizations'
    );
    inRequest(facts.startedAt, request);
    inRequest(facts.finishedAt, request);
    assert(epochMicros(facts.finishedAt) >= epochMicros(facts.startedAt));
    for (const [index, wire] of organizations.entries()) {
        const fact = facts.organizations[index];
        assert(uuid.test(fact.id));
        for (const [name, dbName] of [
            ['createdAt', 'created_at'],
            ['updatedAt', 'updated_at']
        ]) {
            exactWireTime(wire[name]);
            assert.equal(Date.parse(wire[name]), Number(epochMicros(fact[dbName]) / 1000n), 'Every organization wire timestamp must match its own same-request PG fact: ' + request.id + '/' + wire.id + '/' + name);
        }
    }
    return organizations;
}
function currentSessionPermissionComparison(row, run) {
    assert.equal(row.id, 'regression:current-session');
    assert.equal(row.group, 'regression');
    assert.equal(row.operation, 'auth-session');
    assert.equal(row.account, 'admin');
    assert.equal(row.monitorAccount, 'admin');
    assert.equal(row.method, 'GET');
    assert.equal(row.route, '/api/auth/session');
    assert.equal(row.status, 200);
    assert.equal(row.due, false);
    assert.equal(row.response?.authenticated, true);
    assert.equal(row.response.status, 'active');
    assert.equal(row.response.user?.id, run.identities.admin);
    const expected = validateSource();
    const repository = readFileSync(path.join(root, 'apps/poms-api/src/app/features/platform/platform.repository.ts'), 'utf8').replace(/\r\n/g, '\n');
    const method = /async findActiveRolePermissionAssignments\(\)[^{]*\{([\s\S]*?)\n {4}\}/.exec(repository);
    assert.equal(method?.[1].trim(), "return this.rolePermissionAssignmentRepository.find({ status: 'active' });", 'R1C-CP07 requires the frozen original assignment query with no orderBy');
    const permissions = row.response.permissions;
    assert(Array.isArray(permissions) && permissions.length === 37 && permissions.every((permission) => typeof permission === 'string'));
    assert.equal(new Set(permissions).size, permissions.length, 'Permission response must remain unique before its comparison copy is sorted');
    assert.deepEqual([...permissions].sort(), [...expected].sort(), 'Current-session fixture must return the complete frozen37 permission set');
    assert.deepEqual(row.response.user.permissions, permissions, 'Top/profile raw permission order must agree before comparison normalization');
    // R1C-CP07: the original assignment SELECT has no ORDER BY. Only these two
    // validated arrays in this one comparison copy receive set treatment.
    return { ...row.response, permissions: [...permissions].sort(), user: { ...row.response.user, permissions: [...row.response.user.permissions].sort() } };
}

export function normalizeRun(run) {
    assert(uuid.test(run.runId));
    assert(['nest', 'rust'].includes(run.backend));
    const ids = new Map(),
        membershipKeys = new Map();
    const cleanRun = (value) => value.replaceAll(run.runId, '<run>').replaceAll(run.runId.replaceAll('-', ''), '<run-compact>').replaceAll(run.runId.slice(0, 8), '<run-short>').replaceAll(run.runId.slice(0, 8).toUpperCase(), '<run-short>');
    const register = (id, label) => {
        assert(uuid.test(id), 'Only canonical known UUIDs can be registered');
        if (ids.has(id)) assert.equal(ids.get(id), label);
        else ids.set(id, label);
    };
    register(run.identities.admin, 'actor:admin');
    register(run.identities.viewer, 'actor:viewer');
    for (const [slot, id] of Object.entries(run.identities.orgs)) register(id, 'org:' + slot);
    for (const org of run.baselineOrganizations) if (!ids.has(org.id)) register(org.id, 'baseline-org:' + cleanRun(org.code));
    for (const role of run.regressionRoles ?? []) register(role.id, 'baseline-role:' + role.roleKey);
    for (const row of run.observations) {
        register(row.before.session.id, 'session:' + row.monitorAccount);
        for (const [kind, rows] of [
            ['audit', row.after.audits],
            ['security', row.after.securityEvents]
        ])
            rows.forEach((value, index) => register(value.id, kind + ':' + index));
    }
    const memberships = [];
    for (const row of run.observations) for (const snapshot of [...Object.values(row.orgBefore ?? {}), ...Object.values(row.orgAfter ?? {})]) memberships.push(...snapshot.memberships);
    for (const action of run.fixtureActions ?? []) memberships.push(...(action.fixtureFacts?.memberships ?? []));
    for (const member of memberships) {
        if (ids.has(member.id)) continue;
        assert(ids.has(member.user_id) && ids.has(member.org_unit_id), 'Membership identity must refer to a registered actor and organization');
        const key = [ids.get(member.user_id), ids.get(member.org_unit_id), member.membership_type, member.status].join(':');
        const occurrence = membershipKeys.get(key) ?? 0;
        membershipKeys.set(key, occurrence + 1);
        register(member.id, 'membership:' + key + ':' + occurrence);
    }
    const aliases = [];
    for (const [id, label] of ids) {
        aliases.push(
            [id, '<' + label + '>'],
            ['{' + id + '}', '<' + label + ':braces>'],
            [id.replaceAll('-', ''), '<' + label + ':compact>'],
            [id.replace(/^./, (value) => '%' + value.charCodeAt(0).toString(16).toUpperCase()), '<' + label + ':percent-first>']
        );
        if (id.toUpperCase() !== id) aliases.push([id.toUpperCase(), '<' + label + ':uppercase>']);
    }
    const aliasMap = new Map(aliases);
    const string = (value, key, probes = []) => {
        uuidShaped.lastIndex = 0;
        const output = value.replace(uuidShaped, (spelling) => {
            if (aliasMap.has(spelling)) return aliasMap.get(spelling);
            if (spelling === run.runId) return '<run>';
            if (spelling === run.runId.replaceAll('-', '')) return '<run-compact>';
            if (spelling === '00000000-0000-0000-0000-000000000000') return '<fixed-missing-uuid>';
            const probe = probes.indexOf(spelling);
            assert(probe >= 0, `Unrecognized or unadmitted UUID spelling in ${key}`);
            return `<frozen-dto-uuid-probe:${probe}>`;
        });
        // Short display labels are normalized only after UUID admission, so an
        // unknown UUID sharing this run's eight-character prefix cannot escape.
        return cleanRun(output);
    };
    function normalize(value, key = '', probes = [], exactLiterals, jsonPath = 'root') {
        if (value === null) return null;
        if (exactLiterals?.has(jsonPath)) {
            assert.equal(value, exactLiterals.get(jsonPath), 'Frozen DTO metadata literal must remain exact at ' + jsonPath);
            return value;
        }
        if (timeKeys.has(key)) {
            epochMicros(value);
            return '<valid-time>';
        }
        if (Array.isArray(value)) return value.map((entry, index) => normalize(entry, '', probes, exactLiterals, `${jsonPath}[${index}]`));
        if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, child]) => [name, normalize(child, name, probes, exactLiterals, `${jsonPath}.${name}`)]));
        return typeof value === 'string' ? string(value, key, probes) : value;
    }
    const relationSet = (rows) => normalize(rows).sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
    const snapshot = (value) => ({ org: normalize(value.org), memberships: relationSet(value.memberships), children: normalize(value.children) });
    const normalizeOrgSnapshots = (value) => Object.fromEntries(Object.entries(value ?? {}).map(([slot, record]) => [slot, snapshot(record)]));
    function checkWatchedCounts(organizations, known) {
        for (const value of organizations) {
            const fact = known.get(value.id);
            if (fact) {
                if (Object.hasOwn(value, 'activeMembershipCount')) {
                    assert.equal(value.activeMembershipCount, fact.memberships.filter((member) => member.status === 'active').length);
                    assert.equal(value.childCount, fact.children.length);
                    assert.equal(value.canDelete, value.activeMembershipCount === 0 && value.childCount === 0);
                }
            }
        }
    }
    validateResponseOrganizationFacts(run, run.baselineOrganizations, 'list', 200, 'GET', run.baselineOrganizationFacts, { id: 'baseline:list', ...run.baselineOrganizationRequest });
    const golden = frozenGolden();
    const dtoPlan = new Map(dtoCases(golden, 'a0000000-0000-4000-8000-000000000001').map((row) => [row.id, row]));
    const dtoOracles = new Map(golden.cases.map((entry) => [`dto:${entry.schema}:${entry.name}`, entry]));
    const observations = run.observations.map((row) => {
        assertPrefixes(row);
        if (['create', 'update', 'activate', 'deactivate', 'move'].includes(row.operation) && row.status >= 200 && row.status < 300) {
            assert.equal(row.status, row.operation === 'create' ? 201 : 200);
            assert.equal(row.auditDelta, 1, row.id + ': every successful original command writes its audit, including no-ops');
        }
        const temporal = {};
        for (const key of ['lastSeenAt', 'idleExpiresAt', 'absoluteExpiresAt', 'updatedAt', 'revokedAt']) {
            temporal['session:' + key + ':unchanged'] = row.before.session[key] === row.after.session[key];
            if (['lastSeenAt', 'updatedAt', 'revokedAt'].includes(key) && !temporal['session:' + key + ':unchanged'] && row.after.session[key] !== null) inRequest(row.after.session[key], row);
        }
        if (row.before.session.lastSeenAt !== row.after.session.lastSeenAt) {
            assert.equal(Date.parse(row.after.session.idleExpiresAt), Math.min(Date.parse(row.after.session.lastSeenAt) + 900000, Date.parse(row.after.session.absoluteExpiresAt)));
        }
        const versions = {};
        for (const [slot, after] of Object.entries(row.orgAfter ?? {})) {
            const before = row.orgBefore?.[slot];
            if (before) {
                assert.equal(before.org.id, after.org.id);
                assert.equal(before.org.created_at, after.org.created_at);
                versions[slot] = after.org.row_version - before.org.row_version;
                temporal['org:' + slot + ':updatedUnchanged'] = before.org.updated_at === after.org.updated_at;
                if (!temporal['org:' + slot + ':updatedUnchanged']) inRequest(after.org.updated_at, row);
                assert.deepEqual(after.memberships, before.memberships, row.id + ': organization command must retain every membership field and timestamp');
            } else if (row.createSlot === slot) {
                for (const key of ['created_at', 'updated_at']) inRequest(after.org[key], row);
            }
        }
        assert.deepEqual(versions, row.orgVersionDeltas);
        const audits = row.after.audits.slice(row.before.audits.length);
        for (const audit of audits) {
            assert.equal(audit.operatorId, run.identities[row.account]);
            assert.equal(audit.requestId, null);
            assert.equal(audit.targetType, 'OrgUnit');
            inRequest(audit.occurredAt, row);
        }
        for (const event of row.after.securityEvents.slice(row.before.securityEvents.length)) inRequest(event.occurredAt, row);
        const known = new Map(Object.values(row.orgAfter ?? {}).map((record) => [record.org.id, record]));
        const organizations = validateResponseOrganizationFacts(run, row.response, row.operation, row.status, row.method, row.responseOrgFacts, row);
        for (const fact of row.responseOrgFacts.organizations) if (known.has(fact.id)) assert.deepEqual(fact, known.get(fact.id).org, row.id + ': response observer and watched committed organization must agree');
        checkWatchedCounts(organizations, known);
        if (row.headReference) validateResponseOrganizationFacts(run, row.headReference.body, row.operation, row.headReference.status, 'GET', row.headReferenceOrgFacts, row);
        let requestProbes = [];
        let responseLiterals;
        const comparableResponse = row.id === 'regression:current-session' || row.operation === 'auth-session' ? currentSessionPermissionComparison(row, run) : row.response;
        if (row.group === 'dto') {
            const expected = dtoPlan.get(row.id);
            assert(expected, 'Only frozen DTO cases may admit intentionally invalid UUID literals');
            assert.deepEqual(row.request, expected.options ?? {}, 'Frozen DTO request must remain exact');
            requestProbes = [...new Set(JSON.stringify(row.request).match(uuidShaped) ?? [])];
            const issues = dtoOracles.get(row.id)?.expected.errors ?? [];
            const uuidPatterns = issues.flatMap((issue, index) =>
                issue.origin === 'string' &&
                issue.code === 'invalid_format' &&
                issue.format === 'uuid' &&
                Array.isArray(issue.path) &&
                issue.path.length === 1 &&
                issue.path[0] === 'parentId' &&
                typeof issue.pattern === 'string' &&
                issue.pattern.includes('ffffffff-ffff-ffff-ffff-ffffffffffff')
                    ? [[`response.errors[${index}].pattern`, issue.pattern]]
                    : []
            );
            if (uuidPatterns.length) {
                assert.equal(row.status, 400);
                assert.deepEqual(row.response, { statusCode: 400, message: 'Validation failed', errors: issues }, 'DTO UUID error envelope and every issue must exactly match this frozen case before its regex literal is admitted');
                responseLiterals = new Map(uuidPatterns);
            }
        }
        const headers = { ...row.headers };
        let lengthSemantics;
        if (row.method === 'HEAD') {
            assert.equal(row.bodyByteLength, 0);
            if (row.status === 200) {
                assert(row.headReference && row.headReference.status === 200);
                assert.equal(row.headReference.headers['content-length'], row.headers['content-length']);
                assert.equal(Number(row.headers['content-length']), row.headReference.bodyByteLength);
                lengthSemantics = 'matches-own-GET';
                delete headers['content-length'];
            } else lengthSemantics = 'error-HEAD-raw-length-retained';
        } else {
            if (headers['content-length'] !== undefined) assert.equal(Number(headers['content-length']), row.bodyByteLength);
            lengthSemantics = headers['content-length'] === undefined ? 'length-not-declared' : 'matches-actual-body-bytes';
            delete headers['content-length'];
        }
        return {
            id: row.id,
            group: row.group,
            operation: row.operation,
            account: row.account,
            monitorAccount: row.monitorAccount,
            due: row.due,
            method: row.method,
            route: normalize(row.route),
            request: normalize(row.request ?? {}, '', requestProbes),
            status: row.status,
            response: normalize(comparableResponse, '', [], responseLiterals, 'response'),
            responseOrganizationFacts: normalize(row.responseOrgFacts.organizations),
            ...(row.headReference ? { headReference: { status: row.headReference.status, body: normalize(row.headReference.body), organizationFacts: normalize(row.headReferenceOrgFacts.organizations) } } : {}),
            headers,
            lengthSemantics,
            setCookieCount: row.setCookieCount,
            auditDelta: row.auditDelta,
            securityDelta: row.securityDelta,
            sessionVersionDelta: row.sessionVersionDelta,
            orgVersionDeltas: row.orgVersionDeltas,
            sessionBefore: normalize(row.before.session),
            sessionAfter: normalize(row.after.session),
            orgBefore: normalizeOrgSnapshots(row.orgBefore),
            orgAfter: normalizeOrgSnapshots(row.orgAfter),
            audits: normalize(audits),
            security: normalize(row.after.securityEvents.slice(row.before.securityEvents.length)),
            temporal,
            expected: row.expected
        };
    });
    const fixtureActions = (run.fixtureActions ?? []).map((action) => {
        const facts = action.fixtureFacts;
        if (!facts) return normalize(action);
        const value = normalize(action);
        if (facts.memberships) value.fixtureFacts.memberships = relationSet(facts.memberships);
        if (facts.users) value.fixtureFacts.users = relationSet(facts.users);
        if (action.action === 'org-sort-ties') {
            assert.equal(facts.organizations.length, 4);
            const micros = [123900n, 123100n, 123500n, 123700n];
            for (const [index, slot] of ['tie-a', 'tie-b', 'tie-c', 'tie-d'].entries()) {
                const row = facts.organizations.find((value) => value.id === run.identities.orgs[slot]);
                assert(row && row.display_order === 77 && row.parent_id === null);
                assert.equal(row.name, ['阿', '中', '国', '八'][index]);
                assert.equal(epochMicros(row.created_at) - epochMicros('2026-01-01T00:00:00Z'), micros[index]);
                assert.equal(epochMicros(row.created_at) % 1000000n, micros[index]);
            }
        }
        return value;
    });
    return { baselineOrganizations: normalize(run.baselineOrganizations), baselineOrganizationFacts: normalize(run.baselineOrganizationFacts.organizations), regressionRoles: normalize(run.regressionRoles ?? []), fixtureActions, observations };
}

export function compareReports(nest, rust, ownerCloseouts) {
    for (const [backend, run] of [
        ['nest', nest],
        ['rust', rust]
    ]) {
        assert.equal(run.formatVersion, 1);
        assert.equal(run.result, 'observed');
        assert.equal(run.backend, backend);
        assert.equal(run.cleanupCompleted, true);
        assert.equal(run.zeroResidual.matched, 0);
        assert.equal(run.zeroResidual.changed, 0);
        assert.equal(run.serverReceipt.value.backend, backend);
        assert.equal(run.serverReceipt.value.aliveBefore, true);
        assert(/^[0-9a-f]{64}$/.test(run.serverReceipt.value.binarySha256));
        validateOwnerCloseout(run, ownerCloseouts?.[backend]);
        assertCompleteCoverage(run);
    }
    assert.equal(nest.platform, rust.platform);
    assert.deepEqual(nest.sourceFiles, rust.sourceFiles, 'Both reports must bind the same frozen source and harness');
    assert.deepEqual(nest.coverage, rust.coverage);
    const left = normalizeRun(nest),
        right = normalizeRun(rust);
    assert.deepEqual(right, left, 'Complete HTTP, persisted fields, versions, audit, membership and time relations must match');
    return {
        formatVersion: 1,
        result: 'pass',
        platform: nest.platform,
        comparedCases: left.observations.length,
        groups: nest.coverage.groups,
        normalization:
            'Only registered run/entity IDs and validated timestamps. Exact frozen DTO regex metadata stays literal only after same-case request/status/full-body verification. Timestamp equality, request bounds, immutable history, row/session deltas and wire-to-PG milliseconds are checked first. Membership/user observer relation sets sort by registered ID. The unique regression:current-session body.permissions and body.user.permissions use R1C-CP07 set comparison only after exact case/source and37-string unique complete-set/raw-array-equality checks; every other response/tree/role/audit/children array retains order. JSON Content-Length is checked against each endpoint actual bytes; successful HEAD checks its own GET length. Raw responses and lengths remain in input reports.',
        comparisons: left.observations.map((row) => ({ id: row.id, status: row.status, result: 'pass' }))
    };
}
function evidencePath(value) {
    const target = path.resolve(root, value),
        prefix = path.join(root, 'tmp/rust-r2c') + path.sep;
    assert(target.startsWith(prefix) && target.endsWith('.json'), 'Use only this slice ignored evidence JSON paths');
    return target;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    assert.equal(process.argv.length, 7, 'Usage: http-compat-compare.mjs <nest.json> <rust.json> <nest-owner-closeout.json> <rust-owner-closeout.json> <output.json>');
    const files = process.argv.slice(2, 6).map((name) => ({ file: name, bytes: readFileSync(evidencePath(name)) }));
    const [nest, rust, nestOwner, rustOwner] = files.map(({ bytes }) => JSON.parse(bytes));
    const report = { ...compareReports(nest, rust, { nest: nestOwner, rust: rustOwner }), inputs: files.map(({ file, bytes }) => ({ file, rawBytesSha256: digest(bytes) })) };
    writeFileSync(evidencePath(process.argv[6]), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ result: report.result, comparedCases: report.comparedCases, platform: report.platform }));
}
