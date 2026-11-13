// Prepared readonly components only; no actual output/spec, mode or authority.
// Reuse the complete same-realm closure from prepare361. No Native/app import.
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export function compileReadonlyPreparationReaders362(facts15Source,ownedIO){
 const bytes=Buffer.from(facts15Source);assert.equal(bytes.length,51788);assert.equal(createHash('sha256').update(bytes).digest('hex'),'94c5d1831a2ae762381715bc7f491880adb35a8f1211a1c14dda7d87a9d86bb8');
 const first='export const DB15=',last='\nfunction oneRow';assert.equal(facts15Source.split(first).length-1,1);const a=facts15Source.indexOf(first),b=facts15Source.indexOf(last,a);assert(a>0&&b>a);const prefix=facts15Source.slice(a,b).replace(/^export /gm,'');assert(prefix.includes("const numericLexeme15=Symbol('actual-json-number');"));assert(!prefix.includes('await ')&&!/^import /m.test(prefix));
 const begin='export function verifyContinuation121Data(record,current){',tail='\n const review=json15(record.continuationReadback);';assert.equal(facts15Source.split(begin).length-1,1);assert.equal(facts15Source.split(tail).length-1,1);const x=facts15Source.indexOf(begin),y=facts15Source.indexOf(tail,x);assert(y>x);
 // Exactly the three original relation paragraphs before the separate carrier
 // consumer. The full lexical prefix above includes every helper they use.
 const bootstrap=facts15Source.slice(x,y).replace(begin,'function verifyContinuationBootstrap362(record,current){')+"\n assert.equal(new Set(k.orderedFamilyKeys).size,67,'Ordered67 family keys must be unique');return readonly15({kind:'prepare362-K-bootstrap-relational-facts-only',continuation121:record.continuation121,prepared15:k.prepared15,fullInventory:k.fullInventory,bodySHA256:k.bodySHA256,orderedFamilyCount:k.orderedFamilyKeys.length,entryGuard:k.entryGuard,exitGuard:k.exitGuard,closedJournal:k.closedJournal,continuationReadbackRead:false,acceptanceIssued:false});\n}\n";
 const extra=String.raw`
function readTaxPreparationPacket362(packet,target,current,taxRef){
 const preparation=readPreparationPacket15(packet,target,current),wire=readWire15(packet.http,{operationId:'ProjectCostController_getProjectUnifiedAccounting',status:200},current),url=new URL(wire.config.url);assert.equal(taxRef.kind,'AccountingTaxTreatmentSnapshot');assert.deepEqual(JSON.parse(url.searchParams.get('correctionSourceRefs')),[taxRef],'Only the complete physical Tax ref is an explicit query root');return preparation;
}
function readOpaqueAuthWire362(httpPin,phase,current){
 assert(Number.isInteger(phase)&&phase>=0&&phase<3);const phases=[['AuthController_getCsrfToken','GET'],['AuthController_createPasswordAuthSession','POST'],['AuthController_getCurrentAuthSession','GET']],wire=json15(httpPin);assert.equal(wire.kind,'actual-business-HTTP-attempt');assert.equal(wire.responseComplete,true);assert.equal(wire.transportFailure,false);assert.equal(wire.operationId,phases[phase][0]);assert.equal(wire.method,phases[phase][1]);assert.equal(wire.status,200);assert.equal(wire.expectedStatus,200);exactKeys15(wire.originals,['requestConfig','requestBody','responseHeaders','responseBody']);assert(typeof wire.requestId==='string'&&wire.requestId.startsWith(current.prefix+'-'));for(const p of Object.values(wire.originals))readPin15(p);return readonly15({operationId:wire.operationId,method:wire.method,status:200,requestId:wire.requestId,originals:wire.originals,opaqueAuthBodyOrHeadersParsed:false});
}
`;
 const factory=new vm.Script('(function(fs,path,assert,createHash,Buffer,URL,structuredClone,process){\n'+prefix+'\n'+bootstrap+extra+'\nreturn Object.freeze({readPin15,json15,snapshot15,rows15,rowMap15,canonicalRowPropertyHash15,assertTargetUnion15,readWire15,readPreparationPacket15,assertRequestActor15,verifyContinuationBootstrap362,readTaxPreparationPacket362,readOpaqueAuthWire362});\n})',{filename:'complete-readonly-closure-with-pre-carrier-K-relations362'}).runInThisContext();
 const readers=factory(ownedIO,path.posix,assert,createHash,Buffer,URL,structuredClone,{platform:'linux'});return{readers,derivation:{completeContiguousPrefix:true,numericLexemeDeclarationIncluded:true,sameRealmStrictAssertions:true,originalKRelationParagraphs1to3Included:true,line184CarrierConsumerNotExecuted:true,noSelfReviewCreated:true,NativeOrAppImported:false,actualAcceptanceMade:false}};
}
