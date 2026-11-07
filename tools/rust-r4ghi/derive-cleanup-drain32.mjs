import fs from 'node:fs';
import assert from 'node:assert/strict';
let source=fs.readFileSync('tools/rust-r4ghi/sandbox-cleanup-drain31.mjs','utf8');
function replace(a,b){assert.equal(source.split(a).length,2,a);source=source.replace(a,()=>b);}
replace("import {sha} from './business/pure.mjs';","import {sha} from './business/pure.mjs';\nimport {assertRecorded} from './business/ledger.mjs';");
replace("const ctx=createContext({epoch:'g2-business08',run:'main01'}),lock=ctx.priv+'/driver.lock';", "const epoch=process.argv[2];assert(['g2-business09','g2-business10'].includes(epoch));\nconst ctx=createContext({epoch,run:'main01'}),lock=ctx.priv+'/driver.lock';");
replace("const label=ctx.next('cleanup-drain31');", "const label=ctx.next('cleanup-drain32');");
replace('const plan=JSON.parse(fs.readFileSync(ctx.state.cleanupPlan.file));','const plan=ctx.state.cleanupPlan?JSON.parse(fs.readFileSync(ctx.state.cleanupPlan.file)):null;');
replace("const before=await capture(ctx,label+'-before');exact(loadSnapshot(ctx,plan.current),before);", "const before=await capture(ctx,label+'-before');if(plan)exact(loadSnapshot(ctx,plan.current),before);else assertRecorded(ctx,before);");
replace('allSystemFKTriggersEnabled:drain,caseRolledBack:true','allSystemFKTriggersEnabled:drain?true:null,caseRolledBack:true');
replace('priorFailedCleanupRolledBackExactly:true,originalPlanSHA256:ctx.state.cleanupPlan.rawBytesSha256','priorFailedCleanupRolledBackExactly:plan!==null,originalPlanSHA256:ctx.state.cleanupPlan?.rawBytesSha256??null');
replace('cases,priorFailedCleanupRolledBackExactly:true,businessRowsChanged:false','cases,priorFailedCleanupRolledBackExactly:plan!==null,businessRowsChanged:false');
replace('allAssertionsPassed:true,priorFailedCleanupRolledBackExactly:true','allAssertionsPassed:true,priorFailedCleanupRolledBackExactly:plan!==null');
fs.writeFileSync('tools/rust-r4ghi/sandbox-cleanup-drain32.mjs',source,{flag:'wx'});
console.log(JSON.stringify({created:'sandbox-cleanup-drain32.mjs',TEMPExecuted:false,businessWrites:false}));
