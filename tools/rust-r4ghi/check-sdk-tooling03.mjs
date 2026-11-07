import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const mode=process.argv[2],edition=process.argv[3];assert(['unit','integration'].includes(mode)&&/^\d{2}$/.test(edition));
const out='tmp/rust-r4ghi/root/sdk-'+mode+edition;assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const env={};for(const[key,value]of Object.entries(process.env))if(['PATHEXT','HOME','USERPROFILE','APPDATA','LOCALAPPDATA','SYSTEMROOT','COMSPEC','TEMP','TMP','PROGRAMFILES','PROGRAMFILES(X86)','PROCESSOR_ARCHITECTURE'].includes(key.toUpperCase()))env[key]=value;
env.Path=path.dirname(process.execPath)+path.delimiter+(process.env.PATH??process.env.Path??'');
env.POMS_OPENAPI_JAVA='C:/Program Files/Java/jdk-17/bin/java.exe';env.POMS_OPENAPI_GENERATOR_JAR=path.resolve('tmp/rust-r4abc/public-generator/7.20.0.jar');
const file=mode==='unit'?'tools/openapi/shared-api-client.test.mjs':'tools/openapi/shared-api-client.integration.test.mjs';
const startedAt=new Date().toISOString(),stdout=fs.openSync(out+'/stdout.log','wx'),stderr=fs.openSync(out+'/stderr.log','wx');let result;
try{result=spawnSync(process.execPath,['--test',file],{cwd:process.cwd(),env,stdio:['ignore',stdout,stderr],windowsHide:true,timeout:600000});}finally{fs.closeSync(stdout);fs.closeSync(stderr);}
const pin=f=>{const bytes=fs.readFileSync(f);return{file:f,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}};
const receipt={kind:'actual-fixed-S5-generator-'+mode+'-checks',startedAt,completedAt:new Date().toISOString(),exitCode:result.status,stdout:pin(out+'/stdout.log'),stderr:pin(out+'/stderr.log'),sourceHead:JSON.parse(fs.readFileSync('tools/openapi/shared-api-client-baseline.json')).sourceHead,generatorDouble:mode==='unit',actualJARGeneration:mode==='integration',productG3:false};fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));if(result.status!==0){console.log(fs.readFileSync(out+'/stdout.log','utf8').slice(-6000));console.log(fs.readFileSync(out+'/stderr.log','utf8').slice(-2000));process.exitCode=1;}
