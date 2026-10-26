import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { NavigationHttpSession } from './http-client.mjs';

const require = createRequire(import.meta.url);
const { invokeFixture } = require('./invoke-fixture.cjs');
const { loadManagedEnvironment } = require('./managed-environment.cjs');
const { roleFixtureSpec } = require('./role-fixture-spec.cjs');
const runtime = require('../e2e/runtime.cjs');
const root = path.resolve(import.meta.dirname, '../..');
const output = path.join(root, 'tmp/rust-r2b/nest-witness.json');
const sqlPath = path.join(root, 'tmp/rust-r2b/nest-witness-sql.jsonl');
assert.equal(process.argv.length, 2);
assert.equal(process.platform, 'linux');
assert(!existsSync(output), 'Preserve the original witness before a new run');
const runId = randomUUID();
const report = { formatVersion: 1, result: 'pending', runId, backend: 'nest', platform: process.platform, startedAt: new Date().toISOString(), observations: [], cleanup: null, sourceFiles: [] };
const sourceFiles = [...readdirSync(import.meta.dirname).filter((name) => /^(?:fixture-|role-fixture|managed-environment|http-client|invoke-fixture|nest-witness|witness-query-preload)/.test(name) && /\.(?:mjs|cjs)$/.test(name)).map((name) => `tools/rust-r2b/${name}`), 'tools/e2e/runtime.cjs'];
const hashes = () => sourceFiles.map((file) => ({ file, sha256: createHash('sha256').update(readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')).digest('hex') }));
report.sourceFiles = hashes();
let phase = 'fixture-prepare', server;
const roles = new Map();
const fixture = (action, account = 'none', client, roleSlot) => invokeFixture({ formatVersion: 1, runId, backend: 'nest', action, account, ...(client ? { sessionToken: client.cookies.get('poms_session') } : {}), ...(roleSlot ? { roleSlot } : {}) });
const roleFixture = (action, slot) => fixture(action, 'none', undefined, slot);
const readSql = () => readFileSync(sqlPath, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
try {
    await fixture('prepare');
    phase = 'start-original-nest';
    const managed = loadManagedEnvironment({ mode: 'managed-nest' });
    const target = runtime.resolveTarget({ mode: 'managed-nest', host: managed.host, port: managed.port });
    await runtime.assertPortAvailable(target);
    const nxPackagePath = require.resolve('nx/package.json');
    const nxPackage = JSON.parse(readFileSync(nxPackagePath, 'utf8'));
    const nxBin = typeof nxPackage.bin === 'string' ? nxPackage.bin : nxPackage.bin?.nx;
    assert.equal(typeof nxBin, 'string');
    const nxEntry = path.resolve(path.dirname(nxPackagePath), nxBin);
    assert(!path.relative(path.dirname(nxPackagePath), nxEntry).startsWith('..'));
    const logPath = path.join(root, 'tmp/rust-r2b/nest-witness-server.log');
    await runtime.runOwnedCommand({ executable: process.execPath, args: [nxEntry, 'build', 'poms-api', '--skip-nx-cache'], cwd: root, env: managed.childEnv, logPath, runId, timeoutMs: 180000 });
    server = await runtime.startOwned({ kind: 'nest', executable: process.execPath, args: ['--require', path.join(root, 'tools/rust-r2b/witness-query-preload.cjs'), path.join(root, 'dist/apps/poms-api/main.js')], cwd: root, env: managed.childEnv, host: target.host, port: target.port, readyUrl: target.readinessUrl, logPath, runId, timeoutMs: 120000 });
    const client = new NavigationHttpSession(target.origin, runId);
    phase = 'login';
    await client.login('admin');
    async function observe({ id, due, method, route, json, slot, create = false }) {
        phase = id;
        if (create) await roleFixture('role-plan', slot);
        await fixture(due ? 'session-due' : 'session-non-due', 'admin', client);
        const before = (await fixture('snapshot', 'admin', client)).snapshot;
        const roleBefore = slot && roles.get(slot) ? (await roleFixture('role-snapshot', slot)).roleSnapshot : null;
        const sqlSequenceBefore = readSql().at(-1)?.sequence ?? 0;
        const startedAt = new Date().toISOString();
        const response = await client.request(method, route, json === undefined ? {} : { json });
        if (create) {
            const adopted = await roleFixture('role-adopt', slot);
            roles.set(slot, adopted.role.roleId);
        }
        const after = (await fixture('snapshot', 'admin', client)).snapshot;
        const roleAfter = slot && roles.get(slot) ? (await roleFixture('role-snapshot', slot)).roleSnapshot : null;
        const events = readSql().filter((row) => row.sequence > sqlSequenceBefore);
        const completedSql = events.filter((row) => ['end', 'error'].includes(row.phase));
        const transactions = [];
        const pending = new Map();
        for (const row of completedSql) {
            if (row.statement === 'BEGIN') { assert(!pending.has(row.connection)); pending.set(row.connection, [row]); }
            else if (pending.has(row.connection)) {
                pending.get(row.connection).push(row);
                if (['COMMIT', 'ROLLBACK'].includes(row.statement)) { transactions.push(pending.get(row.connection)); pending.delete(row.connection); }
            }
        }
        assert.equal(pending.size, 0);
        report.observations.push({ id, due, method, route, status: response.status, response: response.body, startedAt, finishedAt: new Date().toISOString(), before, after, roleBefore, roleAfter, auditDelta: after.audits.length - before.audits.length, sessionVersionDelta: after.session.rowVersion - before.session.rowVersion, roleVersionDelta: roleBefore && roleAfter ? roleAfter.role.row_version - roleBefore.role.row_version : null, completedSql, transactions });
        assert.equal(response.setCookie.length, 0);
        return response;
    }
    for(const [slot,due] of [['main',true],['second',false]]) {
        const {roleKey,name,description,displayOrder}=roleFixtureSpec(runId,slot);
        const response=await observe({id:`create-${due?'due':'non-due'}`,due,method:'POST',route:'/api/platform/roles',slot,create:true,json:{roleKey,name,description,displayOrder}});
        assert.equal(response.status,201);
    }
    const rolePath = `/api/platform/roles/${roles.get('main')}`;
    for(const due of [true,false]) {
        await observe({id:`dirty-update-${due}`,due,method:'PATCH',route:rolePath,slot:'main',json:{name:`R2B dirty ${due}`,displayOrder:due?7:8}});
        await observe({id:`noop-update-${due}`,due,method:'PATCH',route:rolePath,slot:'main',json:{name:`R2B dirty ${due}`,displayOrder:due?7:8}});
        await observe({id:`deactivate-${due}`,due,method:'POST',route:`${rolePath}:deactivate`,slot:'main',json:{expectedVersion:999999,reason:'ignored',comment:'ignored'}});
        await observe({id:`noop-deactivate-${due}`,due,method:'POST',route:`${rolePath}:deactivate`,slot:'main',json:{}});
        await observe({id:`activate-${due}`,due,method:'POST',route:`${rolePath}:activate`,slot:'main',json:{}});
        await observe({id:`noop-activate-${due}`,due,method:'POST',route:`${rolePath}:activate`,slot:'main',json:{}});
        const permissionKeys=due?['project:read','nav:dashboard:view','project:read']:['nav:profile:view','project:read'];
        await observe({id:`permissions-changed-${due}`,due,method:'PUT',route:`${rolePath}/permissions`,slot:'main',json:{permissionKeys}});
        await observe({id:`permissions-noop-${due}`,due,method:'PUT',route:`${rolePath}/permissions`,slot:'main',json:{permissionKeys}});
    }
    for(const slot of ['utf16-name','utf16-description','utf16-key','order-overflow']) {
        const {roleKey,name,description,displayOrder}=roleFixtureSpec(runId,slot);
        await observe({id:`create-${slot}`,due:true,method:'POST',route:'/api/platform/roles',slot,create:true,json:{roleKey,name,description,displayOrder}});
    }
    await observe({id:'update-description-surrogate',due:true,method:'PATCH',route:rolePath,slot:'main',json:{description:'\ud800'}});
    await observe({id:'update-description-surrogate-again',due:true,method:'PATCH',route:rolePath,slot:'main',json:{description:'\ud800'}});
    await observe({id:'update-description-restored',due:false,method:'PATCH',route:rolePath,slot:'main',json:{description:null}});
    await observe({id:'invalid-uuid',due:true,method:'GET',route:'/api/platform/roles/not-a-uuid'});
    await observe({id:'missing-uuid',due:true,method:'GET',route:'/api/platform/roles/00000000-0000-0000-0000-000000000000'});
    const allRoles=await client.request('GET','/api/platform/roles');
    const ownRole=allRoles.body.find((role)=>role.roleKey===`r2b_admin_${runId}`);
    assert(ownRole);
    await observe({id:'update-actor-assigned-role',due:true,method:'PATCH',route:`/api/platform/roles/${ownRole.id}`,json:{name:'R2B actor role updated'}});
    phase='verify-source-and-completeness';
    const sql=readSql();
    assert(!readFileSync(logPath, 'utf8').includes('R2B_SQL_CAPTURE_INCOMPLETE'));
    assert(sql.every((row)=>!row.captureIncomplete && row.phase!=='unsupported'));
    for(const queryId of new Set(sql.map((row)=>row.queryId))) {
        const events=sql.filter((row)=>row.queryId===queryId);
        assert.equal(events.length,2);assert.equal(events[0].phase,'start');assert(['end','error'].includes(events[1].phase));
    }
    assert.deepEqual(hashes(),report.sourceFiles,'Witness input changed while running');
    report.sqlRecords=sql.length;report.sqlSha256=createHash('sha256').update(readFileSync(sqlPath)).digest('hex');
    report.result='observed';
} catch(error) {
    report.result='fail';report.failurePhase=phase;report.failureReason=/^R2B_LOGIN_[A-Za-z0-9_-]+/.exec(error.message)?.[0]??error.name;process.exitCode=1;
} finally {
    if(server) {try {await runtime.stopOwned(server);report.serverStopped=true;}catch{report.serverStopped=false;report.result='fail';process.exitCode=1;}}
    try {
        report.cleanup=await fixture('cleanup');const residual=await fixture('cleanup');assert.equal(residual.matched,0);assert.equal(residual.changed,0);report.zeroResidual=residual;
    }catch{report.cleanupFailure=true;report.result='fail';process.exitCode=1;}
    report.finishedAt=new Date().toISOString();writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,{flag:'wx',mode:0o600});
}
console.log(JSON.stringify({result:report.result,failurePhase:report.failurePhase,failureReason:report.failureReason,runId,observations:report.observations.map(({id,status,auditDelta,sessionVersionDelta,roleVersionDelta})=>({id,status,auditDelta,sessionVersionDelta,roleVersionDelta})),cleanup:report.zeroResidual?.state}));
