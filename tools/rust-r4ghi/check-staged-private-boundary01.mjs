// Check only concrete credentials/cookies of this owned test namespace.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
assert.equal(process.platform,'linux');
const edition=process.argv[2]??'01';assert(/^\d{2}$/.test(edition));
const base='/home/wangzishi/.local/share/poms-r4ghi/private';
const needles=['owner-password','jwt-secret','native-app-password','rust-app-password'].map(n=>fs.readFileSync(base+'/'+n,'utf8').trim());
const state=JSON.parse(fs.readFileSync(base+'/userfix/userfix115/run01/state.json','utf8'));
for(const actor of Object.values(state.actors))for(const value of Object.values(actor.cookies??{}))if(value.length>=16)needles.push(value,decodeURIComponent(value));
const args=['--git-dir=/mnt/e/projects/poms/.git/worktrees/poms3','--work-tree=/mnt/e/projects/worktrees/poms-r3hijk-next28/poms'];
const git=more=>execFileSync('/usr/bin/git',[...args,...more],{encoding:null,maxBuffer:20000000});
const files=git(['diff','--cached','--name-only','--diff-filter=ACMR','-z']).toString('utf8').split('\0').filter(Boolean);
const matches=[],sha=b=>createHash('sha256').update(b).digest('hex'),inputs=[];
for(const file of files){const bytes=git(['show',':'+file]);inputs.push({file,rawBytesSha256:sha(bytes)});if(needles.some(value=>bytes.includes(Buffer.from(value))))matches.push(file);}
assert.equal(matches.length,0,'Staged payload contains an owned runtime secret; values are not returned');
const result={kind:'owned-runtime-secret-staged-payload-check',capturedAt:new Date().toISOString(),stagedTree:git(['write-tree']).toString('utf8').trim(),stagedFiles:files.length,ownedRuntimeSecretMatches:0,scope:'Only actual secrets and cookies from the new poms-r4ghi namespace; not a general security certification',inputs};
fs.writeFileSync('/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tmp/rust-r4ghi/root/staged-boundary'+edition+'.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({stagedFiles:files.length,ownedRuntimeSecretMatches:0,stagedTree:result.stagedTree}));
