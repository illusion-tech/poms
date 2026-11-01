// Pure clocks, streams, process/FS adapters and source bytes only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PassThrough} from 'node:stream';
import {EventEmitter} from 'node:events';
import {driveWindowsUi} from './bridge-windows-ui.mjs';
import {BRIDGE_PREFIX} from './windows-ui-driver.mjs';
import {windowsUiExecutionBudget,windowsUiBridgeBudget,validateWindowsUiBridgeBudget,
    createWindowsUiPipelineDeadline,windowsUiCommandEnvironment} from './windows-ui-budget.mjs';

test('each exact single Windows journey has the same finite nested deadlines; a stacked or foreign journey is rejected',()=>{
    for(const id of ['UI1','UI2','UI3','UI4']){
        const policy=windowsUiExecutionBudget([id]),budget=windowsUiBridgeBudget([id],0);
        assert.equal(policy.commandTimeoutMs,1200000);assert.equal(policy.pipelineTimeoutMs,900000);
        assert.equal(budget.totalTimeoutMs,840000);assert.equal(budget.driverTimeoutMs,780000);
        assert.deepEqual(validateWindowsUiBridgeBudget(budget,[id]),budget);
        for(const changed of [{...budget,totalTimeoutMs:840001},{...budget,driverTimeoutMs:840000},{...budget,kind:'foreign'},{...budget,extra:true}])assert.throws(()=>validateWindowsUiBridgeBudget(changed,[id]));
    }
    for(const selection of [[],['UI1','UI4'],['UI1','UI1'],['UI5'],null])assert.throws(()=>windowsUiExecutionBudget(selection));
});

test('the actual preparation interval reduces both inner budgets and the pipeline abort remains separate from cleanup',()=>{
    let now=1000,callback,cleared=false,requested;const controller=new AbortController();
    const deadline=createWindowsUiPipelineDeadline({selection:['UI4'],controller,now:()=>now,
        setTimer(fn,ms){callback=fn;requested=ms;return 7},clearTimer(id){assert.equal(id,7);cleared=true}});
    assert.equal(requested,900000);now+=180000;
    const budget=deadline.beforeBrowser();assert.equal(budget.elapsedPreparationMs,180000);assert.equal(budget.totalTimeoutMs,720000);assert.equal(budget.driverTimeoutMs,660000);
    callback();assert(controller.signal.aborted);assert.throws(()=>deadline.beforeBrowser(),/pipeline-deadline/);
    deadline.close();assert(cleared);assert.throws(()=>windowsUiBridgeBudget(['UI4'],840000),/insufficient/);
    assert.throws(()=>windowsUiBridgeBudget(['UI4'],-1));assert.throws(()=>windowsUiBridgeBudget(['UI4'],1.5));
});

test('only the original system and WSL transport fields reach the owned Windows pipeline',()=>{
    const input={PATH:'/pure/bin',HOME:'/pure/home',LANG:'C.UTF-8',WSL_INTEROP:'/run/WSL/123_interop',WSLENV:'PATH/l',DISPLAY:':0',WAYLAND_DISPLAY:'wayland-0',XDG_RUNTIME_DIR:'/mnt/wslg/runtime-dir',JWT_SECRET:'pure-secret',DATABASE_URL:'pure-db',NODE_OPTIONS:'--require foreign',LD_LIBRARY_PATH:'/foreign'};
    const result=windowsUiCommandEnvironment(input);assert.equal(result.WSL_INTEROP,input.WSL_INTEROP);assert.equal(result.WSLENV,input.WSLENV);
    assert.deepEqual(Object.keys(result),['PATH','HOME','LANG','WSLENV','WSL_INTEROP','DISPLAY','WAYLAND_DISPLAY','XDG_RUNTIME_DIR']);
});

