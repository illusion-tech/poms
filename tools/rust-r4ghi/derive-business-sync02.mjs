import fs from 'node:fs';
import assert from 'node:assert/strict';
let source = fs.readFileSync('tools/rust-r4ghi/sync-linux01.mjs', 'utf8');
const before = "const gate=JSON.parse(fs.readFileSync(win+'/docs/design/rust-r4ghi/user-fix-online01.json','utf8'));\nassert(gate.G1Certified&&gate.G2Authorized&&gate.issue===115);";
assert(source.includes(before));
source = source.replace(before, "const gate=JSON.parse(fs.readFileSync(win+'/docs/design/rust-r4ghi/g1-online01.json','utf8'));\nassert(gate.G1Certified&&gate.G2Authorized&&gate.counts.total===32&&gate.inputCommit==='9e010077e3010ff09447e9d77cb1bf1f7adbf68d');");
fs.writeFileSync('tools/rust-r4ghi/sync-business-linux02.mjs', source, { flag: 'wx' });
