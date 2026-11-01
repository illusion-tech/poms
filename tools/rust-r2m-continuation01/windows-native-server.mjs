// The original pinned Native bundle runs in this actual Windows Node process.
// These hooks observe pg structure and original MikroORM events only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {AsyncLocalStorage} from 'node:async_hooks';
import {createNativeWriteWitness} from './native-write-witness.mjs';
import {sourceHead,validateSource} from './fixture-guard.mjs';
import {createDispatch} from './acceptance-dispatch.mjs';
const require=createRequire(import.meta.url),{loadWindowsNativeEnvironment,WINDOWS_ENV}=require('./windows-managed-environment.cjs');
const ROOT=path.resolve(import.meta.dirname,'../..'),BUNDLE_SHA='0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4';
const BUNDLE='tmp/rust-r2m-continuation01/windows-native-bundle/'+BUNDLE_SHA+'/main.cjs',SQL_OBSERVER='tools/rust-r2m-continuation01/query-pid-witness.cjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// The four original producer/read-model routes required by the frozen UI3/4
// setup; the actual product handler still comes solely from the pinned bundle.
const nativeProducerRoutes=[['POST','/api/contracts/{id}:submitReview'],['GET','/api/contracts/{id}'],['GET','/api/project-handovers/{id}'],['POST','/api/project-handovers/{id}:confirm']].map(([method,path])=>({method,path}));

export function validateNativeContext(correlationId,context,runId){
    const prefix=typeof correlationId==='string'?['m-ui-source-','m-ui-','m-'].find(value=>correlationId.startsWith(value)):null;
    assert(prefix&&uuid.test(correlationId.slice(prefix.length)));
    assert(context&&Object.keys(context).sort().join(',')==='caseId,index,op,runId');assert(uuid.test(runId)&&context.runId===runId);
    assert(/^[a-z][a-z0-9_.-]{0,79}$/.test(context.caseId)&&Number.isSafeInteger(context.index)&&context.index>=0&&['m.http','m.producer'].includes(context.op));
    return Object.freeze({...context});
}
export const nativeRequestId=context=>'r2m:'+context.runId+':'+sha(context.caseId).slice(0,12);
async function portIsFree(){return await new Promise(resolve=>{const socket=net.createConnection({host:'127.0.0.1',port:10070});socket.setTimeout(2000);socket.once('connect',()=>{socket.destroy();resolve(false)});socket.once('error',error=>resolve(error.code==='ECONNREFUSED'));socket.once('timeout',()=>{socket.destroy();resolve(false)})})}

