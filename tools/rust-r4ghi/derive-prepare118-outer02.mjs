// Preserve the executed first dispatcher; bind the new dispatcher to reviewed code02.
import fs from 'node:fs'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms',sha=b=>createHash('sha256').update(b).digest('hex');
const original=R+'/tools/rust-r4ghi/execute-prepare118-once.mjs',target=R+'/tools/rust-r4ghi/execute-prepare118-once02.mjs';
const before=fs.readFileSync(original);assert.equal(sha(before),'48c8b576622130db8efaaf628ec057ba9bd7132133f55a851e9517ea3248e71a');
const edits=[['/tax15-prepare118-prepared01','/tax15-prepare118-prepared02'],[
  "assert.equal(entry.rawBytesSha256, 'e0a4a9a8fb1f06a974a5f854e18fd5edeb987c2ffdeda79499b8161fc388df30');",
  "const codeReview = JSON.parse(read(input.codeReview.file, input.codeReview.rawBytesSha256).b);\nassert.equal(codeReview.kind, 'non-author-Tax15-invocation118-code-review');\nassert.equal(codeReview.verdict, 'code-ready-for-exact-input-review');\nassert.equal(codeReview.reviewerIsAuthor, false);\nassert.deepEqual(codeReview.executionSources, input.executionSources);"
]];
let after=before.toString();for(const[from,to]of edits){assert.equal(after.split(from).length,2);after=after.replace(from,to);}let inverse=after;for(const[from,to]of [...edits].reverse())inverse=inverse.replace(to,from);assert.equal(inverse,before.toString());
fs.writeFileSync(target,after,{flag:'wx'});const provenance={kind:'Root-exact-corrected-prepare118-dispatch-derivation',original:{file:original,bytes:before.length,rawBytesSha256:sha(before)},successor:{file:target,bytes:Buffer.byteLength(after),rawBytesSha256:sha(after)},edits,inverseExact:true,actualInvocationExecuted:false,normalFIGranted:false};
fs.writeFileSync(R+'/tools/rust-r4ghi/prepare118-outer02-derivation.json',JSON.stringify(provenance,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(provenance));
