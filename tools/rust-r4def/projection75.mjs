// Root-only actual sensitive GET fail-closed and same-query retry.
import fs from 'node:fs';import assert from 'node:assert/strict';
import{createApiHarness}from'./api-harness32.mjs';import{createFaultHarness47}from'./fault-core47.mjs';
const h=createApiHarness(),context=JSON.parse(fs.readFileSync(h.out+'/F60-before.json')).context;
const actors=JSON.parse(fs.readFileSync(h.priv+'/actors33.json')).actors;await h.login(actors.financeOnly);
const fault=await createFaultHarness47(h,'75'),op='ProjectCostController_listProjectActualCostRecords';
try {
 await fault.probe(op,context.project.id,null,h.actor('financeOnly'),[{table:'security_event',event:'INSERT'}]);
 const retried=await h.request(op,context.project.id,null,h.actor('financeOnly'));assert.equal(retried.status,200);await fault.recordRetry(op,retried);
 const failures=fault.results.map(r=>JSON.parse(fs.readFileSync(h.win+'/'+r.receiptId)));for(const r of failures){assert.equal(r.status,500);assert(!Object.hasOwn(r.responseBody??{},'items'),'Failure must not return partially projected rows');}
 const body=retried.body?.data??retried.body,rows=body.items??body;assert(Array.isArray(rows)&&rows.length>0);
 for(const row of rows){assert.equal(row.amountIncludingTax,null);assert.equal(row.amountExcludingTax,null);assert.equal(row.taxAmount,null);}
 fs.writeFileSync(h.out+'/projection75.json',JSON.stringify({kind:'actual-projection-only-GET-required-security-fault',projectId:context.project.id,faults:fault.results,retryReceipt:retried.receiptId,rows:rows.length,allLegacyRawMoneyNull:true,failureReturnedNoRows:true,transactionRollback120:true},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({faults:fault.results.length,retry:retried.status,rows:rows.length,rawMoneyNull:true}));
} finally {await fault.close();}
