import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = resolve('.');
const out = resolve('tools/rust-r4ghi/independent/business-g1/round02/preread01');
const sha = b => createHash('sha256').update(b).digest('hex');
const files = [
  ...['blueprint.json','build.py','dto-index.json','integration.md','interface-targets.json','legacy-current-contract.json','manifest.json','migration.sql','orm-delta.json','policy-definition.json','preserved-inputs.json','public-contracts.schema.json','restatement-contract.json','scope-response-contract.json','source-context.schema.json','sources.json','tests-plan.json','trigger-counterexamples.sql','verify.py'].map(p => `tools/rust-r4ghi/joint-g1/effective-v2/${p}`),
  'docs/design/rust-r4ghi-next32-baseline.md','docs/design/rust-r4ghi/acceptance-plan01.json','docs/design/rust-r4ghi/user-decision-scope03.json','docs/design/rust-r4ghi/user-decisions02.json','docs/design/api-route-canonical-inventory.md','docs/design/rust-r4ghi-delivery-status.json',
];
function save(p,b) { const t = resolve(out,p); if(!t.startsWith(out + (process.platform === 'win32' ? '\\' : '/'))) throw new Error('outside own path'); mkdirSync(dirname(t),{recursive:true}); writeFileSync(t,b,{flag:'wx'}); }
const records = files.map(p => {
  if(!existsSync(p)) return {file:p, exists:false};
  const b = readFileSync(p), rawBytesSha256 = sha(b), copy = `inputs/${p}.bin`;
  save(copy,b);
  return {file:p, exists:true, bytes:b.length, rawBytesSha256, copy, stableAcrossRead:sha(readFileSync(p))===rawBytesSha256};
});
const git = args => { const r = spawnSync('git',args,{cwd:root,shell:false,encoding:'utf8',windowsHide:true}); if(r.status!==0) throw new Error(r.stderr); return r.stdout.trim(); };
const manifest = {kind:'independent-joint-g1-second-round-preread-inputs', capturedAt:new Date().toISOString(), localHEAD:git(['rev-parse','HEAD']), localBranch:git(['branch','--show-current']), formalCandidate:false, G1Certified:false, G2Authorized:false, qualification:'Pre-read of unfinished author package only; exact final candidate must be byte-compared and changed sections reviewed again.',records};
save('candidate-inputs.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
console.log(JSON.stringify({manifest:'tools/rust-r4ghi/independent/business-g1/round02/preread01/candidate-inputs.json', records:records.map(({file,exists,bytes,rawBytesSha256,stableAcrossRead})=>({file,exists,bytes,rawBytesSha256,stableAcrossRead}))},null,2));
