import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',iw='E:/projects/worktrees/poms-r4i-lifecycle/poms';
const own=resolve(root,'tools/rust-r4ghi/independent/g2-corrective01'),sha=b=>createHash('sha256').update(b).digest('hex');
const records=[];
function save(path,b){const p=resolve(own,path);if(!p.startsWith(own+'\\'))throw new Error('outside owned evidence');mkdirSync(dirname(p),{recursive:true});writeFileSync(p,b,{flag:'wx'});return p;}
const paths=[
 ['I','tools/rust-r4ghi/I/implementation/support-patches/project-action-authorization.rs.txt'],
 ...['mod.rs','model.rs','request.rs','runtime.rs','scalars.rs','schema.rs'].flatMap(f=>[['Root',`apps/poms-api-rust/src/project_operating_common/${f}`],['I',`apps/poms-api-rust/src/project_operating_common/${f}`]]),
 ['Root','docs/design/rust-r4ghi/g2-corrective01.md'],['Root','docs/design/rust-r4ghi/g2-corrective01.sql'],['Root','docs/design/rust-r4ghi/g2-public-delta01.json'],
 ['Root','apps/poms-api-rust/src/project_handover/mod.rs'],['Root','apps/poms-api-rust/src/project_handover/sources.rs'],['Root','apps/poms-api-rust/src/contract_support/mod.rs'],['Root','apps/poms-api-rust/src/approval_common/session.rs'],
 ...['public-contracts.schema.json','source-context.schema.json','interface-targets.json','scope-response-contract.json','blueprint.json'].map(f=>['Root',`tools/rust-r4ghi/joint-g1/effective-v2/${f}`]),
];
for(const [workspace,file] of paths){const abs=resolve(workspace==='Root'?root:iw,file);const b=readFileSync(abs),hash=sha(b),copy=save(`inputs/${workspace}/${file}.bin`,b);records.push({workspace,file,absoluteSource:abs,bytes:b.length,rawBytesSha256:hash,stableAcrossRead:sha(readFileSync(abs))===hash,copy});}
const heads={};for(const [name,cwd] of [['Root',root],['I',iw]]){const r=spawnSync('git',['rev-parse','HEAD'],{cwd,shell:false,encoding:'utf8',windowsHide:true});if(r.status!==0)throw new Error(r.stderr);heads[name]=r.stdout.trim();}
const manifest={kind:'independent-G2-limited-static-prereview-inputs',capturedAt:new Date().toISOString(),roots:{Root:root,I:iw},heads,scope:'Uncompiled in-progress candidate and unapplied authorization proposal only. No G3 acceptance.',records,G3Certified:false,databaseConnections:0,productWrites:false,gitWrites:false};
save('input-manifest01.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
console.log(JSON.stringify({records:records.length,heads,unstable:records.filter(r=>!r.stableAcrossRead),scopeProposal:records[0],manifest:resolve(own,'input-manifest01.json')},null,2));
