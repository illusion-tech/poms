// Finite guard checks, no actual DB/HTTP/browser/private IO.
import test from 'node:test';
import assert from 'node:assert/strict';
import {uiStepScope,uiNativeReadModels,uiExchangeIntents,createUiSourcePreparer} from './ui-runtime-sources.mjs';
import {settingLeaseScope} from './scenario-input.mjs';
const actors={admin:'10000000-0000-4000-8000-000000000001',viewer:'10000000-0000-4000-8000-000000000002'};
const prepared={todo:{project:{id:'20000000-0000-4000-8000-000000000001'}},contract:{project:{id:'20000000-0000-4000-8000-000000000002'},contract:{id:'30000000-0000-4000-8000-000000000001'}},handover:{project:{id:'20000000-0000-4000-8000-000000000003'},handover:{id:'40000000-0000-4000-8000-000000000001'},upload:{name:'actual-source-name.txt'}}};
test('UI scopes retain unique setting lease and explicit project/borrowed principal boundaries',()=>{
    assert.equal(uiStepScope({descriptor:{journey:'UI2',id:'setting-write'},prepared,actors}).caseId,settingLeaseScope);
    const resubmit=uiStepScope({descriptor:{journey:'UI3',id:'original-native-resubmit'},prepared,actors});assert.equal(resubmit.caseId,'m.ui3.integration');assert.deepEqual(resubmit.projects,[prepared.contract.project.id]);assert.equal(resubmit.borrowedActors.length,1);assert.equal(resubmit.role,'admin');assert(resubmit.intents.some(row=>row.table==='approval_record'&&row.selector.target_object_id===prepared.contract.contract.id));
    const upload=uiStepScope({descriptor:{journey:'UI4',id:'upload'},prepared,actors});assert.deepEqual(upload.borrowedActors,[]);assert(upload.intents.some(row=>row.table==='attachment_upload_session'&&row.selector.original_name===prepared.handover.upload.name));
    const cancel=uiStepScope({descriptor:{journey:'UI4',id:'cancel-upload-dialog'},prepared,actors});assert.deepEqual(cancel.intents,[]);
});
test('UI extra Native routes are named original read models and never override migrated methods',()=>{
    let reads=0;const sourceReader={json(){reads++;return{paths:{}}}};
    assert.deepEqual(uiNativeReadModels({sourceReader:{json:()=>({paths:{'/api/projects':{get:{}}}})},input:{sourceProtection:{currentSurface:[]}},selection:['UI1']}),[{method:'GET',path:'/api/projects'}]);
    assert.throws(()=>uiNativeReadModels({sourceReader,input:{sourceProtection:{currentSurface:[]}},selection:['UI1']}));assert.equal(reads,1);
    assert.throws(()=>uiNativeReadModels({sourceReader,input:{sourceProtection:{currentSurface:[]}},selection:['UI4']}));
});
test('a browser response ID and an unknown login principal cannot establish a producer scope',()=>{
    const descriptor={journey:'UI4',id:'upload'},request={method:'POST',path:'/api/attachment-upload-sessions/50000000-0000-4000-8000-000000000001:complete'};
    assert.throws(()=>uiExchangeIntents({descriptor,prepared,actors,request,accounts:[],isOwned:()=>false}));
    const approved=uiExchangeIntents({descriptor,prepared,actors,request,accounts:[],isOwned:(table,id)=>table==='attachment_upload_session'&&id==='50000000-0000-4000-8000-000000000001'});assert.deepEqual(approved.map(row=>row.table),['attachment','attachment_link']);
    assert.throws(()=>uiExchangeIntents({descriptor:{journey:'UI2',id:'setting-write'},prepared,actors,request:{method:'POST',path:'/api/auth/sessions',bodyBase64:Buffer.from(JSON.stringify({username:'some-other-user'})).toString('base64')},accounts:[],isOwned:()=>false}));
});
test('an actual response is retained before a later source-producer certification failure',async()=>{
    const recorded=[],response={status:200,body:{actualResponse:true},bodyBytes:Buffer.from('actual-response'),transportComplete:true,parseError:null};
    const fixture={runId:'10000000-0000-4000-8000-000000000001',backend:'nest',actors,j:{cases:[{caseId:'m.ui3.integration',requestId:'pure-request'}]},async intent(table){return{table,id:table}}};
    const source=createUiSourcePreparer({fixture,native:{witness:{async drain(){},assertComplete(){}}},pg:{async beginCase(){},async drainCase(){throw Error('synthetic later proof failure')}},contexts:new Map(),committed:[],sourceReader:{},sourceCapId:'pure-source',retain:async record=>{recorded.push(record);return{private:true}},nextIndex:()=>1,makeHttpSession:()=>({async request(){return response}}),marker:'pure',databaseFor:()=>null});
    await assert.rejects(source.send({caseId:'m.ui3.integration',method:'POST',path:'/api/contracts/30000000-0000-4000-8000-000000000001:submitReview',body:{comment:'pure'}}));
    assert.equal(recorded[0].kind,'actual-UI-original-Native-response-before-certification');assert.equal(recorded[0].record.response,response);assert.equal(source.state().pgCaseActive,true);
});
