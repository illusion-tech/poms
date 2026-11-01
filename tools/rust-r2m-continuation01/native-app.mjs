// Starts the original, compiled current Native application (S3 product bytes unchanged at9dc). The two hooks below observe
// pg query structure and original ORM transaction/create events only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {AsyncLocalStorage} from 'node:async_hooks';
import {managed,privateRoot} from './database-client.mjs';
import {privateFiles} from './private-files.mjs';
import {sourceHead,validateSource} from './fixture-guard.mjs';
import {createNativeWriteWitness} from './native-write-witness.mjs';
const require=createRequire(import.meta.url),{Client}=createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const SQL_OBSERVER='tools/rust-r2m-continuation01/query-pid-witness.cjs';
const {installQueryCapture}=require('./query-pid-witness.cjs');
const {NestFactory,ModulesContainer}=require('@nestjs/core');
const {RequestContext}=require('@mikro-orm/core');
const sha=b=>createHash('sha256').update(b).digest('hex');

function nativeEnvironment(backend){
 const original=managed(backend).childEnv;if(backend==='nest')return{env:original,proof:{backend,port:10070,derived:false}};
 // The original explicit dotenv file overrides process.env. Keep the Rust
 // runtime file intact and derive a new task-private Native-only port file.
 const source=privateRoot+'/rust.env',raw=privateFiles.read(source);assert.equal((raw.match(/^PORT=10071$/gm)??[]).length,1);
 const derived=raw.replace(/^PORT=10071$/m,'PORT=10070'),file=privateRoot+'/native-rust-port10070.env';
 if(privateFiles.exists(file))assert.equal(privateFiles.read(file),derived);else privateFiles.create(file,derived);
 assert.equal(privateFiles.read(source),raw);return{env:{...original,PORT:'10070',POMS_ENV_FILE:file},proof:{backend,port:10070,derived:true,sourceFile:source,sourceSha256:sha(raw),derivedFile:file,derivedSha256:sha(derived),onlyPortLineChanged:true,sourceUnchanged:true,contentsExported:false}};
}

