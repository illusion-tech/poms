// Root-only exact aggregate terminal executor. Author did not run environment I/O.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { pin, sha, base, guardCandidate, guardNative } from '../../../tools/rust-r3m/source-guard.mjs';
import { classifyAggregate, publicPlan, primaryKeys, DELETE_ORDER } from './aggregate-plan02.mjs';

const root = '/home/wangzishi/projects/poms-rust-r3m', state = '/home/wangzishi/.local/share/poms-r3m', priv = state + '/private';
const self = 'tmp/rust-r3m/terminal-draft/aggregate-run02.mjs', planFile = 'tmp/rust-r3m/terminal-draft/aggregate-plan02.mjs';
const [mode, backend, attempt, inputFile] = process.argv.slice(2);
assert.equal(process.cwd(), root); assert.equal(process.platform, 'linux'); assert(!Object.hasOwn(process.env, 'PGOPTIONS'), 'Terminal executor refuses inherited PGOPTIONS'); assert(['inspect','cleanup'].includes(mode)); assert(['rust','nest'].includes(backend)); assert.match(attempt, /^\d{2}$/);
assert.match(inputFile, /^tmp\/rust-r3m\/root\/[a-z0-9-]+\.json$/);
const input = JSON.parse(fs.readFileSync(inputFile)); assert.equal(input.kind, 'R3M-explicit-whole-current-batch-terminal-input'); assert.equal(input.namespace, 'poms-r3m'); assert.equal(input.base, base);
const out = 'tmp/rust-r3m/aggregate-terminal-' + mode + '-' + backend + attempt, privateOut = priv + '/aggregate-terminal-' + mode + '-' + backend + attempt;
assert(!fs.existsSync(out) && !fs.existsSync(privateOut)); fs.mkdirSync(out); fs.mkdirSync(privateOut, { mode: 0o700 });
const write = (file, v) => fs.writeFileSync(file, JSON.stringify(v, null, 2) + '\n', { flag: 'wx', mode: file.startsWith(priv + '/') ? 0o600 : 0o644 });
const q = name => { assert.match(name, /^[a-z_][a-z_0-9]*$/); return '"' + name + '"'; };
const sourcePins = [self, planFile, inputFile, 'tools/rust-r3m/source-guard.mjs', 'tools/rust-r3m/cohort-terminal01.mjs', 'tools/rust-r3m/fixture-actor03.mjs', 'tools/rust-r3m/acceptance-context03.mjs', 'tools/rust-r3m/acceptance-context04.mjs', 'apps/poms-api-rust/src/auth/guards.rs', 'tools/rust-r2ef/e-authority.json'].map(pin), privateInputPins = [];
function readPinned(p, pattern) { assert.match(p.file, pattern); assert.deepEqual(pin(p.file), p); return JSON.parse(fs.readFileSync(p.file)); }
function readCurrentPrivate(file) {
  assert(file.startsWith(priv + '/')); const expected = path.resolve(file); assert(expected.startsWith(priv + '/'), 'Resolved private path must remain in the current batch'); assert.equal(fs.realpathSync(file), expected, 'Never follow a private symlink or old namespace');
  const info = fs.lstatSync(file); assert(info.isFile() && !info.isSymbolicLink() && info.nlink === 1); privateInputPins.push(pin(file)); return fs.readFileSync(file);
}
const identityFile = state + '/identity.json', identity = JSON.parse(fs.readFileSync(identityFile));
assert.equal(identity.namespace, 'poms-r3m'); assert.equal(identity.base, base); assert.equal(identity.marker, input.marker); assert.equal(identity.port, 23433); assert.equal(identity.container, 'poms-r3m-pg15'); assert.equal(identity.volume, 'poms-r3m-pg15-data');
const originalIdentityPin = pin(identityFile);
const cohortPattern = /^tmp\/rust-r3m\/root\/(?:stage-(?:rust|nest)|ui-(?:linux|windows)-(?:native|rust)\d{2})-cohort01\.json$/;
assert(input.cohorts.length >= 2); assert.equal(new Set(input.cohorts.map(x => x.file)).size, input.cohorts.length);
const publicCurrentCohorts = fs.readdirSync('tmp/rust-r3m/root').map(f => 'tmp/rust-r3m/root/' + f).filter(f => cohortPattern.test(f)).sort();
assert.deepEqual(input.cohorts.map(x => x.file).sort(), publicCurrentCohorts, 'Every current stage/UI cohort, including partial attempts, must be explicitly registered');
const cohorts = input.cohorts.map(p => { const c = readPinned(p, cohortPattern); assert(['rust','nest'].includes(c.backend)); assert.equal(c.marker, identity.marker); assert.match(c.runId, /^[0-9a-f-]{36}$/); assert(['R3-final-candidate-owned-cohort','R3-independent-UI-cell-owned-cohort'].includes(c.kind)); sourcePins.push(p); return { ...c, registration: p }; });
assert.equal(new Set(cohorts.map(c => c.backend + '/' + c.runId)).size, cohorts.length, 'Current cohort registrations must be unique');
const ours = cohorts.filter(c => c.backend === backend), baselineCohort = ours.find(c => c.registration.file === 'tmp/rust-r3m/root/stage-' + backend + '-cohort01.json'); assert(baselineCohort);
const lineage = c => priv + '/acceptance-' + c.backend + '-' + c.runId;
const originalBaselineFile = lineage(baselineCohort) + '/baseline-before.json';
const baselineRaw = readCurrentPrivate(originalBaselineFile), baseline = JSON.parse(baselineRaw).map(t => ({ ...t, pk: primaryKeys(t.pk), rows: [...t.rows].sort() }));
assert.equal(baseline.length, 107);
const actors = [], contexts = [];
for (const c of ours) {
  const file = lineage(c) + '/context.json', value = JSON.parse(readCurrentPrivate(file));
  assert.equal(value.runId, c.runId); assert.equal(value.marker, identity.marker); assert.equal(value.base, base); assert.equal(value.database, 'poms_r3m_' + backend); assert(Array.isArray(value.actors));
  const names = new Set();
  for (const a of value.actors) { assert(!names.has(a.label)); names.add(a.label); actors.push({ label: a.label, userId: a.userId, orgId: a.orgId, roleId: a.roleId, username: a.username, runId: c.runId, registration: { cohort: c.registration, privateContext: pin(file) } }); }
  // Deliberately ignore context.ownedIds and remember() contents.
  contexts.push({ cohort: c.registration, runId: c.runId, original: pin(file), actorCount: value.actors.length });
}
const expectedCatalogPin = input.expectedCatalog[backend], expectedCatalog = readPinned(expectedCatalogPin, /^tmp\/rust-r3m\/[a-z0-9-]+\/(?:rust|nest)-(?:before|after)-catalog\.json$/); sourcePins.push(expectedCatalogPin);
assert.equal(expectedCatalog.tables.length, 107); assert.equal(expectedCatalog.columns.length, 1778); assert.equal(expectedCatalog.migrations.length, 92); assert.equal(expectedCatalog.privileges.length, 428); assert(expectedCatalog.privileges.every(p => p.allowed));
const logProof = readPinned(input.originalLogSettingsEvidence, /^tmp\/rust-r3m\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\.json$/); sourcePins.push(input.originalLogSettingsEvidence);
assert.equal(logProof.kind, 'R3M-original-log-settings-declared-derivative'); assert.equal(logProof.marker, identity.marker); assert.equal(logProof.base, base); assert(logProof.originalEvidence && Array.isArray(logProof.originalEvidence) && logProof.originalEvidence.length);
assert.deepEqual(Object.keys(logProof.settings).sort(), ['log_error_verbosity','log_line_prefix','log_statement']);
for (const p of logProof.originalEvidence) { assert(p.file.startsWith(priv + '/')); readCurrentPrivate(p.file); assert.deepEqual(pin(p.file), p); }
const expectedSettings = logProof.settings;
const guardRequests = [], reportCache = new Map(), explicitRequestRoots = [...(input.guardRequestRoots || [])];
for (const registration of input.guardRequestRegistrations || []) {
  const registry = readPinned(registration, /^tmp\/rust-r3m\/(?:root|request-roots)\/[a-z0-9-]+\.json$/);
  assert.equal(registry.kind, 'R3M-cleanup-only-guard-request-registration'); assert(Array.isArray(registry.entries));
  for (const entryIndex of registry.entries.keys()) explicitRequestRoots.push({ registration, entryIndex });
}
for (const r of explicitRequestRoots) {
  assert(Boolean(r.report) !== Boolean(r.registration), 'Choose an actual safe public report or an explicit cleanup-only registration');
  let report, eventIndex, reportProof;
  if (r.report) {
    if (!reportCache.has(r.report.file)) reportCache.set(r.report.file, readPinned(r.report, /^tmp\/rust-r3m\/acceptance-(?:rust|nest)-[a-z0-9-]+-\d{2}\/report01\.json$/));
    assert.deepEqual(pin(r.report.file), r.report); sourcePins.push(r.report); report = reportCache.get(r.report.file); eventIndex = r.eventIndex; reportProof = r.report;
  } else {
    const registry = readPinned(r.registration, /^tmp\/rust-r3m\/(?:root|request-roots)\/[a-z0-9-]+\.json$/); sourcePins.push(r.registration);
    assert.equal(registry.kind, 'R3M-cleanup-only-guard-request-registration'); assert.equal(registry.sourceKind, 'declared-current-batch-private-report-request-derivative'); assert.equal(registry.cleanupOnly, true); assert.equal(registry.acceptanceClaim, false); assert.equal(registry.rawPayloadsAndCredentialsPublished, false); assert.equal(registry.marker, identity.marker); assert.equal(registry.base, base);
    const original = registry.privateOriginalReport; assert(original && original.file); assert.match(original.file, /^\/home\/wangzishi\/\.local\/share\/poms-r3m\/private\/acceptance-(?:rust|nest)-[0-9a-f-]{36}\/phase\d{2}\/structured-original-report01\.json$/);
    if (!reportCache.has(original.file)) { const raw = readCurrentPrivate(original.file); assert.deepEqual(pin(original.file), original); reportCache.set(original.file, JSON.parse(raw)); }
    assert.deepEqual(pin(original.file), original); report = reportCache.get(original.file);
    assert.equal(registry.backend, report.backend); assert.equal(registry.runId, report.runId);
    assert(Number.isSafeInteger(r.entryIndex) && r.entryIndex >= 0 && r.entryIndex < registry.entries.length);
    const entry = registry.entries[r.entryIndex]; assert.deepEqual(Object.keys(entry).sort(), ['eventIndex','method','rawWire','requestId','route']);
    eventIndex = entry.eventIndex; assert(Number.isSafeInteger(eventIndex) && eventIndex >= 0 && eventIndex < report.events.length);
    const actualEntry = report.events[eventIndex];
    assert.deepEqual({ eventIndex, method:actualEntry.method, route:actualEntry.route, requestId:actualEntry.response.requestId, rawWire:actualEntry.response.rawWire }, entry, 'Safe registry must be the exact metadata derivative of the private original event');
    reportProof = { registration:r.registration, entryIndex:r.entryIndex, privateOriginalReport:original, sourceKind:registry.sourceKind, cleanupOnly:true, acceptanceClaim:false };
  }
  assert(cohorts.some(c => c.backend === report.backend && c.runId === report.runId)); assert.equal(report.marker, identity.marker); assert.equal(report.base, base); assert.equal(report.runtime.database, 'poms_r3m_' + report.backend);
  assert(Number.isSafeInteger(eventIndex) && eventIndex >= 0 && eventIndex < report.events.length);
  const event = report.events[eventIndex]; assert.equal(event.kind, 'guard'); assert.equal(typeof event.method, 'string'); assert.match(event.route, /^\/api\//i);
  const requestId = event.response.requestId, wire = event.response.rawWire; assert.equal(typeof requestId, 'string'); assert(wire.originalRawRetained);
  const prefix = wire.privatePrefix, reportLineage = priv + '/acceptance-' + report.backend + '-' + report.runId + '/'; assert(prefix.startsWith(reportLineage + 'phase')); assert(path.resolve(prefix).startsWith(reportLineage), 'Wire capture must stay inside the registered cohort'); assert.match(prefix, /\/raw-wire\/[a-zA-Z0-9_-]+$/);
  const requestFile = prefix + '-request.bin', responseFile = prefix + '-response.bin', request = readCurrentPrivate(requestFile), response = readCurrentPrivate(responseFile);
  assert.equal(request.length, wire.requestBytes); assert.equal(sha(request), wire.requestSha256); assert.equal(response.length, wire.responseBytes); assert.equal(sha(response), wire.responseSha256);
  const first = request.toString('latin1').split('\r\n'), firstLine = first[0].split(' '); assert.deepEqual(firstLine, [event.method, event.route, 'HTTP/1.1']);
  const ids = first.slice(1, first.indexOf('')).filter(l => /^x-request-id:/i.test(l)).map(l => l.slice(l.indexOf(':') + 1).trim()); assert.deepEqual(ids, [requestId]);
  assert.equal(Number(response.toString('latin1').split('\r\n')[0].split(' ')[1]), event.response.status);
  if (report.backend === backend) guardRequests.push({ backend, targetBackend: backend, runId: report.runId, requestId, method: event.method, route: event.route, rawWireVerified: true, report: reportProof, eventIndex, reportCompleted: report.completed === true, rawWire: { request: pin(requestFile), response: pin(responseFile) } });
}

function podmanCapture(args, label) {
  const r = spawnSync('podman', ['--cgroup-manager=cgroupfs', ...args], { encoding: null, maxBuffer: 16000000 });
  for (const k of ['stdout','stderr']) fs.writeFileSync(privateOut + '/' + label + '-' + k + '-original.bin', r[k] || Buffer.alloc(0), { flag: 'wx', mode: 0o600 });
  assert.equal(r.status, 0); assert(!r.error && !r.signal); return JSON.parse(r.stdout);
}
const container = podmanCapture(['container','inspect', identity.container], 'container-admission')[0];
assert.equal(container.Config.Labels['org.poms.scope'], 'rust-r3m'); assert.equal(container.Config.Labels['org.poms.base'], base); assert.equal(container.State.Running, true); assert(container.Mounts.some(m => m.Name === identity.volume)); assert(container.NetworkSettings.Ports['15432/tcp'].some(p => p.HostIp === '127.0.0.1' && p.HostPort === '23433'));
async function free(port) { return await new Promise(resolve => { const s = net.createServer(); s.once('error', () => resolve(false)); s.listen(port, '127.0.0.1', () => s.close(() => resolve(true))); }); }
async function stoppedRuntimeProof() {
  const ports = []; for (const port of [13400,13410,13500,13600]) { const portFree = await free(port); ports.push({ platform: 'linux', port, portFree }); assert(portFree, 'Root must stop owned API/UI first'); }
  const bootId = fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim(), linuxProcesses = [];
  const liveLinuxNames = fs.readdirSync('tmp/rust-r3m/runtime').filter(f => /^(?:rust|nest)-[a-z0-9-]+\.json$/.test(f) && !f.endsWith('-stop01.json')).map(f => 'tmp/rust-r3m/runtime/' + f).sort();
  assert.deepEqual(input.linuxRuntimeJournals.map(p => p.file).sort(), liveLinuxNames, 'All public owned Linux runtime journals required');
  for (const p of input.linuxRuntimeJournals) {
    const r = readPinned(p, /^tmp\/rust-r3m\/runtime\/(?:rust|nest)-[a-z0-9-]+\.json$/); sourcePins.push(p);
    assert.equal(r.cwd, root); assert.equal(r.database, 'poms_r3m_' + r.backend); assert(['nest','rust'].includes(r.backend)); assert(Number.isSafeInteger(r.pid));
    let ownedStillRunning = false, observed = null;
    if (r.bootId === bootId && fs.existsSync('/proc/' + r.pid + '/stat')) {
      const text = fs.readFileSync('/proc/' + r.pid + '/stat','utf8'), fields = text.slice(text.lastIndexOf(')') + 2).split(' '); observed = { state: fields[0], startTime: fields[19] };
      if (String(r.startTime) === String(observed.startTime) && observed.state !== 'Z') { assert.equal(sha(fs.readFileSync('/proc/' + r.pid + '/cmdline')), r.argvSha256); ownedStillRunning = true; }
    }
    assert(!ownedStillRunning, 'An exact owned Linux process is still running'); linuxProcesses.push({ journal: p, pid: r.pid, recordedBootId: r.bootId, currentBootId: bootId, observed, ownedStillRunning });
  }
  const winFiles = fs.readdirSync('tmp/rust-r3m/runtime').filter(f => /^windows-native\d{2}\.json$/.test(f)).map(f => 'tmp/rust-r3m/runtime/' + f).sort();
  assert(winFiles.length > 0, 'Actual Windows Native matrix journal required'); assert.deepEqual(input.windowsRuntimeJournals.map(p => p.file).sort(), winFiles);
  const windows = input.windowsRuntimeJournals.map(p => { const r = readPinned(p, /^tmp\/rust-r3m\/runtime\/windows-native\d{2}\.json$/); sourcePins.push(p); assert.equal(r.kind, 'R3M-owned-Windows-Native-runtime'); assert.equal(r.database, 'poms_r3m_nest'); assert.equal(r.port, 13410); assert(Number.isSafeInteger(r.pid)); assert.match(r.commandLineSha256, /^[a-f0-9]{64}$/); return { ...r, registration: p }; });
  const pidArray = windows.map(r => String(r.pid)).join(',');
  const script = "$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); $rows=@(); foreach($pidValue in @(" + pidArray + ")) { $proc=Get-CimInstance Win32_Process -Filter ('ProcessId='+$pidValue); if($proc) { $rows += [pscustomobject]@{pid=[int]$proc.ProcessId;creation=$proc.CreationDate.ToUniversalTime().ToString('o');commandLine=$proc.CommandLine} } }; $listeners=@(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $_.LocalPort -in @(13410,13600) } | Select-Object LocalAddress,LocalPort,OwningProcess); [pscustomobject]@{processes=@($rows);listeners=@($listeners)} | ConvertTo-Json -Depth 6 -Compress";
  const ps = spawnSync('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', ['-NoProfile','-NonInteractive','-Command',script], { encoding: null, windowsHide: true, timeout: 30000, maxBuffer: 16000000 });
  for (const k of ['stdout','stderr']) fs.writeFileSync(privateOut + '/windows-stopped-readback-' + k + '-original.bin', ps[k] || Buffer.alloc(0), { flag: 'wx', mode: 0o600 });
  assert.equal(ps.status, 0); assert(!ps.error && !ps.signal); const observedWindows = JSON.parse(ps.stdout.toString('utf8').replace(/^\uFEFF/, '').trim()); assert.deepEqual(observedWindows.listeners, []);
  const windowsProcesses = windows.map(r => { const found = observedWindows.processes.find(p => p.pid === r.pid); if (found && found.creation === r.creation) { assert.equal(sha(found.commandLine), r.commandLineSha256); assert.fail('Exact owned Windows Native process is still running'); } return { journal: r.registration, pid: r.pid, recordedCreation: r.creation, observedCreation: found?.creation || null, ownedStillRunning: false }; });
  return { linuxPorts: ports, linuxProcesses, windowsProcesses, windowsPorts: [13410,13600].map(port => ({ port, portFree: true })), readonlyWindowsCIMAndTCPPerformed: true, processesStoppedByThisTool: 0 };
}
function inventoryObjects(directory) {
  const allowed = [state + '/objects/' + backend, ...(backend === 'nest' ? ['/mnt/c/Users/ynh2/AppData/Local/poms-r3m/objects/nest'] : [])];
  assert(allowed.includes(directory)); if (!fs.existsSync(directory)) return [];
  assert.equal(fs.realpathSync(directory), directory); const files = [];
  function walk(dir) { const stat = fs.lstatSync(dir); assert(stat.isDirectory() && !stat.isSymbolicLink()); for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const file = dir + '/' + e.name; const s = fs.lstatSync(file); assert(!s.isSymbolicLink()); if (s.isDirectory()) walk(file); else { assert(s.isFile()); files.push(pin(file)); } } }
  walk(directory); return files.sort((a,b) => a.file.localeCompare(b.file));
}
const catalogQueries = {
  tables: "select c.relname,obj_description(c.oid,'pg_class') comment from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='poms' and c.relkind='r' order by c.relname",
  columns: "select table_name,column_name,ordinal_position,column_default,is_nullable,data_type,character_maximum_length,numeric_precision,numeric_scale,udt_schema,udt_name from information_schema.columns where table_schema='poms' order by table_name,ordinal_position",
  constraints: "select t.relname table_name,c.conname,c.convalidated,pg_get_constraintdef(c.oid,true) definition from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='poms' order by t.relname,c.conname",
  indexes: "select tablename,indexname,indexdef from pg_indexes where schemaname='poms' order by tablename,indexname",
  triggers: "select t.relname table_name,g.tgname,pg_get_triggerdef(g.oid,true) definition,pg_get_functiondef(g.tgfoid) function from pg_trigger g join pg_class t on t.oid=g.tgrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='poms' and not g.tgisinternal order by t.relname,g.tgname",
  migrations: 'select name from poms.poms_migrations order by name',
  privileges: "select t.relname table_name,p.privilege,has_table_privilege('poms_r3m_app',format('%I.%I',n.nspname,t.relname),p.privilege) allowed from pg_class t join pg_namespace n on n.oid=t.relnamespace cross join(values('SELECT'),('INSERT'),('UPDATE'),('DELETE'))p(privilege) where n.nspname='poms' and t.relkind='r' order by t.relname,p.privilege",
};
const require = createRequire(import.meta.url), { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const ownerPassword = readCurrentPrivate(priv + '/owner-password').toString('utf8'); assert.match(ownerPassword, /^[a-f0-9]{64}$/);
const db = new Client({ host:'127.0.0.1', port:23433, database:'poms_r3m_' + backend, user:'poms_r0e_owner', password:ownerPassword, application_name:'poms-r3m-aggregate-terminal', query_timeout:30000, connectionTimeoutMillis:5000 });
let transaction = false, completed = false, failure = null, summary = null, runtimeProof = null, beforeOriginalPin = null, afterOriginalPin = null, restored = 0, removed = [];
async function settings() { const result = {}; for (const key of ['log_statement','log_line_prefix','log_error_verbosity']) result[key] = (await db.query('show ' + key)).rows[0][key]; return result; }
async function catalog() { const result = {}; for (const [key, sql] of Object.entries(catalogQueries)) result[key] = (await db.query(sql)).rows; return result; }
async function snapshot() { const result = []; for (const table of baseline) result.push({ ...table, rows:(await db.query('select to_jsonb(t)::text raw from poms.' + q(table.name) + ' t')).rows.map(r => r.raw).sort() }); return result; }
const objectBefore = [...inventoryObjects(state + '/objects/' + backend), ...(backend === 'nest' ? inventoryObjects('/mnt/c/Users/ynh2/AppData/Local/poms-r3m/objects/nest') : [])];
try {
  guardCandidate(); guardNative(); runtimeProof = await stoppedRuntimeProof();
  await db.connect();
  const actual = (await db.query("select current_database() database,current_user::text role,current_setting('port') port,current_setting('server_version_num') version,current_setting('poms.r0e_isolated',true) isolated,(select instance_id::text from r3m_control.marker) marker,(select oid::text from pg_database where datname=current_database()) oid")).rows[0];
  assert.equal(actual.database, 'poms_r3m_' + backend); assert.equal(actual.role, 'poms_r0e_owner'); assert.equal(actual.port, '15432'); assert.equal(actual.version, '150012'); assert.equal(actual.isolated, 'on'); assert.equal(actual.marker, identity.marker);
  const provision = JSON.parse(fs.readFileSync('tmp/rust-r3m/environment/provision01.json')); assert.equal(provision.containerId, container.Id); assert.equal(provision.databaseOids.find(d => d.database === actual.database).oid, actual.oid); sourcePins.push(pin('tmp/rust-r3m/environment/provision01.json'));
  assert.deepEqual((await db.query("select pid,usename,application_name from pg_stat_activity where datname=current_database() and backend_type='client backend' and pid<>pg_backend_pid() order by pid")).rows, [], 'No other DB client may write or hold an acceptance transaction');
  assert.deepEqual(await settings(), expectedSettings, 'All test logging must already be restored before terminal cleanup');
  await db.query(mode === 'cleanup' ? 'begin' : 'begin isolation level repeatable read read only'); transaction = true;
  if (mode === 'cleanup') await db.query('lock table ' + baseline.map(t => 'poms.' + q(t.name)).join(',') + ' in access exclusive mode');
  const beforeCatalog = await catalog(); assert.deepEqual(beforeCatalog, expectedCatalog, '107-table product catalog/428 ACL must match the actual approved schema check');
  const qaFunctions = (await db.query("select n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('poms','r3m_control') and p.proname like 'r3m_qa_%' order by n.nspname,p.proname")).rows; assert.deepEqual(qaFunctions, []); assert(!beforeCatalog.triggers.some(t => t.tgname.startsWith('r3m_qa_')));
  const keys = (await db.query("select t.relname name,array(select a.attname::text from pg_index i join pg_attribute a on a.attrelid=i.indrelid and a.attnum=any(i.indkey) where i.indrelid=t.oid and i.indisprimary order by array_position(i.indkey::int2[],a.attnum))::text[] pk from pg_class t where t.relnamespace='poms'::regnamespace and t.relkind='r' order by t.relname")).rows;
  assert.deepEqual(keys, baseline.map(t => ({ name:t.name, pk:t.pk })));
  const foreignKeys = (await db.query("select c.conname name,t.relname \"table\",n2.nspname \"refSchema\",r.relname \"refTable\",array(select a.attname::text from unnest(c.conkey) with ordinality k(attnum,ord) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum order by k.ord) \"columns\",array(select a.attname::text from unnest(c.confkey) with ordinality k(attnum,ord) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.attnum order by k.ord) \"refColumns\",c.confdeltype::text \"deleteAction\",c.confmatchtype::text \"matchType\" from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_class r on r.oid=c.confrelid join pg_namespace n2 on n2.oid=r.relnamespace where c.connamespace='poms'::regnamespace and c.contype='f' order by t.relname,c.conname")).rows;
  assert.equal(foreignKeys.length, 207); assert(foreignKeys.every(fk => fk.matchType === 's'));
  const current = await snapshot(), numberSpecs = JSON.parse(fs.readFileSync('tools/rust-r2ef/e-authority.json')).businessNumbers;
  // Preserve the COMPLETE raw diff before even trying an ownership classifier.
  const beforeFile = privateOut + '/whole-batch-before-original.json'; write(beforeFile, { kind:'R3M-whole-current-batch-original-before', backend, baseline, current, contexts, registeredActors:actors, foreignKeys, catalog:beforeCatalog, logSettings:await settings(), objectInventory:objectBefore }); beforeOriginalPin = pin(beforeFile);
  const plan = classifyAggregate({ baseline, current, actors, foreignKeys, guardRequests, allowedNumberPeriods:input.allowedNumberPeriods, numberSpecs }); summary = publicPlan(plan);
  write(out + '/ownership-preflight01.json', { ...summary, derivation:{ kind:'declared-metadata-only-derivative', privateOriginal:beforeOriginalPin, rawDatabaseRowsAndCredentialsOmitted:true }, cleanupApplied:false, G3Certified:false, G4Certified:false });
  assert(plan.ready, 'Ownership or deletion-order blocker; retained original and public orphan metadata must be reviewed');
  if (mode === 'cleanup') {
    // These are only already-owned added rows, never seed or remembered IDs.
    for (const [table, column] of [['lead','converted_project_id'],['project','source_lead_id']]) {
      const ids = [...plan.added.values()].filter(r => r.table === table).map(r => r.row.id);
      if (ids.length) await db.query('update poms.' + q(table) + ' set ' + q(column) + '=null where id=any($1::uuid[]) and ' + q(column) + ' is not null', [ids]);
    }
    for (const table of DELETE_ORDER) {
      const rows = [...plan.added.values()].filter(r => r.table === table); if (!rows.length) continue;
      const pk = rows[0].pk; assert(pk.length); const payload = '[' + rows.map(r => r.raw).join(',') + ']';
      // A complete self-referencing version chain is one statement. Never
      // row-by-row loops, CASCADE, constraint disable or trigger disable.
      const result = await db.query('delete from poms.' + q(table) + ' target where exists(select 1 from jsonb_populate_recordset(null::poms.' + q(table) + ',$1::jsonb) original where ' + pk.map(k => 'target.' + q(k) + '=original.' + q(k)).join(' and ') + ')', [payload]);
      assert.equal(result.rowCount, rows.length, 'Exact aggregate owned delete count'); removed.push({ table, rows:result.rowCount });
    }
    for (const change of plan.changedSeedRows) {
      const row = JSON.parse(change.before), columns = Object.keys(row).filter(k => !change.pk.includes(k)), params = [change.before, ...change.pk.map(k => row[k]), change.current];
      const result = await db.query('update poms.' + q(change.table) + ' t set (' + columns.map(q).join(',') + ')=(select ' + columns.map(q).join(',') + ' from jsonb_populate_record(null::poms.' + q(change.table) + ',$1::jsonb)) where ' + change.pk.map((k,i) => 't.' + q(k) + '=$' + (i+2)).join(' and ') + ' and to_jsonb(t)=$' + params.length + '::jsonb', params);
      assert.equal(result.rowCount, 1); restored++;
    }
    assert.deepEqual(await snapshot(), baseline, 'Every raw JSON row of all107 earliest-stage seed tables must be exact');
    assert.deepEqual(await catalog(), expectedCatalog); assert.deepEqual(await settings(), expectedSettings);
  }
  const insideAfter = await snapshot(), insideCatalog = await catalog(), afterFile = privateOut + '/whole-batch-after-original.json';
  write(afterFile, { backend, tables:insideAfter, catalog:insideCatalog, logSettings:await settings(), rowsRemoved:removed, restoredIndependentCounters:restored }); afterOriginalPin = pin(afterFile);
  await db.query('commit'); transaction = false;
  // A separate post-commit read proves the terminal result was committed.
  await db.query('begin isolation level repeatable read read only'); transaction = true;
  const committed = await snapshot(); assert.deepEqual(committed, mode === 'cleanup' ? baseline : current); assert.deepEqual(await catalog(), expectedCatalog); assert.deepEqual(await settings(), expectedSettings);
  await db.query('commit'); transaction = false;
  const objectAfter = [...inventoryObjects(state + '/objects/' + backend), ...(backend === 'nest' ? inventoryObjects('/mnt/c/Users/ynh2/AppData/Local/poms-r3m/objects/nest') : [])]; assert.deepEqual(objectAfter, objectBefore, 'All runtime object originals are inventoried and retained by this tool');
  assert.deepEqual(pin(identityFile), originalIdentityPin); assert.deepEqual(sourcePins.map(p => pin(p.file)), sourcePins); for (const p of privateInputPins) assert.deepEqual(pin(p.file), p);
  guardCandidate(); guardNative(); completed = true;
} catch (e) {
  if (transaction) { await db.query('rollback'); transaction = false; }
  const errorFile = privateOut + '/original-error.json'; write(errorFile, { name:e.name, message:e.message, stack:e.stack }); failure = { name:e.name, diagnosticOmittedFromPublic:true, originalError:pin(errorFile) }; process.exitCode = 1;
} finally {
  const report = { kind:'R3M-whole-current-batch-aggregate-terminal', createdAt:new Date().toISOString(), mode, backend, completed, failure, marker:identity.marker, base, input:pin(inputFile), sources:sourcePins, currentCohorts:cohorts.map(c => ({ backend:c.backend, runId:c.runId, registration:c.registration })), originalBaseline:pin(originalBaselineFile), contexts, originalIdentity:originalIdentityPin, runtimeProof, ownership:summary, beforeOriginal:beforeOriginalPin, afterOriginal:afterOriginalPin, removed, removedRows:removed.reduce((n,r) => n+r.rows,0), restoredIndependentCounters:restored, all107EarliestSeedRowsExact:completed && mode==='cleanup', actualCatalogAnd428ACLExact:completed, originalLoggingSettingsExact:completed, committedPostReadback:completed, secondCleanupZeroChanges:completed && mode==='cleanup' && summary.addedRows===0 && summary.seedChanges.length===0, localObjectsInventoriedAndRetained:objectBefore, objectFilesDeleted:0, privateAndVolumeRetained:true, noOldNamespaceRead:true, seedIdsOrRememberIdsUsedAsOwnership:false, partialEvidenceUsedForCleanupNeverAcceptance:true, derivation:{kind:'declared-metadata-only-derivative', rawAuthSQLAndDatabaseRowsOnlyInNewBatchPrivate:true}, G3Certified:false, G4Certified:false };
  write(out + '/report01.json', report); await db.end(); console.log(JSON.stringify({ mode,backend,completed,failure,addedRows:summary?.addedRows ?? null,ownedRows:summary?.ownedRows ?? null,orphanRows:summary?.orphans.length ?? null,removedRows:report.removedRows,seedExact:report.all107EarliestSeedRowsExact,secondCleanupZeroChanges:report.secondCleanupZeroChanges }));
}
