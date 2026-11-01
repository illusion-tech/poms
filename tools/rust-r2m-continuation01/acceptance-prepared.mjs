// Root-only actual direct-INSERT adapter for the selected source-prepared Todo
// facts. Importing opens no fixture/private/database. Never a sales producer.
import assert from 'node:assert/strict';
import {buildPreparedTodoFacts} from '../rust-r2l/l-todo-facts-source.mjs';
import {buildPreparedContractRows} from '../rust-r2l/prepared-contract-source.mjs';
import {randomUUID} from 'node:crypto';

export async function insertPreparedTodoSource({fixture:f,sourceReader,input,casePrefix='m3.todo',sourceCapId,retain}){
    assert(typeof retain==='function'&&/^[a-z][a-z0-9_.-]{1,60}$/.test(casePrefix));
    for(const file of['tools/rust-r2m-continuation01/acceptance-prepared.mjs','tools/rust-r2l/l-todo-facts-source.mjs','apps/poms-api/src/app/features/approval/approval.service.ts','apps/poms-api/src/app/features/sales-follow-up/sales-follow-up.service.ts','apps/poms-api/src/app/features/sales-follow-up/sales-follow-up.repository.ts'])sourceReader.read(file);
    assert.equal(input.runId,f.runId);assert.equal(input.actorId,f.actors.admin);assert.equal(input.assigneeId,f.actors.viewer);
    for(const[table,row]of[['customer',input.customer],['project',input.project]])assert(f.j.objects.some(item=>item.table===table&&item.id===row.id&&item.creationProof&&item.postcondition?.independentlyVisible),'Source fact anchors must already have independent creation proof');
    assert.equal(input.project.customer_id,input.customer.id,'Actual project/customer relation required');
    const plan=await buildPreparedTodoFacts(input);assert.equal(plan.rows.length,7);assert.deepEqual(plan.rows.map(item=>item.table),['lead','sales_follow_up_record','todo_item','sales_follow_up_record','todo_item','sales_follow_up_record','todo_item']);
    await retain({kind:'exact-prepared-original-seven-Todo-source-plan',record:{sourceCapId,plan,NativeProducerClaimed:false}});
    const base={actors:Object.values(f.actors),projects:[input.project.id],borrowedActors:[],ownedCustomerIds:[input.customer.id]};
    const leadCase=casePrefix+'.lead';f.defineCase(leadCase,{...base,ownedLeadIds:[]});
    const lead=await f.insert('lead',plan.rows[0].values,{caseId:leadCase});assert.equal(lead.id,input.ids.lead);
    // Only now may the reminders' explicit scope contain this proven Lead.
    const reminderCase=casePrefix+'.reminders';f.defineCase(reminderCase,{...base,ownedLeadIds:[lead.id]});
    const rows=[lead];for(const item of plan.rows.slice(1))rows.push(await f.insert(item.table,item.values,{caseId:reminderCase}));
    for(const item of plan.rows)assert(f.j.objects.some(actual=>actual.table===item.table&&actual.id===item.values.id&&actual.creationProof.kind==='direct-committed-insert'&&actual.postcondition?.independentlyVisible),'Every source row requires its own actual direct COMMIT/visibility proof');
    sourceReader.assertUnchanged();const receipt={kind:'actual-prepared-seven-Todo-source-facts',sourceCapId,runId:f.runId,leadCase,reminderCase,rows:rows.map(row=>({id:row.id})),preparedNotNativeGenerated:true,generatedSalesAdmission:false};
    await retain({kind:'actual-seven-Todo-direct-proof-receipt',record:receipt});return{plan,rows,receipt};
}

export async function prepareUiTodoSource({fixture:f,native,sourceReader,sourceCapId,retain}){
    for(const file of['tools/rust-r2m-continuation01/acceptance-prepared.mjs','tools/rust-r2l/prepared-contract-source.mjs','apps/poms-api/src/seeders/dev-seed-data.ts'])sourceReader.read(file);
    assert(native?.metadata,'Actual current Native scalar metadata required');
    const caseId='m.ui1.anchors',runId=f.runId,actorId=f.actors.admin,orgId=f.base.accounts.find(item=>item.account==='admin').orgId;
    f.defineCase(caseId,{actors:Object.values(f.actors),projects:[]});
    const projectId=await f.planProject(caseId),sourcePlan=buildPreparedContractRows({runId,actorId,orgId,customerId:randomUUID(),projectId,contractId:randomUUID(),metadata:native.metadata,numbers:{customerNo:'M-UI-CUST-'+runId,projectNo:'M-UI-P-'+runId,contractNo:'M-UI-UNUSED-'+runId}});
    await retain({kind:'UI1-exact-original-customer-project-source-plan',record:{sourceCapId,sourcePlan,selectedTables:['customer','project'],contractRowNotInserted:true,preparedNotNativeGenerated:true}});
    const customer=await f.insert('customer',sourcePlan.rows.find(item=>item.table==='customer').values,{caseId});
    const project=await f.insert('project',sourcePlan.rows.find(item=>item.table==='project').values,{caseId});
    const input={runId,actorId,orgId,customer,project,ids:{lead:randomUUID(),followups:Array.from({length:3},()=>randomUUID()),todos:Array.from({length:3},()=>randomUUID())},assigneeId:f.actors.viewer};
    const prepared=await insertPreparedTodoSource({fixture:f,sourceReader,input,casePrefix:'m.ui1.todos',sourceCapId,retain});
    return{customer,project,input,...prepared,authRole:'viewer',minimumTodoCount:3,preparedNotNativeGenerated:true,sourceCapId};
}
