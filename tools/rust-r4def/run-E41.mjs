import fs from'node:fs';import assert from'node:assert/strict';
import{createApiHarness}from'./api-harness32.mjs';import{connect}from'./db33.mjs';import{createEAcceptanceSuite}from'./E/api-acceptance-vectors21.mjs';
const h=createApiHarness(),c=await connect(),actors=JSON.parse(fs.readFileSync(h.priv+'/actors33.json')).actors;
for(const key of['full','financeOnly','operatingOnly','laborOnly'])await h.login(actors[key]);
const upstream=JSON.parse(fs.readFileSync(h.priv+'/continuation40.json'));
const dictionary=await h.request('DictionaryController_list',null,null,'full',{query:{domain:'expense-category',status:'active'}});assert.equal(dictionary.status,200);
const items=dictionary.body.items??dictionary.body;assert(Array.isArray(items));const category=items.find(x=>x.domain==='expense-category'&&x.status==='active');assert(category?.code);
const assessment=(periodStart,periodEnd,subject)=>({periodStart,periodEnd,attributedStage:'execution',reason:'本隔离验收对'+subject+'的明确责任判断，不从当前项目阶段推断历史。',evidenceSummary:'验收责任人审核指定日期与完整期间，登记归属执行阶段；仅验证人工证据链，不作为真实生产业务事实。'});
const context={tag:'e41',project:upstream.context.project,activeContract:upstream.activeContract,otherProject:upstream.context.otherProject,expenseCategory:category.code,costCategory:'implementation',actors:{full:h.actor('full'),financeOnly:h.actor('financeOnly'),operatingOnly:h.actor('operatingOnly'),laborOnly:h.actor('laborOnly'),auditFull:h.actor('full'),auditFinanceOnly:h.actor('financeOnly')},persons:{partialCoverage:h.actor('personA').id,priorityChange:h.actor('personB').id},assessments:{payable:assessment('2026-11-04','2026-11-04','采购事实'),historicalLabor:assessment('2026-10-01','2026-10-03','历史完整人工期间'),priorityChange:assessment('2026-09-01','2026-09-30','优先级变化人工完整期间')}};
const suite=createEAcceptanceSuite(context,{request:h.request,observeEvidence:async(id,actor,meta)=>{
 assert(/^[a-f0-9-]{36}$/.test(id));await c.query('BEGIN READ ONLY');let row;try{const r=await c.query('SELECT * FROM poms.cost_governance_evidence WHERE id=$1',[id]);assert.equal(r.rows.length,1);row=r.rows[0];await c.query('COMMIT')}catch(e){await c.query('ROLLBACK');throw e}
 const file='evidence41-'+id+'.json';assert(!fs.existsSync(h.out+'/'+file));fs.writeFileSync(h.out+'/'+file,JSON.stringify({kind:'actual-read-only-PG-witness',actorId:actor.id,meta,body:row},null,2)+'\n',{flag:'wx'});return{body:row,receiptId:'tmp/rust-r4def/root/api32/'+file};
}});
fs.writeFileSync(h.out+'/E41-before.json',JSON.stringify({context,manifest:suite.manifest()},null,2)+'\n',{flag:'wx'});
try{const result=await suite.run();fs.writeFileSync(h.out+'/E41-result.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({counts:result.counts,cases:result.cases.map(x=>({id:x.id,status:x.status,reason:x.reason,requests:x.requests?.length}))}));if(result.counts.failed||result.counts.needsEvidence)process.exitCode=1;}finally{await c.end()}
