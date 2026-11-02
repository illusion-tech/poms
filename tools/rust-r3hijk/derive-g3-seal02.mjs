import fs from 'node:fs';
import assert from 'node:assert/strict';
const target='tools/rust-r3hijk/seal-g3-submission02.mjs';assert(!fs.existsSync(target));
let source=fs.readFileSync('tools/rust-r3hijk/seal-g3-submission01.mjs','utf8');
source=source.replace('g3-input-manifest01.json','g3-input-manifest02.json').replace("['01','02']","['03']").replaceAll('common-checks02','common-checks03').replaceAll('submission-governance-originals/','submission-governance-originals02/');
fs.writeFileSync(target,source,{flag:'wx'});
