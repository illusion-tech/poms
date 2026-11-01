// Root-owned DB/fixture hooks plus a bounded, identity-verified Windows bridge.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import readline from 'node:readline';
import { createRequire } from 'node:module';
import { createHash, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { BRIDGE_PREFIX } from './windows-ui-driver.mjs';
import {SourceReader} from './acceptance-source.mjs';
import {validateWindowsUiBridgeBudget,windowsUiExecutionBudget} from './windows-ui-budget.mjs';

const require = createRequire(import.meta.url), execFileAsync = promisify(execFile);
const WINDOWS_ROOT = 'E:\\projects\\worktrees\\poms-r2ef-foundation-audit\\poms';
const WINDOWS_MOUNT = '/mnt/e/projects/worktrees/poms-r2ef-foundation-audit/poms';
const WINDOWS_NODE = '/mnt/c/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe';
const WINDOWS_EXE = 'C:\\Users\\ynh2\\AppData\\Roaming\\fnm\\node-versions\\v24.19.0\\installation\\node.exe';
const WINDOWS_NODE_SHA = '3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237';
const WINDOWS_DRIVER = WINDOWS_ROOT + '\\tools\\rust-r2m-continuation01\\windows-ui-driver.mjs';
// Read-only Get-Command inspection selected this existing PowerShell 7.6.5.
const WINDOWS_PWSH = '/mnt/c/Users/ynh2/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe';
const WINDOWS_PROCESS = WINDOWS_ROOT + '\\tools\\rust-r2m-continuation01\\windows-ui-process.ps1';
// Read-only own-family probes measured this SystemRoot infrastructure image.
const WINDOWS_CONHOST = 'C:\\Windows\\System32\\conhost.exe';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const samePath = (a, b) => typeof a === 'string' && typeof b === 'string' && a.replaceAll('/', '\\').toLowerCase() === b.replaceAll('/', '\\').toLowerCase();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function bounded(promise, ms, label) {
    let timer;
    try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label)), ms); })]); }
    finally { clearTimeout(timer); }
}

export function validateWindowsProfile(profile, bridgeId, driverSha) {
    assert.equal(profile.bridgeId, bridgeId); assert(Number.isSafeInteger(profile.windowsPid) && profile.windowsPid > 0 && profile.windowsPid <= 2147483647);
    assert.equal(profile.node, 'v24.19.0'); assert(samePath(profile.executable, WINDOWS_EXE));
    assert.equal(profile.executableRawBytesSha256, WINDOWS_NODE_SHA); assert(samePath(profile.driverPath, WINDOWS_DRIVER));
    assert.equal(profile.driverRawBytesSha256, driverSha); assert.equal(profile.driverArgv.length, 4);
    assert(samePath(profile.driverArgv[0], WINDOWS_EXE) && samePath(profile.driverArgv[1], WINDOWS_DRIVER));
    assert.equal(profile.driverArgv[2], '--bridge-id'); assert.equal(profile.driverArgv[3], bridgeId);
}
export function isAttestedConsoleHost(member, root) {
    return !!member && !!root && member.pid !== root.pid && member.parentPid === root.pid && member.depth === 1
        && samePath(member.executablePath, WINDOWS_CONHOST)
        && /^[0-9]{15,20}$/.test(member.startTimeUtcTicks ?? '') && /^[0-9]{15,20}$/.test(member.cimCreationUtcTicks ?? '')
        && /^[0-9]{15,20}$/.test(root.startTimeUtcTicks ?? '') && /^[0-9]{15,20}$/.test(root.cimCreationUtcTicks ?? '')
        && BigInt(member.startTimeUtcTicks) >= BigInt(root.startTimeUtcTicks)
        && BigInt(member.cimCreationUtcTicks) >= BigInt(root.cimCreationUtcTicks);
}
export function windowsIdentityDiagnostic({ mode, processId, bridgeId, stage, elapsedMs, args, error, stdout = '', stderr = '' }) {
    const field = (value) => {
        const text = Buffer.isBuffer(value) ? value.toString('utf8') : String(value ?? ''), bytes = Buffer.from(text);
        return { bytes: bytes.length, sha256: sha(bytes), text: text.slice(0, 65536), previewTruncated: text.length > 65536 };
    };
    return { kind: 'Windows-identity-command-diagnostic', mode, windowsPid: processId, bridgeId, stage, elapsedMs,
        executable: WINDOWS_PWSH, args, exitCode: error?.code ?? 0, signal: error?.signal ?? null, killed: !!error?.killed,
        name: error?.name ?? null, message: String(error?.message ?? '').slice(0, 12000),
        stdout: field(stdout), stderr: field(stderr),
        scope: 'Only fixed public identity-command argv/stdin; no UI configuration, credentials, cookies or DB diagnostics' };
}
async function windowsProcess(mode, processId, bridgeId, expected) {
    const args = ['-NoLogo', '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-File', WINDOWS_PROCESS,
        '-Mode', mode, '-BridgeId', bridgeId];
    if (processId) args.push('-ProcessId', String(processId));
    const started = Date.now(); let result;
    try {
        const child = execFileAsync(WINDOWS_PWSH, args, { windowsHide: true, encoding: 'utf8', timeout: 20000, maxBuffer: 2 * 1024 * 1024 });
        child.child.stdin.end(expected ? JSON.stringify(expected) : ''); result = await child;
        return JSON.parse(result.stdout.replace(/^\ufeff/, '').trim());
    } catch (cause) {
        const diagnostic = windowsIdentityDiagnostic({ mode, processId, bridgeId, args, stage: result ? 'JSON-parse' : 'process-execution',
            elapsedMs: Date.now() - started, error: cause, stdout: result?.stdout ?? cause.stdout, stderr: result?.stderr ?? cause.stderr });
        const error = new Error(`Windows identity ${mode} failed (${diagnostic.stage}): ${diagnostic.message}`);
        error.name = 'WindowsIdentityError'; error.diagnostic = diagnostic; throw error;
    }
}

