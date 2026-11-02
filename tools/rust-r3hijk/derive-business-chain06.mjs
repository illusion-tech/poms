// Root derives a new business-policy run; historical Native-parity sources stay intact.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pin } from './source-guard.mjs';
const from = 'tools/rust-r3hijk/acceptance-chain05.mjs';
const to = 'tools/rust-r3hijk/acceptance-chain06.mjs';
assert(!fs.existsSync(to));
let text = fs.readFileSync(from, 'utf8');
const start = text.indexOf(" await ctx.case('bulk-override-competing-approvals'");
const end = text.indexOf(' completed=true;', start);
assert(start > 0 && end > start);
text = text.slice(0, start) + text.slice(end);
text = text.replaceAll('acceptance-chain05.mjs', 'acceptance-chain06.mjs');
const needle = "  const before={lead:await ctx.row('lead',leadId),links:sourceLinks,snapshots:await ctx.rows('lead_score_snapshot',{lead_id:leadId})},converted=";
assert(text.includes(needle));
const insert = `  // Required conversion writes share one business transaction; reservations remain independent.
  async function graph(){return{lead:await ctx.row('lead',leadId),projects:await ctx.rows('project',{source_lead_id:leadId}),links:await ctx.rows('attachment_link'),snapshots:await ctx.rows('lead_score_snapshot',{lead_id:leadId}),auditIds:(await ctx.rows('audit_log',{operator_id:ctx.ids.adminUserId})).map(x=>x.id)}}
  const conversionFaults=[];
  for(const deniedTable of ['attachment_link','audit_log','lead_score_snapshot']){
   const businessBefore=await graph(),counterBefore=await ctx.counter('project');
   const failed=await ctx.withDenied(deniedTable,'INSERT',()=>ctx.step('chain.atomic-convert.'+deniedTable,'POST','/api/leads/'+leadId+':convertToProject',{json:ctx.build.convertLeadRequest({projectName:'业务原子转换故障 '+deniedTable})},500));
   const businessAfter=await graph(),counterAfter=await ctx.counter('project');
   assert.deepEqual(businessAfter,businessBefore);
   conversionFaults.push({deniedTable,businessBefore,failed,businessAfter,counterBefore,counterAfter,wholeBusinessRollback:true,independentReservationObserved:true});
  }
  await ctx.observe('real-local-upload-conversion-required-write-faults',{conversionFaults});
`;
text = text.replace(needle, insert + needle);
fs.writeFileSync(to, text, { flag: 'wx' });
console.log(JSON.stringify({ source: pin(from), derivative: pin(to), historicalSourceUnchanged: true, weakBulkExpectationRemoved: true, requiredConversionFaults: 3 }));
