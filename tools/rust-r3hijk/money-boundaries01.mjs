// Root checks exact cents, actual PostgreSQL limits and rejected-write terminal state.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {openAcceptanceContext} from './acceptance-context01.mjs';
import {buildFoundationCostRequest,buildFoundationPricingRequest} from '../../tmp/rust-r3hijk/foundation-business-regression01.mjs';
const [tag,phase,runId]=process.argv.slice(2),ctx=await openAcceptanceContext({backend:'rust',tag,phase,runId});
ctx.addSource('tools/rust-r3hijk/money-boundaries01.mjs');ctx.addSource('tmp/rust-r3hijk/foundation-business-regression01.mjs');
let completed=false,error=null,project,currentCost;
const marker='HIJK-decimal-'+phase,ids={marker,times:{nextFollowUpAt:'2027-02-01T00:00:00.000Z'}},max='9999999999999999.99',large='9007199254740993.01';
const tables=['project','project_technical_cost_package','project_technical_cost_item','project_technical_risk_item','project_technical_scope_item','project_pricing_margin_review','project_pricing_margin_condition_item'];
async function snapshot(){const value={};for(const table of tables)value[table]=(await ctx.db.query('select to_jsonb(t)::text raw from poms.'+table+' t order by id')).rows.map(x=>x.raw);return value;}
function costInput(amounts,extra={}){const request=buildFoundationCostRequest(ids);request.costItems=amounts.map((amount,index)=>({...request.costItems[0],amountExcludingTax:amount,taxCostAmount:'0.00',amountIncludingTax:amount,quantity:'1.0000',unitPrice:'1.0000',sortOrder:index,...extra}));return request;}
async function costCase(name,input,expected,total){return await ctx.case(name,async()=>{
 const before=expected===400?await snapshot():null,response=await ctx.step(name,'POST','/api/projects/'+project.id+'/technical-cost-packages',{json:input},expected),after=expected===400?await snapshot():null;
 if(expected===400){assert.deepEqual(after,before);return{input,response,before,after,rejectedWithoutBusinessWrites:true};}
 currentCost=response.body.id;
 const actual=(await ctx.db.query('select total_estimated_amount_excluding_tax::text excluding,total_tax_cost_amount::text tax,total_estimated_amount_including_tax::text including from poms.project_technical_cost_package where id=$1',[currentCost])).rows[0];
 const sums=(await ctx.db.query('select sum(amount_excluding_tax)::text excluding,sum(tax_cost_amount)::text tax,sum(amount_including_tax)::text including from poms.project_technical_cost_item where package_id=$1',[currentCost])).rows[0];
 const children=(await ctx.db.query('select id,amount_excluding_tax::text excluding,tax_cost_amount::text tax,amount_including_tax::text including,quantity::text,unit_price::text from poms.project_technical_cost_item where package_id=$1 order by sort_order,id',[currentCost])).rows;
 assert.deepEqual(actual,{excluding:total,tax:'0.00',including:total});assert.deepEqual(sums,actual);
 assert.equal(response.body.totalEstimatedAmountExcludingTax,total);assert.equal(response.body.totalEstimatedAmountIncludingTax,total);
 for(let i=0;i<input.costItems.length;i++)assert.equal(children[i].excluding,input.costItems[i].amountExcludingTax);
 if(input.costItems[0].quantity==='99999999999999.9999')assert.equal(children[0].quantity,'99999999999999.9999');
 return{input,response,actual,sums,children,exactParentChildAndSQLSum:true};
});}
async function quoteCase(name,patch,expected){return await ctx.case(name,async()=>{
 const input={...buildFoundationPricingRequest(currentCost,null,ids),quoteVersion:name,quoteAmountTaxExclusive:large,quoteAmountTaxInclusive:large,grossMarginRate:'-0.12345678',...patch},before=expected===400?await snapshot():null,response=await ctx.step(name,'POST','/api/projects/'+project.id+'/pricing-margin-reviews',{json:input},expected),after=expected===400?await snapshot():null;
 if(expected===400){assert.deepEqual(after,before);return{input,response,before,after,rejectedWithoutBusinessWrites:true};}
 const actual=(await ctx.db.query('select quote_amount_tax_exclusive::text excluding,quote_amount_tax_inclusive::text including,tax_rate::text,gross_margin_rate::text from poms.project_pricing_margin_review where id=$1',[response.body.id])).rows[0];
 assert.equal(actual.excluding,input.quoteAmountTaxExclusive);assert.equal(actual.including,input.quoteAmountTaxInclusive);assert.equal(actual.gross_margin_rate,input.grossMarginRate);assert.equal(response.body.quoteAmountTaxExclusive,input.quoteAmountTaxExclusive);
 return{input,response,actual,exactQuoteAndSignedMarginPreserved:true};
});}
try{
 await ctx.case('money-real-project',async()=>{project=await ctx.produceProject('decimal-boundaries-'+phase);return{project,realHTTPProducer:true};});
 await costCase('money-cost-above-binary64',costInput([large]),201,large);
 await costCase('money-cost-maximum-and-scale4',costInput([max],{quantity:'99999999999999.9999',unitPrice:'99999999999999.9999'}),201,max);
 await costCase('money-cost-exact-cent-addition',costInput(['0.10','0.20']),201,'0.30');
 await costCase('money-cost-scale4-smallest',costInput(['0.01'],{quantity:'0.0001',unitPrice:'0.0001'}),201,'0.01');
 await costCase('money-cost-individual-overflow',costInput(['10000000000000000.00']),400);
 await costCase('money-cost-sum-overflow',costInput([max,'0.01']),400);
 await costCase('money-cost-equation-cent-difference',costInput([large],{amountIncludingTax:'9007199254740993.02'}),400);
 await costCase('money-cost-quantity-overflow',costInput(['1.00'],{quantity:'100000000000000.0000'}),400);
 await costCase('money-cost-unit-price-overflow',costInput(['1.00'],{unitPrice:'100000000000000.0000'}),400);
 await costCase('money-cost-quantity-public-scale',costInput(['1.00'],{quantity:'0.12345'}),400);
 await quoteCase('money-quote-large-negative-margin',{},201);
 await quoteCase('money-quote-maximum',{quoteAmountTaxExclusive:max,quoteAmountTaxInclusive:max,grossMarginRate:'-9999999999.99999999',taxRate:'9999999999.99999999'},201);
 await quoteCase('money-quote-inclusive-less-by-cent',{quoteAmountTaxInclusive:'9007199254740993.00'},400);
 await quoteCase('money-quote-overflow',{quoteAmountTaxExclusive:'10000000000000000.00',quoteAmountTaxInclusive:'10000000000000000.00'},400);
 await quoteCase('money-quote-tax-rate-overflow',{taxRate:'10000000000.00000000'},400);
 await quoteCase('money-quote-signed-margin-overflow',{grossMarginRate:'-10000000000.00000000'},400);
 completed=true;
}catch(e){error={name:e.name,message:e.message.split('\n')[0]};fs.writeFileSync(ctx.directory+'/original-error.json',JSON.stringify({name:e.name,message:e.message,stack:e.stack},null,2)+'\n',{flag:'wx',mode:0o600});process.exitCode=1;}finally{await ctx.finish(completed,error)}
