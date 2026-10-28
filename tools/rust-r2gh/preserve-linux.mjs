import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,readdirSync,lstatSync,existsSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {privateRoot,regularPrivate} from './database-client.mjs';
assert.equal(process.platform,'linux');assert.equal(process.argv.length,2);
const root=path.resolve(import.meta.dirname,'../..'),folder=path.join(root,'tmp/rust-r2gh'),state='/home/wangzishi/.local/share/poms-r2gh';
assert.equal(root,'/home/wangzishi/projects/poms-rust-r2gh');
const manifestFile=path.join(folder,'linux-manifest-g3-01.json'),archive=path.join(state,'linux-evidence-g3-01.tar');assert(!existsSync(manifestFile)&&!existsSync(archive));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function scan(base){const rows=[];function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name),s=lstatSync(file);assert(!s.isSymbolicLink());if(s.isDirectory())walk(file);else{assert(s.isFile());const relative=path.relative(base,file).replaceAll('\\','/');assert(!/[\r\n\0]/.test(relative)&&!relative.startsWith('-'));const bytes=readFileSync(file);rows.push({file:relative,bytes:bytes.length,rawBytesSha256:sha(bytes)});}}}walk(base);return rows.sort((a,b)=>a.file.localeCompare(b.file));}
const files=scan(folder).filter(row=>row.file!=='ROOT-CHECKPOINT.json');const secrets=['nest','rust'].flatMap(backend=>{const env=regularPrivate(path.join(privateRoot,backend+'.env'));return [...env.matchAll(/^(?:DB_PASSWORD|JWT_SECRET)=(.+)$/gm)].map(m=>m[1].trim());});secrets.push(regularPrivate('/home/wangzishi/.local/share/poms-r0e/private/owner-password'));
for(const row of files){const bytes=readFileSync(path.join(folder,row.file));for(const secret of secrets)assert(!bytes.includes(Buffer.from(secret)),'Private environment value found in public evidence: '+row.file);}
const rustFiles=scan(path.join(root,'apps/poms-api-rust')).filter(r=>r.file==='Cargo.toml'||r.file==='Cargo.lock'||/^(src|tests|examples)\//.test(r.file)).map(r=>({...r,file:'apps/poms-api-rust/'+r.file,normalizedLfSha256:sha(readFileSync(path.join(root,'apps/poms-api-rust',r.file),'utf8').replace(/\r\n/g,'\n'))}));
const binaries=['target/release/poms-api-rust'].map(file=>{const bytes=readFileSync(path.join(state,file));return {path:path.join(state,file),bytes:bytes.length,rawBytesSha256:sha(bytes)};});
for(const file of files.filter(row=>/^runtime-input\/rust-[^/]+\/poms-api-rust$/.test(row.file)))binaries.push({path:path.join(folder,file.file),bytes:file.bytes,rawBytesSha256:file.rawBytesSha256});
const report={formatVersion:1,kind:'local-linux-raw-preservation-before-independent-G3',createdAt:new Date().toISOString(),sourceFolder:folder,files,rustSources:rustFiles,binaries,secretValueScan:{checkedFiles:files.length,matchedFiles:0,valuesPrinted:false},archive,archiveIncludesThisManifest:true};
writeFileSync(manifestFile,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
const names=[...files.map(r=>r.file),'linux-manifest-g3-01.json'];const result=spawnSync('/usr/bin/tar',['--null','-C',folder,'-T','-','-cf',archive],{input:Buffer.from(names.join('\0')+'\0'),stdio:['pipe','pipe','pipe'],timeout:120000});assert.equal(result.status,0,'Local raw tar creation');
assert.deepEqual(scan(folder).filter(r=>!['linux-manifest-g3-01.json','ROOT-CHECKPOINT.json'].includes(r.file)),files,'Linux originals unchanged after packaging');
writeFileSync(path.join(state,'linux-evidence-g3-01.sha256'),sha(readFileSync(archive))+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({result:'pass',files:files.length,bytes:files.reduce((n,r)=>n+r.bytes,0),archive,archiveSha256:sha(readFileSync(archive)),manifestSha256:sha(readFileSync(manifestFile))}));
