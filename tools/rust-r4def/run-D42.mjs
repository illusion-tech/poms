import fs from'node:fs';import assert from'node:assert/strict';import{createApiHarness}from'./api-harness32.mjs';import{createHandoverUpstream32}from'./E/upstream32/request-drivers32.mjs';
import{createFaultHarness43}from'./fault-core43.mjs';
const h=createApiHarness(),actors=JSON.parse(fs.readFileSync(h.priv+'/actors33.json')).actors;
for(const key of['writer','full','personA'])await h.login(actors[key]);
const upstream=JSON.parse(fs.readFileSync(h.priv+'/continuation40.json'));
const duty=(roleKey,responsibilitySummary)=>({roleKey,responsibilitySummary});
const context={project:upstream.context.project,operator:h.actor('writer'),executionOwnerUserId:h.actor('writer').id,financeConfirmationRequired:false,receiptJudgmentMode:'contract-separate',participants:[{userId:h.actor('full').id,responsibilities:[duty('sales-owner','移交客户合同与销售事实'),duty('business-admin','核对商务边界和合同材料')]},{userId:h.actor('writer').id,responsibilities:[duty('execution-owner','承接此冻结版本的交付职责')]},{userId:h.actor('personA').id,responsibilities:[duty('technical-support','核对冻结范围边界与技术风险')]}]};
const fault=await createFaultHarness43(h,'43');let selfProbed=false;
const request=async(op,id,body,actor,meta)=>{
 const suffix=op.replace('ProjectHandoverController_','');let tables=[];
 if(suffix==='prepareProjectHandover')tables=['project_handover_basis_snapshot','project_handover_contract_basis','project_handover_basis_item','approval_summary_snapshot','approval_summary_field_projection','confirmation_record','confirmation_participant','todo_item','project_handover','project_handover_participant_role','project_handover_summary_payload','audit_log'];
 if(suffix==='confirmProjectHandoverParticipant'&&!selfProbed){tables=['confirmation_participant','confirmation_record','todo_item','audit_log'];selfProbed=true;}
 if(suffix==='confirmProjectHandover')tables=['project_handover','project_receipt_judgment_freeze','audit_log'];
 if(tables.length)await fault.probe(op,id,body,actor,tables);
 const r=await h.request(op,id,body,actor,meta);if(tables.length)await fault.recordRetry(op,r);return r;
};
const suite=createHandoverUpstream32(context,{request,resolveParticipant:id=>{const key=Object.keys(actors).find(k=>h.actor(k).id===id);assert(key);return h.actor(key)}});
fs.writeFileSync(h.out+'/D42-before.json',JSON.stringify({context,manifest:suite.manifest()},null,2)+'\n',{flag:'wx'});
const result=await suite.run();fs.writeFileSync(h.out+'/D42-result.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});if(result.completed)fs.writeFileSync(h.priv+'/D42.json',JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({completed:result.completed,stages:result.stages,error:result.error??null}));if(!result.completed)process.exitCode=1;
await fault.close();
