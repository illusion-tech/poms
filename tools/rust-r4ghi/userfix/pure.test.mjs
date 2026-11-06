import test from 'node:test';
import assert from 'node:assert/strict';
import { sha, deleteOrder, diffRows, requireSafeSegment } from './pure.mjs';

test('raw database text retains integer/subcent differences beyond JS Number precision', () => {
  const a = '{"amount":9999999999999999.99}', b = '{"amount":9999999999999999.98}';
  const row = raw => ({ key: ['id'], raw, sha256: sha(raw) });
  assert.notEqual(sha(a), sha(b)); assert.equal(diffRows([row(a)], [row(b)]).changed.length, 1);
  assert.equal(JSON.parse(JSON.stringify({ raw: a })).raw, a);
});
test('delete topology sorts self-table child before parent plus real dependent rows', () => {
  const row = (table, id, parent = null) => ({ database: 'db', table, key: [id], cells: { id, parent_id: parent, org_id: parent } });
  const rows = [row('org_unit', 'parent'), row('org_unit', 'child', 'parent'), row('user_org_membership', 'member', 'child')];
  const fks = [{ child: 'org_unit', parent: 'org_unit', childColumns: ['parent_id'], parentColumns: ['id'] }, { child: 'user_org_membership', parent: 'org_unit', childColumns: ['org_id'], parentColumns: ['id'] }];
  assert.deepEqual(deleteOrder(rows, fks).map(r => r.key[0]), ['member', 'child', 'parent']);
});
test('unknown FK cycle is rejected and identities cannot cross epoch directories', () => {
  assert.throws(() => deleteOrder([{ database: 'db', table: 'x', key: ['a'], cells: { id: 'a', parent: 'b' } }, { database: 'db', table: 'x', key: ['b'], cells: { id: 'b', parent: 'a' } }], [{ child: 'x', parent: 'x', childColumns: ['parent'], parentColumns: ['id'] }]));
  for (const bad of ['../other', '', '/root', 'x/y']) assert.throws(() => requireSafeSegment(bad));
});
