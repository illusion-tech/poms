import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { treeManifest, loadBaseline } from '../openapi/shared-api-client.mjs';
const baseline=loadBaseline();assert.equal(baseline.sourceHead,'883f88fdf4fd609bb8b0725b28bda011d408d6ee');
assert.equal(baseline.spec.operations.length,296);assert.equal(baseline.spec.schemas.length,689);
const out='tmp/rust-r4ghi/root/client-generation04';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const before=treeManifest('libs/shared/api-client',{timestamps:true});
fs.writeFileSync(out+'/target-before.json',JSON.stringify(before,null,2)+'\n',{flag:'wx'});
const env={};for(const[key,value]of Object.entries(process.env))if(['PATH','HOME','USERPROFILE','APPDATA','LOCALAPPDATA','SYSTEMROOT','COMSPEC','TEMP','TMP','PROGRAMFILES','PROGRAMFILES(X86)','PROCESSOR_ARCHITECTURE'].includes(key.toUpperCase()))env[key]=value;
env.PATH=path.dirname(process.execPath)+path.delimiter+(env.PATH??env.Path??'');env.POMS_OPENAPI_JAVA='C:/Program Files/Java/jdk-17/bin/java.exe';env.POMS_OPENAPI_GENERATOR_JAR=path.resolve('tmp/rust-r4abc/public-generator/7.20.0.jar');
const pin=file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')}};
const commands=[];
for(const mode of ['--write','--check']){
 const stdout=fs.openSync(out+'/'+mode.slice(2)+'-stdout.json','wx'),stderr=fs.openSync(out+'/'+mode.slice(2)+'-stderr.log','wx');const startedAt=new Date().toISOString();let result;
 try{result=spawnSync(process.execPath,['tools/openapi/shared-api-client.mjs',mode],{cwd:process.cwd(),env,stdio:['ignore',stdout,stderr],windowsHide:true,timeout:300000});}finally{fs.closeSync(stdout);fs.closeSync(stderr);}
 commands.push({mode,startedAt,completedAt:new Date().toISOString(),exitCode:result.status,errorCode:result.error?.code??null,stdout:pin(out+'/'+mode.slice(2)+'-stdout.json'),stderr:pin(out+'/'+mode.slice(2)+'-stderr.log')});
 fs.writeFileSync(out+'/progress.json',JSON.stringify({sourceHead:baseline.sourceHead,commands},null,2)+'\n');
 if(result.status!==0){console.log(JSON.stringify({mode,exitCode:result.status,progress:out+'/progress.json'}));console.log(fs.readFileSync(out+'/'+mode.slice(2)+'-stderr.log','utf8').slice(-5000));process.exitCode=1;break;}
 const value=JSON.parse(fs.readFileSync(out+'/'+mode.slice(2)+'-stdout.json'));assert.equal(value.result,'pass');assert.equal(value.spec.operations,296);assert.equal(value.spec.schemas,689);assert.equal(value.metadataPreserved,true);
}
const after=treeManifest('libs/shared/api-client',{timestamps:true});
fs.writeFileSync(out+'/target-after.json',JSON.stringify(after,null,2)+'\n',{flag:'wx'});
const passed=commands.length===2&&commands.every(c=>c.exitCode===0);
fs.writeFileSync(out+'/receipt.json',JSON.stringify({kind:'actual-fixed-S5-full-SDK-write-and-check',capturedAt:new Date().toISOString(),sourceHead:baseline.sourceHead,fullInventory:{paths:242,operations:296,schemas:689},fixedJar:pin(env.POMS_OPENAPI_GENERATOR_JAR),commands,beforeFiles:before.length,afterFiles:after.length,writeAndCheckPassed:passed,productG3:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({beforeFiles:before.length,afterFiles:after.length,writeAndCheckPassed:passed,receipt:out+'/receipt.json'}));
