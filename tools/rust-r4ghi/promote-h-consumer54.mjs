import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',relative='tools/rust-r4ghi/H/implementation/support-patches/ui-integration/consumer54-binding',proposal='E:/projects/worktrees/poms-r4h-signals/poms/'+relative;
const sha=b=>createHash('sha256').update(b).digest('hex'),raw=fs.readFileSync(proposal+'/manifest-consumer54.json');
assert.equal(sha(raw),'2112a4ac152b53d70a27c22f9ff733befa8f4810ac297d64110af38a884be041');const m=JSON.parse(raw);assert.equal(m.products.length,7);
const out=root+'/docs/design/rust-r4ghi/h-consumer54-tool-promotion.json';assert(!fs.existsSync(out));
// This promotion is only valid after the actual independent data-admission step.
const statePath='//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business11/main01/state.json';
const state=JSON.parse(fs.readFileSync(statePath));assert(state.consumerAdmission54&&!state.admissionPending54&&!state.activeFault&&!state.blockedObservation);
for(const p of m.products){assert(p.file.startsWith('tools/rust-r4ghi/H/')&&!p.file.includes('..'));assert.equal(sha(fs.readFileSync(proposal+'/proposed/'+p.file)),p.candidateRawBytesSha256);
 if(p.baseRawBytesSha256===null)assert(!fs.existsSync(root+'/'+p.file));else assert.equal(sha(fs.readFileSync(root+'/'+p.file)),p.baseRawBytesSha256);}
for(const p of m.products){fs.copyFileSync(proposal+'/proposed/'+p.file,root+'/'+p.file);assert.equal(sha(fs.readFileSync(root+'/'+p.file)),p.candidateRawBytesSha256);}
const dest=root+'/'+relative;fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(dest+'/manifest-consumer54.json',raw,{flag:'wx'});
for(const a of m.artifacts){const bytes=fs.readFileSync(proposal+'/'+a.file);assert.equal(sha(bytes),a.rawBytesSha256);fs.writeFileSync(dest+'/'+a.file,bytes,{flag:'wx'});}
fs.writeFileSync(out,JSON.stringify({kind:'Root-nonauthor-exact-H-consumer54-tools-promoted',manifest:{file:relative+'/manifest-consumer54.json',rawBytesSha256:sha(raw)},products:m.products,
 actualConsumerAdmission:state.consumerAdmission54.registry,originalSealed20CopyPlanUnchanged:true,explicitCorrectiveToolClosureRequired:true,actualBrowserExecuted:false,G3Certified:false,G4Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({promoted:7,actualBrowserExecuted:false,receipt:out}));
