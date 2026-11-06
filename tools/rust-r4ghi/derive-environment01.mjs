// Reviewable adaptation of the previously audited fresh-environment provisioner.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const input='tools/rust-r4def/environment21.mjs',output='tools/rust-r4ghi/environment01.mjs';
const raw=fs.readFileSync(input);let source=raw.toString('utf8');
assert(source.includes("const base='756d813c9578090fcf8e56821acce01b46b40420'"));
source=source.replaceAll('r4def','r4ghi').replaceAll('environment21','environment01').replaceAll('756d813c9578090fcf8e56821acce01b46b40420','aaa4b16ac66092f0cb1dc6646a02cf14e80823ee').replaceAll('g1-gate-authority07.json','user-fix-online01.json').replaceAll('25433','25434').replaceAll('14400','14410').replaceAll('14500','14510').replaceAll('14600','14610');
assert(!source.includes('poms-r4def'));assert(source.includes("port=25434"));assert(source.includes('user-fix-online01.json'));
assert(!fs.existsSync(output));fs.writeFileSync(output,source,{flag:'wx'});
const sha=b=>createHash('sha256').update(b).digest('hex');
fs.writeFileSync('tools/rust-r4ghi/environment-derivation01.json',JSON.stringify({kind:'fresh-namespace-environment-derivation',input,inputSHA256:sha(raw),output,outputSHA256:sha(Buffer.from(source)),namespace:'poms-r4ghi',port:25434,sourceImage:'localhost/poms-r0e-pg15:1',admission:'actual user-fix G1 only; future R4 business admission separate',migrationCount:94,oldNamespacesTouched:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({derived:output,namespace:'poms-r4ghi',port:25434,previousEnvironmentUnchanged:true}));
