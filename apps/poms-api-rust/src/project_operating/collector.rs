//! The sole collector/prepare write pipeline, borrowing one outer transaction.
use super::{
    baseline, context, inclusion, preparation, restatement, sources,
    store::{self, Table},
};
use crate::{
    approval_common::CommonSession,
    contract_support::{Actor, Error},
    project_operating_common::model::*,
};
use serde_json::Value;

pub async fn collect_with_session(
    session: &mut CommonSession<'_, '_>,
    plan: &OperatingCollectPlan<'_>,
    lock_mode: CollectLockMode,
    actor: &Actor,
) -> Result<OperatingCollection, Error> {
    let write = matches!(lock_mode, CollectLockMode::WriteLocked);
    if matches!(&plan.input, OperatingCollectInput::Preview(_)) == write {
        return Err(Error::Internal);
    }
    let projects = match &plan.input {
        OperatingCollectInput::Restate(input) => {
            restatement::discover_projects(session, input).await?
        }
        _ => vec![plan.project_id],
    };
    // Re-verification is deliberate: current accounts, membership and duty
    // evidence are read on this same transaction after the full project set.
    plan.access.assert_session(session, actor).await?;
    for project in &projects {
        plan.access.assert_project(*project)?;
    }
    let project = store::project(session.connection, plan.project_id).await?;
    if write {
        sources::lock_full_source_set(session, &projects).await?;
    }
    let mut before_catalogs = std::collections::BTreeMap::new();
    let mut hash_catalog = sources::Catalog::default();
    for project in &projects {
        let source = sources::load(session, *project, false).await?;
        hash_catalog.merge(&source);
        before_catalogs.insert(*project, source);
    }
    let catalog = before_catalogs
        .get(&plan.project_id)
        .ok_or(Error::Internal)?
        .clone();
    let locked = if let OperatingCollectInput::Restate(input) = &plan.input {
        let selected = restatement::command_selected_roots_with_session(session, input).await?;
        let roots = restatement::scope_roots_with_session(
            session,
            plan.project_id,
            input.restates_snapshot_ref.id,
            &selected,
        )
        .await?;
        restatement::affected_states(session, &projects, &roots).await?
    } else {
        restatement::locked_states(session, &projects, false).await?
    };
    if write {
        let rediscovered = match &plan.input {
            OperatingCollectInput::Restate(input) => {
                restatement::discover_projects(session, input).await?
            }
            _ => projects.clone(),
        };
        if rediscovered != projects {
            return Err(store::conflict("operating_restatement_scope_changed"));
        }
        let (input_project, expected_project, expected_head, expected_hash) = match &plan.input {
            OperatingCollectInput::ActivateBaseline(r) => (
                r.project_id,
                r.expected_project_version,
                r.expected_version,
                r.expected_input_hash.as_str(),
            ),
            OperatingCollectInput::CaptureSnapshot(r) => (
                r.project_id,
                r.expected_project_version,
                r.expected_version,
                r.expected_input_hash.as_str(),
            ),
            OperatingCollectInput::ClosePeriod(r) => (
                r.project_id,
                r.expected_project_version,
                r.expected_version,
                r.expected_input_hash.as_str(),
            ),
            OperatingCollectInput::Restate(r) => (
                r.project_id,
                r.expected_project_version,
                r.expected_version,
                r.expected_input_hash.as_str(),
            ),
            OperatingCollectInput::Preview(_) => return Err(Error::Internal),
        };
        if input_project != plan.project_id
            || store::version(&project)? != expected_project
            || locked
                .iter()
                .find(|s| s.project_id == plan.project_id)
                .is_none_or(|s| s.head_row_version != expected_head)
        {
            return Err(store::conflict("operating_preparation_changed"));
        }
        let actual = preparation::input_hash(
            plan.project_id,
            &plan.intent,
            &plan.window,
            &project,
            &hash_catalog,
            &locked,
        )?;
        if actual != expected_hash {
            return Err(store::conflict("operating_input_hash_changed"));
        }
    }
    let prepared = preparation::from_catalog(
        session,
        plan.project_id,
        &plan.intent,
        &plan.window,
        &project,
        &catalog,
        &locked,
        actor,
    )
    .await?;
    if matches!(plan.intent, OperatingPreparationIntent::BaselineActivation) {
        // Baseline is an independent fact chain; no invented receipts/costs,
        // full operating context, snapshot or H evaluation is created here.
        let draft = baseline::derive(session, plan.project_id, &catalog).await?;
        if let OperatingCollectInput::ActivateBaseline(input) = &plan.input {
            let current =
                store::semantic_current_baseline(session.connection, plan.project_id, false)
                    .await?;
            assert_optional_expected(
                current.as_ref(),
                input.expected_current_package_ref.as_ref(),
                Table::Baseline,
            )?;
            sources::assert_expected(
                &serde_json::to_value(&draft.original_cost_ref).map_err(|_| Error::Internal)?,
                &serde_json::to_value(&input.original_adopted_cost_ref)
                    .map_err(|_| Error::Internal)?,
            )?;
            assert_typed_optional(
                &draft.handover_basis_ref,
                input.selected_handover_basis_ref.as_ref(),
            )?;
            assert_typed_optional(
                &draft.handover_rebaseline_ref,
                input.handover_rebaseline_ref.as_ref(),
            )?;
            let actual = draft
                .approved_transitions
                .iter()
                .map(|t| &t.after_cost_ref)
                .collect::<Vec<_>>();
            if actual.len() != input.approved_change_refs.len() {
                return Err(store::conflict("operating_approved_change_chain_changed"));
            }
            for (a, e) in actual.iter().zip(&input.approved_change_refs) {
                sources::assert_expected(
                    &serde_json::to_value(a).map_err(|_| Error::Internal)?,
                    &serde_json::to_value(e).map_err(|_| Error::Internal)?,
                )?;
            }
        }
        return Ok(OperatingCollection {
            context: OperatingCollectionContext::BaselineOnly(Box::new(draft)),
            preparation: prepared.clone(),
            source_rows: prepared.source_rows,
            locked_projects: locked,
            producer_transitions: vec![],
            generated_ids: plan.generated_ids.clone(),
        });
    }
    store::semantic_current_baseline(session.connection, plan.project_id, false).await?;
    let baseline = catalog
        .all(Table::Baseline)
        .iter()
        .find(|b| b["is_current"] == true)
        .ok_or_else(|| store::conflict("operating_baseline_required"))?;
    let decisions: &[CostDecisionInput] = match &plan.input {
        OperatingCollectInput::CaptureSnapshot(input) => {
            sources::assert_expected(
                &sources::reference(Table::Baseline, baseline)?,
                &serde_json::to_value(&input.baseline_package_ref).map_err(|_| Error::Internal)?,
            )?;
            &input.cost_decisions
        }
        OperatingCollectInput::ClosePeriod(input) => {
            sources::assert_expected(
                &sources::reference(Table::Baseline, baseline)?,
                &serde_json::to_value(&input.baseline_package_ref).map_err(|_| Error::Internal)?,
            )?;
            if input.expected_period_snapshot_ref.is_some() {
                return Err(store::conflict("period_snapshot_exists"));
            }
            &input.cost_decisions
        }
        OperatingCollectInput::Restate(input) => &input.cost_decisions,
        OperatingCollectInput::Preview(_) => &[],
        OperatingCollectInput::ActivateBaseline(_) => return Err(Error::Internal),
    };
    if let Some(key) = plan.window.period_key.as_deref()
        && !matches!(plan.intent, OperatingPreparationIntent::Restatement { .. })
    {
        store::assert_period_absent(session.connection, plan.project_id, key, false).await?;
    }
    let mut transitions = vec![];
    if let OperatingCollectInput::Restate(input) = &plan.input {
        restatement::assert_complete_targets(input, &locked)?;
        if write {
            let mut explicit =
                std::collections::BTreeMap::<uuid::Uuid, Vec<CostDecisionInput>>::new();
            explicit
                .entry(plan.project_id)
                .or_default()
                .extend(input.cost_decisions.iter().cloned());
            for target in &input.affected_targets {
                explicit
                    .entry(target.project_id)
                    .or_default()
                    .extend(target.cost_decisions.iter().cloned());
            }
            for (project, items) in &explicit {
                inclusion::validate_pre_effect(
                    *project,
                    items,
                    before_catalogs.get(project).ok_or(Error::Internal)?,
                )?;
            }
            // The opaque scope is Root-minted; neither G nor HTTP can construct
            // or deserialize a permit. The facade invokes actual E/F producers.
            let (locked_source_refs, consumed_context_refs) = correction_scope_refs(&hash_catalog)?;
            let terminal_refs = locked
                .iter()
                .flat_map(|s| s.terminal_root_refs.iter().cloned())
                .collect();
            let scope = crate::project_action_authorization::verify_restatement_scope_with_session(
                session,
                actor,
                Sha256::try_from(input.expected_input_hash.clone())?,
                &plan.access,
                locked.clone(),
                consumed_context_refs,
                locked_source_refs,
                terminal_refs,
            )
            .await?;
            transitions = crate::project_cost_governance::apply_corrections_with_session(
                session, input, &scope, actor,
            )
            .await?;
            for project in &projects {
                let after = sources::load(session, *project, false).await?;
                let before = before_catalogs.get(project).ok_or(Error::Internal)?;
                let items = explicit.get(project).map(Vec::as_slice).unwrap_or(&[]);
                let (mapped, predecessors) = inclusion::transitioned_decisions(
                    *project,
                    items,
                    before,
                    &after,
                    &transitions,
                    &input.restatement_reason,
                )?;
                let mut cutoff = if *project == plan.project_id {
                    Some(plan.window.business_cutoff)
                } else {
                    None
                };
                for target in &input.affected_targets {
                    if target.project_id == *project {
                        let intent = OperatingPreparationIntent::Restatement {
                            scope: if target.period_end_snapshot_ref.is_some() {
                                CreateOperatingRestatementRequestScope::Period
                            } else {
                                CreateOperatingRestatementRequestScope::Live
                            },
                            restates_snapshot: target.restates_snapshot_ref.clone(),
                            period_end_snapshot: target.period_end_snapshot_ref.clone(),
                            correction_source_refs: vec![],
                        };
                        let w = preparation::window_for(session, *project, &intent).await?;
                        cutoff =
                            Some(cutoff.map_or(w.business_cutoff, |c| c.max(w.business_cutoff)));
                    }
                }
                inclusion::apply_with_predecessors(
                    session,
                    *project,
                    &mapped,
                    &after,
                    cutoff.ok_or(Error::Internal)?,
                    true,
                    actor,
                    &predecessors,
                )
                .await?;
            }
        }
    }
    if write && !matches!(plan.intent, OperatingPreparationIntent::Restatement { .. }) {
        inclusion::apply(
            session,
            plan.project_id,
            decisions,
            &catalog,
            plan.window.business_cutoff,
            false,
            actor,
        )
        .await?;
    }
    let final_catalog = if write {
        sources::load(session, plan.project_id, false).await?
    } else {
        catalog
    };
    let (mode, restates, period) = match &plan.intent {
        OperatingPreparationIntent::SnapshotCreate { mode, .. } => (mode.as_str(), None, None),
        OperatingPreparationIntent::PeriodClose { .. } => ("period-end", None, None),
        OperatingPreparationIntent::Restatement {
            restates_snapshot,
            period_end_snapshot,
            ..
        } => {
            let old = final_catalog
                .find(Table::Snapshot, restates_snapshot.id)
                .ok_or_else(|| store::conflict("operating_restatement_source_missing"))?;
            sources::assert_expected(
                &sources::reference(Table::Snapshot, old)?,
                &serde_json::to_value(restates_snapshot).map_err(|_| Error::Internal)?,
            )?;
            if old["status"] != "active" || old["producer_version"] != 1 {
                return Err(store::conflict("operating_restatement_terminal_changed"));
            }
            let p = period_end_snapshot
                .as_ref()
                .map(|p| {
                    final_catalog
                        .find(Table::Period, p.id)
                        .ok_or_else(|| store::conflict("operating_period_root_missing"))
                        .and_then(|r| {
                            sources::assert_expected(
                                &sources::reference(Table::Period, r)?,
                                &serde_json::to_value(p).map_err(|_| Error::Internal)?,
                            )?;
                            sources::reference(Table::Period, r)
                        })
                })
                .transpose()?;
            (
                "restated",
                Some(sources::reference(Table::Snapshot, old)?),
                p,
            )
        }
        _ => {
            return Err(Error::BadRequest(
                "This preparation intent cannot capture an operating snapshot".into(),
            ));
        }
    };
    // Hash/CAS preflight keeps the original request window. Actual producer
    // and classification writes are now complete on the same locked session;
    // the published primary context must include those genuinely new facts.
    let final_window = final_collection_window(
        &plan.window,
        write && matches!(plan.intent, OperatingPreparationIntent::Restatement { .. }),
        crate::auth::model::clock_now(),
    );
    let ctx = context::build(
        session,
        plan.project_id,
        &final_catalog,
        &final_window,
        &plan.generated_ids,
        mode,
        restates,
        period,
        None,
    )
    .await?;
    let rows = context::source_rows(
        session,
        plan.project_id,
        &final_catalog,
        &final_window,
        matches!(plan.intent, OperatingPreparationIntent::Restatement { .. }),
        actor,
    )
    .await?;
    Ok(OperatingCollection {
        context: OperatingCollectionContext::Snapshot(Box::new(ctx)),
        preparation: prepared,
        source_rows: rows,
        locked_projects: locked,
        producer_transitions: transitions,
        generated_ids: plan.generated_ids.clone(),
    })
}

