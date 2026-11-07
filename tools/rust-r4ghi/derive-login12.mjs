import fs from 'node:fs';
import assert from 'node:assert/strict';
let text=fs.readFileSync('tools/rust-r4ghi/run-business-login56.mjs','utf8');assert(text.includes('g2-business11')&&text.includes('rust-api134-process.json'));
text=text.replaceAll('g2-business11','g2-business12').replaceAll('rust-api134-process.json','rust-api135-process.json').replaceAll('consumer11-login56','consumer12-login76');
fs.writeFileSync('tools/rust-r4ghi/run-business-login12.mjs',text,{flag:'wx'});console.log(JSON.stringify({derivedLogin12:true,executed:false}));
