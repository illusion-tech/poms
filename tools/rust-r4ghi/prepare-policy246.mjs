// Read-only full context for an independent real H46 fixture private binding.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {FIXED,sourcePins} from './business/context.mjs';
import {assertAdmittedContext54,readPin54} from './business/consumer-admission54.mjs';
import {preparePolicyRuntime46} from './business/policy-runtime46.mjs';
const R=FIXED.win,P=FIXED.private,D=P+'/business/g2-business13/main01',sha=v=>createHash('sha256').update(v).digest('hex');
assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');assert(!fs.existsSync(D+'/driver.lock'));assert(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH);
const pin=(file,expected)=>{const rawBytesSha256=sha(fs.readFileSync(file));if(expected)assert.equal(rawBytesSha256,expected);return{file,rawBytesSha256};};
const stateRaw=fs.readFileSync(D+'/state.json'),state=JSON.parse(stateRaw);assert(!state.activeFault&&!state.blockedObservation&&!state.taxContinuation13.pendingMain&&!state.taxContinuation13.pendingTaxTrial&&!state.taxContinuation13.normalTaxPending);
assert.deepEqual([...state.actors.execution.permissions].sort(),['project:read','project:write']);assert(!state.fixtures.hPolicyCoverage26);
const ctx={...FIXED,epoch:state.epoch,run:state.run,priv:D,state,pins:sourcePins()};assertAdmittedContext54(ctx,{liveProcess:true,sourceFiles:true});const plan=JSON.parse(readPin54(state.toolAdmission119.approvedPlan));ctx.helperPins=JSON.parse(readPin54(plan.H1));
const binary='/home/wangzishi/.cache/poms-r4ghi-target-ROOT/debug/examples/r4ghi_summary_producer08',trustedSummaryBinary=pin(binary,'45efe528cb5045b8f9f46293144990fbd8641025f3e805f3847c15a5d6bb0f24');
const plannedDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());assert.equal(plannedDate,'2026-11-09');
const result=preparePolicyRuntime46(ctx,{candidateReceipt:pin(D+'/B2-Source13-tool119-admitted238.json','0e3d88fb6f1e362af8c1906632b5800c55281fcc77aa12d61f1ea1bb74052540'),plannedDate,trustedSummaryBinary,
 materialityRationale:'本受控项目的合同净额100.00、确认成本25.00和实际回款19.99/20.00/20.01均由真实入口产生；低回款下的负观测差额按需作重大性人工复核，保持系统成熟度和硬约束不变。'},D+'/policy-runtime246.json');
assert.deepEqual(fs.readFileSync(D+'/state.json'),stateRaw);console.log(JSON.stringify({...result,RootReadOnlyContext:true,stateUnchanged:true,plannedDate,TaxCorrectionClaimedComplete:false}));
