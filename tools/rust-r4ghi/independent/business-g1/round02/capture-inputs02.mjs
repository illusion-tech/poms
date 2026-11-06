import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=resolve('.'), owned=resolve('tools/rust-r4ghi/independent/business-g1/round02');
const label=process.argv[2];
if(!label||!/^[a-z0-9-]+$/.test(label))throw new Error('safe new output label required');
const out=resolve(owned,label), base='tools/rust-r4ghi/joint-g1/effective-v2';
const sha=b=>createHash('sha256').update(b).digest('hex');
const inputs=[...readdirSync(base,{withFileTypes:true}).filter(d=>d.isFile()).map(d=>`${base}/${d.name}`),
 'docs/design/rust-r4ghi-next32-baseline.md','docs/design/rust-r4ghi/acceptance-plan01.json','docs/design/rust-r4ghi/user-decision-scope03.json','docs/design/rust-r4ghi/user-decisions02.json','docs/design/api-route-canonical-inventory.md','docs/design/rust-r4ghi-delivery-status.json',
 'docs/design/rust-r4ghi/operation-map01.json','docs/design/rust-r4ghi/source-manifest01.json',
 ...process.argv.slice(3)];
function save(p,b){const t=resolve(out,p);if(!t.startsWith(out+(process.platform==='win32'?'\\':'/')))throw new Error('outside own path');mkdirSync(dirname(t),{recursive:true});writeFileSync(t,b,{flag:'wx'});}
const records=[...new Set(inputs)].map(file=>{if(!existsSync(file))return{file,exists:false};const b=readFileSync(file), rawBytesSha256=sha(b),copy=`inputs/${file}.bin`;save(copy,b);return{file,exists:true,bytes:b.length,rawBytesSha256,copy,stableAcrossRead:sha(readFileSync(file))===rawBytesSha256};});
const git=args=>{const r=spawnSync('git',args,{cwd:root,shell:false,encoding:'utf8',windowsHide:true});if(r.status!==0)throw new Error(r.stderr);return r.stdout.trim();};
const manifest={kind:'independent-joint-g1-input-capture',capturedAt:new Date().toISOString(),label,localHEAD:git(['rev-parse','HEAD']),localBranch:git(['branch','--show-current']),G1Certified:false,G2Authorized:false,records};
save('candidate-inputs.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
console.log(JSON.stringify({manifest:`tools/rust-r4ghi/independent/business-g1/round02/${label}/candidate-inputs.json`,head:manifest.localHEAD,total:records.length,unstable:records.filter(r=>r.exists&&!r.stableAcrossRead),missing:records.filter(r=>!r.exists)},null,2));
