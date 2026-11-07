import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const source='E:/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/final03';
const receipt='docs/design/rust-r4ghi/ui-promotion03.json'; assert(!fs.existsSync(receipt));
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=fs.readFileSync(source+'/manifest03.json'); assert.equal(sha(bytes),'e25fd3db0c8875e3dea103af650a997f6ad6921784926cb62b94f1a4204ac14e');
const manifest=JSON.parse(bytes),prepared=[];
for(const item of manifest.files){
    assert(item.path.startsWith('apps/poms-admin/')||item.path.startsWith('libs/admin/'));
    assert(!item.path.includes('..')&&!path.isAbsolute(item.path));
    assert.equal(fs.existsSync(item.path),item.originalExists);
    if(item.originalExists)assert.equal(sha(fs.readFileSync(item.path)),item.originalSHA256);
    const candidate=fs.readFileSync(source+'/proposed/'+item.path);assert.equal(sha(candidate),item.proposedSHA256);prepared.push({item,candidate});
}
for(const item of manifest.extraInputClosure)assert.equal(sha(fs.readFileSync(item.source)),item.SHA256);
const archive='tools/rust-r4ghi/H/implementation/support-patches/ui-integration/final03';
const copy=(relative='')=>{for(const entry of fs.readdirSync(source+'/'+relative,{withFileTypes:true})){
    const sub=relative?relative+'/'+entry.name:entry.name;assert(!entry.isSymbolicLink());
    if(entry.isDirectory())copy(sub);else{assert(entry.isFile());const b=fs.readFileSync(source+'/'+sub),target=archive+'/'+sub;fs.mkdirSync(path.dirname(target),{recursive:true});if(fs.existsSync(target))assert.equal(sha(fs.readFileSync(target)),sha(b));else fs.writeFileSync(target,b,{flag:'wx'});}
}};copy();
for(const {item,candidate}of prepared){fs.mkdirSync(path.dirname(item.path),{recursive:true});fs.writeFileSync(item.path,candidate);assert.equal(sha(fs.readFileSync(item.path)),item.proposedSHA256);}
fs.writeFileSync(receipt,JSON.stringify({kind:'Root-reviewed-exact-UI-promotion03',capturedAt:new Date().toISOString(),manifest:archive+'/manifest03.json',manifestSHA256:sha(bytes),files:manifest.files,rootReview:'Strict FullProject versus creator/legacy branches; own task reads before other panels; exact parent/child upload; real SDK adapters; actual archive CAS; no fabricated financial facts or row versions.',productG3:false,productG4:false,actualBrowserAcceptance:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({applied:prepared.length,receipt,productG3:false}));
