//! Read-only preparation. Generated preview identities never enter input hashes.
use super::{
    baseline, context, restatement,
    sources::{self, Catalog},
    store::{self, Table},
};
use crate::{
    approval_common::CommonSession,
    auth::model::clock_now,
    contract_support::{Actor, Error, canonical_hash},
    project_operating_common::model::*,
};
use chrono::{Datelike, Days, NaiveDate, Weekday};
use serde_json::{Value, json};
use uuid::Uuid;

pub async fn prepare_with_session(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    intent: &OperatingPreparationIntent,
    actor: &Actor,
) -> Result<OperatingPreparation, Error> {
    let token = OuterTxToken::capture(session).await?;
    let _access = crate::project_action_authorization::verify_access_set(
        session,
        &[project_id],
        actor,
        false,
        &token,
    )
    .await?;
    let project = store::project(session.connection, project_id).await?;
    let catalog = sources::load(session, project_id, false).await?;
    let roots = if let OperatingPreparationIntent::Restatement {
        restates_snapshot,
        correction_source_refs,
        ..
    } = intent
    {
        restatement::scope_roots_with_session(
            session,
            project_id,
            restates_snapshot.id,
            correction_source_refs,
        )
        .await?
    } else {
        vec![]
    };
    let projects = if matches!(intent, OperatingPreparationIntent::Restatement { .. }) {
        restatement::discover_for_roots(session, project_id, &roots).await?
    } else {
        vec![project_id]
    };
    let _all_access = crate::project_action_authorization::verify_access_set(
        session, &projects, actor, false, &token,
    )
    .await?;
    let window = window_for(session, project_id, intent).await?;
    let locked = if matches!(intent, OperatingPreparationIntent::Restatement { .. }) {
        restatement::affected_states(session, &projects, &roots).await?
    } else {
        restatement::locked_states(session, &projects, false).await?
    };
    let mut merged = catalog.clone();
    for other in &projects {
        if *other != project_id {
            merged.merge(&sources::load(session, *other, false).await?);
        }
    }
    let mut prepared = from_catalog(
        session, project_id, intent, &window, &project, &catalog, &locked, actor,
    )
    .await?;
    prepared.expected_input_hash =
        input_hash(project_id, intent, &window, &project, &merged, &locked)?;
    if let OperatingPreparationIntent::Restatement {
        restates_snapshot, ..
    } = intent
    {
        let mut targets = Vec::new();
        for state in &locked {
            for terminal in &state.terminal_root_refs {
                let snapshot =
                    store::row(session.connection, Table::Snapshot, terminal.id, false).await?;
                let period = if let Some(id) = snapshot["period_end_snapshot_id"].as_str() {
                    let row = store::row(
                        session.connection,
                        Table::Period,
                        Uuid::parse_str(id).map_err(|_| Error::Internal)?,
                        false,
                    )
                    .await?;
                    let r = sources::reference(Table::Period, &row)?;
                    Some(ExpectedRef {
                        kind: store::text(&r, "kind")?.into(),
                        id: store::id(&r, "id")?,
                        expected_version: store::version(&row)?,
                        payload_hash: store::text(&r, "payloadHash")?.into(),
                    })
                } else {
                    None
                };
                targets.push(AffectedRestatementTarget {
                    project_id: state.project_id,
                    expected_version: state.head_row_version,
                    restates_snapshot_ref: ExpectedRef {
                        kind: terminal.kind.clone(),
                        id: terminal.id,
                        expected_version: terminal.row_version,
                        payload_hash: terminal.payload_hash.clone(),
                    },
                    period_end_snapshot_ref: period,
                    cost_decisions: vec![],
                });
            }
        }
        if !targets.iter().any(|t| {
            t.project_id == project_id && t.restates_snapshot_ref.id == restates_snapshot.id
        }) {
            prepared.allowed_command_codes.clear();
            prepared
                .blocking_reason_codes
                .push("operating_restatement_has_no_applicable_source_change".into());
        }
        prepared.proposed_affected_targets = targets;
    }
    Ok(prepared)
}

