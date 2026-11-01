// Finite operator execution capacity. No I/O or runtime permission on import.
import assert from 'node:assert/strict';
export const windowsUiBudgetKind='R2M-c01-Windows-single-journey-budget-v1';
export const windowsNativeUi34BudgetKind='R2M-c01-Windows-Native-UI3-UI4-capacity-v2';
export const windowsRustUi234BudgetKind='R2M-c01-Windows-Rust-UI2-UI3-UI4-capacity-v3';
const journeys=['UI1','UI2','UI3','UI4'];
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
export function windowsUiExecutionBudget(selection,backend=undefined){
    assert(Array.isArray(selection)&&selection.length===1&&journeys.includes(selection[0]),'Windows owned input selects exactly one original journey');
    assert(backend===undefined||['nest','rust'].includes(backend),'Exact planned API backend required');
    if(backend==='nest'&&['UI3','UI4'].includes(selection[0]))return Object.freeze({kind:windowsNativeUi34BudgetKind,journey:selection[0],apiBackend:'nest',
        commandTimeoutMs:1800000,pipelineTimeoutMs:1500000,bridgeMaximumMs:900000,driverMaximumMs:840000,
        driverLeadMs:60000,outerCleanupReserveMs:300000,sourceGuardReserveMs:480000,nativeOwnerTimeoutMs:1800000});
    if(backend==='rust'&&['UI2','UI3','UI4'].includes(selection[0]))return Object.freeze({kind:windowsRustUi234BudgetKind,journey:selection[0],apiBackend:'rust',
        commandTimeoutMs:1800000,pipelineTimeoutMs:1500000,bridgeMaximumMs:840000,driverMaximumMs:780000,
        driverLeadMs:60000,outerCleanupReserveMs:300000,sourceGuardReserveMs:480000});
    return Object.freeze({kind:windowsUiBudgetKind,journey:selection[0],commandTimeoutMs:1200000,
        pipelineTimeoutMs:900000,bridgeMaximumMs:840000,driverMaximumMs:780000,
        driverLeadMs:60000,outerCleanupReserveMs:300000});
}
export function windowsUiCommandEnvironment(environment){
    return Object.fromEntries(['PATH','HOME','LANG','WSLENV','WSL_INTEROP','DISPLAY','WAYLAND_DISPLAY','XDG_RUNTIME_DIR']
        .filter(key=>environment[key]!==undefined).map(key=>[key,environment[key]]));
}
export function windowsUiBridgeBudget(selection,elapsedPreparationMs,backend=undefined){
    const policy=windowsUiExecutionBudget(selection,backend);
    assert(Number.isSafeInteger(elapsedPreparationMs)&&elapsedPreparationMs>=0,'Actual preparation interval required');
    const totalTimeoutMs=Math.min(policy.bridgeMaximumMs,policy.pipelineTimeoutMs-elapsedPreparationMs-(policy.sourceGuardReserveMs??0));
    const driverTimeoutMs=Math.min(policy.driverMaximumMs,totalTimeoutMs-policy.driverLeadMs);
    assert(driverTimeoutMs>=1000,'Windows pipeline has insufficient time for a new browser');
    return{kind:policy.kind,journey:policy.journey,elapsedPreparationMs,totalTimeoutMs,driverTimeoutMs,
        ...((policy.kind===windowsNativeUi34BudgetKind||policy.kind===windowsRustUi234BudgetKind)?{apiBackend:policy.apiBackend,sourceGuardReserveMs:policy.sourceGuardReserveMs}:{})};
}
export function validateWindowsUiBridgeBudget(budget,selection,backend=undefined){
    assert(budget&&typeof budget==='object');
    const expected=windowsUiBridgeBudget(selection,budget.elapsedPreparationMs,backend);
    assert(same(Object.keys(budget).sort(),Object.keys(expected).sort()),'Only the exact fixed Windows budget fields are allowed');
    assert(same(Object.keys(expected).map(key=>[key,budget[key]]),Object.entries(expected)),'Only the exact backend/journey Windows budget profile is allowed');
    return expected;
}
export function createWindowsUiPipelineDeadline({selection,backend=undefined,controller,now=()=>Date.now(),
    setTimer=(callback,ms)=>setTimeout(callback,ms),clearTimer=timer=>clearTimeout(timer)}){
    const policy=windowsUiExecutionBudget(selection,backend),started=now();
    assert(controller instanceof AbortController&&Number.isSafeInteger(started));
    const timer=setTimer(()=>controller.abort(new Error('Windows-UI-pipeline-deadline')),policy.pipelineTimeoutMs);
    timer?.unref?.();
    return{policy,beforeBrowser(){controller.signal.throwIfAborted();return windowsUiBridgeBudget(selection,now()-started,backend)},close(){clearTimer(timer)}};
}
