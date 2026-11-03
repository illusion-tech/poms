import fs from 'node:fs';
import assert from 'node:assert/strict';
import { ApiClient, connect, snapshot, changedTables, writePrivate, priv, win } from './fixture-core04.mjs';
const out=win+'/tmp/rust-r4abc/root/capacity-money13';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const api=new ApiClient('creator'),db=await connect(),ctx=JSON.parse(fs.readFileSync(priv+'/smoke08-context.json','utf8')),cases=[];let phase='login',counter=0;
const max='9999999999999999.99';
async function call(method,path,body,status=201){phase=method+' '+path;const r=await api.request(method,path,body,'max13-'+(++counter));cases.push(r.public);assert.equal(r.status,status);return r.value;}
try{
 await api.login('max13-login');const before=await snapshot(db,'max13-before');
 const contract=await call('POST','/api/contracts',{projectId:ctx.project.id,signedAmount:max,currencyCode:'CNY',customerContractNo:'R4-max13'});
 assert.equal(contract.signedAmountProjection.value,max,'Contract must retain every cent beyond IEEE safe integer');
 const contractRead=await call('GET','/api/contracts/'+contract.id,undefined,200);assert.equal(contractRead.signedAmountProjection.value,max);
 const preNoop=await snapshot(db,'max13-noop-before');await call('PATCH','/api/contracts/'+contract.id,{signedAmount:max,expectedVersion:contract.rowVersion},200);const postNoop=await snapshot(db,'max13-noop-after');assert.deepEqual(changedTables(preNoop,postNoop),[]);
 const receipt=await call('POST','/api/contracts/'+ctx.contract.id+'/receipt-records',{receiptAmount:max,receiptDate:ctx.instant,sourceType:'manual'});assert.equal(receipt.receiptAmount,max);
 const invoice=await call('POST','/api/projects/'+ctx.project.id+'/invoice-records',{contractId:ctx.contract.id,invoiceType:'output',invoiceNumber:'R4-max13',invoiceAmount:max,invoiceDate:'2026-11-10'});assert.equal(invoice.invoiceAmount,max);
 const tuple={amountExcludingTax:max,taxAmount:'0.00',amountIncludingTax:max};
 const payable=await call('POST','/api/projects/'+ctx.project.id+'/payable-records',{vendorName:'R4-max13',costCategory:'implementation',payableDescription:'全容量实际应付',expectedPaymentDate:'2026-11-10',currency:'CNY',...tuple});assert.equal(payable.amountExcludingTax,max);assert.equal(payable.contractId,null);
 const payment=await call('POST','/api/projects/'+ctx.project.id+'/payment-records',{payableRecordId:payable.id,paymentDate:ctx.instant,costCategory:'implementation',sourceType:'manual',currency:'CNY',...tuple});assert.equal(payment.amountIncludingTax,max);assert.equal(payment.contractId,null);
 await call('POST','/api/payment-records/'+payment.id+':confirm',{expectedVersion:payment.rowVersion},200);
 const settled=await call('GET','/api/payable-records/'+payable.id,undefined,200);assert.equal(settled.settledAmountExcludingTax,max);
 const checks=[];for(const[table,id,column]of[['contract',contract.id,'signed_amount'],['receipt_record',receipt.id,'receipt_amount'],['invoice_record',invoice.id,'invoice_amount'],['payable_record',payable.id,'amount_excluding_tax'],['payment_record',payment.id,'amount_including_tax']]){
  const{rows:[row]}=await db.query('SELECT '+column+'::text value FROM poms.'+table+' WHERE id=$1',[id]);assert.equal(row.value,max);checks.push({table,id,column,value:row.value});
 }
 const after=await snapshot(db,'max13-after');writePrivate(priv+'/max13-context.json',{contract,receipt,invoice,payable,payment});
 fs.writeFileSync(out+'/receipt13.json',JSON.stringify({kind:'actual-numeric18-2-full-capacity-and-project-level-payment',cases,checks,noopChangedTables:[],before,after,completed:true,finalAcceptance:false},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({completed:true,requests:cases.length,fullCapacityColumns:checks.length,projectLevelPaymentConfirmed:true}));
}catch(error){writePrivate(priv+'/max13-error.log',error.stack||String(error));fs.writeFileSync(out+'/failed13.json',JSON.stringify({phase,cases,completed:false,errorName:error.name},null,2)+'\n',{flag:'wx'});console.error(JSON.stringify({completed:false,phase,cases:cases.length,errorName:error.name}));process.exitCode=1;}finally{await db.end();}