fn final_collection_window(
    original: &OperatingBusinessWindow,
    governed_write: bool,
    completed_at: UtcInstant,
) -> OperatingBusinessWindow {
    let mut finalized = original.clone();
    if governed_write {
        finalized.knowledge_cutoff = completed_at;
    }
    finalized
}

fn correction_scope_refs(
    catalog: &sources::Catalog,
) -> Result<(Vec<SourceRef>, Vec<SourceRef>), Error> {
    // This is a lock proof over all affected projects. It is intentionally
    // separate from members(), whose economic hash excludes prior contexts.
    let mut locked = catalog
        .members()?
        .into_iter()
        .map(|(r, _)| serde_json::from_value::<SourceRef>(r).map_err(|_| Error::Internal))
        .collect::<Result<Vec<_>, _>>()?;
    let contexts = catalog
        .all(Table::Context)
        .iter()
        .map(|row| {
            sources::reference(Table::Context, row).and_then(|value| {
                serde_json::from_value::<SourceRef>(value).map_err(|_| Error::Internal)
            })
        })
        .collect::<Result<Vec<_>, _>>()?;
    locked.extend(contexts.iter().cloned());
    Ok((locked, contexts))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use uuid::Uuid;

    #[test]
    fn correction_lock_proof_covers_all_project_contexts_without_changing_economic_members() {
        let mut catalog = sources::Catalog::default();
        let ids = (1..=4).map(Uuid::from_u128).collect::<Vec<_>>();
        catalog.rows.insert(
            Table::Cost,
            vec![
                json!({"id":ids[0],"project_id":Uuid::from_u128(10),"row_version":1}),
                json!({"id":ids[1],"project_id":Uuid::from_u128(20),"row_version":2}),
            ],
        );
        catalog.rows.insert(
            Table::Context,
            vec![
                json!({"id":ids[2],"project_id":Uuid::from_u128(10),"row_version":1}),
                json!({"id":ids[3],"project_id":Uuid::from_u128(20),"row_version":1}),
            ],
        );
        let before = catalog
            .members()
            .unwrap_or_else(|e| panic!("test catalog: {e:?}"));
        assert_eq!(before.len(), 2);
        let (locked, contexts) =
            correction_scope_refs(&catalog).unwrap_or_else(|e| panic!("test lock set: {e:?}"));
        assert_eq!(contexts.len(), 2);
        assert_eq!(locked.len(), 4);
        for id in ids {
            assert!(locked.iter().any(|r| r.id == id));
        }
        assert_eq!(
            catalog
                .members()
                .unwrap_or_else(|e| panic!("test catalog: {e:?}")),
            before
        );
    }
}

