import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { plannedJournal, validateJournal } from './fixture-journal.mjs';
import { adoptRoles, ownedRoleIds, roleFixture } from './fixture-roles.mjs';
import { auditSnapshot } from './fixture-snapshot.mjs';

const require = createRequire(import.meta.url);
const { roleFixtureSpec, roleFixtureSlots } = require('./role-fixture-spec.cjs');
const { parseFixtureRequest } = require('./fixture-protocol.cjs');
const request = { formatVersion: 1, runId: '4a74473f-1475-4caa-bfee-2dbca069a24f', backend: 'nest', action: 'role-plan', account: 'none', roleSlot: 'main' };
const id = '10caac97-0b96-4ef4-bb46-685083dcbe4e';
test('role protocol accepts fixed slots and refuses arbitrary targets, tokens and misplaced slots', () => {
    for(const slot of roleFixtureSlots) assert.equal(parseFixtureRequest(Buffer.from(JSON.stringify({...request,roleSlot:slot}))).roleSlot,slot);
    for(const changes of [{roleSlot:'foreign'}, {roleId:id}, {roleKey:'platform-admin'}, {sessionToken:'a'.repeat(43)}, {action:'cleanup',roleSlot:'main'}]) assert.throws(()=>parseFixtureRequest(Buffer.from(JSON.stringify({...request,...changes}))));
});
test('create intent is durable before return and existing rows cannot be claimed', async () => {
    const journal=plannedJournal(request); journal.state='prepared';
    const events=[];
    await roleFixture({query:async()=>{events.push('read');return {rows:[]};}},request,journal,{write:async(j)=>{validateJournal(j,request);events.push('fsync');}});
    assert.deepEqual(events,['read','fsync']);
    assert.equal(journal.roles[0].roleId,null);
    const fresh=plannedJournal(request);
    await assert.rejects(roleFixture({query:async()=>({rows:[{id}]})},request,fresh,{write:async()=>assert.fail()}),{code:'role_fixture_preexisting'});
});
function created(spec, changes={}) {return {id,role_key:spec.databaseKey,name:Buffer.from(spec.name).toString(),description:spec.description===null?null:Buffer.from(spec.description).toString(),display_order:spec.displayOrder,is_active:true,is_system_role:false,created_by:null,updated_by:null,...changes};}
test('recovery adopts committed role after failed HTTP response, including PG replacement key', async () => {
    for(const slot of ['main','utf16-key','utf16-name','utf16-description']) {
        const journal=plannedJournal(request),spec=roleFixtureSpec(request.runId,slot);
        journal.roles.push({slot,roleKey:spec.databaseKey,roleId:null});
        await adoptRoles({query:async(sql,args)=>{assert(sql.endsWith('for update'));assert.equal(args[0],spec.databaseKey);return {rows:[created(spec)]};}},journal);
        assert.equal(journal.roles[0].roleId,id); assert(ownedRoleIds(journal).includes(id));validateJournal(journal,request);
    }
});
test('adoption rejects wrong initial content, known UUID mismatch, duplicate keys and foreign IDs',async()=>{
    const spec=roleFixtureSpec(request.runId,'main');
    for(const changes of [{name:'foreign'},{is_system_role:true},{created_by:id},{role_key:'foreign'}]){
        const journal=plannedJournal(request);journal.roles.push({slot:'main',roleKey:spec.databaseKey,roleId:null});
        await assert.rejects(adoptRoles({query:async()=>({rows:[created(spec,changes)]})},journal));
    }
    const journal=plannedJournal(request);journal.roles.push({slot:'main',roleKey:spec.databaseKey,roleId:journal.accounts[0].roleId});
    assert.throws(()=>validateJournal(journal,request));
    journal.roles[0].roleId=id;journal.roles.push({...journal.roles[0]});assert.throws(()=>validateJournal(journal,request));
});
test('failed before insert leaves a planned missing role recoverable without inventing ID',async()=>{
    const journal=plannedJournal(request);journal.roles.push({slot:'main',roleKey:roleFixtureSpec(request.runId,'main').databaseKey,roleId:null});
    await adoptRoles({query:async()=>({rows:[]})},journal,true);
    assert.equal(journal.roles[0].roleId,null);assert.equal(ownedRoleIds(journal).length,2);
});
test('role audit preserves twelve fields and distinguishes minimum-permission rejection',()=>{
    const row={id,targetId:id,operatorId:id,eventType:'platform.role.permissions.baseline.rejected',targetType:'PlatformRole',requestId:null,result:'rejected',reason:'system-role-baseline-violation',beforeSnapshot:null,afterSnapshot:null,metadata:{missingPermissionKeys:['project:read']},occurredAt:new Date('2026-10-26T00:00:00Z')};
    assert.equal(auditSnapshot(row,[id]).metadata.missingPermissionKeys[0],'project:read');
    for(const changes of [{requestId:'unexpected'},{operatorId:'00000000-0000-0000-0000-000000000000'},{metadata:{token:'hidden'}}]) assert.throws(()=>auditSnapshot({...row,...changes},[id]));
});
