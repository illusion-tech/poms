// V2 stdio bridge. Credentials arrive only after Root ACKs the real Windows
// process identity. EOF/error rejects every waiter and cooperatively aborts UI.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import readline from 'node:readline';
import {createRequire} from 'node:module';
import {runUiJourneys} from './acceptance-ui-browser.mjs';
import {startManagedUiServer} from './ui-runtime-server.mjs';
import {SourceReader} from './acceptance-source.mjs';
import {browserLaunchArguments} from './ui-runtime-browser.mjs';
import {installUncachedUiInput} from './ui-runtime-cache.mjs';

export const BRIDGE_PREFIX = 'POMS_M_UI_BRIDGE_V2 ';
const NODE = 'C:\\Users\\ynh2\\AppData\\Roaming\\fnm\\node-versions\\v24.19.0\\installation\\node.exe';
const NODE_SHA = '3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = (b) => createHash('sha256').update(b).digest('hex');
export const windowsUiPrivateFailure=error=>({name:error?.name??typeof error,message:String(error?.message??error),stack:error?.stack??null,code:error?.code??null,...(error?.diagnostic===undefined?{}:{diagnostic:error.diagnostic}),...(Array.isArray(error?.privateCauses)?{causes:error.privateCauses}:{})});

export function windowsBrowserEnvironment(env){
    const allowed=new Set(['PATH','SYSTEMROOT','WINDIR','COMSPEC','PATHEXT','TEMP','TMP','USERPROFILE','HOMEDRIVE','HOMEPATH','APPDATA','LOCALAPPDATA','LANG','LC_ALL']);
    return Object.fromEntries(Object.entries(env).filter(([key,value])=>allowed.has(key.toUpperCase())&&typeof value==='string').map(([key,value])=>[key.toUpperCase(),value]));
}
export function validateRuntimeArrangement(value,sourceCapId){
    assert(value?.kind==='Root-R2M-UI-runtime-arrangement'&&value.sourceCapId===sourceCapId&&value.browserPlatform==='win32');
    assert(['windows-managed-nest','windows-external-rust'].includes(value.mode));
    if(value.mode==='windows-managed-nest')assert(value.apiBackend==='nest'&&value.apiPlatform==='win32'&&typeof value.actualNativeOwnerEvidenceSha256==='string'&&/^[0-9a-f]{64}$/.test(value.actualNativeOwnerEvidenceSha256));
    else assert(value.apiBackend==='rust'&&value.apiPlatform==='linux'&&/^[0-9a-f]{64}$/.test(value.actualExternalRustOwnerEvidenceSha256??''));
    return{kind:value.kind,sourceCapId:value.sourceCapId,browserPlatform:value.browserPlatform,mode:value.mode,apiBackend:value.apiBackend,apiPlatform:value.apiPlatform,...(value.actualNativeOwnerEvidenceSha256?{actualNativeOwnerEvidenceSha256:value.actualNativeOwnerEvidenceSha256}:{}),...(value.actualExternalRustOwnerEvidenceSha256?{actualExternalRustOwnerEvidenceSha256:value.actualExternalRustOwnerEvidenceSha256}:{}),runtimePlatformIndependentlyVerifiedByBrowser:false,RootMustRetainActualRuntimeOwnerProof:true};
}
async function runWindowsJourneys(options,bridge,signal){
    assert.equal(options.inputs?.origin,'http://127.0.0.1:10080');assert.equal(typeof options.inputs.sourceCapId,'string');
    const arrangement=validateRuntimeArrangement(options.runtimeArrangement,options.inputs.sourceCapId);
    assert(Array.isArray(options.sourcePins));for(const file of['tools/rust-r2m/acceptance-ui-browser.mjs','tools/rust-r2m/windows-ui-driver.mjs','tools/rust-r2m/windows-ui-process.ps1','tools/rust-r2m/bridge-windows-ui.mjs','tools/rust-r2m/ui-runtime-server.mjs','tools/rust-r2m/ui-runtime-cache.mjs'])assert(options.sourcePins.some(row=>row.file===file));
    const reader=new SourceReader({root:ROOT,pins:options.sourcePins,sourceEpoch:options.inputs.sourceCapId});for(const row of options.sourcePins)reader.read(row.file);const sources=reader.receipt(),pin=options.browserPin;assert(pin&&path.isAbsolute(pin.executable)&&/^[0-9a-f]{64}$/.test(pin.rawBytesSha256??''));
    const cache=path.join(ROOT,'tmp','rust-r2m','windows-browser-cache')+path.sep,oldCache=path.join(ROOT,'tmp','rust-r2ef','windows-browser-cache')+path.sep;
    const requested=path.resolve(pin.executable);assert(requested.startsWith(cache)||pin.readOnlyReusedExecutable===true&&requested.startsWith(oldCache));let current=path.parse(requested).root;for(const part of requested.slice(current.length).split(path.sep).filter(Boolean)){current=path.join(current,part);assert(!fs.lstatSync(current).isSymbolicLink())}assert(fs.lstatSync(requested).isFile());assert.equal(fs.realpathSync(requested).toLowerCase(),requested.toLowerCase());assert.equal(sha(fs.readFileSync(requested)),pin.rawBytesSha256);
    const require=createRequire(import.meta.url),playwright=require('@playwright/test');let browser,context,server,report,primaryFailure,cacheInput;const privateCloseFailures=[];
    const inputs=structuredClone(options.inputs);if(inputs.upload){assert(typeof inputs.upload.bodyBase64==='string'&&/^[0-9a-f]{64}$/.test(inputs.upload.sha256));inputs.upload.bytes=Buffer.from(inputs.upload.bodyBase64,'base64');assert.equal(sha(inputs.upload.bytes),inputs.upload.sha256);delete inputs.upload.bodyBase64}
    const cancel=()=>{if(context)void context.close().catch(error=>privateCloseFailures.push({stage:'abort-context-close',...windowsUiPrivateFailure(error)}))};signal.addEventListener('abort',cancel,{once:true});
    try{
        assert(options.server?.backend===arrangement.apiBackend);server=await startManagedUiServer({...options.server,sourceCapId:inputs.sourceCapId,
            onBeforeExchange:info=>bridge.request('callback',{phase:'before-exchange',info}),onAfterExchange:info=>bridge.request('callback',{phase:'after-exchange',info}),retain:info=>bridge.request('callback',{phase:'private-evidence',info})});
        browser=await playwright.chromium.launch({executablePath:requested,headless:true,env:windowsBrowserEnvironment(process.env),args:browserLaunchArguments()});context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,locale:'zh-CN'});const page=await context.newPage();
        cacheInput=await installUncachedUiInput({context,page,sourceCapId:inputs.sourceCapId,retain:info=>bridge.request('callback',{phase:'private-evidence',info})});
        report=await runUiJourneys({page,context,expect:playwright.expect,inputs,signal,selection:options.selection,
            onBeforeStep:async info=>{let actualBrowserSession;if(info.details?.fixtureOperation?.operation==='expire-owned-ui-session'){const cookie=(await context.cookies()).find(row=>row.name==='poms_session');assert(cookie?.value);actualBrowserSession={kind:'actual-owned-Windows-browser-current-session-cookie-hash',cookieName:'poms_session',tokenHash:sha(Buffer.from(cookie.value)),httpOnly:cookie.httpOnly,path:cookie.path,role:info.details.fixtureOperation.role}}return bridge.request('callback',{phase:'before',info:{...info,...(actualBrowserSession?{actualBrowserSession}:{})}})},onAfterStep:async info=>{await server.idle();return bridge.request('callback',{phase:'after',info:{...info,serverIdle:true}})},
            async retainScreenshot({label,bytes,sourceCapId}){return bridge.request('callback',{phase:'screenshot',info:{label,sourceCapId,bytes:bytes.length,rawBytesSha256:sha(bytes),bodyBase64:bytes.toString('base64')}})},
            retainFailure:info=>bridge.request('callback',{phase:'failure-evidence',info}),
            async retainDownload({download,label,sourceCapId}){const stream=await download.createReadStream();assert(stream);const chunks=[];let length=0;for await(const chunk of stream){length+=chunk.length;assert(length<=4*1024*1024);chunks.push(chunk)}const bytes=Buffer.concat(chunks),receipt=await bridge.request('callback',{phase:'download',info:{label,sourceCapId,bytes:bytes.length,rawBytesSha256:sha(bytes),bodyBase64:bytes.toString('base64')}});return{bytes,privateEvidence:receipt}}
        });
    }catch(error){primaryFailure=error}finally{
        const closeout=[];for(const[name,item]of[['context',context],['browser',browser]])if(item)try{await item.close();closeout.push({name,result:'closed'})}catch(error){privateCloseFailures.push({stage:name,...windowsUiPrivateFailure(error)});closeout.push({name,result:'incomplete'})}
        if(server)try{await server.close();closeout.push({name:'server',result:'closed'})}catch(error){privateCloseFailures.push({stage:'server',...windowsUiPrivateFailure(error)});closeout.push({name:'server',result:'incomplete'})}
        signal.removeEventListener('abort',cancel);report??={result:'fail'};report.browserCloseout=closeout;report.browserClosed=!!browser&&!browser.isConnected();report.browserPlatform='win32';report.runtimeArrangement=arrangement;report.sourcePins=sources;report.browserExecutable={file:requested,rawBytesSha256:pin.rawBytesSha256};report.G3Certified=false;
        report.server=server?.report??null;report.browserCacheInput=cacheInput??null;report.browserLaunchArguments=browserLaunchArguments();try{reader.assertUnchanged()}catch(error){privateCloseFailures.push({stage:'source-unchanged',...windowsUiPrivateFailure(error)})}
        if(!report.browserClosed||closeout.some(row=>row.result!=='closed')||primaryFailure||privateCloseFailures.length)report.result='fail';
    }
    if(primaryFailure||privateCloseFailures.length){const error=primaryFailure??new Error('Windows UI owner close or source proof failed');error.report=report;error.privateCauses=privateCloseFailures;throw error}
    return report;
}

