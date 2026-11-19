import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', dir = path.dirname(fileURLToPath(import.meta.url)), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const file = 'tools/rust-r4ghi/business/frozen-reparent58.mjs', before = fs.readFileSync(`${root}/${file}`, 'utf8'), after = fs.readFileSync(`${dir}/proposed/${file}`, 'utf8');
assert.equal(after, before.replace('assert.equal(attempt.status, 201); assert.equal(attempt.expectedStatus, 201);', 'assert.equal(attempt.status, 200); assert.equal(attempt.expectedStatus, 200);'));
const operationId = 'CommissionController_createRoleAssignment', map = JSON.parse(fs.readFileSync(`${root}/docs/design/rust-r4ghi/operation-map01.json`)).operations.find(value => value.operationId === operationId);
assert.equal(map.successStatus, 200); assert.equal(map.legacyNativeSuccessStatus, 201);
const spec = JSON.parse(fs.readFileSync(`${root}/libs/shared/api-spec/openapi.json`)), operations = Object.values(spec.paths).flatMap(methods => Object.values(methods)).filter(value => value.operationId === operationId); assert.equal(operations.length, 1); assert.deepEqual(Object.keys(operations[0].responses).filter(value => /^2/.test(value)), ['200']);
const binding = JSON.parse(fs.readFileSync(`${dir}/source-rebinding58-02.json`)); for (const item of binding.bindings) { assert.equal(sha(fs.readFileSync(item.originalManifest)), item.originalManifestSHA256); assert.equal(sha(fs.readFileSync(`${root}/${item.dependency}`)), item.afterSHA256); }
console.log(JSON.stringify({ kind: 'static-canonical-modern-status-and-explicit-context-rebinding58-02', modernOnly200: true, legacyNative201Preserved: true, exactOneLineChange: true, oldManifestsUnchanged: true, SQL: false, HTTP: false }));
