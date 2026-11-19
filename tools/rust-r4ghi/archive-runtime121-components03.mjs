// Exact approved component reviews, no source promotion or runtime effects.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { C, assertOperatorHost121, json, local, pin, read } from './runtime-recovery121/root/facts121.mjs';
assertOperatorHost121();const R=C.root,O=R+'/tools/rust-r4ghi/independent/runtime121-components03-steps';
const specs=[
  {name:'I03',dir:R+'/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-B-code03-review01',review:'review-Native-B-code03-step121.json',reviewSHA:'274f4ebe7469be27bee7bfdcd3369d2a9e21152485ad3d03a6bafaea5b50f87b',manifest:'manifest.json',manifestSHA:'07fa9e6fa686bd3273d6ec7cc8f9fe4005ebd3726b5fb36ab2c3f69bfa6ae1d4',entries:9},
  {name:'H03',dir:'/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/independent-H121-code03-review01',review:'review-H121-code03-step121.json',reviewSHA:'8816ac8c1e9ba065dc1fc361fa0f82ef649cffd1e0b89b8d90d693fbf2e529ac',manifest:'manifest-review-H121-code03.json',manifestSHA:'b6b7e34d83e3a4cd6b3daa08ba500160cce1ec99b33eb15a256b09376f303b83',entries:24},
  {name:'Root8',dir:R+'/tools/rust-r4ghi/independent/final-gates13/runtime-recovery121-Root8-API-code-review01',review:'review-Root8-API-code-step121.json',reviewSHA:'687b6a158bd902d2637262471b7423c97c8ec331f7872c5d66240a447b00b6b3',manifest:'manifest.json',manifestSHA:'d1490f7f4eee0613cd2d43d28317280539aa1ed669d9fa3910fe7669398ff37f',entries:8},
];
const checked=(file,hash)=>{const p=pin(file);assert.equal(p.rawBytesSha256,hash);return p;};
const prepared=[];for(const s of specs){
  const review=checked(s.dir+'/'+s.review,s.reviewSHA),manifest=checked(s.dir+'/'+s.manifest,s.manifestSHA),r=json(review),m=json(manifest);
  assert.equal(r.kind,'non-author-runtime121-finite-code-step');assert.equal(r.verdict,'approved-bounded-step-only');assert.equal(r.reviewerIsAuthor,false);assert.equal(r.entries.length,s.entries);read(r.componentManifest);read(r.technicalG1);
  const sources=[review,manifest,...m.files.map(({file,bytes,rawBytesSha256})=>({file,bytes,rawBytesSha256}))];
  const unique=[...new Map(sources.map(p=>[p.file,p])).values()];for(const p of unique){assert(p.file.startsWith(s.dir+'/'));read(p);}
  prepared.push({s,review,manifest,unique,component:r.componentManifest,technicalG1:r.technicalG1});
}
assert(!fs.existsSync(local(O)));fs.mkdirSync(local(O),{recursive:true});const components=[];
for(const {s,review,manifest,unique,component,technicalG1}of prepared){
  const dir=O+'/'+s.name;fs.mkdirSync(local(dir));const copies=[];
  for(const p of unique){const suffix=p.file.slice(s.dir.length+1),file=dir+'/'+suffix;assert.equal(path.posix.normalize(suffix),suffix);assert(!suffix.startsWith('../'));fs.mkdirSync(local(path.posix.dirname(file)),{recursive:true});fs.writeFileSync(local(file),read(p),{flag:'wx'});const copy=checked(file,p.rawBytesSha256);assert.equal(copy.bytes,p.bytes);copies.push({original:p,copy});}
  const provenance=dir+'/raw-copies-provenance.json';fs.writeFileSync(local(provenance),JSON.stringify({kind:'Root-retained-bounded-component-code-step',review,manifest,component,technicalG1,copies,RootPromotionGranted:false,actualG2Authorized:false},null,2)+'\n',{flag:'wx'});
  components.push({name:s.name,review,manifest,component,technicalG1,entries:s.entries,provenance:pin(provenance)});
}
const result=O+'/components.json';fs.writeFileSync(local(result),JSON.stringify({kind:'Root-runtime121-approved-bounded-code-components',components,allThreeBoundedCodeStepsApproved:true,actualComplete229Graph:null,actualComplete55External:null,sourcePromotionGranted:false,APIStarted:false,nativeAuthorityGranted:false,businessG3:false,businessG4:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({components:pin(result),count:components.length,sourcePromotionGranted:false}));
