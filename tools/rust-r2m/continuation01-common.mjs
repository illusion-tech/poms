// Filesystem core derived narrowly from the already reviewed QA common helper.
// Import is public source only. Resource IO occurs only when Root invokes it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {continuation01 as C,continuationAmbient} from './continuation01-profile.mjs';
export const root=path.resolve(import.meta.dirname,'../..');
export const sha=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const digest=value=>sha(JSON.stringify(canonical(value)));
export function rootExecution(){assert(process.platform==='linux'&&process.cwd()===C.linuxWorkspace&&process.version==='v24.19.0');continuationAmbient(process.env)}
export function pin(file){const raw=publicBytes(file);return{file,bytes:raw.length,rawBytesSha256:sha(raw)}}
export function publicBytes(file){
 assert(typeof file==='string'&&!path.isAbsolute(file)&&!file.includes('\\')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!['private','.env'].includes(part)));
 assert(['tools/rust-r2m/','docs/design/rust-r2m/','tmp/rust-r2m/','tmp/rust-r2m-continuation01/'].some(prefix=>file.startsWith(prefix)));
 let current=root;for(const part of file.split('/')){current=path.join(current,part);assert(!fs.lstatSync(current).isSymbolicLink())}const before=fs.lstatSync(current);assert(before.isFile()&&before.nlink===1&&before.size<=16*1024*1024);const fd=fs.openSync(current,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);try{const opened=fs.fstatSync(fd);assert(opened.dev===before.dev&&opened.ino===before.ino);const raw=fs.readFileSync(fd),after=fs.fstatSync(fd);for(const key of['dev','ino','size','mtimeMs','ctimeMs'])assert.equal(opened[key],after[key]);return raw}finally{fs.closeSync(fd)}
}
export function publicJson(file){return JSON.parse(publicBytes(file))}
export function exactDirectory(directory,{create=false}={}){
 assert.equal(process.platform,'linux');assert(directory===C.state||directory.startsWith(C.state+'/'));assert.equal(path.posix.normalize(directory),directory);let current='';
 for(const part of directory.split('/').filter(Boolean)){current+='/'+part;let stat;try{stat=fs.lstatSync(current)}catch(error){if(error.code!=='ENOENT')throw error;assert(create&&(current===C.state||current.startsWith(C.state+'/')));fs.mkdirSync(current,{mode:0o700});stat=fs.lstatSync(current)}assert(stat.isDirectory()&&!stat.isSymbolicLink());if(current===C.state||current.startsWith(C.state+'/'))assert.equal(stat.mode&0o077,0)}assert.equal(fs.realpathSync(directory),directory);
}
function readExactPrivate(file,{expectedBytes,expectedSha256,original=false}={}){
 assert.equal(process.platform,'linux');const admitted=original?[C.originalOwnerFile,C.seed.file]:null;assert(original?admitted.includes(file):file.startsWith(C.private+'/'));assert.equal(path.posix.normalize(file),file);
 let current='';const privatePrefix=original?'/home/wangzishi/.local/share/poms-r2m/private':C.private;
 for(const part of path.dirname(file).split('/').filter(Boolean)){current+='/'+part;const stat=fs.lstatSync(current);assert(stat.isDirectory()&&!stat.isSymbolicLink());if(current===privatePrefix||current.startsWith(privatePrefix+'/'))assert.equal(stat.mode&0o077,0)}
 const before=fs.lstatSync(file);assert(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&(before.mode&0o777)===0o600&&before.size<=64*1024*1024);const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);try{const opened=fs.fstatSync(fd);assert(opened.isFile()&&opened.nlink===1&&(opened.mode&0o777)===0o600&&opened.ino===before.ino&&opened.dev===before.dev);const bytes=fs.readFileSync(fd),after=fs.fstatSync(fd);for(const key of['dev','ino','size','mtimeMs','ctimeMs'])assert.equal(opened[key],after[key]);if(expectedBytes!==undefined)assert.equal(bytes.length,expectedBytes);if(expectedSha256!==undefined)assert.equal(sha(bytes),expectedSha256);return bytes}finally{fs.closeSync(fd)}
}
export function readOriginalOwner(){const raw=readExactPrivate(C.originalOwnerFile,{original:true,expectedBytes:64});assert(/^[0-9a-f]{64}$/.test(raw.toString('utf8')));return raw}
export function readOriginalSeed(){return readExactPrivate(C.seed.file,{original:true,expectedBytes:C.seed.bytes,expectedSha256:C.seed.rawBytesSha256})}
export function readNew(name){assert(/^[a-z0-9][a-z0-9._-]{0,120}$/.test(name));return readExactPrivate(C.private+'/'+name)}
export function writeNew(name,value,{replace=false,expectedSha256}={}){
 assert(/^[a-z0-9][a-z0-9._-]{0,120}$/.test(name));exactDirectory(C.private);const raw=Buffer.isBuffer(value)?value:Buffer.from(typeof value==='string'?value:JSON.stringify(value)+'\n');const file=C.private+'/'+name;
 if(replace){assert.equal(name,'provision-resources.json');assert(/^[0-9a-f]{64}$/.test(expectedSha256));assert.equal(sha(readNew(name)),expectedSha256)}
 else{let present;try{present=fs.lstatSync(file)}catch(error){if(error.code!=='ENOENT')throw error}assert(!present,'An existing new private resource cannot be adopted or overwritten')}
 const temporary=replace?file+'.'+randomUUID()+'.tmp':file,fd=fs.openSync(temporary,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);try{fs.writeFileSync(fd,raw);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}if(replace)fs.renameSync(temporary,file);const dir=fs.openSync(C.private,'r');try{fs.fsyncSync(dir)}finally{fs.closeSync(dir)}return{file,bytes:raw.length,rawBytesSha256:sha(raw),private:true};
}
export function normalizedRows(tables){assert(Array.isArray(tables)&&tables.length===107);return tables.map(item=>{assert(typeof item.table==='string'&&Array.isArray(item.rows));return{table:item.table,rows:structuredClone(item.rows).sort((a,b)=>digest(a).localeCompare(digest(b)))}}).sort((a,b)=>a.table.localeCompare(b.table))}
export function fixedFailure(error,phase){return{result:'failed-preserved',phase,category:error?.name==='AssertionError'?'assertion':/^[0-9A-Z]{5}$/.test(error?.code??'')?'database':'internal',...(/^[0-9A-Z]{5}$/.test(error?.code??'')?{sqlState:error.code}:{}),rawErrorIncluded:false}}
