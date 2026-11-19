// Root-only isolated Native phase. Never starts/stops processes or seeds data.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NATIVE92 as F, sha92 as sha, segment92, args92, taggedCases92, assertUnsupported92, assertSnapshot92 } from './native-modern92-common.mjs';

function pinned(pin, roots) {
    assert(pin && /^[a-f0-9]{64}$/.test(pin.rawBytesSha256)); const portable = /^[A-Za-z]:[\\/]/.test(pin.file) ? `/mnt/${pin.file[0].toLowerCase()}/${pin.file.slice(3).replaceAll('\\', '/')}` : pin.file; const file = path.resolve(portable);
    assert(roots.some(root => { const rel = path.relative(root, file); return rel && !rel.startsWith('..') && !path.isAbsolute(rel); }));
    const stat = fs.lstatSync(file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1); assert.equal(fs.realpathSync(file), file);
    const bytes = fs.readFileSync(file); assert.equal(sha(bytes), pin.rawBytesSha256); return bytes;
}
const jsonPin = (pin, roots = [F.root, F.private]) => JSON.parse(pinned(pin, roots));
function pidStart(pid) { const text = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'); return text.slice(text.lastIndexOf(') ') + 2).split(' ')[19]; }
function verifyProcess(plan, record) {
    assert.equal(record.kind, 'Root-owned-Native-reference92-process'); assert.equal(record.namespace, F.namespace); assert.equal(record.phaseRun, plan.phaseRun);
    assert.equal(record.port, F.port); assert.equal(record.nonce, plan.processNonce); assert(Number.isSafeInteger(record.pid) && record.pid > 1);
    assert.equal(pidStart(record.pid), record.startTime); assert.equal(fs.realpathSync(`/proc/${record.pid}/exe`), fs.realpathSync(plan.node.file));
    assert.equal(fs.realpathSync(`/proc/${record.pid}/cwd`), F.root); assert.equal(record.root, F.root);
    assert.equal(sha(fs.readFileSync(`/proc/${record.pid}/exe`)), plan.node.rawBytesSha256);
    assert.deepEqual(fs.readFileSync(`/proc/${record.pid}/cmdline`).toString().split('\0').filter(Boolean), [plan.node.file, '--require', plan.preload.file, plan.build.entry.file]);
    const env = Object.fromEntries(fs.readFileSync(`/proc/${record.pid}/environ`).toString().split('\0').filter(Boolean).map(s => { const i = s.indexOf('='); return [s.slice(0, i), s.slice(i + 1)]; }));
    assert.equal(env.POMS_ENV_FILE, plan.env.file); assert.equal(env.POMS_R4GHI_NATIVE_REFERENCE_RUN, plan.processNonce); assert.equal(env.POMS_R4GHI_NATIVE_ENV_SHA256, plan.env.rawBytesSha256);
    assert.deepEqual(record.entry, plan.build.entry); assert.deepEqual(record.env, plan.env);
    assert.deepEqual(record.preload, plan.preload);
    assert(Number.isFinite(Date.parse(record.startedAt)) && fs.statSync(plan.env.file).mtimeMs <= Date.parse(record.startedAt));
    // Prove this exact PID owns the listening socket; an old server on31442 is insufficient.
    const inodes = new Set(fs.readdirSync(`/proc/${record.pid}/fd`).flatMap(name => {
        try { const match = /^socket:\[(\d+)\]$/.exec(fs.readlinkSync(`/proc/${record.pid}/fd/${name}`)); return match ? [match[1]] : []; } catch { return []; }
    }));
    const listeners = ['/proc/net/tcp', '/proc/net/tcp6'].flatMap(file => fs.readFileSync(file, 'utf8').split('\n').slice(1).filter(Boolean).map(line => line.trim().split(/\s+/)))
        .filter(row => row[3] === '0A' && Number.parseInt(row[1].split(':')[1], 16) === F.port && inodes.has(row[9]));
    assert(listeners.length > 0, 'Actual owned Native PID must own the dedicated listening port');
    assert(listeners.every(row => row[1].split(':')[0] === '0100007F'), 'Actual listener must be IPv4 loopback, never wildcard/eth0');
}

