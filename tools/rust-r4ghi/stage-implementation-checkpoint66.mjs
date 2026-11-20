import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms';assert.equal(process.cwd().replaceAll('\\','/'),root);
const git=args=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);return r.stdout;};
assert.equal(git(['rev-parse','HEAD']).trim(),'8c6e98db9cae598787da095084965c434ee1105a');assert.equal(git(['diff','--cached','--name-only']).trim(),'');
const scoped=['.gitattributes','apps/poms-api-rust','apps/poms-api','apps/poms-admin','libs/admin','libs/api/contracts','libs/shared/api-client','libs/shared/api-spec','libs/shared/contracts','libs/vendor/nestjs-zod','tools/openapi','tools/rust-r1b/shared-manifest.json',
 'docs/design/README.md','docs/design/backend-rust-migration-plan.md','docs/design/phase2-development-execution-tracker.md','docs/design/rust-migration-execution-tracker.md','docs/design/rust-r4-scope-and-dependencies.md','docs/design/rust-r4ghi-delivery-status.json','docs/design/rust-r4ghi-next32-baseline.md','docs/design/rust-r4ghi',
 'tools/rust-r4ghi/G','tools/rust-r4ghi/H','tools/rust-r4ghi/I','tools/rust-r4ghi/business','tools/rust-r4ghi/checkpoints','tools/rust-r4ghi/joint-g1','tools/rust-r4ghi/public131','tools/rust-r4ghi/root-proposals','tools/rust-r4ghi/independent/g2-corrective01','tools/rust-r4ghi/independent/review05'];
for(const entry of fs.readdirSync('tools/rust-r4ghi',{withFileTypes:true}))if(entry.isFile())scoped.push('tools/rust-r4ghi/'+entry.name);
scoped.push(':(exclude)tools/rust-r4ghi/independent/review05/shared-source-followup58/**');
git(['add','-A','--',...scoped]);
const files=git(['diff','--cached','--name-only']).trim().split('\n');assert(files.length>300);assert(!files.some(f=>f.includes('/shared-source-followup58/')));
assert(!files.some(f=>/node_modules|jest-root-dependency-cache|jest-cache|(^|\/)tmp\/|private\/|\.env$/.test(f)));
const out='tmp/rust-r4ghi/root/implementation-checkpoint66';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/staged-files.json',JSON.stringify(files,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(out+'/stat.log',git(['diff','--cached','--stat']),{flag:'wx'});
console.log(JSON.stringify({stagedFiles:files.length,unsealedA06Excluded:true,commitExecuted:false,mainUntouched:true}));
