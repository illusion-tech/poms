import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{fileURLToPath}from'node:url';
const out=path.dirname(fileURLToPath(import.meta.url)),original=fs.readFileSync(out+'/verify112.mjs','utf8');
let revised=original.replace("const liveHelpers=", "const liveHelpers=");
const marker='// This overlay is a synthetic protocol fixture, NOT a Root-approved final H seal.';
assert(revised.includes(marker));
revised=revised.replace(marker,`const syntheticUninstalled=new Map([
 [R+'/tools/rust-r4ghi/business/labor-mask47.mjs',Buffer.from('// synthetic uninstalled final-H fixture\\n')],
 [R+'/tools/rust-r4ghi/business/labor-mask-bindings47.json',Buffer.from(JSON.stringify({environmentBindings46:null,lineage:null,actors:null})+'\\n')]
]);
for(const[file,raw]of syntheticUninstalled){const relative=file.slice(R.length+1);if(!liveHelpers.some(x=>x.file===relative))liveHelpers.push({file:relative,sha256:sha(raw)});}
liveHelpers.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
${marker}`);
revised=revised.replace('const files=new Map(),dirs=new Set(),writes=[],events=[];','const files=new Map(syntheticUninstalled),dirs=new Set(),writes=[],events=[];');
revised=revised.replace("v=JSON.parse(realRaw(f));v.actors={};", "v={environmentBindings46:null,lineage:null,actors:{}};");
revised=revised.replace('finalHelperCountAtReadOnlyCapture:good.helperCount','syntheticHelperCount:good.helperCount');
assert.notEqual(revised,original);
fs.writeFileSync(out+'/verify112-02.mjs',revised,{flag:'wx'});
fs.writeFileSync(out+'/attempt01-H47-not-yet-installed.json',JSON.stringify({kind:'reviewer-synthetic-fixture-precondition-stop',reason:'The positive fixture initially read Root labor-mask-bindings47.json before Root final H47 union was installed. Actual freeze was never executed. New02 supplies clearly synthetic uninstalled final-H rows only inside memory FS.',RootWritten:0,SQL:0,HTTP:0,Cargo:0,finalH47InstalledClaimed:false},null,2)+'\n',{flag:'wx'});
