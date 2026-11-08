// FS-only derivation of a new external inventory. The old helper is unmodified.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{fileURLToPath}from'node:url';import{sha219}from'./facts219.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../../../../..');
const source=root+'/tools/rust-r4ghi/business/shared-source-inventory58.mjs',before=fs.readFileSync(source),text=before.toString();
const helpers=text.slice(text.indexOf('const F='),text.indexOf('export function deriveSharedFacts58'));
const fn=text.slice(text.indexOf('export function sharedWriteInventory58'));
let body=fn.slice(fn.indexOf(" add('F-basis-evidence'"));
const old=" if(f.branch==='stage')audit('F-stage-audit','CostStageAttributionSnapshot',relation('target_id','cost_stage_attribution_snapshot','id',newStage),f.sourceProjectId);else audit('F-tax-audit','AccountingTaxTreatmentSnapshot',relation('target_id','accounting_tax_treatment_snapshot','id',newTax),f.sourceProjectId);for(const project of f.projects)";
assert.equal(body.split(old).length,2);body=body.replace(old,' for(const project of f.projects)');
const inherited="const inherited=[...(f.branch==='stage'?[{projectId:f.sourceProjectId,oldDecisionId:f.sourceDecisionId,headEvent:'UPDATE'}]:[]),...f.results.map(x=>({...x,headEvent:'INSERT'}))]";
assert.equal(body.split(inherited).length,2);body=body.replace(inherited,"const inherited=f.results.map(x=>({...x,headEvent:'INSERT'}))").replaceAll("'SHARED-GH-command-receipt'","'A219-command-receipt'");
const out="// New explicit whole-allocation mixed live/period inventory219. No old writer/kind is invoked.\nimport assert from 'node:assert/strict';import {C219} from './facts219.mjs';\n"+helpers+"export function inventory219(f){\n assert.equal(f.version,219);assert.equal(f.branch,'explicit-allocation-mixed-period');assert(f.targets.some(t=>t.periodEndSnapshotRef));assert(f.targets.some(t=>!t.periodEndSnapshotRef));\n const operationId=C219.operation,entries=[];const add=(key,table,event,match,source,options={})=>entries.push({key,table,event,match,source,expectedRows:1,...options});\n const newBasis=eq('supersedes_id',f.basisId);\n"+body;
fs.writeFileSync(dir+'/inventory219.mjs',out,{flag:'wx'});
fs.writeFileSync(dir+'/inventory-origin219.json',JSON.stringify({kind:'FS-derived-new-external-inventory219',source:{file:'tools/rust-r4ghi/business/shared-source-inventory58.mjs',rawBytesSha256:sha219(before)},result:{file:'inventory219.mjs',rawBytesSha256:sha219(out)},oldHelperChanged:false,oldLiveOnlyKindUsed:false,actualEffectsExecuted:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({inventorySHA256:sha219(out),oldHelperUnchanged:sha219(fs.readFileSync(source))===sha219(before),actualEffectsExecuted:false}));