export async function startOriginalNative({tag,onCommitted,admittedContexts,backend='nest',sqlBarrier}){
 assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');assert(/^[a-z0-9-]{1,35}$/.test(tag));assert(['nest','rust'].includes(backend));validateSource();
 const binary=path.resolve('dist/apps/poms-api/main.js'),binaryRaw=fs.readFileSync(binary);
 assert.equal(sha(binaryRaw),'0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4');
 const storage=new AsyncLocalStorage(),sql=[],sdkContexts=new WeakSet(),sdkCaseIds=new Set();let app,orm,finished=false,approvalProvider,numberProvider;
 const witness=createNativeWriteWitness({onCommitted,context:()=>storage.getStore()??{}});
 const capture=installQueryCapture(Client,{shouldCapture:()=>storage.getStore()!==undefined,append:row=>sql.push({...row,context:storage.getStore()??null}),barrierFor:(phase,row)=>sqlBarrier?.barrierFor(phase,row,storage.getStore())??null,pause:(plan,row)=>sqlBarrier?.pause(plan,row)??Promise.resolve(false)});
 const oldCreate=NestFactory.create,oldEnv={...process.env};
 let resolveReady,rejectReady;const listening=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
 const timeout=setTimeout(()=>rejectReady(new Error('Original Native listen deadline')),90000);timeout.unref();
 NestFactory.create=async function(...args){
  app=await oldCreate.apply(this,args);
  orm=app.get(require('@mikro-orm/core').MikroORM);
  orm.em.getEventManager().registerSubscriber(witness.subscriber);witness.assertConfiguration(orm);
  app.use((req,_res,next)=>{const context=admittedContexts.get(req.headers['x-correlation-id']);if(context)storage.run(context,next);else next();});
  // Nest's application proxy binds methods to its internal instance. Observe
  // the actual server event instead of replacing a proxy method.
  app.getHttpServer().once('listening',resolveReady).once('error',rejectReady);
  return app;
 };
 async function close(){if(finished)return;finished=true;try{if(app)await app.close();await witness.drain();}finally{capture.uninstall();NestFactory.create=oldCreate;clearTimeout(timeout);for(const key of Object.keys(process.env))if(!Object.hasOwn(oldEnv,key))delete process.env[key];Object.assign(process.env,oldEnv);}}
 function admitOriginalSdkContext(context){
  assert(!finished&&app);assert.deepEqual(Object.keys(context).sort(),['caseId','index','op','runId']);
  assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(context.runId));
  assert(/^[a-z][a-z0-9_.-]{0,79}$/.test(context.caseId));assert(Number.isInteger(context.index)&&context.index>=0);assert(['m.internal-uow','m.internal-numbers'].includes(context.op));
  const runs=new Set([...admittedContexts.values()].map(value=>value.runId));assert.equal(runs.size,1);assert(runs.has(context.runId),'Internal SDK scope must belong to the already admitted fresh run');
  assert(!sdkCaseIds.has(context.caseId));sdkCaseIds.add(context.caseId);const admitted=Object.freeze({...context});
  admittedContexts.set('m-sdk-'+randomUUID(),admitted);sdkContexts.add(admitted);return admitted;
 }
 async function withOriginalSdkScope(context,callback){
  assert(!finished&&app&&orm);assert(sdkContexts.has(context)&&[...admittedContexts.values()].includes(context));assert.equal(typeof callback,'function');
  if(!approvalProvider){const instances=[...new Set([...app.get(ModulesContainer).values()].flatMap(module=>[...module.providers.values()]).filter(wrapper=>wrapper.metatype?.name==='ApprovalService').map(wrapper=>wrapper.instance).filter(Boolean))];assert.equal(instances.length,1,'Use the one actual original Nest ApprovalService provider');approvalProvider=instances[0];}
  if(!numberProvider){const instances=[...new Set([...app.get(ModulesContainer).values()].flatMap(module=>[...module.providers.values()]).filter(wrapper=>wrapper.metatype?.name==='BusinessNumberService').map(wrapper=>wrapper.instance).filter(Boolean))];assert.equal(instances.length,1,'Use the one actual original Nest BusinessNumberService provider');numberProvider=instances[0];}
  return storage.run(context,()=>RequestContext.create(orm.em,()=>{const em=RequestContext.getEntityManager();assert(em);return callback({em,orm,approval:approvalProvider,numbers:numberProvider});}));
 }
 try{
  // Native always owns loopback10070; backend selects the new database. Rust
  // owns10071 when paired. No second Native listener or additional port is used.
  const environment=nativeEnvironment(backend);Object.assign(process.env,environment.env);await import(pathToFileURL(binary).href);await listening;clearTimeout(timeout);NestFactory.create=oldCreate;
  const port=10070;assert.equal(app.getHttpServer().address().port,port);
  const metadata=[...orm.getMetadata().getAll().values()].map(meta=>({className:meta.className,tableName:meta.tableName,schema:meta.schema??orm.config.get('schema'),declaredSchema:meta.schema??null,properties:Object.values(meta.properties).map(p=>({name:p.name,fieldNames:p.fieldNames,nullable:p.nullable}))}));
  return{origin:'http://127.0.0.1:'+port,sql,witness,metadata,close,admitOriginalSdkContext,withOriginalSdkScope,report:()=>({sourceHead,databaseBackend:backend,nativeEnvironment:environment.proof,sqlObserver:{file:SQL_OBSERVER,rawBytesSha256:sha(fs.readFileSync(SQL_OBSERVER)),backendPidSource:'original pg Client.processID read separately for each actual query'},internalSdkPort:{kind:'actual-original-Nest-provider-and-MikroORM-RequestContext',publicHttpApiAdded:false},originalNativeProducerOrRuntime:true,binary:'dist/apps/poms-api/main.js',binaryBytes:binaryRaw.length,binaryRawBytesSha256:sha(binaryRaw),binaryUnchanged:sha(fs.readFileSync(binary))===sha(binaryRaw),node:process.version,nodeExecutable:process.execPath,nodeExecutableRawBytesSha256:sha(fs.readFileSync(process.execPath)),processId:process.pid,observerOnly:true,pgCaptureComplete:!capture.isIncomplete(),witness:witness.snapshot(),sdk:witness.sourceReport()})};
 }catch(error){await close();throw error;}
}