// Injectable transport/identity operations permit pure EOF/deadline tests. Real
// use passes only the controlled child, native callbacks and Windows PS helper.
export async function driveWindowsUi({ child, options, bridgeId, driverSha, append, onCallback,
    inspect = windowsProcess, retain,signal, totalTimeoutMs = 300000, graceMs = 20000, queueGraceMs = 60000, identityTimeoutMs = 20000 }) {
    const executionBudget=options.windowsUiBudget?validateWindowsUiBridgeBudget(options.windowsUiBudget,options.selection,options.runtimeArrangement?.apiBackend):null;
    if(executionBudget)assert.equal(totalTimeoutMs,executionBudget.totalTimeoutMs);
    assert(Number.isInteger(totalTimeoutMs) && totalTimeoutMs >= 1 && totalTimeoutMs <= (executionBudget?windowsUiExecutionBudget(options.selection,options.runtimeArrangement?.apiBackend).bridgeMaximumMs:360000));
    const driverTimeoutMs=executionBudget?.driverTimeoutMs??totalTimeoutMs;
    let profile, identity, result, rejected, terminal = false, exitedStatus, aborted = false, accepting = true, finished = false;
    const history = new Map(), inspections = [], lifecycle = { bridgeId, totalTimeoutMs, driverTimeoutMs, graceMs, queueGraceMs,...(executionBudget?{executionBudget}:{}),
        windowsPidSource: 'driver process.pid, never WSL child.pid', interopWrapperPid: child.pid, forcedStop: false };
    let resolveExit, resolveAbort;
    const exited = new Promise((resolve) => { resolveExit = resolve; });
    const abortGate = new Promise((resolve) => { resolveAbort = resolve; });
    function send(value) {
        if (!child.stdin.destroyed && !child.stdin.writableEnded) {
            try { child.stdin.write(JSON.stringify(value) + '\n'); } catch { abort('stdin-write-error'); }
        }
    }
    function abort(code) {
        if (aborted || finished) return; aborted = true; accepting = false; lifecycle.abortReason = code;
        rejected ??= new Error(code); send({ type: 'abort', reason: code }); resolveAbort();
    }
    const onSignal = () => abort('Root-cancel'); signal?.addEventListener('abort', onSignal, { once: true });
    const timer = setTimeout(() => abort('total-deadline'), totalTimeoutMs);
    const profileTimer = setTimeout(() => abort('profile-deadline'), Math.min(totalTimeoutMs, 15000));
    if (signal?.aborted) abort('Root-cancel');
    function register(snapshot) {
        assert(snapshot.exists && snapshot.root && /^[0-9]{15,20}$/.test(snapshot.root.startTimeUtcTicks));
        assert.equal(snapshot.bridgeId, bridgeId); assert(samePath(snapshot.root.executablePath, WINDOWS_EXE));
        assert.equal(snapshot.root.executableSha256, WINDOWS_NODE_SHA);
        if (identity) assert.equal(snapshot.root.startTimeUtcTicks, identity.root.startTimeUtcTicks);
        for (const member of snapshot.members) history.set(member.pid + ':' + member.startTimeUtcTicks, member);
        identity = { ...snapshot, members: [...history.values()] }; inspections.push(snapshot);
    }
    async function inspectCurrent() {
        assert(profile); const snapshot = await bounded(inspect('Inspect', profile.windowsPid, bridgeId, identity), identityTimeoutMs, 'Windows-identity-deadline');
        if (snapshot.exists) register(snapshot); return snapshot;
    }
    let queue = Promise.resolve(),privateEvidence=Promise.resolve(),privateRetentionFailed=false;const callbackTasks=new Set();
    async function preserveFailure(stage,error){
        const failure={stage,category:'Windows-UI-required-owner-or-evidence-failed',rawErrorIncluded:false};
        try{assert.equal(typeof retain,'function');const receipt=await retain({kind:'actual-Windows-UI-original-failure-private',record:{bridgeId,stage,error:{name:error?.name??typeof error,message:String(error?.message??error),stack:error?.stack??null,code:error?.code??null,...(error?.diagnostic===undefined?{}:{diagnostic:error.diagnostic}),...(Array.isArray(error?.causes)?{causes:error.causes}:{})}}});assert(typeof receipt?.file==='string'&&receipt.file.startsWith('/home/wangzishi/.local/share/poms-r2m-continuation01/private/')&&Number.isSafeInteger(receipt.bytes)&&/^[0-9a-f]{64}$/.test(receipt.rawBytesSha256??''));failure.privateEvidence={file:receipt.file,bytes:receipt.bytes,rawBytesSha256:receipt.rawBytesSha256,private:true}}
        catch{privateRetentionFailed=true;failure.privateRetentionFailed=true;abort('private-original-failure-retention-failed')}
        return failure;
    }
    const reader = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
    const saveStdio=(stream,bytes)=>{if(!retain)return;const raw=Buffer.from(bytes);privateEvidence=privateEvidence.then(()=>retain({kind:'actual-Windows-UI-original-stdio-private',record:{bridgeId,stream,bytes:raw.length,rawBytesSha256:sha(raw),bodyBase64:raw.toString('base64')}})).catch(()=>{privateRetentionFailed=true;abort('private-original-stdio-retention-failed')})};
    child.stdout.on('data',bytes=>saveStdio('stdout',bytes));child.stderr.on('data',bytes=>saveStdio('stderr',bytes));
    const publicStderr = (bytes) => append(JSON.stringify({kind:'Windows-driver-stderr-hash-only',bytes:bytes.length,rawBytesSha256:sha(bytes),textExported:false}));
    child.stderr.on('data', publicStderr);
    child.stdin.on('error', () => abort('stdin-error')); child.stdout.on('error', () => abort('stdout-error'));
    child.stderr.on('error', () => abort('stderr-error'));
    child.once('error', (error) => {privateEvidence=privateEvidence.then(async()=>{(lifecycle.privateDriverFailures??=[]).push(await preserveFailure('interop-spawn-error',error))});abort('interop-spawn-error'); exitedStatus = { code: null, signal: null, spawnError: true }; resolveExit(exitedStatus); });
    child.once('exit', (code, exitSignal) => { exitedStatus = { code, signal: exitSignal }; resolveExit(exitedStatus); });
    reader.on('close', () => { if (!terminal) abort('stdout-EOF-before-result'); });
    reader.on('error', () => abort('reader-error'));
    reader.on('line', (line) => {
        if (line.length > 8 * 1024 * 1024) { abort('oversize-frame'); return; }
        append(JSON.stringify({kind:'Windows-driver-frame-hash-only',bytes:Buffer.byteLength(line),rawBytesSha256:sha(Buffer.from(line)),textExported:false})); if (!line.startsWith(BRIDGE_PREFIX)) return;
        queue = queue.then(async () => {
            const message = JSON.parse(line.slice(BRIDGE_PREFIX.length));
            if(message.privateFailure)(lifecycle.privateDriverFailures??=[]).push(await preserveFailure('driver-original-failure',message.privateFailure));
            if (message.type === 'profile') {
                assert(!profile && !aborted); validateWindowsProfile(message, bridgeId, driverSha); profile = message;
                const snapshot = await inspectCurrent(); assert(snapshot.exists); assert.equal(snapshot.root.pid, message.windowsPid);
                if (aborted) return;
                clearTimeout(profileTimer); lifecycle.profileAcknowledged = true;
                send({ type: 'ack', id: message.id, ok: true, identity: snapshot.root });
                // Credentials are never sent until the Windows identity gate ACK.
                send({ type: 'configuration', options: { ...options, totalTimeoutMs:driverTimeoutMs } }); return;
            }
            if (message.type === 'failure' && !lifecycle.profileAcknowledged) {
                assert(!message.report, 'UI report before Windows identity ACK');
                terminal = true; rejected ??= new Error('driver-aborted-before-identity-ACK'); return;
            }
            assert(profile && lifecycle.profileAcknowledged, 'UI activity before Windows identity ACK');
            if (message.type === 'result' || message.type === 'failure') {
                await Promise.all([...callbackTasks]);
                result = message.report; terminal = true;
                if (message.type === 'failure') rejected ??= new Error('driver-reported-failure');
                let snapshot = await inspectCurrent();
                const hasBrowserMembers = (value) => value.exists && value.members.some((member) => member.pid !== value.root.pid && !isAttestedConsoleHost(member, value.root));
                for (let attempt = 0; hasBrowserMembers(snapshot) && attempt < 3; attempt++) {
                    await delay(300); snapshot = await inspectCurrent();
                }
                if (hasBrowserMembers(snapshot)) {
                    abort('owned-browser-descendants-remain'); return;
                }
                send({ type: 'ack', id: message.id, ok: true }); return;
            }
            assert.equal(message.type, 'callback');
            lifecycle.browserActivityObserved = true;
            if (!accepting) { send({ type: 'ack', id: message.id, ok: false }); return; }
            // Actual browser HTTP can overlap. Keep identity admission on every
            // callback, but let a prior after-exchange certificate release a
            // later before-exchange wait instead of deadlocking this reader.
            const task=Promise.resolve().then(async()=>{
                await inspectCurrent();if(!accepting){send({type:'ack',id:message.id,ok:false});return}
                try{const receipt=await onCallback(message.phase,message.info);send({type:'ack',id:message.id,ok:!aborted,receipt:receipt??null})}
                catch(error){(lifecycle.callbackFailures??=[]).push(await preserveFailure('Root-callback-failed',error));rejected??=new Error('Root-callback-failed');send({type:'ack',id:message.id,ok:false});abort('Root-callback-failed')}
            }).catch(async error=>{(lifecycle.callbackFailures??=[]).push(await preserveFailure('Root-callback-identity-failed',error));rejected??=new Error('Root-callback-identity-failed');send({type:'ack',id:message.id,ok:false});abort('Root-callback-identity-failed')}).finally(()=>callbackTasks.delete(task));callbackTasks.add(task);
        }).catch(async(error) => {
            const failure = await preserveFailure('bridge-frame-or-identity-failed',error);
            (lifecycle.bridgeFailures ??= []).push(failure); lifecycle.bridgeFailure ??= failure;
            append('POMS_M_UI_IDENTITY_FAILURE ' + JSON.stringify(failure));
            abort('bridge-frame-or-identity-failed');
        });
    });
    async function forceKnown() {
        if (!identity) {
            const discovered = await bounded(inspect('Discover', 0, bridgeId, null), identityTimeoutMs, 'Windows-discovery-deadline');
            if (discovered.exists) register(discovered);
        }
        if (identity) {
            lifecycle.forcedStop = true;
            lifecycle.windowsStop = await bounded(inspect('Stop', identity.root.pid, bridgeId, identity), identityTimeoutMs, 'Windows-force-stop-deadline');
            assert.equal(lifecycle.windowsStop.result, 'owned-tree-stopped');
        } else lifecycle.noMatchingFixedWindowsAnchorFound = true;
    }
    try {
        await Promise.race([exited, abortGate]);
        if (aborted) {
            try { await bounded(exited, graceMs, 'cooperative-abort-deadline'); }
            catch { await forceKnown(); try { await bounded(exited, 3000, 'interop-exit-deadline'); } catch { lifecycle.interopWaitExpired = true; } }
        }
        try { await bounded(Promise.all([queue,...callbackTasks]), queueGraceMs, 'Root-callback-queue-deadline'); }
        catch { abort('Root-callback-queue-deadline'); lifecycle.pendingRootCallbackUnsettled = true; }
        try{await bounded(privateEvidence,queueGraceMs,'Root-private-original-stdio-deadline')}catch{privateRetentionFailed=true;abort('private-original-stdio-deadline')}
        // Even a normal exit is followed by exact registered-member verification.
        if (identity && !lifecycle.windowsStop) {
            lifecycle.windowsStop = await bounded(inspect('Stop', identity.root.pid, bridgeId, identity), identityTimeoutMs, 'Windows-closeout-deadline');
            assert.equal(lifecycle.windowsStop.result, 'owned-tree-stopped');
        }
        if (!exitedStatus || !terminal) rejected ??= new Error('driver-ended-without-terminal-result');
    } catch (error) {
        rejected ??= new Error('owned-Windows-closeout-failed'); lifecycle.closeoutFailed = true;
        lifecycle.closeoutFailure = await preserveFailure('owned-Windows-closeout-failed',error);
        append('POMS_M_UI_WINDOWS_CLOSEOUT_FAILURE ' + JSON.stringify(lifecycle.closeoutFailure));
    }
    finally {
        clearTimeout(timer); clearTimeout(profileTimer); signal?.removeEventListener('abort', onSignal);
        accepting = false; finished = true; reader.close(); child.stderr.off('data', publicStderr);
        if (!exitedStatus) { child.unref?.(); child.stdin.destroy(); child.stdout.destroy(); child.stderr.destroy(); }
        else if (!child.stdin.destroyed) child.stdin.end();
    }
    return { profile, result, status: exitedStatus ?? { code: null, signal: null }, rejected,
        lifecycle: { ...lifecycle, inspections, registeredWindowsIdentity: identity, terminalFrameReceived: terminal, abortRequested: aborted,pendingCallbacks:callbackTasks.size,privateOriginalStdioRetained:!!retain&&!privateRetentionFailed } };
}

