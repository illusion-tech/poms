import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='tools/rust-r4ghi/independent/review05/tax-coverage-candidate39',raw=fs.readFileSync(base+'/manifest39.json'),m=JSON.parse(raw),sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(m.files.length,3);
const changes=m.files.map(p=>{const bytes=fs.readFileSync(base+'/candidate/'+p.file);assert.equal(sha(fs.readFileSync(p.file)),p.baseRawSha256);assert.equal(sha(bytes),p.candidateRawSha256);assert.equal(bytes.length,p.candidateBytes);return{p,bytes};});
for(const{p,bytes}of changes)fs.writeFileSync(p.file,bytes);
const doc='docs/design/rust-r4ghi/g2-corrective01.md',text=fs.readFileSync(doc,'utf8');assert.equal(text.split('\n共享 TS/DTO').length,2);assert(!text.includes('\n33. 部分税务评估'));
const note='\n33. 部分税务评估不代表完整覆盖。每个被冻结且税额非零或未知的成本（保持原有included/excluded广义税务scope）必须关联到本次实际admitted税务评估的完整kind/id/version/hash，G和H独立复核；缺失、旧版本或异hash继续unknown/tax-assessment-missing，不能把另一成本的评估当作本项零依据。direct关联同时核真实source kind/type/id。未有本项目本份额真实税务生产依据的非零共享税额不复制或缩放来源项目pending金额，保持unknown；真实零税层继续可证明已知零。未改schema、阈值、政策hash或凭空生成税务结论。\n';
fs.writeFileSync(doc,text.replace('\n共享 TS/DTO',note+'\n共享 TS/DTO'));
fs.writeFileSync('docs/design/rust-r4ghi/tax-coverage39-promotion.json',JSON.stringify({kind:'Root-non-author-reviewed-complete-cost-tax-coverage-correction',manifest:base+'/manifest39.json',manifestSHA256:sha(raw),files:m.files,
 review:['Per-cost exact admitted reference coverage replaces global nonempty-list shortcut in both G and independent H',
  'Actual source kind/type/id constrains direct relations; unchanged-economic G consumption remains supported',
  'All frozen costs retain the existing tax scope; zero layers need no invented assessment',
  'No foreign-project pending amount copy or ratio scaling for allocation shares; uncovered nonzero/unknown remains unknown'],
 publicSchemaAndS6Changed:false,thresholdsAndPolicyHashChanged:false,wholeCargoPending:true,actualPGHTTPPending:true,G3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({promoted:3,publicSchemaChanged:false,newUniformCandidateRequired:true}));
