// Independent source-conditioned transition checks over saved raw physical rows.
import assert from 'node:assert/strict';
import { isDeepStrictEqual as same } from 'node:util';
import { contractInstant } from './l-contract-diff.mjs';
import { digest } from './fixture-core.mjs';
import { snapshotTables, financeId, rustBinary } from './l-commission-edge-plan.mjs';
import { originalEdgeProjection } from './l-commission-edge-projection.mjs';
const instant=value=>contractInstant(value).us;
const pgTextInstant=value=>{assert(typeof value==='string'&&/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d(?:\.\d{1,6})?[+-]\d\d(?::\d\d)?$/.test(value),'Invalid original pg textual timestamp');return instant(value.replace(' ','T').replace(/([+-]\d\d)$/,'$1:00'));};
const row=(facts,table,id)=>{const matches=facts[table].filter(x=>x.id===id);assert.equal(matches.length,1,'Missing/duplicate exact source row '+table);return matches[0];};
const active=(facts,table,project)=>facts[table].filter(x=>x.project_id===project&&x.is_current);
const qRows=q=>q.requests??[q];
const checksOf=fn=>{let checks=0;return {assert(value,message){checks++;assert(value,message);},equal(a,b,message){checks++;assert.deepEqual(a,b,message);},get count(){return checks;},run:fn};};
function inHttp(value,q,reason,check) {const t=instant(value);check.assert(t>=instant(q.startedAt)&&t<=instant(q.httpFinishedAt)&&t%1000n===0n,reason);return value;}
function approvedId(q){const match=/^\/api\/approval-records\/([0-9a-f-]{36}):approve$/.exec(q.path);assert(match,'Not an original approve route');return match[1];}

