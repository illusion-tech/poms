import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {OwnedFixture} from './owned-fixture.mjs';
import {facts as baseFacts} from './fixture-snapshot.mjs';
const require=createRequire(import.meta.url),{parseBatchRequest}=require('./batch-protocol.cjs');
const runId='11111111-1111-4111-8111-111111111111',compact=runId.replaceAll('-','');
const provider='22222222-2222-4222-8222-222222222222',actor='33333333-3333-4333-8333-333333333333';
const request=extra=>({formatVersion:1,runId,backend:'nest',...extra});
const parse=value=>parseBatchRequest(Buffer.from(JSON.stringify(value)));

test('new batch actions accept optional none account and reject ambient or unknown mutation fields',()=>{
    assert.equal(parse(request({action:'prepare',account:'none'})).action,'prepare');
    assert.equal(parse(request({action:'plan',key:'provider',table:'identity_provider_config',selector:{tenant_id:'gh-'+compact},max:1})).max,1);
    for(const value of [request({action:'prepare',account:'admin'}),request({action:'prepare',database:'poms'}),request({action:'plan',key:'x',table:'org_unit',selector:{code:'shared'},max:0}),request({action:'configure-upstream',upstreamTag:'../foreign'}),request({action:'permissions',account:'admin',permissions:['x','x']})])assert.throws(()=>parse(value));
});

test('write intents require the run tenant and exact already-owned references before reading or recording rows',async()=>{
    let reads=0,saves=0;
    const fixture=Object.assign(Object.create(OwnedFixture.prototype),{runId,j:{state:'prepared',baseUsers:[actor],objects:[{table:'identity_provider_config',id:provider,origin:'prepare'}],intents:[]},rows:async()=>{reads++;return [];},save:()=>{saves++;}});
    await assert.rejects(fixture.plan('foreign-provider','identity_provider_config',{tenant_id:'shared'},1));
    await assert.rejects(fixture.plan('foreign-binding','external_identity',{identity_provider_config_id:'44444444-4444-4444-8444-444444444444',poms_user_id:actor,subject_id:'gh-'+compact},1));
    await assert.rejects(fixture.plan('foreign-source','external_org_source',{external_tenant_id:'shared'},1));
    assert.equal(reads,0);assert.equal(saves,0);
    await fixture.plan('owned-provider','identity_provider_config',{tenant_id:'gh-'+compact},1);
    await fixture.plan('owned-unsupported','external_org_source',{external_tenant_id:'gh-'+compact+'-unsupported'},1);
    assert.equal(reads,2);assert.equal(saves,2);
});

test('a failed parent creation leaves a witnessed empty derived group rather than inventing a parent ID',async()=>{
    const child={key:'diffs',table:'org_sync_diff_item',selector:null,derived:{parentKey:'run',column:'run_id'},beforeIds:[],adoptedIds:[],max:3};let saved=0;
    const fixture={j:{intents:[child]},adopt:async key=>{assert.equal(key,'run');return [];},save:()=>saved++};
    assert.deepEqual(await OwnedFixture.prototype.adopt.call(fixture,'diffs'),[]);assert.equal(child.selector,null);assert.equal(saved,1);assert(child.absentParentObservedAt);
});

test('overlapping logical groups exclude only exact IDs already owned by another registered intent',async()=>{
    const first='55555555-5555-4555-8555-555555555555',second='66666666-6666-4666-8666-666666666666';
    const intent={key:'first',table:'org_sync_run',selector:{source_id:provider},beforeIds:[],adoptedIds:[first],max:1};
    const fixture={j:{intents:[intent],objects:[{table:'org_sync_run',id:first,origin:'first'},{table:'org_sync_run',id:second,origin:'second'}]},rows:async()=>[first,second].map(id=>({id,snapshot:JSON.stringify({id})})),save:()=>{}};
    assert.deepEqual((await OwnedFixture.prototype.adopt.call(fixture,'first')).map(row=>row.id),[first]);
    fixture.j.objects.pop();await assert.rejects(OwnedFixture.prototype.adopt.call(fixture,'first'),/Intent maximum exceeded/);assert.equal(fixture.j.objects.length,1);
});

test('extended session snapshots admit an audit only when its exact recorded identity still matches',async()=>{
    const audit={id:'77777777-7777-4777-8777-777777777777',operator_id:actor,target_type:'IdentityProviderConfig',target_id:provider,event_type:'identity-provider.updated'};
    const base={runId,accounts:[{userId:actor}],users:[],roles:[],orgs:[]},client={query:async sql=>({rows:sql.includes('poms.audit_log')?[{row:audit}]:[]})};
    await assert.rejects(baseFacts(client,base),/foreign_fixture_reference/);
    const plan={id:audit.id,identity:{operator_id:actor,target_type:audit.target_type,target_id:provider,event_type:audit.event_type}};
    assert.equal((await baseFacts(client,base,[plan])).audit_log.length,1);
    await assert.rejects(baseFacts(client,base,[{...plan,identity:{...plan.identity,target_id:'88888888-8888-4888-8888-888888888888'}}]),/foreign_fixture_reference/);
});

function cleanupFixture(base) {
    const events=[];
    const fixture=Object.assign(Object.create(OwnedFixture.prototype),{
        j:{state:'prepared',intents:[],objects:[]},
        client:{query:async sql=>{events.push(sql);return {rows:[],rowCount:0};}},
        adoptAudits:async()=>{},preflightReferences:async()=>({}),assertReferences:async()=>{},
        base:async()=>{events.push('base-cleanup');return base();},
        save:()=>events.push('save:'+fixture.j.state)
    });
    return {fixture,events};
}

test('an interrupted base cleanup never publishes a cleaned GH lifecycle',async()=>{
    const {fixture,events}=cleanupFixture(()=>{throw new Error('synthetic interrupted base cleanup');});
    await assert.rejects(fixture.cleanup(),/synthetic interrupted base cleanup/);
    assert.equal(fixture.j.state,'prepared');
    assert(events.includes('COMMIT'));assert(events.includes('base-cleanup'));
    assert(!events.includes('save:cleaned'));
});

test('a cleanup publishes completion only after extension and base cleanup both return',async()=>{
    const {fixture,events}=cleanupFixture(()=>({matched:0,changed:0}));
    const result=await fixture.cleanup();
    assert.equal(result.zero,true);assert.equal(fixture.j.state,'cleaned');
    assert(events.indexOf('COMMIT')<events.indexOf('base-cleanup'));
    assert(events.indexOf('base-cleanup')<events.indexOf('save:cleaned'));
});
