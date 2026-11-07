import fs from 'node:fs';
import assert from 'node:assert/strict';
let text=fs.readFileSync('tools/rust-r4ghi/finish-implementation-checkpoint67.mjs','utf8');
assert(text.includes("root+'/tmp/rust-r4ghi/root/implementation-checkpoint67'"));
text=text.replace("root+'/tmp/rust-r4ghi/root/implementation-checkpoint67'","root+'/tmp/rust-r4ghi/root/implementation-checkpoint68'");
text=text.replace("'tools/rust-r4ghi/.gitattributes'","'tools/rust-r4ghi/.gitattributes','tools/rust-r4ghi/derive-checkpoint68.mjs','tools/rust-r4ghi/finish-implementation-checkpoint68.mjs'");
fs.writeFileSync('tools/rust-r4ghi/finish-implementation-checkpoint68.mjs',text,{flag:'wx'});
console.log(JSON.stringify({derived68:true,failed66And67Preserved:true}));
