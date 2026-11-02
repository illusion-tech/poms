import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pin} from './source-guard.mjs';
const file='apps/poms-api-rust/src/sales_intelligence/service.rs',from='/home/wangzishi/projects/poms-rust-r3hijk/'+file;
const manifest=JSON.parse(fs.readFileSync('docs/design/rust-r3hijk/g3-input-manifest02.json')),expected=manifest.productInputs.find(x=>x.file===file);
assert.equal(pin(from).rawBytesSha256,expected.rawBytesSha256);
const target='docs/design/rust-r3hijk/corrective-originals04/'+file;fs.mkdirSync(target.slice(0,target.lastIndexOf('/')),{recursive:true});fs.copyFileSync(from,target,fs.constants.COPYFILE_EXCL);
const receipt={kind:'R3HIJK-UUID-business-corrective-immutable-original',source:expected,snapshot:pin(target),candidate:'cb19cff248fdb44ac27269bb5f681ab24887c85b077af14032fc30a0fc8101aa',reason:'Full G3 identified internal UUID identity compared as case-sensitive original text',priorManifest:pin('docs/design/rust-r3hijk/g3-input-manifest02.json'),priorG3Certified:false};
fs.writeFileSync('docs/design/rust-r3hijk/uuid-corrective-origin04.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({originalSourcePreserved:true,sha256:expected.rawBytesSha256}));
