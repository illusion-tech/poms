// Starts the original, compiled S2 application. The two hooks below observe
// pg query structure and original ORM transaction/create events only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {AsyncLocalStorage} from 'node:async_hooks';
import {managed} from './database-client.mjs';
import {sourceHead,validateSource} from './fixture-guard.mjs';
import {createNativeWriteWitness} from './k-native-write-witness.mjs';
const require=createRequire(import.meta.url),{Client}=createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const {installQueryCapture}=require('../rust-r2c/witness-query-core.cjs');
const {NestFactory}=require('@nestjs/core');
const sha=b=>createHash('sha256').update(b).digest('hex');

export async function startOriginalNative({tag,onCommitted,admittedContexts,backend='nest'}){
 assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');assert(/^[a-z0-9-]{1,35}$/.test(tag));assert(['nest','rust'].includes(backend));validateSource();
 const ready=JSON.parse(fs.readFileSync('tmp/rust-r2k/b-scratch-node01-native-ready.json'));
 const binary=path.resolve('dist/apps/poms-api/main.js'),binaryRaw=fs.readFileSync(binary);
 assert.equal(sha(binaryRaw),'9ca9eb2002b7cd9d9319d5b69bfc63a10509ecfbc744512cd6313cf74f5d7374');
 assert.equal(ready.sourceHead??ready.sourceCheckpoint,sourceHead);
 const storage=new AsyncLocalStorage(),sql=[];let app,orm,finished=false;
 const witness=createNativeWriteWitness({onCommitted,context:()=>storage.getStore()??{}});
 const capture=installQueryCapture(Client,{append:row=>sql.push({...row,context:storage.getStore()??null})});
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
 try{
  Object.assign(process.env,managed(backend).childEnv);await import(pathToFileURL(binary).href);await listening;clearTimeout(timeout);NestFactory.create=oldCreate;
  const port=backend==='nest'?8700:8701;assert.equal(app.getHttpServer().address().port,port);
  const metadata=Object.values(orm.getMetadata().getAll()).map(meta=>({className:meta.className,tableName:meta.tableName,schema:meta.schema,properties:Object.values(meta.properties).map(p=>({name:p.name,fieldNames:p.fieldNames,nullable:p.nullable}))}));
  return{origin:'http://127.0.0.1:'+port,sql,witness,metadata,close,report:()=>({sourceHead,databaseBackend:backend,originalNativeProducerOrRuntime:true,binary:'dist/apps/poms-api/main.js',binaryBytes:binaryRaw.length,binaryRawBytesSha256:sha(binaryRaw),binaryUnchanged:sha(fs.readFileSync(binary))===sha(binaryRaw),node:process.version,nodeExecutable:process.execPath,nodeExecutableRawBytesSha256:sha(fs.readFileSync(process.execPath)),processId:process.pid,observerOnly:true,pgCaptureComplete:!capture.isIncomplete(),witness:witness.snapshot(),sdk:witness.sourceReport()})};
 }catch(error){await close();throw error;}
}
