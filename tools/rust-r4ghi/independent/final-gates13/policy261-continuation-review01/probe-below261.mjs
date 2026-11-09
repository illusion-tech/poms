// Independent fixed-FS/pure-guard probe. Never invokes execute/createContext/API.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms';
const h='E:/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/implementation/support-patches/policy-replayless261';
const d='//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business13/main01';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=(file,hash)=>{assert(!/(^|[\\/])state\.json$/.test(file));const b=fs.readFileSync(file);assert.equal(sha(b),hash);return b;};
const sources=[['core261.mjs','0fe889f86e59c253ca8e397338b535509d5ec0485a8ab09f6c5a7abf5bfef6d3'],['publisher02/proposed/publish261.mjs','de377243da452609b38e8efac7e49f415cc26a4216ed4afc3cc3c1941dd5d9c0'],['cases261.mjs','3417200789cb96c40f41f23b211abdd3b6dd54adf6b4698148a217ca8f581b92'],['continue261.mjs','3c9f42104ff3a172da823fb88b7b63120b278a8407235d9bfc7c8d518bc8d7a5']];
for(const[file,hash]of sources)read(h+'/'+file,hash);
const state=JSON.parse(read(d+'/policy261-publication264/state-after-exact-block-removal261.json','7b68f60b85ad6b662603034f0f8434fe2b8b64320796da1bdb66be1106115979'));
const ack=JSON.parse(read(d+'/policy261-publication264/published261.json','c4384a92025b489b0d84b8bf6fe68d33d7cd9cb5ff4c0398341bdd169dd0e929'));
// Imported module's CLI guard is false: process.argv[1] is this review probe.
const c=await import(pathToFileURL(h+'/continue261.mjs').href);
assert.equal(c.assertContinuationState261(state,ack).fixtures.project.id,'d30c0da1-692e-4e7e-ba2c-ad81ad8898f0');
const checks=[{name:'actual-fixed-post-publisher-state',pass:true}];
const template=JSON.parse(read(h+'/continuation-input261.template.json','7101de22afa4caacb69989cb331ca42119f9e9345a77f42f4411f0bc8b20e027'));
assert.throws(()=>c.assertContinuationInput261(template));checks.push({name:'null-template-rejected',pass:true});
for(const[name,change]of [
 ['active-block',s=>s.blockedObservation={file:'x'}],
 ['active-fault',s=>s.activeFault={}],
 ['wrong-epoch',s=>s.epoch='g2-business14'],
 ['running-prior-step',s=>s.fixtures.hPolicyCoverage26.continuation261={steps:{below:{phase:'running'}}}],
 ['stopped-prior-step',s=>s.fixtures.hPolicyCoverage26.continuation261={steps:{below:{phase:'stopped-reconcile-originals-no-replay'}}}],
 ['old-stopped-stage-relabelled',s=>s.fixtures.hPolicyCoverage26.stages['fresh-G-H-below'].phase='verified'],
]){const copy=structuredClone(state);change(copy);assert.throws(()=>c.assertContinuationState261(copy,ack));checks.push({name,pass:true});}
for(const[file,hash]of sources)read(h+'/'+file,hash);
const result={kind:'independent-pure-fixed-FS-below261-state-guard-probe',node:process.version,checks,passed:checks.length,failed:0,executedContinuation:false,RootWrites:false,activeStateRead:false,SQL:false,HTTP:false,PIDRead:false,G3Certified:false,G4Certified:false};
const out=root+'/tools/rust-r4ghi/independent/final-gates13/policy261-continuation-review01/probe-below261.json';
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