pub async fn prepare_query_with_session(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    query: &Value,
    actor: &Actor,
) -> Result<OperatingAccountingPreparationView, Error> {
    let uuid_query = |key: &str| {
        query[key]
            .as_str()
            .and_then(|s| Uuid::parse_str(s).ok())
            .ok_or_else(|| Error::BadRequest(format!("{key} must be a UUID")))
    };
    let ref_for = |row: &Value, table: Table| -> Result<ExpectedRef, Error> {
        let source = sources::reference(table, row)?;
        Ok(ExpectedRef {
            kind: source["kind"].as_str().ok_or(Error::Internal)?.into(),
            id: store::id(row, "id")?,
            expected_version: store::version(row)?,
            payload_hash: source["payloadHash"]
                .as_str()
                .ok_or(Error::Internal)?
                .into(),
        })
    };
    let intent = match query["intent"].as_str().unwrap_or("snapshot-create") {
        "baseline-activation" => OperatingPreparationIntent::BaselineActivation,
        "snapshot-create" => OperatingPreparationIntent::SnapshotCreate {
            mode: match query["snapshotMode"].as_str().unwrap_or("realtime") {
                "realtime" => CreateProjectOperatingSnapshotRequestSnapshotMode::Realtime,
                "period-end" => CreateProjectOperatingSnapshotRequestSnapshotMode::PeriodEnd,
                _ => return Err(Error::BadRequest("Unknown snapshotMode".into())),
            },
            period_key: query["periodKey"].as_str().map(str::to_owned),
        },
        "period-close" => OperatingPreparationIntent::PeriodClose {
            period_key: query["periodKey"]
                .as_str()
                .ok_or_else(|| Error::BadRequest("periodKey is required".into()))?
                .into(),
        },
        "restatement" => {
            let snapshot = store::row(
                session.connection,
                Table::Snapshot,
                uuid_query("restatesSnapshotId")?,
                false,
            )
            .await?;
            if snapshot["project_id"] != project_id.to_string() {
                return Err(store::conflict("operating_restatement_project_mismatch"));
            }
            let period = if query["periodEndSnapshotId"].is_null() {
                None
            } else {
                let p = store::row(
                    session.connection,
                    Table::Period,
                    uuid_query("periodEndSnapshotId")?,
                    false,
                )
                .await?;
                if p["project_id"] != project_id.to_string() {
                    return Err(store::conflict("operating_restatement_project_mismatch"));
                }
                Some(ref_for(&p, Table::Period)?)
            };
            OperatingPreparationIntent::Restatement {
                scope: if period.is_some() {
                    CreateOperatingRestatementRequestScope::Period
                } else {
                    CreateOperatingRestatementRequestScope::Live
                },
                restates_snapshot: ref_for(&snapshot, Table::Snapshot)?,
                period_end_snapshot: period,
                correction_source_refs: match query["correctionSourceRefs"].as_str() {
                    Some(raw) => serde_json::from_str::<Vec<ExpectedRef>>(raw).map_err(|_| {
                        Error::BadRequest(
                            "correctionSourceRefs must encode exact ExpectedRef[] JSON".into(),
                        )
                    })?,
                    None => vec![],
                },
            }
        }
        "receipt-basis" => {
            let receipt = store::row(
                session.connection,
                Table::Receipt,
                uuid_query("receiptId")?,
                false,
            )
            .await?;
            if receipt["project_id"] != project_id.to_string() {
                return Err(store::conflict("operating_receipt_project_mismatch"));
            }
            OperatingPreparationIntent::ReceiptBasis {
                receipt: ref_for(&receipt, Table::Receipt)?,
            }
        }
        _ => return Err(Error::BadRequest("Unknown preparation intent".into())),
    };
    let preparation = prepare_with_session(session, project_id, &intent, actor).await?;
    serde_json::from_value(json!({"view":"preparation","outputVersion":"server-derived-v1","preparation":preparation,"officialCurrent":null})).map_err(|_|Error::Internal)
}

