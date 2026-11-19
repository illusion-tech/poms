import {createContext} from './business/context.mjs';
import {recoverReadinessObservation} from './business/recover-readiness-observation.mjs';
const ctx=createContext({epoch:'g2-business08',run:'main01'});
try {
    const result=await recoverReadinessObservation(ctx,{planFile:ctx.win+'/tools/rust-r4ghi/I/implementation/business-recovery15/recovery-plan15.json',approvedPlanSHA256:'d616758e4b4ef4e5a802724e6d06546e1f79e16ce113f30e190d8c408ee7067c'});
    console.log(JSON.stringify(result));
} catch(error) {
    const record=ctx.artifact(ctx.next('readiness-recovery-failed')+'.json',{name:error.name,message:error.message,stack:error.stack});ctx.persist();
    console.error(JSON.stringify({status:'failed',privateOriginal:record}));process.exitCode=1;
}