// Exported only to exercise lifecycle failure paths with in-memory streams.
export function createDriverBridge({ input, output, controller, ackTimeoutMs = 45000, configurationTimeoutMs = 15000 }) {
    const pending = new Map(); let sequence = 0, closing = false, failed, profileAcknowledged = false, configured = false;
    let configResolve, configReject;
    const configuration = new Promise((resolve, reject) => { configResolve = resolve; configReject = reject; });
    configuration.catch(() => {});
    const timer = setTimeout(() => fail('configuration-deadline'), configurationTimeoutMs); timer.unref?.();
    function emit(value) {
        if (output.destroyed || output.writableEnded) { fail('stdout-closed'); return; }
        try { output.write(BRIDGE_PREFIX + JSON.stringify(value) + '\n'); } catch { fail('stdout-error'); }
    }
    function fail(code) {
        if (failed || closing) return;
        failed = new Error('UI bridge ' + code); clearTimeout(timer); configReject(failed);
        for (const item of pending.values()) { clearTimeout(item.timer); item.reject(failed); }
        pending.clear(); if (!controller.signal.aborted) controller.abort(failed);
    }
    const lines = readline.createInterface({ input, crlfDelay: Infinity });
    lines.on('line', (line) => {
        if (failed || closing) return;
        try {
            assert(line.length <= 4 * 1024 * 1024);
            const value = JSON.parse(line);
            if (value.type === 'abort') { fail('Root-abort'); return; }
            if (value.type === 'configuration') {
                assert(profileAcknowledged && !configured); configured = true; clearTimeout(timer); configResolve(value.options); return;
            }
            assert.equal(value.type, 'ack'); const item = pending.get(value.id); assert(item);
            pending.delete(value.id); clearTimeout(item.timer);
            if (!value.ok) { item.reject(new Error('Root rejected UI bridge request')); fail('Root-rejection'); return; }
            if (item.type === 'profile') profileAcknowledged = true;
            item.resolve(value.receipt ?? value.identity ?? null);
        } catch { fail('invalid-input'); }
    });
    lines.on('close', () => { if (!closing) fail('stdin-EOF'); });
    lines.on('error', () => fail('readline-error'));
    input.on('error', () => fail('stdin-error')); output.on('error', () => fail('stdout-error'));
    function request(type, fields = {}) {
        if (failed || closing) return Promise.reject(failed ?? new Error('UI bridge is closing'));
        const id = ++sequence;
        const result = new Promise((resolve, reject) => {
            const deadline = setTimeout(() => fail(type + '-ACK-deadline'), ackTimeoutMs); deadline.unref?.();
            pending.set(id, { type, resolve, reject, timer: deadline }); emit({ type, id, ...fields });
        });
        result.catch(() => {}); return result;
    }
    return { configuration, request, emit, fail,
        pendingCount: () => pending.size,
        close() { closing = true; clearTimeout(timer); configReject(new Error('UI bridge closed')); for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error('UI bridge closed')); } pending.clear(); lines.close(); input.pause(); }
    };
}

