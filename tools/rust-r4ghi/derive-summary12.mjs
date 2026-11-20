import fs from 'node:fs';
import assert from 'node:assert/strict';
let text=fs.readFileSync('tools/rust-r4ghi/build-summary-example11.mjs','utf8');
assert(text.includes('root/summary-build11')&&text.includes('root/rust-build08/receipt.json'));
text=text.replace('root/summary-build11','root/summary-build12').replace('root/rust-build08/receipt.json','root/rust-build09/receipt.json');
fs.writeFileSync('tools/rust-r4ghi/build-summary-example12.mjs',text,{flag:'wx'});
console.log(JSON.stringify({derivedSummary12:true,executed:false}));
