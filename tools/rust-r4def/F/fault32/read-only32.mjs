// Concrete read-only SQL. Decimal columns are converted to text before JSON.
export const snapshotSql = String.raw`
WITH owned_cost AS (
 SELECT t.* FROM poms.project_actual_cost_record t WHERE project_id=ANY($1::uuid[])
), basis_ids AS (
 SELECT id FROM poms.shared_cost_allocation_basis b
 WHERE EXISTS (SELECT 1 FROM poms.cost_governance_evidence e WHERE e.id=b.governance_evidence_id AND e.request_id=ANY($2::text[]))
    OR b.id=ANY($3::uuid[])
    OR EXISTS (SELECT 1 FROM poms.shared_cost_allocation_result r WHERE r.basis_id=b.id AND r.project_id=ANY($1::uuid[]))
    OR EXISTS (SELECT 1 FROM poms.shared_cost_allocation_source_snapshot s JOIN owned_cost c ON c.id=s.cost_record_id WHERE s.basis_id=b.id)
), owned_evidence AS (
 SELECT t.* FROM poms.cost_governance_evidence t
 WHERE t.request_id=ANY($2::text[]) OR t.project_id=ANY($1::uuid[])
    OR t.id IN (SELECT b.governance_evidence_id FROM poms.shared_cost_allocation_basis b WHERE b.id IN (SELECT id FROM basis_ids))
    OR t.id IN (SELECT r.governance_evidence_id FROM poms.shared_cost_allocation_result r WHERE r.basis_id IN (SELECT id FROM basis_ids))
    OR t.id IN (SELECT a.governance_evidence_id FROM poms.cost_stage_attribution_snapshot a JOIN owned_cost c ON c.id=a.cost_record_id)
)
SELECT jsonb_build_object(
 'costs',COALESCE((SELECT jsonb_agg(to_jsonb(t)||jsonb_build_object(
   'amount_excluding_tax',t.amount_excluding_tax::text,'tax_cost_amount',t.tax_cost_amount::text,
   'amount_including_tax',t.amount_including_tax::text,'internal_cost_rate',t.internal_cost_rate::text,
   'labor_amount',t.labor_amount::text,'actual_hours',t.actual_hours::text,'actual_person_days',t.actual_person_days::text) ORDER BY t.id) FROM owned_cost t),'[]'::jsonb),
 'expenses',COALESCE((SELECT jsonb_agg(to_jsonb(t)||jsonb_build_object(
   'amount_excluding_tax',t.amount_excluding_tax::text,'tax_amount',t.tax_amount::text,'amount_including_tax',t.amount_including_tax::text) ORDER BY t.id)
   FROM poms.expense_record t WHERE t.project_id=ANY($1::uuid[])),'[]'::jsonb),
 'stages',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM poms.cost_stage_attribution_snapshot t JOIN owned_cost c ON c.id=t.cost_record_id),'[]'::jsonb),
 'taxes',COALESCE((SELECT jsonb_agg(to_jsonb(t)||jsonb_build_object('tax_impact_amount',t.tax_impact_amount::text,'tax_impact_pending_amount',t.tax_impact_pending_amount::text) ORDER BY t.id)
   FROM poms.accounting_tax_treatment_snapshot t WHERE t.project_id=ANY($1::uuid[])),'[]'::jsonb),
 'bases',COALESCE((SELECT jsonb_agg(to_jsonb(t)||jsonb_build_object(
   'source_amount_excluding_tax',t.source_amount_excluding_tax::text,'source_tax_cost_amount',t.source_tax_cost_amount::text,
   'source_amount_including_tax',t.source_amount_including_tax::text,'measurement_amount',t.measurement_amount::text) ORDER BY t.id)
   FROM poms.shared_cost_allocation_basis t WHERE t.id IN (SELECT id FROM basis_ids)),'[]'::jsonb),
 'sources',COALESCE((SELECT jsonb_agg(to_jsonb(t)||jsonb_build_object('amount_excluding_tax',t.amount_excluding_tax::text,'tax_cost_amount',t.tax_cost_amount::text,'amount_including_tax',t.amount_including_tax::text) ORDER BY t.basis_id,t.cost_record_id)
   FROM poms.shared_cost_allocation_source_snapshot t WHERE t.basis_id IN (SELECT id FROM basis_ids)),'[]'::jsonb),
 'results',COALESCE((SELECT jsonb_agg(to_jsonb(t)||jsonb_build_object('allocated_amount',t.allocated_amount::text,
   'allocation_ratio',t.allocation_ratio::text,'allocation_weight',t.allocation_weight::text,
   'allocated_amount_excluding_tax',t.allocated_amount_excluding_tax::text,'allocated_tax_cost_amount',t.allocated_tax_cost_amount::text,'allocated_amount_including_tax',t.allocated_amount_including_tax::text) ORDER BY t.id)
   FROM poms.shared_cost_allocation_result t WHERE t.basis_id IN (SELECT id FROM basis_ids)),'[]'::jsonb),
 'evidence',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM owned_evidence t),'[]'::jsonb),
 'audit',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM poms.audit_log t WHERE t.request_id=ANY($2::text[])),'[]'::jsonb),
 'security',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM poms.security_event t WHERE t.request_id=ANY($2::text[])),'[]'::jsonb),
 'businessNumbers',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.scope,t.period) FROM poms.business_number_sequence t WHERE t.scope=ANY($5::text[]) AND t.period=ANY($6::text[])),'[]'::jsonb),
 'rates',COALESCE((SELECT jsonb_agg(to_jsonb(t)||jsonb_build_object('rate_value',t.rate_value::text) ORDER BY t.id) FROM poms.internal_cost_rate_version t WHERE t.id=ANY($7::uuid[])),'[]'::jsonb),
 'auth',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',t.id,'user_id',t.user_id,'status',t.status,'row_version',t.row_version,
   'last_seen_at',t.last_seen_at,'last_ip',t.last_ip,'idle_expires_at',t.idle_expires_at,'absolute_expires_at',t.absolute_expires_at,
   'updated_at',t.updated_at,'revoked_at',t.revoked_at,'revoked_reason',t.revoked_reason) ORDER BY t.id)
   FROM poms.auth_session t WHERE t.id=ANY($4::uuid[])),'[]'::jsonb)
) AS snapshot`;

