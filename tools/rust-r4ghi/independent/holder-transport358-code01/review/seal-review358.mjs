import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const own=path.dirname(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const pin=file=>{const b=fs.readFileSync(file);return{file:'/'+file.replaceAll('\\','/').replace(/^E:\//,'mnt/e/'),bytes:b.length,rawBytesSha256:hash(b)};};
const reviewFile=path.join(own,'review-code358.json'),r=JSON.parse(fs.readFileSync(reviewFile,'utf8'));
assert.equal(r.kind,'non-author-runtime121-A-holder-transport358-code-review');
assert.equal(r.verdict,'code-ready-for-exact-holder-transport358-input-review');
assert.equal(r.reviewerIsAuthor,false);assert.equal(r.reviewerIsRootExecutor,false);assert.notEqual(r.author,r.reviewer);
assert(!Object.hasOwn(r,'G1Append')&&!Object.hasOwn(r,'currentRound'));
assert.equal(r.G1Policy.bytes,12056);assert.equal(r.G1Policy.rawBytesSha256,'3082f94a4f0c1a6cb0de7f807c24c32b534722369690f2c873a5dbc8b75b4be6');
assert.equal(r.operator.bytes,37171);assert.equal(r.operator.rawBytesSha256,'24a8fa73e2289086c83d747c0f97b192fb55003844854c7ff8cfd58de695d70e');
assert.deepEqual(r.executionSources,[r.operator]);assert.equal(r.originalSevenSourceProof.executionSources.length,7);assert.equal(r.blockingFindings.length,0);
for(const key of ['RootInstallationGranted','actualG2Authorized','anyModeExecuted','PGControl','APIStart','NativeContext','SQLHTTP','G3','G4'])assert.equal(r.authority[key],false);
for(const key of ['candidateSource','candidateValidationSource','candidateManifest','candidateSeal','interfaceSchema','independentDesignReview','G1Policy','independentValidation']){
  const p=r[key],actual=pin('E:/'+p.file.slice(7));assert.deepEqual(actual,p,key);
}
const seal={kind:'non-author-runtime121-A-holder-transport358-code-review-seal',recordedAt:new Date().toISOString(),review:pin(reviewFile),independentValidation:r.independentValidation,reviewerTools:['review-validate358.mjs','review-close-validation358.mjs','seal-review358.mjs'].map(name=>pin(path.join(own,name))),scope:'Exact code-ready review only; no Root installation or actual G2 granted',rootOrPrivateWritten:false,actualEntryInvoked:false};
const output=path.join(own,'seal-review-code358.json');fs.writeFileSync(output,JSON.stringify(seal,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({review:seal.review,seal:pin(output),verdict:r.verdict,tests:102,syntaxChecks:2,actualG2:false,RootInstallationGranted:false}));
