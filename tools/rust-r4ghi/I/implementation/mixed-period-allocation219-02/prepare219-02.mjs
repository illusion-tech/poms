// Fork only the external proposal. Original1bfab files remain byte-identical.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{fileURLToPath}from'node:url';import{createHash}from'node:crypto';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../../../../..'),old=path.join(dir,'../mixed-period-allocation219'),sha=x=>createHash('sha256').update(x).digest('hex'),raw=fs.readFileSync(old+'/manifest219.json');
assert.equal(sha(raw),'1bfab12235131b15ec4e2b26dd84c9ff9e7f65a02dd0005a8e286f06be814ca6');const manifest=JSON.parse(raw);
for(const p of [...manifest.executableFiles,...manifest.supportFiles,manifest.historicalInventory])assert.equal(sha(fs.readFileSync(root+'/'+p.file)),p.rawBytesSha256);
for(const n of ['driver219.mjs','runtime219.mjs','facts219.mjs','inventory219.mjs','fi219.mjs','semantics219.mjs','transport219.mjs','facts219.test.mjs','input219.template.json','README219.md'])fs.writeFileSync(dir+'/'+n,fs.readFileSync(old+'/'+n),{flag:'wx'});
console.log(JSON.stringify({forkedExternalFiles:10,originalManifestSHA256:sha(raw),originalFilesPreserved:true,RootApplied:false,SQLOrHTTPExecuted:false}));
