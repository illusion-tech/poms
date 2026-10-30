import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { createCommissionAuthInputPolicy } from './commission-auth-input-policy.mjs';
import { controlledCommissionOptions } from './l-commission-controlled.mjs';
const sha = (value) => createHash('sha256').update(value).digest('hex');
const token = 's'.repeat(43), id = '71000000-0000-4000-8000-000000000001', userId = '71000000-0000-4000-8000-000000000002';
const sample = '2026-10-30T09:00:00.123Z';
function setup(policy = 'fresh-except-named-due') {
    let row = { id,user_id:userId,token_hash:sha(token),csrf_token_hash:'private-server-hash',last_seen_at:'2026-10-30T08:59:00+00:00',row_version:4,updated_at:'2026-10-30T08:59:00+00:00' };
    const session = { userId,cookies:new Map([['poms_session',token]]) }, entries = [], calls = [];
    const f = { j:{ state:'prepared',objects:[{ table:'auth_session',id,creationProof:{ kind:'actual-certificate' },postcondition:{ independentlyVisible:true } }],mutations:[] },
        client:{ query:async (sql,args) => { calls.push({ sql,args }); assert.equal(args[0],sha(token)); return { rows:[{ id }] }; } },
        updateOwned:async (table,pk,values,reason) => { calls.push({ table,pk,values,reason }); assert.equal(table,'auth_session'); assert.equal(pk,id); const before=structuredClone(row); row={ ...row,...values }; f.j.mutations.push({ table,id,values,reason,transaction:'123',expectedXmin:'123',state:'committed',before,after:structuredClone(row) }); return structuredClone(row); } };
    const p = createCommissionAuthInputPolicy({ policy,getFixture:() => f,ownedRow:async (table,pk) => { assert.equal(table,'auth_session'); assert.equal(pk,id); return structuredClone(row); },record:async (privateEntry,publicEntry) => entries.push({ privateEntry,publicEntry }),sample:() => sample });
    return { p,f,session,calls,entries,get row() { return row; },setRow:(value) => { row=value; } };
}
test('natural default does no query, fixture access or mutation, including named due',async () => {
    const p = createCommissionAuthInputPolicy({ getFixture:() => assert.fail(),ownedRow:() => assert.fail(),record:() => assert.fail() });
    p.markNamedDue({}); assert.equal(await p.beforeCall({ userId },'natural'),null);
});
test('unknown policy fails before any callback',() => assert.throws(() => createCommissionAuthInputPolicy({ policy:'auto',getFixture:() => assert.fail() }),/Unknown/));
test('anonymous call leaves all fixture inputs alone',async () => { const s=setup(); s.session.userId=null; assert.equal(await s.p.beforeCall(s.session,'csrf'),null); assert.equal(s.calls.length,0); });
test('controlled preparation changes only last_seen_at, preserves version, retains exact committed mutation',async () => {
    const s=setup(), before=structuredClone(s.row), entry=await s.p.beforeCall(s.session,'producer.next');
    assert.equal(entry.sampledAt,sample); assert.equal(entry.unchangedRowVersion,true); assert.equal(s.row.row_version,4);
    assert.deepEqual(s.row,{ ...before,last_seen_at:sample }); assert.deepEqual(s.calls[1].values,{ last_seen_at:sample });
    assert.equal(s.entries[0].privateEntry.mutation.state,'committed'); assert.equal(s.entries[0].privateEntry.mutation.expectedXmin,'123');
});
test('public preparation metadata contains neither cookie nor server hash',async () => {
    const s=setup(); await s.p.beforeCall(s.session,'producer.next'); const text=JSON.stringify(s.entries[0].publicEntry);
    for (const secret of [token,sha(token),'private-server-hash']) assert(!text.includes(secret));
    assert.equal(s.entries[0].privateEntry.before.token_hash,sha(token));
});
test('an observed DB ID without actual run ownership cannot be prepared',async () => { const s=setup(); s.f.j.objects=[]; await assert.rejects(s.p.beforeCall(s.session,'next'),/actually owned/); assert.equal(s.calls.length,1); });
test('missing independent postcondition cannot be prepared',async () => { const s=setup(); s.f.j.objects[0].postcondition.independentlyVisible=false; await assert.rejects(s.p.beforeCall(s.session,'next'),/actually owned/); });
test('actual cookie-to-user mismatch fails before DML',async () => { const s=setup(); s.session.userId=id; await assert.rejects(s.p.beforeCall(s.session,'next')); assert.equal(s.calls.length,1); });
test('actual cookie-to-server digest mismatch fails before DML',async () => { const s=setup(); s.setRow({ ...s.row,token_hash:'other' }); await assert.rejects(s.p.beforeCall(s.session,'next')); assert.equal(s.calls.length,1); });
test('named due consumes exactly the next call; later call becomes fresh again',async () => {
    const s=setup(), reason='Only this run actual owned session made due to observe original raw-touch plus managed coflush', due='2026-10-30T08:58:00.123Z';
    await s.f.updateOwned('auth_session',id,{ last_seen_at:due },reason); s.p.markNamedDue(s.session);
    const beforeCalls=s.calls.length, entry=await s.p.beforeCall(s.session,'named.approve'); assert.equal(entry.action,'preserve-next-named-due-input'); assert.equal(s.calls.length,beforeCalls+1); assert.equal(s.row.last_seen_at,due);
    assert.equal((await s.p.beforeCall(s.session,'named.closed-detail')).action,'prepared-owned-last-seen-fresh'); assert.equal(s.row.last_seen_at,sample);
});
test('named due requires the exact original committed preparation',() => { const s=setup(); assert.throws(() => s.p.markNamedDue(s.session)); });
test('named due from a different owned session is rejected',async () => {
    const s=setup(); s.f.j.mutations.push({ table:'auth_session',id:userId,values:{ last_seen_at:sample },reason:'Only this run actual owned session made due to observe original raw-touch plus managed coflush',state:'committed' }); s.p.markNamedDue(s.session);
    await assert.rejects(s.p.beforeCall(s.session,'named.approve'));
});
test('a second named due cannot silently overwrite the next-call input',() => {
    const s=setup(); s.f.j.mutations.push({ table:'auth_session',id,values:{ last_seen_at:sample },reason:'Only this run actual owned session made due to observe original raw-touch plus managed coflush',state:'committed' }); s.p.markNamedDue(s.session); assert.throws(() => s.p.markNamedDue(s.session),/next HTTP/);
});
test('a preparation that bumps raw version is rejected',async () => {
    const s=setup(), original=s.f.updateOwned; s.f.updateOwned=async (...args) => { const row=await original(...args); s.setRow({ ...row,row_version:5 }); return s.row; }; await assert.rejects(s.p.beforeCall(s.session,'next'),/another field/);
});
test('a preparation that alters any other column is rejected',async () => {
    const s=setup(), original=s.f.updateOwned; s.f.updateOwned=async (...args) => { const row=await original(...args); s.setRow({ ...row,updated_at:sample }); return s.row; }; await assert.rejects(s.p.beforeCall(s.session,'next'),/another field/);
});
test('bounded controlled owner binds Native baseline and Rust consumer explicitly',() => {
    const native=controlledCommissionOptions('ctrl-native01','nest'); assert.equal(native.consumerBackend,'native'); assert.equal(native.authFreshnessPolicy,'fresh-except-named-due'); assert.equal(native.buildBinding,null);
    const binding={ expectedBinarySha256:'a'.repeat(64) }, rust=controlledCommissionOptions('ctrl-rust01','rust',binding); assert.equal(rust.consumerBackend,'rust'); assert.equal(rust.expectedBinarySha256,binding.expectedBinarySha256); assert.equal(rust.buildBinding,binding);
});
test('bounded controlled owner rejects unknown backend/tag before ownership work',() => {
    assert.throws(() => controlledCommissionOptions('x','production')); assert.throws(() => controlledCommissionOptions('../x','nest'));
});
