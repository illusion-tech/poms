import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=process.cwd(),archive='docs/design/archive/slices/rust-r2-user-create-fix115';
const sha=b=>createHash('sha256').update(b).digest('hex');
const cert='tools/rust-r4ghi/independent/userfix-final/g4-actual-review01.json';assert.equal(sha(fs.readFileSync(cert)),'a3656dd231f41419be680bc5b8f163993ae70fc9c48025a78912c15767b1cd6f');
const entries=[];
function copy(source,target){const from=path.resolve(root,source),to=path.resolve(root,archive,'online-seal02',target);assert(from.startsWith(root+path.sep)&&to.startsWith(path.resolve(root,archive)+path.sep));const bytes=fs.readFileSync(from);fs.mkdirSync(path.dirname(to),{recursive:true});fs.writeFileSync(to,bytes,{flag:'wx'});assert.equal(sha(fs.readFileSync(to)),sha(bytes));entries.push({source,archive:path.relative(root,to).replaceAll('\\','/'),bytes:bytes.length,rawBytesSha256:sha(bytes)});}
for(const folder of ['tmp/rust-r4ghi/root/userfix-close-plan01','tmp/rust-r4ghi/root/userfix-online01'])for(const file of fs.readdirSync(folder))copy(folder+'/'+file,path.basename(folder)+'/'+file+(file.endsWith('.bin')?'':'.bin'));
for(const file of ['tmp/rust-r4ghi/root/userfix-main01.json',cert,'tools/rust-r4ghi/independent/userfix-final/g4-preclose-review01.json'])copy(file,path.basename(file)+'.bin');
fs.writeFileSync(archive+'/origin-map02.json',JSON.stringify({kind:'actual-userfix-online-G4-Seal-public-evidence-increment',capturedAt:new Date().toISOString(),entries,files:entries.length,privatePayloadFilesCopied:0},null,2)+'\n',{flag:'wx'});
const statusFile='docs/design/rust-r4ghi-delivery-status.json',status=JSON.parse(fs.readFileSync(statusFile));Object.assign(status.independentUserFix,{stage:'Done',accepted:true,G4Certified:true,certificate:cert,certificateSHA256:sha(fs.readFileSync(cert)),onlineG4:'archive/slices/rust-r2-user-create-fix115/online-seal02/userfix-online01/receipt.json.bin'});fs.writeFileSync(statusFile,JSON.stringify(status,null,2)+'\n');
const readme=archive+'/README.md';fs.writeFileSync(readme,fs.readFileSync(readme,'utf8').replace('独立 G3 已通过。固定提交、main 与线上 G4 的实际状态以独立证书和 Issue 读回为准；本归档不提前宣称 G4 完成。','独立 G3、固定提交、main 集成及实际线上 G4 均已通过；#115 已 CLOSED/completed，#57 和 R4/R5 父项保持 OPEN。独立实际 G4 证书与线上原件在 online-seal02 中保全。'));
const note='\n\n2026-11-06：#115独立实际G4已通过并线上Closed/completed；[证书与原件](archive/slices/rust-r2-user-create-fix115/README.md)已保全。仅既有用户创建修复完成，新增HTTP为0，正式Rust仍240；R4 GHI及最小R5本批32仍在联合G1准备，#101/#57/#110/#116/#117保持Open。\n';
for(const file of ['docs/design/backend-rust-migration-plan.md','docs/design/rust-migration-execution-tracker.md','docs/design/rust-r4-scope-and-dependencies.md','docs/design/phase2-development-execution-tracker.md'])fs.appendFileSync(file,note);
console.log(JSON.stringify({issue:115,G4Certified:true,onlineEvidenceFiles:entries.length,privatePayloadFilesCopied:0,officialRust:240,businessG1Certified:false}));