export function assertSnapshotBarrier(report,batch,check=checksOf()) {
    const scenario=report.phaseHooks[0].evidence.scenario,trace=batch.barrier,race=scenario.endsWith('-race'),replacement=scenario.startsWith('replacement-')||scenario==='late-replacement';
    const caseId='edge.'+scenario;
    check.assert(trace?.kind==='real-owned-snapshot-SQL-lock-barrier'&&trace.result==='observed'&&trace.caseId===caseId,'Actual observed barrier is required');
    check.equal(trace.table,race?snapshotTables[0]:snapshotTables[1]);check.equal(trace.command,replacement?'UPDATE':'INSERT');
    check.equal(trace.action,race?'release':'cancel');check.equal(trace.expectedWaiters,race?2:1);
    const expectedCurrent=replacement?active(batch.before,trace.table,batch.before.commission_payout.find(p=>p.id===row(batch.before,'approval_record',approvedId(batch.requests[0])).target_object_id).project_id):[];
    check.equal(trace.rowIds,replacement?[expectedCurrent[0]?.id]:null,'Lock must target the real owned current row or the declared initial table');
    const waiting=trace.barrier?.waiting??[],pids=waiting.map(x=>x.pid);
    check.assert(waiting.length===trace.expectedWaiters&&new Set(pids).size===waiting.length&&pids.every(x=>Number.isInteger(x)&&x>0),'Waiting owned PID cardinality/identity differs');
    check.assert(trace.barrier.actualWaitingStatements===waiting.length&&trace.barrier.allBlockerChainsReachFixture&&trace.barrier.ownedCommandVerified,'Unadmitted barrier cannot certify this window');
    const reaches=(entry,seen=new Set())=>{if(entry.blockers.includes(trace.fixtureLockerPid))return true;if(seen.has(entry.pid))return false;seen.add(entry.pid);return entry.blockers.some(id=>waiting.some(x=>x.pid===id&&reaches(x,seen)));};
    for(const wait of waiting){check.assert(reaches(wait),'Waiting graph does not reach this actual fixture lock');check.assert(wait.wait_event_type==='Lock'&&wait.queryBytes>0&&/^[0-9a-f]{64}$/.test(wait.querySha256),'Waiting statement fingerprint missing');
        check.assert(pgTextInstant(wait.query_start_text)>=instant(trace.commandStartedAt),'Original microsecond query start predates real command dispatch');}
    check.assert(instant(batch.pgCaseOpenedAt)<=instant(trace.startedAt)&&instant(trace.commandStartedAt)<=instant(trace.barrier.observedAt)&&instant(trace.barrier.observedAt)<=instant(trace.lockReleasedAt),'PG shared context/locker/dispatch/admission/release order changed');
    const proof=trace.commandOwnershipProof;
    check.equal([...proof.backendPids].sort((a,b)=>a-b),[...pids].sort((a,b)=>a-b));check.equal(proof.runId,report.runId);check.equal(proof.caseId,caseId);
    check.assert(trace.sharedCaseOnly&&trace.requestCount===batch.requests.length,'Additional undeclared requests entered the shared lock window');
    if(report.backend==='nest') {
        check.equal(proof.kind,'original-Native-admitted-case-query-pg-Client-processID');check.equal(proof.nativeProcessId,report.nativeFinal.processId);
        check.equal(proof.sqlObserver.backendPidSource,'original pg Client.processID read separately for each actual query');
        check.assert(report.runtimeInput.files.some(f=>f.source===proof.sqlObserver.file&&f.rawBytesSha256===proof.sqlObserver.rawBytesSha256),'SQL PID observer source differs from captured source');
        for(const wait of waiting) {
            check.equal(wait.application_name,'');const matches=proof.pendingQueries.filter(p=>p.backendPid===wait.pid);check.equal(matches.length,1);
            const p=matches[0],starts=report.sql.filter(x=>x.queryId===p.queryId&&x.phase==='start'&&x.context?.caseId===caseId&&x.context.runId===report.runId);
            check.equal(starts.length,1);check.equal(starts[0].backendPid,wait.pid);check.equal(starts[0].sequence,p.sequence);check.equal(starts[0].sqlSha256,p.sqlSha256);
            // pg_stat_activity can retain only 1023 query bytes. Its truncated
            // FSS INSERT is a different byte string from the original Native
            // full-query witness; retain both hashes and bind by the actual PID,
            // unique pending case, command/relation and dispatch time instead.
            check.assert(wait.querySha256===p.sqlSha256||(wait.queryBytes===1023&&trace.table===snapshotTables[0]&&trace.command==='INSERT'),'Unexplained whole-query fingerprint difference');
            check.assert(instant(p.at)>=instant(trace.commandStartedAt)&&instant(p.at)<=instant(trace.barrier.observedAt),'Actual pending query time is outside original dispatch/admission');
            check.assert(starts[0].command===trace.command&&starts[0].relations.includes(trace.table),'Admitted Native query targets another SQL command/table');
            check.assert(report.sql.some(x=>x.queryId===p.queryId&&['end','error'].includes(x.phase)&&x.sequence>p.sequence),'Original admitted SQL never completed/failed');
        }
        if(!race){check.assert(proof.completedFinalInserts.length>0,'No actual completed FSS INSERT before later cancellation');for(const p of proof.completedFinalInserts){check.assert(p.rowCount===1&&p.sequence<Math.min(...proof.pendingQueries.map(x=>x.sequence)),'Completed first INSERT is not earlier than actual Rule wait');check.assert(report.sql.some(x=>x.queryId===p.queryId&&x.phase==='end'&&x.command==='INSERT'&&x.relations.includes(snapshotTables[0])&&x.rowCount===1&&x.sqlSha256===p.sqlSha256&&x.context?.caseId===caseId),'Completed original Native INSERT binding changed');}}
    } else {
        check.equal(proof.kind,'owned-Rust-process-sockets-original-BackendKeyData-shared-case-PID-set');check.equal(proof.requestToIndividualPoolPidClaimed,false);
        const physical=proof.physical,sockets=physical.sockets;
        check.equal(sockets.processIdentity,report.rustRuntime.processIdentity);check.equal(sockets.binaryRawBytesSha256,rustBinary);
        check.assert(physical.kind==='owned-proc-socket-original-BackendKeyData-hard-binding'&&Number(physical.workerIdentity.pid)>0&&/^\d+$/.test(physical.workerIdentity.startTicks),'Missing physical owned process/BackendKeyData witness');
        for(const wait of waiting){check.equal(wait.application_name,'poms-api-rust');const matches=physical.backendProofs.filter(p=>p.backendPid===wait.pid);check.equal(matches.length,1);const p=matches[0];
            check.equal(p.ownedRustProcess,report.rustRuntime.processIdentity);check.assert(p.messageType==='K'&&p.messageLength===12&&p.startupMessageTypes.at(-1)==='K'&&!p.cancelKeyParsedOrExported&&!p.payloadRetained,'Not an original safe BackendKeyData observation');
            check.equal(sockets.sockets.filter(s=>s.inode===p.inode&&s.localPort===p.localPort&&s.localAddress==='127.0.0.1'&&s.remoteAddress==='127.0.0.1'&&s.remotePort===19432).length,1,'BackendKeyData not tied to an actual owned process fd/socket');}
        check.equal(proof.priorFinalInsertObservation.independentRustSqlStatementCompletionObserved,false,'Do not turn source/control-flow inference into an SQLx wire trace');
    }
    check.equal(trace.closeout.map(x=>x.name).sort(),['all-request-promises-settled','lock-rollback','locker-close','reader-close']);check.assert(trace.closeout.every(x=>x.result==='pass'),'Barrier resources not fully closed');
    check.equal(trace.statuses,batch.requests.map(q=>q.response.status));check.equal(batch.statuses,trace.statuses);
    if(!race){const c=trace.cancellation;check.assert(c?.actualPgCancelBackendReturned===true&&c.terminatedBackend===false&&c.pid===waiting[0].pid&&c.requestQuerySha256===waiting[0].querySha256,'Cancel is not the exact actual owned waiting statement');
        check.equal(c.settledWhileLockHeld.statuses,[500]);check.equal(c.settledWhileLockHeld.outerTransactionStillActive,false);
        check.assert(instant(c.cancelledAt)<=instant(batch.requests[0].httpFinishedAt)&&instant(batch.requests[0].httpFinishedAt)<=instant(c.settledWhileLockHeld.observedAt)&&instant(c.settledWhileLockHeld.observedAt)<=instant(trace.lockReleasedAt),'500 response and ended outer transaction must be observed while the lock remains held');
        if(c.settledWhileLockHeld.backendEnded)check.equal(c.settledWhileLockHeld.backend,null);else{const b=c.settledWhileLockHeld.backend;check.assert(b.pid===c.pid&&b.backend_start_text===waiting[0].backend_start_text&&b.state==='idle'&&b.xact_start===null,'Cancelled original backend retained an outer transaction before lock release');}
    }
    return {checks:check.count,actualPidSet:pids,trace,notClaimed:'No per-caller Rust pool PID attribution; late Rust earlier INSERT is source/control-flow inference only'};
}

