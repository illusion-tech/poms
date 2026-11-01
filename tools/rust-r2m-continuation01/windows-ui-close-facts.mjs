// Actual terminal resource evidence is independent of a failed UI assertion.
// This creates no process, browser, server, drain or row-cleanup authority.
import assert from'node:assert/strict';
export function windowsUiActualCloseFacts(value){
    const lifecycle=value?.lifecycle,result=value?.result;
    const tree=lifecycle?.windowsStop?.result==='owned-tree-stopped'&&lifecycle.windowsStop.unregisteredProcessesStopped===0;
    const terminal=lifecycle?.terminalFrameReceived===true&&lifecycle.pendingCallbacks===0;
    return Object.freeze({kind:'R2M-Windows-actual-terminal-close-facts',windowsTreeStopped:tree,terminalAndCallbacksClosed:terminal,
        browserClosed:tree&&terminal&&result?.browserClosed===true,serverClosed:tree&&terminal&&result?.server?.closed===true,
        businessObserved:!value?.rejected&&result?.result==='observed',rejected:value?.rejected?true:false});
}
export function windowsUiClosedBrowserFacade(value){
    if(!windowsUiActualCloseFacts(value).browserClosed)return null;
    return{isConnected:()=>false,async close(){assert(windowsUiActualCloseFacts(value).browserClosed,'Original actual terminal close proof must remain complete')}};
}
