import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
assert.equal(process.platform,'linux');
const source='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',root='/home/wangzishi/projects/poms-rust-r4ghi',sha=b=>createHash('sha256').update(b).digest('hex');
const marker=JSON.parse(fs.readFileSync(root+'/.poms-r4ghi-mirror.json'));assert.equal(marker.sourceRoot,source);assert.equal(marker.namespace,'poms-r4ghi');
const files=[['apps/poms-api/src/app/core/persistence/poms-schema-generator.ts',null,'457fed18cb696f55fe1353877fc3d1cf16d3220cc0eaf0d0368e9abf4e7cced0'],['apps/poms-api/src/app/core/persistence/persistence.config.ts','0086edb287fde5390ffcf75cef71b2f929ac3bff07a9d31b5a130010dde2284c','ac68d3fc8f87c4a804f464e1d0bf3ad50f9ef53e7b865b3c8708bfb3b338d90e'],['apps/poms-api/src/app/features/attachment/attachment-upload-session.entity.ts','af1500f6b25fca9f0496f762dc50af72b0ec15e7c35963617a614607e74236bd','575db84f7fb1c77e1c9b6e817fde4c18e5414f2d644e4901a002d6a450f93607'],['apps/poms-api/src/app/features/project-cost/operating-restatement-record.entity.ts','eb632c177a34fb39d30d87f5c0fc7306f7ded42382494f770fc8b65ed41a070c','963c0578a41f95d92c030fbaf17027eaec2a2e64cf95eb67edd08a777e1d2d9b']];
for(const[file,before,after]of files){assert.equal(sha(fs.readFileSync(source+'/'+file)),after);const current=fs.existsSync(root+'/'+file)?sha(fs.readFileSync(root+'/'+file)):null;assert([before,after].includes(current));fs.mkdirSync(path.dirname(root+'/'+file),{recursive:true});fs.copyFileSync(source+'/'+file,root+'/'+file);assert.equal(sha(fs.readFileSync(root+'/'+file)),after);}
fs.writeFileSync(source+'/tmp/rust-r4ghi/root/native-orm-sync23.json',JSON.stringify({kind:'exact-Root-ORM-corrective-copy',files,sourceRoot:source,mirror:root,allExact:true},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({files:files.length,allExact:true}));
