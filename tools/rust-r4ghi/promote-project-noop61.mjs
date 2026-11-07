import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',relative='tools/rust-r4ghi/I/implementation/support-patches/project-metadata-noop61',proposal='E:/projects/worktrees/poms-r4i-lifecycle/poms/'+relative;
const sha=b=>createHash('sha256').update(b).digest('hex'),raw=fs.readFileSync(proposal+'/manifest61.json');assert.equal(sha(raw),'2764b03cb1c93eb91f6e8949534ca69882346cf7630d447feb2a881c4d731cb9');const m=JSON.parse(raw);assert.equal(m.files.length,2);
const retained=JSON.parse(fs.readFileSync(root+'/docs/design/rust-r4ghi/retained-source11-before-noop70.json'));assert(retained.API134Stopped&&retained.allDataAndXminUnchanged&&!retained.databaseRestoreExecuted);
for(const p of m.files){assert.equal(sha(fs.readFileSync(root+'/'+p.file)),p.beforeSHA256);assert.equal(sha(fs.readFileSync(proposal+'/'+p.candidate)),p.afterSHA256);}
const archive=root+'/'+relative;fs.mkdirSync(archive,{recursive:true});
for(const p of m.files){const target=archive+'/'+p.candidate;fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(proposal+'/'+p.candidate,target,fs.constants.COPYFILE_EXCL);fs.copyFileSync(proposal+'/'+p.candidate,root+'/'+p.file);}
for(const entry of fs.readdirSync(proposal,{withFileTypes:true}))if(entry.isFile())fs.copyFileSync(proposal+'/'+entry.name,archive+'/'+entry.name,fs.constants.COPYFILE_EXCL);
fs.writeFileSync(root+'/docs/design/rust-r4ghi/project-noop61-promotion.json',JSON.stringify({kind:'Root-nonauthor-exact-noop61-promotion',manifest:{file:relative+'/manifest61.json',rawBytesSha256:sha(raw)},files:m.files,
 scope:'Only actual business dirtiness stamps updater; no-op preserves persisted attribution',source11RetainedBeforePromotion:true,fullCrateAndRealHTTPStillRequired:true,authorizationCASAuditAndAuthFlushProtocolUnchanged:true,G3Certified:false,G4Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({promotedRustFiles:2,realSource11Retained:true,G3Certified:false}));
