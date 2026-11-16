// Closed exact-POST adapter, copied from the canonical observation order in
// frozen http.mjs. It owns its271 controls and never patches that helper.
import{currentRuntime121,assertCurrentLease121,runtimeReference121}from'../business/runtime-admission121.mjs';
import http from 'node:http';import assert from 'node:assert/strict';import{randomUUID}from'node:crypto';
import{C271,sha271}from'./facts271.mjs';import{verify271,approved271,json271}from'./runtime271.mjs';import{install271,remove271}from'./fi271.mjs';

const guardKeys271=Object.freeze(['kind','protocolVersion','caller','approvedInput','operationId','requestId','requestConfig','runtimeReference121']);
function wireIdentity271(ctx,p){
 const verified=currentRuntime121(ctx),input=approved271(p),candidate=json271(p.candidate),manifest=json271(p.taxRuntimeBindings),c=verified.current;samePinGuard271(candidate.runtimeAdmission121,verified.authorityPin);assert.equal(candidate.kind,'actual-Source15-runtime-candidate121');assert.equal(candidate.protocolVersion,1);samePinGuard271(manifest.current.runtimeAdmission121,verified.authorityPin);for(const key of ['candidate','apiProcess','sourcePins','helperPins'])samePinGuard271(c[key],p[key]);samePinGuard271(c.compilePins,candidate.current.compilePins);samePinGuard271(verified.code.registryPin,p.codeAdmission15);assert.equal(c.sourcePinsSHA256,p.sourcePinsSHA256);assert.equal(c.sourceCount,p.sourceCount);assert.equal(c.helperCount,p.helperCount);assert.equal(c.binary.rawBytesSha256,p.binarySHA256);assert.deepEqual(c.sources,ctx.pins);assert.deepEqual(c.helperSources,ctx.helperPins);return{verified,input};
}
function samePinGuard271(a,b){assert.equal(a?.file,b?.file);assert.equal(a?.rawBytesSha256,b?.rawBytesSha256);if(a?.bytes!==undefined&&b?.bytes!==undefined)assert.equal(a.bytes,b.bytes);}
function checkGuard271(ctx,p,pin,expected){const value=json271(pin);assert.deepEqual(Object.keys(value).sort(),[...guardKeys271].sort());assert.equal(value.kind,'actual-runtime121-external-prewire-guard');assert.equal(value.protocolVersion,1);assert.equal(value.caller,'mixed15-271');samePinGuard271(value.approvedInput,approved271(p));samePinGuard271(value.requestConfig,expected.requestConfig);assert.equal(value.operationId,expected.operationId);assert.equal(value.requestId,expected.requestId);assert.deepEqual(value.runtimeReference121,runtimeReference121(ctx,expected.verified));return value;}
function prewire271(ctx,p,operationId,requestId,requestConfig){try{const {verified,input}=wireIdentity271(ctx,p),reference=runtimeReference121(ctx,verified),pin=ctx.artifact(ctx.next('runtime121-prewire271')+'.json',{kind:'actual-runtime121-external-prewire-guard',protocolVersion:1,caller:'mixed15-271',approvedInput:input,operationId,requestId,requestConfig,runtimeReference121:reference});ctx.persist();const expected={verified,operationId,requestId,requestConfig};checkGuard271(ctx,p,pin,expected);assertCurrentLease121(ctx,verified);return{pin,expected};}catch(error){try{ctx.artifact(ctx.next('runtime121-prewire271-failed')+'.json',{kind:'runtime121-prewire-guard-failed-preserve',operationId,requestId,approvedInput:approved271(p),error:error.message,HTTPDispatched:false,controlsUnmodified:true});ctx.persist();}catch(secondary){error.guardEvidenceError=secondary.message;}throw error;}}

export const binding271=Object.freeze({responseBirths:[{table:'operating_restatement_record',pointer:'/targetId'},{table:'project_operating_snapshot',pointer:'/snapshotId'}],
 mutableTables:['shared_cost_allocation_basis','shared_cost_allocation_result','shared_cost_allocation_source_snapshot','project_operating_head','project_operating_snapshot','project_cost_inclusion_head','operating_signal_gate_binding','commission_gate_review_record']});
