// Native Windows enumeration, then Root-only removal in the marked public copy.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const base='756d813c9578090fcf8e56821acce01b46b40420';
const win=process.platform==='win32'?'E:/projects/worktrees/poms-r3hijk-next28/poms':'/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const file=win+'/tmp/rust-r4def/root/linux-deletions67.json';
const prefixes=['apps/poms-api/','apps/poms-api-rust/','apps/poms-admin/','libs/admin/','libs/api/contracts/','libs/shared/contracts/','libs/shared/api-spec/','libs/shared/api-client/','tools/openapi/','tools/rust-r4def/','docs/design/rust-r4def/'];
const sha=b=>createHash('sha256').update(b).digest('hex');
if(process.platform==='win32') {
  const files=execFileSync('git',['diff','--name-only','-z','--diff-filter=D',base],{encoding:'utf8',cwd:win}).split('\0').filter(f=>f&&prefixes.some(p=>f.startsWith(p)));
  for(const f of files){assert(!path.isAbsolute(f)&&!f.split('/').includes('..'));assert(!fs.existsSync(win+'/'+f));}
  fs.writeFileSync(file,JSON.stringify({base,files},null,2)+'\n',{flag:'wx'}); console.log(JSON.stringify({enumerated:files.length}));
} else {
  assert.equal(process.platform,'linux'); const root='/home/wangzishi/projects/poms-rust-r4def';
  const marker=JSON.parse(fs.readFileSync(root+'/poms-r4def-public-checkout.json'));assert.equal(marker.base,base);assert.equal(marker.kind,'R4-DEF-public-acceptance-checkout');assert.equal(fs.realpathSync(root),root);
  const input=JSON.parse(fs.readFileSync(file));assert.equal(input.base,base);const removed=[];
  for(const f of input.files){assert(prefixes.some(p=>f.startsWith(p)));assert(!path.isAbsolute(f)&&!f.split('/').includes('..'));assert(!fs.existsSync(win+'/'+f));const target=path.resolve(root,f);assert(target.startsWith(root+'/'));if(fs.existsSync(target)){const s=fs.lstatSync(target);assert(s.isFile()&&!s.isSymbolicLink());const b=fs.readFileSync(target);removed.push({file:f,bytes:b.length,sha256:sha(b)});fs.unlinkSync(target);}assert(!fs.existsSync(target));}
  fs.writeFileSync(win+'/tmp/rust-r4def/root/linux-deletions67-receipt.json',JSON.stringify({base,root,inputSha256:sha(fs.readFileSync(file)),removed,finalDeletedFiles:input.files,onlyMarkedPublicCheckout:true},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({removed:removed.length,verifiedAbsent:input.files.length}));
}
