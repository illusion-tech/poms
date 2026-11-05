// Static public source copy into this candidate; never reads private or runs DB.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const own = path.dirname(fileURLToPath(import.meta.url)), root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const pin = file => { const b = fs.readFileSync(root + '/' + file); return { file, bytes: b.length, rawBytesSha256: createHash('sha256').update(b).digest('hex') }; };
const file = 'libs/shared/api-spec/openapi.json', spec = JSON.parse(fs.readFileSync(root + '/' + file, 'utf8')), paths = {};
for (const [p, methods] of Object.entries(spec.paths)) for (const [m, o] of Object.entries(methods)) if (o.operationId) { paths[p] ??= {}; paths[p][m] = { operationId: o.operationId }; }
assert.equal(Object.values(paths).reduce((n, v) => n + Object.keys(v).length, 0), 293);
fs.writeFileSync(own + '/operation-authority103.json', JSON.stringify({ kind: 'static-frozen-canonical-producer-route-authority103', source: pin(file), paths }, null, 2) + '\n', { flag: 'wx' });
const numberFile = 'tools/rust-r2ef/e-authority.json', numbers = JSON.parse(fs.readFileSync(root + '/' + numberFile, 'utf8')).businessNumbers; assert.equal(Object.keys(numbers).length, 9);
fs.writeFileSync(own + '/number-specs103.json', JSON.stringify({ kind: 'static-current-business-number-source-specs103', source: pin(numberFile), businessNumbers: numbers }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ staticOperations: 293, staticNumberScopes: 9, privateRead: false, DBExecuted: false }));
