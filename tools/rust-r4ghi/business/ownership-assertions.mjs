import assert from 'node:assert/strict';
import { keyOf } from './pure.mjs';

export function assertLegacyView(value, row, schema) {
  assert.deepEqual(Object.keys(value).sort(), Object.keys(schema.properties).sort(), 'Legacy view must be the exact bounded union, without full-project/finance/creator padding');
  assert.equal(value.scopeKind, 'legacy-owner-anchor-only'); assert.equal(value.projectId, row.id);
  assert.equal(value.projectNo, row.project_no); assert.equal(value.projectName, row.project_name);
  assert.equal(value.currentStage, row.current_stage); assert.equal(value.rowVersion, row.row_version);
  assert.equal(value.ownerUserId, row.owner_user_id); assert.equal(value.ownerOrgId, null);
  assert.equal(value.sourceQualification, 'legacy-unverified'); assert.deepEqual(value.allowedActions, []);
  assert(typeof value.explanation === 'string' && value.explanation.length > 0);
}
export function assertOneControlledLegacyBirth(ctx, before, after, projectId, readRows) {
  let added;
  for (const database of ctx.databases) {
    assert.deepEqual(before.databases[database].meta, after.databases[database].meta, 'Fixture may not change schema/OIDs/ACL/functions/triggers/sequences');
    assert.deepEqual(before.objects[database], after.objects[database], 'Fixture may not change objects or directories');
    for (const table of Object.keys(before.databases[database].tables)) {
      const old = readRows(before.databases[database].tables[table]); let next = readRows(after.databases[database].tables[table]);
      if (database === ctx.database && table === 'project') {
        assert(!old.some(r => r.key.length === 1 && r.key[0] === projectId), 'New synthetic fixture PK must be absent');
        const matches = next.filter(r => r.key.length === 1 && r.key[0] === projectId); assert.equal(matches.length, 1); added = matches[0]; next = next.filter(r => r !== added);
      }
      const facts = rows => rows.map(r => ({ key: r.key, sha256: r.sha256, xmin: r.xmin }));
      assert.deepEqual(facts(next), facts(old), 'Controlled fixture may INSERT exactly one project; all old rows/other tables/xmin stay unchanged');
    }
  }
  assert(added); const value = JSON.parse(added.raw);
  assert.equal(value.id, projectId); assert.equal(value.owner_user_id, ctx.state.actors.manager.id); assert.equal(value.owner_org_id, null);
  assert.equal(value.customer_id, ctx.state.fixtures.customer.id); assert.equal(value.current_stage, 'assessment'); assert.equal(value.status, 'active');
  assert.equal(value.source_lead_id, null); assert.equal(value.row_version, 1); assert.equal(value.created_by, ctx.state.actors.manager.id);
  assert.equal(value.created_at, value.updated_at); assert.equal(value.updated_by, value.created_by);
  assert.equal(ctx.state.owned[keyOf(ctx.database, 'project', [projectId])], undefined, 'Never reuse a prior owned fixture record');
  return added;
}
export function originalLegacyCandidates(projectRows, modernProjectIds = []) {
  const modern = new Set(modernProjectIds);
  return projectRows.filter(row => row.owner_user_id !== null && row.owner_org_id === null && !modern.has(row.id));
}
