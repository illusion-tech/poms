import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
assert.equal(process.platform,'linux');
const source='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',root='/home/wangzishi/projects/poms-rust-r4ghi',A='2cd1be6029cf1b14ebfb1fc4530af894507a4c5a';
assert.deepEqual(JSON.parse(fs.readFileSync(root+'/.poms-r4ghi-mirror.json')),{namespace:'poms-r4ghi',sourceRoot:source});
const out=source+'/tmp/rust-r4ghi/root/sdk-linux09';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const actual=JSON.parse(fs.readFileSync(source+'/tmp/rust-r4ghi/root/client-generation06/receipt.json'));assert(actual.writeAndCheckPassed);assert.equal(actual.sourceHead,A);
const check=actual.commands.find(x=>x.mode==='--check'),checkBytes=fs.readFileSync(source+'/'+check.stdout.file);assert.equal(sha(checkBytes),check.stdout.sha256);
const windows=JSON.parse(checkBytes);assert.equal(windows.clientFiles,683);assert.equal(windows.spec.schemas,690);
function tree(folder,prefix=''){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>{assert(!e.isSymbolicLink());const sub=prefix?prefix+'/'+e.name:e.name;return e.isDirectory()?tree(folder+'/'+e.name,sub):[{file:sub,sha256:sha(fs.readFileSync(folder+'/'+e.name))}];}).sort((a,b)=>a.file.localeCompare(b.file,'en'));}
const client='libs/shared/api-client',previous=JSON.parse(fs.readFileSync(source+'/tmp/rust-r4ghi/root/sdk-linux08/input-manifest.json')).sdkBefore;
const mirrorBefore=tree(root+'/'+client);assert.deepEqual(mirrorBefore,previous,'Only the exact previously certified owned S5 SDK may be replaced');
const rootBefore=tree(source+'/'+client),wanted=new Set(rootBefore.map(x=>x.file));assert.equal(rootBefore.length,683);
for(const row of rootBefore){const target=path.resolve(root,client,row.file);assert(target.startsWith(root+'/'+client+'/'));const bytes=fs.readFileSync(source+'/'+client+'/'+row.file);assert.equal(sha(bytes),row.sha256);fs.mkdirSync(path.dirname(target),{recursive:true});if(!fs.existsSync(target)||sha(fs.readFileSync(target))!==row.sha256)fs.writeFileSync(target,bytes);}
for(const row of mirrorBefore.filter(x=>!wanted.has(x.file))){const target=path.resolve(root,client,row.file);assert(target.startsWith(root+'/'+client+'/'));assert.equal(sha(fs.readFileSync(target)),row.sha256);assert(!fs.lstatSync(target).isSymbolicLink());fs.unlinkSync(target);}
const baseline=JSON.parse(fs.readFileSync(source+'/tools/openapi/shared-api-client-baseline.json'));assert.equal(baseline.sourceHead,A);
const inputs=[...baseline.protectedSources.map(x=>x.file),'tools/openapi/shared-api-client-baseline.json','tools/openapi/shared-api-client.mjs','tools/openapi/repair-generated-models.mjs'],pins=[];
for(const file of inputs){assert(!path.isAbsolute(file)&&!file.split('/').includes('..'));const bytes=fs.readFileSync(source+'/'+file),target=root+'/'+file;fs.mkdirSync(path.dirname(target),{recursive:true});if(!fs.existsSync(target)||sha(fs.readFileSync(target))!==sha(bytes))fs.writeFileSync(target,bytes);pins.push({file,sha256:sha(bytes)});}
const before=tree(root+'/'+client);assert.deepEqual(before,rootBefore);fs.writeFileSync(out+'/input-manifest.json',JSON.stringify({pins,previousExactOwnedMirror:mirrorBefore,sdkBefore:before,expectedWindowsManifest:windows.manifestSha256},null,2)+'\n',{flag:'wx'});
const env={HOME:'/home/wangzishi',USER:'wangzishi',LANG:'C.UTF-8',PATH:'/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin:/usr/bin:/bin',GIT_DIR:'/mnt/e/projects/poms/.git/worktrees/poms3',GIT_WORK_TREE:root};
const stdout=fs.openSync(out+'/stdout.json','wx'),stderr=fs.openSync(out+'/stderr.log','wx');let result;
try{result=spawnSync(process.execPath,[root+'/tools/openapi/shared-api-client.mjs','--check','--java','/home/wangzishi/.cache/poms-r4ghi-java17/jdk-17.0.12+7-jre/bin/java','--jar',source+'/tmp/rust-r4abc/public-generator/7.20.0.jar'],{cwd:root,env,stdio:['ignore',stdout,stderr],timeout:360000});}finally{fs.closeSync(stdout);fs.closeSync(stderr);}
const stable=pins.every(x=>sha(fs.readFileSync(source+'/'+x.file))===x.sha256&&sha(fs.readFileSync(root+'/'+x.file))===x.sha256);assert(stable);assert.deepEqual(before,tree(root+'/'+client));assert.deepEqual(rootBefore,tree(source+'/'+client));
if(result.status===0){const value=JSON.parse(fs.readFileSync(out+'/stdout.json'));assert.equal(value.result,'pass');assert.equal(value.manifestSha256,windows.manifestSha256);assert.equal(value.clientWritten,false);}
const receipt={kind:'actual-owned-Linux-S6-full-readonly-SDK-check',exitCode:result.status,errorCode:result.error?.code??null,sourceStable:stable,actualRootSDKBound:true,rootAndMirrorSDKUnchangedDuringCheck:true,sourceHead:A,expectedWindowsManifest:windows.manifestSha256,productG3:false};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));if(result.status!==0)process.exitCode=1;