async function context(plan, approvedSHA, mode) {
    assert.equal(process.platform, 'linux'); assert.equal(fileURLToPath(import.meta.url), `${F.root}/tools/rust-r4ghi/business/native-modern92.mjs`, 'Only the Root-promoted candidate may execute');
    assert.equal(plan.kind, 'Root-reviewed-Native-only-modern-reference92'); assert.equal(plan.schemaVersion, 1); assert.equal(plan.namespace, F.namespace); segment92(plan.phaseRun);
    assert.equal(plan.authorizedStages.RustDriverFinished, true); assert.equal(plan.authorizedStages.NativeOnly, true); assert.equal(plan.authorizedStages.NoConcurrentRustHTTP, true);
    assert(/^[a-f0-9]{64}$/.test(plan.processNonce)); assert.equal(plan.tables, 139);
    segment92(plan.rustBoundary.epoch); segment92(plan.rustBoundary.run);
    const driver = `${F.private}/business/${plan.rustBoundary.epoch}/${plan.rustBoundary.run}/driver.lock`; assert(!fs.existsSync(driver), 'Rust/UI driver must finish before the explicit Native-only phase');
    const currentRustState = `${F.private}/business/${plan.rustBoundary.epoch}/${plan.rustBoundary.run}/state.json`;
    assert.notEqual(plan.rustBoundary.frozenState.file, currentRustState, 'Root must preserve actual boundary bytes privately, not label a mutable path frozen');
    assert.equal(sha(fs.readFileSync(currentRustState)), plan.rustBoundary.frozenState.rawBytesSha256, 'No Rust state mutation is allowed during the Native-only phase');
    const frozen = jsonPin(plan.rustBoundary.frozenState); assert.equal(frozen.epoch, plan.rustBoundary.epoch); assert.equal(frozen.run, plan.rustBoundary.run);
    assert(!frozen.activeFault && !frozen.blockedObservation && !frozen.admissionPending54);
    jsonPin(plan.rustBoundary.finishedReceipt); // Explicit Root-reviewed original, never inferred from lack of lock alone.
    const actualHelpers = fs.readdirSync(`${F.root}/tools/rust-r4ghi/business`).filter(name => /\.(mjs|json)$/.test(name)).sort().map(name => `tools/rust-r4ghi/business/${name}`);
    assert.deepEqual(plan.sourcePins.filter(item => item.file.startsWith('tools/rust-r4ghi/business/')).map(item => item.file).sort(), actualHelpers, 'Complete current helper closure is mandatory');
    assert.equal(new Set(plan.sourcePins.map(item => item.file)).size, plan.sourcePins.length);
    for (const item of plan.sourcePins) { assert(!path.isAbsolute(item.file) && !item.file.split('/').includes('..')); assert.equal(sha(fs.readFileSync(`${F.root}/${item.file}`)), item.rawBytesSha256); }
    const binding = jsonPin(plan.build.bindingReceipt); assert.equal(binding.kind, 'Root-fresh-Native-build04-source-and-output-binding103'); assert.equal(binding.allCurrentInputsStillExact, true);
    const build = jsonPin(binding.buildReceipt); assert.equal(build.exitCode, 0); assert.equal(build.sourceStable, true); assert.equal(build.databaseConnect, false);
    assert.equal(build.inputManifestSHA256, binding.sourceInputManifestSHA256); assert.equal(build.inputs.length, binding.actualCompleteSourceInputs);
    for (const item of build.inputs) { assert(!path.isAbsolute(item.file) && !item.file.split('/').includes('..')); assert.equal(sha(fs.readFileSync(`${F.root}/${item.file}`)), item.rawBytesSha256); }
    for (const item of binding.output.files) { assert.equal(path.basename(item.file), item.file); assert.equal(sha(fs.readFileSync(`${F.root}/dist/apps/poms-api/${item.file}`)), item.rawBytesSha256); }
    const builtEntry = binding.output.files.find(item => item.file === 'main.js'); assert.equal(builtEntry.rawBytesSha256, plan.build.entry.rawBytesSha256);
    const seed = jsonPin(plan.nativeSeedReceipt); assert.equal(seed.database, F.database);
    pinned(plan.nativeCredentialSource, [F.root]);
    pinned(plan.build.entry, [F.root]); assert.equal(plan.build.entry.file, `${F.root}/dist/apps/poms-api/main.js`);
    pinned(plan.preload, [F.root]); assert.equal(plan.preload.file, `${F.root}/tools/rust-r4ghi/business/native-bind-loopback92.cjs`);
    assert.equal(sha(fs.readFileSync(plan.node.file)), plan.node.rawBytesSha256);
    const nativeRequire = createRequire(`${F.root}/dist/apps/poms-api/package.json`);
    assert.deepEqual(plan.runtimeModules.map(item => item.name).sort(), Object.keys(JSON.parse(fs.readFileSync(`${F.root}/dist/apps/poms-api/package.json`)).dependencies).sort());
    for (const item of plan.runtimeModules) { assert.equal(nativeRequire.resolve(item.name), item.file); assert.equal(sha(fs.readFileSync(item.file)), item.rawBytesSha256); }
    const originalEnv = pinned(plan.originalEnv, [F.private]), bytes = pinned(plan.env, [F.private]);
    const require = createRequire('/home/wangzishi/projects/poms-rust-r4ghi/package.json'), { parse } = require('dotenv');
    const env = parse(bytes), original = parse(originalEnv);
    assert.equal(env.PORT, '31442'); for (const key of new Set([...Object.keys(env), ...Object.keys(original)])) if (key !== 'PORT') assert.equal(env[key], original[key], `Native env rewrite outside PORT: ${key}`);
    const helper = name => import(pathToFileURL(`${F.root}/tools/rust-r4ghi/business/${name}.mjs`).href);
    const { FIXED, guard } = await helper('context'), { keyOf } = await helper('pure'); assert.equal(FIXED.namespace, F.namespace); assert.deepEqual(FIXED.databases, [F.database, F.rustDatabase]); assert.equal(FIXED.tables, plan.tables); assert.equal(FIXED.migrations, plan.migrations);
    for (const [key, value] of Object.entries({ DB_HOST: FIXED.host, DB_PORT: String(FIXED.port), DB_DATABASE: F.database, DB_USER: 'poms_r4ghi_native_app', DB_SCHEMA: 'poms', DB_CONNECT: 'true' })) assert.equal(env[key], value, `Owned Native env failed: ${key}`);
    assert.equal(env.POMS_ATTACHMENT_LOCAL_ROOT, `${F.stateRoot}/objects/native`);
    if (env.DATABASE_URL) { const u = new URL(env.DATABASE_URL); assert(['postgres:', 'postgresql:'].includes(u.protocol)); assert.equal(u.hostname, FIXED.host); assert.equal(u.port, String(FIXED.port)); assert.equal(decodeURIComponent(u.pathname.slice(1)), F.database); assert.equal(decodeURIComponent(u.username), 'poms_r4ghi_native_app'); }
    const identity = jsonPin(plan.identity, [F.stateRoot]), provision = jsonPin(plan.provision); assert.equal(identity.namespace, F.namespace); assert.equal(identity.marker, provision.marker); assert.deepEqual(identity.databases, FIXED.databases);
    assert.equal(identity.container, 'poms-r4ghi-pg15'); assert.equal(identity.volume, 'poms-r4ghi-pg15-data'); assert.equal(identity.port, FIXED.port);
    const dir = `${F.private}/native-reference92/${plan.phaseRun}`; fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); assert.equal(fs.realpathSync(dir), dir);
    const lockFile = `${dir}/driver.lock`, lockIdentity = { pid: process.pid, startTime: pidStart(process.pid), executable: fs.realpathSync(process.execPath), planSHA256: approvedSHA, NativeOnly: true };
    fs.writeFileSync(lockFile, JSON.stringify(lockIdentity) + '\n', { flag: 'wx', mode: 0o600 });
    const stateFile = `${dir}/state.json`; assert(mode !== 'baseline' || !fs.existsSync(stateFile), 'No replay of an existing Native phase');
    const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile)) : { kind: 'isolated-Native-reference-state92-not-Rust-context', phase: 'new', planSHA256: approvedSHA, sequence: 0, actors: {}, owned: {}, borrowed: {}, objects: {}, attempts: [] };
    assert.equal(state.planSHA256, approvedSHA); assert(!state.blockedObservation); const password = pinned(plan.ownerPassword, [F.private]).toString();
    const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
    const ctx = { ...FIXED, database: F.database, api: F.api, identity, provision, epoch: 'native-reference92', run: plan.phaseRun, state, priv: dir, out: `${F.root}/tmp/rust-r4ghi/native-reference92/${plan.phaseRun}`, options: {}, require };
    fs.mkdirSync(ctx.out, { recursive: true });
    ctx.persist = () => { const temp = `${stateFile}.${randomUUID()}.tmp`; fs.writeFileSync(temp, JSON.stringify(state, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); fs.renameSync(temp, stateFile); };
    ctx.next = name => `${String(++state.sequence).padStart(6, '0')}-${segment92(name)}`;
    ctx.artifact = (name, value, summary = null) => { assert.equal(path.basename(name), name); const b = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n'); const file = `${dir}/${name}`; fs.writeFileSync(file, b, { flag: 'wx', mode: 0o600 }); const pin = { file, rawBytesSha256: sha(b) }; if (summary) ctx.public(`${name}.receipt.json`, { ...summary, original: pin }); return pin; };
    ctx.public = (name, value) => { assert.equal(path.basename(name), name); fs.writeFileSync(`${ctx.out}/${name}`, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); };
    ctx.own = (database, table, row, proof) => {
        assert.equal(database, F.database); assert(['auth_session', 'audit_log', 'security_event'].includes(table), 'No Native business authority can be created or owned');
        const value = JSON.parse(row.raw);
        if (table === 'auth_session') { assert.equal(value.user_id, state.actors.native?.id); if (state.sessionId) assert.equal(row.key[0], state.sessionId); }
        else { assert.equal(value.request_id, state.inflightRequestId); assert.equal(proof.requestId, state.inflightRequestId, 'Any real audit must remain exactly tied to this Native attempt'); }
        const key = keyOf(database, table, row.key), prior = state.owned[key]; if (prior) { prior.latestSha256 = row.sha256; prior.latestXmin = row.xmin; prior.latestProof = proof; } else state.owned[key] = { database, table, key: row.key, firstSha256: row.sha256, latestSha256: row.sha256, latestXmin: row.xmin, proof, latestProof: proof };
        fs.appendFileSync(`${dir}/ownership.jsonl`, JSON.stringify({ key, rowSHA256: row.sha256, proof }) + '\n', { mode: 0o600 }); ctx.persist();
    };
    ctx.client = async database => { assert(FIXED.databases.includes(database)); const client = new Client({ host: FIXED.host, port: FIXED.port, user: FIXED.owner, password, database, application_name: `native92-${plan.phaseRun}`, connectionTimeoutMillis: 8000, query_timeout: 45000, options: '-c statement_timeout=45000 -c lock_timeout=10000' }); await client.connect(); try { await guard(ctx, client, database); } catch (error) { await client.end(); throw error; } return client; };
    ctx.db = async (fn, database = F.database) => { const client = await ctx.client(database); try { return await fn(client); } finally { await client.end(); } };
    ctx.persist(); return { ctx, helper, env, release: () => { const actual = JSON.parse(fs.readFileSync(lockFile)); assert.deepEqual(actual, lockIdentity); fs.unlinkSync(lockFile); } };
}

export async function executeNative92(plan, approvedSHA, mode, processPin = null) {
    assert(['baseline', 'run', 'cleanup'].includes(mode)); const frame = await context(plan, approvedSHA, mode);
    try { return await executeBoundNative92(plan, mode, processPin, frame); } finally { frame.release(); }
}
async function executeBoundNative92(plan, mode, processPin, { ctx, helper }) {
    const { state } = ctx;
    const { capture, readRows, loadSnapshot } = await helper('snapshot'), { reconcileAttempt, assertRecorded } = await helper('ledger'), { exactRawTouch } = await helper('fault-sweep');
    const compare = (a, b, options = {}) => assertSnapshot92(a, b, { readRows, rawTouch: exactRawTouch, ...options });
    if (mode === 'baseline') { const snapshot = await capture(ctx, ctx.next('before-start')); state.baseline = snapshot.manifest; state.phase = 'baseline-captured'; ctx.persist(); return { mode, phase: state.phase, baseline: state.baseline }; }
    if (mode === 'cleanup') {
        assert.equal(state.phase, 'complete'); assert(state.process && state.sessionId); const record = jsonPin(state.process);
        assert(!fs.existsSync(`/proc/${record.pid}/stat`) || pidStart(record.pid) !== record.startTime, 'Root must stop only the actual owned Native process first');
        const before = await capture(ctx, ctx.next('cleanup-before')); assertRecorded(ctx, before);
        const row = readRows(before.databases[F.database].tables.auth_session).find(r => r.key[0] === state.sessionId); assert(row);
        const own = Object.values(state.owned).find(r => r.table === 'auth_session' && r.key[0] === state.sessionId); assert(own && !own.deleted); assert.equal(own.latestSha256, row.sha256); assert.equal(own.latestXmin, row.xmin);
        assert.equal(Object.values(state.owned).filter(value => !value.deleted).length, 1); assert.equal(own.proof.kind, 'HTTP-real-cookie-token-hash'); assert.equal(own.proof.beforeAbsent, true);
        assert(!before.databases[F.database].meta.foreignKeys.some(f => f.parent === 'auth_session'), 'Additional inbound auth refs require a separate exact cleanup plan');
        assert(!before.databases[F.database].meta.externalForeignKeys.some(f => f.parent === 'auth_session'), 'External auth-session references are outside this cleanup scope');
        state.cleanupIntent = ctx.artifact(`${ctx.next('cleanup-intent')}.json`, { database: F.database, onlyNewOwnedSessionPK: row.key, rowSHA256: row.sha256, xmin: row.xmin, birth: own.proof }); state.phase = 'cleanup-started'; ctx.persist();
        try {
            await ctx.db(async client => { await client.query('BEGIN'); try { const current = (await client.query('SELECT row_to_json(s)::text raw,s.xmin::text xmin FROM poms.auth_session s WHERE id=$1::uuid FOR UPDATE', [state.sessionId])).rows; assert.equal(current.length, 1); assert.equal(sha(current[0].raw), row.sha256); assert.equal(current[0].xmin, row.xmin); const result = await client.query('DELETE FROM poms.auth_session WHERE id=$1::uuid AND xmin::text=$2', [state.sessionId, row.xmin]); assert.equal(result.rowCount, 1); await client.query('COMMIT'); } catch (error) { await client.query('ROLLBACK'); throw error; } });
        } catch (error) {
            state.blockedObservation = ctx.artifact(`${ctx.next('cleanup-partial')}.json`, { cleanupIntent: state.cleanupIntent, name: error.name, code: error.code ?? null, noAutomaticRepeatAfterUnknownCommit: true }); ctx.persist(); throw error;
        }
        own.deleted = true; ctx.persist();
        const after = await capture(ctx, ctx.next('cleanup-after')); compare(loadSnapshot(ctx), after);
        const fresh1 = await capture(ctx, ctx.next('fresh-noop1')); compare(after, fresh1); const fresh2 = await capture(ctx, ctx.next('fresh-noop2')); compare(fresh1, fresh2);
        state.phase = 'cleaned-conserved'; state.cleanupProof = ctx.artifact(`${ctx.next('conservation-proof')}.json`, { NativeOnly: true, RustContextWritten: false, baseline: state.baseline, after: after.manifest, fresh1: fresh1.manifest, fresh2: fresh2.manifest, allOriginalRowsAndXminCatalogSequencesObjectsEqual: true, onlyAddedOwnedAuthSessionDeleted: true, G3Certified: false, G4Certified: false }); ctx.persist(); return { mode, phase: state.phase, proof: state.cleanupProof };
    }
    assert.equal(state.phase, 'baseline-captured', 'No blind replay of a completed/partial Native batch'); const processRecord = jsonPin(processPin); assert.equal(processRecord.planSHA256, state.planSHA256); state.process = processPin;
    const startupAfter = await capture(ctx, ctx.next('startup-after'));
    try { verifyProcess(plan, processRecord); compare(loadSnapshot(ctx), startupAfter); } catch (error) {
        state.phase = 'blocked-startup'; state.blockedObservation = ctx.artifact(`${ctx.next('startup-partial')}.json`, { before: state.baseline, after: startupAfter.manifest,
            name: error.name, message: error.message, noAuthenticationSent: true, unexplainedStartupEffectsNotAdmitted: true, noAutomaticRowRestore: true }); ctx.persist();
        throw new Error('Native startup changed the owned baseline; stop and reconcile actual effects before authentication');
    }
    state.startupNoEffects = startupAfter.manifest; state.phase = 'running'; ctx.persist();
    const actor = state.actors.native = { id: plan.expectedNativeUserId, permissions: [], cookies: {} };
    async function request(operationId, urlPath, body, status, role, test = null) {
        verifyProcess(plan, processRecord); const label = ctx.next('native-http'), requestId = `native92-${plan.phaseRun}-${label}-${randomUUID().slice(0, 8)}`;
        state.inflightRequestId = requestId; ctx.persist();
        const before = await capture(ctx, `${label}-before`); assertRecorded(ctx, before);
        const bytes = body === null ? Buffer.alloc(0) : Buffer.from(JSON.stringify(body)), method = body === null ? 'GET' : 'POST';
        const headers = { Origin: 'http://127.0.0.1:44551', 'X-Request-Id': requestId, 'Accept-Encoding': 'identity' };
        if (Object.keys(actor.cookies).length) headers.Cookie = Object.entries(actor.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
        if (body !== null) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = bytes.length; if (actor.cookies.poms_csrf) headers['X-CSRF-Token'] = decodeURIComponent(actor.cookies.poms_csrf); }
        const originals = { requestConfig: ctx.artifact(`${label}-request.json`, { operationId, requestId, method, url: F.api + urlPath, headers }), requestBody: ctx.artifact(`${label}-request-body.bin`, bytes) };
        let response = null, failure = null; const chunks = [];
        try { response = await new Promise((resolve, reject) => { const outgoing = http.request(F.api + urlPath, { method, headers, timeout: 45000 }, incoming => {
            originals.responseHeaders = ctx.artifact(`${label}-response-headers.json`, { status: incoming.statusCode, rawHeaders: incoming.rawHeaders });
            for (const cookie of incoming.headers['set-cookie'] ?? []) { const first = cookie.split(';', 1)[0], at = first.indexOf('='); assert(at > 0); const key = first.slice(0, at); assert(['poms_session', 'poms_csrf'].includes(key)); actor.cookies[key] = first.slice(at + 1); }
            incoming.on('data', value => chunks.push(Buffer.from(value))); incoming.once('aborted', () => reject(new Error('Incomplete Native response'))); incoming.once('error', reject); incoming.once('end', () => resolve({ status: incoming.statusCode, complete: incoming.complete }));
        }); outgoing.once('error', reject); outgoing.once('timeout', () => outgoing.destroy(new Error('Native response timeout'))); outgoing.end(bytes); }); } catch (error) { failure = { name: error.name, code: error.code ?? null }; }
        const raw = Buffer.concat(chunks); originals.responseBody = ctx.artifact(`${label}-response-body.bin`, raw); let value = null; try { value = JSON.parse(raw); } catch { /* Preserve actual bytes. */ }
        const attempt = { operationId, requestId, actorId: actor.id, actorKey: 'native', pathParams: test?.params ?? {}, requestValue: body, status: response?.status ?? null, expectedStatus: status, responseComplete: response?.complete === true, transportFailure: Boolean(failure), body: value, transport: 'actual-Native-reference31442-not-Rust' };
        const after = await capture(ctx, `${label}-after`); let policyError = null;
        try { const session = compare(before, after, { mode: role, sessionId: state.sessionId, actorId: actor.id, tokenHash: actor.cookies.poms_session ? sha(decodeURIComponent(actor.cookies.poms_session)) : null }); if (role === 'login') { assert(session); state.sessionId = session.key[0]; } } catch (error) { policyError = error; }
        let ledger;
        try { ledger = await reconcileAttempt(ctx, before, after, attempt, {}); } catch (error) {
            const observation = ctx.artifact(`${label}-ledger-partial.json`, { attempt, originals, before: before.manifest, after: after.manifest,
                originalLedgerBlocker: state.blockedObservation ?? null, error: { name: error.name, message: error.message }, noAutomaticReplay: true });
            state.attempts.push({ operationId, role, status: attempt.status, observation, ledgerComplete: false }); ctx.persist(); throw error;
        } // Original rows have no borrowed mutation allowlist.
        const observation = ctx.artifact(`${label}-attempt.json`, { attempt, originals, before: before.manifest, after: after.manifest, ledger, policyError: policyError ? { name: policyError.name, message: policyError.message } : null, NativeOnly: true });
        state.attempts.push({ operationId, role, status: attempt.status, observation, ledger }); ctx.persist();
        if (policyError) throw policyError; assert.equal(attempt.status, status); assert(attempt.responseComplete && !attempt.transportFailure); if (test) assertUnsupported92(attempt, test);
        ctx.public(`${label}-http.json`, { kind: 'actual-Native-modern-reference-not-Rust', operationId, status: attempt.status, expectedStatus: status, observation, ledger, secretValuesPublished: false, businessProducer: false, G3Certified: false }); return value?.data ?? value;
    }
    try {
        const credentials = jsonPin(plan.credentials); assert(typeof credentials.username === 'string' && typeof credentials.password === 'string' && credentials.password);
        const originalUser = readRows(startupAfter.databases[F.database].tables.platform_user).find(row => row.key[0] === actor.id); assert(originalUser && JSON.parse(originalUser.raw).is_active === true);
        const inventory = jsonPin(plan.inventory), cases = taggedCases92(inventory); assert.deepEqual(plan.permissionUnion, inventory.permissionUnion);
        const occupied = new Set(Object.values(startupAfter.databases).flatMap(d => Object.values(d.tables).flatMap(t => readRows(t).flatMap(row => row.key)))); for (const test of cases) for (const value of Object.values(test.params)) assert(!occupied.has(value), 'A routing anchor must not be mistaken for an existing business resource');
        await request('AuthController_getCsrfToken', '/api/auth/csrf-token', null, 200, 'unchanged');
        await request('AuthController_createPasswordAuthSession', '/api/auth/sessions', { username: credentials.username, password: credentials.password }, 200, 'login');
        const current = await request('AuthController_getCurrentAuthSession', '/api/auth/session', null, 200, 'modern'); assert.equal(current.authenticated, true); assert.equal(current.user.id, actor.id);
        for (const permission of plan.permissionUnion) assert(current.permissions.includes(permission)); actor.permissions = current.permissions; ctx.persist();
        for (const test of cases) await request(test.operationId, test.path, test.body, 422, 'modern', test);
        assert.equal(state.attempts.filter(row => row.status === 422).length, 17); state.phase = 'complete'; state.proof = ctx.artifact(`${ctx.next('modern17-proof')}.json`, { NativeOnly: true, actualAPI: F.api, process: processPin, inventory: plan.inventory, startupNoEffects: state.startupNoEffects,
            nativeSessionId: state.sessionId, actualNative422Operations: state.attempts.filter(row => row.status === 422), legacyPositiveHTTPExecuted: false, RustAcceptanceClaimed: false, G3Certified: false, G4Certified: false }); ctx.persist(); return { mode, phase: state.phase, proof: state.proof };
    } catch (error) { state.phase = 'blocked'; state.blockedObservation = ctx.artifact(`${ctx.next('partial')}.json`, { name: error.name, message: error.message, actualAttempts: state.attempts, preserveCommittedAuthEffects: true, noAutomaticReplayOrBorrowedRowRestore: true }); ctx.persist(); throw new Error('Native phase blocked; preserve private originals and reconcile before any cleanup/retry'); }
}

async function main(argv) {
    if (argv.length === 1 && argv[0] === '--help') { console.log('Root only: --mode baseline|run|cleanup --plan FILE --plan-sha SHA [--process FILE --process-sha SHA] --execute. Starts no process.'); return; }
    assert.equal(argv.at(-1), '--execute'); const args = args92(argv.slice(0, -1));
    assert.deepEqual(Object.keys(args).sort(), (args['--mode'] === 'run' ? ['--mode', '--plan', '--plan-sha', '--process', '--process-sha'] : ['--mode', '--plan', '--plan-sha']).sort());
    const pin = { file: args['--plan'], rawBytesSha256: args['--plan-sha'] }, plan = jsonPin(pin);
    const result = await executeNative92(plan, pin.rawBytesSha256, args['--mode'], args['--process'] ? { file: args['--process'], rawBytesSha256: args['--process-sha'] } : null);
    console.log(JSON.stringify({ kind: 'Root-owned-Native-reference92-stage', mode: result.mode, phase: result.phase, G3Certified: false }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(() => { console.error('Native92 failed; private originals retained. No retry, process control or Rust acceptance inferred.'); process.exitCode = 1; });