export async function startWindowsNativeServer({tag,runId,environmentProof,onCommitted,admittedContexts,signal}){
    assert.equal(process.platform,'win32');assert.equal(process.version,'v24.19.0');assert.equal(process.cwd().toLowerCase(),ROOT.toLowerCase());assert(/^[a-z0-9-]{1,35}$/.test(tag)&&uuid.test(runId));assert(admittedContexts instanceof Map&&typeof onCommitted==='function');validateSource();
    assert(!Object.keys(process.env).some(key=>/^(?:PG|DB_|MIKRO_)/i.test(key)||/^(?:DATABASE_URL|JWT_SECRET|NODE_OPTIONS|POMS_ENV_FILE)$/i.test(key)),'Windows Native refuses ambient database/process overrides');
    assert(await portIsFree(),'Windows Native fixed port10070 already in use');
    const binary=path.join(ROOT,BUNDLE);let checked=ROOT;for(const part of BUNDLE.split('/')){checked=path.join(checked,part);assert(!fs.lstatSync(checked).isSymbolicLink(),'Staged Native bundle symlink refused')}const binaryStat=fs.lstatSync(binary);assert(binaryStat.isFile()&&binaryStat.nlink===1&&fs.realpathSync(binary).toLowerCase()===binary.toLowerCase());const binaryRaw=fs.readFileSync(binary);assert.equal(sha(binaryRaw),BUNDLE_SHA,'Only Root staged original Native bundle admitted');
    const baseSystemKeys=new Set(['PATH','SYSTEMROOT','WINDIR','COMSPEC','PATHEXT','TEMP','TMP','HOME','USERPROFILE','HOMEDRIVE','HOMEPATH','APPDATA','LOCALAPPDATA','LANG','LC_ALL','PNPM_HOME']);
    const sourceEnv=Object.fromEntries(Object.entries(process.env).filter(([key,value])=>baseSystemKeys.has(key.toUpperCase())&&typeof value==='string'));
    const environment=loadWindowsNativeEnvironment({env:{...sourceEnv,POMS_ENV_FILE:WINDOWS_ENV},expectedProof:environmentProof});
    const input=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/design/rust-r2m/acceptance-input.json'),'utf8')),dispatch=createDispatch({surface:input.sourceProtection.currentSurface,nativeOnly:nativeProducerRoutes});
    const {Client}=createRequire(require.resolve('@mikro-orm/postgresql'))('pg'),{NestFactory}=require('@nestjs/core'),{installQueryCapture}=require('./query-pid-witness.cjs');
    const storage=new AsyncLocalStorage(),sql=[];let app,orm,closed=false,closePromise,activeRequests=0;
    const witness=createNativeWriteWitness({onCommitted,context:()=>storage.getStore()??{}}),capture=installQueryCapture(Client,{shouldCapture:()=>storage.getStore()!==undefined,append:row=>sql.push({...row,context:storage.getStore()??null})});
    const oldCreate=NestFactory.create,oldEnv={...process.env};let readyResolve,readyReject;
    const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject}),timer=setTimeout(()=>readyReject(new Error('Windows Native startup deadline')),90000);ready.catch(()=>{});timer.unref();
    const onAbort=()=>readyReject(new Error('Windows Native startup canceled'));signal?.addEventListener('abort',onAbort,{once:true});
    NestFactory.create=async function(...args){app=await oldCreate.apply(this,args);if(signal?.aborted){await app.close();throw new Error('Windows Native factory canceled')}orm=app.get(require('@mikro-orm/core').MikroORM);orm.em.getEventManager().registerSubscriber(witness.subscriber);witness.assertConfiguration(orm);
        app.use((req,res,next)=>{activeRequests++;let finished=false;const finish=()=>{if(!finished){finished=true;activeRequests--}};res.once('finish',finish);res.once('close',finish);const context=admittedContexts.get(req.headers['x-correlation-id']);if(context)storage.run(context,next);else next()});
        app.getHttpServer().once('listening',readyResolve).once('error',readyReject);return app;
    };
    async function drain(){const until=Date.now()+30000;while(activeRequests){assert(Date.now()<until,'Windows Native HTTP drain deadline');await new Promise(resolve=>setTimeout(resolve,10))}await witness.drain();witness.assertComplete();assert(!capture.isIncomplete(),'Original query-PID capture incomplete');return{activeRequests,pendingTransactions:witness.snapshot().openTransactions.length}}
    function close(){if(closePromise)return closePromise;closed=true;closePromise=(async()=>{const errors=[];try{if(app)await app.close()}catch(error){errors.push(error)}try{await witness.drain();witness.assertComplete()}catch(error){errors.push(error)}finally{capture.uninstall();NestFactory.create=oldCreate;clearTimeout(timer);signal?.removeEventListener('abort',onAbort);for(const key of Object.keys(process.env))if(!Object.hasOwn(oldEnv,key))delete process.env[key];Object.assign(process.env,oldEnv)}assert.equal(activeRequests,0);assert(await portIsFree(),'Windows Native10070 not released');if(errors.length)throw Object.assign(new Error('Windows Native close evidence incomplete'),{privateCauses:errors.map(error=>({name:error.name,message:error.message,stack:error.stack}))});return{kind:'actual-Windows-Native-close',platform:'win32',processId:process.pid,appClosed:true,port:10070,portReleased:true,queryCaptureRestored:true,witnessComplete:true}})();return closePromise}
    try{
        assert(!signal?.aborted,'Native start canceled before bundle import');Object.assign(process.env,environment.childEnv);await import(pathToFileURL(binary).href);await ready;assert(!signal?.aborted);clearTimeout(timer);NestFactory.create=oldCreate;assert.equal(app.getHttpServer().address().port,10070);
        const metadata=[...orm.getMetadata().getAll().values()].map(meta=>({className:meta.className,tableName:meta.tableName,schema:meta.schema??orm.config.get('schema'),declaredSchema:meta.schema??null,properties:Object.values(meta.properties).map(property=>({name:property.name,fieldNames:property.fieldNames,nullable:property.nullable}))}));
        function report(){return{kind:'R2M-actual-original-Windows-Native-runtime',sourceHead,databaseBackend:'nest',platform:process.platform,nativeEnvironment:environment.proof,binary:BUNDLE,binaryBytes:binaryRaw.length,binaryRawBytesSha256:BUNDLE_SHA,binaryUnchanged:sha(fs.readFileSync(binary))===BUNDLE_SHA,node:process.version,nodeExecutable:process.execPath,nodeExecutableRawBytesSha256:sha(fs.readFileSync(process.execPath)),processId:process.pid,sqlObserver:{file:SQL_OBSERVER,rawBytesSha256:sha(fs.readFileSync(path.join(ROOT,SQL_OBSERVER))),backendPidSource:'original pg Client.processID read separately for each actual query'},observerOnly:true,originalNativeProducerOrRuntime:true,pgCaptureComplete:!capture.isIncomplete(),activeRequests,witness:witness.snapshot(),sdk:witness.sourceReport()}}
        async function request(options){
            const {method,path:requestPath,correlationId,requestId,purpose='business'}=options,context=admittedContexts.get(correlationId);assert(context,'Root must await admission before Native transport');assert.equal(requestId,nativeRequestId(context));
            const selected=dispatch.resolve({method,path:requestPath,backend:'nest',purpose});assert.equal(selected.executionBackend,'nest');assert(!(Object.hasOwn(options,'body')&&Object.hasOwn(options,'bodyBase64')),'Use one exact body representation');
            const headers={host:'127.0.0.1:10070',connection:'close','user-agent':'poms-r2m-fixture/'+runId,'x-forwarded-for':'192.0.2.25','x-request-id':requestId,'x-correlation-id':correlationId};
            for(const[key,value]of Object.entries(options.headers??{})){assert(!/^(host|connection|content-length|x-request-id|x-correlation-id|user-agent)$/i.test(key));http.validateHeaderName(key);http.validateHeaderValue(key,value);headers[key]=value}
            let payload;if(options.bodyBase64!==undefined){assert(typeof options.bodyBase64==='string'&&options.bodyBase64.length<=6*1024*1024);payload=Buffer.from(options.bodyBase64,'base64');assert.equal(payload.toString('base64'),options.bodyBase64)}else if(options.body!==undefined)payload=Buffer.from(JSON.stringify(options.body));
            if(payload){assert(payload.length<=4*1024*1024);headers['content-type']??=options.bodyBase64!==undefined?'application/octet-stream':'application/json';headers['content-length']=String(payload.length)}
            const startedAt=new Date().toISOString();return await new Promise((resolve,reject)=>{const outgoing=http.request({hostname:'127.0.0.1',port:10070,path:requestPath,method,headers},incoming=>{const chunks=[];let length=0,done=false;const finish=transportComplete=>{if(done)return;done=true;const bytes=Buffer.concat(chunks);resolve({status:incoming.statusCode,headers:incoming.headers,rawBodyBase64:bytes.toString('base64'),bodyBytesLength:bytes.length,bodyBytesSha256:sha(bytes),executionBackend:'nest',transportComplete,window:{startedAt,finishedAt:new Date().toISOString()}})};incoming.on('data',chunk=>{length+=chunk.length;if(length>8*1024*1024){outgoing.destroy();return}chunks.push(chunk)});incoming.on('end',()=>finish(true));incoming.on('aborted',()=>finish(false));incoming.on('error',()=>finish(false))});outgoing.setTimeout(25000,()=>outgoing.destroy());outgoing.once('error',()=>reject(new Error('Windows Native fixed HTTP transport failed')));outgoing.end(payload)})
        }
        return{metadata,sql,witness,drain,close,request,report,origin:'http://127.0.0.1:10070',admitContext(correlationId,context){assert(!closed&&admittedContexts.size<8192);const exact=validateNativeContext(correlationId,context,runId);if(admittedContexts.has(correlationId))assert.deepEqual(admittedContexts.get(correlationId),exact);else admittedContexts.set(correlationId,exact);return{correlationId,context:exact,admitted:true,platform:'win32',windowsPid:process.pid}}};
    }catch(error){await close().catch(()=>{});throw error}
}
