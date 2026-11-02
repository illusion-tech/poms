/* Pure parameterized statement constructors. No database/HTTP/filesystem access,
 * imports, clocks, UUID allocation, self-run, assertions or environment changes.
 * Only Root executes these against its current-run owned fixture IDs. */

export const preparedLabel = 'R4-read-projection-prepared-fact-only-not-command-producer';

const statement = (role, table, sql, params, extra = {}) => ({
  role, table, sql, params, classification: preparedLabel,
  executionOwner: 'Root', actual: null, ...extra,
});

export function patchProject(row) {
  return statement(row.role, 'project',
    'UPDATE poms.project SET status=$2,current_stage=$3,closed_at=$4::timestamptz,closed_reason=$5,customer_id=$6::uuid,customer_name=$7,owner_user_id=$8::uuid,owner_org_id=$9::uuid,created_at=$10::timestamptz,created_by=$11::uuid,updated_by=$12::uuid WHERE id=$1::uuid RETURNING *',
    [row.id,row.status,row.stage,row.closedAt ?? null,row.closedReason ?? null,row.customerId ?? null,row.customerName ?? null,row.ownerUserId ?? null,row.ownerOrgId ?? null,row.createdAt,row.createdBy ?? null,row.updatedBy ?? null],
    { affectedRows: 1, requires: 'Root captured original owned project row; restore exact original row fields after this case group' });
}

export function insertPackage(row) {
  return statement(row.role, 'approval_summary_package_definition',
    'INSERT INTO poms.approval_summary_package_definition (id,approval_scenario_key,summary_package_key,projection_level,export_policy,field_rule_version,status,created_at,updated_at,created_by,updated_by) VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8::timestamptz,$8::timestamptz,$9::uuid,$9::uuid) RETURNING *',
    [row.id,row.scenario,row.packageKey,row.projection,row.exportPolicy ?? 'allow',row.fieldRuleVersion ?? 'd-g2-projection-only',row.status ?? 'active',row.createdAt,row.actorId ?? null]);
}

export function insertSnapshot(row) {
  return statement(row.role, 'approval_summary_snapshot',
    'INSERT INTO poms.approval_summary_snapshot (id,target_type,target_id,approval_scenario_key,summary_package_id,summary_package_key,projection_level,export_policy,business_status_at_snapshot,generated_at,status,supersedes_id,created_at,updated_at,created_by,updated_by) VALUES ($1::uuid,$2,$3::uuid,$4,$5::uuid,$6,$7,$8,$9,$10::timestamptz,$11,$12::uuid,$13::timestamptz,$13::timestamptz,$14::uuid,$14::uuid) RETURNING *',
    [row.id,row.targetType ?? 'project',row.targetId,row.scenario,row.packageId,row.packageKey,row.projection,row.exportPolicy,row.businessStatus ?? 'active',row.generatedAt,row.status ?? 'active',row.supersedesId ?? null,row.createdAt,row.actorId ?? null],
    { uniqueBoundary: 'At most one active row for each target_type,target_id,approval_scenario_key,projection_level' });
}

export function insertContract(row) {
  return statement(row.role, 'contract',
    'INSERT INTO poms.contract (id,project_id,contract_no,status,signed_amount,currency_code,signed_at,created_at,updated_at,created_by,updated_by) VALUES ($1::uuid,$2::uuid,$3,$4,0,\'CNY\',$5::timestamptz,$6::timestamptz,$7::timestamptz,$8::uuid,$9::uuid) RETURNING *',
    [row.id,row.projectId,row.contractNo,row.status,row.signedAt ?? null,row.createdAt,row.updatedAt,row.createdBy ?? null,row.updatedBy ?? null],
    { preferredProducer: 'Use a real contract API receipt in both runtimes where that operation is delivered; otherwise retain this prepared classification' });
}

export function insertTermSnapshot(row) {
  return statement(row.role, 'contract_term_snapshot',
    'INSERT INTO poms.contract_term_snapshot (id,contract_id,effective_at,effective_by,snapshot_status,created_at,created_by,version) VALUES ($1::uuid,$2::uuid,$3::timestamptz,$4::uuid,$5,$3::timestamptz,$4::uuid,1) RETURNING *',
    [row.id,row.contractId,row.createdAt,row.actorId ?? null,row.status ?? 'active'],
    { requires: 'existing contract FK; one active term snapshot per contract; all later-added commercial values are nullable/defaulted' });
}

