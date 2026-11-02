// Root observes exact legal decimal totals; binary64 parity is not a business oracle.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {openAcceptanceContext} from './acceptance-context01.mjs';
import {buildFoundationCostRequest,buildFoundationPricingRequest} from '../../tmp/rust-r3hijk/foundation-business-regression01.mjs';
const [tag,phase,runId]=process.argv.slice(2),ctx=await openAcceptanceContext({backend:'rust',tag,phase,runId});
ctx.addSource('tools/rust-r3hijk/money-business-probe02.mjs');ctx.addSource('tmp/rust-r3hijk/foundation-business-regression01.mjs');
let completed=false,error=null;
try{
 await ctx.case('exact-large-cost-and-quote-decimal-contract',async()=>{
  const project=await ctx.produceProject('exact-money-'+phase),ids={marker:'HIJK-money-'+phase,times:{nextFollowUpAt:'2027-02-01T00:00:00.000Z'}};
  const input=buildFoundationCostRequest(ids),amount='9007199254740993.01';
  input.costItems=[{...input.costItems[0],amountExcludingTax:amount,taxCostAmount:'0.00',amountIncludingTax:amount,quantity:'1',unitPrice:'1.0000'}];
  const created=await ctx.step('money.cost','POST','/api/projects/'+project.id+'/technical-cost-packages',{json:input},201);
  const parent=await ctx.row('project_technical_cost_package',created.body.id),children=await ctx.rows('project_technical_cost_item',{package_id:created.body.id});
  const quote=buildFoundationPricingRequest(created.body.id,null,ids);
  quote.quoteAmountTaxExclusive=amount;quote.quoteAmountTaxInclusive=amount;quote.grossMarginRate='0.0000';quote.grossMarginBand='low';
  const priced=await ctx.step('money.quote','POST','/api/projects/'+project.id+'/pricing-margin-reviews',{json:quote});
  const pricing=priced.status===201?await ctx.row('project_pricing_margin_review',priced.body.id):null;
  const exact=parent.total_estimated_amount_excluding_tax===amount&&parent.total_estimated_amount_including_tax===amount&&children.length===1&&children[0].amount_excluding_tax===amount&&priced.status===201&&pricing.quote_amount_tax_exclusive===amount&&pricing.quote_amount_tax_inclusive===amount;
  const observed={project,amount,input,created,parent,children,quote,priced,pricing,exactBusinessMoney:exact};
  await ctx.observe('money-actual-before-business-assert',observed);
  assert(exact,'Exact cost totals and quote decimals must preserve the legal input cents');
  return observed;
 });completed=true;
}catch(e){error={name:e.name,message:e.message.split('\n')[0]};fs.writeFileSync(ctx.directory+'/original-error.json',JSON.stringify({name:e.name,message:e.message,stack:e.stack},null,2)+'\n',{flag:'wx',mode:0o600});process.exitCode=1;}finally{await ctx.finish(completed,error)}
