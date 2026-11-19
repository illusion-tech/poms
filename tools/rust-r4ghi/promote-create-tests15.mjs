import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),rel='tools/rust-r4ghi/H/implementation/support-patches/ui-integration/create-ui12-tests',author='E:/projects/worktrees/poms-r4h-signals/poms/'+rel;
const raw=fs.readFileSync(author+'/manifest-tests15.json');assert.equal(sha(raw),'0546c19453fc7787797e726232ac9edb910772957be384d5999d47e8611b6e6a');
const m=JSON.parse(raw);assert.equal(m.products.length,2);assert.equal(m.files.length,15);
for(const f of m.files){assert(!path.isAbsolute(f.file)&&!f.file.split('/').includes('..'));const b=fs.readFileSync(author+'/'+f.file);assert.equal(sha(b),f.rawBytesSha256);assert.equal(b.length,f.bytes);}
for(const f of m.products){assert(f.file.endsWith('.spec.ts'));assert.equal(sha(fs.readFileSync(f.file)),f.originalSHA256);}
assert(!fs.existsSync(rel));for(const f of [...m.files,{file:'manifest-tests15.json'}]){const to=rel+'/'+f.file;fs.mkdirSync(path.dirname(to),{recursive:true});fs.writeFileSync(to,fs.readFileSync(author+'/'+f.file),{flag:'wx'});}
for(const f of m.products)fs.writeFileSync(f.file,fs.readFileSync(rel+'/'+f.candidateFile));
fs.writeFileSync('docs/design/rust-r4ghi/create-tests15-promotion.json',JSON.stringify({kind:'Root-non-author-reviewed-S6-create-UI-regressions',manifest:rel+'/manifest-tests15.json',manifestSHA256:sha(raw),files:m.products,
  completeRealProjectSummaryMocksValidated:true,permissionsAndLeadGateRetained:true,authorDirectedTests:24,RootFullAdminTestsPending:true,actualBrowser:false,G3Certified:false},null,2)+'\n',{flag:'wx'});
const phrase='正式项目入口需要从已确认有效线索转入。',correct='可创建评估项目；线索转入仍需负责人完成资格确认。',checkpoint='tools/rust-r4ghi/checkpoints/ui-text16';fs.mkdirSync(checkpoint,{recursive:true});
const changes=[];for(const file of ['apps/poms-admin/src/app/features/project/project-list.ts','apps/poms-admin/src/app/features/project/project-list.spec.ts']){const before=fs.readFileSync(file);assert.equal(before.toString().split(phrase).length,2);const after=Buffer.from(before.toString().replace(phrase,correct));const snapshot=checkpoint+'/'+path.basename(file)+'.bin';fs.writeFileSync(snapshot,before,{flag:'wx'});fs.writeFileSync(file,after);changes.push({file,beforeSHA256:sha(before),afterSHA256:sha(after),beforeSnapshot:snapshot});}
fs.writeFileSync('docs/design/rust-r4ghi/create-ui-text16-followup.json',JSON.stringify({kind:'Root-single-sentence-creation-guidance-correction',changes,reason:'Approved visible assessment creation must not tell ProjectWrite-only users that Lead conversion is the only project entry',LeadGateChanged:false,permissionsChanged:false,DTOChanged:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({specsPromoted:2,wordingFollowup:2,fullAdminTestsPending:true}));
