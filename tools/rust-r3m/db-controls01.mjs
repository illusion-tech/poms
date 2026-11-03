// Root-owned, isolated permission faults. Never targets an ambient connection.
import assert from 'node:assert/strict';
const allowed = new Set(['customer','customer_alias','customer_contact','lead','lead_score_snapshot','lead_score_override','lead_owner_assignment_record','project','attachment','attachment_link','audit_log','auth_session','todo_item','sales_follow_up_record','opportunity_stakeholder','competitor_intelligence_record','sales_discovery_record','business_discussion_thread','business_discussion_comment','project_technical_cost_package','project_technical_scope_item','project_technical_risk_item','project_technical_cost_item','project_bid_commercial_process','project_bid_commercial_material_item','project_bid_commercial_timeline_item','project_pricing_margin_review','project_pricing_margin_condition_item']);
export async function withDenied(ctx, table, privilege, fn) {
  assert.equal(ctx.identity.namespace, 'poms-r3m'); assert(allowed.has(table)); assert(['INSERT','UPDATE'].includes(privilege));
  const role = 'poms_r3m_app';
  const check = async () => (await ctx.db.query('select has_table_privilege($1,$2,$3) allowed', [role, 'poms.' + table, privilege])).rows[0].allowed;
  assert.equal(await check(), true, 'Privilege must start granted');
  await ctx.db.query('revoke ' + privilege + ' on poms."' + table + '" from ' + role);
  try { assert.equal(await check(), false); return await fn(); }
  finally { await ctx.db.query('grant ' + privilege + ' on poms."' + table + '" to ' + role); assert.equal(await check(), true, 'Fault privilege must be restored'); }
}
