// Root I/O helpers. Import has no reads; exported calls are used only by guarded CLI.
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { normalizeHTTP103 } from './ownership103.mjs';
export const ROOT103 = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', PRIVATE103 = '/home/wangzishi/.local/share/poms-r4def/private', PUBLIC103 = ROOT103 + '/tmp/rust-r4def/root';
const WIN = 'E:/projects/worktrees/poms-r3hijk-next28/poms', runFile = promisify(execFile);
export const sha103 = value => createHash('sha256').update(value).digest('hex');
export function allowedPath103(file) {
    let p = file.replaceAll('\\', '/');
    if (p.startsWith('//wsl.localhost/Debian/')) p = '/' + p.slice('//wsl.localhost/Debian/'.length);
    if (p.startsWith(WIN + '/')) p = ROOT103 + p.slice(WIN.length);
    if (!p.startsWith('/')) p = ROOT103 + '/' + p;
    p = path.posix.normalize(p);
    assert([PRIVATE103 + '/', PUBLIC103 + '/', ROOT103 + '/tmp/rust-r4def/private/', ROOT103 + '/tools/rust-r4def/E/cleanup70/', ROOT103 + '/tools/rust-r4def/E/cleanup-wrapper103/'].some(root => p.startsWith(root)), 'File outside this owned namespace/public/core scope'); return p;
}
export async function readBytesPinned103(file, expected) {
    const p = allowedPath103(file), s = await fs.lstat(p); assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1); assert.equal(await fs.realpath(p), p); const bytes = await fs.readFile(p), actual = sha103(bytes);
    if (expected) { assert.equal(actual, expected.rawBytesSha256 ?? expected.sha256); if (expected.bytes != null) assert.equal(bytes.length, expected.bytes); }
    return { file: p, bytes: bytes.length, rawBytesSha256: actual, data: bytes };
}
export async function readPinned103(file, expected) { const p = await readBytesPinned103(file, expected); return { file: p.file, bytes: p.bytes, rawBytesSha256: p.rawBytesSha256, value: JSON.parse(p.data.toString('utf8')) }; }
export async function createOutput103(edition) {
    assert(/^[0-9]+[a-z]?$/.test(edition)); const priv = PRIVATE103 + '/cleanup-wrapper103-' + edition, pub = PUBLIC103 + '/cleanup-wrapper103-' + edition; await fs.mkdir(priv, { mode: 0o700 }); await fs.mkdir(pub);
    async function write(where, name, value) { assert(/^[a-zA-Z0-9-]+$/.test(name)); const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n'), file = where + '/' + name + '.json'; await fs.writeFile(file, bytes, { flag: 'wx', mode: 0o600 }); return { file, bytes: bytes.length, rawBytesSha256: sha103(bytes) }; }
    return { priv, pub, private: (name, value) => write(priv, name, value), public: (name, value) => write(pub, name, value) };
}
export async function environment103() {
    const id = await readPinned103(PRIVATE103 + '/../identity.json').catch(async () => { // identity is metadata beside new private, never old state.
        const p = '/home/wangzishi/.local/share/poms-r4def/identity.json', s = await fs.lstat(p); assert(s.isFile() && !s.isSymbolicLink() && s.nlink === 1); assert.equal(await fs.realpath(p), p); const b = await fs.readFile(p); return { file: p, bytes: b.length, rawBytesSha256: sha103(b), value: JSON.parse(b) };
    });
    assert(id.value.namespace === 'poms-r4def' && id.value.base === '756d813c9578090fcf8e56821acce01b46b40420' && id.value.port === 25433);
    const provision = await readPinned103(PUBLIC103 + '/environment21/provision01.json');
    const { stdout } = await runFile('/usr/bin/podman', ['--cgroup-manager=cgroupfs', 'inspect', 'poms-r4def-pg15'], { maxBuffer: 2000000 }); const pod = JSON.parse(stdout)[0];
    assert(pod.State.Running && pod.Id === provision.value.containerId && pod.Config.Labels['org.poms.scope'] === 'poms-r4def' && pod.Config.Labels['org.poms.base'] === id.value.base && pod.Mounts.some(m => m.Name === 'poms-r4def-pg15-data') && pod.NetworkSettings.Ports['15432/tcp'].some(p => p.HostIp === '127.0.0.1' && p.HostPort === '25433'));
    return { identity: id.value, identityPin: { ...id, value: undefined }, provision: provision.value, provisionPin: { ...provision, value: undefined }, container: { id: pod.Id, name: 'poms-r4def-pg15', volume: 'poms-r4def-pg15-data', hostPort: 25433 } };
}
export async function guardDB103(c, backend, environment) {
    assert(c.connectionParameters.host === '127.0.0.1' && Number(c.connectionParameters.port) === 25433);
    const { rows: [r] } = await c.query("SELECT current_database() database,current_user::text principal,current_setting('port') server_port,current_setting('server_version_num') server_version_num,current_setting('poms.r0e_isolated',true) isolated,current_setting('TimeZone') presentation_time_zone,(SELECT oid::text FROM pg_database WHERE datname=current_database()) database_oid");
    assert(r.database === 'poms_r4def_' + backend && r.principal === 'poms_r0e_owner' && r.server_port === '15432' && r.server_version_num === '150012' && r.isolated === 'on'); assert.equal(r.database_oid, environment.provision.databaseOids.find(d => d.database === r.database)?.oid);
    const marker = (await c.query('SELECT instance_id::text,namespace,source_base FROM r4def_control.marker')).rows; assert.deepEqual(marker, [{ instance_id: environment.identity.marker, namespace: 'poms-r4def', source_base: environment.identity.base }]); if (environment.expectedBaselineTimeZone) assert.equal(r.presentation_time_zone, environment.expectedBaselineTimeZone, 'Retain the original baseline presentation timezone; do not normalize timestamps');
    return { namespace: 'poms-r4def', base: environment.identity.base, instanceId: environment.identity.marker, database: r.database, databaseOid: r.database_oid, host: '127.0.0.1', hostPort: 25433, serverPort: 15432, serverVersionNum: 150012, isolated: 'on', presentationTimeZone: r.presentation_time_zone, containerId: environment.container.id, environmentReceiptId: environment.provisionPin.file };
}
const quote = name => { assert(/^[a-z_][a-z_0-9]*$/.test(name)); return '"' + name + '"'; };
export async function captureDB103(c, backend, environment, { insideTransaction = false } = {}) {
    const scope = await guardDB103(c, backend, environment); if (!insideTransaction) await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    try {
        const columns = (await c.query("SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,character_maximum_length,numeric_precision,numeric_scale,ordinal_position FROM information_schema.columns WHERE table_schema='poms' ORDER BY table_name,ordinal_position")).rows;
        const indexes = (await c.query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='poms' ORDER BY tablename,indexname")).rows;
        const constraints = (await c.query("SELECT c.relname table_name,k.conname,k.contype,k.convalidated,k.condeferrable,k.condeferred,pg_get_constraintdef(k.oid) definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' ORDER BY c.relname,k.conname")).rows;
        const tables = [...new Set(columns.map(r => r.table_name))].sort(); assert.equal(tables.length, 120); const liveRows = {}; for (const table of tables) liveRows[table] = (await c.query(`SELECT to_jsonb(t)::text AS raw FROM poms.${quote(table)} t ORDER BY to_jsonb(t)::text`)).rows.map(r => r.raw);
        const triggers = (await c.query("SELECT t.relname table_name,g.tgname,g.tgenabled,pg_get_triggerdef(g.oid) definition FROM pg_trigger g JOIN pg_class t ON t.oid=g.tgrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='poms' AND NOT g.tgisinternal ORDER BY t.relname,g.tgname")).rows;
        const policies = (await c.query("SELECT * FROM pg_policies WHERE schemaname='poms' ORDER BY tablename,policyname")).rows;
        const acl = (await c.query("SELECT t.relname,t.relacl::text,t.relrowsecurity,t.relforcerowsecurity FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='poms' AND t.relkind IN('r','p') ORDER BY t.relname")).rows;
        const functions = (await c.query("SELECT p.proname,pg_get_function_identity_arguments(p.oid) args,pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='poms' AND p.prokind IN('f','p') ORDER BY p.proname,pg_get_function_identity_arguments(p.oid)")).rows;
        const schemaACL = (await c.query("SELECT nspname,nspowner::regrole::text owner,nspacl::text acl FROM pg_namespace WHERE nspname IN('poms','r4def_control') ORDER BY nspname")).rows;
        const columnACL = (await c.query("SELECT c.relname,a.attname,a.attacl::text,a.attidentity,a.attgenerated,a.attcollation::regcollation::text FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum")).rows;
        const sequences = (await c.query("SELECT c.relname,s.seqstart::text,s.seqincrement::text,s.seqmax::text,s.seqmin::text,s.seqcache::text,s.seqcycle FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' ORDER BY c.relname")).rows;
        const gateSchemas = (await c.query("SELECT nspname FROM pg_namespace WHERE nspname LIKE 'r4def_%' ORDER BY nspname")).rows; assert.deepEqual(gateSchemas, [{ nspname: 'r4def_control' }], 'A test gate schema remains; restore it under its original protocol');
        const appConnections = (await c.query("SELECT pid,datname,usename,state,query_start FROM pg_stat_activity WHERE datname=$1 AND usename IN('poms_r4def_native_app','poms_r4def_rust_app') ORDER BY pid", [scope.database])).rows;
        const otherWriters = (await c.query("SELECT pid,usename,state,query_start FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid() AND state='active' AND query !~* '^\\s*(SELECT|SHOW|BEGIN|COMMIT|ROLLBACK)' ORDER BY pid", [scope.database])).rows;
        if (!insideTransaction) await c.query('COMMIT');
        return { backend, scope, liveRows, catalog: { columns, indexes, constraints }, guards: { triggers, policies, acl, supplement: { functions, schemaACL, columnACL, sequences, gateSchemas } }, appConnections, otherWriters, capturedAt: new Date().toISOString() };
    } catch (e) { if (!insideTransaction) await c.query('ROLLBACK'); throw e; }
}
export async function stopped103(environment, UIReceipts) {
    const names = (await fs.readdir(PRIVATE103)).filter(n => /^(?:rust-api\d+|native-legacy\d+)-process\.json$/.test(n)); assert(names.some(n => n.startsWith('rust-api')) && names.some(n => n.startsWith('native-legacy')), 'Discover actual batch process records, not a chosen stopped subset');
    const records = [];
    for (const name of names) { const p = await readPinned103(PRIVATE103 + '/' + name), r = p.value; assert(r.namespace === 'poms-r4def' && [31341, 31342].includes(r.port) && Number.isSafeInteger(r.pid) && r.startTime); let actual = null; try { const s = await fs.readFile(`/proc/${r.pid}/stat`, 'utf8'), v = s.slice(s.lastIndexOf(')') + 2).split(' '); actual = { state: v[0], startTime: v[19] }; } catch (e) { if (e.code !== 'ENOENT') throw e; } assert(!actual || actual.state === 'Z' || actual.startTime !== r.startTime, 'An actual owned API process is still alive'); records.push({ record: { file: p.file, rawBytesSha256: p.rawBytesSha256 }, pid: r.pid, expectedStartTime: r.startTime, observed: actual, originalProcessGone: true }); }
    const ports = []; for (const port of [31341, 31342, 31343, 44451]) { await new Promise((resolve, reject) => { const server = net.createServer(); server.once('error', reject); server.listen(port, '127.0.0.1', () => server.close(resolve)); }); ports.push({ host: '127.0.0.1', port, actuallyBoundAndReleased: true }); }
    for (const ui of UIReceipts) if (ui.exchanges?.length) assert(ui.closed?.serverClosed === true && ui.closed.pending === 0 && ui.closed.allRawExchangesRetained === true, 'Real UI proxy close ACK required, including Windows');
    return { instanceId: environment.identity.marker, records, ports, UIProxyCloseReceipts: UIReceipts.map(x => x.receiptId), actualObservations: true };
}
function routeMatcher(spec) { const all = []; for (const [template, methods] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(methods)) if (op.operationId) { const regexp = new RegExp('^' + template.split(/(\{[^}]+\})/).map(x => x.startsWith('{') ? '[^/]+' : x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('') + '$'); all.push({ method: method.toUpperCase(), operationId: op.operationId, regexp }); } return (method, p) => all.find(x => x.method === method && x.regexp.test(p.split('?')[0]))?.operationId; }
export async function collectReceipts103({ liveRows, spec }) {
    const HTTP = [], internal = [], UI = [], pins = [], route = routeMatcher(spec);
    const auth = liveRows.auth_session.map(r => JSON.parse(typeof r === 'string' ? r : r.raw ?? JSON.stringify(r))), token = new Map(auth.map(r => [r.token_hash, r.user_id]));
    const addPin = r => { const p = { file: r.file, bytes: r.bytes, rawBytesSha256: r.rawBytesSha256 }; pins.push(p); return p; };
    for (const directory of ['api32', 'api53']) {
        const folder = PUBLIC103 + '/' + directory; let names; try { names = await fs.readdir(folder); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
        if (directory === 'api53') { const native = await readPinned103(PUBLIC103 + '/native-legacy53/launcher53.json'); assert(native.value.namespace === 'poms-r4def' && native.value.database === 'poms_r4def_rust' && native.value.databaseMigrations === 94 && native.value.port === 31342 && native.value.businessResponsesMocked === false); addPin(native); }
        for (const name of names.filter(n => /^\d+-[A-Za-z0-9_]+\.json$/.test(n)).sort()) {
            const source = await readPinned103(folder + '/' + name), r = source.value; if (!['actual-HTTP-receipt', 'actual-binary-HTTP-receipt'].includes(r.kind)) continue; assert.equal(route(r.method, r.path), r.operationId, 'Actual receipt/current canonical route mismatch');
            const receiptPins = [addPin(source)];
            if (r.kind === 'actual-binary-HTTP-receipt') { if (!r.responseComplete || r.transportFailure || !r.originals?.responseBody) continue; const raw = await readBytesPinned103(r.originals.responseBody.file, r.originals.responseBody); receiptPins.push({ file: raw.file, bytes: raw.bytes, rawBytesSha256: raw.rawBytesSha256 }); try { r.responseBody = JSON.parse(raw.data.toString('utf8')); } catch { r.responseBody = null; } }
            HTTP.push(normalizeHTTP103(r, { receiptId: source.file, receiptPins }));
        }
    }
    const top = await fs.readdir(PUBLIC103, { withFileTypes: true });
    for (const dir of top.filter(d => d.isDirectory() && /^ui-/.test(d.name))) for (const filename of ['receipt45.json', 'receipt59.json']) {
        let source; try { source = await readPinned103(PUBLIC103 + '/' + dir.name + '/' + filename); } catch (e) { if (e.code === 'ENOENT') continue; throw e; } const view = source.value; if (!['real-production-Angular-browser-to-Rust', 'real-D-controlled-amendment-and-rebaseline-browser59'].includes(view.kind)) continue; addPin(source); UI.push({ receiptId: source.file, exchanges: view.exchanges, closed: view.closed });
        for (const exchange of view.exchanges ?? []) {
            assert(exchange.backendPort === 31341 && exchange.privateRaw && exchange.completedAt); const raw = await readPinned103(exchange.privateRaw.file, exchange.privateRaw), r = raw.value, p = new URL(r.request.path, 'http://127.0.0.1').pathname, operationId = route(r.request.method, p); if (!operationId) continue; assert.equal(r.response.status, exchange.status);
            let req, res; try { req = JSON.parse(Buffer.from(r.request.bodyBase64, 'base64').toString()); } catch { req = null; } try { res = JSON.parse(Buffer.from(r.response.bodyBase64, 'base64').toString()); } catch { res = null; }
            const cookie = String(r.request.headers.cookie ?? '').split(';').map(x => x.trim()).find(x => x.startsWith('poms_session='))?.slice(13); let actorId = null;
            if (cookie) { const candidates = new Set([cookie, (() => { try { return decodeURIComponent(cookie); } catch { return cookie; } })()].map(x => token.get(sha103(x))).filter(Boolean)); assert(candidates.size <= 1); actorId = [...candidates][0] ?? null; }
            const requestId = r.request.headers['x-request-id'] ?? null;
            HTTP.push(normalizeHTTP103({ operationId, method: r.request.method, path: p, status: r.response.status, startedAt: exchange.startedAt, completedAt: exchange.completedAt, requestId, requestBody: req, responseBody: res, actorId }, { receiptId: raw.file, source: 'actual-UI', receiptPins: [addPin(raw), { file: source.file, bytes: source.bytes, rawBytesSha256: source.rawBytesSha256 }] }));
        }
    }
    for (const dir of top.filter(d => d.isDirectory() && /^summary\d+$/.test(d.name))) { let source; try { source = await readPinned103(PUBLIC103 + '/' + dir.name + '/receipt39.json'); } catch (e) { if (e.code === 'ENOENT') continue; throw e; } addPin(source); internal.push({ ...source.value, receiptId: source.file, backend: 'rust' }); }
    const fixtureSource = await readPinned103(PRIVATE103 + '/actors33.json'), fixture = fixtureSource.value; addPin(fixtureSource); assert.equal(fixture.tag, 'r4def33'); const actorPublic = await readPinned103(PUBLIC103 + '/api32/actors35.json'); addPin(actorPublic); assert.equal(actorPublic.value.actors.full.id, fixture.actors.full.id);
    const foundationSource = await readPinned103(PUBLIC103 + '/foundation77/receipt77.json'), readback = await readPinned103(PUBLIC103 + '/foundation77/readback77.json'); addPin(foundationSource); addPin(readback); const f = foundationSource.value;
    assert(f.kind === 'original-Nx-real-external-foundation77' && f.exitCode === 0 && f.mode === 'external' && f.suite === 'foundation' && f.apiOrigin === 'http://127.0.0.1:31341' && f.noAutomaticSeedOrReset && readback.value.suitesPassed === 1 && readback.value.testsPassed === 13);
    const consoleRaw = await readBytesPinned103(f.originalStreamsPrivate.file, f.originalStreamsPrivate); pins.push({ file: consoleRaw.file, bytes: consoleRaw.bytes, rawBytesSha256: consoleRaw.rawBytesSha256 }); const consoleText = consoleRaw.data.toString('utf8').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, ''); assert(/Tests:\s+13 passed,\s+13 total/.test(consoleText), 'Real original77 console must corroborate readback');
    return { HTTP, internal, UI, pins, fixture: { fullUserId: fixture.actors.full.id, fullUsername: fixture.actors.full.username, createdUserIds: Object.values(fixture.actors).filter(a => !a.borrowedSeedUser).map(a => a.id), createdCredentialIds: fixture.createdCredentials, receiptIds: [fixtureSource.file, actorPublic.file] }, foundation: { verified: true, startedAt: f.startedAt, completedAt: f.completedAt, receiptIds: [foundationSource.file, readback.file] } };
}
export async function checkedSupplements103(file, expectedSHA) {
    if (!file) return []; const source = await readPinned103(file, { rawBytesSha256: expectedSHA }); assert(Array.isArray(source.value));
    for (const item of source.value) {
        assert(item.verifiedByRoot === true && item.verificationReceipt && item.receipts?.length && item.primaryKey && item.rowFingerprint); const verification = await readPinned103(item.verificationReceipt.file, item.verificationReceipt), v = verification.value;
        assert(v.kind === 'Root-verified-single-PK-ownership103' && v.namespace === item.namespace && v.instanceId === item.instanceId && v.backend === item.backend && v.table === item.table && v.rowFingerprint === item.rowFingerprint && JSON.stringify(v.primaryKey) === JSON.stringify(item.primaryKey) && v.verifiedAt && v.reason === item.reason, 'Verification original must bind this exact single PK, not generic true');
        if (item.kind === 'counter-witness') assert(v.counterBeforeFingerprint === item.counterBeforeFingerprint && v.counterAfterFingerprint === item.counterAfterFingerprint);
        else assert(['http-command', 'internal-producer', 'auth-fixture', 'managed-auth-audit-security'].includes(item.producerKind));
        const refs = []; for (const p of item.receipts) refs.push((await readBytesPinned103(p.file, p)).file); item.verificationReceiptId = verification.file; item.receiptIds = refs;
    }
    return source.value;
}
