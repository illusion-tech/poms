// Derive a separate finite exporter; preserve the original first37 source/input.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const file = 'tools/rust-r4def/export-validation-input18.mjs'; assert(!fs.existsSync(file));
let source = fs.readFileSync('tools/rust-r4abc/export-validation-input01.mjs', 'utf8');
const replace = (before, after) => { assert(source.includes(before), before); source = source.replaceAll(before, () => after); };
replace('docs/design/rust-r4abc/inputs/surface37-source01.json', 'tools/rust-r4def/combined-operation-map16.json');
replace('surface.operations.length === 37', 'surface.operations.length === 67');
replace('exactly 37 source operations', 'exactly 67 source operations');
replace('length === 595', 'length === 626'); replace('Current 595-schema', 'Current 626-schema');
replace('length === 291', 'length === 293'); replace('Current 291-operation', 'Current 293-operation');
replace("'optional','nullable','default'", "'union','discriminatedUnion','strict','describe','optional','nullable','default'");
replace("'positive','regex','refine'", "'positive','gt','lt','regex','refine'");
replace("if (method === 'trim') result.trim = true;", "if (method === 'trim') result.trim = true;\n  if (method === 'strict') result.strict = true;");
replace("'coerce','passthrough','strict','catchall'", "'coerce','passthrough','catchall'");
replace("if (meta.trim) output['x-r4-trim'] = true;", "if (meta.trim) output['x-r4-trim'] = true;\n  if (meta.strict) output['x-r4-strict'] = true;");
replace("} else assert(parameters.length === 0, `Unregistered query DTO at ${row.operationId}`);", "} else if (row.operationId === 'ProjectCostController_listProjectActualCostRecords') {\n    assert(parameters.length === 3 && parameters.every(p => ['costType','recordStatus','sourceType'].includes(p.name)), 'Unexpected cost query closure');\n    query['x-r4-strict'] = true;\n  } else assert(parameters.length === 0, `Unregistered query DTO at ${row.operationId}`);");
replace("'x-r4-unique-contract-ids']);", "'x-r4-unique-contract-ids','x-r4-strict','x-r4-pattern-kind','discriminator']);");
replace("function admit(schema) {", `const finitePatterns = new Map([
  ['^[A-Z]{3}$', 'currency-code'], ['^[0-9a-f]{64}$', 'sha256'],
  ['^[a-z][a-z0-9-]*$', 'dictionary-code'],
  [String.raw\`^[0-9]{1,12}(?:\\.[0-9]{1,6})?$\`, 'weight-six'],
  [String.raw\`^[0-9]{1,16}(?:\\.[0-9]{1,2})?$\`, 'bounded-money'],
  [String.raw\`^-?[0-9]{1,16}(?:\\.[0-9]{1,2})?$\`, 'signed-bounded-money'],
]);
function admit(schema) {`);
replace("if (schema.pattern) assert(schema.pattern === knownPatterns[schema.format ?? schema['x-r4-scalar']], `Unsupported or changed format/pattern ${schema.pattern}`);", "if (schema.pattern) {\n    if (schema.pattern !== knownPatterns[schema.format ?? schema['x-r4-scalar']]) {\n      const kind = finitePatterns.get(schema.pattern); assert(kind, `Unsupported or changed format/pattern ${schema.pattern}`);\n      schema['x-r4-pattern-kind'] = kind;\n    }\n  }");
replace("kind: 'r4-first37-validation-input'", "kind: 'r4-shared67-validation-input'");
replace('Finite 37-operation', 'Finite 67-operation');
replace("root, 'tools/rust-r4abc'", "root, 'tools/rust-r4def'");
replace('tools/rust-r4abc/validation-input01.json', 'tools/rust-r4def/validation-input18.json');
replace("['UpdateContractBasicInfoRequest','UpdatePayableRecordRequest','UpdateInvoiceRecordRequest']", "['UpdateContractBasicInfoRequest','UpdatePayableRecordRequest','UpdateInvoiceRecordRequest','UpdateExpenseRecordRequest']");
source = source.replaceAll("getText(source).replace(/\\s+/g, '')", () => "getText(source).replace(/\\s+/g, '').replace(/\\(([A-Za-z_][A-Za-z0-9_]*)\\)=>/g, '$1=>')");
source = source.replace('expression === expected,', () => "expression === expected.replace(/\\(([A-Za-z_][A-Za-z0-9_]*)\\)=>/g, '$1=>'),");
source = source.replace("expression === '(terms)=>newSet(terms.map((term)=>term.contractId.toLowerCase())).size===terms.length'", () => "expression === 'terms=>newSet(terms.map(term=>term.contractId.toLowerCase())).size===terms.length'");
fs.writeFileSync(file, source, { flag: 'wx' });
console.log(JSON.stringify({ derived: file, oldSourcePreserved: true }));
