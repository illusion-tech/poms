// Preserve unrun outer02 and fix the independently found whole-body preflight.
import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
const R='E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi',sha=b=>createHash('sha256').update(b).digest('hex');
const old=fs.readFileSync(R+'/execute-prepare118-once02.mjs');assert.equal(sha(old),'9760cfb2c6c93747383f8c8c65dd691619177efed54979bd89f1e7609ca07677');
const needle="const bytes = Buffer.from(JSON.stringify(request.expectedRootReviewBody, null, 2) + '\\n');";
const extra="assert.deepEqual(request.expectedRootReviewBody, {\n  kind: 'Root-approved-exact-Tax15-invocation118', approvedInput: request.input,\n  codeReview: input.codeReview, expectedEntryState: input.expectedEntryState, mode: 'prepare-only',\n  nonce: input.nonce, actualG2Authorized: true, normalTaxPOSTGranted: false, FIGranted: false\n});\n";
const s=old.toString();assert.equal(s.split(needle).length,2);const out=Buffer.from(s.replace(needle,extra+needle));
fs.writeFileSync(R+'/execute-prepare118-once03.mjs',out,{flag:'wx'});
const p={kind:'Root-unrun-outer02-to03-whole-body-preflight-correction',old:{file:R+'/execute-prepare118-once02.mjs',bytes:old.length,rawBytesSha256:sha(old)},corrected:{file:R+'/execute-prepare118-once03.mjs',bytes:out.length,rawBytesSha256:sha(out)},changes:'Only exact full approval-body comparison before first approval write; old02 never dispatched. Prepared02 namespace has not been created.',actualModesExecuted:0};
fs.writeFileSync(R+'/prepare118-outer03-derivation.json',JSON.stringify(p,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(p));
