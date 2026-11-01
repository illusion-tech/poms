// In-memory transport/terminal facts and protected public source bytes only.
import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{createRequire}from'node:module';import{fileURLToPath}from'node:url';
import{windowsUiTransportProfile,uiTransportTimeout}from'./windows-ui-transport.mjs';
import{waitOriginalUiResponse}from'./acceptance-ui-browser.mjs';
import{windowsUiActualCloseFacts,windowsUiClosedBrowserFacade}from'./windows-ui-close-facts.mjs';
const original='tmp/rust-r2m/windows-ui-batch-original107/tools/rust-r2m-continuation01/',candidate=fileURLToPath(new URL('.',import.meta.url));
const arrangement={kind:'Root-R2M-UI-runtime-arrangement',sourceCapId:'pure-c01',browserPlatform:'win32',mode:'windows-managed-nest',apiPlatform:'win32',actualNativeOwnerEvidenceSha256:'a'.repeat(64)};
test('default/Linux original wait stays25s; only the exact attested Windows input has the finite75s transport and expect allowance',async()=>{
    const profile=windowsUiTransportProfile(arrangement);assert.equal(uiTransportTimeout(null,'pure-c01'),25000);assert.equal(uiTransportTimeout(profile,'pure-c01'),75000);
    for(const change of[p=>p.transportTimeoutMs=120000,p=>p.expectTimeoutMs=75001,p=>p.browserPlatform='linux',p=>p.sourceCapId='foreign',p=>p.extra=true]){const changed={...profile};change(changed);assert.throws(()=>uiTransportTimeout(changed,'pure-c01'));}
    assert.throws(()=>windowsUiTransportProfile({...arrangement,browserPlatform:'linux'}));
    const require=createRequire(import.meta.url),playwright=require('@playwright/test');assert.equal(typeof playwright.expect.configure({timeout:75000}),'function');
});
test('the production response primitive changes only its time allowance and retains origin/method/path/status behavior and the original rejected promise',async()=>{
    const profile=windowsUiTransportProfile(arrangement),inputs={origin:'http://127.0.0.1:10080',sourceCapId:'pure-c01'},calls=[];
    const response=(origin,path,method)=>({url:()=>origin+path,request:()=>({method:()=>method}),status:()=>200});
    for(const selected of[null,profile]){const originalPromise=Promise.resolve(response(inputs.origin,'/api/auth/sessions','POST')),page={waitForResponse(predicate,options){calls.push(options.timeout);assert(predicate(response(inputs.origin,'/api/auth/sessions','POST')));assert.equal(predicate(response('http://127.0.0.1:10081','/api/auth/sessions','POST')),false);assert.equal(predicate(response(inputs.origin,'/api/auth/session','POST')),false);assert.equal(predicate(response(inputs.origin,'/api/auth/sessions','GET')),false);return originalPromise}};assert.strictEqual(waitOriginalUiResponse({page,inputs,method:'POST',pathname:'/api/auth/sessions',transportProfile:selected}),originalPromise);await originalPromise;}
    assert.deepEqual(calls,[25000,75000]);const failure=new Error('original wait failure'),pending=Promise.reject(failure),page={waitForResponse:()=>pending};assert.strictEqual(waitOriginalUiResponse({page,inputs,method:'POST',pathname:'/api/auth/sessions',transportProfile:profile}),pending);await assert.rejects(pending,error=>error===failure);
});
const terminal=()=>({rejected:new Error('actual business fail retained'),result:{result:'fail',browserClosed:true,server:{closed:true}},lifecycle:{windowsStop:{result:'owned-tree-stopped',unregisteredProcessesStopped:0},terminalFrameReceived:true,pendingCallbacks:0,privateOriginalStdioRetained:true}});
test('an actual rejected business attempt still has true terminal writer closure and reaches the original observer-close path without any row cleanup',async()=>{
    const value=terminal(),facts=windowsUiActualCloseFacts(value),browser=windowsUiClosedBrowserFacade(value);assert(facts.browserClosed&&facts.serverClosed);assert.equal(facts.businessObserved,false);assert.equal(facts.rejected,true);
    let observerRestore=0,ownerEnd=0,rowCleanup=0;const report={result:'partial-preserved'},pgActive=false;
    assert.throws(()=>assert(!value.rejected));await browser.close();const writersStopped=!browser.isConnected()&&facts.serverClosed;
    if(writersStopped&&!pgActive){observerRestore++;ownerEnd++}if(report.result==='observed-comparison-pending')rowCleanup++;
    assert.deepEqual({observerRestore,ownerEnd,rowCleanup},{observerRestore:1,ownerEnd:1,rowCleanup:0});
    for(const mutate of[v=>v.result.browserClosed=false,v=>v.lifecycle.windowsStop.result='unknown',v=>v.lifecycle.windowsStop.unregisteredProcessesStopped=1,v=>v.lifecycle.pendingCallbacks=1,v=>v.lifecycle.terminalFrameReceived=false]){const altered=terminal();mutate(altered);assert.equal(windowsUiClosedBrowserFacade(altered),null);}
});
test('the actual runtime registers the close facade before fallible log retention and rejection, retaining the old restore and business-fail cleanup conditions',()=>{
    const source=fs.readFileSync(candidate+'windows-ui-runtime.mjs','utf8'),registered=source.indexOf('browser=windowsUiClosedBrowserFacade(windowsResult);'),retention=source.indexOf('await Promise.all(privateLogs)',registered),reject=source.indexOf('assert(!windowsResult.rejected',registered);
    assert(registered>0&&retention>registered&&reject>retention);assert(source.includes('if(pg&&writersStopped&&!pgActive)restored='));assert(source.includes("report.result==='observed-comparison-pending')await close('fixture-final-drain-and-double-zero'"));assert(!source.includes('process.exit('));
    const driver=fs.readFileSync(candidate+'windows-ui-driver.mjs','utf8');assert(driver.includes('playwright.expect.configure({timeout:transportProfile.expectTimeoutMs})'));assert(driver.includes('context.setDefaultTimeout(transportProfile.transportTimeoutMs)'));assert(driver.includes('context.setDefaultNavigationTimeout(transportProfile.transportTimeoutMs)'));assert(driver.includes('ackTimeoutMs:75000'));
});
test('original PID/nonce/parent/hash predicates and force-stop body stay exact; only fresh invocation-local inventory replaces per-member CIM calls',()=>{
    const section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
    for(const name of['windows-ui-process.ps1','windows-native-process.ps1']){const before=fs.readFileSync(original+name,'utf8'),after=fs.readFileSync(candidate+name,'utf8');
        assert.equal(section(after,'function Same-Path','# Invocation-local observations'),section(before,'function Same-Path','function Read-ProcessIdentity'));
        assert.equal(section(after,'function Assert-Root','function Read-Tree'),section(before,'function Assert-Root','function Read-Tree'));
        assert.equal(section(after,'$terminated = @();',"@{result='owned-tree-stopped'"),section(before,'$terminated = @();',"@{result='owned-tree-stopped'"));
        assert(after.indexOf('Refresh-ProcessInventory\n\nif ($Mode')>after.indexOf("if (-not $IsWindows)"));assert(after.indexOf('Refresh-ProcessInventory\n\nif ($Mode')>after.indexOf("if ($Mode -eq 'SelfTest')"));
        assert(!after.includes('Get-CimInstance -ClassName Win32_Process -Filter'));assert(after.includes('if ($script:processInventoryCalls -ge 2)'));assert(after.includes('$parentAliveUpper = $script:processInventory.upperTicks'));
        assert.equal(section(after,"@{exists=$true; bridgeId",' | ConvertTo-Json -Depth 8 -Compress'),section(before,"@{exists=$true; bridgeId",' | ConvertTo-Json -Depth 8 -Compress'));
    }
    const ui=fs.readFileSync(candidate+'windows-ui-process.ps1','utf8'),native=fs.readFileSync(candidate+'windows-native-process.ps1','utf8');assert.equal(ui.replaceAll('windows-ui-driver.mjs','windows-native-driver.mjs').replaceAll('Fixed UI driver identity rejected','Fixed Native driver identity rejected'),native);
    // The later Native UI3/UI4 capacity epoch separately proves exact budget-only deltas for bridge/owner.
    for(const name of['windows-native-app.mjs'])assert.equal(fs.readFileSync(candidate+name,'utf8'),fs.readFileSync(original+name,'utf8'),'No Native stdio/timer/owner change '+name);
});