test('the production three-callsite chain starts the pipeline before preparation and preserves each callback identity check',()=>{
    const runtime=fs.readFileSync(new URL('./windows-ui-runtime.mjs',import.meta.url),'utf8'),bridge=fs.readFileSync(new URL('./bridge-windows-ui.mjs',import.meta.url),'utf8'),driver=fs.readFileSync(new URL('./windows-ui-driver.mjs',import.meta.url),'utf8');
    assert(runtime.indexOf('const pipelineDeadline=')<runtime.indexOf('f=await Fixture.open'));
    assert(runtime.includes('pipelineDeadline.beforeBrowser()'));assert(runtime.includes('pipelineDeadline.close();'));
    assert(runtime.includes("require('./windows-ui-command-owner.cjs')"));assert(runtime.includes('env:windowsUiCommandEnvironment(process.env)'));
    assert(runtime.includes('totalTimeoutMs:windowsUiBudget.totalTimeoutMs'));assert(runtime.includes('timeoutMs:windowsUiExecutionBudget(options.selection,options.backend).commandTimeoutMs'));
    assert(bridge.includes('await inspectCurrent();if(!accepting)'));assert(bridge.includes('options: { ...options, totalTimeoutMs:driverTimeoutMs }'));
    assert(driver.includes('validateWindowsUiBridgeBudget(options.windowsUiBudget,options.selection,options.runtimeArrangement?.apiBackend)'));assert(driver.includes('assert.equal(totalMs,executionBudget.driverTimeoutMs)'));
});

test('the real c01 bridge sends the shorter driver budget only after the identity ACK and inspects every actual callback',{timeout:4000},async()=>{
    const child=new EventEmitter();Object.assign(child,{pid:190001,stdin:new PassThrough(),stdout:new PassThrough(),stderr:new PassThrough(),unref(){}});
    const bridgeId='10000000-0000-4000-8000-000000000001',driverSha='a'.repeat(64),node='C:\\Users\\ynh2\\AppData\\Roaming\\fnm\\node-versions\\v24.19.0\\installation\\node.exe',driver='E:\\projects\\worktrees\\poms-r2ef-foundation-audit\\poms\\tools\\rust-r2m-continuation01\\windows-ui-driver.mjs',nodeSha='3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237';
    const owner={pid:190002,parentPid:1,startTimeUtcTicks:'638900000000000000',cimCreationUtcTicks:'638900000000000000',executablePath:node,executableSha256:nodeSha,depth:0};
    const budget=windowsUiBridgeBudget(['UI4'],180000),frames=[],inspections=[],acks=new Set(),callbacks=[];
    child.stdin.on('data',bytes=>{for(const line of bytes.toString().trim().split('\n')){
        const value=JSON.parse(line);frames.push(value);
        if(value.type==='configuration'){
            assert(frames.some(row=>row.type==='ack'&&row.id===1&&row.ok));
            assert.equal(value.options.totalTimeoutMs,660000);assert.deepEqual(value.options.windowsUiBudget,budget);
            for(const id of[2,3])child.stdout.write(BRIDGE_PREFIX+JSON.stringify({type:'callback',id,phase:id===2?'before-exchange':'after-exchange',info:{pure:true}})+'\n');
        }
        if(value.type==='ack'&&[2,3].includes(value.id)){acks.add(value.id);if(acks.size===2)child.stdout.write(BRIDGE_PREFIX+JSON.stringify({type:'result',id:4,report:{result:'observed',syntheticPureTransportOnly:true}})+'\n')}
        if(value.type==='ack'&&value.id===4)child.emit('exit',0,null);
    }});
    const running=driveWindowsUi({child,options:{selection:['UI4'],windowsUiBudget:budget},bridgeId,driverSha,append(){},totalTimeoutMs:budget.totalTimeoutMs,
        graceMs:100,queueGraceMs:200,identityTimeoutMs:100,async inspect(mode){inspections.push(mode);return mode==='Stop'?{result:'owned-tree-stopped',unregisteredProcessesStopped:0}:{exists:true,bridgeId,root:owner,members:[owner]}},
        async onCallback(phase){callbacks.push(phase);return{synthetic:true}},async retain(){return{file:'/home/wangzishi/.local/share/poms-r2m-continuation01/private/pure/1.json',bytes:1,rawBytesSha256:'b'.repeat(64)}}});
    child.stdout.write(BRIDGE_PREFIX+JSON.stringify({type:'profile',id:1,bridgeId,windowsPid:owner.pid,node:'v24.19.0',executable:node,executableRawBytesSha256:nodeSha,driverPath:driver,driverRawBytesSha256:driverSha,driverArgv:[node,driver,'--bridge-id',bridgeId]})+'\n');
    const result=await running;assert.equal(result.rejected,undefined);assert.deepEqual(callbacks,['before-exchange','after-exchange']);
    assert.equal(inspections.filter(mode=>mode==='Inspect').length,4);assert.equal(inspections.at(-1),'Stop');
    assert.equal(result.lifecycle.totalTimeoutMs,720000);assert.equal(result.lifecycle.driverTimeoutMs,660000);assert.equal(result.lifecycle.pendingCallbacks,0);
});

