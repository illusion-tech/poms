// Derive a new isolated namespace; original lifecycle tooling/private environments are untouched.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const file = 'tools/rust-r4def/environment21.mjs'; assert(!fs.existsSync(file));
let source = fs.readFileSync('tools/rust-r4abc/environment01.mjs', 'utf8');
source = source.replaceAll('rust-r4abc', 'rust-r4def').replaceAll('r4abc', 'r4def');
source = source.replace("docs/design/rust-r4def/g1-gate-authority01.json", "docs/design/rust-r4def/g1-gate-authority07.json");
source = source.replace('const base=gate.baselineCommit', "const base='756d813c9578090fcf8e56821acce01b46b40420'");
source = source.replace('port=24433', 'port=25433').replaceAll('environment01', 'environment21');
source = source.replaceAll('names.length,93', 'names.length,94').replaceAll('after.length,93', 'after.length,94').replaceAll('r.count,93', 'r.count,94');
source = source.replaceAll('R4-original92-plus-declared-forward-migration', 'R4-original93-plus-DEF-forward-migration');
assert(!source.includes('r4abc') && source.includes('port=25433') && source.includes('g1-gate-authority07.json'));
fs.writeFileSync(file, source, { flag: 'wx' }); console.log(JSON.stringify({ derived: file, namespace: 'poms-r4def', port: 25433, oldSourceUnchanged: true }));
