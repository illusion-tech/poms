import fs from 'node:fs';
import assert from 'node:assert/strict';
let source = fs.readFileSync('tools/rust-r4def/export-openapi15.mjs', 'utf8');
source = source.replace("assert(JSON.parse(fs.readFileSync('docs/design/rust-r4def/g1-gate-authority07.json')).G2Authorized);", "assert(JSON.parse(fs.readFileSync('docs/design/rust-r4ghi/g1-online01.json')).G2Authorized);");
source = source.replaceAll('rust-r4def', 'rust-r4ghi').replaceAll('poms-r4def-static', 'poms-r4ghi-static').replace("?? '15'", "?? '02'").replaceAll('receipt15.json', 'receipt02.json');
const output = 'tools/rust-r4ghi/export-openapi02.mjs';
assert(!fs.existsSync(output));fs.writeFileSync(output, source, { flag: 'wx' });
console.log(JSON.stringify({ output, actualExporter: 'apps/poms-api/src/openapi.ts', databaseConnect: false }));
