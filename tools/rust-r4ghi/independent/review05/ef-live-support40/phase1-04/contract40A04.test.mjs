// Canonical-contract and pure builder probes. No actual fixture producer is invoked.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const ownFile=new URL('./candidate/tools/rust-r4ghi/business/ef-live-producer40.mjs',import.meta.url);
let source=fs.readFileSync(ownFile,'utf8');
source=source.replace(/from '(\.\/[^']+\.mjs)'/g,(_,name)=>'from '+JSON.stringify(new URL('../../../../business/'+name.slice(2),import.meta.url).href));
const {assertEFPublicContract40:preflight,classifyNewRows:classify}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const spec=JSON.parse(fs.readFileSync(new URL('../../../../../../libs/shared/api-spec/openapi.json',import.meta.url)));
const operations=new Map(Object.values(spec.paths).flatMap(methods=>Object.values(methods).filter(value=>value.operationId).map(value=>[value.operationId,value])));
const id=n=>`55555555-5555-4555-8555-${String(n).padStart(12,'0')}`;
const ref=(n,kind='ProjectActualCostRecord')=>({kind,id:id(n),rowVersion:1,payloadHash:'a'.repeat(64)});
test('the actual S6 full canonical spec admits every used operation and enum before any producer call',()=>preflight({spec,operations}));
test('a missing operation or removed wire enum fails before constructing a business command',()=>{
 const ops=new Map(operations);ops.delete('ProjectCostController_confirmAccountingTaxTreatment');assert.throws(()=>preflight({spec,operations:ops}));
 const changed=structuredClone(spec);changed.components.schemas.CostDecisionInput.properties.reasonCode.enum=changed.components.schemas.CostDecisionInput.properties.reasonCode.enum.filter(value=>value!=='shared-source-delegated');
 assert.throws(()=>preflight({spec:changed,operations}));
});
test('real labor delegation and allocation inclusion use registered reason codes and distinct roles',()=>{
 const rows=[{sourceRef:ref(1),rowKind:'direct-cost'},{sourceRef:ref(2),rowKind:'direct-cost'},{sourceRef:ref(3,'SharedCostAllocationResult'),rowKind:'allocation-share'}]
  .map(row=>({...row,currentDecisionRef:null,sourceMembers:[],blockingReasonCodes:[]}));
 const body=classify({sourceRows:rows},{laborId:id(1),expenseCostId:id(2),shareIds:[id(3)]});
 const values=spec.components.schemas.CostDecisionInput.properties.reasonCode.enum;
 assert(body.every(value=>values.includes(value.reasonCode)));
 assert.equal(body[0].decision,'exclude');assert.equal(body[0].recognitionRole,'direct-source');assert.equal(body[0].reasonCode,'shared-source-delegated');assert.equal(body[0].primaryCostRef,null);
 assert.equal(body[2].decision,'include');assert.equal(body[2].recognitionRole,'allocation-share');assert.equal(body[2].reasonCode,'executed-labor');
});
test('an unrelated unclassified source is not automatically included for the fixture',()=>{
 assert.throws(()=>classify({sourceRows:[{sourceRef:ref(9),rowKind:'direct-cost',currentDecisionRef:null,sourceMembers:[],blockingReasonCodes:[]}]},
  {laborId:id(1),expenseCostId:id(2),shareIds:[id(3)]}));
});
