// Root sole execution after source review. Importing this driver performs no
// environment read, connection, DML, HTTP, Native startup or browser action.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { LFixture } from './l-fixture.mjs';
import { caseIdentity, rowIdentity } from './fixture-core.mjs';
import { marker, databaseFor, sourceHead, validateSource } from './fixture-guard.mjs';
import { ident } from './catalog-complete.mjs';
import { NavigationHttpSession } from './http-client.mjs';
import { buildPreparedContractRows } from './prepared-contract-source.mjs';
import { buildLookupPreparedTerm } from './lookup-prepared-source.mjs';
import { verifyPreparedPhysicalDefaults } from './fixture-prepared.mjs';
import { lookupHttpPlan, lookupNumbers, lookupRoute, lookupSensitiveFields, publicLookupEvidence } from './lookup-matrix.mjs';
import { verifyLookupSourceEquivalence } from './lookup-source-equivalence.mjs';
import { createLookupPrivateReceipt, lookupResponseEvidencePolicy } from './lookup-private-receipt.mjs';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
let invoked = false;
export function lookupNativeStoppedForCleanup(startupAttempted, nativeHandle) {
    if (!nativeHandle) return startupAttempted === false;
    try { return nativeHandle.isListening() === false; } catch { return false; }
}

export async function runLookupNativeActual({ variant, backend = 'nest', tag }) {
    assert(!invoked, 'One variant per Node process'); invoked = true;
    assert(['legacy', 'current'].includes(variant) && ['nest', 'rust'].includes(backend)); assert(/^[a-z0-9-]{1,25}$/.test(tag ?? ''));
    assert.equal(process.platform, 'linux'); assert.equal(process.cwd(), '/home/wangzishi/projects/poms-rust-r2l'); validateSource();
    const output = `tmp/rust-r2l/lookup-native-${variant}-${backend}-${tag}.json`; assert(!fs.existsSync(output), 'Keep every old/partial attempt');
    const runId = randomUUID(), deniedRunId = randomUUID(), contexts = new Map(), committed = [], secrets = new Set();
    const report = { formatVersion: 1, kind: 'actual-original-Native-lookup-acceptance', result: 'pending', variant, backend, tag, runId, deniedRunId, processId: process.pid, sourceHead, startedAt: new Date().toISOString(), requests: [], cleanup: [], sourcePreparedFactsAreBusinessProducers: false };
    let fixture, deniedFixture, native, project, contract, term, failure, privateReceipt, nativeStartupAttempted = false;
    const fixtures = () => [fixture, deniedFixture].filter(Boolean);
    const rememberSecrets = (value, key = '') => {
        if (value == null) return;
        if (/(?:password|token|cookie|authorization|secret)/i.test(key)) { if (typeof value === 'string') secrets.add(value); return; }
        if (value && typeof value === 'object') for (const [name, child] of Object.entries(value)) rememberSecrets(child, name);
    };
    const save = () => { if (privateReceipt) report.privateReceipt = privateReceipt.descriptor(); fs.writeFileSync(output, JSON.stringify(publicLookupEvidence(report, secrets), null, 2) + '\n'); };
    const facts = async () => {
        const all = [];
        for (const f of fixtures()) {
            const tables = [...new Set(f.j.objects.map(({ table }) => table))].sort(), rows = {};
            for (const table of tables) {
                const ids = f.j.objects.filter((entry) => entry.table === table).map(({ id }) => id);
                rows[table] = (await f.client.query('select to_jsonb(t) as row from poms.' + ident(table) + ' t where id=any($1::uuid[]) order by id', [ids])).rows.map(({ row }) => row);
                rememberSecrets(rows[table]);
            }
            all.push({ runId: f.runId, allOwnedTablesRead: true, rows });
        }
        return all;
    };
    const defineScope = (f, name, anonymous) => f.defineCase(name, { actors: [f.actors.admin, f.actors.viewer], projects: f === fixture && project ? [project.id] : [], anonymous });
    const certify = async (f, start, intents, name) => {
        await native.witness.drain(); const trace = native.witness.snapshot();
        privateReceipt.checkpoint('sdk-before-certification.' + name, { trace, actualCommittedRows: committed.slice(start) });
        native.witness.assertComplete();
        const source = 'tools/rust-r2l/k-native-write-witness.mjs';
        const authorityId = f.registerNativeAuthority({ id: randomUUID(), kind: 'mikro-orm-afterCreate-outer-commit', runId: f.runId, backend, database: databaseFor(backend), marker, source: { file: source, sha256: sha(fs.readFileSync(source)) }, trace });
        const rows = committed.slice(start);
        for (const item of rows) {
            const candidates = intents.filter((intent) => intent.table === item.table); assert.equal(candidates.length, 1, 'Unexpected/unregistered actual Native create ' + item.table);
            assert.equal(item.proof.createContext.runId, f.runId); f.recordCommittedCreates([{ ...item, authorityId, intentId: candidates[0].id }]);
        }
        await f.resolveNoCreates(name); await f.adoptIntents();
        return { authorityId, originalSdkTraceComplete: true, actualCommittedRows: rows.map(({ table, id }) => ({ table, id })) };
    };
    const securityRows = async (f, requestId) => (await f.client.query('select to_jsonb(t) as row from poms.security_event t where request_id=$1 order by id', [requestId])).rows.map(({ row }) => row);
    const scalarFacts = async (table, id, fields) => {
        const owned = fixture.j.objects.find((entry) => entry.table === table && entry.id === id); assert(owned);
        return native.readOriginalScalarFacts(table, id, fields, owned);
    };
    const assertAudit = (rows, expected, { scope, session, wirePath }) => {
        const masked = rows.filter(({ event_type }) => event_type === 'sensitive_field.masked'), denied = rows.filter(({ event_type }) => event_type === 'authz.permission.denied');
        assert.equal(masked.length, expected.masked ?? 0, 'Actual masked audit count'); assert.equal(denied.length, expected.denied ?? 0, 'Actual permission-denied audit count');
        assert.equal(rows.length, (expected.masked ?? 0) + (expected.denied ?? 0), 'Unexpected real security event');
        for (const row of rows) { assert.equal(row.path, wirePath, 'Original raw URL/query/encoding was not preserved'); assert.equal(row.method, 'GET'); assert.equal(row.request_id, scope.requestId); assert.equal(row.actor_id, session.userId); assert.equal(row.permission_key, expected.denied ? 'project:read' : 'contract:finance:sensitive:read'); }
        const snapshots = masked.filter(({ details }) => details.targetType === 'ContractSnapshot');
        if (expected.snapshotKeys) { assert.equal(snapshots.length, expected.snapshotKeys.length ? 1 : 0); if (snapshots.length) { assert.deepEqual([...snapshots[0].details.fieldKeys].sort(), [...expected.snapshotKeys].sort()); assert.equal(snapshots[0].details.hiddenFieldCount, expected.snapshotKeys.length); } }
        for (const row of masked) { assert.equal(row.details.auditAggregationMode, 'sensitive-field-batch'); assert.equal(row.details.targetCount, 1); assert.equal(row.details.fieldPackageKey, 'contract-finance'); }
        for (const row of masked.filter(({ details }) => details.targetType !== 'ContractSnapshot')) {
            assert.equal(row.details.targetType, 'contract'); assert.equal(row.details.targetId, contract.id); assert.deepEqual(row.details.fieldKeys, ['field']); assert.equal(row.details.hiddenFieldCount, 1);
        }
        for (const row of snapshots) { assert.equal(row.details.targetId, term.id); assert.deepEqual(row.details.sampleTargetIds, [term.id]); }
    };
    const call = async (f, session, name, method, route, { json, watch = [], expectedStatus, expectedAudit, compare = false, metadata = {} } = {}) => {
        const scope = defineScope(f, name, session.userId === null), wire = new URL(route, native.origin); assert.equal(wire.hash, '');
        const wirePath = wire.pathname + wire.search; session.identity = caseIdentity(f.runId, name);
        const context = { runId: f.runId, caseId: name, index: report.requests.length, op: backend === 'rust' ? 'l.producer' : 'l.lookup.http' }, correlationId = 'lookup-' + randomUUID(); contexts.set(correlationId, context);
        const intents = [];
        for (const [table, selector] of [['audit_log', { request_id: scope.requestId }], ['security_event', { request_id: scope.requestId }], ...watch]) intents.push(await f.intent(table, selector, { caseId: name }));
        const before = await facts(), start = committed.length, sqlStart = native.sql.length, startedAt = new Date().toISOString(); let response;
        const privateIndex = privateReceipt.pending({ fixtureRunId: f.runId, name, method, path: wirePath, startedAt, context, intents, before, requestJson: json, requestCookies: session.cookies });
        const observation = { name, variant, fixtureRunId: f.runId, actorId: session.userId, method, requestedPath: route, wirePath, startedAt, before, sqlStart, compare, certification: { state: 'pending-before-send' }, ...metadata };
        report.requests.push(observation); save();
        try {
            response = await session.request(method, route, { ...(json === undefined ? {} : { json }), requestId: scope.requestId, correlationId });
            const responseReceivedAt = new Date().toISOString();
            const wireEvidence = privateReceipt.received(privateIndex, response, responseReceivedAt);
            rememberSecrets(response.body); for (const value of session.cookies.values()) secrets.add(value);
            const publicBody = typeof response.body === 'string' && route.startsWith('/api/auth/') ? { redacted: true, bytes: response.bodyBytes.length, sha256: sha(response.bodyBytes), reason: 'unstructured-auth-response-private-original-only' } : response.body;
            Object.assign(observation, { responseReceivedAt, response: { ...wireEvidence, body: publicBody }, certification: { state: 'response-received-unverified' } }); save();
            assert.equal(wireEvidence.rawOriginalRetainedPrivately, true, 'Request-password echo withheld by policy; do not claim a complete private original');
            const certificates = await certify(f, start, intents, name), audit = await securityRows(f, scope.requestId), after = await facts(), finishedAt = new Date().toISOString();
            privateReceipt.certified(privateIndex, { after, audit, certificates, sourceCertificates: f.j.committedCreates.filter((entry) => entry.caseId === name), finishedAt, sql: native.sql.slice(sqlStart) });
            Object.assign(observation, { finishedAt, after, audit, certificates, sqlEnd: native.sql.length, certification: { state: 'complete' } }); save();
            console.log(JSON.stringify({ variant, backend, case: name, status: response.status }));
            if (expectedStatus !== undefined) assert.equal(response.status, expectedStatus, name);
            if (expectedAudit) assertAudit(audit, expectedAudit, { scope, session, wirePath });
            return response;
        } catch (error) {
            privateReceipt.failed(privateIndex, error, { sdkSnapshotAtFailure: native.witness.snapshot(), sqlAtFailure: native.sql.slice(sqlStart), completeHttpResponseReceived: !!response });
            observation.failure = { name: error.name, message: error.message }; observation.certification.failureRecorded = true; save(); throw error;
        }
    };
    const login = async (f, account, label) => {
        const session = new NavigationHttpSession(native.origin, f.runId);
        await call(f, session, label + '.csrf', 'GET', '/api/auth/csrf-token', { expectedStatus: 200 });
        const userId = f.actors[account], username = f.j.base.accounts.find((entry) => entry.account === account).username, password = 'R2L_' + f.runId + '_synthetic_only'; secrets.add(password);
        const response = await call(f, session, label + '.login', 'POST', '/api/auth/sessions', { json: { username, password }, watch: [['auth_session', { user_id: userId }]], expectedStatus: 200 });
        assert.equal(response.body.authenticated, true); assert.equal(response.body.user.id, userId); assert(Array.isArray(response.body.permissions)); assert(session.cookies.has('poms_session'));
        session.userId = userId; session.username = username; session.permissions = [...response.body.permissions]; return session;
    };
    const contractExpectation = (mode, keys = []) => ({ masked: mode === 'reader' ? 1 + (keys.length ? 1 : 0) : 0, snapshotKeys: mode === 'reader' ? keys : [] });
    const snapshotRequest = async (session, mode, name, expectedSnapshot, keys = []) => {
        const response = await call(fixture, session, 'snapshot.' + name + '.' + mode, 'GET', lookupRoute(variant, 'contract', contract.contract_no), { expectedStatus: 200, expectedAudit: contractExpectation(mode, keys), compare: true, metadata: { snapshotStage: name } });
        assert.equal(response.body.id, contract.id); assert.equal(response.body.currentSnapshotId, expectedSnapshot ? term.id : null);
        assert.equal(response.body.signedAmountProjection.mode, mode === 'reader' ? 'masked' : 'full');
        assert.equal(response.body.signedAmountProjection.value, mode === 'reader' ? null : report.contractScalarFacts.values.signed_amount);
        if (!expectedSnapshot) assert.equal(response.body.currentTermSnapshot, null);
        else for (const [column, projection] of lookupSensitiveFields) {
            const value = expectedSnapshot[column] ?? null, output = response.body.currentTermSnapshot[projection];
            assert.equal(output.mode, mode === 'reader' && value !== null ? 'masked' : 'full');
            assert.equal(output.value, mode === 'reader' ? null : value);
            assert.equal(output.reasonCode, value === null ? 'field-package-not-applicable' : mode === 'reader' ? 'missing-sensitive-read-permission' : 'allowed');
        }
        return response;
    };
    try {
        report.sourceEquivalence = verifyLookupSourceEquivalence();
        privateReceipt = createLookupPrivateReceipt({ variant, backend, tag, runIds: [runId, deniedRunId] });
        report.responseEvidencePolicyRevision = lookupResponseEvidencePolicy.revision + ': only new fixture response originals in durable private receipt; no raw response export, no plaintext request credentials retained'; save();
        const { captureRuntimeInput } = await import('./preserve-runtime-input.mjs');
        report.runtimeInput = await captureRuntimeInput('lookup-' + variant + '-' + backend + '-' + tag, { extraFiles: [
            ...['main.js', 'main.js.map', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'].map((file) => 'dist/reference-s2/apps/poms-api/' + file),
            'tmp/rust-r2l/source-input-S3.json', 'tmp/rust-r2l/lookup-input-s3-review01.json', 'tmp/rust-r2l/reference-native-source-s2.json', 'tmp/rust-r2l/reference-source-s2/b-scratch-node01-native-ready.json', 'tmp/rust-r2l/reference-source-s2/b-scratch-node01.json'
        ] });
        fixture = await LFixture.open(backend, runId); report.base = await fixture.prepare({ viewerPermissions: ['nav:dashboard:view', 'project:read'] }); report.borrowedReadonlyPrincipals = await fixture.borrowSeedPrincipals();
        deniedFixture = await LFixture.open(backend, deniedRunId); report.deniedBase = await deniedFixture.prepare(); report.deniedBorrowedReadonlyPrincipals = await deniedFixture.borrowSeedPrincipals();
        rememberSecrets(fixture.j.base.rows); rememberSecrets(deniedFixture.j.base.rows);
        const { startLookupNative } = await import('./lookup-native-owner.mjs'); nativeStartupAttempted = true;
        native = await startLookupNative({ variant, backend, tag, contexts, onCommitted: (rows) => committed.push(...rows) });
        report.nativeStart = native.report(); report.nativeMetadata = native.metadata; report.actualControllerMetadata = native.routes;
        if (variant === 'current') {
            for (const [controller, method, operationId] of [['ProjectLookupController', 'getByCode', 'ProjectController_getByCode'], ['ContractLookupController', 'getByNo', 'ContractController_getByNo']]) {
                const rows = native.routes.filter((entry) => entry.controller === controller && entry.method === method); assert.equal(rows.length, 1); assert.equal(rows[0].swaggerOperationId, operationId);
            }
        }
        fixture.defineCase('lookup-bootstrap', { actors: [fixture.actors.admin, fixture.actors.viewer] });
        const numbers = lookupNumbers(runId), projectId = await fixture.planProject('lookup-bootstrap');
        const prepared = buildPreparedContractRows({ runId, actorId: fixture.actors.admin, orgId: fixture.base.accounts.find(({ account }) => account === 'admin').orgId, customerId: randomUUID(), projectId, contractId: randomUUID(), metadata: native.metadata, numbers });
        report.preparedDraftSource = prepared;
        for (const entry of prepared.rows) { const row = await fixture.insert(entry.table, entry.values, { caseId: 'lookup-bootstrap' }); if (entry.table === 'project') project = row; if (entry.table === 'contract') contract = row; }
        report.ownedIdentities = { projectId: project.id, contractId: contract.id, numbers };
        report.freshIdentityMap = { customer: prepared.rows.find(({ table }) => table === 'customer').values.id, project: project.id, contract: contract.id,
            admin: fixture.actors.admin, reader: fixture.actors.viewer, deniedAdmin: deniedFixture.actors.admin, deniedViewer: deniedFixture.actors.viewer,
            ...Object.fromEntries(fixture.base.orgs.map(({ slot, id }) => ['org-' + slot, id])) };
        report.contractScalarFacts = await scalarFacts('contract', contract.id, ['signed_amount']);
        assert.equal(typeof report.contractScalarFacts.values.signed_amount, 'string', 'Original numeric hydration must stay a string; no DTO coercion');
        const constraint = (await fixture.client.query("select a.attnotnull as not_null from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='poms' and c.relname='contract' and a.attname='signed_amount' and not a.attisdropped")).rows;
        assert.equal(constraint.length, 1); assert.equal(constraint[0].not_null, true); report.signedAmountNullBoundary = { actualPhysicalNotNull: true, nullSignedAmountHTTPFixtureCreated: false, finiteOriginalServiceProbeOnly: true };
        const admin = await login(fixture, 'admin', 'admin'), reader = await login(fixture, 'viewer', 'reader'), denied = await login(deniedFixture, 'viewer', 'denied'), anonymous = new NavigationHttpSession(native.origin, runId);
        assert(admin.permissions.includes('contract:finance:sensitive:read')); assert(reader.permissions.includes('project:read') && !reader.permissions.includes('contract:finance:sensitive:read')); assert(!denied.permissions.includes('project:read'));
        const sessions = { admin, reader, denied, anonymous }, plan = lookupHttpPlan({ variant, numbers, projectId: project.id, contractId: contract.id }); report.finiteHttpPlan = plan;
        for (const entry of plan) {
            const session = sessions[entry.actor], f = entry.actor === 'denied' ? deniedFixture : fixture;
            const response = await call(f, session, entry.name, 'GET', entry.path, { expectedStatus: entry.status, expectedAudit: { masked: entry.status === 200 && entry.resource === 'contract' && entry.actor === 'reader' ? 1 : 0, denied: entry.status === 403 ? 1 : 0 }, compare: entry.compare, metadata: { resource: entry.resource, actor: entry.actor, observationOnly: entry.observationOnly ?? false, observationBoundary: entry.boundary ?? null } });
            if (entry.status === 200) {
                assert.equal(response.body.id, entry.resource === 'project' ? project.id : contract.id);
                if (entry.resource === 'contract') {
                    const projected = response.body.signedAmountProjection, readerMode = entry.actor === 'reader';
                    assert.equal(projected.mode, readerMode ? 'masked' : 'full'); assert.equal(projected.value, readerMode ? null : report.contractScalarFacts.values.signed_amount);
                    assert.equal(projected.reasonCode, readerMode ? 'missing-sensitive-read-permission' : 'allowed');
                }
            }
        }
        // Distinguish no snapshot row from an existing but unreferenced snapshot.
        await snapshotRequest(admin, 'admin', 'no-owned-snapshot', null); await snapshotRequest(reader, 'reader', 'no-owned-snapshot', null);
        const termSource = await buildLookupPreparedTerm({ runId, actorId: fixture.actors.admin, orgId: fixture.base.accounts.find(({ account }) => account === 'admin').orgId, projectId: project.id, contractId: contract.id, metadata: native.metadata });
        const physicalDefaults = await verifyPreparedPhysicalDefaults(fixture.client, [termSource.row]);
        report.preparedTermSource = { ...termSource.provenance, physicalNullableNoDefaultObservations: physicalDefaults.map(({ table, column, kind, actual }) => ({ table, column, kind, actual })), explicitSingleRowMetadataNullColumns: termSource.row.omitted.map(({ column }) => column), literalBatchExecuted: false };
        const values = { ...termSource.row.values, ...termSource.row.expectedIdentity }; term = await fixture.insert('contract_term_snapshot', values, { caseId: 'lookup-bootstrap' }); assert.deepEqual(rowIdentity('contract_term_snapshot', term), termSource.row.expectedIdentity);
        for (const [column] of lookupSensitiveFields) assert(Object.hasOwn(term, column) && term[column] === null, 'Original INSERT RETURNING must show the omitted nullable core term as SQL NULL');
        report.snapshotInitialScalarFacts = await scalarFacts('contract_term_snapshot', term.id, lookupSensitiveFields.map(([column]) => column));
        assert(Object.values(report.snapshotInitialScalarFacts.values).every((value) => value === null), 'Original minimal INSERT must be observed as nullable core terms, not labelled nonnull');
        await snapshotRequest(admin, 'admin', 'owned-snapshot-reference-null', null); await snapshotRequest(reader, 'reader', 'owned-snapshot-reference-null', null);
        report.preparedNonnullTerms = termSource.nonnullPreparation;
        for (const [column] of lookupSensitiveFields) assert(Object.hasOwn(termSource.nonnullPreparation.values, column) && typeof termSource.nonnullPreparation.values[column] === 'string');
        await fixture.updateOwned('contract_term_snapshot', term.id, termSource.nonnullPreparation.values, 'Prepared six core terms from original E2E helper and original ContractService.activate field-copy source; not a business snapshot producer');
        await fixture.updateOwned('contract', contract.id, { current_snapshot_id: term.id }, 'Prepared owned snapshot reference for original lookup projection; not a business snapshot producer');
        report.snapshotScalarFacts = [await scalarFacts('contract_term_snapshot', term.id, lookupSensitiveFields.map(([column]) => column))];
        const full = report.snapshotScalarFacts.at(-1).values; assert(Object.values(full).every((value) => typeof value === 'string'), 'Original nullable numeric/string hydration must stay strings when nonnull');
        await snapshotRequest(admin, 'admin', 'six-nonnull', full); await snapshotRequest(reader, 'reader', 'six-nonnull', full, lookupSensitiveFields.map(([, key]) => key));
        const partial = { ...full, amount_tax_exclusive: null, tax_rate: null, payment_terms: null };
        await fixture.updateOwned('contract_term_snapshot', term.id, partial, 'Explicit prepared nullable-sensitive-field matrix; immutable identity and source remain fixed');
        report.snapshotScalarFacts.push(await scalarFacts('contract_term_snapshot', term.id, lookupSensitiveFields.map(([column]) => column)));
        const actualPartial = report.snapshotScalarFacts.at(-1).values;
        await snapshotRequest(admin, 'admin', 'partial-null', actualPartial); await snapshotRequest(reader, 'reader', 'partial-null', actualPartial, lookupSensitiveFields.filter(([column]) => actualPartial[column] !== null).map(([, key]) => key));
        const allNull = Object.fromEntries(lookupSensitiveFields.map(([column]) => [column, null])); await fixture.updateOwned('contract_term_snapshot', term.id, allNull, 'Prepared all-null nullable snapshot fields; no null signed_amount insertion');
        report.snapshotScalarFacts.push(await scalarFacts('contract_term_snapshot', term.id, lookupSensitiveFields.map(([column]) => column)));
        const actualNull = report.snapshotScalarFacts.at(-1).values; assert(Object.values(actualNull).every((value) => value === null));
        await snapshotRequest(admin, 'admin', 'six-null', actualNull); await snapshotRequest(reader, 'reader', 'six-null', actualNull);
        // This is the actual original DI service, with no HTTP or invalid DB fact.
        for (const [label, session] of [['admin', admin], ['reader', reader]]) {
            const name = 'finite-null-service.' + label, scope = defineScope(fixture, name, false);
            const intents = [await fixture.intent('security_event', { request_id: scope.requestId }, { caseId: name })], from = committed.length;
            const context = { runId, caseId: name, index: report.requests.length, op: backend === 'rust' ? 'l.producer' : 'l.lookup.null-service', contractId: contract.id };
            const result = await native.probeNullProjection({ context, user: { sub: session.userId, username: session.username, permissions: session.permissions }, requestContext: { requestId: scope.requestId, path: lookupRoute(variant, 'contract', contract.contract_no), method: 'GET' } });
            const certificates = await certify(fixture, from, intents, name), audit = await securityRows(fixture, scope.requestId);
            report.requests.push({ name, kind: result.kind, HTTPInvoked: false, compare: true, result, audit, certificates }); save();
            assert.equal(audit.length, 0);
            for (const value of [result.single, ...Object.values(result.batch)]) { assert.equal(value.mode, 'full'); assert.equal(value.value, null); assert.equal(value.reasonCode, 'field-package-not-applicable'); }
        }
        report.result = 'observed'; report.scope = 'Original Native lookup only. Each old/new variant is a separate Node process. Prepared facts, finite DI probes, HTTP and actual persisted audit are labelled independently. No Rust runtime or generated-SDK/browser acceptance claim.';
        report.finiteUnclassifiedTransportObservations = report.requests.filter((entry) => entry.observationOnly).map(({ name, response }) => ({ name, status: response.status, acceptanceClassified: false }));
    } catch (error) { failure = error; report.result = 'fail'; report.failure = { name: error.name, message: error.message }; }
    finally {
        let nativeStopped = lookupNativeStoppedForCleanup(nativeStartupAttempted, native);
        report.nativeStartupAttempted = nativeStartupAttempted;
        if (nativeStartupAttempted && !native) report.nativeStartupStopState = { confirmedStopped: false, listenerState: 'unknown-after-rejected-start', cleanupAllowed: false };
        if (native) {
            try {
                report.nativeFinal = native.report(); report.sql = [...native.sql];
                privateReceipt.checkpoint('native-final-before-drain', { report: report.nativeFinal, sql: report.sql }); save();
                await native.witness.drain(); report.nativeFinal = native.report(); report.sql = [...native.sql];
                privateReceipt.checkpoint('native-final-before-assert-complete', { report: report.nativeFinal, sql: report.sql }); save();
                native.witness.assertComplete();
            }
            catch (error) { report.result = 'fail'; report.nativeWitnessFailure = { name: error.name, message: error.message }; }
            finally {
                try { await native.close(); }
                catch (error) { report.result = 'fail'; report.nativeCloseFailure = { name: error.name, message: error.message }; }
                nativeStopped = lookupNativeStoppedForCleanup(nativeStartupAttempted, native); report.nativeStoppedBeforeCleanup = nativeStopped;
            }
        }
        report.nativeStoppedBeforeCleanup = nativeStopped;
        for (const f of [deniedFixture, fixture].filter(Boolean)) {
            try {
                assert(nativeStopped, 'Keep owned journal/rows for controlled recovery until the original Native listener has stopped');
                report.finalFacts ??= await facts(); const before = await f.preflight(), first = await f.cleanup(), second = await f.cleanup(); assert.equal(second.deleted, 0);
                report.cleanup.push({ runId: f.runId, before, first, second, doubleZero: true });
            } catch (error) { report.result = 'fail'; report.cleanup.push({ runId: f.runId, failure: { name: error.name, message: error.message }, broadRecoveryAttempted: false }); }
            finally { try { await f.close(); } catch (error) { report.result = 'fail'; report.fixtureCloseFailures ??= []; report.fixtureCloseFailures.push({ runId: f.runId, name: error.name, message: error.message }); } }
        }
        report.finishedAt = new Date().toISOString(); report.doubleZero = report.cleanup.length === 2 && report.cleanup.every((entry) => entry.doubleZero);
        if (privateReceipt) privateReceipt.finish(report.result, { cleanup: report.cleanup, doubleZero: report.doubleZero, nativeStoppedBeforeCleanup: report.nativeStoppedBeforeCleanup ?? null, newFixtureSessionDeletionInvalidatesRecordedResponses: report.doubleZero });
        save();
    }
    if (failure) console.log(JSON.stringify(publicLookupEvidence({ variant, backend, result: report.result, failure: report.failure }, secrets)));
    return publicLookupEvidence(report, secrets);
}

export function compareLookupNativeReports(legacy, current) {
    assert.equal(legacy.variant, 'legacy'); assert.equal(current.variant, 'current'); assert.notEqual(legacy.processId, current.processId, 'Independent Node processes required');
    for (const report of [legacy, current]) { assert.equal(report.result, 'observed'); assert.equal(report.doubleZero, true); }
    const normalizer = (report) => {
        const replacements = new Map([[report.runId, '<run>'], [report.deniedRunId, '<denied-run>'], [report.ownedIdentities.projectId, '<project>'], [report.ownedIdentities.contractId, '<contract>']]);
        for (const [key, id] of Object.entries(report.freshIdentityMap ?? {})) replacements.set(id, '<' + key + '>');
        for (const [key, value] of Object.entries(report.ownedIdentities.numbers)) replacements.set(value, '<' + key + '>');
        const termId = report.requests.find((entry) => entry.snapshotStage === 'six-nonnull')?.response.body.currentSnapshotId; if (termId) replacements.set(termId, '<term>');
        const visit = (value, key = '') => {
            if (value == null) return value; if (['createdAt', 'updatedAt', 'effectiveAt'].includes(key)) return '<time>';
            if (Array.isArray(value)) return value.map((entry) => visit(entry));
            if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, entry]) => [name, visit(entry, name)]));
            if (typeof value === 'string') { let result = value; for (const [from, to] of replacements) result = result.replaceAll(from, to); return result.replaceAll(report.runId.slice(0, 8), '<run8>'); }
            return value;
        }; return visit;
    };
    const left = normalizer(legacy), right = normalizer(current), pairs = [];
    for (const previous of legacy.requests.filter((entry) => entry.compare)) {
        const next = current.requests.find(({ name }) => name === previous.name); assert(next, 'Missing current parity case ' + previous.name);
        const previousBody = previous.response ? { status: previous.response.status, body: previous.response.body } : previous.result;
        const nextBody = next.response ? { status: next.response.status, body: next.response.body } : next.result;
        assert.deepEqual(left(previousBody), right(nextBody), 'Actual old/new semantic body differs: ' + previous.name); pairs.push(previous.name);
    }
    return { result: 'pass-actual-paired-observations', pairs, separateProcesses: true, transportAndAuditPathsAssertedPerVariant: true,
        finiteTransportObservationsForIndependentClassification: { legacy: legacy.finiteUnclassifiedTransportObservations ?? [], current: current.finiteUnclassifiedTransportObservations ?? [] },
        timeAndFreshIdentityNormalization: ['run UUID and explicitly recorded fresh customer/project/contract/term/actor/org UUIDs', 'declared fresh business numbers and run8 suffix', 'createdAt/updatedAt/effectiveAt only'], RustOrBrowserOrGeneratedSdkCertified: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const [variant, backend, tag] = process.argv.slice(2); const report = await runLookupNativeActual({ variant, backend, tag }); process.exitCode = report.result === 'observed' && report.doubleZero ? 0 : 1;
}