export function assertApprovalWindow(unit,projection=originalEdgeProjection(),check=checksOf()) {
    const before=unit.before,after=unit.after,expected=structuredClone(before),requests=qRows(unit),successes=requests.filter(q=>q.response.status===200),created={};
    check.assert(successes.length<=1,'This recorded unique-current window must have at most one successful transaction');
    const chooseExpected=(table,id)=>row(expected,table,id);
    const sample=(actual,q,name)=>inHttp(actual,q,name,check);
    for(const q of requests){check.assert([200,400,500].includes(q.response.status),'Unexpected unclassified HTTP outcome');if(q.response.status===500)check.equal(q.response.body,{statusCode:500,message:'Internal server error'},'Complete original 500 error shape changed');
        if(q.response.status===400)check.equal(Object.keys(q.response.body).sort(),['error','message','statusCode'],'Complete BadRequest error fields missing/extra');}
    for(const q of successes) {
        const approvalBefore=row(before,'approval_record',approvedId(q)),approvalAfter=row(after,'approval_record',approvalBefore.id),payoutBefore=row(before,'commission_payout',approvalBefore.target_object_id),payoutAfter=row(after,'commission_payout',payoutBefore.id);
        check.assert(approvalBefore.current_status==='pending'&&approvalBefore.approval_type==='commission-payout-approval'&&approvalBefore.target_object_type==='commission-payout'&&approvalBefore.current_approver_user_id===financeId,'Original pending assigned payout approval required');
        check.equal(q.request.body.expectedVersion,approvalBefore.row_version);
        const todos=before.todo_item.filter(t=>t.source_type==='approval-record'&&t.source_id===approvalBefore.id&&t.assignee_user_id===financeId&&['open','processing'].includes(t.status));check.equal(todos.length,1);
        const ae=chooseExpected('approval_record',approvalBefore.id);
        Object.assign(ae,{current_status:'approved',decision:'approved',decision_comment:q.request.body.comment??null,current_approver_user_id:null,row_version:approvalBefore.row_version+1,
            decided_at:sample(approvalAfter.decided_at,q,'Decision Date outside actual HTTP'),closed_at:sample(approvalAfter.closed_at,q,'Close Date outside actual HTTP'),updated_at:sample(approvalAfter.updated_at,q,'Approval onUpdate outside actual HTTP')});
        check.assert(instant(ae.decided_at)<=instant(ae.closed_at)&&instant(ae.closed_at)<=instant(ae.updated_at),'Original decision/close/flush sample ordering changed');
        const pe=chooseExpected('commission_payout',payoutBefore.id);Object.assign(pe,{status:'approved',approved_amount:payoutBefore.approved_amount??payoutBefore.theoretical_cap_amount,approved_by:financeId,row_version:payoutBefore.row_version+1,
            approved_at:sample(payoutAfter.approved_at,q,'Payout approval Date outside HTTP'),updated_at:sample(payoutAfter.updated_at,q,'Payout onUpdate outside HTTP')});
        const todoAfter=row(after,'todo_item',todos[0].id),te=chooseExpected('todo_item',todos[0].id);
        Object.assign(te,{status:'completed',row_version:te.row_version+1,completed_at:sample(todoAfter.completed_at,q,'Todo completion Date outside HTTP'),updated_at:sample(todoAfter.updated_at,q,'Todo onUpdate outside HTTP')});
        check.assert(instant(ae.closed_at)<=instant(te.completed_at)&&instant(te.completed_at)<=instant(pe.approved_at)&&instant(pe.approved_at)<=instant(pe.updated_at),'Original Todo→payout sample ordering changed');
        for(const table of snapshotTables){const old=active(before,table,payoutBefore.project_id);check.assert(old.length<=1,'Duplicate existing current snapshot');
            if(old.length){const actual=row(after,table,old[0].id),e=chooseExpected(table,old[0].id);Object.assign(e,{status:'superseded',is_current:false,updated_by:financeId,row_version:e.row_version+1,updated_at:sample(actual.updated_at,q,'Snapshot supersession onUpdate outside HTTP')});}
            const fresh=after[table].filter(n=>!before[table].some(b=>b.id===n.id));check.equal(fresh.length,1,'Exactly one new source-certified row per snapshot table');created[table]=fresh[0];
        }
        const fss=created[snapshotTables[0]],rule=created[snapshotTables[1]],oldFss=active(before,snapshotTables[0],payoutBefore.project_id)[0],oldRule=active(before,snapshotTables[1],payoutBefore.project_id)[0];
        const freezes=before.commission_role_assignment.filter(x=>x.project_id===payoutBefore.project_id&&x.is_current&&x.status==='frozen');check.equal(freezes.length,1);const freeze=freezes[0];
        const bindings=before.operating_signal_gate_binding.filter(x=>x.project_id===payoutBefore.project_id&&x.gate_stage_type==='final'&&x.status==='active');check.equal(bindings.length,1);const binding=bindings[0];
        const reviews=before.commission_gate_review_record.filter(x=>x.binding_id===binding.id&&x.status==='active').sort((a,b)=>instant(a.handled_at)>instant(b.handled_at)?-1:instant(a.handled_at)<instant(b.handled_at)?1:instant(a.created_at)>instant(b.created_at)?-1:1);check.assert(reviews.length>0,'Missing actual original latest gate review');const review=reviews[0];
        let patch,explanation;
        if(payoutBefore.stage_type==='final') {
            patch={final_settlement_status:'pending-final-settlement',non_retention_settlement_status:'pending-non-retention',retention_settlement_status:'waiting-retention',retention_requirement_summary:projection.DEFAULT_RETENTION_REQUIREMENT_SUMMARY,retention_receipt_summary:null,departure_exception_summary:null,retention_receipt_record_id:null,departure_exception_decision_id:null};explanation=projection.buildPendingFinalRuleExplanation();
        } else {
            check.equal(payoutBefore.stage_type,'retention');check.assert(oldFss,'Retention requires the actual current snapshot');
            const receipt=row(before,'receipt_record',oldFss.retention_receipt_record_id),departure=row(before,'commission_departure_exception_decision',oldFss.departure_exception_decision_id),term=row(before,'contract_term_snapshot',freeze.effective_handover_baseline_snapshot_id);
            check.assert(receipt.project_id===payoutBefore.project_id&&receipt.status==='confirmed'&&departure.project_id===payoutBefore.project_id&&departure.freeze_version_id===freeze.id&&departure.is_current&&departure.status==='active','Original retention receipt/departure context invalid');
            const lower=projection.toBusinessDateString(new Date(q.startedAt)),upper=projection.toBusinessDateString(new Date(q.httpFinishedAt));check.equal(lower,upper,'Request crosses a business-day boundary; do not infer one service Date');
            const draft=projection.buildRetentionSettlementDraft({openFreezeDispute:false,retentionDue:projection.evaluateRetentionDueDate(term.retention_due_date,new Date(q.startedAt)),departureDecision:{decisionSummary:departure.decision_summary,confirmationRequirementSummary:departure.confirmation_requirement_summary??null},retentionReceipt:{receiptAmount:projection.receiptAmountString(receipt.receipt_amount),receiptDate:new Date(receipt.receipt_date)},gateBindingAction:binding.binding_action??null,gateReviewDecision:review.gate_review_decision,gateReviewBlockingReasonCode:review.blocking_reason_code??null,gateNextActionSummary:review.next_action_summary??null});
            patch={final_settlement_status:draft.finalSettlementStatus,non_retention_settlement_status:draft.nonRetentionSettlementStatus,retention_settlement_status:draft.retentionSettlementStatus,retention_requirement_summary:draft.retentionRequirementSummary,retention_receipt_summary:draft.retentionReceiptSummary,departure_exception_summary:draft.departureExceptionSummary,retention_receipt_record_id:receipt.id,departure_exception_decision_id:departure.id};explanation=draft.ruleExplanation;
            check.equal(draft.retentionSettlementStatus,'ready-retention');
        }
        const fssExpected={id:fss.id,project_id:payoutBefore.project_id,freeze_version_id:freeze.id,gate_review_record_id:review.id,...patch,version:oldFss?oldFss.version+1:1,is_current:true,
            baseline_selection_source:binding.baseline_selection_source,tax_impact_summary:binding.tax_impact_summary,tax_impact_pending_amount:binding.tax_impact_pending_amount,data_maturity_level:binding.data_maturity_level,cost_action_recommendation:binding.cost_action_recommendation,current_action_level:binding.current_action_level,referenced_baseline_version:binding.referenced_baseline_version,referenced_snapshot_version:binding.referenced_snapshot_version,
            summary_package_key:review.summary_package_key,summary_snapshot_id:review.summary_snapshot_id,projection_level:review.projection_level,export_policy:review.export_policy,status:'active',supersedes_id:oldFss?.id??null,created_by:financeId,updated_by:financeId,row_version:1};
        const ruleExpected={id:rule.id,project_id:payoutBefore.project_id,final_settlement_snapshot_id:fss.id,version:oldRule?oldRule.version+1:1,is_current:true,current_stage_status:explanation.currentStageStatus,gate_decision_code:explanation.gateDecisionCode,blocking_reason_category:explanation.blockingReasonCategory,blocking_reason_code:explanation.blockingReasonCode,blocking_reason_summary:explanation.blockingReasonSummary,gate_decision_summary:explanation.gateDecisionSummary,next_action_summary:explanation.nextActionSummary,status:'active',supersedes_id:oldRule?.id??null,created_by:financeId,updated_by:financeId,row_version:1};
        for(const [table,actual,e]of[[snapshotTables[0],fss,fssExpected],[snapshotTables[1],rule,ruleExpected]]){for(const col of['generated_at','created_at','updated_at'])e[col]=sample(actual[col],q,'New snapshot '+col+' outside HTTP');check.assert(instant(actual.generated_at)<=instant(actual.created_at)&&instant(actual.created_at)<=instant(actual.updated_at),'New snapshot generated/created/updated ordering changed');check.equal(actual,e,'Every original new snapshot business/default field must match source context');expected[table].push(e);}
        check.equal(q.response.body,{targetId:payoutBefore.id,targetType:'commission-payout',resultStatus:'approved',businessStatusAfter:'approved',approvalRecordId:approvalBefore.id,confirmationRecordId:null,todoItemIds:todos.map(x=>x.id),snapshotId:fss.id},'Complete command DTO differs from actual winner/owned rows');
    }
    // Auth touch is outside the business transaction and is checked separately.
    // No other table, row or unchanged/default field may be removed from this oracle.
    for(const [table,rows]of Object.entries(expected))if(table!=='auth_session')check.equal([...after[table]].sort((a,b)=>a.id.localeCompare(b.id)),[...rows].sort((a,b)=>a.id.localeCompare(b.id)),'Whole source-conditioned table transition differs: '+table);
    return {checks:check.count,winnerCallers:successes.map(q=>q.name),loserCallers:requests.filter(q=>q.response.status!==200).map(q=>q.name),newSnapshotIds:Object.fromEntries(Object.entries(created).map(([t,r])=>[t,r.id])),allNonAuthTablesChecked:Object.keys(before).filter(x=>x!=='auth_session'),allUnchangedFieldsRetained:true};
}

