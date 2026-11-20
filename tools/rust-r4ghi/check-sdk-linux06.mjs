import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
assert.equal(process.platform,'linux');
const root='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',out=root+'/tmp/rust-r4ghi/root/sdk-linux06';
assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
// Read-only generation uses the same real Windows-managed Git objects/index.
// Never run git init/add, fixture unit tests, or a writer with these variables.
const env={HOME:'/home/wangzishi',USER:'wangzishi',LANG:'C.UTF-8',PATH:'/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin:/usr/bin:/bin',GIT_DIR:'/mnt/e/projects/poms/.git/worktrees/poms3',GIT_WORK_TREE:root};
const git=spawnSync('/usr/bin/git',['rev-parse','--show-toplevel'],{cwd:root,env,encoding:'utf8'});assert.equal(git.status,0);assert.equal(git.stdout.trim(),root);
const stdout=fs.openSync(out+'/stdout.json','wx'),stderr=fs.openSync(out+'/stderr.log','wx');let result;
try{result=spawnSync(process.execPath,[root+'/tools/openapi/shared-api-client.mjs','--check','--java','/usr/bin/java','--jar',root+'/tmp/rust-r4abc/public-generator/7.20.0.jar'],{cwd:root,env,stdio:['ignore',stdout,stderr],timeout:180000});}finally{fs.closeSync(stdout);fs.closeSync(stderr);}
if(result.status===0){const value=JSON.parse(fs.readFileSync(out+'/stdout.json'));assert.equal(value.result,'pass');assert.equal(value.clientFiles,682);assert.equal(value.manifestSha256,'57f644666d8668afd1127e0582b99e108e77a9bf06cf113c15fc73043445885f');assert.equal(value.clientWritten,false);}
fs.writeFileSync(out+'/receipt.json',JSON.stringify({kind:'actual-Linux-full-S5-JAR-and-repair-readonly-check',exitCode:result.status,errorCode:result.error?.code??null,sourceHead:'883f88fdf4fd609bb8b0725b28bda011d408d6ee',productG3:false},null,2)+'\n');console.log(JSON.stringify({exitCode:result.status,receipt:out+'/receipt.json'}));if(result.status!==0)process.exitCode=1;
