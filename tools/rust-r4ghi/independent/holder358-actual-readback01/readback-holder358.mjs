// One authorized fixed Linux readonly subentry; no Windows holder/control entry.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const own=path.dirname(fileURLToPath(import.meta.url)),ownLinux='/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/transport358-actual-holder-readback01';
const root='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',priv='/home/wangzishi/.local/share/poms-r4ghi/private',nonce='eb04b9f1-3d33-497c-9271-1fe5bb6af439',out=priv+'/runtime121-A/holder-start/'+nonce;
const local=f=>f.startsWith('/mnt/e/')?'E:/'+f.slice(7):f.startsWith('/home/')?'//wsl.localhost/Debian'+f:f;
const hash=b=>createHash('sha256').update(b).digest('hex');
function raw(p,binary=false){const f=local(p.file),s=fs.lstatSync(f);assert(s.isFile()&&!s.isSymbolicLink()&&(binary?s.nlink>=1:s.nlink===1));assert.equal(fs.realpathSync(f),path.resolve(f));const b=fs.readFileSync(f);assert.equal(b.length,p.bytes);assert.equal(hash(b),p.rawBytesSha256);return b;}
function pin(file,binary=false){const b=fs.readFileSync(local(file)),p={file,bytes:b.length,rawBytesSha256:hash(b)};raw(p,binary);return p;}
const json=p=>JSON.parse(raw(p));
function wx(name,body){const file=ownLinux+'/'+name;fs.writeFileSync(local(file),JSON.stringify(body,null,2)+'\n',{flag:'wx',mode:0o600});return pin(file);}
function absent(file){try{fs.lstatSync(local(file));}catch(e){if(e.code==='ENOENT')return;throw e;}throw Error('Unexpected control/end entry '+file);}
const commandPin=pin(out+'/command-receipt.json');assert.equal(commandPin.bytes,4497);assert.equal(commandPin.rawBytesSha256,'d271d599a637b3a5582ee001fa945dfb57723b8e0eba4916b71f07069e3e9d4c');
const command=json(commandPin),dispatch=json(command.dispatch),q=json(dispatch.request),p=json(q.input),peer=json(dispatch.independentReview),t=peer.transport358,round=json(t.G1Append),policy=json(command.G1Policy),code=json(t.codeReview),old=json(p.codeReview);
assert.equal(command.kind,'actual-runtime121-A-command');assert.equal(command.mode,'holder-start');assert.equal(command.exitCode,0);assert.equal(command.signal,null);assert.equal(command.processError,null);
const api=await import(pathToFileURL(local(t.actualOperator.file)).href);
const meta={request:q,requestPin:dispatch.request,peer,peerPin:dispatch.independentReview,input:p,round,auxReview:code,originalReview:old,operatorPin:t.actualOperator,policy};api.validateEnvelope358(meta);api.validateDispatch358(meta,dispatch);
const artifactPins=[commandPin,command.dispatch,command.stdout,command.stderr,command.bootBefore,command.bootAfter,command.ownedHolderObservation,command.ownedHolderCommand,command.holderReady,command.windowsLaunch,pin(out+'/child-command-receipt.json'),pin(out+'/intent.json')];
for(const item of artifactPins)raw(item);
const holder=json(command.holderReady),windows=json(command.windowsLaunch),originalObservation=json(command.ownedHolderObservation),before=json(command.bootBefore),after=json(command.bootAfter),originalIdentityCommand=json(command.ownedHolderCommand),child=json(artifactPins[10]);
assert.equal(command.holderReady.bytes,2416);assert.equal(command.holderReady.rawBytesSha256,'6dada953f400ca672696db9ca3aa7e86cba38e539111447cff0c270b4a529e88');assert.equal(command.ownedHolderObservation.rawBytesSha256,'ebffa3889f90217351e3a0b274bfde4cd3e2c57240eccec42ff776aa6aa23be3');
assert.equal(holder.pid,31439);assert.equal(holder.startTime,'305149');assert.equal(holder.bootId,'0e313ea7-9ac2-4a55-b1fe-fb472441344a');
assert.equal(windows.windowsPid,4320);assert.equal(windows.creationTime,'2026-11-12T12:23:03.9465020Z');
for(const b of [before,after]){api.validBoot358(b);raw(b.stdout);raw(b.stderr);assert.equal(raw(b.stdout).toString().trim(),b.bootId);assert.equal(b.stderr.bytes,0);}
assert.equal(before.bootId,after.bootId);assert.equal(before.bootId,holder.bootId);
for(const c of [child,originalIdentityCommand]){assert.equal(c.exitCode,0);assert.equal(c.signal,null);assert.equal(c.processError,null);raw(c.stdout);raw(c.stderr);assert.equal(c.stderr.bytes,0);}
assert.deepEqual(JSON.parse(raw(originalIdentityCommand.stdout).toString('utf8')),originalObservation);
assert.deepEqual(child.stdout,command.stdout);assert.deepEqual(child.stderr,command.stderr);assert(Date.parse(child.ended)<=Date.parse(command.ended));assert(Date.parse(originalIdentityCommand.ended)<=Date.parse(command.ended));
const anchors={dispatch:command.dispatch,holderReady:command.holderReady,windowsLaunch:command.windowsLaunch,beforeBootId:before.bootId,afterBootId:after.bootId};
api.validateOwnedObservation358(meta,originalObservation,anchors);assert.deepEqual(originalObservation.holder,holder);assert.deepEqual(originalObservation.windows,windows);
for(const k of ['G1Append','actualOperator','codeReview','executablePin','newLossObservation'])assert.deepEqual(command[k],t[k]);assert.deepEqual(command.G1Policy,round.G1Policy);assert.equal(command.bootPolicy,t.bootPolicy);
const critical=[dispatch.request,dispatch.independentReview,q.input,q.expectedRootReview,t.G1Append,round.G1Policy,t.actualOperator,t.codeReview,p.codeReview,p.G1,p.runtimeLossObservation,p.failedRetention,t.newLossObservation,round.hostObservation,...p.executionSources];
const nodes=[pin(api.CONTRACT358.nodeWin,true),pin(api.CONTRACT358.nodeLinux,true)],wsl=pin(api.CONTRACT358.wsl,true);assert.equal(nodes[0].rawBytesSha256,api.CONTRACT358.nodeWinSHA);assert.equal(nodes[1].rawBytesSha256,api.CONTRACT358.nodeLinuxSHA);
const guards=()=>{for(const item of critical)raw(item);for(const n of nodes)raw(n,true);raw(wsl,true);raw(t.executablePin,true);for(const s of Object.values(p.expectedStates))raw(s);const map=json(p.failedRetention);for(const m of map.mappings){raw(m.original);raw(m.privateRetainedCopy);assert(raw(m.original).equals(raw(m.privateRetainedCopy)));}for(const n of [13,14,15])absent(priv+'/business/g2-business'+n+'/main01/driver.lock');absent(out+'/holder-ended.json');};
guards();
const invocation=api.readonlyInvocation358(dispatch.request,dispatch.independentReview),stdout=ownLinux+'/fresh-linux-readonly.stdout.log',stderr=ownLinux+'/fresh-linux-readonly.stderr.log';
let outFD=null,errFD=null,result;const began=new Date().toISOString();
try{outFD=fs.openSync(local(stdout),'wx',0o600);errFD=fs.openSync(local(stderr),'wx',0o600);guards();const env={...process.env};delete env.NODE_OPTIONS;delete env.NODE_PATH;result=spawnSync(invocation.executable,invocation.argv,{cwd:local(root),env,windowsHide:true,stdio:['ignore',outFD,errFD]});}finally{if(outFD!==null)fs.closeSync(outFD);if(errFD!==null)fs.closeSync(errFD);}
const freshCommand=wx('fresh-linux-readonly-command.json',{kind:'non-author-actual-fixed-linux-holder358-readonly-command',began,ended:new Date().toISOString(),executable:wsl,argv:invocation.argv,fixedNode:nodes[1],self:t.actualOperator,request:dispatch.request,independentReview:dispatch.independentReview,exitCode:result.status,signal:result.signal,processError:result.error?{name:result.error.name,message:result.error.message}:null,stdout:pin(stdout),stderr:pin(stderr),RootOrPrivateWritten:false,holderPGAPIControl:false});
assert.equal(result.status,0);assert.equal(result.signal,null);assert.equal(result.error,undefined);assert.equal(raw(pin(stderr)).length,0);
const freshObservation=JSON.parse(raw(pin(stdout)).toString('utf8'));api.validateOwnedObservation358(meta,freshObservation,anchors);assert.deepEqual(freshObservation.holder,holder);assert.deepEqual(freshObservation.windows,windows);const freshObservationPin=wx('fresh-linux-owned-observation.json',freshObservation);
guards();for(const item of artifactPins)raw(item);raw(freshCommand);raw(freshObservationPin);
const originalWSLPipes=[pin(out+'/wsl-stdout-original.log'),pin(out+'/wsl-stderr-original.log')];assert.equal(originalWSLPipes[1].bytes,0);const wslAck=JSON.parse(raw(originalWSLPipes[0]).toString('utf8'));assert.deepEqual(wslAck.holderReady,command.holderReady);
const evidence=wx('linux-and-receipt-readback358.json',{kind:'non-author-actual-holder358-Linux-and-receipt-readback',recordedAt:new Date().toISOString(),nonce,command:commandPin,holderReady:command.holderReady,windowsLaunch:command.windowsLaunch,actualOriginalObservation:command.ownedHolderObservation,freshReadonlyCommand:freshCommand,freshOwnedObservation:freshObservationPin,originalArtifacts:artifactPins,originalWSLPipes,sourceAndPolicyPins:critical,boot:holder.bootId,LinuxPID:holder.pid,LinuxStartTime:holder.startTime,checks:{sameRealProcBootPIDStartExeCwdArgv:true,sameOwnedInputRootReviewNonceSourceNode:true,beforeAfterReadyAndFreshLiveBootEqual:true,originalChildAndIdentityRawLogsMatched:true,genericSuccessAfterKnownChildAndIdentity:true,allFinalPhysicalSourceStateAndLstatGuardsPassed:true},limits:{RootOrPrivateWritten:false,WindowsMainHolderEntryInvoked:false,fixedLinuxReadonlyEntryInvoked:true,WSLReadonlyProcessInvoked:true,PGAPIOrBusinessInvoked:false,hostConfigurationChanged:false}});
console.log(JSON.stringify({evidence,freshReadonlyCommand:freshCommand,freshObservation:freshObservationPin,boot:holder.bootId,LinuxPID:holder.pid,LinuxStartTime:holder.startTime}));
