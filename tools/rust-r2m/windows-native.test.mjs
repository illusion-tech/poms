// In-memory protocol/identity/environment checks. No Native app, private file,
// database, listener or child process is opened by this test module.
import test from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {createRequire} from 'node:module';
import {createNativeDriverChannel,NATIVE_BRIDGE_PREFIX} from './windows-native-driver.mjs';
import {validateWindowsNativeProfile} from './windows-native-app.mjs';
import {validateNativeContext,nativeRequestId} from './windows-native-server.mjs';
const require=createRequire(import.meta.url),{deriveRawWindowsNativeEnvironment,WINDOWS_OBJECT_ROOT}=require('./windows-managed-environment.cjs');
const runId='10000000-0000-4000-8000-000000000001',correlationId='m-ui-20000000-0000-4000-8000-000000000002',nextTurn=()=>new Promise(resolve=>setImmediate(resolve));
function pureChannel(){const input=new PassThrough(),output=new PassThrough(),controller=new AbortController(),frames=[];output.on('data',bytes=>{for(const line of bytes.toString('utf8').trim().split('\n'))frames.push(JSON.parse(line.slice(NATIVE_BRIDGE_PREFIX.length)))});const channel=createNativeDriverChannel({input,output,controller});return{input,output,controller,frames,channel,send:value=>input.write(JSON.stringify(value)+'\n')}}

test('Windows Native configuration waits for actual identity ACK and negative ACK rejects every waiter',async()=>{
    const a=pureChannel(),profile=a.channel.request('profile',{bridgeId:runId});a.send({type:'configuration',options:{synthetic:true}});await assert.rejects(profile);await assert.rejects(a.channel.configuration);assert(a.controller.signal.aborted);a.channel.close();
    const b=pureChannel(),rejected=b.channel.request('profile',{bridgeId:runId});b.send({type:'ack',id:'d-1',ok:false});await assert.rejects(rejected);assert.equal(b.channel.pendingCount(),0);assert(b.controller.signal.aborted);b.channel.close();
});

test('post-ACK RPC commands remain ordered, and Root EOF aborts the native owner channel',async()=>{
    const a=pureChannel(),profile=a.channel.request('profile',{bridgeId:runId});a.send({type:'ack',id:'d-1',ok:true,identity:{pid:123}});assert.deepEqual(await profile,{pid:123});a.send({type:'configuration',options:{sourceCapId:'pure'}});assert.deepEqual(await a.channel.configuration,{sourceCapId:'pure'});
    const observed=[];a.channel.setCommandHandler(async(name,payload)=>{await nextTurn();observed.push(name);return payload});a.send({type:'command',id:'r-1',name:'admit',payload:{one:true}});a.send({type:'command',id:'r-2',name:'drain',payload:{two:true}});await a.channel.idle();assert.deepEqual(observed,['admit','drain']);assert.deepEqual(a.frames.filter(frame=>frame.type==='response').map(frame=>frame.id),['r-1','r-2']);
    const pending=a.channel.request('ready',{});a.input.end();await assert.rejects(pending);assert(a.controller.signal.aborted);a.channel.close();
});

test('the Native fixed Windows profile refuses another driver/executable or pre-ACK application activity',()=>{
    const node='C:\\Users\\ynh2\\AppData\\Roaming\\fnm\\node-versions\\v24.19.0\\installation\\node.exe',driver='E:\\projects\\worktrees\\poms-r2ef-foundation-audit\\poms\\tools\\rust-r2m\\windows-native-driver.mjs',profile={bridgeId:runId,windowsPid:123,node:'v24.19.0',executable:node,executableRawBytesSha256:'3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237',driverPath:driver,driverRawBytesSha256:'a'.repeat(64),driverArgv:[node,driver,'--bridge-id',runId],privateEnvironmentRead:false,applicationStarted:false};
    validateWindowsNativeProfile(profile,runId,'a'.repeat(64));assert.throws(()=>validateWindowsNativeProfile({...profile,applicationStarted:true},runId,'a'.repeat(64)));assert.throws(()=>validateWindowsNativeProfile({...profile,driverPath:driver.replace('native','ui')},runId,'a'.repeat(64)));assert.throws(()=>validateWindowsNativeProfile({...profile,executable:'C:\\other\\node.exe'},runId,'a'.repeat(64)));
});