async function main() {
    assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.19.0');
    assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--bridge-id');
    const bridgeId = process.argv[3]; assert(/^[0-9a-f-]{36}$/.test(bridgeId));
    process.chdir(ROOT);
    const executable = fs.realpathSync(process.execPath), driverPath = fs.realpathSync(fileURLToPath(import.meta.url));
    assert.equal(executable.toLowerCase(), NODE.toLowerCase()); assert.equal(sha(fs.readFileSync(executable)), NODE_SHA);
    const controller = new AbortController();
    const bridge = createDriverBridge({ input: process.stdin, output: process.stdout, controller });
    let uiTimer;
    try {
        await bridge.request('profile', { bridgeId, windowsPid: process.pid, node: process.version, executable,
            executableRawBytesSha256: NODE_SHA, driverPath, driverRawBytesSha256: sha(fs.readFileSync(driverPath)),
            driverArgv: process.argv.slice(), credentialInputsRecorded: false });
        const options = await bridge.configuration;
        const totalMs = options.totalTimeoutMs ?? 300000; assert(Number.isInteger(totalMs) && totalMs >= 1000 && totalMs <= 360000);
        uiTimer = setTimeout(() => bridge.fail('driver-total-deadline'), totalMs); uiTimer.unref();
        const report = await runWindowsJourneys(options,bridge,controller.signal);
        clearTimeout(uiTimer);
        // Keep the verified Windows anchor until Root inspects the closed tree.
        await bridge.request(report.result==='observed'?'result':'failure', { report });
    } catch (error) {
        clearTimeout(uiTimer); process.exitCode = 1;
        const failure = { report: error.report ?? null, name: error.name,
            message: error.report ? 'Actual browser attempt failed; preserved public report' : 'UI driver aborted before a completed browser report',privateFailure:windowsUiPrivateFailure(error) };
        if (controller.signal.aborted) bridge.emit({ type: 'failure', id: 0, ...failure });
        else { try { await bridge.request('failure', failure); } catch { /* Root/stdio already lost. */ } }
    } finally { bridge.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
    await main();
}
