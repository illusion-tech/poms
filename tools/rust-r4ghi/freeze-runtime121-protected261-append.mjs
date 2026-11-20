// Freeze only the two existing protected dependencies after non-author design review.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const R='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const I='/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/runtime-recovery121-protected261-supplement02';
const H='/mnt/e/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/independent-runtime-recovery121-protected261-design02';
const O=R+'/tools/rust-r4ghi/runtime-recovery121/g1B-protected261-append01';
const local=f=>f.startsWith('/mnt/e/')?'E:/'+f.slice(7):f.startsWith('/home/')?'//wsl.localhost/Debian'+f:f;
const sha=b=>createHash('sha256').update(b).digest('hex');
function read(file,hash,bytes){
  const path=local(file),s=fs.lstatSync(path);assert(s.isFile()&&!s.isSymbolicLink());assert.equal(s.nlink,1);
  const b=fs.readFileSync(path);if(hash)assert.equal(sha(b),hash,file);if(bytes!==undefined)assert.equal(b.length,bytes,file);
  return {b,pin:{file,bytes:b.length,rawBytesSha256:sha(b)}};
}
const manifest=read(I+'/manifest-protected261-supplement02.json','af89ff128a0325e82af0e9766c5788d14cca207103704068b94518711f305c12',1128);
const proposal=read(I+'/protected261-registration02.PROPOSED.json','a0724e5bc4bd90f6d1cfeac4c1daa5282e748c908ba50aae33a6fda8792301a6',5423);
const review=read(H+'/review-protected261-design02.json','42226f43be965d3985f0140a66c946f7619e1f5f1eac32c80c096a67b1853b2f',15500);
const reviewManifest=read(H+'/manifest-review-protected261-design02.json','fcb61cb7819e51f09dd3054f556ed0089b83a107b3441cd7273315357ec60476',1603);
const m=JSON.parse(manifest.b),p=JSON.parse(proposal.b),r=JSON.parse(review.b),rm=JSON.parse(reviewManifest.b);
assert.equal(r.kind,'non-author-runtime121-protected261-dependency-design-review');
assert.equal(r.verdict,'recommend-code-only-append');assert.equal(r.reviewerIsAuthor,false);assert.equal(r.actualG2Authorized,false);
assert.deepEqual(r.approvedProposal,manifest.pin);assert.deepEqual(r.specification,proposal.pin);assert.deepEqual(rm.review,review.pin);
assert.deepEqual(m.files,[proposal.pin]);assert.equal(p.sources.length,2);assert.equal(p.productionADD,0);assert.equal(p.productionMOD,0);assert.equal(p.H3Still,229);
const origin=read(p.originManifest.file,p.originManifest.rawBytesSha256,p.originManifest.bytes);
const original=JSON.parse(origin.b).protected261GenericDependencyOnly;
assert.deepEqual(original,p.sources);assert.equal(p.originPointer,'/protected261GenericDependencyOnly');
const archive=read(m.actualArchive.file,m.actualArchive.rawBytesSha256,m.actualArchive.bytes),a=JSON.parse(archive.b);
assert.equal(a.sourceCount,2);assert.equal(a.combinedUniqueSourceCount,272);assert.equal(a.productionChanges,0);assert.equal(a.H3Changes,0);
assert.equal(a.newCurrentRegistrationGranted,false);assert.equal(a.oldPinsAndSourcesUnmodified,true);
assert.deepEqual(r.actualArchive,archive.pin);assert.deepEqual(p.newArchive.actualPin,archive.pin);
for(const source of p.sources){
  read(source.file,source.rawBytesSha256,source.bytes);
  const mapping=a.mappings.find(x=>x.originalPin.file===source.file);assert(mapping,source.file);
  assert.equal(mapping.originalPin.rawBytesSha256,source.rawBytesSha256);
  const copy=mapping.privateRawCopy;
  read(copy.file,source.rawBytesSha256,source.bytes);
}
assert(!fs.existsSync(local(O)));fs.mkdirSync(local(O),{recursive:true});
const copies=[];
for(const [q,name]of [[manifest,'manifest-proposal.json'],[proposal,'protected261-registration02.PROPOSED.json'],[review,'review-protected261-design02.json'],[reviewManifest,'manifest-review-protected261-design02.json']]){
  const file=O+'/'+name;fs.writeFileSync(local(file),q.b,{flag:'wx'});copies.push({original:q.pin,copy:read(file,q.pin.rawBytesSha256,q.pin.bytes).pin});
}
const base=read(R+'/tools/rust-r4ghi/runtime-recovery121/g1B/Root-G1B-121.json','be96f468fe8c7aa58dcebe6f687ef90d0afb46f1d9ca2ac2bc2b3e90974206cc').pin;
const value={kind:'Root-frozen-runtime121-G1B-fixed-protected261-dependency-append',schemaVersion:1,recordedAt:new Date().toISOString(),issue:121,parentG1B:base,exactProposal:manifest.pin,independentDesignReview:review.pin,originManifest:p.originManifest,originPointer:p.originPointer,sources:p.sources,actualArchive:archive.pin,
  registration:{location:p.contract.compositionLocation,kind:p.contract.registrationKind,exactKeys:p.contract.registrationKeys,registryLocation:'sourceArchive.dependencySupplement',basePlanShapeUnchanged:true},
  requirements:['Only the fixed original1570 pointer and exact two Root files/raw hashes; reject third, substituted or renamed dependencies','Keep base266 and H9 supplement4 raw maps unchanged; the separate actual two-source map explicitly makes272 identities','Read retained source copies as historical identity only; never import or execute archives','Every current guard must verify the complete exact live external closure including both protected sources; counts alone do not establish closure','Publish only after real code review, exact composition and separate actual G2; no effect or future authority derives from this append'],
  scope:{productionADD:0,productionMOD:0,H3PlannedComplete:229,backendSources:420,compileInputs:528,RustChanges:0,beforeExternalPlanned:45,currentExternalPlanned:55,actualCurrentExternalMeasured:false},
  codeImplementationGranted:true,RootPromotionGranted:false,codeReady:false,actualRegistrationGranted:false,actualG2Authorized:false,actualNativeAuthority:null,businessG3:false,businessG4:false};
const file=O+'/Root-G1B-protected261-append01.json';fs.writeFileSync(local(file),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(local(O+'/raw-copies-provenance.json'),JSON.stringify({kind:'Root-protected261-design-original-copies',copies,actualEffects:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({append:read(file).pin,codeOnly:true,actualG2:false}));