export function assertWindowCounterconditions(report,unit,projection=originalEdgeProjection(),check=checksOf()) {
    const scenario=report.phaseHooks[0].evidence.scenario??report.scenario,before=unit.before,q=qRows(unit)[0],approval=row(before,'approval_record',approvedId(q)),payout=row(before,'commission_payout',approval.target_object_id),project=payout.project_id;
    const binding=before.operating_signal_gate_binding.find(x=>x.project_id===project&&x.status==='active'&&x.gate_stage_type==='final'),reviews=before.commission_gate_review_record.filter(x=>x.binding_id===binding.id&&x.status==='active').sort((a,b)=>instant(a.handled_at)>instant(b.handled_at)?-1:1),review=reviews[0],current=active(before,snapshotTables[0],project)[0];
    const severity=[binding.binding_action,review.gate_review_decision].map(x=>x?.trim().toLowerCase()),blocked=severity.some(x=>x==='block'||x?.startsWith('block-')),reviewed=severity.some(x=>x==='review'||x?.startsWith('review-'));
    if(scenario==='final-gate'||scenario==='retention-gate') {
        const retention=scenario==='retention-gate',shouldBlock=blocked||(retention&&reviewed);check.equal(q.response.status,shouldBlock?400:200,'Actual gate countercondition outcome changed');
        const name=q.name.split('.').at(-1),values={ 'binding-block':['binding_action','block'],'binding-review':['binding_action','review'],'block-exact':['gate_review_decision',' BlOcK '],'block-prefix':['gate_review_decision',' BlOcK-cash '],'review-exact':['gate_review_decision',' ReViEw '],'review-prefix':['gate_review_decision',' ReViEw-finance '] };
        if(values[name]){const[key,value]=values[name];check.equal(key==='binding_action'?binding[key]:review[key],value,'The declared physical/free-string countercondition was not present before HTTP');}
        if(shouldBlock)check.equal(q.response.body,{message:`CommissionPayout ${payout.id} is blocked by the current final commission gate review`,error:'Bad Request',statusCode:400});
    } else if(scenario==='retention-date') {
        const freeze=before.commission_role_assignment.find(x=>x.project_id===project&&x.is_current&&x.status==='frozen'),term=row(before,'contract_term_snapshot',freeze.effective_handover_baseline_snapshot_id),part=q.name.split('.').at(-1),date=term.retention_due_date;
        const low=projection.toBusinessDateString(new Date(q.startedAt)),high=projection.toBusinessDateString(new Date(q.httpFinishedAt));check.equal(low,high);
        if(part==='missing'){check.equal(date,null);check.equal(q.response.status,400);check.equal(q.response.body,{message:`CommissionPayout ${payout.id} cannot approve retention payout without a current retention due date fact`,error:'Bad Request',statusCode:400});}
        else if(part==='future'){const next=new Date(low+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);check.equal(date,next.toISOString().slice(0,10));check.equal(q.response.body,{message:`CommissionPayout ${payout.id} cannot approve retention payout before retention due date ${date}`,error:'Bad Request',statusCode:400});check.equal(q.response.status,400);}
        else {check.equal(part,'today');check.equal(date,low);check.equal(q.response.status,200);}
    } else if(scenario==='retention-approve-nonret')check.equal(current.non_retention_settlement_status,'pending-non-retention');
    else if(scenario==='retention-approve-payout-status')check.equal(payout.status,'draft');
    else if(scenario==='retention-approve-confirmation'){const records=before.confirmation_record.filter(x=>x.project_id===project);check.equal(records.length,1);check.assert(records[0].status==='pending'&&records[0].confirmed_count===0&&records[0].confirmed_at===null,'Actual prepared confirmation countercondition missing');}
    else if(scenario==='retention-approve-summary'){const actual=row(before,'approval_summary_snapshot',current.summary_snapshot_id);check.assert(actual.id!==review.summary_snapshot_id&&actual.target_type==='project-handover','Current FSS must actually reference the other owned original handover summary');}
    else if(scenario==='retention-approve-gate-record'){check.assert(current.gate_review_record_id!==review.id&&binding.binding_action==='prompt','Actual latest second Native review must differ from old snapshot reference');}
    return {checks:check.count,scenario,caseId:unit.name,bindingAction:binding.binding_action,gateReviewDecision:review.gate_review_decision,rawPreparedCounterconditionsRetained:true};
}