pub(crate) fn intent_code(intent: &OperatingPreparationIntent) -> &'static str {
    match intent {
        OperatingPreparationIntent::BaselineActivation => "baseline-activation",
        OperatingPreparationIntent::SnapshotCreate { .. } => "snapshot-create",
        OperatingPreparationIntent::PeriodClose { .. } => "period-close",
        OperatingPreparationIntent::Restatement { .. } => "restatement",
        OperatingPreparationIntent::ReceiptBasis { .. } => "receipt-basis",
    }
}

pub(crate) async fn window_for(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    intent: &OperatingPreparationIntent,
) -> Result<OperatingBusinessWindow, Error> {
    let now = clock_now();
    let today = now.with_timezone(&chrono_tz::Asia::Hong_Kong).date_naive();
    let (mut cutoff, mut start, mut end, mut period) = (today, None, Some(today), None);
    match intent {
        OperatingPreparationIntent::SnapshotCreate { mode, period_key } => {
            if mode.as_str() == "period-end" {
                let key = period_key.as_ref().ok_or_else(|| {
                    Error::BadRequest("A period-end snapshot requires periodKey".into())
                })?;
                let (_, last) = period_bounds(key, today)?;
                cutoff = last;
                end = Some(last);
                period = Some(key.clone());
            } else if period_key.is_some() {
                return Err(Error::BadRequest(
                    "Realtime snapshot periodKey must be null".into(),
                ));
            }
        }
        OperatingPreparationIntent::PeriodClose { period_key } => {
            let (_, last) = period_bounds(period_key, today)?;
            cutoff = last;
            end = Some(last);
            period = Some(period_key.clone());
        }
        OperatingPreparationIntent::Restatement {
            restates_snapshot,
            period_end_snapshot,
            scope,
            ..
        } => {
            let snapshot = store::row(
                session.connection,
                Table::Snapshot,
                restates_snapshot.id,
                false,
            )
            .await?;
            if snapshot["project_id"] != project.to_string() || snapshot["producer_version"] != 1 {
                return Err(store::conflict("operating_restatement_source_unverified"));
            }
            sources::assert_expected(
                &sources::reference(Table::Snapshot, &snapshot)?,
                &serde_json::to_value(restates_snapshot).map_err(|_| Error::Internal)?,
            )?;
            let context = store::row(
                session.connection,
                Table::Context,
                store::id(&snapshot, "source_context_id")?,
                false,
            )
            .await?;
            let old = &context["frozen_payload"]["snapshot"];
            cutoff = sources::business_day(&old["sourceWindowEnd"])?;
            start = old["sourceWindowStart"]
                .as_str()
                .map(|_| sources::business_day(&old["sourceWindowStart"]))
                .transpose()?;
            end = Some(cutoff);
            period = old["periodKey"].as_str().map(str::to_owned);
            if (scope.as_str() == "period") != period_end_snapshot.is_some() {
                return Err(Error::BadRequest(
                    "Restatement scope and period anchor do not match".into(),
                ));
            }
            let actual_period = snapshot["period_end_snapshot_id"]
                .as_str()
                .map(|s| Uuid::parse_str(s).map_err(|_| Error::Internal))
                .transpose()?;
            if actual_period != period_end_snapshot.as_ref().map(|r| r.id) {
                return Err(store::conflict("operating_restatement_period_root_changed"));
            }
        }
        _ => {}
    }
    Ok(OperatingBusinessWindow {
        business_cutoff: cutoff,
        knowledge_cutoff: now,
        source_window_start: start,
        source_window_end: end,
        period_key: period,
        business_timezone: "Asia/Hong_Kong".into(),
    })
}

