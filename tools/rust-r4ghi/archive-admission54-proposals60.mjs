import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',author='E:/projects/worktrees/poms-r4i-lifecycle/poms',sha=b=>createHash('sha256').update(b).digest('hex'),records=[];
for(const [name,manifest] of [['business-consumer-admission54','manifest54.json'],['business-consumer-admission54-02','manifest54-02b.json']]){
 const relative='tools/rust-r4ghi/I/implementation/'+name,source=author+'/'+relative,destination=root+'/'+relative,m=JSON.parse(fs.readFileSync(source+'/'+manifest));
 const files=new Set(fs.readdirSync(source,{withFileTypes:true}).filter(e=>e.isFile()).map(e=>e.name));
 for(const p of m.files)for(const file of[p.candidate,p.beforeCandidate].filter(Boolean))files.add(file);
 if(name.endsWith('-02'))for(const p of m.files)files.add('superseded-round01/'+p.file);
 for(const file of files){assert(!path.isAbsolute(file)&&!file.split('/').includes('..'));const from=source+'/'+file,to=destination+'/'+file,bytes=fs.readFileSync(from);
  const resolved=path.resolve(to);assert(resolved.startsWith(path.resolve(root)+path.sep));fs.mkdirSync(path.dirname(to),{recursive:true});
  if(fs.existsSync(to))assert.equal(sha(fs.readFileSync(to)),sha(bytes));else fs.writeFileSync(to,bytes,{flag:'wx'});
  records.push({file:relative+'/'+file,bytes:bytes.length,rawBytesSha256:sha(bytes)});
 }
}
fs.writeFileSync(root+'/docs/design/rust-r4ghi/consumer-admission54-proposal-archive60.json',JSON.stringify({kind:'exact-author-proposal-raw-archive',files:records,purpose:'Retain initial rejected boundary and exact corrected proposal with their original labels',businessDatabaseOrHTTPExecuted:false,G3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({archivedFiles:records.length,preservedOriginalAndCorrectedTools:true}));