test('one fixed new-M environment line changes while original bytes and all other values remain exact',()=>{
    const source='PORT=10070\r\nDB_DATABASE=poms_r2m_nest\r\nPOMS_ATTACHMENT_LOCAL_ROOT=/home/wangzishi/.local/share/poms-r2m/objects/nest/server01\r\n',derived=deriveRawWindowsNativeEnvironment(source);assert.equal(derived,'PORT=10070\r\nDB_DATABASE=poms_r2m_nest\r\nPOMS_ATTACHMENT_LOCAL_ROOT='+WINDOWS_OBJECT_ROOT+'\r\n');assert.throws(()=>deriveRawWindowsNativeEnvironment(source+source));assert.throws(()=>deriveRawWindowsNativeEnvironment(source.replace('poms-r2m/objects','poms-r2l/objects')));
});

test('correlation contexts and request IDs are fixed to this run and exact canonical source case',()=>{
    const context={runId,caseId:'m.ui3.integration',index:4,op:'m.http'};assert.deepEqual(validateNativeContext(correlationId,context,runId),context);assert.match(nativeRequestId(context),/^r2m:10000000-0000-4000-8000-000000000001:[0-9a-f]{12}$/);assert.throws(()=>validateNativeContext(correlationId,{...context,runId:'30000000-0000-4000-8000-000000000003'},runId));assert.throws(()=>validateNativeContext(correlationId,{...context,op:'arbitrary-sdk-call'},runId));assert.throws(()=>validateNativeContext(correlationId,{...context,caseId:'M.UI3'},runId));assert.throws(()=>validateNativeContext('m-not-a-uuid',context,runId));
});
test('original and continuation Native validators admit only the bounded original UI source UUID namespace with unchanged context guards',async()=>{const continuation=await import('../rust-r2m-continuation01/windows-native-server.mjs'),context={runId,caseId:'m.ui3.integration',index:4,op:'m.producer'},id='20000000-0000-4000-8000-000000000002';for(const validate of[validateNativeContext,continuation.validateNativeContext]){for(const prefix of['m-','m-ui-','m-ui-source-'])assert.deepEqual(validate(prefix+id,context,runId),context);for(const invalid of['m-ui-source-bad','m-ui-source-'+id+'-extra','m-ui-source-../'+id,'other-'+id,'m-ui-source-ui-'+id])assert.throws(()=>validate(invalid,context,runId));for(const changed of[{...context,op:'m.internal-uow'},{...context,runId:'30000000-0000-4000-8000-000000000003'},{...context,caseId:'M.UI3'},{...context,index:-1},{...context,extra:true}])assert.throws(()=>validate('m-ui-source-'+id,changed,runId));}});

test('a command failure retains its precise private error while the public category contains no raw diagnostic',async()=>{
    const a=pureChannel(),profile=a.channel.request('profile',{});a.send({type:'ack',id:'d-1',ok:true,identity:{pid:123}});await profile;a.send({type:'configuration',options:{}});await a.channel.configuration;
    a.channel.setCommandHandler(async()=>{throw new Error('synthetic-private-diagnostic-marker')});a.send({type:'command',id:'r-1',name:'drain'});await a.channel.idle();const failed=a.frames.find(frame=>frame.type==='response'&&!frame.ok);assert.equal(failed.privateFailure.message,'synthetic-private-diagnostic-marker');assert(failed.privateFailure.stack.includes('synthetic-private-diagnostic-marker'));assert(!JSON.stringify(failed.error).includes('synthetic-private-diagnostic-marker'));assert(a.controller.signal.aborted);a.channel.close();
});
