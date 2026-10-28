import test from 'node:test';
import assert from 'node:assert/strict';
import {plannedExtension,extensionTestHelpers as guards} from './batch-extension.mjs';
const request={formatVersion:1,backend:'rust',runId:'a0000000-0000-4000-8000-000000000001',action:'prepare',account:'none'};
const base={backend:'rust',runId:request.runId,accounts:[{account:'admin',userId:'b0000000-0000-4000-8000-000000000001',username:'owned-admin'},{account:'viewer',userId:'b0000000-0000-4000-8000-000000000002',username:'owned-viewer'}]};
const make=()=>plannedExtension(request,base);
test('extension plans both HTTP creations, four actual usage domains and owned number years before writes',()=>{
    const j=make();assert.equal(j.state,'planned');assert.equal(j.dictionaries.length,7);assert.equal(j.usageLeaves.length,8);assert.equal(j.auditSeeds.length,110);assert.equal(j.securitySeeds.length,110);
    assert.equal(j.createdDictionary.domain,'attachment-category');assert.equal(j.eCreatedDictionary.domain,'lead-source');assert.notEqual(j.createdCode,j.eCreatedCode);assert.equal(j.createdDictionary.id,null);assert.equal(j.eCreatedDictionary.id,null);
    assert.equal(j.auditEventType,j.fFixture.auditEventType);assert.equal(j.securityEventType,j.fFixture.securityEventType);assert.equal(Object.keys(j.targetIds).length,9);assert(Object.values(j.targetIds).every(id=>id===j.fFixture.targetId));
    assert.equal(j.ePgFixture.numberCases.length,9);assert.equal(j.numbers.length,20);assert(j.numbers.every(row=>row.period!=='2026'&&/^\d{4}$/.test(row.period)));assert(j.ePgFixture.numberCases.some(row=>row.initialNextValue===null));assert(j.ePgFixture.numberCases.some(row=>row.initialNextValue>999999));
    assert(j.dictionaries.every(row=>row.code.length<=32));assert.equal(new Set(j.usageCases.map(row=>row.domain)).size,4);assert(j.usageCases.every(row=>row.usageCount===2));assert(j.ePgFixture.setting.requestId.length<=55);
    const ids=[...j.dictionaries,...j.usageLeaves,...j.numbers,...j.auditSeeds,...j.securitySeeds].map(row=>row.id).filter(Boolean);assert.equal(new Set(ids).size,ids.length);assert(guards.validate(j,request,base)===undefined);
});
test('foreign actor or changed immutable dictionary identity cannot be adopted',()=>{
    const j=make(),plan=j.dictionaries[0];const row={id:plan.id,domain:plan.domain,code:plan.code,created_by:plan.actorId,updated_by:plan.actorId,created_at:'2026-01-01T00:00:00+00:00',is_system:false,row_version:1,name:'old'};plan.snapshot=JSON.stringify(row);
    assert(guards.dictionaryOwned({...row,name:'changed',row_version:2},plan,j));assert(!guards.dictionaryOwned({...row,code:'foreign'},plan,j));assert(!guards.dictionaryOwned({...row,updated_by:null},plan,j));assert(!guards.dictionaryOwned({...row,is_system:true},plan,j));assert(!guards.dictionaryOwned({...row,created_at:'changed'},plan,j));
});
test('setting restore preserves full PostgreSQL text and rejects unowned intervening state',()=>{
    const j=make();const original='{"key":"attachment.max-upload-size-mb","value_type":"integer","value_json":50,"row_version":1,"created_at":"2026-01-01T00:00:00.123456+00:00","updated_at":"2026-01-01T00:00:00.123456+00:00","updated_by":null}';
    assert.equal(guards.settingDecision(original,original,j),'unchanged');assert.equal(guards.settingDecision(null,null,j),'unchanged');
    const row=JSON.parse(original);row.value_json=128;row.row_version=2;row.updated_by=j.actors[0].userId;const current=JSON.stringify(row);
    assert.equal(guards.settingDecision(original,current,j),'restore-owned');assert.equal(guards.settingDecision(null,current,j),'delete-owned');assert(original.includes('.123456'));
    assert.throws(()=>guards.settingDecision(original,null,j));assert.throws(()=>guards.settingDecision(original,JSON.stringify({...row,updated_by:'c0000000-0000-4000-8000-000000000001'}),j));assert.throws(()=>guards.settingDecision(original,JSON.stringify({...row,created_at:'changed'}),j));
});
test('event ownership and exact registered snapshots reject unrelated rows and post-adoption mutation',()=>{
    const j=make(),actor=j.actors[0].userId;assert(guards.auditOwned({operator_id:actor,target_type:'SystemSetting',target_id:'attachment.max-upload-size-mb',event_type:'platform.system_setting.updated',result:'success'},j));assert(!guards.auditOwned({operator_id:actor,target_type:'Customer',target_id:'outside',event_type:'customer.updated',result:'success'},j));
    assert(guards.securityOwned({actor_id:actor},j));assert(guards.securityOwned({actor_id:null,request_id:'r2ef:'+j.runId},j));assert(!guards.securityOwned({actor_id:'c0000000-0000-4000-8000-000000000001',request_id:'r2ef:'+j.runId},j));
    const plan=j.usageLeaves[0],snapshot=JSON.stringify({id:plan.id,category:plan.code});plan.snapshot=snapshot;assert(guards.rowOwnedByExactSnapshot(plan.table,snapshot,j));assert(!guards.rowOwnedByExactSnapshot(plan.table,JSON.stringify({id:plan.id,category:'foreign'}),j));assert(!guards.rowOwnedByExactSnapshot('unexpected_table',snapshot,j));
});
