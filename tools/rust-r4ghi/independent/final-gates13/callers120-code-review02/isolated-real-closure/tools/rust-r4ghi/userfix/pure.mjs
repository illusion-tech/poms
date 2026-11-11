import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const sha = value => createHash('sha256').update(value).digest('hex');
export const quote = value => { assert(/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)); return `"${value}"`; };
export const keyOf = (database, table, key) => JSON.stringify([database, table, key]);
export const rowKey = row => JSON.stringify(row.key);
export function diffRows(before, after) {
  const b = new Map(before.map(row => [rowKey(row), row]));
  const a = new Map(after.map(row => [rowKey(row), row]));
  const added = [], changed = [], missing = [];
  for (const [key, row] of a) {
    const old = b.get(key);
    if (!old) added.push(row);
    else if (old.sha256 !== row.sha256) changed.push({ before: old, after: row });
  }
  for (const [key, row] of b) if (!a.has(key)) missing.push(row);
  return { added, changed, missing };
}
// Child -> parent edges are row-level, including self-referencing tables.
// No table-level topological shortcut and no ON DELETE CASCADE dependency.
export function deleteOrder(rows, foreignKeys) {
  const pending = new Map(rows.map(row => [keyOf(row.database, row.table, row.key), row]));
  const edges = new Map([...pending.keys()].map(key => [key, new Set()]));
  for (const [childKey, child] of pending) {
    for (const fk of foreignKeys.filter(f => f.child === child.table)) {
      const values = fk.childColumns.map(c => child.cells[c]);
      if (values.some(v => v === null || v === undefined)) continue;
      for (const [parentKey, parent] of pending) {
        if (child.database !== parent.database || parent.table !== fk.parent) continue;
        if (fk.parentColumns.every((c, i) => parent.cells[c] === values[i])) edges.get(parentKey).add(childKey);
      }
    }
  }
  const result = [];
  while (pending.size) {
    const ready = [...pending.keys()].filter(key => edges.get(key).size === 0).sort();
    assert(ready.length, 'Row FK cycle requires an explicit reviewed plan; no cascade/deferred bypass');
    for (const key of ready) {
      result.push(pending.get(key)); pending.delete(key);
      for (const remaining of pending.keys()) edges.get(remaining).delete(key);
    }
  }
  return result;
}
export function requireSafeSegment(value) {
  assert(typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$/.test(value), 'Bounded epoch/run/phase identifier required');
  return value;
}
export function safeSummary(error) { return { name: error?.name ?? 'Error', failed: true, originalStoredPrivately: true }; }
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