export async function requestFI271(ctx,api,p,prepared,key,h){
 await verify271(ctx,p,h);assert(!ctx.state.activeFault);assert.equal(sha271(JSON.stringify(prepared.body)),prepared.bodySHA256);assert.equal(prepared.body.laborCorrections.length,0);
 const op=api.operations.get(C271.operation);assert(op&&op.method==='POST');assert.equal(op.template,'/api/operating-restatements');assert.equal(api.success(C271.operation),201);
 const actor=ctx.state.actors.manager;assert(actor?.id&&actor.cookies.poms_session&&actor.cookies.poms_csrf);
 const url=new URL(ctx.api+h.exactPath(op.template,{}));assert.equal(url.origin,ctx.api);assert.equal(url.search,'');
 const label=ctx.next('a271-http'),requestId=ctx.state.prefix+'-'+label+'-'+randomUUID().slice(0,8);
 // Capturing/asserting BEFORE control DDL is essential. Existing API.request
 // cannot be wrapped around preinstalled controls without invalidating this.
 const before=await h.capture(ctx,label+'-before');h.assertRecorded(ctx,before);
 const active=await install271(ctx,p,prepared,key,requestId,before,h);assert.equal(active.kind,C271.kind);
 const headers={Origin:ctx.origin,'X-Request-Id':requestId,'Accept-Encoding':'identity',Cookie:Object.entries(actor.cookies).map(([k,v])=>k+'='+v).join('; '),'X-CSRF-Token':decodeURIComponent(actor.cookies.poms_csrf),'Content-Type':'application/json'};
 const payload=Buffer.from(JSON.stringify(prepared.body));headers['Content-Length']=payload.length;
 const originals={requestConfig:ctx.artifact(label+'-request.json',{operationId:C271.operation,requestId,url:url.href,method:'POST',headers,binding:{externalExecutor:C271.kind,selectedFamily:key},before:before.manifest}),requestBody:ctx.artifact(label+'-request-body.bin',payload)};
 ctx.persist();
 const prewire=prewire271(ctx,p,C271.operation,requestId,originals.requestConfig);
 let response,failure;const chunks=[];
 try{response=await new Promise((resolve,reject)=>{const request=http.request(url,{method:'POST',headers,timeout:45000},res=>{
   originals.responseHeaders=ctx.artifact(label+'-response-headers.json',{status:res.statusCode,rawHeaders:res.rawHeaders});
   for(const cookie of res.headers['set-cookie']??[]){const part=cookie.split(';',1)[0],at=part.indexOf('=');if(at<1)continue;const k=part.slice(0,at);if(/max-age=0/i.test(cookie))delete actor.cookies[k];else actor.cookies[k]=part.slice(at+1);}
   res.on('data',b=>chunks.push(Buffer.from(b)));res.once('aborted',()=>reject(Error('HTTP response aborted')));res.once('error',reject);res.once('end',()=>resolve({status:res.statusCode,complete:res.complete,contentType:res.headers['content-type']??null}));
 });request.once('error',reject);request.once('timeout',()=>request.destroy(Error('HTTP timeout')));request.end(payload);});}
 catch(error){failure=error;originals.failure=ctx.artifact(label+'-transport-failure.json',{name:error.name,message:error.message,stack:error.stack});}
 const bytes=Buffer.concat(chunks);originals.responseBody=ctx.artifact(label+'-response-body.bin',bytes);let body=null;try{body=bytes.length?JSON.parse(bytes.toString('utf8')):null;}catch{}
 const attempt={runtimeGuard121:prewire.pin,operationId:C271.operation,requestId,actorKey:'manager',actorId:actor.id,pathParams:{},requestValue:prepared.body,requestBodySha256:sha271(payload),status:response?.status??null,expectedStatus:500,responseComplete:response?.complete===true,transportFailure:Boolean(failure),body};
 const publicName=label+'-http.json';ctx.public(publicName,{runtimeGuard121:prewire.pin,kind:'actual-business-HTTP-attempt',externalExecutor:C271.kind,operationId:C271.operation,requestId,actorKey:'manager',method:'POST',canonicalTemplate:op.template,querySha256:sha271(url.search),status:attempt.status,expectedStatus:500,responseComplete:attempt.responseComplete,transportFailure:attempt.transportFailure,originals,bodyByteBoundary:'Configured headers and Node HTTP transfer-decoded entity bytes; not raw TCP capture',secretsHeadersAndPayloadPublished:false});ctx.persist();
 checkGuard271(ctx,p,prewire.pin,prewire.expected);assertCurrentLease121(ctx,prewire.expected.verified);
 // A transport failure remains uncertain even if subsequent rows happen to
 // look rolled back. Exact-owned controls can still be removed for recovery.
 const fault=await remove271(ctx,p,h),after=await h.capture(ctx,label+'-after');
 const ledger=await h.reconcileAttempt(ctx,before,after,attempt,binding271);
 if(failure||!attempt.responseComplete)throw Error('Incomplete real271 transport; reconcile originals before any retry');
 assert.equal(attempt.status,500,'Only an actual complete500 is an FI observation');
 return {...attempt,bytes,receiptId:ctx.out+'/'+publicName,ledger,fault,before:before.manifest,after:after.manifest};
}
