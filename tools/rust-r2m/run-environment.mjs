import fs from'node:fs';import assert from'node:assert/strict';import{spawn}from'node:child_process';import{createHash}from'node:crypto';
assert.equal(process.platform,'linux');assert.equal(process.version,'v24.19.0');assert.equal(process.cwd(),'/home/wangzishi/projects/poms-rust-r2m');
const tag=process.argv[2];assert(/^[a-z0-9-]{1,30}$/.test(tag??''));
const plan=JSON.parse(fs.readFileSync('docs/design/rust-r2m/g1-environment-plan.json'));assert.equal(plan.marker,'1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5');
const privateRoot=plan.private,privateStat=fs.lstatSync(privateRoot);assert(privateStat.isDirectory()&&!privateStat.isSymbolicLink()&&(privateStat.mode&0o077)===0);
for(const backend of['nest','rust']){const parent=plan.state+'/objects/'+backend;if(!fs.existsSync(parent))fs.mkdirSync(parent,{mode:0o700});const target=parent+'/server01';if(!fs.existsSync(target))fs.mkdirSync(target,{mode:0o700});for(const dir of[parent,target])assert(fs.lstatSync(dir).isDirectory()&&!fs.lstatSync(dir).isSymbolicLink());}
const file=`tmp/rust-r2m/environment-${tag}.json`;assert(!fs.existsSync(file));
const record={kind:'Root-new-R2M-original92-migrations-and-seed',result:'pending',startedAt:new Date().toISOString(),clientDate:'2026-10-31',sourceHead:plan.sourceHead,marker:plan.marker,steps:[],oldPGOrPrivateOrEnvironmentReused:false};
for(const mode of['start','provision','migrate','env','seed','catalog']){
 const log=privateRoot+`/environment-${tag}-${mode}.log`,fd=fs.openSync(log,'wx',0o600);let code;
 try{code=await new Promise((resolve,reject)=>{const child=spawn('/bin/bash',['tools/rust-r2m/environment.sh',mode],{stdio:['ignore',fd,fd]});child.once('error',()=>reject(new Error('Owned environment process could not start')));child.once('close',resolve);});}
 finally{fs.fsyncSync(fd);fs.closeSync(fd);}
 record.steps.push({mode,exitCode:code,privateLog:{file:log,bytes:fs.statSync(log).size,sha256:createHash('sha256').update(fs.readFileSync(log)).digest('hex'),contentsExported:false}});
 record.result=code===0?'in-progress':'failed-preserved';fs.writeFileSync(file,JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({mode,exitCode:code,privateLogContentsExported:false}));
 if(code!==0){process.exitCode=1;break;}
}
if(record.steps.length===6&&record.steps.every(x=>x.exitCode===0))record.result='pass';record.finishedAt=new Date().toISOString();fs.writeFileSync(file,JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({result:record.result,file,steps:record.steps.length}));