export function insertHandover(row) {
  return statement(row.role, 'project_handover',
    'INSERT INTO poms.project_handover (id,project_id,contract_summary_snapshot_id,effective_handover_baseline_snapshot_id,summary_snapshot_id,status,confirmed_at,confirmed_by,created_at,updated_at,created_by,updated_by) VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6,$7::timestamptz,$8::uuid,$9::timestamptz,$10::timestamptz,$8::uuid,$8::uuid) RETURNING *',
    [row.id,row.projectId,row.contractSummarySnapshotId,row.termSnapshotId,row.summarySnapshotId,row.status,row.confirmedAt ?? null,row.actorId ?? null,row.createdAt,row.updatedAt],
    { requires: 'project + two approval-summary snapshots + contract-term snapshot FKs; confirmed_at is nullable' });
}

export function insertAcceptance(row) {
  return statement(row.role, 'acceptance_record',
    'INSERT INTO poms.acceptance_record (id,project_id,acceptance_type,acceptance_result,status,scope_summary,evidence_summary,confirmed_at,confirmed_by,created_at,updated_at,created_by,updated_by) VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8::timestamptz,$9::uuid,$10::timestamptz,$10::timestamptz,$9::uuid,$9::uuid) RETURNING *',
    [row.id,row.projectId,row.type,row.result,row.status,row.scope ?? 'D G2 prepared acceptance scope',row.evidence,row.confirmedAt,row.actorId ?? null,row.createdAt],
    { requires: 'confirmed_at NOT NULL; scope_summary and evidence_summary mandatory; project FK' });
}

export function insertCompletion(row) {
  return statement(row.role, 'project_completion_record',
    'INSERT INTO poms.project_completion_record (id,project_id,acceptance_record_id,completion_result,status,completed_at,completed_by,completion_summary,evidence_summary,created_at,updated_at,created_by,updated_by) VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6::timestamptz,$7::uuid,$8,$9,$10::timestamptz,$10::timestamptz,$7::uuid,$7::uuid) RETURNING *',
    [row.id,row.projectId,row.acceptanceId,row.result,row.status ?? 'confirmed',row.completedAt,row.actorId ?? null,row.summary ?? 'D G2 prepared completion summary',row.evidence,row.createdAt],
    { requires: 'completed_at NOT NULL; acceptance_record_id mandatory restrict FK; status other than confirmed is DB-legal legacy compatibility only, not source command output' });
}

export function insertArchive(row) {
  return statement(row.role, 'project_archive_record',
    'INSERT INTO poms.project_archive_record (id,project_id,archive_anchor_stage,archive_anchor_source_type,archive_anchor_source_id,status,archived_at,archived_by,archive_summary,evidence_summary,supersedes_archive_record_id,replacement_reason,created_at,updated_at,created_by,updated_by) VALUES ($1::uuid,$2::uuid,$3,$4,$5::uuid,$6,$7::timestamptz,$8::uuid,$9,$10,$11::uuid,$12,$13::timestamptz,$13::timestamptz,$8::uuid,$8::uuid) RETURNING *',
    [row.id,row.projectId,row.stage,row.sourceType ?? 'project',row.sourceId ?? row.projectId,row.status,row.archivedAt,row.actorId ?? null,row.summary,row.evidence,row.supersedesId ?? null,row.replacementReason ?? null,row.createdAt],
    { uniqueBoundary: 'One recorded archive per project; archived_at NOT NULL; supersedes ID restrict self-FK' });
}

export function patchOwnedUserName(id, displayName) {
  return statement('J-K-live-or-empty-user-name', 'platform_user',
    'UPDATE poms.platform_user SET display_name=$2 WHERE id=$1::uuid RETURNING id,display_name,row_version,updated_at',
    [id,displayName], { classification:'owned-identity-read-projection-compatibility-only', affectedRows:1, requires:'dedicated current-run owned user; capture and restore original display_name' });
}

