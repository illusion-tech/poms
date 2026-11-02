import fs from 'node:fs';import assert from 'node:assert/strict';import {pin} from './source-guard.mjs';
const file='apps/poms-api-rust/src/sales_follow_up/reminder.rs',from='/home/wangzishi/projects/poms-rust-r3hijk/'+file,manifest=JSON.parse(fs.readFileSync('docs/design/rust-r3hijk/g3-input-manifest02.json')),expected=manifest.productInputs.find(x=>x.file===file);
assert.equal(pin(from).rawBytesSha256,expected.rawBytesSha256);
const target='docs/design/rust-r3hijk/corrective-originals05/'+file;fs.mkdirSync(target.slice(0,target.lastIndexOf('/')),{recursive:true});fs.copyFileSync(from,target,fs.constants.COPYFILE_EXCL);
fs.writeFileSync('docs/design/rust-r3hijk/followup-corrective-origin05.json',JSON.stringify({kind:'R3HIJK-empty-reminder-stream-immutable-original',source:expected,snapshot:pin(target),candidate:'bb1695946483e4856707f1a590147a2a375d140d0a3dc41255ae56556d1a6c2e',reason:'Two valid new facts in one empty owner/target stream committed two open Todos',priorManifest:pin('docs/design/rust-r3hijk/g3-input-manifest02.json'),priorG3Certified:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({originalReminderSourcePreserved:true,sha256:expected.rawBytesSha256}));
