import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex'),out='tools/rust-r4ghi/checkpoints/required-sources09';assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const files=[];
for(const edition of ['17','19']){const file='tools/rust-r4ghi/business/required-write-sources'+edition+'.json',raw=fs.readFileSync(file),old=JSON.parse(raw);const next=old.map(p=>({...p,sha256:sha(fs.readFileSync(p.file))}));
 const changed=old.flatMap((p,i)=>p.sha256===next[i].sha256?[]:[{file:p.file,before:p.sha256,after:next[i].sha256}]);
 fs.writeFileSync(out+'/before-'+edition+'.json.bin',raw,{flag:'wx'});const candidate=Buffer.from(JSON.stringify(next,null,2)+'\n');fs.writeFileSync(out+'/sources-'+edition+'.json',candidate,{flag:'wx'});
 files.push({file,beforeSHA256:sha(raw),afterSHA256:sha(candidate),candidate:out+'/sources-'+edition+'.json',changed,sourceCount:old.length});
}
const proposal={kind:'new09-source-bound-required-write-registration-proposal',candidate:'API132',binarySHA256:'205b0faa96800df5b248d189ccaa99e1da4aaf6bc0d6aba3cbe88d3621523477',
  sourcePinsSHA256:'bd956eabf7d69c4ef79010d6bb599a15459019f19f5f15540aee05ad1d46c683',files,
  inventoryDescriptorsChanged:false,RootSemanticReviewBeforeApplyRequired:true,actualNewCandidateFIPassed:false,G3Certified:false};
fs.writeFileSync(out+'/proposal09.json',JSON.stringify(proposal,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(proposal));
