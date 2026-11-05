// Declare every current component delta against the previous complete contract.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(fs.readFileSync('docs/design/rust-r4def/joint-g1-06/manifest06.json'));
const beforePin = manifest.sources.find(p => p.file === 'libs/shared/api-spec/openapi.json');
const beforeRaw = fs.readFileSync(beforePin.original); assert.equal(createHash('sha256').update(beforeRaw).digest('hex'), beforePin.rawBytesSha256);
const afterRaw = fs.readFileSync('libs/shared/api-spec/openapi.json'); const before = JSON.parse(beforeRaw), after = JSON.parse(afterRaw);
const stable = v => JSON.stringify(v, (_k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x);
const overrides = {};
for (const [name, schema] of Object.entries(after.components.schemas)) if (stable(schema) !== stable(before.components.schemas[name])) overrides[name] = { before: before.components.schemas[name] ?? null, after: schema };
assert(Object.keys(before.components.schemas).every(k => after.components.schemas[k]));
fs.writeFileSync('tools/rust-r4def/component-overrides27.json', JSON.stringify({ kind: 'declared-current-R4DEF-component-authority', before: beforePin, afterSha256: createHash('sha256').update(afterRaw).digest('hex'), overrides }, null, 2) + '\n');
console.log(JSON.stringify({ overrides: Object.keys(overrides).length, completeSchemas: Object.keys(after.components.schemas).length }));
