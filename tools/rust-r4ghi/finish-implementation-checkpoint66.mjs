import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',sha=b=>createHash('sha256').update(b).digest('hex');
const git=args=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);return r.stdout;};
assert.equal(git(['rev-parse','HEAD']).trim(),'8c6e98db9cae598787da095084965c434ee1105a');
assert.equal(git(['branch','--show-current']).trim(),'codex/poms-r4ghi-next25');
git(['add','--','.gitattributes','docs/design/rust-r4ghi/implementation-checkpoint66.md','tools/rust-r4ghi/finish-implementation-checkpoint66.mjs']);
const files=git(['diff','--cached','--name-only']).trim().split('\n');assert(files.length>300);
assert(!files.some(f=>/node_modules|jest-root-dependency-cache|jest-cache|^tmp\/|(^|\/)private\/|\.env$/.test(f)));
const nestedTmp=files.filter(f=>f.includes('/tmp/'));assert(nestedTmp.every(f=>f.startsWith('tools/rust-r4ghi/independent/review05/')&&f.endsWith('.bin')));
assert(!files.some(f=>f.includes('/shared-source-followup58/')));
const fixed=JSON.parse(fs.readFileSync(root+'/tools/rust-r4ghi/business/required-write-sources40.json'));
for(const pin of [...fixed.productSources,...fixed.helperSources])assert.equal(sha(fs.readFileSync(root+'/'+pin.file)),pin.sha256,'Recorded source changed before checkpoint: '+pin.file);
const privateRoot='//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
const secrets=[fs.readFileSync(privateRoot+'/owner-password','utf8'),...Object.values(JSON.parse(fs.readFileSync(privateRoot+'/business/g2-business11/main01/state.json')).actors).map(a=>a.password)].filter(v=>typeof v==='string'&&v.length>=12);
const matches=[];for(const file of files){if(!fs.existsSync(root+'/'+file))continue;const bytes=fs.readFileSync(root+'/'+file);if(secrets.some(value=>bytes.includes(Buffer.from(value))))matches.push(file);}
assert.equal(matches.length,0,'Credential match in staged source; inspect locally, do not publish');
const out=root+'/tmp/rust-r4ghi/root/implementation-checkpoint66';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/staged-files.json',JSON.stringify(files,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(out+'/stat.log',git(['diff','--cached','--stat']),{flag:'wx'});
const check=git(['diff','--cached','--check']);assert.equal(check,'');fs.writeFileSync(out+'/diff-check.log',check,{flag:'wx'});
const result={kind:'actual-branch-checkpoint-precommit-input-review66',stagedFiles:files.length,source405AndHelper93Unchanged:true,nestedTmpFilesAreExplicitStaticEvidenceCopies:nestedTmp.length,
 rawSealedWhitespacePreservedWithNarrowAttributes:true,actualCredentialsInStagedFiles:false,unsealedSharedSourceFollowupExcluded:true,diffCheckExitCode:0,Gate:'G3 Pending',mainCommitAllowed:false,DoneAllowed:false};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
