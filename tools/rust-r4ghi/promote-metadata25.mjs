import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),rel='tools/rust-r4ghi/I/implementation/business-metadata25',author='E:/projects/worktrees/poms-r4i-lifecycle/poms/'+rel;
const raw=fs.readFileSync(author+'/manifest-metadata25.json');assert.equal(sha(raw),'b3ceb2819554581fcfdffd39ae309a69a3c9c86d6ca46cef6ab1b8cef859e62f');const m=JSON.parse(raw);assert.equal(m.files.length,8);
for(const p of [...m.runtimeSources,...m.runtimeToolDependencies])assert.equal(sha(fs.readFileSync(p.file)),p.sha256);
const changes=m.files.map(f=>{const b=fs.readFileSync(author+'/'+f.candidate);assert.equal(sha(b),f.afterSHA256);if(f.kind==='add')assert(!fs.existsSync(f.file));else assert.equal(sha(fs.readFileSync(f.file)),f.beforeSHA256);return{f,b};});
const old=fs.readFileSync('tools/rust-r4ghi/business/fault-sweep.mjs','utf8'),next=changes.find(x=>x.f.file.endsWith('fault-sweep.mjs')).b.toString(),section=s=>s.slice(s.indexOf('export function assertPeriodSweepPolicy('),s.indexOf('export async function faultSweepAndRetry('));assert.equal(section(next),section(old));
for(const name of ['manifest-metadata25.json','patch-metadata25.diff']){assert(!fs.existsSync(rel+'/'+name));fs.writeFileSync(rel+'/'+name,fs.readFileSync(author+'/'+name),{flag:'wx'});}
for(const{f,b}of changes){for(const snapshot of[f.candidate,f.beforeCandidate].filter(Boolean)){const target=rel+'/'+snapshot;assert(!fs.existsSync(target));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,fs.readFileSync(author+'/'+snapshot),{flag:'wx'});}fs.writeFileSync(f.file,b);}
fs.writeFileSync('docs/design/rust-r4ghi/metadata25-tool-promotion.json',JSON.stringify({kind:'Root-non-author-reviewed-canonical-owner-PATCH-three-write-FI-tools',manifest:rel+'/manifest-metadata25.json',manifestSHA256:sha(raw),files:m.files,
  periodPolicyAdmissionBytesExact:true,Source17And19Changed:false,HTTPAndLedgerChanged:false,
  review:['Real owned current owner project target is explicit and independently recaptured before every fault install',
   'Exactly project CAS, canonical success audit, due managed auth; same existing one-hit/fallback/rollback machinery',
   'No public client expectedVersion invented; true noop is excluded from dirty inventory and later verified from actual rows/xmin/audit',
   'Uses actual verified Legacy/unrelated scopes and absent customer, preserves primary and nested fixtures'],
  actualExecutionPending:true,G3Certified:false,G4Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({promoted:8,periodPolicyUnchanged:true,actualThreeWriteSweepPending:true}));
