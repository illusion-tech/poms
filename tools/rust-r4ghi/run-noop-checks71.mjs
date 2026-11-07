import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
assert.equal(process.platform,'linux');
const root='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',node=process.execPath;
const jobs=[['sync-business-linux02.mjs','--rust-only'],['rust-check01.mjs','fmt','08'],['rust-check01.mjs','clippy','10'],['rust-check01.mjs','test','09'],['rust-check01.mjs','build','09']];
for(const job of jobs){const r=spawnSync(node,[root+'/tools/rust-r4ghi/'+job[0],...job.slice(1)],{cwd:root,env:process.env,encoding:'utf8',timeout:950000,maxBuffer:100000});
 process.stdout.write(r.stdout??'');if(r.status!==0){process.stderr.write(r.stderr??'');process.exitCode=1;break;}}
