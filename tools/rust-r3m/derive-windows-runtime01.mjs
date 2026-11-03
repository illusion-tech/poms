import fs from'node:fs';import assert from'node:assert/strict';import{pin}from'./source-guard.mjs';
const source='tools/rust-r3hijk/windows-runtime02.mjs',target='tools/rust-r3m/windows-runtime01.mjs';assert(!fs.existsSync(target));
let text=fs.readFileSync(source,'utf8').replaceAll('poms-r3hijk','poms-r3m').replaceAll('rust-r3hijk','rust-r3m').replaceAll('R3HIJK','R3M').replaceAll('poms_r3hijk','poms_r3m').replaceAll('12410','13410').replaceAll('22433','23433').replace("root+'/dist/apps/poms-api/main.js'","root+'/tmp/rust-r3m/native-build-final01/main.js'");
// The reusable Root checkout keeps its existing managed path.
text=text.replace('E:/projects/worktrees/poms-r3m-next28/poms','E:/projects/worktrees/poms-r3hijk-next28/poms');
fs.writeFileSync(target,text,{flag:'wx'});console.log(JSON.stringify({source:pin(source),derived:pin(target),executed:false}));
