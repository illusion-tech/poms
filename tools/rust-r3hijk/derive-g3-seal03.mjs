import fs from 'node:fs';import assert from 'node:assert/strict';
const to='tools/rust-r3hijk/seal-g3-submission03.mjs';assert(!fs.existsSync(to));let source=fs.readFileSync('tools/rust-r3hijk/seal-g3-submission02.mjs','utf8');
for(const [a,b]of [['g3-input-manifest02.json','g3-input-manifest03.json'],["['03']","['04','05']"],['common-checks03','common-checks05'],['submission-governance-originals02/','submission-governance-originals03/'],['rust-check09','rust-check11'],['passed:288','passed:294']]){assert(source.includes(a),a);source=source.replaceAll(a,b);}
source=source.replace("'money-corrective-checkpoint03'","'money-corrective-checkpoint03','uuid-corrective-checkpoint04','followup-stream-corrective-checkpoint05'");
fs.writeFileSync(to,source,{flag:'wx'});