export async function runWindowsOriginalMUi({options,append,retain,onCallback=async()=>{},signal,totalTimeoutMs=300000}){
 assert.equal(typeof retain,'function','Root new-M private retention required');
 assert.equal(process.platform,'linux');assert.equal(process.cwd(),'/home/wangzishi/projects/poms-rust-r2m');const reader=new SourceReader({root:WINDOWS_MOUNT,pins:options.sourcePins,sourceEpoch:options.inputs.sourceCapId});for(const row of options.sourcePins)reader.read(row.file);const bridgeId=randomUUID(),driverSha=sha(reader.read('tools/rust-r2m-continuation01/windows-ui-driver.mjs'));
 const child=spawn(WINDOWS_NODE,[WINDOWS_DRIVER,'--bridge-id',bridgeId],{cwd:process.cwd(),env:Object.fromEntries(['PATH','HOME','WSLENV','WSL_INTEROP','DISPLAY','WAYLAND_DISPLAY','XDG_RUNTIME_DIR'].filter(key=>process.env[key]!==undefined).map(key=>[key,process.env[key]])),stdio:['pipe','pipe','pipe'],windowsHide:true});
 const result=await driveWindowsUi({child,options,bridgeId,driverSha,append,retain,onCallback,signal,totalTimeoutMs});result.windowsSource=reader.assertUnchanged();return result;
}
