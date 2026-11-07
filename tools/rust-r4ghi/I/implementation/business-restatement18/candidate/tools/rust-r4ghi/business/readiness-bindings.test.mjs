import test from 'node:test';
import assert from 'node:assert/strict';
import { onlyStatusTransition } from './readiness-bindings.mjs';
test('status transition compares complete raw bytes without numeric rounding',()=>{
 const before='{"id":"i","large":9999999999999999.99,"status":"blocked","nested":{"status":"blocked"}}';
 const after='{"id":"i","large":9999999999999999.99,"status":"ready","nested":{"status":"blocked"}}';
 assert(onlyStatusTransition(before,after));
 assert(!onlyStatusTransition(before,after.replace('9999999999999999.99','9999999999999999.98')));
 assert(!onlyStatusTransition(before,after.replace('"nested":{"status":"blocked"}','"nested":{"status":"ready"}')));
});
test('unrelated or already-ready rows are not eligible',()=>{
 assert(!onlyStatusTransition('{"status":"ready"}','{"status":"ready"}'));
 assert(!onlyStatusTransition('{"status":"blocked","package_id":"a"}','{"status":"ready","package_id":"b"}'));
 assert(!onlyStatusTransition('{"nested":{"status":"blocked"}}','{"nested":{"status":"ready"}}'));
});
test('escaped quotes in descriptions do not become authorization cells',()=>{
 const raw=JSON.stringify({description:'a "status":"blocked" label',status:'blocked'});
 assert(onlyStatusTransition(raw,JSON.stringify({description:'a "status":"blocked" label',status:'ready'})));
 assert(!onlyStatusTransition(raw,JSON.stringify({description:'a "status":"ready" label',status:'ready'})));
});
