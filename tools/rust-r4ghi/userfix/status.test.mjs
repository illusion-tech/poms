import test from 'node:test';
import assert from 'node:assert/strict';
import { statusBindings } from './status.mjs';

test('three actual create success statuses bind to frozen runtime CREATED sources despite Swagger 200', () => {
  const ctx = { win: process.cwd().replaceAll('\\', '/'), state: {}, persist() {} };
  const table = statusBindings(ctx);
  assert.deepEqual(Object.values(table).map(v => v.status), [201, 201, 201]);
  assert(Object.values(table).every(v => v.specDeclaration === 200));
  const prior = structuredClone(ctx.state.statusSourcePins); statusBindings(ctx); assert.deepEqual(ctx.state.statusSourcePins, prior);
});
