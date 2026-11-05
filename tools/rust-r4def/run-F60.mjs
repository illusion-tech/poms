import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{createApiHarness}from'./api-harness32.mjs';import{createFaultHarness47}from'./fault-core47.mjs';import{createFAcceptanceSuite44}from'./F/acceptance44/request-suite60.mjs';
const h=createApiHarness(),runtime=JSON.parse(fs.readFileSync(h.priv+'/rust-api58-process.json')),actors=JSON.parse(fs.readFileSync(h.priv+'/actors33.json')).actors;
for(const key of['full','financeOnly','operatingOnly','laborOnly'])await h.login(actors[key]);
const upstream=JSON.parse(fs.readFileSync(h.priv+'/continuation48.json')),context=JSON.parse(fs.readFileSync(h.win+'/tools/rust-r4def/F/acceptance44/public-context44.example.json')).context;
context.project={id:upstream.context.project.id};context.otherProject={id:upstream.context.otherProject.id};context.activeContract=upstream.activeContract;context.tag='f60';context.taxReason='本隔离验收财务责任人核对真实0.01税额来源，先登记待定后明确可抵扣判定；保留原成本金额及不纳入经营状态，仅验证正式命令与证据链。';
for(const key of['full','financeOnly','operatingOnly','laborOnly'])context.actors[key]=h.actor(key);context.actors.auditFull=h.actor('full');context.actors.auditFinanceOnly=h.actor('financeOnly');
const sha=b=>createHash('sha256').update(b).digest('hex'),delivery=JSON.parse(fs.readFileSync(h.win+'/tools/rust-r4def/F/delivery46.json'));for(const p of delivery.productFiles)assert.equal(sha(fs.readFileSync(h.root+'/'+p.file)),p.rawBytesSha256);assert.equal(runtime.binarySha256,sha(fs.readFileSync('/home/wangzishi/.cache/poms-r4def-target-ROOT/debug/poms-api-rust')));
const groups={
 ProjectCostController_createExpenseRecord:['expense_record','audit_log'],
 ProjectCostController_confirmExpenseRecord:['expense_record','audit_log'],
 ProjectCostController_createProjectActualCostRecord:['project_actual_cost_record','audit_log','business_number_sequence'],
 ProjectCostController_publishInternalCostRateVersion:['internal_cost_rate_version','audit_log'],
 ProjectCostController_confirmCostStageAttribution:['cost_governance_evidence','cost_stage_attribution_snapshot','project_actual_cost_record','audit_log',{table:'audit_log',event:'INSERT',deferred:true}],
 ProjectCostController_reclassifyCostStageAttribution:['cost_governance_evidence',{table:'cost_stage_attribution_snapshot',event:'UPDATE'},{table:'cost_stage_attribution_snapshot',event:'INSERT'},'project_actual_cost_record','audit_log'],
 ProjectCostController_confirmAccountingTaxTreatment:['cost_governance_evidence','accounting_tax_treatment_snapshot','audit_log'],
 ProjectCostController_replaceAccountingTaxTreatment:['cost_governance_evidence',{table:'accounting_tax_treatment_snapshot',event:'UPDATE'},{table:'accounting_tax_treatment_snapshot',event:'INSERT'},'audit_log'],
 ProjectCostController_confirmSharedCostAllocationBasis:['cost_governance_evidence','shared_cost_allocation_basis','shared_cost_allocation_source_snapshot',{table:'shared_cost_allocation_result',event:'INSERT',nth:2},'audit_log',{table:'audit_log',event:'INSERT',deferred:true}],
 ProjectCostController_replaceSharedCostAllocationResult:['cost_governance_evidence',{table:'shared_cost_allocation_basis',event:'UPDATE'},{table:'shared_cost_allocation_basis',event:'INSERT'},{table:'shared_cost_allocation_source_snapshot',event:'UPDATE'},{table:'shared_cost_allocation_source_snapshot',event:'INSERT'},{table:'shared_cost_allocation_result',event:'UPDATE'},{table:'shared_cost_allocation_result',event:'INSERT',nth:2},'audit_log',{table:'audit_log',event:'INSERT',deferred:true}],
};
const fault=await createFaultHarness47(h,'60'),probed=new Set();
const request=async(op,id,body,actor,meta)=>{const eligible=meta.expectedStatus<300&&groups[op]&&!probed.has(op)&&actor.key==='full';if(eligible){probed.add(op);await fault.probe(op,id,body,actor,groups[op]);}const r=await h.request(op,id,body,actor,meta);if(eligible)await fault.recordRetry(op,r);return r};
const suite=createFAcceptanceSuite44(context,{request});fs.writeFileSync(h.out+'/F60-before.json',JSON.stringify({context,runtime:{pid:runtime.pid,binarySha256:runtime.binarySha256},sourcePins:delivery.productFiles,manifest:suite.manifest()},null,2)+'\n',{flag:'wx'});
const result=await suite.run();fs.writeFileSync(h.out+'/F60-result.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});await fault.close();console.log(JSON.stringify({counts:result.counts,cases:result.cases.map(c=>({id:c.id,status:c.status,reason:c.reason})),faults:fault.results.length,f12:result.f12SuccessfulCoverage}));if(result.counts.failed||result.counts.needsContext||result.counts.notRun)process.exitCode=1;