fn assert_optional_expected(
    row: Option<&Value>,
    expected: Option<&ExpectedRef>,
    table: Table,
) -> Result<(), Error> {
    match (row, expected) {
        (None, None) => Ok(()),
        (Some(row), Some(expected)) => sources::assert_expected(
            &sources::reference(table, row)?,
            &serde_json::to_value(expected).map_err(|_| Error::Internal)?,
        ),
        _ => Err(store::conflict("operating_source_changed")),
    }
}
fn assert_typed_optional(
    actual: &Option<SourceRef>,
    expected: Option<&ExpectedRef>,
) -> Result<(), Error> {
    match (actual, expected) {
        (None, None) => Ok(()),
        (Some(actual), Some(expected)) => sources::assert_expected(
            &serde_json::to_value(actual).map_err(|_| Error::Internal)?,
            &serde_json::to_value(expected).map_err(|_| Error::Internal)?,
        ),
        _ => Err(store::conflict("operating_source_changed")),
    }
}

#[cfg(test)]
mod final_knowledge_window_tests {
    use super::*;
    use serde_json::json;
    fn instant(s: &str) -> UtcInstant {
        s.parse().expect("fixed synthetic instant")
    }
    fn window(period: bool) -> OperatingBusinessWindow {
        OperatingBusinessWindow {
            business_cutoff: if period { "2026-10-31" } else { "2026-11-07" }
                .parse()
                .expect("business cutoff"),
            knowledge_cutoff: instant("2026-11-07T12:00:00.000Z"),
            source_window_start: None,
            source_window_end: Some(
                if period { "2026-10-31" } else { "2026-11-07" }
                    .parse()
                    .expect("old window end"),
            ),
            period_key: if period { Some("2026-10".into()) } else { None },
            business_timezone: "Asia/Hong_Kong".into(),
        }
    }
    #[test]
    fn genuinely_later_created_replacement_is_known_in_the_final_primary_context() {
        let original = window(false);
        let created = json!({"created_at":"2026-11-07T12:00:00.050Z"});
        assert!(!sources::known_at(&created, original.knowledge_cutoff));
        let finalized =
            final_collection_window(&original, true, instant("2026-11-07T12:00:00.100Z"));
        assert!(sources::known_at(&created, finalized.knowledge_cutoff));
        assert_eq!(
            original.knowledge_cutoff,
            instant("2026-11-07T12:00:00.000Z")
        );
    }
    #[test]
    fn live_and_period_finalization_preserve_every_business_window_field() {
        for period in [false, true] {
            let original = window(period);
            let finalized =
                final_collection_window(&original, true, instant("2026-11-07T12:00:00.100Z"));
            assert_eq!(finalized.business_cutoff, original.business_cutoff);
            assert_eq!(finalized.source_window_start, original.source_window_start);
            assert_eq!(finalized.source_window_end, original.source_window_end);
            assert_eq!(finalized.period_key, original.period_key);
            assert_eq!(finalized.business_timezone, original.business_timezone);
        }
    }
    #[test]
    fn read_only_or_non_restatement_collection_does_not_advance_its_window() {
        let original = window(false);
        let unchanged =
            final_collection_window(&original, false, instant("2026-11-07T12:00:00.100Z"));
        assert_eq!(unchanged.knowledge_cutoff, original.knowledge_cutoff);
    }
    #[test]
    fn primary_and_fresh_other_terminal_include_the_same_completed_producer_set() {
        let original = window(false);
        let primary = final_collection_window(&original, true, instant("2026-11-07T12:00:00.100Z"));
        let other = OperatingBusinessWindow {
            knowledge_cutoff: instant("2026-11-07T12:00:00.120Z"),
            ..original.clone()
        };
        let rows = [
            json!({"id":"old","created_at":"2026-11-07T11:00:00Z"}),
            json!({"id":"actual-new-producer","created_at":"2026-11-07T12:00:00.050Z"}),
            json!({"id":"genuinely-future","created_at":"2026-11-07T12:00:00.200Z"}),
        ];
        let collected = |w: &OperatingBusinessWindow| {
            rows.iter()
                .filter(|r| sources::known_at(r, w.knowledge_cutoff))
                .map(|r| r["id"].as_str().expect("id"))
                .collect::<Vec<_>>()
        };
        assert_eq!(collected(&primary), vec!["old", "actual-new-producer"]);
        assert_eq!(collected(&primary), collected(&other));
        assert_ne!(collected(&original), collected(&other));
    }
}
