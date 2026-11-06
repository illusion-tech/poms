import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const folder = 'tools/rust-r4ghi/G/final-g1/';
const schema = JSON.parse(fs.readFileSync(folder + 'target-dto.schema.json'));
const proposal = JSON.parse(fs.readFileSync(folder + 'proposal01.json'));
JSON.parse(fs.readFileSync(folder + 'refinements02.json'));
const names = new Set(Object.keys(schema.$defs));
function walk(value) {
  if (!value || typeof value !== 'object') return;
  if (value.$ref) assert(names.has(value.$ref.slice('#/$defs/'.length)), value.$ref);
  for (const child of Object.values(value)) walk(child);
}
walk(schema); assert.equal(proposal.routes.length, 9); assert.equal(proposal.operationBudget.batch, 32);
const inventory = fs.readFileSync('docs/design/api-route-canonical-inventory.md', 'utf8').split(/\r?\n/);
const canonicalRows = proposal.routes.map(op => {
  const capability = op.operationId.replace('ProjectCostController_', '');
  const line = inventory.findIndex(row => row.includes('`' + capability + '`')) + 1;
  assert(line > 0); return { operationId: op.operationId, observedCanonicalLine: line };
});
const pins = JSON.parse(fs.readFileSync(folder + 'sources01.json')).sources;
const changedCandidateSources = pins.filter(pin => createHash('sha256').update(fs.readFileSync(pin.file)).digest('hex') !== pin.sha256).map(pin => pin.file);
// H is still authoring its declared candidate; expose drift for Root's final
// joint freeze instead of certifying obsolete hashes or overwriting originals.
console.log(JSON.stringify({ schemas: names.size, operations: proposal.routes.length, batch: proposal.operationBudget.batch, jsonAndRefs: 'passed', canonicalRows, changedCandidateSources, sqlExecuted: false, G1Admitted: false }));
