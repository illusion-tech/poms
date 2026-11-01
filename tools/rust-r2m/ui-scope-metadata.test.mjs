// Replays only Root's deidentified UI09 case metadata through the real scope
// function, with an in-memory save. It certifies no actual row/DB/browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Fixture} from './fixture.mjs';
import {uiStepScope} from './ui-runtime-sources.mjs';
test('UI1 auth scope permits its proved project without claiming customer/lead write anchors',()=>{
    const actors={admin:'9bfb9bd2-d3b3-43d5-975e-28f698208991',viewer:'305feea6-a7d8-45d3-aaee-42692312182e'},project={id:'623f5be2-839c-43f3-a4c3-dff907d4d80a'};
    const specification=uiStepScope({descriptor:{journey:'UI1',id:'anonymous-deep-link'},prepared:{todo:{project}},actors});
    const fixture={runId:'d20197cd-3992-4e97-9774-128cf936aa04',j:{namespace:'poms-r2m',state:'prepared',objects:[...Object.values(actors).map(id=>({table:'platform_user',id})),{table:'project',id:project.id}],borrowed:{definitions:[]},cases:[]},save(){}};
    const scope=Fixture.prototype.defineCase.call(fixture,specification.caseId,{actors:Object.values(actors),projects:specification.projects,anonymous:true});assert.deepEqual(scope.ownedCustomerIds,[]);assert.deepEqual(scope.ownedLeadIds,[]);assert.deepEqual(scope.salesProjectCustomers,{});assert.equal(fixture.j.cases.length,1);
    assert.throws(()=>Fixture.prototype.defineCase.call(fixture,'m.ui1.illegal-sales',{actors:Object.values(actors),projects:[project.id],ownedCustomerIds:['65d6403d-0895-4156-957e-cf9de69be93e'],anonymous:true}),'Explicit sales anchors still require their independent actual ownership');
});