export function originalAuthTransitions(report,units,bindings,lifecycle,check=checksOf()) {
    const result=[];const byName=name=>bindings.find(x=>x.caseId===name);
    for(const unit of units) {
        const requests=qRows(unit),oldRows=unit.before.auth_session,newRows=unit.after.auth_session;
        for(const after of newRows.filter(row=>!oldRows.some(old=>old.id===row.id))) {
            const binding=bindings.find(item=>item.id===after.id),q=requests.find(item=>item.name===binding?.caseId);
            check.assert(q?.name.endsWith('.login')&&q.response.status===200&&after.row_version===1&&after.status==='active'&&after.revoked_at===null&&after.revoked_reason===null,'New auth row must be the exact actual successful login with original defaults');
            result.push({caseId:unit.name,caller:q.name,executionBackend:q.executionBackend,sessionId:after.id,userId:after.user_id,kind:'original-new-session',before:null,after,rowVersionDelta:null});
        }
        const selected=new Map();
        for(const [offset,q]of requests.entries()) {
            if(q.name.endsWith('.csrf')||q.name.endsWith('.login'))continue;
            const isL=q.path.startsWith('/api/approval-records/')||q.path==='/api/me/todos',slot=unit.requests?'edge.finance-'+(offset?'b':'a')+'.login':isL?(q.name.startsWith('contract.')?'vp.login':'finance.login'):'initiator.login';
            const binding=byName(slot);check.assert(binding,'Actual original source-selected session binding absent');selected.set(binding.id,q);
        }
        for(const before of oldRows){const after=newRows.find(x=>x.id===before.id);check.assert(after,'Existing original session disappeared during HTTP');const changed=Object.keys(before).filter(k=>!same(before[k],after[k])),q=selected.get(before.id);
            if(!changed.length){if(q)check.assert(instant(q.startedAt)-instant(before.last_seen_at)<60000000n,'Due active session was not touched by the original guard');continue;}
            check.assert(q,'Unselected actor/session changed in an actual HTTP window');
            check.assert(changed.every(k=>['last_seen_at','idle_expires_at','updated_at','row_version'].includes(k)),'Auth transition changed a nonce/identity/lifecycle/other field outside the original raw touch');
            const seen=instant(after.last_seen_at),qStart=instant(q.startedAt),qEnd=instant(q.httpFinishedAt),delta=after.row_version-before.row_version;
            check.assert(seen>=qStart&&seen<=qEnd&&seen-instant(before.last_seen_at)>=60000000n,'Auth touch sample violates actual HTTP bounds/original 60s threshold');
            const expiry=seen+BigInt(lifecycle.idle),absolute=instant(before.absolute_expires_at);check.equal(instant(after.idle_expires_at),expiry<absolute?expiry:absolute,'Raw guard expiry is not min(now+idle,absolute)');
            const isL=q.path.startsWith('/api/approval-records/')||q.path==='/api/me/todos';
            const strictEdge=q.name.startsWith('edge.')&&isL&&q.method==='POST';
            if(strictEdge)check.equal(delta,q.response.status===200?2:1,'Edge successful managed coflush vs failed business rollback auth version boundary changed');
            else check.assert(delta===1||(delta===2&&q.method==='POST'&&q.response.status<300),'Natural prefix raw/managed version transition is not source-compatible');
            if(delta===1)check.equal(instant(after.updated_at),seen,'Single raw touch must reuse its actual now');else check.assert(instant(after.updated_at)>=seen&&instant(after.updated_at)<=qEnd,'Managed coflush updatedAt outside actual source window');
            result.push({caseId:unit.name,caller:q.name,executionBackend:q.executionBackend,sessionId:before.id,userId:before.user_id,changedColumns:changed,before,after,rowVersionDelta:delta,strictEdge,thresholdSeconds:60,actualNewDateInRequestBounds:true});
        }
    }
    return {checks:check.count,transitions:result,source:'Original AuthSessionService raw lastSeen touch + managed UoW dirty coflush; actual natural elapsed retained',lifecycle};
}

export function assertRecordedAuthDelta(batch,declared,check=checksOf()) {
    const old=new Map(batch.before.auth_session.map(r=>[r.id,r])),actual=batch.after.auth_session.filter(r=>digest(r)!==digest(old.get(r.id)??null)).map(r=>({id:r.id,userId:r.user_id,beforeVersion:old.get(r.id)?.row_version,afterVersion:r.row_version,beforeLastSeenAt:old.get(r.id)?.last_seen_at,afterLastSeenAt:r.last_seen_at,beforeUpdatedAt:old.get(r.id)?.updated_at,afterUpdatedAt:r.updated_at}));
    check.equal(declared,actual,'Original declared authDelta omits or changes actual natural/raw guard effects');return actual;
}
