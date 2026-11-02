// Read-only resolution of historical logical paths; never rewrites frozen pins.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';
const file='docs/design/archive/slices/rust-r3cdefg/archive-origin-map.json';
export function archiveMap(){return JSON.parse(fs.readFileSync(file));}
export function resolveOriginalPin(pin,map=archiveMap()){
 const snapshot=map.immutableInputSnapshots?.find(r=>r.original.file===pin.file&&r.original.rawBytesSha256===pin.rawBytesSha256);
 const moved=map.records.find(r=>r.source.file===pin.file&&r.source.rawBytesSha256===pin.rawBytesSha256);
 const resolved=snapshot?.snapshot.file||moved?.destination.file||pin.file;
 const absolute=path.resolve(resolved);assert(absolute.startsWith(path.resolve(process.cwd())+path.sep));
 const bytes=fs.readFileSync(absolute);assert.equal(bytes.length,pin.bytes,pin.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),pin.rawBytesSha256,pin.file);return resolved;
}
export function verifyOriginalPins(pins,map=archiveMap()){return pins.map(pin=>({logical:pin.file,resolved:resolveOriginalPin(pin,map),bytes:pin.bytes,rawBytesSha256:pin.rawBytesSha256}));}
