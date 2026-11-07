import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha = b => createHash('sha256').update(b).digest('hex');
const base = 'tools/rust-r4ghi/independent/review05/openapi-type-reference-candidate30';
const m = JSON.parse(fs.readFileSync(base + '/manifest30.json'));
const before = fs.readFileSync(m.path), next = fs.readFileSync(base + '/' + m.path);
assert.equal(sha(before), m.baseSHA256); assert.equal(sha(next), m.candidateSHA256);
assert.equal(next.toString(), '/// <reference types="../../../types/mikro-orm-schema" />\n' + before.toString());
const receipt = 'docs/design/rust-r4ghi/orm-type-reference-promotion30.json';
assert(!fs.existsSync(receipt));
fs.writeFileSync(m.path, next);
fs.writeFileSync(receipt, JSON.stringify({kind:'Root-independent-exact-single-line-type-entry-review',
  source:base + '/manifest30.json', path:m.path, beforeSHA256:sha(before), afterSHA256:sha(next),
  typeBridge:'apps/poms-api/src/types/mikro-orm-schema.d.ts', runtimeImportAdded:false,
  compilerModeChanged:false, export10Preserved:true, actualExporterRerunPending:true,
  G3Certified:false, reviewedAt:new Date().toISOString()}, null, 2) + '\n', {flag:'wx'});
console.log(JSON.stringify({promoted:m.path, sha256:sha(next), G3Certified:false}));
