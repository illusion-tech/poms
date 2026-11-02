import fs from 'node:fs';
import assert from 'node:assert/strict';
const from='tools/rust-r3hijk/money-business-probe02.mjs',to='tools/rust-r3hijk/money-business-probe03.mjs';
assert(!fs.existsSync(to));let code=fs.readFileSync(from,'utf8');assert(code.includes("grossMarginBand='low'"));
code=code.replace("grossMarginBand='low'","grossMarginBand='target'").replaceAll('money-business-probe02.mjs','money-business-probe03.mjs');fs.writeFileSync(to,code,{flag:'wx'});
