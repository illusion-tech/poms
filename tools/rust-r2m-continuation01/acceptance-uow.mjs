// Real four-variant internal driver, derived from the accepted L SDK/probe flow.
import assert from'node:assert/strict';
import{prepareSharedUowVariant,uowVariants}from'./acceptance-producers.mjs';
import{captureSharedUow,decodeSharedUowProbeOutput}from'./shared-uow-capture.mjs';
import{executeNativeSharedUow,sharedUowProbeInput}from'./shared-uow-native.mjs';
export async function runSharedUow(ctx){
 const {fixture:f,native,pg,retain,sourceReader,sourceCapId}=ctx;assert.equal(ctx.operation,'common-shared-uow');for(const fn of[ctx.nextContext,ctx.runRust,retain])assert.equal(typeof fn,'function');
 const observations=[];
 for(const config of uowVariants){
  const prepared=await prepareSharedUowVariant({...ctx,variant:config.variant});const {approval,dirtyTodo,project}=prepared;
  const context=ctx.nextContext(prepared.caseId,'m.internal-uow'),dirtySummary='R2M caller dirty '+config.variant;
  const captured=await captureSharedUow({fixture:f,native,pg,context,executionBackend:f.backend==='nest'?'native':'rust',projectId:project.id,actorId:approval.current_approver_user_id,
   facts:()=>f.facts(),retain:record=>retain({kind:'actual-full-internal-uow-private',record}),
   execute:async(_context,{retainStage})=>{
    if(f.backend==='nest')return executeNativeSharedUow({fixture:f,native,context,approvalId:approval.id,dirtyTodoId:dirtyTodo.id,actorId:approval.current_approver_user_id,dirtySummary,outer:config.outer,continueAfterServiceError:config.continueAfterServiceError},{retainStage});
    const input=sharedUowProbeInput({fixture:f,context,approval,dirtyTodo,dirtySummary,outer:config.outer,continueAfterServiceError:config.continueAfterServiceError});const output=await ctx.runRust('m_shared_uow_probe',input,retain);assert.equal(output.process.stopped,true);return decodeSharedUowProbeOutput(output.rawBytes,context);
   }});
  const out=captured.observation,succeeded=f.backend==='nest'?out.serviceSucceeded:out.serviceError==null&&out.serviceResult!=null;
  const expectedAction=config.outer==='commit'?'commit':config.childSuccess?'rollback':'rollback-after-service-error';
  assert.equal(succeeded,config.childSuccess);assert.equal(out.outerActualAction,expectedAction);assert.equal(out.result,'observed');
  if(!config.childSuccess){assert.equal(out.serviceError.status,400);assert.equal(out.serviceError.message,'CommissionPayout '+prepared.payout.id+' is blocked by the current final commission gate review')}
  const count=config.childSuccess&&config.outer==='commit'?1:0;for(const table of['commission_final_settlement_snapshot','commission_rule_explanation_snapshot'])assert.equal(captured.snapshotCounts[table],count);
  for(const frame of[captured.before,captured.after]){assert.equal(frame.kind,'R2M-actual-full107-private-row-snapshot');assert.equal(frame.tables.length,107);for(const table of['approval_record','todo_item','commission_payout','commission_final_settlement_snapshot','commission_rule_explanation_snapshot'])assert(frame.tables.some(row=>row.table===table&&Array.isArray(row.rows)))}
  observations.push({variant:config.variant,actualOuterCommitOrRollback:true,independentVisibility:true,fullParentAndChildFacts:true,captured,preparedInput:prepared,automaticStrictEqualityAllowed:false});
 }
 sourceReader.assertUnchanged();return{operation:'common-shared-uow',backend:f.backend,complete:true,runId:f.runId,sourceCapId,calls:observations.length,observations,HTTPResponseClaimed:false,automaticStrictMemoryEqualityAllowed:false};
}
