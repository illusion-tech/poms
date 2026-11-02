import fs from 'node:fs';
import assert from 'node:assert/strict';
const source='tools/rust-r3hijk/money-business-probe01.mjs',target='tools/rust-r3hijk/money-business-probe02.mjs';
assert(!fs.existsSync(target));
let code=fs.readFileSync(source,'utf8');
assert(code.includes('unitPrice:amount'));
code=code.replace('unitPrice:amount',"unitPrice:'1.0000'").replaceAll('money-business-probe01.mjs','money-business-probe02.mjs');
fs.writeFileSync(target,code,{flag:'wx'});