test('the real identity-gated bridge admits only the bound Native UI4 capacity and forwards840s after the fresh ACK',{timeout:4000},async()=>{
    const child=new EventEmitter();Object.assign(child,{pid:190001,stdin:new PassThrough(),stdout:new PassThrough(),stderr:new PassThrough(),unref(){}});
    const bridgeId='10000000-0000-4000-8000-000000000001',driverSha='a'.repeat(64),node='C:\\Users\\ynh2\\AppData\\Roaming\\fnm\\node-versions\\v24.19.0\\installation\\node.exe',driver='E:\\projects\\worktrees\\poms-r2ef-foundation-audit\\poms\\tools\\rust-r2m-continuation01\\windows-ui-driver.mjs',nodeSha='3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237';
    const owner={pid:190002,parentPid:1,startTimeUtcTicks:'638900000000000000',cimCreationUtcTicks:'638900000000000000',executablePath:node,executableSha256:nodeSha,depth:0};
    const budget=windowsUiBridgeBudget(['UI4'],0,'nest'),frames=[],inspections=[],acks=new Set(),callbacks=[];
    child.stdin.on('data',bytes=>{for(const line of bytes.toString().trim().split('\n')){
        const value=JSON.parse(line);frames.push(value);
        if(value.type==='configuration'){
            assert(frames.some(row=>row.type==='ack'&&row.id===1&&row.ok));
            assert.equal(value.options.totalTimeoutMs,840000);assert.deepEqual(value.options.windowsUiBudget,budget);
            for(const id of[2,3])child.stdout.write(BRIDGE_PREFIX+JSON.stringify({type:'callback',id,phase:id===2?'before-exchange':'after-exchange',info:{pure:true}})+'\n');
        }
        if(value.type==='ack'&&[2,3].includes(value.id)){acks.add(value.id);if(acks.size===2)child.stdout.write(BRIDGE_PREFIX+JSON.stringify({type:'result',id:4,report:{result:'observed',syntheticPureTransportOnly:true}})+'\n')}
        if(value.type==='ack'&&value.id===4)child.emit('exit',0,null);
    }});
    const running=driveWindowsUi({child,options:{selection:['UI4'],windowsUiBudget:budget,runtimeArrangement:{apiBackend:'nest'}},bridgeId,driverSha,append(){},totalTimeoutMs:budget.totalTimeoutMs,
        graceMs:100,queueGraceMs:200,identityTimeoutMs:100,async inspect(mode){inspections.push(mode);return mode==='Stop'?{result:'owned-tree-stopped',unregisteredProcessesStopped:0}:{exists:true,bridgeId,root:owner,members:[owner]}},
        async onCallback(phase){callbacks.push(phase);return{synthetic:true}},async retain(){return{file:'/home/wangzishi/.local/share/poms-r2m-continuation01/private/pure/1.json',bytes:1,rawBytesSha256:'b'.repeat(64)}}});
    child.stdout.write(BRIDGE_PREFIX+JSON.stringify({type:'profile',id:1,bridgeId,windowsPid:owner.pid,node:'v24.19.0',executable:node,executableRawBytesSha256:nodeSha,driverPath:driver,driverRawBytesSha256:driverSha,driverArgv:[node,driver,'--bridge-id',bridgeId]})+'\n');
    const result=await running;assert.equal(result.rejected,undefined);assert.deepEqual(callbacks,['before-exchange','after-exchange']);
    assert.equal(inspections.filter(mode=>mode==='Inspect').length,4);assert.equal(inspections.at(-1),'Stop');
    assert.equal(result.lifecycle.totalTimeoutMs,900000);assert.equal(result.lifecycle.driverTimeoutMs,840000);assert.equal(result.lifecycle.pendingCallbacks,0);
});
