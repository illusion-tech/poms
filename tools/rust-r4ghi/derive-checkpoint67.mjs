import fs from 'node:fs';
import assert from 'node:assert/strict';
let text=fs.readFileSync('tools/rust-r4ghi/finish-implementation-checkpoint66.mjs','utf8');
assert(text.includes("'tools/rust-r4ghi/finish-implementation-checkpoint66.mjs'"));
text=text.replace("'tools/rust-r4ghi/finish-implementation-checkpoint66.mjs'","'tools/rust-r4ghi/finish-implementation-checkpoint66.mjs','tools/rust-r4ghi/finish-implementation-checkpoint67.mjs','tools/rust-r4ghi/derive-checkpoint67.mjs','tools/rust-r4ghi/.gitattributes'");
text=text.replace("root+'/tmp/rust-r4ghi/root/implementation-checkpoint66'","root+'/tmp/rust-r4ghi/root/implementation-checkpoint67'");
fs.writeFileSync('tools/rust-r4ghi/finish-implementation-checkpoint67.mjs',text,{flag:'wx'});
console.log(JSON.stringify({derived67:true,oldFailed66Preserved:true}));