pub(crate) fn period_bounds(key: &str, today: NaiveDate) -> Result<(NaiveDate, NaiveDate), Error> {
    let bad = || Error::BadRequest("Use an actual completed YYYY-MM or ISO YYYY-Www period".into());
    let (start, end) = if key.len() == 7 && key.as_bytes()[4] == b'-' {
        let year = key[..4].parse::<i32>().map_err(|_| bad())?;
        let month = key[5..].parse::<u32>().map_err(|_| bad())?;
        let first = NaiveDate::from_ymd_opt(year, month, 1).ok_or_else(bad)?;
        let next = if month == 12 {
            NaiveDate::from_ymd_opt(year.checked_add(1).ok_or_else(bad)?, 1, 1)
        } else {
            NaiveDate::from_ymd_opt(year, month + 1, 1)
        }
        .ok_or_else(bad)?;
        (first, next.pred_opt().ok_or_else(bad)?)
    } else if key.len() == 8 && &key[4..6] == "-W" {
        let year = key[..4].parse::<i32>().map_err(|_| bad())?;
        let week = key[6..].parse::<u32>().map_err(|_| bad())?;
        let first = NaiveDate::from_isoywd_opt(year, week, Weekday::Mon).ok_or_else(bad)?;
        if first.iso_week().year() != year || first.iso_week().week() != week {
            return Err(bad());
        }
        (first, first.checked_add_days(Days::new(6)).ok_or_else(bad)?)
    } else {
        return Err(bad());
    };
    if end >= today {
        return Err(bad());
    }
    Ok((start, end))
}

