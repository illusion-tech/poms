import fs from 'node:fs';
import assert from 'node:assert/strict';
const from='tools/rust-r3hijk/final-integrity01.mjs',to='tools/rust-r3hijk/final-integrity02.mjs';assert(!fs.existsSync(to));
let code=fs.readFileSync(from,'utf8');assert(code.includes('rust-check08')&&code.includes('rust-candidate03.json'));
code=code.replaceAll('final-integrity01','final-integrity02').replace('rust-check08','rust-check09').replace('rust-candidate03.json','rust-candidate04.json');
fs.writeFileSync(to,code,{flag:'wx'});
