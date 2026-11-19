"""Review-only exact producer refactor patch. Never edits Root-owned files."""
from pathlib import Path
import difflib
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[5]
OUT = Path(__file__).resolve().parent
SOURCE = 'apps/poms-api-rust/src/project_cost_governance/service.rs'
original = (ROOT / SOURCE).read_text(encoding='utf-8')
source_raw_hash=hashlib.sha256((ROOT / SOURCE).read_bytes()).hexdigest()

def once(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError(f'Expected one exact patch anchor: {old[:90]!r}')
    return text.replace(old, new, 1)

modified = original
stage_header = '''pub(super) async fn stage(
    session: &mut CommonSession<'_, '_>,
    op: &str,
    id: Uuid,
    reclassify: bool,
    body: &Value,
    actor: &Actor,
) -> Result<Value, Error> {
'''
modified = once(modified, stage_header, '''pub(super) async fn stage(
    session: &mut CommonSession<'_, '_>, op: &str, id: Uuid,
    reclassify: bool, body: &Value, actor: &Actor,
) -> Result<Value, Error> {
    stage_inner(session, op, id, reclassify, body, actor, None).await
}

pub(crate) async fn stage_with_restatement_permit(
    session: &mut CommonSession<'_, '_>, op: &str, id: Uuid,
    body: &Value, actor: &Actor,
    permit: &crate::project_operating_common::model::StageReclassificationPermit<'_>,
) -> Result<Value, Error> {
    stage_inner(session, op, id, true, body, actor, Some(permit)).await
}

async fn stage_inner(
    session: &mut CommonSession<'_, '_>, op: &str, id: Uuid,
    reclassify: bool, body: &Value, actor: &Actor,
    permit: Option<&crate::project_operating_common::model::StageReclassificationPermit<'_>>,
) -> Result<Value, Error> {
''')
modified = once(modified, '''    if !logic::valid_confirmation_state(
''', '''    if let Some(permit) = permit {
        validate_stage_restatement_permit(session, actor, permit, cost_id, id, project).await?;
    } else if operating_source_consumed(session, cost_id).await? {
        return Err(crate::contract_support::Error::CodedConflict {
            code: "operating_restatement_required", message: "Consumed cost facts require an atomic restatement".into(),
        });
    }
    if !(permit.is_some() && cost["record_status"] == "included" && cost["is_included_in_project_cost"] == true)
        && !logic::valid_confirmation_state(
''')
modified = once(modified, '''        if !old["locked_by_snapshot_id"].is_null() {
''', '''        if !old["locked_by_snapshot_id"].is_null() && permit.is_none() {
''')
modified = once(modified, '''    if store::occupied(session.connection, cost_id).await? {
''', '''    if store::occupied(session.connection, cost_id).await? && permit.is_none() {
''')
modified = once(modified, '''    cost_after["record_status"] = json!("confirmed");
''', '''    if cost["record_status"] != "included" { cost_after["record_status"] = json!("confirmed"); }
''')
old_sql = "UPDATE poms.project_actual_cost_record SET record_status='confirmed',confirmed_at=CASE WHEN record_status='registered' THEN $1 ELSE confirmed_at END,confirmed_by=CASE WHEN record_status='registered' THEN $2 ELSE confirmed_by END,execution_stage_code=$3,stage_derived_from_type='CostStageAttributionSnapshot',stage_derived_from_id=$4,stage_derived_at=$1,stage_locked_at=$1,row_version=row_version+1,updated_at=$1,updated_by=$2 WHERE id=$5 AND project_id=$6 AND row_version=$7 AND record_status IN ('registered','confirmed') AND NOT is_included_in_project_cost"
new_sql = "UPDATE poms.project_actual_cost_record SET record_status=CASE WHEN $8 AND record_status='included' THEN record_status ELSE 'confirmed' END,confirmed_at=CASE WHEN record_status='registered' THEN $1 ELSE confirmed_at END,confirmed_by=CASE WHEN record_status='registered' THEN $2 ELSE confirmed_by END,execution_stage_code=$3,stage_derived_from_type='CostStageAttributionSnapshot',stage_derived_from_id=$4,stage_derived_at=$1,stage_locked_at=$1,row_version=row_version+1,updated_at=$1,updated_by=$2 WHERE id=$5 AND project_id=$6 AND row_version=$7 AND ((record_status IN ('registered','confirmed') AND NOT is_included_in_project_cost) OR ($8 AND record_status='included' AND is_included_in_project_cost))"
modified = once(modified, old_sql, new_sql)
modified = once(modified, '''.bind(handled_at).bind(actor.id).bind(target).bind(attribution_id.to_string()).bind(cost_id).bind(project).bind(store::version(&cost)?).execute''', '''.bind(handled_at).bind(actor.id).bind(target).bind(attribution_id.to_string()).bind(cost_id).bind(project).bind(store::version(&cost)?).bind(permit.is_some()).execute''')

tax_header = '''pub(super) async fn tax(
    session: &mut CommonSession<'_, '_>,
    op: &str,
    id: Uuid,
    replacing: bool,
    body: &Value,
    actor: &Actor,
) -> Result<Value, Error> {
'''
modified = once(modified, tax_header, '''pub(super) async fn tax(
    session: &mut CommonSession<'_, '_>, op: &str, id: Uuid,
    replacing: bool, body: &Value, actor: &Actor,
) -> Result<Value, Error> {
    tax_inner(session, op, id, replacing, body, actor, None).await
}

pub(crate) async fn tax_with_restatement_permit(
    session: &mut CommonSession<'_, '_>, op: &str, id: Uuid,
    body: &Value, actor: &Actor,
    permit: &crate::project_operating_common::model::TaxTreatmentReplacementPermit<'_>,
) -> Result<Value, Error> {
    tax_inner(session, op, id, true, body, actor, Some(permit)).await
}

async fn tax_inner(
    session: &mut CommonSession<'_, '_>, op: &str, id: Uuid,
    replacing: bool, body: &Value, actor: &Actor,
    permit: Option<&crate::project_operating_common::model::TaxTreatmentReplacementPermit<'_>>,
) -> Result<Value, Error> {
''')
tax_start = modified.index('async fn tax_inner(')
tax_before, tax_part = modified[:tax_start], modified[tax_start:]
tax_part = once(tax_part, '''    let currency = evidence::currency(store::text(body, "currency")?)?;
''', '''    if let Some(permit) = permit {
        permit.scope.access.assert_session(session, actor).await?;
        permit.scope.access.assert_project(project)?;
        if permit.tax_treatment_id != id || permit.project_id != project || permit.scope.actor_id != actor.id {
            return Err(Error::Forbidden("Tax correction permit does not match this exact producer".into()));
        }
        validate_locked_reference(session, &permit.scope.locked_source_refs, "AccountingTaxTreatmentSnapshot", id).await?;
    } else if replacing && operating_source_consumed(session, id).await? {
        return Err(crate::contract_support::Error::CodedConflict {
            code: "operating_restatement_required", message: "Consumed tax facts require an atomic restatement".into(),
        });
    }
    let currency = evidence::currency(store::text(body, "currency")?)?;
''')
modified = tax_before + tax_part
modified += '''

async fn operating_source_consumed(session: &mut CommonSession<'_, '_>, id: Uuid) -> Result<bool, Error> {
    Ok(sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.operating_source_member WHERE source_id=$1)")
        .bind(id).fetch_one(&mut *session.connection).await?)
}

async fn validate_locked_reference(session: &mut CommonSession<'_, '_>, locked: &[crate::project_operating_common::model::SourceRef], kind: &str, id: Uuid) -> Result<(), Error> {
    let actual = crate::project_operating::sources::source_reference_with_session(session, kind, id).await?;
    if !locked.iter().any(|r| r.kind == kind && r.id == id && r.row_version == actual.row_version && r.payload_hash == actual.payload_hash) {
        return Err(Error::Conflict("Sealed correction source changed".into()));
    }
    Ok(())
}

async fn validate_stage_restatement_permit(
    session: &mut CommonSession<'_, '_>, actor: &Actor,
    permit: &crate::project_operating_common::model::StageReclassificationPermit<'_>,
    cost_id: Uuid, attribution_id: Uuid, project_id: Uuid,
) -> Result<(), Error> {
    permit.scope.access.assert_session(session, actor).await?;
    permit.scope.access.assert_project(project_id)?;
    if permit.cost_id != cost_id || permit.attribution_id != attribution_id || permit.scope.actor_id != actor.id {
        return Err(Error::Forbidden("Stage correction permit does not match this exact producer".into()));
    }
    validate_locked_reference(session, &permit.scope.locked_source_refs, "ProjectActualCostRecord", cost_id).await?;
    validate_locked_reference(session, &permit.scope.locked_source_refs, "CostStageAttributionSnapshot", attribution_id).await?;
    let mut actual: Vec<Uuid> = sqlx::query_scalar("SELECT DISTINCT basis_id FROM poms.shared_cost_allocation_source_snapshot WHERE cost_record_id=$1 AND is_current ORDER BY basis_id")
        .bind(cost_id).fetch_all(&mut *session.connection).await?;
    let mut authorized = permit.affected_allocation_basis_ids.clone();
    actual.sort(); authorized.sort(); authorized.dedup();
    if actual != authorized { return Err(Error::Conflict("Sealed allocation source set changed".into())); }
    Ok(())
}
'''

(OUT / 'F-stage-tax-sealed01.candidate.rs').write_text(modified, encoding='utf-8', newline='')
subprocess.run(['rustfmt','--edition','2024',str(OUT/'F-stage-tax-sealed01.candidate.rs')],check=True)
modified=(OUT/'F-stage-tax-sealed01.candidate.rs').read_text(encoding='utf-8')
patch = ''.join(difflib.unified_diff(original.splitlines(keepends=True), modified.splitlines(keepends=True), fromfile='a/'+SOURCE, tofile='b/'+SOURCE))
(OUT / 'F-stage-tax-sealed01.patch').write_text(patch, encoding='utf-8', newline='')
(OUT / 'F-stage-tax-sealed01.candidate.rs').write_text(modified, encoding='utf-8', newline='')
(OUT / 'F-stage-tax-sealed01.json').write_text(json.dumps({'kind':'review-only-not-applied','source':SOURCE,'sourceSha256':hashlib.sha256(original.encode()).hexdigest(),'candidateSha256':hashlib.sha256(modified.encode()).hexdigest(),'applied':False,'compiled':False,'realDatabaseValidated':False,'remaining':['Root typed facade constructs exact sealed permits and validates DTO evidence/source refs','Stage-dependent whole allocation batches must be genuinely rebuilt before G collection','E labor and F allocation producer support are separate remaining patches','Normal tax changes to an already-consumed source without consumed tax target must check real reverse source references too']},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'patch':str(OUT/'F-stage-tax-sealed01.patch'),'sourceSha256':hashlib.sha256(original.encode()).hexdigest(),'applied':False}))
