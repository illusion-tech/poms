import fs from 'node:fs';import assert from 'node:assert/strict';import{execFileSync}from'node:child_process';
assert.equal(process.platform,'win32');
const inputs=execFileSync('git',['ls-files','-m','-o','--exclude-standard','-z'],{encoding:'utf8',windowsHide:true}).split('\0').filter(f=>/^(apps\/poms-(admin|api)\/|libs\/admin\/data-access\/|libs\/shared\/)/.test(f)&&fs.statSync(f).isFile());
fs.writeFileSync('tmp/rust-r4abc/root/ts-source-list17.json',JSON.stringify({inputs},null,2)+'\n',{flag:'wx'});
let text=fs.readFileSync('tools/rust-r4abc/verify-ts11.mjs','utf8').replaceAll('ts-source-list11','ts-source-list17').replaceAll('ts-checks11','ts-checks17').replaceAll('receipt11','receipt17');
assert(text.includes("CI:'true'"));text=text.replace("CI:'true'","CI:'true',TZ:'UTC',NODE_OPTIONS:'--experimental-vm-modules'");
fs.writeFileSync('tools/rust-r4abc/verify-ts17.mjs',text,{flag:'wx'});console.log(JSON.stringify({inputs:inputs.length,next:'verify-ts17.mjs',testFlags:'documented existing Jest globalSetup runInBand requirement; fixed UTC'}));