export const ownershipSql = String.raw`
SELECT p.id AS project_id,
  (SELECT count(*) FROM poms.project_actual_cost_record c WHERE c.project_id=p.id) AS cost_count,
  (SELECT count(*) FROM poms.expense_record e WHERE e.project_id=p.id) AS expense_count
FROM poms.project p WHERE p.id=ANY($1::uuid[]) ORDER BY p.id`;

export const sessionSql = String.raw`
SELECT id,user_id,status,row_version,last_seen_at,last_ip,idle_expires_at,absolute_expires_at,updated_at,revoked_at,revoked_reason
FROM poms.auth_session WHERE id=ANY($1::uuid[]) ORDER BY id`;

export const realPayableSql = String.raw`
SELECT p.id,p.project_id,p.contract_id,p.status,p.row_version,p.currency,
 p.amount_excluding_tax::text,p.tax_amount::text,p.amount_including_tax::text,
 COALESCE((SELECT SUM(x.amount_excluding_tax) FROM poms.payment_record x WHERE x.payable_record_id=p.id AND x.status='confirmed'),0.00)::text AS confirmed_payment_amount_excluding_tax_total
FROM poms.payable_record p WHERE p.id=ANY($1::uuid[]) ORDER BY p.id`;

export const sourceOccupancySql = String.raw`
SELECT c.id,c.project_id,c.record_status,c.row_version,
 (SELECT count(*) FROM poms.shared_cost_allocation_source_snapshot s WHERE s.cost_record_id=c.id AND s.is_current) AS current_allocation_owners,
 (SELECT count(*) FROM poms.cost_stage_attribution_snapshot a WHERE a.cost_record_id=c.id AND a.status='active') AS current_attributions,
 (SELECT count(*) FROM poms.project_actual_cost_record n WHERE n.supersedes_record_id=c.id) AS replacement_successors
FROM poms.project_actual_cost_record c WHERE c.project_id=ANY($1::uuid[]) ORDER BY c.id`;

export function snapshotStatement(scope, requestIds) {
  return { text: snapshotSql, values: [scope.projectIds, requestIds, scope.oldBasisId ? [scope.oldBasisId] : [], scope.sessionIds || [scope.sessionId], scope.numberScopes || [], scope.numberPeriods || [], scope.rateIds || []], readonly: true, name: 'fault32-owned-snapshot' };
}
