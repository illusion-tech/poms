// Root-only read-only object inventory; later unlink needs a separate reviewed plan.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {planOwnedObjects70} from './E/cleanup70/core70.mjs';
assert.equal(process.platform,'linux');
const win='/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',state='/home/wangzishi/.local/share/poms-r4def',priv=state+'/private',out=win+'/tmp/rust-r4def/root/objects132';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f)),pin=f=>{const b=fs.readFileSync(f);return{file:f,bytes:b.length,rawBytesSha256:sha(b)}};
const identity=read(state+'/identity.json');assert.equal(identity.namespace,'poms-r4def');assert.equal(identity.marker,'0c945ec2-e3ec-4705-8bd3-660a46e8cafc');
const roots=['native','rust'].map(b=>state+'/objects/'+b),files=[];
function ancestors(p){for(let d=path.dirname(p);d!=='/';d=path.dirname(d)){const s=fs.lstatSync(d);assert(s.isDirectory()&&!s.isSymbolicLink());assert.equal(fs.realpathSync(d),d);}}
function visit(d){ancestors(d);assert(!fs.lstatSync(d).isSymbolicLink());for(const x of fs.readdirSync(d,{withFileTypes:true})){assert(!x.isSymbolicLink());const f=d+'/'+x.name;if(x.isDirectory())visit(f);else{assert(x.isFile());ancestors(f);const s=fs.lstatSync(f);assert.equal(s.nlink,1);assert.equal(fs.realpathSync(f),f);const b=fs.readFileSync(f);files.push({path:f,realPath:f,regular:true,symlink:false,parentSymlinks:false,nlink:s.nlink,dev:s.dev,ino:s.ino,bytes:b.length,sha256:sha(b),mtime:s.mtime.toISOString(),sourceCandidates:[]});}}}
for(const root of roots)visit(root);
const sourceFiles=[];function discover(d){for(const x of fs.readdirSync(d,{withFileTypes:true})){if(x.isSymbolicLink())continue;const f=d+'/'+x.name;if(x.isDirectory()){if(!/^cleanup70-|^objects132/.test(x.name))discover(f);}else if(x.isFile()&&x.name.endsWith('.json')&&!/password|credential|api-harness-|process|environment/i.test(x.name)&&fs.statSync(f).size<48*1024*1024)sourceFiles.push(f);}}
discover(priv);
const sourcePins=[];
for(const f of sourceFiles){let v;try{v=read(f);}catch{continue;}const hits=[];
 function inspect(value,where,depth=0){if(depth>30)return;if(typeof value==='string'){
  for(let n=0;n<files.length;n++){const o=files[n],root=roots.find(r=>o.path.startsWith(r+'/')),relative=o.path.slice(root.length+1);if(value===o.path||value===relative||value.endsWith('/'+relative)){hits.push({objectIndex:n,field:where,match:'exact-source-path-or-relative-key'});}}
  if(value.startsWith('{')&&value.endsWith('}'))try{inspect(JSON.parse(value),where+'<raw-JSON>',depth+1);}catch{}
 }else if(Array.isArray(value))value.forEach((x,i)=>inspect(x,where+'['+i+']',depth+1));else if(value&&typeof value==='object')for(const[k,x]of Object.entries(value)){if(/password|secret|cookie|token|authorization|csrf/i.test(k))continue;inspect(x,where+'.'+k,depth+1);}}
 inspect(v,'$');if(hits.length){const p=pin(f);sourcePins.push(p);for(const h of hits)files[h.objectIndex].sourceCandidates.push({source:p,field:h.field,match:h.match});}
}
const target=priv+'/cleanup70-objects132';assert(!fs.existsSync(target));fs.mkdirSync(target,{mode:0o700});fs.mkdirSync(out);
const inventory={kind:'actual-Root-owned-object-inventory132',namespace:identity.namespace,instanceId:identity.marker,capturedAt:new Date().toISOString(),baselineOriginallyEmptyFromExclusiveNewStateProvision:pin(win+'/tmp/rust-r4def/root/environment21/provision01.json'),objectRoots:roots,files,sourcePins,DBDML:0,unlinkExecuted:false};
fs.writeFileSync(target+'/inventory132.json',JSON.stringify(inventory,null,2)+'\n',{flag:'wx',mode:0o600});
const missing=files.filter(f=>!f.sourceCandidates.length),intents=planOwnedObjects70({instanceId:identity.marker,namespace:identity.namespace,objectRoots:roots,baselineFiles:[],liveFiles:files,evidenceArchiveRoot:priv+'/cleanup70-preserved-objects132',ownershipReceiptId:target+'/inventory132.json'});
fs.writeFileSync(target+'/intents132.json',JSON.stringify(intents,null,2)+'\n',{flag:'wx',mode:0o600});
const receipt={kind:'actual-read-only-object-inventory132',capturedAt:inventory.capturedAt,namespace:identity.namespace,instanceId:identity.marker,privateInventory:pin(target+'/inventory132.json'),privateIntents:pin(target+'/intents132.json'),files:files.map((f,i)=>({index:i,backend:f.path.startsWith(roots[0]+'/')?'native':'rust',pathSHA256:sha(f.path),bytes:f.bytes,sha256:f.sha256,exactSourceCandidates:f.sourceCandidates.length})),unmatched:missing.length,bytes:files.reduce((n,f)=>n+f.bytes,0),DBDML:0,unlinkExecuted:false,sourceCandidatesAreNotAutomaticOwnershipAuthorization:true};
fs.writeFileSync(out+'/receipt132.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({files:files.length,bytes:receipt.bytes,unmatched:missing.length,unlinkExecuted:false,inventorySHA256:receipt.privateInventory.rawBytesSha256}));
