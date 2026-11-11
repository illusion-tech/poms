import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const sha = value => createHash('sha256').update(value).digest('hex');
export const keyOf = (database, table, key) => JSON.stringify([database, table, key]);
export const quote = name => { assert(/^[a-z_][a-z0-9_]*$/.test(name)); return `"${name}"`; };
export const segment = value => { assert(typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/.test(value)); return value; };
export const uuid = value => { assert(typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value), 'Actual UUID required'); return value; };
export const safeFailure = error => ({ name: error?.name ?? 'Error', status: 'failed-or-partial', privateOriginalPreserved: true });
export const data = response => response?.body?.data ?? response?.body;
export function boundStatus(exactSuccess, requested = exactSuccess) {
  assert(Number.isInteger(exactSuccess) && exactSuccess >= 200 && exactSuccess < 300);
  assert(Number.isInteger(requested) && requested >= 100 && requested <= 599);
  if (requested >= 200 && requested < 300) assert.equal(requested, exactSuccess, 'Positive status cannot override or widen the actual source-bound success status');
  return requested;
}
export function exactPath(template, params = {}) {
  assert(template.startsWith('/api/') && !/[?#]/.test(template));
  assert(params && typeof params === 'object' && !Array.isArray(params), 'Named path parameters required, including single-UUID routes');
  const names = [...template.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
  assert.deepEqual(Object.keys(params).sort(), [...new Set(names)].sort(), 'Supply exactly the canonical placeholder names');
  return template.replace(/\{([^}]+)\}/g, (_, name) => encodeURIComponent(uuid(params[name])));
}
export function operationMap(spec) {
  const result = new Map();
  for (const [template, methods] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(methods)) {
    if (!op.operationId) continue;
    assert(!result.has(op.operationId), 'Duplicate operationId');
    result.set(op.operationId, { template, method: method.toUpperCase(), op });
  }
  return result;
}
export function valueAt(value, pointer) {
  assert(typeof pointer === 'string' && (pointer === '' || pointer.startsWith('/')), 'Explicit JSON pointer required');
  for (const part of pointer.split('/').slice(1)) value = value?.[part.replace(/~1/g, '/').replace(/~0/g, '~')];
  return value;
}
export function diffRows(before, after) {
  const b = new Map(before.map(r => [JSON.stringify(r.key), r])), a = new Map(after.map(r => [JSON.stringify(r.key), r]));
  const added = [], changed = [], missing = [];
  for (const [key, row] of a) { const old = b.get(key); if (!old) added.push(row); else if (old.sha256 !== row.sha256) changed.push({ before: old, after: row }); }
  for (const [key, row] of b) if (!a.has(key)) missing.push(row);
  return { added, changed, missing };
}
// Copied in substance from the audited userfix row-level FK sorter. No cascade.
export function deleteOrder(rows, foreignKeys) {
  const pending = new Map(rows.map(r => [keyOf(r.database, r.table, r.key), r]));
  const edges = new Map([...pending.keys()].map(k => [k, new Set()]));
  for (const [childKey, child] of pending) for (const fk of foreignKeys.filter(f => f.child === child.table)) {
    const values = fk.childColumns.map(c => child.cells[c]);
    if (values.some(v => v === null || v === undefined)) continue;
    for (const [parentKey, parent] of pending) if (child.database === parent.database && parent.table === fk.parent && fk.parentColumns.every((c, i) => parent.cells[c] === values[i])) edges.get(parentKey).add(childKey);
  }
  const ordered = [];
  while (pending.size) {
    const ready = [...pending.keys()].filter(k => edges.get(k).size === 0).sort();
    assert(ready.length, 'Exact row FK cycle requires separate review');
    for (const key of ready) { ordered.push(pending.get(key)); pending.delete(key); for (const remaining of pending.keys()) edges.get(remaining).delete(key); }
  }
  return ordered;
}
export function foreignReferences(deletes, tables, foreignKeys) {
  const owned = new Set(deletes.map(r => keyOf(r.database, r.table, r.key))), found = [];
  for (const parent of deletes) for (const fk of foreignKeys.filter(f => f.parent === parent.table)) {
    for (const child of tables[fk.child] ?? []) {
      const values = fk.childColumns.map(c => child.cells[c]); if (values.some(v => v === null || v === undefined)) continue;
      if (fk.parentColumns.every((c, i) => parent.cells[c] === values[i]) && !owned.has(keyOf(parent.database, fk.child, child.key))) {
        found.push({ database: parent.database, parentTable: parent.table, parentKey: parent.key, childTable: fk.child, childKey: child.key, constraint: fk.name, childSha256: child.sha256 });
      }
    }
  }
  return found;
}
// One PostgreSQL statement, so original immediate RI constraints see the full
// exact deletion set together. Root's actual TEMP sandbox is required first.
export function exactDeleteCTE(rows) {
  assert(rows.length); const groups = new Map(), args = [], clauses = [], selects = [];
  for (const row of rows) { quote(row.table); assert(row.pk.length && row.pk.length === row.key.length && typeof row.raw === 'string'); for (const key of row.pk) quote(key); const group = groups.get(row.table) ?? []; group.push(row); groups.set(row.table, group); }
  let index = 0;
  for (const [table, group] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const columns = group[0].pk, cte = `owned_delete_${index++}`;
    for (const row of group) assert.deepEqual(row.pk, columns);
    const tuples = group.map(row => '(' + [...row.key, row.raw].map(value => { assert(typeof value === 'string'); args.push(value); return `$${args.length}::text`; }).join(',') + ')').join(',');
    const keys = columns.map((_, i) => `k${i}`), predicate = columns.map((column, i) => `t.${quote(column)}::text=owned.${quote(keys[i])}`).join(' AND ');
    clauses.push(`${quote(cte)} AS (DELETE FROM poms.${quote(table)} t USING (VALUES ${tuples}) AS owned(${[...keys, 'expected_raw'].map(quote).join(',')}) WHERE ${predicate} AND row_to_json(t)::text=owned.expected_raw RETURNING json_build_array(${columns.map(column => `t.${quote(column)}::text`).join(',')})::text AS key)`);
    selects.push(`SELECT '${table}'::text table_name,key FROM ${quote(cte)}`);
  }
  assert(args.length <= 60000, 'One-statement exact cycle cleanup exceeds safe bound; do not chunk a cycle');
  return { text: `WITH ${clauses.join(',')} ${selects.join(' UNION ALL ')}`, values: args, expected: rows.map(r => JSON.stringify([r.table, r.key])).sort(), tableCount: groups.size };
}
// Pure ownership matcher: full before/after and xmin remain private. A clock
// window, prefix, LIKE, unbound response UUID or an existing row grants nothing.
export function birthProof(row, table, attempt, anchors, cookieHashes = []) {
  const cells = JSON.parse(row.raw);
  const responseAnchor = anchors.find(a => a.table === table && row.key.length === 1 && row.key[0].toLowerCase() === a.id.toLowerCase());
  if (responseAnchor) return { kind: 'HTTP-real-response-ID', responsePointer: responseAnchor.pointer, id: responseAnchor.id };
  if (['audit_log', 'security_event'].includes(table) && cells.request_id === attempt.requestId) return { kind: 'HTTP-exact-request-ID', requestId: attempt.requestId };
  if (table === 'auth_session' && cookieHashes.includes(cells.token_hash)) return { kind: 'HTTP-real-cookie-token-hash', cookieHashBound: true };
  const tx = anchors.find(a => a.xmin && a.xmin === row.xmin);
  return tx ? { kind: 'HTTP-same-real-transaction', xmin: row.xmin, anchorTable: tx.table, anchorId: tx.id, anchorPointer: tx.pointer } : null;
}
export function numberProof(row, beforeRow, binding, actualBody, specs) {
  if (!binding) return null;
  const cells = JSON.parse(row.raw), before = beforeRow ? JSON.parse(beforeRow.raw) : null, spec = specs[binding.scope];
  assert(spec && typeof spec.prefix === 'string' && Number.isInteger(spec.padding));
  const number = valueAt(actualBody, binding.pointer);
  if (typeof number !== 'string' || cells.scope !== binding.scope || !/^\d{4}$/.test(cells.period ?? '') || !Number.isSafeInteger(cells.next_value) || cells.next_value < 2) return null;
  const value = cells.next_value - 1;
  const expected = `${spec.prefix}-${cells.period}-${String(value).padStart(spec.padding, '0')}`;
  if (number !== expected || cells.prefix !== spec.prefix || cells.padding !== spec.padding || cells.description !== spec.description) return null;
  if (before ? before.scope !== cells.scope || before.period !== cells.period || before.next_value + 1 !== cells.next_value : cells.next_value !== 2) return null;
  return { kind: 'HTTP-exact-returned-business-number-producer', scope: binding.scope, period: cells.period, pointer: binding.pointer, returnedNumber: number, priorValue: before?.next_value ?? null, nextValue: cells.next_value, independentTransactionAllowed: true };
}
