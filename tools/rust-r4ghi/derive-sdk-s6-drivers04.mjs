import fs from 'node:fs';
import assert from 'node:assert/strict';
const A='2cd1be6029cf1b14ebfb1fc4530af894507a4c5a';
let source=fs.readFileSync('tools/rust-r4ghi/generate-sdk-s5-05.mjs','utf8');
function replace(a,b){assert.equal(source.split(a).length,2,a);source=source.replace(a,()=>b);}
replace("baseline.sourceHead,'883f88fdf4fd609bb8b0725b28bda011d408d6ee'","baseline.sourceHead,'"+A+"'");
replace('baseline.spec.schemas.length,689','baseline.spec.schemas.length,690');
replace("'tmp/rust-r4ghi/root/client-generation05'","'tmp/rust-r4ghi/root/client-generation06'");
replace('value.spec.schemas,689','value.spec.schemas,690');replace('schemas:689','schemas:690');
replace('actual-fixed-S5-full-SDK-write-and-check','actual-fixed-S6-full-SDK-write-and-check');
fs.writeFileSync('tools/rust-r4ghi/generate-sdk-s6-06.mjs',source,{flag:'wx'});
console.log(JSON.stringify({created:'tools/rust-r4ghi/generate-sdk-s6-06.mjs',sourceHead:A,schemas:690,productGenerationExecuted:false}));
