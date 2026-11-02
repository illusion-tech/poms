import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
export const base='7f970c992291c61477eb9bd83a48cec19a769d88';
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function pin(file){const b=fs.readFileSync(file);return{file,bytes:b.length,rawBytesSha256:sha(b)}}
export function admission(){const m=JSON.parse(fs.readFileSync('docs/design/rust-r3hijk/preflight-native-source-manifest01.json'));assert.equal(m.base,base);return m;}
export function guardNative(){const m=admission();for(const p of m.nativeFiles)assert.deepEqual(pin(p.file),p,'Protected Native input changed '+p.file);return m.nativeFiles.length;}
export function guardRustBaseline(){const m=admission();for(const p of m.rustBaseFiles)assert.deepEqual(pin(p.file),p,'Rust changed before joint G1 '+p.file);return m.rustBaseFiles.length;}
