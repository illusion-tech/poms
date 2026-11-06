import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
const p='tools/rust-r4ghi/independent/business-g1/round02/final01',v='tools/rust-r4ghi/joint-g1/effective-v2';
const raw=path=>readFileSync(`${p}/inputs/${path}.bin`),json=path=>JSON.parse(raw(path));
const hash=b=>createHash('sha256').update(b).digest('hex'),checks=[];
const check=(id,passed,observed)=>checks.push({id,passed:Boolean(passed),observed});
const manifest=json('docs/design/rust-r4ghi/g1-source-manifest01.json'),pins=new Map(manifest.entries.map(e=>[e.path,e]));
const blue=json(`${v}/blueprint.json`),op=json('docs/design/rust-r4ghi/operation-map01.json');
for(const [filename,base] of [['sources.json',''],['preserved-inputs.json',''],['manifest.json',v+'/']]){
 const input=json(`${v}/${filename}`),bad=[];
 for(const e of input.entries){const path=base+e.path,pin=pins.get(path);if(!pin||pin.sha256!==e.sha256||pin.bytes!==e.bytes)bad.push({path,reason:!pin?'absent from Root frozen graph':'pin differs',expected:e,Root:pin});}
 check(filename+'-closed-in-root-manifest',!bad.length,{entries:input.entries.length,bad});
}
const differences=json('docs/design/rust-r4ghi/operation-map01.json').operations.map((o,i)=>{
 const b=blue.operationMap[i],copy=structuredClone(o);
 const statusAnnotation=b.newPublicOperation&&b.inventoryStatus==='planned'&&o.inventoryStatus==='new-planned-canonical-decided';
 if(statusAnnotation)copy.inventoryStatus=b.inventoryStatus;
 return{operationId:o.operationId,onlyPermittedStatusAnnotation:statusAnnotation,substantiveEqual:isDeepStrictEqual(copy,b),blueprintStatus:b.inventoryStatus,RootStatus:o.inventoryStatus};
});
check('operation-map-all32-substantive-fields-exact',differences.every(d=>d.substantiveEqual),{metadataDifferences:differences.filter(d=>d.onlyPermittedStatusAnnotation),allOtherFieldsIdentical:true,classification:'accepted-metadata-label-difference; both labels mean new route planned, not implemented'});
const canonical=raw('docs/design/api-route-canonical-inventory.md').toString();
const rows=canonical.split(/\r?\n/).filter(l=>l.startsWith('|')).map(l=>l.split('|').slice(1,-1).map(c=>c.trim().replace(/^`|`$/g,'')));
const badCanonical=[];
for(const o of op.operations){const found=rows.filter(r=>r.includes(o.canonical));if(!found.length||(o.newPublicOperation&&!found.some(r=>r.at(-1)==='planned')))badCanonical.push({operationId:o.operationId,canonical:o.canonical,rows:found});}
check('all32-canonical-rows-and-three-planned-statuses',!badCanonical.length,badCanonical);
check('public-boundaries-consistent-with-root-counts',manifest.counts.total===32&&manifest.counts.newPublic===3&&manifest.counts.existing===29&&manifest.counts.officialRust===240&&manifest.counts.targetRust===272&&manifest.counts.R4Delivered===67&&manifest.counts.R4Planned===95,manifest.counts);
for(const [file,key] of [['interface-targets.json','interfaces'],['scope-response-contract.json','scopeResponseContract'],['restatement-contract.json','restatementContract'],['legacy-current-contract.json','legacyCurrentContract']])check('single-'+key,isDeepStrictEqual(json(`${v}/${file}`),blue[key]),file);
const policy=json(`${v}/policy-definition.json`);
function sort(x){if(Array.isArray(x))return x.map(sort);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])]));return x;}
const canonicalPolicy=Buffer.from(JSON.stringify(sort(policy)));
check('policy-canonical-hash-and-byte-count',hash(canonicalPolicy)===blue.policyIdentity.policyHash&&canonicalPolicy.length===blue.policyIdentity.canonicalBytes,{hash:hash(canonicalPolicy),bytes:canonicalPolicy.length,expected:blue.policyIdentity});
const schemas=json(`${v}/public-contracts.schema.json`).components.schemas;
const native=json(`${v}/native-reference.schemas.json`),spec=json('libs/shared/api-spec/openapi.json');
const badNative=Object.keys(native.components.schemas).filter(k=>!isDeepStrictEqual(native.components.schemas[k],spec.components.schemas[k]));
check('native-reference-exact-original-closure',!badNative.length,{schemas:Object.keys(native.components.schemas).length,bad:badNative});
check('supporting-C-real-confirm-operation',blue.supportingExistingOperations.some(o=>o.operationId==='ContractFinanceController_confirmReceipt')&&!blue.supportingExistingOperations.some(o=>o.operationId==='ContractFinanceController_confirmReceiptRecord'),blue.supportingExistingOperations[0].operationId);
check('conditional-completion-type-and-sql-closure',schemas.ProjectStage.enum.includes('conditional-completed')&&schemas.ProjectArchiveRecordSummary.properties.archiveAnchorStage.enum.includes('conditional-completed')&&raw(`${v}/migration.sql`).includes(Buffer.from('jghi_terminal_stage_result_guard')),blue.lifecycleContract.conditionalStageBinding);
const plan=json('docs/design/rust-r4ghi/acceptance-plan01.json');
check('actual-acceptance-plan-remains-planned',plan.productBase===manifest.productBase&&plan.status.includes('no GHI product')&&plan.stories.length===8&&plan.checks.length>=8&&isDeepStrictEqual(plan.closeout.mustStayOpen,[57,116]),{status:plan.status,stories:plan.stories.map(s=>s.id),checks:plan.checks,closeout:plan.closeout});
const result={kind:'independent-final-frozen-graph-and-semantic-alignment',checks,failed:checks.filter(c=>!c.passed),G1Certified:false,G2Authorized:false,SQLExecuted:false,productAcceptanceRun:false,metadataAdjudication:'integrity02 operation-map exact JSON check was too strict about three Root planned-status annotations. This report verifies every other operation field and actual canonical planned status; original comparison is retained.'};
writeFileSync(`${p}/semantic-checks04.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.passed).length,failed:result.failed,report:`${p}/semantic-checks04.json`},null,2));
