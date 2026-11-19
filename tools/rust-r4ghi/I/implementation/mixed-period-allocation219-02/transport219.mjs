// Closed exact-POST adapter, copied from the canonical observation order in
// frozen http.mjs. It owns its219 controls and never patches that helper.
import http from 'node:http';import assert from 'node:assert/strict';import{randomUUID}from'node:crypto';
import{C219,sha219}from'./facts219.mjs';import{verify219}from'./runtime219.mjs';import{install219,remove219}from'./fi219.mjs';
export const binding219=Object.freeze({responseBirths:[{table:'operating_restatement_record',pointer:'/targetId'},{table:'project_operating_snapshot',pointer:'/snapshotId'}],
 mutableTables:['shared_cost_allocation_basis','shared_cost_allocation_result','shared_cost_allocation_source_snapshot','project_operating_head','project_operating_snapshot','project_cost_inclusion_head','operating_signal_gate_binding','commission_gate_review_record']});
export async function requestFI219(ctx,api,p,prepared,key,h){
 verify219(ctx,p,h);assert(!ctx.state.activeFault);assert.equal(sha219(JSON.stringify(prepared.body)),prepared.bodySHA256);assert.equal(prepared.body.laborCorrections.length,0);
 const op=api.operations.get(C219.operation);assert(op&&op.method==='POST');assert.equal(op.template,'/api/operating-restatements');assert.equal(api.success(C219.operation),201);
 const actor=ctx.state.actors.manager;assert(actor?.id&&actor.cookies.poms_session&&actor.cookies.poms_csrf);
 const url=new URL(ctx.api+h.exactPath(op.template,{}));assert.equal(url.origin,ctx.api);assert.equal(url.search,'');
 const label=ctx.next('a219-http'),requestId=ctx.state.prefix+'-'+label+'-'+randomUUID().slice(0,8);
 // Capturing/asserting BEFORE control DDL is essential. Existing API.request
 // cannot be wrapped around preinstalled controls without invalidating this.
 const before=await h.capture(ctx,label+'-before');h.assertRecorded(ctx,before);
 const active=await install219(ctx,p,prepared,key,requestId,before,h);assert.equal(active.kind,C219.kind);
 const headers={Origin:ctx.origin,'X-Request-Id':requestId,'Accept-Encoding':'identity',Cookie:Object.entries(actor.cookies).map(([k,v])=>k+'='+v).join('; '),'X-CSRF-Token':decodeURIComponent(actor.cookies.poms_csrf),'Content-Type':'application/json'};
 const payload=Buffer.from(JSON.stringify(prepared.body));headers['Content-Length']=payload.length;
 const originals={requestConfig:ctx.artifact(label+'-request.json',{operationId:C219.operation,requestId,url:url.href,method:'POST',headers,binding:{externalExecutor:C219.kind,selectedFamily:key},before:before.manifest}),requestBody:ctx.artifact(label+'-request-body.bin',payload)};
 ctx.persist();let response,failure;const chunks=[];
 try{response=await new Promise((resolve,reject)=>{const request=http.request(url,{method:'POST',headers,timeout:45000},res=>{
   originals.responseHeaders=ctx.artifact(label+'-response-headers.json',{status:res.statusCode,rawHeaders:res.rawHeaders});
   for(const cookie of res.headers['set-cookie']??[]){const part=cookie.split(';',1)[0],at=part.indexOf('=');if(at<1)continue;const k=part.slice(0,at);if(/max-age=0/i.test(cookie))delete actor.cookies[k];else actor.cookies[k]=part.slice(at+1);}
   res.on('data',b=>chunks.push(Buffer.from(b)));res.once('aborted',()=>reject(Error('HTTP response aborted')));res.once('error',reject);res.once('end',()=>resolve({status:res.statusCode,complete:res.complete,contentType:res.headers['content-type']??null}));
 });request.once('error',reject);request.once('timeout',()=>request.destroy(Error('HTTP timeout')));request.end(payload);});}
 catch(error){failure=error;originals.failure=ctx.artifact(label+'-transport-failure.json',{name:error.name,message:error.message,stack:error.stack});}
 const bytes=Buffer.concat(chunks);originals.responseBody=ctx.artifact(label+'-response-body.bin',bytes);let body=null;try{body=bytes.length?JSON.parse(bytes.toString('utf8')):null;}catch{}
 const attempt={operationId:C219.operation,requestId,actorKey:'manager',actorId:actor.id,pathParams:{},requestValue:prepared.body,requestBodySha256:sha219(payload),status:response?.status??null,expectedStatus:500,responseComplete:response?.complete===true,transportFailure:Boolean(failure),body};
 const publicName=label+'-http.json';ctx.public(publicName,{kind:'actual-business-HTTP-attempt',externalExecutor:C219.kind,operationId:C219.operation,requestId,actorKey:'manager',method:'POST',canonicalTemplate:op.template,querySha256:sha219(url.search),status:attempt.status,expectedStatus:500,responseComplete:attempt.responseComplete,transportFailure:attempt.transportFailure,originals,bodyByteBoundary:'Configured headers and Node HTTP transfer-decoded entity bytes; not raw TCP capture',secretsHeadersAndPayloadPublished:false});ctx.persist();
 // A transport failure remains uncertain even if subsequent rows happen to
 // look rolled back. Exact-owned controls can still be removed for recovery.
 const fault=await remove219(ctx,p,h),after=await h.capture(ctx,label+'-after');
 const ledger=await h.reconcileAttempt(ctx,before,after,attempt,binding219);
 if(failure||!attempt.responseComplete)throw Error('Incomplete real219 transport; reconcile originals before any retry');
 assert.equal(attempt.status,500,'Only an actual complete500 is an FI observation');
 return {...attempt,bytes,receiptId:ctx.out+'/'+publicName,ledger,fault,before:before.manifest,after:after.manifest};
}
