import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const edition = process.argv[2];assert(['11','12'].includes(edition));
const folder = 'tools/rust-r4ghi/I/implementation/support-patches/' + (edition === '11' ? 'execution-admission11' : 'condition-evidence12');
const manifest = folder + '/apply-manifest' + edition + '.json';
const raw=fs.readFileSync(manifest), data=JSON.parse(raw);
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(data.files.length,3);
if(edition==='11') assert(JSON.parse(fs.readFileSync('docs/design/rust-r4ghi/g2-public-delta02.json')).addSchemas.ExecutionAdmissionContextView);
const changes=data.files.map(item=>{
    assert(/^apps\/poms-api-rust\/src\/(attachments|lifecycle_evidence|project_lifecycle|projects)\/[a-z_]+\.rs$/.test(item.path));
    assert.equal(fs.existsSync(item.path)?sha(fs.readFileSync(item.path)):null,item.baseSHA256,'Root source changed: '+item.path);
    const bytes=fs.readFileSync(folder+'/candidate/'+item.path);assert.equal(sha(bytes),item.candidateSHA256);assert.equal(bytes.length,item.candidateBytes);
    return{item,bytes};
});
const receipt='docs/design/rust-r4ghi/i-followup-promotion'+edition+'.json';assert(!fs.existsSync(receipt));
for(const{item,bytes}of changes){fs.mkdirSync(path.dirname(item.path),{recursive:true});fs.writeFileSync(item.path,bytes);}
fs.writeFileSync(receipt,JSON.stringify({kind:'exact-I-followup-promotion',edition,capturedAt:new Date().toISOString(),manifest,manifestSHA256:sha(raw),files:data.files,compilePassed:false,HTTPPassed:false,G3:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({edition,promoted:changes.length,allOriginalHashesChecked:true,receipt}));