#[expect(
    clippy::too_many_arguments,
    reason = "The frozen preparation seam keeps actor, catalog, intent, and business window explicit."
)]
pub(crate) async fn from_catalog(
    session: &mut CommonSession<'_, '_>,
    project_id: Uuid,
    intent: &OperatingPreparationIntent,
    window: &OperatingBusinessWindow,
    project: &Value,
    catalog: &Catalog,
    states: &[OperatingLockedProjectState],
    actor: &Actor,
) -> Result<OperatingPreparation, Error> {
    let mut blocks = Vec::<String>::new();
    let current = if matches!(intent, OperatingPreparationIntent::ReceiptBasis { .. }) {
        None
    } else {
        match store::semantic_current_baseline(session.connection, project_id, false).await {
            Ok(v) => v,
            Err(Error::CodedConflict { code, .. }) => {
                blocks.push(code.into());
                None
            }
            Err(e) => return Err(e),
        }
    };
    // Cash-basis certification consumes its contract terms and documentary
    // currency proof. It does not require an operating budget or handover.
    let draft = if matches!(intent, OperatingPreparationIntent::ReceiptBasis { .. }) {
        None
    } else {
        match baseline::derive(session, project_id, catalog).await {
            Ok(d) => Some(d),
            Err(Error::CodedConflict { code, .. }) => {
                blocks.push(code.into());
                None
            }
            Err(e) => return Err(e),
        }
    };
    if !matches!(
        intent,
        OperatingPreparationIntent::BaselineActivation
            | OperatingPreparationIntent::ReceiptBasis { .. }
    ) && current.is_none()
    {
        blocks.push("operating-baseline-required".into());
    }
    if let Some(key) = window.period_key.as_deref()
        && !matches!(intent, OperatingPreparationIntent::Restatement { .. })
    {
        match store::assert_period_absent(session.connection, project_id, key, false).await {
            Ok(()) => {}
            Err(Error::CodedConflict { code, .. }) => blocks.push(code.into()),
            Err(e) => return Err(e),
        }
    }
    let mut source_rows = context::source_rows(
        session,
        project_id,
        catalog,
        window,
        matches!(intent, OperatingPreparationIntent::Restatement { .. }),
        actor,
    )
    .await?;
    if let OperatingPreparationIntent::ReceiptBasis { receipt } = intent {
        blocks.extend(
            context::receipt_basis_source_members(
                session,
                project_id,
                receipt,
                catalog,
                window,
                &mut source_rows,
                actor,
            )
            .await?,
        );
    }
    if !matches!(
        intent,
        OperatingPreparationIntent::BaselineActivation
            | OperatingPreparationIntent::ReceiptBasis { .. }
    ) {
        for row in &source_rows {
            if matches!(
                row.row_kind.as_str(),
                "direct-cost" | "allocation-share" | "supporting-source" | "receipt"
            ) && row.state.as_str() != "ready"
                && !row
                    .blocking_reason_codes
                    .iter()
                    .any(|c| c == "outside-business-cutoff")
            {
                blocks.extend(row.blocking_reason_codes.iter().cloned());
            }
        }
    }
    if current.is_some()
        && !matches!(
            intent,
            OperatingPreparationIntent::BaselineActivation
                | OperatingPreparationIntent::ReceiptBasis { .. }
        )
    {
        let ids = OperatingGeneratedIds {
            context_id: Some(crate::contract_support::new_uuid()?),
            snapshot_id: Some(crate::contract_support::new_uuid()?),
            ..Default::default()
        };
        let (mode, restates, period) = match intent {
            OperatingPreparationIntent::SnapshotCreate { mode, .. } => (mode.as_str(), None, None),
            OperatingPreparationIntent::PeriodClose { .. } => ("period-end", None, None),
            OperatingPreparationIntent::Restatement {
                restates_snapshot,
                period_end_snapshot,
                ..
            } => (
                "restated",
                catalog
                    .find(Table::Snapshot, restates_snapshot.id)
                    .map(|r| sources::reference(Table::Snapshot, r))
                    .transpose()?,
                period_end_snapshot
                    .as_ref()
                    .and_then(|p| catalog.find(Table::Period, p.id))
                    .map(|r| sources::reference(Table::Period, r))
                    .transpose()?,
            ),
            _ => return Err(Error::Internal),
        };
        match context::build(
            session, project_id, catalog, window, &ids, mode, restates, period, None,
        )
        .await
        {
            Ok(context) => blocks.extend(context.formal_eligibility.blocking_reason_codes),
            Err(Error::CodedConflict { code, .. }) => blocks.push(code.into()),
            Err(Error::Conflict(_) | Error::NotFound(_)) => {
                blocks.push("operating-source-changed-or-unverified".into())
            }
            Err(error) => return Err(error),
        }
    }
    blocks.sort();
    blocks.dedup();
    let hash = input_hash(project_id, intent, window, project, catalog, states)?;
    let head = catalog.all(Table::Head).first();
    serde_json::from_value(json!({"outputVersion":"server-derived-v1","kind":"preparation-only","officialSnapshotRef":head.and_then(|h|catalog.by(Table::Snapshot,"id",&h["current_snapshot_id"])).map(|s|sources::reference(Table::Snapshot,s)).transpose()?,"intent":intent_code(intent),"projectId":project_id,"headVersion":head.and_then(|h|h["row_version"].as_i64()).unwrap_or(0),"projectVersion":store::version(project)?,"expectedInputHash":hash,"preparedAt":window.knowledge_cutoff,"businessCutoff":window.business_cutoff,"periodKey":window.period_key,"formalEligibility":{"status":if blocks.is_empty(){"eligible"}else{"missing-evidence"},"blockingReasonCodes":blocks,"missingEvidenceRefs":[]},"evaluationStatus":"not-evaluated","sourceRows":source_rows,"proposedOriginalCostRef":draft.map(|d|d.original_cost_ref),"selectedBaselinePackageRef":current.as_ref().map(|b|sources::reference(Table::Baseline,b)).transpose()?,"allowedCommandCodes":if blocks.is_empty(){vec![intent_code(intent)]}else{vec![]},"blockingReasonCodes":blocks,"proposedAffectedTargets":[]})).map_err(|_|Error::Internal)
}

