import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
assert.equal(process.platform,'win32');
const source=path.resolve('tmp/rust-r2ij'),linux='\\\\wsl.localhost\\Debian\\home\\wangzishi\\projects\\poms-rust-r2ij',destination=path.join(linux,'tmp/rust-r2ij/windows-evidence');assert(!fs.existsSync(destination));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function inventory(){const rows=[];function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name),relative=path.relative(source,file).split(path.sep).join('/');if(relative==='ROOT-CHECKPOINT.md')continue;const stat=fs.lstatSync(file);assert(!stat.isSymbolicLink());if(stat.isDirectory())visit(file);else{assert(stat.isFile());const bytes=fs.readFileSync(file);rows.push({relative,bytes:bytes.length,sha256:sha(bytes)});}}}visit(source);return rows.sort((a,b)=>a.relative.localeCompare(b.relative,'en'));}
const before=inventory();fs.mkdirSync(destination,{recursive:false});
for(const row of before){const input=path.join(source,...row.relative.split('/')),output=path.join(destination,...row.relative.split('/'));assert(output.startsWith(destination+path.sep));fs.mkdirSync(path.dirname(output),{recursive:true});fs.copyFileSync(input,output,fs.constants.COPYFILE_EXCL);const bytes=fs.readFileSync(output);assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);}
assert.deepEqual(inventory(),before);
const report={formatVersion:1,result:'pass',at:new Date().toISOString(),scope:'Immutable Windows-side public batch evidence copied into a separate origin directory; source tree unchanged; internal execution checkpoint excluded',sourceRoot:source,destinationRepoRelative:'tmp/rust-r2ij/windows-evidence',files:before,filesCount:before.length,bytes:before.reduce((n,row)=>n+row.bytes,0)};
const output=path.join(linux,'tmp/rust-r2ij/windows-transfer-manifest.json');fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({result:report.result,files:report.filesCount,bytes:report.bytes,manifest:'tmp/rust-r2ij/windows-transfer-manifest.json'}));
