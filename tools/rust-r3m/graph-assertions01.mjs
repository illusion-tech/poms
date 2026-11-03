// Root's actual adapters validate capture completeness before any rollback oracle.
import assert from 'node:assert/strict';

export function requireGraph(graph, requirements) {
  assert(graph && typeof graph === 'object' && !Array.isArray(graph), 'Graph capture must be an object');
  assert(Object.keys(graph).length > 0, 'Empty graph is not a capture');
  assert(requirements && Array.isArray(requirements.tables) && requirements.tables.length > 0, 'Required table scope must be explicit');
  assert.equal(new Set(requirements.tables).size, requirements.tables.length, 'Required table scope must be unique');
  assert(Array.isArray(requirements.rows) && requirements.rows.length > 0, 'Required target rows must be explicit');
  for (const table of requirements.tables) { assert(Object.hasOwn(graph, table), 'Missing required table ' + table); assert(Array.isArray(graph[table]), 'Missing row array ' + table); }
  for (const { table, id } of requirements.rows) {
    assert(requirements.tables.includes(table), 'Required target must belong to captured scope');
    assert(typeof id === 'string' && id.length > 0, 'Required target id must be real and explicit');
    assert.equal(graph[table].filter(row => row && row.id === id).length, 1, 'Required committed target absent/duplicated: ' + table + '/' + id);
  }
  return graph;
}
export function assertGraphUnchanged(before, after, requirements) {
  requireGraph(before, requirements); requireGraph(after, requirements); assert.deepEqual(after, before, 'Required business graph must roll back exactly'); return true;
}
export async function captureGraph(ctx, requirements) {
  const graph = {};
  for (const table of requirements.tables) graph[table] = await ctx.rows(table);
  return requireGraph(graph, requirements);
}
