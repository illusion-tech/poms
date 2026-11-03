// Supported read-only resolution of public immutable lifecycle pins after G4 relocation.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';
const archive='docs/design/archive/slices/rust-r3m',sha=b=>createHash('sha256').update(b).digest('hex');
export function readArchiveAuthority(){const mapFile=archive+'/archive-origin-map.json',map=JSON.parse(fs.readFileSync(mapFile)),publicRecords=[...map.publicOriginals];for(const n of fs.readdirSync(archive).filter(n=>/^public-evidence-origin-map\d+\.json$/.test(n))){const m=JSON.parse(fs.readFileSync(archive+'/'+n));publicRecords.push(...m.records);}return{...map,publicRecords};}
export function resolveArchivePin(input,authority=readArchiveAuthority()){
 assert(input&&typeof input.file==='string'&&Number.isSafeInteger(input.bytes)&&input.bytes>=0&&/^[a-f0-9]{64}$/.test(input.rawBytesSha256));assert(!path.isAbsolute(input.file)&&!input.file.split(/[\\/]/).includes('..'),'Only public repository-relative pins are supported');
 const matches=p=>p.file===input.file&&p.bytes===input.bytes&&p.rawBytesSha256===input.rawBytesSha256;
 const snapshot=authority.immutableInputSnapshots.find(r=>matches(r.original)),moved=authority.records.find(r=>r.originalPath===input.file&&r.bytes===input.bytes&&r.rawBytesSha256===input.rawBytesSha256),published=authority.publicRecords.find(r=>matches(r.logicalOriginal));
 let target=snapshot?.snapshot.file||moved?.archivePath||published?.archived.file||input.file;
 if(target.startsWith('docs/design/rust-r3m/'))target=archive+target.slice('docs/design/rust-r3m'.length);
 const absolute=path.resolve(target),root=path.resolve(process.cwd());assert(absolute.startsWith(root+path.sep));let at=root;for(const part of path.relative(root,absolute).split(path.sep)){at=path.join(at,part);assert(!fs.lstatSync(at).isSymbolicLink(),'Archive symlink rejected');}const s=fs.lstatSync(absolute);assert(s.isFile()&&s.nlink===1);const b=fs.readFileSync(absolute);assert.equal(b.length,input.bytes,input.file);assert.equal(sha(b),input.rawBytesSha256,input.file);return{logicalOriginal:input,canonical:target,bytes:b};
}
