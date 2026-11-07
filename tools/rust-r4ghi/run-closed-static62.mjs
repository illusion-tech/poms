// Bind actual Native/admin checks to all relevant current repository inputs.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root=process.cwd(),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(fs.realpathSync(root).replaceAll('\\','/'),'E:/projects/worktrees/poms-r3hijk-next28/poms');
const name=process.argv[2],edition=process.argv[3];assert(['api-tsc','api-lint','api-build','api-test','admin-lint','admin-data-lint','admin-test','admin-build'].includes(name)&&/^\d{2}$/.test(edition));
const dirs=['apps/poms-admin','apps/poms-api','libs/admin','libs/api','libs/shared','libs/vendor','tools/openapi'];
const top=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()&&/^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|nx\.json|tsconfig.*\.json|eslint.*|jest.*|\.prettier.*)$/.test(e.name)).map(e=>e.name);
const ignored=new Set(['node_modules','target','dist','.angular','.nx','jest-cache','jest-root-dependency-cache']);
function inputs(){const files=[...top,'tools/rust-r4ghi/run-static-check01.mjs'];const walk=dir=>{for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){if(ignored.has(e.name))continue;const file=dir+'/'+e.name;const stat=fs.lstatSync(path.join(root,file));assert(!stat.isSymbolicLink(),'Unexpected source symlink: '+file);if(stat.isDirectory())walk(file);else if(stat.isFile())files.push(file);}};
 for(const dir of dirs)walk(dir);return [...new Set(files)].sort().map(file=>{const b=fs.readFileSync(path.join(root,file));return{file,bytes:b.length,rawBytesSha256:sha(b)};});}
const before=inputs(),out=`tmp/rust-r4ghi/root/${name}${edition}-closure62`;assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const startedAt=new Date().toISOString(),node={file:fs.realpathSync(process.execPath),version:process.version,rawBytesSha256:sha(fs.readFileSync(process.execPath))};
const r=spawnSync(process.execPath,['tools/rust-r4ghi/run-static-check01.mjs',name,edition],{cwd:root,env:process.env,windowsHide:true,encoding:'utf8',timeout:650000,maxBuffer:500000});
fs.writeFileSync(out+'/driver-stdout.log',r.stdout??'',{flag:'wx'});fs.writeFileSync(out+'/driver-stderr.log',r.stderr??'',{flag:'wx'});
const after=inputs(),sourceStable=JSON.stringify(before)===JSON.stringify(after),checkFile=`tmp/rust-r4ghi/root/${name}${edition}/receipt.json`,check=fs.existsSync(checkFile)?JSON.parse(fs.readFileSync(checkFile)):null;
const receipt={kind:'actual-static-validation-with-complete-repository-source-closure62',check:name,edition,startedAt,completedAt:new Date().toISOString(),node,exitCode:r.status,sourceStable,inputs:before,
 inputManifestSHA256:sha(JSON.stringify(before)),underlyingCheck:check?{file:checkFile,rawBytesSha256:sha(fs.readFileSync(checkFile)),exitCode:check.exitCode}:null,databaseConnect:false,G3Certified:false};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({check:name,edition,exitCode:r.status,sourceStable,inputFiles:before.length,receipt:out+'/receipt.json'}));
if(r.status!==0||!sourceStable||check?.exitCode!==0)process.exitCode=1;