pub(crate) fn input_hash(
    project_id: Uuid,
    intent: &OperatingPreparationIntent,
    window: &OperatingBusinessWindow,
    project: &Value,
    catalog: &Catalog,
    states: &[OperatingLockedProjectState],
) -> Result<String, Error> {
    let head = catalog.all(Table::Head).first();
    let mut source_rows = Vec::new();
    for (reference, _) in catalog.members()? {
        let decision = catalog.all(Table::DecisionHead).iter().find(|h| {
            catalog
                .by(Table::Decision, "id", &h["decision_id"])
                .is_some_and(|d| {
                    d["cost_record_id"] == reference["id"]
                        || d["allocation_result_id"] == reference["id"]
                })
        });
        source_rows.push(json!({"sourceKind":reference["kind"],"id":reference["id"],"rowVersion":reference["rowVersion"],"payloadHash":reference["payloadHash"],"currentClassificationHeadRef":decision.map(|h|json!({"decisionId":h["decision_id"],"rowVersion":h["row_version"]}))}));
    }
    let mut affected=states.iter().map(|s|json!({"projectId":s.project_id,"projectRowVersion":s.project_row_version,"headRowVersion":s.head_row_version,"baselinePackageId":s.baseline_package_ref.as_ref().map(|r|r.id),"currentSnapshotId":s.current_snapshot_ref.as_ref().map(|r|r.id),"terminalRootRefs":s.terminal_root_refs})).collect::<Vec<_>>();
    affected.sort_by_key(|v| v["projectId"].to_string());
    let (mode, restates, period) = match intent {
        OperatingPreparationIntent::SnapshotCreate { mode, .. } => (mode.as_str(), None, None),
        OperatingPreparationIntent::PeriodClose { .. } => ("period-end", None, None),
        OperatingPreparationIntent::Restatement {
            restates_snapshot,
            period_end_snapshot,
            ..
        } => (
            "restated",
            Some(restates_snapshot),
            period_end_snapshot.as_ref(),
        ),
        _ => ("baseline", None, None),
    };
    let mut input = json!({"schemaVersion":1,"projectId":project_id,"intent":intent_code(intent),"projectRowVersion":store::version(project)?,"head":{"rowVersion":head.and_then(|h|h["row_version"].as_i64()).unwrap_or(0),"baselinePackageId":head.map(|h|h["baseline_package_id"].clone()),"currentSnapshotId":head.map(|h|h["current_snapshot_id"].clone())},"businessScope":{"mode":mode,"periodKey":window.period_key,"businessCutoff":window.business_cutoff,"restatesSnapshotRef":restates,"periodEndSnapshotRef":period},"sourceRows":source_rows,"affectedProjects":affected});
    if let OperatingPreparationIntent::Restatement {
        correction_source_refs,
        ..
    } = intent
    {
        let mut refs = correction_source_refs.clone();
        refs.sort_by_key(|r| (r.kind.clone(), r.id));
        input["businessScope"]["correctionSourceRefs"] = json!(refs);
    }
    canonical_hash(&input)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn impossible_iso_week_rejected() {
        assert!(period_bounds("2021-W53", NaiveDate::from_ymd_opt(2026, 11, 6).unwrap()).is_err());
    }
    #[test]
    fn completed_month_is_cumulative_cutoff() {
        let (a, b) =
            period_bounds("2026-10", NaiveDate::from_ymd_opt(2026, 11, 6).unwrap()).unwrap();
        assert_eq!(a.to_string(), "2026-10-01");
        assert_eq!(b.to_string(), "2026-10-31");
    }
    #[test]
    fn unfinished_period_rejected() {
        assert!(period_bounds("2026-11", NaiveDate::from_ymd_opt(2026, 11, 6).unwrap()).is_err());
    }
}
