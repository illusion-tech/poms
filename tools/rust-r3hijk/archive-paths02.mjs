// Resolve historical logical pins through immutable moves/snapshots, without aliases.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
const base='docs/design/archive/slices/rust-r3hijk';
export function archiveAuthority(){const map=JSON.parse(fs.readFileSync(base+'/archive-origin-map.json'));const publicRecords=fs.readdirSync(base).filter(n=>/^public-evidence-origin-map(?:\d+)?\.json$/.test(n)).flatMap(n=>JSON.parse(fs.readFileSync(base+'/'+n)).records);return{...map,publicRecords};}
export function resolvePin(input,map=archiveAuthority()){
 const snapshot=map.immutableInputSnapshots.find(r=>r.original.file===input.file&&r.original.rawBytesSha256===input.rawBytesSha256);
 const moved=map.records.find(r=>r.originalPath===input.file&&r.rawBytesSha256===input.rawBytesSha256);
 const published=map.publicRecords.find(r=>r.originalPath===input.file&&r.rawBytesSha256===input.rawBytesSha256);
 const target=snapshot?.snapshot.file||moved?.archivePath||published?.archivePath||input.file;
 const absolute=path.resolve(target);assert(absolute.startsWith(path.resolve(process.cwd())+path.sep));const bytes=fs.readFileSync(absolute);assert.equal(bytes.length,input.bytes,input.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),input.rawBytesSha256,input.file);return target;
}
