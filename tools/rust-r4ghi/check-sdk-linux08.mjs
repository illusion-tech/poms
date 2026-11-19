import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
assert.equal(process.platform,'linux');
const source='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',root='/home/wangzishi/projects/poms-rust-r4ghi';
const marker=JSON.parse(fs.readFileSync(root+'/.poms-r4ghi-mirror.json'));assert.equal(marker.namespace,'poms-r4ghi');assert.equal(marker.sourceRoot,source);
const out=source+'/tmp/rust-r4ghi/root/sdk-linux08';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=JSON.parse(fs.readFileSync(source+'/tools/openapi/shared-api-client-baseline.json'));
const inputs=[...baseline.protectedSources.map(x=>x.file),'tools/openapi/shared-api-client-baseline.json','tools/openapi/shared-api-client.mjs','tools/openapi/repair-generated-models.mjs'];
const pins=[];
for(const file of inputs){assert(!file.includes('..')&&!path.isAbsolute(file));const bytes=fs.readFileSync(source+'/'+file),target=root+'/'+file;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);pins.push({file,sha256:sha(bytes)});}
function tree(folder,prefix=''){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>{assert(!e.isSymbolicLink());const sub=prefix?prefix+'/'+e.name:e.name;return e.isDirectory()?tree(folder+'/'+e.name,sub):[{file:sub,sha256:sha(fs.readFileSync(folder+'/'+e.name))}]}).sort((a,b)=>a.file.localeCompare(b.file,'en'));}
const before=tree(root+'/libs/shared/api-client');assert.deepEqual(before,tree(source+'/libs/shared/api-client'),'Mirror must be the actual full Root SDK');
fs.writeFileSync(out+'/input-manifest.json',JSON.stringify({pins,sdkBefore:before},null,2)+'\n');
const env={HOME:'/home/wangzishi',USER:'wangzishi',LANG:'C.UTF-8',PATH:'/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin:/usr/bin:/bin',GIT_DIR:'/mnt/e/projects/poms/.git/worktrees/poms3',GIT_WORK_TREE:root};
const stdout=fs.openSync(out+'/stdout.json','wx'),stderr=fs.openSync(out+'/stderr.log','wx');let result;
try{result=spawnSync(process.execPath,[root+'/tools/openapi/shared-api-client.mjs','--check','--java','/home/wangzishi/.cache/poms-r4ghi-java17/jdk-17.0.12+7-jre/bin/java','--jar',source+'/tmp/rust-r4abc/public-generator/7.20.0.jar'],{cwd:root,env,stdio:['ignore',stdout,stderr],timeout:360000});}finally{fs.closeSync(stdout);fs.closeSync(stderr);}
const stable=pins.every(x=>sha(fs.readFileSync(source+'/'+x.file))===x.sha256&&sha(fs.readFileSync(root+'/'+x.file))===x.sha256);
assert.deepEqual(before,tree(root+'/libs/shared/api-client'));assert.deepEqual(before,tree(source+'/libs/shared/api-client'));assert(stable);
if(result.status===0){const value=JSON.parse(fs.readFileSync(out+'/stdout.json'));assert.equal(value.result,'pass');assert.equal(value.manifestSha256,'57f644666d8668afd1127e0582b99e108e77a9bf06cf113c15fc73043445885f');assert.equal(value.clientWritten,false);}
fs.writeFileSync(out+'/receipt.json',JSON.stringify({kind:'actual-owned-Linux-mirror-full-S5-readonly-check',exitCode:result.status,errorCode:result.error?.code??null,sourceStable:stable,actualRootSDKBound:true,rootAndMirrorSDKUnchanged:true,sourceHead:baseline.sourceHead,productG3:false},null,2)+'\n');console.log(JSON.stringify({exitCode:result.status,errorCode:result.error?.code??null,sourceStable:stable,receipt:out+'/receipt.json'}));if(result.status!==0)process.exitCode=1;
