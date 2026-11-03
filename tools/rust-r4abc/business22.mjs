import fs from 'node:fs';import assert from 'node:assert/strict';import{randomUUID}from'node:crypto';import{spawnSync}from'node:child_process';
import{ApiClient,connect,snapshot,changedTables,writePrivate,pin,priv,win,root,identity}from'./fixture-core04.mjs';
import * as payload from './upstream-payloads01.mjs';
const out=win+'/tmp/rust-r4abc/root/business22';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const api=new ApiClient('creator'),approver=new ApiClient('approver'),db=await connect(),steps=[],groups=[],ctx={tag:'multi22',caseId:'multi22',runId:randomUUID(),actorId:api.actor.id,expectedInstanceId:identity().marker,plannedDate:'2026-11-10',instant:new Date().toISOString()};let phase='login',n=0;
async function call(method,path,body,status=method==='POST'?201:200,actor=api){phase=method+' '+path;const r=await actor.request(method,path,body,'b22-'+String(++n).padStart(3,'0'));steps.push(r.public);fs.writeFileSync(out+'/progress.json',JSON.stringify({phase,steps},null,2)+'\n');assert.equal(r.status,status,phase);return r.value;}
const send=(request,status,actor)=>call(request.method,request.path,request.body,status,actor);
async function unchanged(label,fn){const before=await snapshot(db,'b22-'+label+'-before');const value=await fn();const after=await snapshot(db,'b22-'+label+'-after'),changed=changedTables(before,after);groups.push({label,before,after,changed});assert.deepEqual(changed,[],label+' must leave all113 tables unchanged');return value;}
const terms=(contract,amount)=>{const t=payload.contractTerms({...ctx,contract,contractInclusive:amount,contractExclusive:amount});t.taxRate='0.0000';return t;};
async function current(c){c.contract=await call('GET','/api/contracts/'+c.contract.id);return c.contract;}
async function submit(c){await current(c);c.submitted=await send(payload.submit(c),200);c.approval=await call('GET','/api/contracts/'+c.contract.id+'/approval-record');return c.submitted;}
async function decide(c,decision){c.approval=await call('GET','/api/contracts/'+c.contract.id+'/approval-record');return send(payload.decide(c,decision),200,approver);}
async function prepare(c){c.readiness=await call('GET','/api/contract-readiness-packages/'+c.readiness.id);c.preparation=await send(payload.prepare(c),200);return c.preparation;}
async function activate(c){await current(c);c.activated=await send(payload.activate(c),200);await current(c);return c.activated;}
try{
 await api.login('b22-creator');await approver.login('b22-approver');const before=await snapshot(db,'b22-start');
 ctx.customer=await send(payload.customer(ctx));ctx.project=await send(payload.project(ctx));ctx.cost=await send(payload.cost(ctx));ctx.bid=await send(payload.bid(ctx,'won'));
 const a={...ctx,tag:'multi22a',contractInclusive:'9999999999999999.99',contractExclusive:'9999999999999999.99'},b={...ctx,tag:'multi22b',contractInclusive:'70000.00',contractExclusive:'70000.00'};
 a.contract=await send(payload.draftContract(a));b.contract=await send(payload.draftContract(b));const reference=[terms(a.contract,a.contractInclusive),terms(b.contract,b.contractInclusive)];
 ctx.contract=a.contract;const br=payload.baseline(ctx);br.body.contractTerms=reference;ctx.baseline=await send(br);a.baseline=b.baseline=ctx.baseline;
 const requestFile=priv+'/summary-multi22-request.json';writePrivate(requestFile,payload.summaryRequest(ctx));const result=spawnSync(root+'/tmp/rust-r4abc/cargo-target/debug/examples/r4_summary_producer',[requestFile],{cwd:root,env:{...process.env,POMS_ENV_FILE:priv+'/rust.env'},encoding:null,timeout:30000,maxBuffer:16000000});writePrivate(priv+'/summary-multi22-stdout.bin',result.stdout||Buffer.alloc(0));writePrivate(priv+'/summary-multi22-stderr.bin',result.stderr||Buffer.alloc(0));assert.equal(result.status,0);ctx.summary=JSON.parse(result.stdout);assert(ctx.summary.outerCommitAcknowledged);
 ctx.pricing=await send(payload.pricing(ctx,{mode:'won'}));a.summary=b.summary=ctx.summary;a.pricing=b.pricing=ctx.pricing;
 for(const c of[a,b]){const req=payload.readiness(c);req.body.candidateTerms=terms(c.contract,c.contractInclusive);c.readiness=await send(req);assert.equal(c.readiness.guardDecision,'allowed');await prepare(c);}
 await unchanged('ambiguous-selection',async()=>{const r=await call('GET','/api/projects/'+ctx.project.id+'/contract-readiness',undefined,409);assert.equal(r.code,'contract_selection_required');const d=await call('GET','/api/commercial-release-baselines/'+ctx.baseline.id+'/diff-history',undefined,409);assert.equal(d.code,'contract_selection_required');});
 const upper=await call('GET','/api/projects/'+ctx.project.id.toUpperCase()+'/contract-readiness?contractId='+a.contract.id.toUpperCase());assert.equal(upper.contractId,a.contract.id);
 const originalA=a.preparation,firstContractVersion=a.contract.rowVersion;
 await unchanged('prepare-exact-repeat',()=>send(payload.prepare(a),200));
 a.contract=await call('PATCH','/api/contracts/'+a.contract.id,{customerContractNo:'R4-multi22-reviewed-core',expectedVersion:a.contract.rowVersion});
 await unchanged('prepare-stale-cas',()=>send(payload.prepare(a),409));await prepare(a);assert.equal(a.preparation.preparationVersion,2);assert.notEqual(a.preparation.preparationId,originalA.preparationId);
 await unchanged('submit-stale-cas',()=>call('POST','/api/contracts/'+a.contract.id+':submitReview',{preparationId:a.preparation.preparationId,expectedVersion:firstContractVersion},409));
 await unchanged('plan-before-active',()=>send(payload.plan(a),400));await submit(a);await decide(a,'approve');await activate(a);
 const receipt=payload.receipt(a);receipt.body.receiptAmount='0.01';a.receipt=await send(receipt);assert.equal(a.receipt.receiptAmount,'0.01');
 await submit(b);const firstApproval=b.submitted.approvalRecordId;
 // Deliberately remove only our acknowledged binding to prepare a legacy-negative fixture.
 const{rows:[binding]}=await db.query('SELECT to_jsonb(t)::text row FROM poms.contract_review_binding t WHERE approval_record_id=$1',[firstApproval]);assert(binding);writePrivate(priv+'/business22-legacy-binding-before.json',binding);
 await db.query('DELETE FROM poms.contract_review_binding WHERE approval_record_id=$1',[firstApproval]);
 await unchanged('legacy-binding-required',async()=>{const rejected=await send(payload.decide(b,'approve'),409,approver);assert.equal(rejected.code,'preparation_binding_required');});
 await db.query('INSERT INTO poms.contract_review_binding SELECT (json_populate_record(NULL::poms.contract_review_binding,$1::json)).*',[binding.row]);
 await decide(b,'reject');await current(b);assert.equal(b.contract.status,'draft');await submit(b);assert.notEqual(b.submitted.approvalRecordId,firstApproval);assert.equal(b.submitted.preparationId,b.preparation.preparationId);await decide(b,'reject');await current(b);
 const p2=payload.pricing(ctx,{mode:'won'});p2.body.quoteVersion='Q-multi22-second-source';ctx.pricing2=await send(p2);
 await unchanged('stale-real-source',async()=>{const old=await send(payload.submit(b),409);assert.equal(old.code,'source_changed');});
 const next=payload.readiness(b);next.body.candidateTerms=terms(b.contract,b.contractInclusive);b.readiness=await send(next);assert.equal(b.readiness.guardDecision,'allowed');const oldB=b.preparation;await prepare(b);assert.equal(b.preparation.preparationVersion,2);assert.notEqual(b.preparation.preparationId,oldB.preparationId);await submit(b);await decide(b,'approve');await activate(b);
 const p3=payload.pricing(ctx,{mode:'won'});p3.body.quoteVersion='Q-multi22-third-source';ctx.pricing3=await send(p3);
 for(const c of[a,b]){c.readiness=await call('GET','/api/contract-readiness-packages/'+c.readiness.id);c.plan=await send(payload.plan(c),200);assert.equal(c.plan.snapshotId,c.activated.snapshotId);await unchanged('plan-repeat-'+(c===a?'a':'b'),()=>send(payload.plan(c),200));}
 assert.notEqual(a.activated.snapshotId,b.activated.snapshotId);assert.notEqual(a.plan.planVersionId,b.plan.planVersionId);
 const frozen=[];for(const c of[a,b]){const{rows:[row]}=await db.query('SELECT s.amount_tax_inclusive::text snapshot_amount,p.amount_tax_inclusive::text plan_amount,s.source_preparation_id::text preparation_id,p.source_preparation_id::text plan_preparation_id FROM poms.contract_term_snapshot s JOIN poms.receivable_plan_version p ON p.snapshot_id=s.id WHERE s.id=$1',[c.activated.snapshotId]);assert.equal(row.snapshot_amount,c.contractInclusive);assert.equal(row.plan_amount,c.contractInclusive);assert.equal(row.preparation_id,c.preparation.preparationId);assert.equal(row.plan_preparation_id,c.preparation.preparationId);frozen.push({contractId:c.contract.id,...row});}
 const pay=payload.payable(a);a.payable=await send(pay);const basePayment=payload.payment(a);
 await unchanged('mismatched-bound-payment',()=>call('POST',basePayment.path,{...basePayment.body,contractId:b.contract.id},422));
 const other=JSON.parse(fs.readFileSync(priv+'/smoke08-context.json','utf8'));await unchanged('cross-project-contract',()=>call('POST',basePayment.path,{...basePayment.body,payableRecordId:null,contractId:other.contract.id},404));
 const draft=await send(payload.draftContract({...ctx,tag:'multi22draft'}));await unchanged('draft-payment',()=>call('POST',basePayment.path,{...basePayment.body,payableRecordId:null,contractId:draft.id},422));
 const nullable=await call('POST',basePayment.path,{...basePayment.body,contractId:null});assert.equal(nullable.contractId,a.contract.id);a.payment=nullable;
 await unchanged('payable-same-value',()=>call('PATCH','/api/payable-records/'+a.payable.id,{vendorName:a.payable.vendorName,expectedVersion:a.payable.rowVersion}));
 await call('POST','/api/payment-records/'+a.payment.id+':confirm',{expectedVersion:a.payment.rowVersion},200);
 const paid=await call('GET','/api/payable-records/'+a.payable.id);assert.equal(paid.settledAmountExcludingTax,'10000.00');
 await unchanged('duplicate-payment-confirm',()=>call('POST','/api/payment-records/'+a.payment.id+':confirm',{expectedVersion:a.payment.rowVersion},409));
 const after=await snapshot(db,'b22-end');writePrivate(priv+'/business22-context.json',{...ctx,a,b,draft});
 fs.writeFileSync(out+'/receipt22.json',JSON.stringify({kind:'R4-actual-independent-multi-contract-preparation-review-activation-plan-and-finance',steps,groups,before,after,frozen,projectQuote:'113000.00',independentContractAmounts:frozen.map(x=>x.snapshot_amount),noProjectQuoteBudget:true,actualSourceReplacement:true,legacyBindingFixture:'owned negative fixture only; no legacy positive producer claim',completed:true,finalAcceptance:false},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({completed:true,requests:steps.length,unchangedGroups:groups.length,independentContracts:2,sourceReplacement:true,fullCapacitySnapshotAndPlan:true}));
}catch(error){writePrivate(priv+'/business22-error.log',error.stack||String(error));fs.writeFileSync(out+'/failed22.json',JSON.stringify({phase,steps,groups,completed:false,errorName:error.name},null,2)+'\n',{flag:'wx'});console.error(JSON.stringify({completed:false,phase,requests:steps.length,errorName:error.name}));process.exitCode=1;}finally{await db.end();}
