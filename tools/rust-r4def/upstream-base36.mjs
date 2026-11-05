import fs from 'node:fs';import assert from 'node:assert/strict';import{randomUUID}from'node:crypto';
import{createApiHarness}from'./api-harness32.mjs';import * as p from '../rust-r4abc/upstream-payloads01.mjs';
const edition=process.argv[2]??'36';assert(/^\d+$/.test(edition));
const h=createApiHarness(),file=h.priv+'/upstream'+edition+'.json';assert(!fs.existsSync(file));
const actor=JSON.parse(fs.readFileSync(h.priv+'/actors33.json')).actors.full;await h.login(actor);
const context={tag:'def'+edition,caseId:'def'+edition,runId:randomUUID(),actorId:h.actor('full').id,plannedDate:'2026-12-04',instant:'2026-11-04T01:00:00.000Z',expectedInstanceId:JSON.parse(fs.readFileSync(h.priv+'/../identity.json')).marker};
const save=()=>fs.writeFileSync(file,JSON.stringify(context,null,2)+'\n',{mode:0o600});save();
async function produce(request,key){const r=await h.request(request.operationId,null,request.body,'full',{method:request.method,path:request.path});assert.equal(r.status,201,`${request.operationId}: ${r.receiptId}`);context[key]=r.body?.data??r.body;assert(context[key].id,`${key} has no actual ID`);save();}
try{
 await produce(p.customer(context),'customer');
 await produce(p.project(context),'project');
 const other=await h.request('ProjectController_create',null,p.project({...context,tag:'def'+edition+'other'}).body,'full');assert.equal(other.status,201,other.receiptId);context.otherProject=other.body;save();
 const cost=p.cost(context);cost.body.scopeItems=[{scopeType:'in-scope',label:'V1冻结交付范围',description:'交付核心接口和操作培训；范围以此版本为准。',sortOrder:0},{scopeType:'out-of-scope',label:'V1边界',description:'不包含第三方硬件采购。',sortOrder:1}];
 cost.body.riskItems=[{riskCategory:'integration',riskLevel:'R2',riskDescription:'V1客户联调窗口风险',impactScope:'接口验收时间',mitigationPlan:'提前安排联调窗口',ownerRole:'technical-support',riskStatus:'mitigating',blocksNextStage:false,sortOrder:0}];
 const r=await h.request(cost.operationId,context.project.id,cost.body,'full',{method:cost.method,path:cost.path});assert.equal(r.status,201,r.receiptId);context.cost=r.body;save();
 const bid=p.bid(context);const b=await h.request(bid.operationId,context.project.id,bid.body,'full',{method:bid.method,path:bid.path});assert.equal(b.status,201,b.receiptId);context.bid=b.body;save();
 await produce(p.draftContract(context),'contract');
 const second=await h.request('ContractController_create',null,p.draftContract({...context,tag:'def'+edition+'second'}).body,'full');assert.equal(second.status,201,second.receiptId);context.secondContract=second.body;save();
 const baseline=p.baseline(context);baseline.body.contractTerms.push(p.contractTerms({...context,contract:context.secondContract}));await produce(baseline,'baseline');
 const summary=p.summaryRequest(context);fs.writeFileSync(h.priv+'/summary'+edition+'-request.json',JSON.stringify(summary,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.writeFileSync(h.out+'/upstream-base'+edition+'.json',JSON.stringify({kind:'actual-R3-and-contract-source-API',context,summaryRequestPrepared:true,summaryNotYetExecuted:true},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({customer:context.customer.id,project:context.project.id,contracts:[context.contract.id,context.secondContract.id],cost:context.cost.id,bid:context.bid.id,baseline:context.baseline.id,summaryNotYetExecuted:true}));
}catch(e){fs.writeFileSync(h.priv+'/upstream'+edition+'-error.log',e.stack??String(e),{mode:0o600});console.error(JSON.stringify({phase:'upstream-base'+edition,errorName:e.name,message:e.message}));process.exitCode=1;}