export function patchComment(id, createdAt, createdBy, isPinned, isKeyConclusion) {
  return statement('J-comment-time-and-missing-user-context', 'business_discussion_comment',
    'UPDATE poms.business_discussion_comment SET created_at=$2::timestamptz,created_by=$3::uuid,is_pinned=$4,is_key_conclusion=$5 WHERE id=$1::uuid RETURNING *',
    [id,createdAt,createdBy,isPinned,isKeyConclusion], { classification:'owned-real-comment-controlled-read-order-fixture-only', affectedRows:1 });
}

export const cleanup = Object.freeze([
  { table:'business_discussion_comment',sql:'DELETE FROM poms.business_discussion_comment WHERE id=ANY($1::uuid[])', params:'owned comment ID array only' },
  { table:'business_discussion_thread',sql:'DELETE FROM poms.business_discussion_thread WHERE id=ANY($1::uuid[])', params:'owned thread ID array only' },
  { table:'project_archive_record',sql:'DELETE FROM poms.project_archive_record WHERE id=ANY($1::uuid[])', params:'owned archive rows; all rows in a self-chain together, or replacing rows before referenced rows' },
  { table:'project_completion_record',sql:'DELETE FROM poms.project_completion_record WHERE id=ANY($1::uuid[])',params:'owned completion IDs; before acceptance' },
  { table:'acceptance_record',sql:'DELETE FROM poms.acceptance_record WHERE id=ANY($1::uuid[])',params:'owned acceptance IDs' },
  { table:'project_handover',sql:'DELETE FROM poms.project_handover WHERE id=ANY($1::uuid[])',params:'owned handover IDs; before both summary and term snapshots' },
  { table:'contract_term_snapshot',sql:'DELETE FROM poms.contract_term_snapshot WHERE id=ANY($1::uuid[])',params:'owned term IDs; ensure no external consumers were introduced' },
  { table:'approval_summary_snapshot',sql:'DELETE FROM poms.approval_summary_snapshot WHERE id=ANY($1::uuid[])',params:'owned snapshots; supersedes FK is SET NULL, handover restrict children already deleted' },
  { table:'approval_summary_package_definition',sql:'DELETE FROM poms.approval_summary_package_definition WHERE id=ANY($1::uuid[])',params:'owned packages; seed packages never deleted' },
  { table:'contract',sql:'DELETE FROM poms.contract WHERE id=ANY($1::uuid[])',params:'owned prepared contracts after all term snapshots' },
  { table:'project',action:'Restore captured original project fields for reused API products. Root whole-run cleanup owns deletion after all other H/I/followup/attachment dependents.' },
]);

export const schemaBoundaries = Object.freeze([
  { requirement:'K-T04 null confirmedAt', disposition:'schema-infeasible', reason:'Migration EX23 confirmed_at NOT NULL; omit illegal vector, retain query guard source evidence' },
  { requirement:'K-T05 null completedAt', disposition:'schema-infeasible', reason:'Migration EX24 completed_at NOT NULL; omit illegal vector' },
  { requirement:'K-T06 null archivedAt or multiple recorded/tied archives', disposition:'schema-infeasible', reason:'EX25 archived_at NOT NULL + EX34A unique recorded project; use one recorded plus newer voided/superseded decoys' },
  { requirement:'K-G05 multiple exact active snapshot candidates/ties', disposition:'schema-infeasible', reason:'EX08A2 active target/scenario/projection unique; use one exact active plus newer selector/status decoys' },
  { requirement:'J-L03 dangling project.sourceLeadId', disposition:'schema-infeasible-under-intact-FK', reason:'project_source_lead_id_foreign restrict; keep skip-branch unit/source evidence without disabling constraints' },
  { requirement:'J-L06 missing contact with stored nonnull relatedContactId', disposition:'ordinary-stable-fixture-infeasible', reason:'FK ON DELETE SET NULL; retain missing-user-name case because created_by has no user FK, and only use coordinated read/delete race for managed-contact timing if separately executed' },
  { requirement:'K-T05 nonconfirmed completion', disposition:'DB-legal-legacy-compatibility-only', reason:'EX24 status varchar NOT NULL has no CHECK, while source command type emits confirmed only; never call prepared voided row a true completion producer' },
]);
