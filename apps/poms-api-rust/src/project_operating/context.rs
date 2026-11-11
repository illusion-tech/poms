//! Collector-owned immutable business facts. No signal/maturity policy lives here.
use super::{
    facts, inclusion,
    late_allocation::{self, Qualification, Timing},
    projection,
    sources::{self, Catalog},
    store::{self, Table},
};
use crate::{
    approval_common::CommonSession,
    contract_support::{Actor, Error, canonical_hash},
    project_operating_common::{
        hash,
        model::{
            ExpectedRef, OperatingBusinessWindow, OperatingGeneratedIds, OperatingMoneyCents,
            OperatingSourceContext, OperatingSourceRow, SourceRef,
        },
    },
};
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet};
use uuid::Uuid;

fn current_cost(row: &Value) -> bool {
    !matches!(row["record_status"].as_str(), Some("voided" | "replaced"))
}
fn labor(row: &Value) -> &'static str {
    if row["cost_type"] == "labor" {
        "yes"
    } else if matches!(
        row["cost_type"].as_str(),
        Some("payment-fact" | "procurement" | "invoice" | "expense")
    ) {
        "no"
    } else {
        "unknown"
    }
}
// A linked foreign fiscal row is an internal source parent for an actual
// shared allocation. It is not a new unmapped fiscal fact of this project.
fn locally_registered_upstream(row: &Value, project: Uuid) -> bool {
    row["project_id"] == project.to_string()
}
fn classification(row: &Value) -> Value {
    json!({"decisionId":row["id"],"rowVersion":row["row_version"],"decision":row["decision"],"reasonCode":row["reason_code"],"reasonText":row["reason_text"],"decidedBy":row["decided_by"],"decidedAt":row["decided_at"],"evidenceHash":row["payload_hash"]})
}

pub(crate) async fn source_rows(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    catalog: &Catalog,
    window: &OperatingBusinessWindow,
    timing: Timing,
    actor: &Actor,
) -> Result<Vec<OperatingSourceRow>, Error> {
    let mut out: Vec<OperatingSourceRow> = Vec::new();
    for table in [
        Table::Estimate,
        Table::HandoverBasis,
        Table::Rebaseline,
        Table::Contract,
        Table::Receipt,
        Table::Cost,
        Table::Stage,
        Table::ProjectStage,
        Table::Attachment,
        Table::Evidence,
        Table::AllocationResult,
        Table::Tax,
    ] {
        for row in catalog.all(table) {
            if table == Table::Attachment
                && !catalog.all(Table::AttachmentLink).iter().any(|link| {
                    link["attachment_id"] == row["id"]
                        && link["status"] == "active"
                        && ((link["target_type"] == "project"
                            && link["target_id"] == project.to_string())
                            || (link["target_type"] == "contract"
                                && catalog
                                    .all(Table::Contract)
                                    .iter()
                                    .any(|c| c["id"] == link["target_id"])))
                })
            {
                continue;
            }
            if row
                .get("project_id")
                .is_some_and(|id| id != &json!(project))
            {
                continue;
            }
            if (table == Table::Cost && !current_cost(row))
                || (table == Table::AllocationResult
                    && !matches!(row["status"].as_str(), Some("active" | "pending")))
            {
                continue;
            }
            let reference = sources::reference(table, row)?;
            let key = if matches!(table, Table::Cost | Table::AllocationResult) {
                Some(inclusion::unit_key(table, row)?)
            } else {
                None
            };
            let decision = key
                .as_deref()
                .and_then(|key| inclusion::current_decision(catalog, project, key));
            let row_labor = if table == Table::Cost {
                labor(row)
            } else if matches!(table, Table::Estimate | Table::Attachment) {
                "unknown"
            } else if table == Table::AllocationResult {
                allocation_labor(catalog, row)
            } else if table == Table::Tax {
                tax_labor(catalog, row)
            } else {
                "no"
            };
            let (kind, amounts, business, state, roles) = match table {
                Table::Estimate => (
                    "baseline",
                    facts::triple(
                        row,
                        [
                            "total_estimated_amount_excluding_tax",
                            "total_tax_cost_amount",
                            "total_estimated_amount_including_tax",
                        ],
                        row["currency_code"].as_str(),
                        reference.clone(),
                    )?,
                    Some(sources::business_day(&row["effective_at"])?),
                    if estimate_adopted(catalog, row) {
                        "ready"
                    } else {
                        "pending"
                    },
                    vec![],
                ),
                Table::Attachment => (
                    "stage-evidence",
                    facts::empty_triple(None, false)?,
                    None,
                    if row["status"] == "active"
                        && row["deleted_at"].is_null()
                        && row["checksum_sha256"]
                            .as_str()
                            .is_some_and(|s| s.len() == 64)
                    {
                        "ready"
                    } else {
                        "legacy-unverified"
                    },
                    vec![],
                ),
                Table::ProjectStage => (
                    "stage-evidence",
                    facts::empty_triple(None, false)?,
                    Some(sources::business_day(&row["entered_at"])?),
                    if row["producer_version"] == 1
                        && row["source_payload_hash"] == canonical_hash(&row["source_payload"])?
                    {
                        "ready"
                    } else {
                        "legacy-unverified"
                    },
                    vec![],
                ),
                Table::Stage => (
                    "stage-evidence",
                    facts::empty_triple(None, false)?,
                    row["evidence_business_date"]
                        .as_str()
                        .map(|_| sources::business_day(&row["evidence_business_date"]))
                        .transpose()?,
                    if row["status"] == "active" && row["governance_schema_version"] == 1 {
                        "ready"
                    } else {
                        "pending"
                    },
                    vec![],
                ),
                Table::Evidence => (
                    "stage-evidence",
                    facts::empty_triple(None, false)?,
                    Some(sources::business_day(&row["business_date"])?),
                    if row["schema_version"] == 1 {
                        "ready"
                    } else {
                        "legacy-unverified"
                    },
                    vec![],
                ),
                Table::HandoverBasis => (
                    "stage-evidence",
                    facts::empty_triple(None, false)?,
                    Some(sources::business_day(&row["generated_at"])?),
                    if row["is_current"] == true && row["status"] == "active" {
                        "ready"
                    } else {
                        "pending"
                    },
                    vec![],
                ),
                Table::Rebaseline => (
                    "baseline",
                    facts::empty_triple(None, false)?,
                    Some(sources::business_day(&row["handled_at"])?),
                    if matches!(row["status"].as_str(), Some("effective" | "superseded")) {
                        "ready"
                    } else {
                        "pending"
                    },
                    vec![],
                ),
                Table::Contract => {
                    let selected = select_term(catalog, row, window)?;
                    let amounts = match selected {
                        Some(t) => {
                            let mut value = t.clone();
                            value["derived_tax"] = facts::difference(
                                &facts::source_amount(
                                    t,
                                    "amount_tax_inclusive",
                                    reference.clone(),
                                )?,
                                &facts::source_amount(
                                    t,
                                    "amount_tax_exclusive",
                                    reference.clone(),
                                )?,
                                "contractTax",
                            )?["value"]
                                .clone();
                            facts::triple(
                                &value,
                                [
                                    "amount_tax_exclusive",
                                    "derived_tax",
                                    "amount_tax_inclusive",
                                ],
                                t["currency_code"].as_str().or_else(|| {
                                    catalog
                                        .by(Table::Preparation, "id", &t["source_preparation_id"])
                                        .and_then(|p| p["currency_code"].as_str())
                                }),
                                reference.clone(),
                            )?
                        }
                        None => facts::empty_triple(None, false)?,
                    };
                    (
                        "contract",
                        amounts,
                        row["signed_at"]
                            .as_str()
                            .map(|_| sources::business_day(&row["signed_at"]))
                            .transpose()?,
                        if selected.is_some_and(|t| term_proven(catalog, t)) {
                            "ready"
                        } else {
                            "legacy-unverified"
                        },
                        vec![],
                    )
                }
                Table::Receipt => {
                    let basis = catalog.by(Table::ReceiptBasis, "receipt_id", &row["id"]);
                    let amounts = match basis {
                        Some(b) => facts::triple(
                            b,
                            ["amount_excluding_tax", "tax_amount", "cash_gross"],
                            b["currency"].as_str(),
                            sources::reference(Table::ReceiptBasis, b)?,
                        )?,
                        None => {
                            json!({"currency":null,"net":facts::unknown("receipt-accounting-basis-missing"),"tax":facts::unknown("receipt-accounting-basis-missing"),"gross":facts::source_amount(row,"receipt_amount",reference.clone())?})
                        }
                    };
                    (
                        "receipt",
                        amounts,
                        Some(sources::business_day(&row["receipt_date"])?),
                        if row["status"] == "confirmed" && basis.is_some() {
                            "ready"
                        } else {
                            "pending"
                        },
                        vec![],
                    )
                }
                Table::Cost => (
                    "direct-cost",
                    facts::triple(
                        row,
                        [
                            "amount_excluding_tax",
                            "tax_cost_amount",
                            "amount_including_tax",
                        ],
                        row["currency"].as_str(),
                        reference.clone(),
                    )?,
                    Some(sources::business_day(&row["occurred_on"])?),
                    if decision.is_none() {
                        "unclassified"
                    } else if inclusion::stage(catalog, row).is_none() {
                        "pending"
                    } else {
                        "ready"
                    },
                    vec!["direct-source", "tax-support", "evidence-only"],
                ),
                Table::AllocationResult => (
                    "allocation-share",
                    facts::triple(
                        row,
                        [
                            "allocated_amount_excluding_tax",
                            "allocated_tax_cost_amount",
                            "allocated_amount_including_tax",
                        ],
                        row["currency"].as_str(),
                        reference.clone(),
                    )?,
                    row["effective_at"]
                        .as_str()
                        .map(|_| sources::business_day(&row["effective_at"]))
                        .transpose()?,
                    if decision.is_none() {
                        "unclassified"
                    } else if row["status"] == "active" && row["governance_schema_version"] == 1 {
                        "ready"
                    } else {
                        "pending"
                    },
                    vec!["allocation-share"],
                ),
                Table::Tax => (
                    "tax-treatment",
                    facts::empty_triple(row["currency"].as_str(), false)?,
                    row["confirmed_at"]
                        .as_str()
                        .map(|_| sources::business_day(&row["confirmed_at"]))
                        .transpose()?,
                    if row["governance_schema_version"] == 1 {
                        "ready"
                    } else {
                        "legacy-unverified"
                    },
                    vec![],
                ),
                _ => return Err(Error::Internal),
            };
            let mut blockers = Vec::new();
            let classification_changed = matches!(table, Table::Cost | Table::AllocationResult)
                && decision.is_some_and(|d| d["source_row_version"] != row["row_version"]);
            let late_qualification = if table == Table::AllocationResult
                && business.is_some_and(|day| day > window.business_cutoff)
                && let Timing::FirstPeriod(knowledge) = timing
            {
                Some(late_allocation::qualify(
                    catalog,
                    row,
                    window.business_cutoff,
                    knowledge,
                ))
            } else {
                None
            };
            let restatement_window =
                allocation_window_for_timing(catalog, table, row, window, timing);
            let state = if matches!(&late_qualification, Some(Err(_)))
                || matches!(&restatement_window, Some(Err(_)))
            {
                "legacy-unverified"
            } else if classification_changed {
                "unclassified"
            } else {
                state
            };
            if classification_changed {
                blockers.push("classification-source-changed");
            }
            if state != "ready" {
                blockers.push(match state {
                    "unclassified" => "cost-classification-required",
                    "legacy-unverified" => "source-basis-unverified",
                    _ => "source-not-ready",
                });
            }
            if let Some(qualification) = &restatement_window {
                if let Some(reason) = restatement_window_reason(
                    qualification,
                    business.is_some_and(|day| day > window.business_cutoff),
                ) {
                    blockers.push(reason);
                }
            } else if business.is_some_and(|day| day > window.business_cutoff) {
                match late_qualification {
                    Some(Ok(Qualification::Eligible(_))) => {} // eligibility, not a blocker
                    Some(Err(_)) => {} // the hard source-basis-unverified above remains
                    _ => blockers.push("outside-business-cutoff"),
                }
            }
            let fp = projection::source(
                session,
                actor,
                project,
                store::id(row, "id")?,
                row_labor,
                &amounts,
                None,
                None,
            )
            .await?;
            let members = if table == Table::AllocationResult {
                allocation_member_refs(catalog, row)?
            } else {
                vec![]
            };
            let value = json!({"rowKind":kind,"sourceRef":reference,"sourceMembers":members,"state":state,"blockingReasonCodes":blockers,"currentDecisionRef":decision.map(|d|sources::reference(Table::Decision,d)).transpose()?,"canonicalAccumulationKey":if table==Table::Cost{Some(inclusion::canonical_key(row)?)}else if table==Table::AllocationResult{Some(allocation_key(catalog,row)?)}else{None},"sourceChainKey":if table==Table::Cost{Some(inclusion::chain_key(row)?)}else{None},"containsLabor":row_labor,"allowedRecognitionRoles":roles,"primaryCostRef":decision.and_then(|d|catalog.by(Table::Cost,"id",&d["primary_cost_id"])).map(|c|sources::reference(Table::Cost,c)).transpose()?,"sourceBusinessDate":business,"sourceEffectiveBusinessDate":business,"financialProjection":fp});
            out.push(serde_json::from_value(value).map_err(|_| Error::Internal)?);
        }
    }
    // Registered upstream economic facts without an E mapping remain visible.
    // They cannot be classified into an invented cost row by G.
    for table in [
        Table::Payable,
        Table::Payment,
        Table::Invoice,
        Table::Expense,
    ] {
        for row in catalog.all(table) {
            if !locally_registered_upstream(row, project) {
                continue;
            }
            if matches!(row["status"].as_str(), Some("voided" | "draft")) {
                continue;
            }
            if catalog.all(Table::Cost).iter().any(|c| {
                current_cost(c)
                    && c["source_type"] == sources::source_type(table)
                    && c["source_id"] == row["id"]
            }) {
                continue;
            }
            let amounts = if table == Table::Invoice {
                json!({"currency":row["currency"],"net":facts::unknown("invoice-net-layer-missing"),"tax":facts::unknown("invoice-tax-layer-missing"),"gross":facts::source_amount(row,"invoice_amount",sources::reference(table,row)?)?})
            } else {
                facts::triple(
                    row,
                    ["amount_excluding_tax", "tax_amount", "amount_including_tax"],
                    row["currency"].as_str(),
                    sources::reference(table, row)?,
                )?
            };
            let fp = projection::source(
                session,
                actor,
                project,
                store::id(row, "id")?,
                "no",
                &amounts,
                None,
                None,
            )
            .await?;
            let business = source_day(table, row)?;
            let mut reason_codes = vec!["actual-cost-mapping-required"];
            if business > window.business_cutoff {
                reason_codes.push("outside-business-cutoff");
            }
            out.push(serde_json::from_value(json!({"rowKind":"supporting-source","sourceRef":sources::reference(table,row)?,"sourceMembers":[],"state":"pending","blockingReasonCodes":reason_codes,"currentDecisionRef":null,"canonicalAccumulationKey":null,"sourceChainKey":null,"containsLabor":"no","allowedRecognitionRoles":[],"primaryCostRef":null,"sourceBusinessDate":business,"sourceEffectiveBusinessDate":business,"financialProjection":fp})).map_err(|_|Error::Internal)?);
        }
    }
    if out.len() > 1000 {
        return Err(Error::Unprocessable(
            "Operating source scope exceeds the frozen collection capacity".into(),
        ));
    }
    out.sort_by_key(|row| (row.source_ref.kind.clone(), row.source_ref.id));
    Ok(out)
}

/// Receipt preparation exposes exact producer references, never a browser-made
/// hash. Each term row keeps its own currency-basis relation addressable.
pub(crate) async fn receipt_basis_source_members(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    expected_receipt: &ExpectedRef,
    catalog: &Catalog,
    window: &OperatingBusinessWindow,
    rows: &mut Vec<OperatingSourceRow>,
    actor: &Actor,
) -> Result<Vec<String>, Error> {
    let receipt = catalog
        .find(Table::Receipt, expected_receipt.id)
        .ok_or_else(|| store::conflict("operating_receipt_source_missing"))?;
    sources::assert_expected(
        &sources::reference(Table::Receipt, receipt)?,
        &serde_json::to_value(expected_receipt).map_err(|_| Error::Internal)?,
    )?;
    if receipt["project_id"] != project.to_string()
        || !matches!(
            receipt["status"].as_str(),
            Some("pending-confirmation" | "confirmed")
        )
    {
        return Err(store::conflict(
            "operating_receipt_project_or_status_changed",
        ));
    }
    let contract = catalog
        .by(Table::Contract, "id", &receipt["contract_id"])
        .filter(|contract| contract["project_id"] == project.to_string())
        .ok_or_else(|| store::conflict("operating_receipt_contract_changed"))?;
    let mut members = Vec::new();
    let mut viable_terms = 0;
    for (term, commercial) in receipt_basis_terms(catalog, project, contract, window) {
        let term_ref = sources::reference(Table::Term, term)?;
        let currency_refs = commercial
            .map(|basis| sources::reference(Table::Commercial, basis))
            .transpose()?
            .into_iter()
            .collect::<Vec<_>>();
        let currency = term["currency_code"]
            .as_str()
            .or_else(|| commercial.and_then(|basis| basis["currency_code"].as_str()));
        let currency_known = currency.is_some_and(|code| {
            code.len() == 3 && code.bytes().all(|value| value.is_ascii_uppercase())
        });
        let tax_known = term["tax_rate"]
            .as_str()
            .is_some_and(|rate| crate::contract_support::ratio(rate).is_ok());
        let ready = currency_known && tax_known;
        viable_terms += usize::from(ready);
        let mut reasons = Vec::new();
        if !currency_known {
            reasons.push("receipt-currency-evidence-required");
        }
        if !tax_known {
            reasons.push("receipt-term-tax-evidence-required");
        }
        let amounts = facts::empty_triple(currency, false)?;
        let financial = projection::source(
            session,
            actor,
            project,
            store::id(term, "id")?,
            "no",
            &amounts,
            None,
            None,
        )
        .await?;
        rows.push(
            serde_json::from_value(json!({
                "rowKind":"stage-evidence", "sourceRef":term_ref,
                "sourceMembers":currency_refs, "state":if ready {"ready"} else {"pending"},
                "blockingReasonCodes":reasons, "currentDecisionRef":null,
                "canonicalAccumulationKey":null, "sourceChainKey":null,
                "containsLabor":"no", "allowedRecognitionRoles":[], "primaryCostRef":null,
                "sourceBusinessDate":sources::business_day(&term["effective_at"])?,
                "sourceEffectiveBusinessDate":sources::business_day(&term["effective_at"])?,
                "financialProjection":financial
            }))
            .map_err(|_| Error::Internal)?,
        );
        members.push(term_ref);
        members.extend(currency_refs);
    }
    members.sort_by_key(|reference| (reference["kind"].to_string(), reference["id"].to_string()));
    members.dedup();
    let mut receipt_members = vec![sources::reference(Table::Contract, contract)?];
    receipt_members.extend(members.iter().cloned());
    for row in rows.iter_mut() {
        let selected = if row.source_ref.kind == "Contract"
            && row.source_ref.id == store::id(contract, "id")?
        {
            Some(&members)
        } else if row.source_ref.kind == "ReceiptRecord" && row.source_ref.id == expected_receipt.id
        {
            Some(&receipt_members)
        } else {
            None
        };
        if let Some(selected) = selected {
            row.source_members =
                serde_json::from_value(json!(selected)).map_err(|_| Error::Internal)?;
        }
    }
    if rows.len() > 1000 {
        return Err(Error::Unprocessable(
            "Operating source scope exceeds the frozen collection capacity".into(),
        ));
    }
    rows.sort_by_key(|row| (row.source_ref.kind.clone(), row.source_ref.id));
    Ok(if viable_terms == 0 {
        vec!["receipt-activated-tax-currency-basis-required".into()]
    } else {
        vec![]
    })
}

fn receipt_basis_terms<'a>(
    catalog: &'a Catalog,
    project: Uuid,
    contract: &Value,
    window: &OperatingBusinessWindow,
) -> Vec<(&'a Value, Option<&'a Value>)> {
    catalog
        .all(Table::Term)
        .iter()
        .filter_map(|term| {
            if term["contract_id"] != contract["id"]
                || !matches!(
                    term["snapshot_status"].as_str(),
                    Some("active" | "superseded")
                )
                || !sources::known_at(term, window.knowledge_cutoff)
                || sources::business_day(&term["effective_at"]).is_err()
                || !term_proven(catalog, term)
            {
                return None;
            }
            let preparation =
                catalog.by(Table::Preparation, "id", &term["source_preparation_id"])?;
            if preparation["contract_id"] != contract["id"]
                || preparation["source_baseline_id"] != term["source_baseline_id"]
                || preparation["source_readiness_id"] != term["source_readiness_id"]
                || !catalog.all(Table::ReviewBinding).iter().any(|binding| {
                    binding["preparation_id"] == preparation["id"]
                        && binding["contract_id"] == contract["id"]
                        && binding["payload_hash"] == term["payload_hash"]
                        && binding["contract_amendment_id"] == term["source_amendment_id"]
                        && catalog
                            .by(Table::Approval, "id", &binding["approval_record_id"])
                            .is_some_and(|approval| {
                                approval["current_status"] == "approved"
                                    && approval["approval_type"] == "contract-review"
                                    && approval["target_object_id"] == contract["id"]
                            })
                })
            {
                return None;
            }
            let commercial = catalog
                .by(Table::Commercial, "id", &term["source_baseline_id"])
                .filter(|basis| {
                    basis["project_id"] == project.to_string()
                        && matches!(
                            basis["baseline_status"].as_str(),
                            Some("effective" | "superseded")
                        )
                        && store::version(basis).is_ok()
                        && basis["currency_code"].as_str().is_some_and(|currency| {
                            currency.len() == 3
                                && currency.bytes().all(|value| value.is_ascii_uppercase())
                                && term["currency_code"]
                                    .as_str()
                                    .is_none_or(|term_currency| term_currency == currency)
                        })
                });
            Some((term, commercial))
        })
        .collect()
}

fn estimate_adopted(catalog: &Catalog, estimate: &Value) -> bool {
    catalog.all(Table::Preparation).iter().any(|p| {
        p["source_cost_package_id"] == estimate["id"]
            && p["status"] == "activated"
            && p["source_facts"]["cost"]["version"] == estimate["version"]
            && catalog.all(Table::ReviewBinding).iter().any(|b| {
                b["preparation_id"] == p["id"]
                    && b["payload_hash"] == p["payload_hash"]
                    && catalog
                        .by(Table::Approval, "id", &b["approval_record_id"])
                        .is_some_and(|a| a["current_status"] == "approved")
            })
    })
}

fn term_proven(catalog: &Catalog, term: &Value) -> bool {
    catalog
        .by(Table::Preparation, "id", &term["source_preparation_id"])
        .is_some_and(|p| {
            p["status"] == "activated"
                && p["activated_snapshot_id"] == term["id"]
                && p["payload_hash"] == term["payload_hash"]
                && catalog.all(Table::ReviewBinding).iter().any(|b| {
                    b["preparation_id"] == p["id"]
                        && b["contract_id"] == term["contract_id"]
                        && b["payload_hash"] == term["payload_hash"]
                        && catalog
                            .by(Table::Approval, "id", &b["approval_record_id"])
                            .is_some_and(|a| a["current_status"] == "approved")
                })
        })
}

fn source_day(table: Table, row: &Value) -> Result<chrono::NaiveDate, Error> {
    sources::business_day(
        &row[match table {
            Table::Payable => "expected_payment_date",
            Table::Payment => "payment_date",
            Table::Invoice => "invoice_date",
            Table::Expense => "expense_date",
            _ => return Err(Error::Internal),
        }],
    )
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum RestatementAllocationWindow {
    InWindow,
    FutureBusiness,
}

// Restatement membership is determined by the real source business dates, not
// by when F happened to produce a result. Both preview and build call this
// dispatch before any result-effective-at gate.
fn allocation_window_for_timing(
    catalog: &Catalog,
    table: Table,
    row: &Value,
    window: &OperatingBusinessWindow,
    timing: Timing,
) -> Option<Result<RestatementAllocationWindow, Error>> {
    if table == Table::AllocationResult && timing == Timing::Restatement {
        Some(restatement_allocation_window(catalog, row, window))
    } else {
        None
    }
}

fn restatement_window_reason(
    qualification: &Result<RestatementAllocationWindow, Error>,
    produced_after_cutoff: bool,
) -> Option<&'static str> {
    match qualification {
        Ok(RestatementAllocationWindow::FutureBusiness) => Some("outside-business-cutoff"),
        Ok(RestatementAllocationWindow::InWindow) if produced_after_cutoff => {
            Some("late-produced-allocation-full-in-window")
        }
        Ok(RestatementAllocationWindow::InWindow) | Err(_) => None,
    }
}

// This is a current-catalog classification, never a cached GET authorization.
// Existing in-window Restatement qualification is deliberately unchanged. Only
// exclusion of a future batch borrows the complete first-period proof gate.
fn restatement_allocation_window(
    catalog: &Catalog,
    result: &Value,
    window: &OperatingBusinessWindow,
) -> Result<RestatementAllocationWindow, Error> {
    let basis = catalog
        .by(Table::AllocationBasis, "id", &result["basis_id"])
        .ok_or_else(|| store::conflict("operating_allocation_basis_missing"))?;
    let members = catalog
        .all(Table::AllocationSource)
        .iter()
        .filter(|s| s["basis_id"] == basis["id"])
        .collect::<Vec<_>>();
    if members.is_empty() {
        return Err(store::conflict("operating_allocation_members_missing"));
    }
    let mut future = false;
    for member in members {
        let cost = catalog
            .by(Table::Cost, "id", &member["cost_record_id"])
            .ok_or_else(|| store::conflict("operating_allocation_member_missing"))?;
        // Do not return on the first future member: a later missing/invalid
        // source must still block the entire batch, independently of row order.
        future |= sources::business_day(&cost["occurred_on"])? > window.business_cutoff;
    }
    if !future {
        return Ok(RestatementAllocationWindow::InWindow);
    }
    confirmed_future_allocation(late_allocation::qualify(
        catalog,
        result,
        window.business_cutoff,
        window.knowledge_cutoff,
    )?)
}

fn confirmed_future_allocation(
    qualification: Qualification,
) -> Result<RestatementAllocationWindow, Error> {
    match qualification {
        Qualification::FutureBusiness => Ok(RestatementAllocationWindow::FutureBusiness),
        Qualification::Eligible(_) => Err(store::conflict("operating_late_allocation_unverified")),
    }
}

fn collect_references(value: &Value, out: &mut Vec<Value>) {
    match value {
        Value::Object(map) => {
            if map.len() == 4
                && map.get("kind").is_some_and(Value::is_string)
                && map.get("id").is_some_and(Value::is_string)
                && map.get("rowVersion").is_some_and(Value::is_i64)
                && map.get("payloadHash").is_some_and(Value::is_string)
            {
                out.push(value.clone());
            } else {
                for child in map.values() {
                    collect_references(child, out);
                }
            }
        }
        Value::Array(values) => {
            for child in values {
                collect_references(child, out);
            }
        }
        _ => {}
    }
}

fn select_term<'a>(
    catalog: &'a Catalog,
    contract: &Value,
    window: &OperatingBusinessWindow,
) -> Result<Option<&'a Value>, Error> {
    let mut terms = catalog
        .all(Table::Term)
        .iter()
        .filter(|t| {
            t["contract_id"] == contract["id"]
                && matches!(t["snapshot_status"].as_str(), Some("active" | "superseded"))
                && sources::known_at(t, window.knowledge_cutoff)
        })
        .filter_map(|t| {
            sources::business_day(&t["effective_at"])
                .ok()
                .filter(|day| *day <= window.business_cutoff)
                .map(|_| t)
        })
        .collect::<Vec<_>>();
    terms.sort_by_key(|t| t["version"].as_i64().unwrap_or(0));
    Ok(terms.pop())
}
fn allocation_labor(catalog: &Catalog, result: &Value) -> &'static str {
    let members = catalog
        .all(Table::AllocationSource)
        .iter()
        .filter(|s| s["basis_id"] == result["basis_id"])
        .collect::<Vec<_>>();
    if members.iter().any(|s| {
        catalog
            .by(Table::Cost, "id", &s["cost_record_id"])
            .is_some_and(|c| labor(c) == "yes")
    }) {
        "yes"
    } else if !members.is_empty()
        && members.iter().all(|s| {
            catalog
                .by(Table::Cost, "id", &s["cost_record_id"])
                .is_some_and(|c| labor(c) == "no")
        })
    {
        "no"
    } else {
        "unknown"
    }
}
fn tax_labor(catalog: &Catalog, tax: &Value) -> &'static str {
    match catalog
        .by(Table::Evidence, "id", &tax["governance_evidence_id"])
        .and_then(|e| e["frozen_payload"]["containsLabor"].as_bool())
    {
        Some(true) => "yes",
        Some(false) => "no",
        None => "unknown",
    }
}
fn allocation_member_refs(catalog: &Catalog, result: &Value) -> Result<Vec<Value>, Error> {
    catalog
        .all(Table::AllocationSource)
        .iter()
        .filter(|s| s["basis_id"] == result["basis_id"])
        .map(|s| sources::reference(Table::AllocationSource, s))
        .collect()
}
fn allocation_key(catalog: &Catalog, result: &Value) -> Result<String, Error> {
    Ok(format!(
        "allocation:{}:{}:{}",
        canonical_hash(&Value::Array(allocation_member_refs(catalog, result)?))?,
        store::id(result, "project_id")?,
        store::id(result, "id")?
    ))
}

/// Only the first period capture can supply this override. A preparation has
/// proved economic refs but no invented G identity; capture supplies the actual
/// noncurrent package written on this same outer transaction.
pub(crate) enum PeriodBaseline<'a> {
    Preview(&'a super::period_baseline::HistoricalSelection),
    Captured {
        selection: &'a super::period_baseline::HistoricalSelection,
        package_id: Uuid,
    },
}

#[expect(
    clippy::too_many_arguments,
    reason = "The collector passes distinct locked sources, scope, and frozen-window inputs."
)]
pub(crate) async fn build(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    catalog: &Catalog,
    window: &OperatingBusinessWindow,
    ids: &OperatingGeneratedIds,
    mode: &str,
    restates: Option<Value>,
    period: Option<Value>,
    period_baseline: Option<PeriodBaseline<'_>>,
) -> Result<OperatingSourceContext, Error> {
    let mut blockers = BTreeSet::new();
    let mut pending = Vec::new();
    let mut unclassified = Vec::new();
    let historical_period = if mode == "restated" {
        if let Some(period_ref) = period.as_ref() {
            let anchor = catalog
                .find(Table::Period, store::id(period_ref, "id")?)
                .ok_or_else(|| store::conflict("period_baseline_reconciliation_required"))?;
            let root = catalog
                .find(Table::Snapshot, store::id(anchor, "project_snapshot_id")?)
                .ok_or_else(|| store::conflict("period_baseline_reconciliation_required"))?;
            if anchor["producer_version"] != 1
                || root["producer_version"] != 1
                || root["project_id"] != project.to_string()
            {
                return Err(store::conflict("period_baseline_reconciliation_required"));
            }
            let terminal = restates
                .as_ref()
                .and_then(|r| r["id"].as_str())
                .and_then(|id| Uuid::parse_str(id).ok())
                .and_then(|id| catalog.find(Table::Snapshot, id))
                .ok_or_else(|| store::conflict("period_baseline_reconciliation_required"))?;
            if terminal["root_snapshot_id"] != root["id"] {
                return Err(store::conflict("operating_restatement_period_root_changed"));
            }
            let original =
                crate::project_operating_common::loader::load_frozen_context_with_session(
                    session,
                    store::id(root, "id")?,
                    1,
                    store::text(root, "source_hash")?,
                )
                .await?;
            if original.snapshot.source_window_end != window.source_window_end
                || original.snapshot.source_window_start != window.source_window_start
                || original.snapshot.period_key != window.period_key
            {
                return Err(store::conflict("period_baseline_reconciliation_required"));
            }
            Some(original)
        } else {
            None
        }
    } else {
        None
    };
    let historical_baseline = if let Some(original) = historical_period.as_ref() {
        let reference = original
            .baseline
            .baseline_package_ref
            .as_ref()
            .ok_or_else(|| store::conflict("period_baseline_reconciliation_required"))?;
        let record:Value=sqlx::query_scalar("SELECT captured_payload FROM poms.operating_source_member WHERE context_id=$1 AND source_kind='OperatingBaselinePackage' AND source_id=$2 AND source_row_version=$3 AND source_payload_hash=$4").bind(original.context_id).bind(reference.id).bind(reference.row_version).bind(&reference.payload_hash).fetch_optional(&mut *session.connection).await?.ok_or_else(||store::conflict("period_baseline_reconciliation_required"))?;
        Some(frozen_period_baseline_member(reference, record)?)
    } else {
        None
    };
    let current_baseline = catalog
        .all(Table::Baseline)
        .iter()
        .find(|b| b["is_current"] == true);
    let first_period = window.period_key.is_some() && historical_period.is_none();
    if period_baseline.is_some() != first_period {
        return Err(store::conflict("period_baseline_reconciliation_required"));
    }
    let (baseline, draft) = match period_baseline {
        Some(PeriodBaseline::Preview(selection)) => (None, Some(selection.preview_draft())),
        Some(PeriodBaseline::Captured {
            selection,
            package_id,
        }) => {
            let row = catalog
                .find(Table::Baseline, package_id)
                .ok_or_else(|| store::conflict("period_baseline_reconciliation_required"))?;
            let source = catalog
                .by(Table::BaselineSource, "id", &row["source_context_id"])
                .ok_or_else(|| store::conflict("period_baseline_reconciliation_required"))?;
            let expected =
                serde_json::to_value(selection.draft(store::id(source, "id")?, project)?)
                    .map_err(|_| Error::Internal)?;
            if row["project_id"] != project.to_string()
                || row["is_current"] != false
                || row["status"] != "active"
                || row["producer_version"] != 1
                || source["frozen_payload"] != expected
                || source["source_hash"] != expected["sourceHash"]
                || source["payload_hash"] != expected["payloadHash"]
                || row["source_hash"] != expected["sourceHash"]
            {
                return Err(store::conflict("period_baseline_reconciliation_required"));
            }
            (Some(row), Some(expected))
        }
        None => {
            let row = historical_baseline.as_ref().or(current_baseline);
            let draft = row
                .and_then(|b| catalog.by(Table::BaselineSource, "id", &b["source_context_id"]))
                .map(|r| r["frozen_payload"].clone());
            (row, draft)
        }
    };
    if baseline.is_none() && !first_period {
        blockers.insert("operating-baseline-required".to_owned());
    }
    if baseline.is_some_and(|b| b["producer_version"] != 1) {
        blockers.insert("legacy_operating_baseline_admission_required".to_owned());
    }
    if let Some(draft) = draft
        .as_ref()
        .filter(|_| historical_period.is_none() && !first_period)
    {
        let mut adopted_ids = BTreeSet::new();
        if let Some(id) = draft["originalCostRef"]["id"].as_str() {
            adopted_ids.insert(id.to_owned());
        }
        if let Some(id) = draft["currentCostRef"]["id"].as_str() {
            adopted_ids.insert(id.to_owned());
        }
        for transition in draft["approvedTransitions"]
            .as_array()
            .into_iter()
            .flatten()
        {
            if let Some(id) = transition["afterCostRef"]["id"].as_str() {
                adopted_ids.insert(id.to_owned());
            }
        }
        if catalog.all(Table::Preparation).iter().any(|p| {
            p["status"] == "activated"
                && p["source_cost_package_id"]
                    .as_str()
                    .is_some_and(|id| !adopted_ids.contains(id))
                && catalog.all(Table::ReviewBinding).iter().any(|b| {
                    b["preparation_id"] == p["id"]
                        && b["payload_hash"] == p["payload_hash"]
                        && catalog
                            .by(Table::Approval, "id", &b["approval_record_id"])
                            .is_some_and(|a| a["current_status"] == "approved")
                })
        }) {
            blockers.insert("operating-baseline-refresh-required".into());
        }
    }
    let mut currencies = BTreeSet::new();
    if let Some(v) = draft.as_ref().and_then(|d| d["currency"].as_str()) {
        currencies.insert(v.to_owned());
    }
    let mut contracts = historical_period
        .as_ref()
        .map(|original| {
            original
                .contracts
                .iter()
                .map(serde_json::to_value)
                .collect::<Result<Vec<_>, _>>()
        })
        .transpose()
        .map_err(|_| Error::Internal)?
        .unwrap_or_default();
    for contract in catalog.all(Table::Contract) {
        if contracts
            .iter()
            .any(|old| old["contractRef"]["id"] == contract["id"])
        {
            continue;
        }
        if contract["status"] != "active" {
            continue;
        }
        if !contract["signed_at"].is_null()
            && sources::business_day(&contract["signed_at"])? > window.business_cutoff
        {
            continue;
        }
        let Some(term) = select_term(catalog, contract, window)? else {
            if catalog
                .all(Table::Term)
                .iter()
                .filter(|t| {
                    t["contract_id"] == contract["id"]
                        && matches!(t["snapshot_status"].as_str(), Some("active" | "superseded"))
                })
                .any(|t| {
                    sources::business_day(&t["effective_at"])
                        .is_ok_and(|date| date > window.business_cutoff)
                })
            {
                continue;
            }
            blockers.insert("contract-activated-basis-missing".into());
            continue;
        };
        let preparation = catalog.by(Table::Preparation, "id", &term["source_preparation_id"]);
        let binding = preparation.and_then(|p| {
            catalog.all(Table::ReviewBinding).iter().find(|b| {
                b["preparation_id"] == p["id"]
                    && b["payload_hash"] == p["payload_hash"]
                    && b["contract_id"] == contract["id"]
                    && catalog
                        .by(Table::Approval, "id", &b["approval_record_id"])
                        .is_some_and(|a| a["current_status"] == "approved")
            })
        });
        let (Some(preparation), Some(binding)) = (preparation, binding) else {
            blockers.insert("contract-exact-approval-missing".into());
            continue;
        };
        if term["payload_hash"] != preparation["payload_hash"]
            || term["amount_tax_inclusive"] != preparation["amount_tax_inclusive"]
            || term["amount_tax_exclusive"] != preparation["amount_tax_exclusive"]
        {
            blockers.insert("contract-activated-basis-changed".into());
            continue;
        }
        let currency = term["currency_code"]
            .as_str()
            .or(preparation["currency_code"].as_str());
        if let Some(currency) = currency {
            currencies.insert(currency.into());
        } else {
            blockers.insert("contract-currency-unproven".into());
        }
        let mut monetary = term.clone();
        monetary["derived_tax"] = facts::difference(
            &facts::source_amount(
                term,
                "amount_tax_inclusive",
                sources::reference(Table::Term, term)?,
            )?,
            &facts::source_amount(
                term,
                "amount_tax_exclusive",
                sources::reference(Table::Term, term)?,
            )?,
            "contractTax",
        )?["value"]
            .clone();
        let amounts = facts::triple(
            &monetary,
            [
                "amount_tax_exclusive",
                "derived_tax",
                "amount_tax_inclusive",
            ],
            currency,
            sources::reference(Table::Term, term)?,
        )?;
        contracts.push(json!({"contractRef":sources::reference(Table::Contract,contract)?,"effectiveTermSnapshotRef":sources::reference(Table::Term,term)?,"preparationRef":sources::reference(Table::Preparation,preparation)?,"approvalBindingRef":sources::reference(Table::ReviewBinding,binding)?,"amounts":amounts,"originalEstimatePackageRef":catalog.by(Table::Estimate,"id",&preparation["source_cost_package_id"]).map(|p|sources::reference(Table::Estimate,p)).transpose()?,"memberRole":if term["source_amendment_id"].is_null(){"main"}else{"amendment"}}));
    }
    if contracts.is_empty() {
        blockers.insert("effective-contract-required".into());
    }
    let mut receipts = Vec::new();
    let mut registered_receipts = 0;
    for receipt in catalog.all(Table::Receipt) {
        if receipt["status"] == "voided"
            || sources::business_day(&receipt["receipt_date"])? > window.business_cutoff
            || !sources::known_at(receipt, window.knowledge_cutoff)
        {
            continue;
        }
        registered_receipts += 1;
        let receipt_ref = sources::reference(Table::Receipt, receipt)?;
        if receipt["status"] != "confirmed" {
            pending.push(json!({"kind":"receipt","sourceRef":receipt_ref,"amounts":null,"reasonCode":"receipt-pending-confirmation","requiredForFormalAccounting":false}));
            continue;
        }
        let basis = catalog.by(Table::ReceiptBasis, "receipt_id", &receipt["id"]);
        let mut amounts = json!({"currency":null,"net":facts::unknown("receipt-accounting-basis-missing"),"tax":facts::unknown("receipt-accounting-basis-missing"),"gross":facts::source_amount(receipt,"receipt_amount",receipt_ref.clone())?});
        let mut term_ref = None;
        let mut basis_ref = None;
        let mut origin = "missing";
        if let Some(basis) = basis {
            if basis["producer_version"] != 1
                || basis["contract_id"] != receipt["contract_id"]
                || basis["project_id"] != receipt["project_id"]
                || basis["cash_gross"] != receipt["receipt_amount"]
                || basis["payload_hash"] != canonical_hash(&basis["frozen_payload"])?
            {
                return Err(store::conflict("operating_receipt_basis_changed"));
            }
            let term = catalog
                .by(Table::Term, "id", &basis["term_snapshot_id"])
                .ok_or_else(|| store::conflict("operating_receipt_terms_missing"))?;
            if term["contract_id"] != receipt["contract_id"]
                || term["payload_hash"] != basis["term_payload_hash"]
            {
                return Err(store::conflict("operating_receipt_terms_changed"));
            }
            currencies.insert(store::text(basis, "currency")?.into());
            amounts = facts::triple(
                basis,
                ["amount_excluding_tax", "tax_amount", "cash_gross"],
                basis["currency"].as_str(),
                sources::reference(Table::ReceiptBasis, basis)?,
            )?;
            term_ref = Some(sources::reference(Table::Term, term)?);
            basis_ref = Some(sources::reference(Table::ReceiptBasis, basis)?);
            origin = if basis["capture_mode"] == "confirm" {
                "confirmation"
            } else {
                "authorized-legacy-correction"
            };
        } else {
            blockers.insert("receipt-accounting-basis-missing".into());
        }
        if receipt["confirmed_at"].is_null() {
            blockers.insert("receipt-confirmation-proof-missing".into());
            continue;
        }
        receipts.push(json!({"receiptRef":receipt_ref,"contractId":receipt["contract_id"],"status":"confirmed","confirmedAt":receipt["confirmed_at"],"cashGross":facts::source_amount(receipt,"receipt_amount",sources::reference(Table::Receipt,receipt)?)?,"accountingBasisRef":basis_ref,"contractTermSnapshotRef":term_ref,"basisOrigin":origin,"legacyCorrectionRef":if origin=="authorized-legacy-correction"{basis_ref}else{None},"amounts":amounts}));
    }
    let mut costs = Vec::new();
    let mut allocations = Vec::new();
    let mut registered_costs = 0;
    let mut excluded = 0;
    let mut included = 0;
    let mut pending_costs = 0;
    let mut included_keys = BTreeSet::new();
    let mut primary_chains: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    let mut primary_source_ids = BTreeSet::new();
    let mut shared_source_ids = BTreeSet::new();
    for cost in catalog.all(Table::Cost) {
        if cost["project_id"] != project.to_string()
            || !current_cost(cost)
            || sources::business_day(&cost["occurred_on"])? > window.business_cutoff
            || !sources::known_at(cost, window.knowledge_cutoff)
        {
            continue;
        }
        registered_costs += 1;
        let Some(decision) =
            inclusion::current_decision(catalog, project, &inclusion::unit_key(Table::Cost, cost)?)
        else {
            unclassified.push(sources::reference(Table::Cost, cost)?);
            continue;
        };
        let source_ref = cost_source_ref(catalog, cost)?;
        if decision["source_row_version"] != cost["row_version"] {
            blockers.insert("classification-source-changed".into());
        }
        let stage = inclusion::stage(catalog, cost);
        let stage_state = if stage.is_some_and(|s| s["governance_schema_version"] == 1) {
            "verified"
        } else if decision["decision"] == "exclude" {
            "not-yet-applicable"
        } else {
            "missing"
        };
        if decision["decision"] == "include" {
            inclusion::qualify_cost(session, catalog, cost, window.business_cutoff).await?;
            if decision["source_row_version"] != cost["row_version"] {
                return Err(store::conflict("operating_classification_source_changed"));
            }
            if !included_keys.insert(inclusion::canonical_key(cost)?) {
                return Err(store::conflict("operating_cost_primary_duplicate"));
            }
            primary_source_ids.insert(store::id(cost, "id")?);
            primary_chains
                .entry(inclusion::chain_key(cost)?)
                .or_default()
                .insert(store::text(cost, "source_type")?.into());
            included += 1;
        } else {
            excluded += 1;
            if stage_state != "verified" {
                pending_costs += 1;
                pending.push(json!({"kind":"cost","sourceRef":sources::reference(Table::Cost,cost)?,"amounts":null,"reasonCode":"excluded-cost-stage-not-ready","requiredForFormalAccounting":false}));
            }
        }
        currencies.insert(store::text(cost, "currency")?.into());
        let tax_refs = cost_tax_refs(catalog, cost)?;
        costs.push(json!({"costRef":sources::reference(Table::Cost,cost)?,"sourceRef":source_ref,"sourceType":cost["source_type"],"canonicalAccumulationKey":inclusion::canonical_key(cost)?,"costType":cost["cost_type"],"recognitionRole":decision["recognition_role"],"classification":classification(decision),"stageAttributionRef":stage.map(|s|sources::reference(Table::Stage,s)).transpose()?,"attributedStage":stage.map(|s|s["attributed_stage"].clone()),"businessDate":sources::business_day(&cost["occurred_on"])?,"amounts":facts::triple(cost,["amount_excluding_tax","tax_cost_amount","amount_including_tax"],cost["currency"].as_str(),sources::reference(Table::Cost,cost)?)?,"allocationResultRef":null,"taxTreatmentRefs":tax_refs,"governanceEvidenceRefs":stage.and_then(|s|catalog.by(Table::Evidence,"id",&s["governance_evidence_id"])).map(|e|sources::reference(Table::Evidence,e)).transpose()?.into_iter().collect::<Vec<_>>(),"containsLabor":labor(cost),"recordStatus":cost["record_status"],"stageEvidenceState":stage_state,"sourceChainKey":inclusion::chain_key(cost)?,"primaryCostRef":decision["primary_cost_id"].as_str().and_then(|id|Uuid::parse_str(id).ok()).and_then(|id|catalog.find(Table::Cost,id)).map(|p|sources::reference(Table::Cost,p)).transpose()?,"allocationSourceSetHash":null,"sourceLifecycleStatus":cost["source_basis"]["sourceStatus"],"allocationSourceMembers":[]}));
    }
    for types in primary_chains.values() {
        if types.contains("payable-record") && types.contains("payment-record") {
            return Err(store::conflict("operating_commitment_payment_overlap"));
        }
    }
    let allocation_timing = Timing::for_capture(mode, first_period, window);
    let mut late_allocation_refs = Vec::new();
    for result in catalog.all(Table::AllocationResult) {
        if result["project_id"] != project.to_string()
            || !matches!(result["status"].as_str(), Some("active" | "pending"))
        {
            continue;
        }
        if let Some(qualification) = allocation_window_for_timing(
            catalog,
            Table::AllocationResult,
            result,
            window,
            allocation_timing,
        ) && qualification? == RestatementAllocationWindow::FutureBusiness
        {
            continue;
        }
        if sources::business_day(&result["effective_at"])? > window.business_cutoff {
            match allocation_timing {
                Timing::Realtime => continue,
                Timing::Restatement => {} // every result was classified above
                Timing::FirstPeriod(knowledge) => match late_allocation::qualify(
                    catalog,
                    result,
                    window.business_cutoff,
                    knowledge,
                )? {
                    Qualification::FutureBusiness => continue,
                    Qualification::Eligible(trace) => late_allocation_refs.extend(trace.references),
                },
            }
        }
        registered_costs += 1;
        let Some(decision) = inclusion::current_decision(
            catalog,
            project,
            &inclusion::unit_key(Table::AllocationResult, result)?,
        ) else {
            unclassified.push(sources::reference(Table::AllocationResult, result)?);
            continue;
        };
        let basis = catalog
            .by(Table::AllocationBasis, "id", &result["basis_id"])
            .ok_or_else(|| store::conflict("operating_allocation_basis_missing"))?;
        let source_members = catalog
            .all(Table::AllocationSource)
            .iter()
            .filter(|s| s["basis_id"] == result["basis_id"])
            .collect::<Vec<_>>();
        let mut members = Vec::new();
        for source in &source_members {
            let cost = catalog
                .by(Table::Cost, "id", &source["cost_record_id"])
                .ok_or_else(|| store::conflict("operating_allocation_member_missing"))?;
            if decision["decision"] == "include" {
                shared_source_ids.insert(store::id(cost, "id")?);
            }
            let stage = inclusion::stage(catalog, cost);
            members.push(json!({"costRef":sources::reference(Table::Cost,cost)?,"sourceRef":cost_source_ref(catalog,cost)?,"stageAttributionRef":stage.map(|s|sources::reference(Table::Stage,s)).transpose()?,"attributedStage":stage.map(|s|s["attributed_stage"].clone()),"governanceEvidenceRefs":stage.and_then(|s|catalog.by(Table::Evidence,"id",&s["governance_evidence_id"])).map(|e|sources::reference(Table::Evidence,e)).transpose()?.into_iter().collect::<Vec<_>>(),"containsLabor":labor(cost),"costType":cost["cost_type"],"businessDate":sources::business_day(&cost["occurred_on"])?}));
        }
        if decision["decision"] == "include" {
            inclusion::qualify_allocation(
                session,
                catalog,
                result,
                window.business_cutoff,
                allocation_timing,
            )
            .await?;
            included += 1;
        } else {
            excluded += 1;
        }
        currencies.insert(store::text(result, "currency")?.into());
        let amounts = facts::triple(
            result,
            [
                "allocated_amount_excluding_tax",
                "allocated_tax_cost_amount",
                "allocated_amount_including_tax",
            ],
            result["currency"].as_str(),
            sources::reference(Table::AllocationResult, result)?,
        )?;
        let source_set = canonical_hash(&Value::Array(allocation_member_refs(catalog, result)?))?;
        costs.push(json!({"costRef":null,"sourceRef":sources::reference(Table::AllocationResult,result)?,"sourceType":"shared-cost-allocation-result","canonicalAccumulationKey":allocation_key(catalog,result)?,"costType":null,"recognitionRole":"allocation-share","classification":classification(decision),"stageAttributionRef":null,"attributedStage":null,"businessDate":sources::business_day(&result["effective_at"])?,"amounts":amounts,"allocationResultRef":sources::reference(Table::AllocationResult,result)?,"taxTreatmentRefs":[],"governanceEvidenceRefs":catalog.by(Table::Evidence,"id",&result["governance_evidence_id"]).map(|e|sources::reference(Table::Evidence,e)).transpose()?.into_iter().collect::<Vec<_>>(),"containsLabor":allocation_labor(catalog,result),"recordStatus":null,"stageEvidenceState":if decision["decision"]=="include"{"verified"}else{"not-yet-applicable"},"sourceChainKey":format!("allocation:{source_set}"),"primaryCostRef":null,"allocationSourceSetHash":source_set,"sourceLifecycleStatus":result["status"],"allocationSourceMembers":members}));
        allocations.push(json!({"basisRef":sources::reference(Table::AllocationBasis,basis)?,"resultRef":sources::reference(Table::AllocationResult,result)?,"sourceSnapshotRefs":allocation_member_refs(catalog,result)?,"sourceCostRefs":source_members.iter().map(|s|catalog.by(Table::Cost,"id",&s["cost_record_id"]).ok_or(Error::Internal).and_then(|c|sources::reference(Table::Cost,c))).collect::<Result<Vec<_>,_>>()?,"projectId":project,"status":if result["status"]=="active"{"frozen"}else{"pending"},"measurementLayer":match basis["measurement_basis"].as_str(){Some("excluding-tax")=>"net",Some("tax")=>"tax",_=>"gross"},"algorithmVersion":basis["allocation_algorithm"],"allocatedAmounts":amounts,"ratio6":result["allocation_ratio"],"residualMinorUnits":result["residual_minor_units"]}));
    }
    if primary_source_ids
        .intersection(&shared_source_ids)
        .next()
        .is_some()
    {
        return Err(store::conflict("operating_direct_shared_source_overlap"));
    }
    let mut taxes = Vec::new();
    for tax in catalog.all(Table::Tax) {
        if !matches!(tax["status"].as_str(), Some("active" | "pending")) {
            continue;
        }
        let evidence = catalog.by(Table::Evidence, "id", &tax["governance_evidence_id"]);
        let Some(evidence) = evidence else {
            blockers.insert("tax-treatment-evidence-missing".into());
            continue;
        };
        if sources::business_day(&evidence["business_date"])? > window.business_cutoff {
            continue;
        }
        if tax["governance_schema_version"] != 1
            || evidence["payload_hash"] != canonical_hash(&evidence["frozen_payload"])?
        {
            blockers.insert("tax-treatment-unverified".into());
            continue;
        }
        currencies.insert(store::text(tax, "currency")?.into());
        let reference = sources::reference(Table::Tax, tax)?;
        taxes.push(json!({"taxTreatmentRef":reference,"evidenceRefs":[sources::reference(Table::Evidence,evidence)?],"deductibility":tax["deductibility_status"],"pendingAmount":facts::source_amount(tax,"tax_impact_pending_amount",reference.clone())?,"recognizedAdjustmentNet":facts::known(OperatingMoneyCents::from_cents(0,"taxRecognizedAdjustment")?,vec![sources::reference(Table::Evidence,evidence)?],"source-basis-value"),"adjustmentOverlapKey":format!("tax:{}",store::id(tax,"id")?),"containsLabor":tax_labor(catalog,tax)}));
    }
    for cost in &mut costs {
        if cost["recognitionRole"] == "allocation-share" {
            let result = catalog
                .by(
                    Table::AllocationResult,
                    "id",
                    &cost["allocationResultRef"]["id"],
                )
                .ok_or(Error::Internal)?;
            let basis = catalog
                .by(Table::AllocationBasis, "id", &result["basis_id"])
                .ok_or(Error::Internal)?;
            let refs = cost["governanceEvidenceRefs"]
                .as_array_mut()
                .ok_or(Error::Internal)?;
            for source in [basis, result] {
                if let Some(evidence) =
                    catalog.by(Table::Evidence, "id", &source["governance_evidence_id"])
                {
                    refs.push(sources::reference(Table::Evidence, evidence)?);
                } else {
                    blockers.insert("allocation-source-evidence-missing".into());
                }
            }
            refs.sort_by_key(Value::to_string);
            refs.dedup();
        }
    }
    let mut unmapped = 0;
    for table in [
        Table::Payable,
        Table::Payment,
        Table::Invoice,
        Table::Expense,
    ] {
        for row in catalog.all(table) {
            if !locally_registered_upstream(row, project) {
                continue;
            }
            if !matches!(row["status"].as_str(), Some("voided" | "draft"))
                && source_day(table, row)? <= window.business_cutoff
                && sources::known_at(row, window.knowledge_cutoff)
                && !catalog.all(Table::Cost).iter().any(|c| {
                    current_cost(c)
                        && c["source_type"] == sources::source_type(table)
                        && c["source_id"] == row["id"]
                })
            {
                unmapped += 1;
                pending.push(json!({"kind":"cost","sourceRef":sources::reference(table,row)?,"amounts":null,"reasonCode":"actual-cost-mapping-required","requiredForFormalAccounting":true}));
            }
        }
    }
    if !unclassified.is_empty() {
        blockers.insert("cost-classification-required".into());
    }
    if unmapped > 0 {
        blockers.insert("actual-cost-mapping-required".into());
    }
    if currencies.len() != 1 {
        blockers.insert(
            if currencies.is_empty() {
                "operating-currency-unproven"
            } else {
                "operating-multiple-currencies-unsupported"
            }
            .into(),
        );
    }
    let currency = if currencies.len() == 1 {
        currencies.first().map(String::as_str)
    } else {
        None
    };
    let mut scope_refs = late_allocation_refs;
    for value in [
        &contracts,
        &receipts,
        &costs,
        &allocations,
        &taxes,
        &pending,
        &unclassified,
    ] {
        for value in value {
            collect_references(value, &mut scope_refs);
        }
    }
    if let Some(draft) = draft.as_ref() {
        collect_references(draft, &mut scope_refs);
    }
    if let Some(original) = historical_period.as_ref() {
        collect_references(
            &serde_json::to_value(&original.baseline).map_err(|_| Error::Internal)?,
            &mut scope_refs,
        );
    } else if !first_period
        && let Some(handover) = draft.as_ref().and_then(|d| {
            catalog.all(Table::Handover).iter().find(|h| {
                h["basis_snapshot_id"] == d["handoverBasisRef"]["id"]
                    && h["producer_version"] == 1
                    && matches!(h["status"].as_str(), Some("confirmed" | "superseded"))
            })
        })
    {
        scope_refs.push(sources::reference(Table::Handover, handover)?);
    }
    for cost in &costs {
        if let Some(decision) =
            catalog.by(Table::Decision, "id", &cost["classification"]["decisionId"])
        {
            scope_refs.push(sources::reference(Table::Decision, decision)?);
        }
    }
    if let Some(row) = baseline {
        scope_refs.push(sources::reference(Table::Baseline, row)?);
        if let Some(source) = catalog.by(Table::BaselineSource, "id", &row["source_context_id"]) {
            scope_refs.push(sources::reference(Table::BaselineSource, source)?);
        }
    }
    scope_refs.sort_by_key(|r| {
        format!(
            "{}:{}:{}:{}",
            r["kind"], r["id"], r["rowVersion"], r["payloadHash"]
        )
    });
    scope_refs.dedup();
    let scope_hash = canonical_hash(
        &json!({"queryVersion":sources::COLLECTION_VERSION,"projectId":project,"businessCutoff":window.business_cutoff,"members":scope_refs}),
    )?;
    let scope = json!({"collectionStatus":"closed","collectionQueryVersion":sources::COLLECTION_VERSION,"scopeInventoryHash":scope_hash,"registeredReceiptCount":registered_receipts,"confirmedReceiptCount":receipts.len(),"registeredCostCount":registered_costs,"includedCostCount":included,"excludedCostCount":excluded,"unclassifiedCostCount":unclassified.len(),"pendingCostCount":pending_costs,"unmappedCostCount":unmapped,"hasExplicitCostScopeEvidence":registered_costs>0&&unclassified.is_empty(),"closureEvidenceRefs":scope_refs});
    let contract_total = facts::sum_triples(
        contracts.iter().map(|c| &c["amounts"]),
        currency,
        !contracts.is_empty(),
    )?;
    let receipt_total = facts::sum_triples(receipts.iter().map(|r| &r["amounts"]), currency, true)?;
    let included_total = facts::sum_triples(
        costs
            .iter()
            .filter(|c| {
                c["classification"]["decision"] == "include"
                    && matches!(
                        c["recognitionRole"].as_str(),
                        Some("direct-source" | "allocation-share")
                    )
            })
            .map(|c| &c["amounts"]),
        currency,
        unclassified.is_empty(),
    )?;
    let excluded_total = facts::sum_triples(
        costs
            .iter()
            .filter(|c| c["classification"]["decision"] == "exclude")
            .map(|c| &c["amounts"]),
        currency,
        true,
    )?;
    let baseline_amount = |key: &str| -> Result<Value, Error> {
        if let Some(original) = historical_period.as_ref() {
            return serde_json::to_value(if key == "originalBaselineCost" {
                &original.baseline.original_net_cost
            } else {
                &original.baseline.current_effective_net_cost
            })
            .map_err(|_| Error::Internal);
        }
        match draft.as_ref().and_then(|d| d[key].as_str()) {
            Some(value) => Ok(facts::known(
                OperatingMoneyCents::parse_exact(value, key)?,
                baseline
                    .map(|b| sources::reference(Table::Baseline, b))
                    .transpose()?
                    .or_else(|| {
                        draft.as_ref().map(|d| {
                            d[if key == "originalBaselineCost" {
                                "originalCostRef"
                            } else {
                                "currentCostRef"
                            }]
                            .clone()
                        })
                    })
                    .into_iter()
                    .collect(),
                "source-basis-value",
            )),
            None => Ok(facts::unknown("baseline-source-missing")),
        }
    };
    let original = baseline_amount("originalBaselineCost")?;
    let current = baseline_amount("currentEffectiveBaselineCost")?;
    let margin = facts::difference(
        &receipt_total["net"],
        &included_total["net"],
        "grossMarginNet",
    )?;
    let tax_pending = if currency.is_none() {
        facts::unknown("currency-unproven-or-multiple")
    } else if tax_assessment_missing(&costs, &taxes)? {
        facts::unknown("tax-assessment-missing")
    } else {
        facts::sum_amounts(
            taxes.iter().map(|t| &t["pendingAmount"]),
            "taxPendingAmount",
        )?
    };
    let lineage = if costs.iter().any(|c| c["containsLabor"] == "yes") {
        "yes"
    } else if draft.is_none()
        && !costs.is_empty()
        && costs.iter().all(|c| c["containsLabor"] == "no")
    {
        "no"
    } else {
        "unknown"
    };
    let labor_refs = costs
        .iter()
        .filter(|c| c["containsLabor"] != "no")
        .flat_map(|c| {
            c["allocationSourceMembers"]
                .as_array()
                .into_iter()
                .flatten()
                .map(|m| m["costRef"].clone())
                .chain(c["costRef"].as_object().map(|_| c["costRef"].clone()))
        })
        .collect::<Vec<_>>();
    let mut payload = json!({"schemaVersion":1,"producerVersion":1,"policyVersion":"r4h-operating-v1","policyHash":canonical_hash(&serde_json::from_str::<Value>(include_str!("../../../../tools/rust-r4ghi/joint-g1/effective-v2/policy-definition.json")).map_err(|_|Error::Internal)?)?,"contextId":ids.context_id.ok_or(Error::Internal)?,"projectId":project,"currency":currency,"sourceHash":"0".repeat(64),"scopeHash":scope_hash,"formalEligibility":{"status":if blockers.is_empty(){"eligible"}else{"missing-evidence"},"blockingReasonCodes":blockers,"missingEvidenceRefs":unclassified},"snapshot":{"id":ids.snapshot_id.ok_or(Error::Internal)?,"rowVersion":1,"version":"1","mode":mode,"snapshotAt":window.knowledge_cutoff,"knowledgeCutoff":window.knowledge_cutoff,"sourceWindowStart":window.source_window_start,"sourceWindowEnd":window.source_window_end,"periodKey":window.period_key,"businessTimezone":window.business_timezone,"supersedesSnapshotId":restates.as_ref().map(|r|r["id"].clone()),"periodEndSnapshotRef":period,"restatementRef":null,"restatesSnapshotRef":restates,"restatedSnapshotRef":null,"restatementStatus":if mode=="restated"{"confirmed"}else{"not-applicable"}},"baseline":{"baselinePackageRef":baseline.map(|b|sources::reference(Table::Baseline,b)).transpose()?,"selectionSource":baseline.map(|b|b["baseline_selection_source"].clone()).unwrap_or(json!("original")),"originalTechnicalPackageRef":draft.as_ref().map(|d|d["originalCostRef"].clone()),"handoverRef":draft.as_ref().map(|d|d["handoverBasisRef"].clone()),"handoverRebaselineRef":draft.as_ref().map(|d|d["handoverRebaselineRef"].clone()),"approvedChangeRefs":draft.as_ref().and_then(|d|d["approvedTransitions"].as_array()).map(|v|v.iter().map(|t|t["afterCostRef"].clone()).collect::<Vec<_>>()).unwrap_or_default(),"referencedBaselineVersion":baseline.map(|b|format!("{}:{}",b["id"],b["row_version"])).unwrap_or_else(||"unavailable".into()),"originalNetCost":original,"currentEffectiveNetCost":current},"contracts":contracts,"receipts":receipts,"costs":costs,"allocations":allocations,"taxTreatments":taxes,"pendingFacts":pending,"unclassifiedSourceRefs":unclassified,"upstreamCostConstraints":[],"scope":scope,"laborLineage":{"containsLabor":lineage,"basisRefs":labor_refs,"lineageHash":canonical_hash(&json!({"containsLabor":lineage,"basisRefs":labor_refs}))?},"metrics":{"effectiveContractAmounts":contract_total,"confirmedReceiptAmounts":receipt_total,"includedCostAmounts":included_total,"excludedCostAmounts":excluded_total,"taxPendingAmount":tax_pending,"costVarianceNet":facts::difference(&included_total["net"],&current,"costVarianceNet")?,"grossMarginNet":margin,"grossMarginRate":facts::ratio(&margin,&receipt_total["net"])? ,"receiptRatio":facts::ratio(&receipt_total["gross"],&contract_total["gross"])?}});
    payload["baseline"]["handoverRef"] = draft
        .as_ref()
        .and_then(|d| {
            catalog.all(Table::Handover).iter().find(|h| {
                h["basis_snapshot_id"] == d["handoverBasisRef"]["id"]
                    && h["producer_version"] == 1
                    && matches!(h["status"].as_str(), Some("confirmed" | "superseded"))
            })
        })
        .map(|h| sources::reference(Table::Handover, h))
        .transpose()?
        .unwrap_or(Value::Null);
    if first_period {
        // The selector proves the exact historical handover. A later handover
        // which reused this basis must not win an unordered catalog search.
        payload["baseline"]["handoverRef"] = draft
            .as_ref()
            .map(|d| d["historicalPeriodSelection"]["handoverRef"].clone())
            .unwrap_or(Value::Null);
    }
    let mut constraints = Vec::<Value>::new();
    if let Some(estimate) = draft
        .as_ref()
        .and_then(|d| catalog.by(Table::Estimate, "id", &d["currentCostRef"]["id"]))
        && (estimate["allow_next_stage"] == false
            || estimate["blocker_count"].as_i64().is_some_and(|n| n > 0))
    {
        constraints.push(json!({"ruleId":"project-technical-cost-allow-next-stage","ruleVersion":"actual-adopted-estimate-v1","action":"block","reasonCode":"adopted-technical-cost-blocked","basisRefs":[sources::reference(Table::Estimate,estimate)?]}));
    }
    payload["upstreamCostConstraints"] = json!(constraints);
    if lineage == "unknown"
        && let Some(draft) = draft.as_ref()
    {
        let references = payload["laborLineage"]["basisRefs"]
            .as_array_mut()
            .ok_or(Error::Internal)?;
        for key in ["originalCostRef", "currentCostRef"] {
            if draft[key].is_object() {
                references.push(draft[key].clone());
            }
        }
        references.sort_by_key(Value::to_string);
        references.dedup();
    }
    payload["laborLineage"]["lineageHash"] = json!(canonical_hash(
        &json!({"containsLabor":lineage,"basisRefs":payload["laborLineage"]["basisRefs"]})
    )?);
    if let Some(original) = historical_period.as_ref() {
        payload["baseline"] =
            serde_json::to_value(&original.baseline).map_err(|_| Error::Internal)?;
        payload["upstreamCostConstraints"] =
            serde_json::to_value(&original.upstream_cost_constraints)
                .map_err(|_| Error::Internal)?;
    }
    let mut context: OperatingSourceContext =
        serde_json::from_value(payload.take()).map_err(|_| Error::Internal)?;
    context.source_hash = hash::source_hash(&context)?.as_str().to_owned();
    Ok(context)
}

/// Existing period budgets are an immutable source-member inheritance. Their
/// present lifecycle row is never used to mint a replacement historical ref.
fn frozen_period_baseline_member(reference: &SourceRef, record: Value) -> Result<Value, Error> {
    if canonical_hash(&record)? != reference.payload_hash
        || sources::reference(Table::Baseline, &record)?
            != serde_json::to_value(reference).map_err(|_| Error::Internal)?
        || record["producer_version"] != 1
    {
        return Err(store::conflict("period_baseline_reconciliation_required"));
    }
    Ok(record)
}

#[cfg(test)]
mod historical_member273_tests {
    use super::*;
    #[test]
    fn old_period_inherits_exact_original_payload_instead_of_later_lifecycle() {
        let row = json!({"id":Uuid::from_u128(100),"project_id":Uuid::from_u128(1),"row_version":1,"producer_version":1,"is_current":true,"status":"active"});
        let frozen = sources::factual_payload(Table::Baseline, &row);
        let reference: SourceRef =
            serde_json::from_value(sources::reference(Table::Baseline, &row).unwrap()).unwrap();
        assert_eq!(
            frozen_period_baseline_member(&reference, frozen.clone()).unwrap(),
            frozen
        );
        let mut later = row;
        later["row_version"] = json!(2);
        later["status"] = json!("superseded");
        later["is_current"] = json!(false);
        assert!(
            frozen_period_baseline_member(
                &reference,
                sources::factual_payload(Table::Baseline, &later)
            )
            .is_err()
        );
        assert_eq!(
            frozen_period_baseline_member(&reference, frozen.clone()).unwrap(),
            frozen
        );
    }
}

fn cost_source_ref(catalog: &Catalog, cost: &Value) -> Result<Value, Error> {
    let table = match cost["source_type"].as_str() {
        Some("labor") => Table::Rate,
        Some("payment-record") => Table::Payment,
        Some("payable-record") => Table::Payable,
        Some("expense-record") => Table::Expense,
        Some("invoice-record") => Table::Invoice,
        _ => return Err(store::conflict("operating_cost_source_unknown")),
    };
    let row = catalog
        .by(table, "id", &cost["source_id"])
        .or_else(|| catalog.find(table, store::id(cost, "source_id").ok()?))
        .ok_or_else(|| store::conflict("operating_cost_source_missing"))?;
    sources::reference(table, row)
}

// Tax pending covers every registered cost retained in the frozen scope,
// including excluded principals. Classification is not a zero-tax proof.
// Allocation shares with a nonzero/unknown tax layer remain unknown unless a
// genuine project-local F producer has supplied this exact share's tax refs;
// never copy or ratio-scale a source project's whole pending assessment.
fn tax_assessment_missing(costs: &[Value], taxes: &[Value]) -> Result<bool, Error> {
    for cost in costs {
        if facts::cents(&cost["amounts"]["tax"])?.is_some_and(|value| value.cents() == 0) {
            continue;
        }
        let covered = cost["taxTreatmentRefs"].as_array().is_some_and(|refs| {
            refs.iter().any(|reference| {
                reference["kind"] == "AccountingTaxTreatmentSnapshot"
                    && taxes.iter().any(|tax| tax["taxTreatmentRef"] == *reference)
            })
        });
        if !covered {
            return Ok(true);
        }
    }
    Ok(false)
}

fn cost_tax_refs(catalog: &Catalog, cost: &Value) -> Result<Vec<Value>, Error> {
    catalog
        .all(Table::Tax)
        .iter()
        .filter(|t| {
            t["status"] == "active"
                && catalog
                    .by(Table::Evidence, "id", &t["governance_evidence_id"])
                    .and_then(|e| e["source_references"].as_array())
                    .is_some_and(|refs| {
                        refs.iter().any(|r| {
                            r["kind"] == "source"
                                && (((r["sourceType"] == "project-actual-cost-record"
                                    || r["sourceType"] == "source-cost-fact")
                                    && r["sourceId"] == cost["id"])
                                    || (r["sourceType"] == cost["source_type"]
                                        && r["sourceId"] == cost["source_id"]))
                        })
                    })
        })
        .map(|t| sources::reference(Table::Tax, t))
        .collect()
}

#[cfg(test)]
mod receipt_preparation_tests {
    use super::*;

    fn fixture() -> (Catalog, Uuid, Value, OperatingBusinessWindow) {
        let project = Uuid::from_u128(101);
        let contract = json!({"id":Uuid::from_u128(102),"project_id":project});
        let term = json!({"id":Uuid::from_u128(103),"contract_id":contract["id"],
            "source_preparation_id":Uuid::from_u128(104),"source_baseline_id":Uuid::from_u128(105),
            "source_readiness_id":Uuid::from_u128(106),"source_amendment_id":null,
            "snapshot_status":"superseded","payload_hash":"exact-approved-payload",
            "effective_at":"2026-10-01T00:00:00Z","currency_code":null,"row_version":3});
        let preparation = json!({"id":term["source_preparation_id"],"contract_id":contract["id"],
            "status":"activated","activated_snapshot_id":term["id"],
            "source_baseline_id":term["source_baseline_id"],"source_readiness_id":term["source_readiness_id"],
            "payload_hash":term["payload_hash"]});
        let binding = json!({"preparation_id":preparation["id"],"contract_id":contract["id"],
            "payload_hash":term["payload_hash"],"contract_amendment_id":null,"approval_record_id":Uuid::from_u128(107)});
        let approval = json!({"id":binding["approval_record_id"],"current_status":"approved",
            "approval_type":"contract-review","target_object_id":contract["id"]});
        let commercial = json!({"id":term["source_baseline_id"],"project_id":project,
            "baseline_status":"superseded","row_version":4,"currency_code":"CNY"});
        let mut catalog = Catalog::default();
        catalog.rows.insert(Table::Term, vec![term]);
        catalog.rows.insert(Table::Preparation, vec![preparation]);
        catalog.rows.insert(Table::ReviewBinding, vec![binding]);
        catalog.rows.insert(Table::Approval, vec![approval]);
        catalog.rows.insert(Table::Commercial, vec![commercial]);
        let cutoff = chrono::DateTime::parse_from_rfc3339("2026-11-07T00:00:00Z")
            .expect("fixed test cutoff")
            .with_timezone(&chrono::Utc);
        let window = OperatingBusinessWindow {
            business_cutoff: cutoff.date_naive(),
            knowledge_cutoff: cutoff,
            source_window_start: None,
            source_window_end: Some(cutoff.date_naive()),
            period_key: None,
            business_timezone: "Asia/Hong_Kong".into(),
        };
        (catalog, project, contract, window)
    }

    #[test]
    fn historical_terms_keep_their_actual_superseded_commercial_source() {
        let (catalog, project, contract, window) = fixture();
        let terms = receipt_basis_terms(&catalog, project, &contract, &window);
        assert_eq!(terms.len(), 1);
        assert_eq!(terms[0].0["snapshot_status"], "superseded");
        assert_eq!(
            terms[0].1.map(|basis| &basis["id"]),
            Some(&terms[0].0["source_baseline_id"])
        );
    }

    #[test]
    fn unrelated_terms_or_approval_payloads_are_not_selectable() {
        let (catalog, project, contract, window) = fixture();
        for table in [
            Table::Term,
            Table::Preparation,
            Table::ReviewBinding,
            Table::Approval,
        ] {
            let mut changed = catalog.clone();
            let row = &mut changed.rows.get_mut(&table).expect("fixture family")[0];
            match table {
                Table::Term | Table::Preparation => {
                    row["contract_id"] = json!(Uuid::from_u128(999))
                }
                Table::ReviewBinding => row["payload_hash"] = json!("different-approved-payload"),
                Table::Approval => row["target_object_id"] = json!(Uuid::from_u128(999)),
                _ => unreachable!(),
            }
            assert!(receipt_basis_terms(&changed, project, &contract, &window).is_empty());
        }
    }

    #[test]
    fn currency_members_cannot_use_foreign_draft_or_disagreeing_baselines() {
        let (catalog, project, contract, window) = fixture();
        for (field, value) in [
            ("project_id", json!(Uuid::from_u128(999))),
            ("baseline_status", json!("draft")),
            ("currency_code", Value::Null),
        ] {
            let mut changed = catalog.clone();
            changed
                .rows
                .get_mut(&Table::Commercial)
                .expect("fixture baseline")[0][field] = value;
            let terms = receipt_basis_terms(&changed, project, &contract, &window);
            assert_eq!(terms.len(), 1);
            assert!(terms[0].1.is_none());
        }
        let mut changed = catalog.clone();
        changed.rows.get_mut(&Table::Term).expect("fixture term")[0]["currency_code"] =
            json!("USD");
        assert!(
            receipt_basis_terms(&changed, project, &contract, &window)[0]
                .1
                .is_none()
        );
    }
}

#[cfg(test)]
mod tax_coverage_tests {
    use super::*;

    fn reference(n: u128) -> Value {
        json!({"kind":"AccountingTaxTreatmentSnapshot","id":Uuid::from_u128(n),"rowVersion":1,"payloadHash":"a".repeat(64)})
    }
    fn cost(tax: Option<&str>, references: Vec<Value>) -> Value {
        json!({"amounts":{"tax":match tax {
            Some(value)=>json!({"knowledge":"known","value":value}),
            None=>json!({"knowledge":"unknown","value":null})
        }},"taxTreatmentRefs":references})
    }
    fn assessed(reference: Value) -> Value {
        json!({"taxTreatmentRef":reference})
    }
    #[test]
    fn unrelated_assessment_cannot_cover_another_taxed_cost() {
        let tax = reference(2);
        let costs = vec![
            cost(Some("650.00"), vec![]),
            cost(Some("130.00"), vec![tax.clone()]),
        ];
        assert!(tax_assessment_missing(&costs, &[assessed(tax)]).expect("pure coverage"));
    }
    #[test]
    fn every_taxed_cost_needs_its_own_exact_admitted_reference() {
        let a = reference(1);
        let b = reference(2);
        let costs = vec![
            cost(Some("650.00"), vec![a.clone()]),
            cost(Some("130.00"), vec![b.clone()]),
        ];
        assert!(
            !tax_assessment_missing(&costs, &[assessed(a.clone()), assessed(b)]).expect("covered")
        );
        for (field, value) in [
            ("rowVersion", json!(2)),
            ("payloadHash", json!("b".repeat(64))),
            ("kind", json!("CostGovernanceEvidence")),
        ] {
            let mut stale = a.clone();
            stale[field] = value;
            assert!(
                tax_assessment_missing(
                    &[cost(Some("650.00"), vec![stale])],
                    &[assessed(a.clone())]
                )
                .expect("exact refs")
            );
        }
    }
    #[test]
    fn zero_tax_is_a_factual_zero_but_unknown_tax_is_not() {
        assert!(!tax_assessment_missing(&[cost(Some("0.00"), vec![])], &[]).expect("zero"));
        assert!(
            tax_assessment_missing(&[cost(None, vec![])], &[assessed(reference(2))])
                .expect("unknown")
        );
    }
    #[test]
    fn excluded_and_shared_costs_do_not_acquire_coverage_from_an_unrelated_project_assessment() {
        for role in ["direct-source", "allocation-share"] {
            let mut source = cost(Some("65.00"), vec![]);
            source["recognitionRole"] = json!(role);
            source["classification"] = json!({"decision":"exclude"});
            assert!(
                tax_assessment_missing(&[source], &[assessed(reference(2))])
                    .expect("scope preserved")
            );
        }
    }
    #[test]
    fn a_tax_relation_requires_the_real_source_kind_and_identity() {
        let input = json!({"id":Uuid::from_u128(9),"source_id":Uuid::from_u128(10),"source_type":"expense-record"});
        let tax = json!({"id":Uuid::from_u128(77),"row_version":1,"status":"active","governance_evidence_id":Uuid::from_u128(78)});
        let mut catalog = Catalog::default();
        catalog.rows.insert(Table::Tax, vec![tax]);
        let proof = json!({"id":Uuid::from_u128(78),"source_references":[{"kind":"source","sourceType":"expense-record","sourceId":input["source_id"]}]});
        catalog.rows.insert(Table::Evidence, vec![proof]);
        assert_eq!(
            cost_tax_refs(&catalog, &input)
                .expect("real expense source")
                .len(),
            1
        );
        catalog.rows.get_mut(&Table::Evidence).expect("evidence")[0]["source_references"][0]["sourceType"] =
            json!("project-stage-record");
        assert!(
            cost_tax_refs(&catalog, &input)
                .expect("wrong source kind")
                .is_empty()
        );
    }
}

#[cfg(test)]
mod foreign_fiscal_source84_tests {
    use super::*;

    #[test]
    fn foreign_fiscal_source84_exact_imported_parent_resolves_all_nonlabor_cost_kinds() {
        for (source_type, table, kind) in [
            ("expense-record", Table::Expense, "ExpenseRecord"),
            ("invoice-record", Table::Invoice, "InvoiceRecord"),
            ("payment-record", Table::Payment, "PaymentRecord"),
            ("payable-record", Table::Payable, "PayableRecord"),
        ] {
            let parent_id = Uuid::from_u128(20);
            let cost = json!({"source_type":source_type,"source_id":parent_id,"project_id":Uuid::from_u128(11)});
            let mut catalog = Catalog::default();
            catalog.rows.insert(table, vec![json!({"id":Uuid::from_u128(21),"row_version":2,"project_id":Uuid::from_u128(10)})]);
            assert!(
                cost_source_ref(&catalog, &cost).is_err(),
                "An unrelated local record cannot satisfy the foreign source ID"
            );
            catalog
                .rows
                .get_mut(&table)
                .expect("fixture table")
                .push(json!({"id":parent_id,"row_version":2,"project_id":Uuid::from_u128(11)}));
            let source = cost_source_ref(&catalog, &cost).expect("exact imported parent");
            assert_eq!(source["kind"], kind);
            assert_eq!(source["id"], parent_id.to_string());
            assert_eq!(source["rowVersion"], 2);
        }
    }

    #[test]
    fn foreign_fiscal_source84_imported_parent_is_never_an_own_unmapped_fact() {
        let project = Uuid::from_u128(10);
        let foreign = json!({"id":Uuid::from_u128(20),"project_id":Uuid::from_u128(11),"status":"confirmed","amount_including_tax":"1130.00"});
        let own = json!({"id":Uuid::from_u128(21),"project_id":project,"status":"confirmed","amount_including_tax":"1130.00"});
        assert!(!locally_registered_upstream(&foreign, project));
        assert!(
            locally_registered_upstream(&own, project),
            "Real own-project unmapped facts must retain their blocking/projection path"
        );
        assert!(!locally_registered_upstream(
            &json!({"project_id":null}),
            project
        ));
    }
}

#[cfg(test)]
mod restatement_cutoff344_tests {
    use super::*;
    use crate::project_cost_governance::{AllocationShare, allocate_source_layers};
    use crate::project_operating_common::model::{
        CreateOperatingRestatementRequestScope, OperatingPreparationIntent,
    };
    use chrono::{DateTime, NaiveDate, Utc};

    // Complete synthetic F graph, copied from the already registered qualifier
    // fixture. It is not a claim of any real project, source or business write.
    fn instant(value: &Value) -> Result<DateTime<Utc>, Error> {
        DateTime::parse_from_rfc3339(value.as_str().ok_or(Error::Internal)?)
            .map(|v| v.with_timezone(&Utc))
            .map_err(|_| Error::Internal)
    }
    fn uid(n: u128) -> Value {
        json!(Uuid::from_u128(n))
    }
    fn money(n: i128, scale: u32) -> Value {
        let base = 10_i128.pow(scale);
        json!(format!(
            "{}.{:0width$}",
            n / base,
            n % base,
            width = scale as usize
        ))
    }
    fn now() -> DateTime<Utc> {
        instant(&json!("2026-11-10T00:00:00Z")).unwrap()
    }
    fn cutoff() -> NaiveDate {
        NaiveDate::from_ymd_opt(2026, 11, 8).unwrap()
    }
    fn insert(c: &mut Catalog, t: Table, v: Value) {
        c.rows.entry(t).or_default().push(v);
    }
    fn proof(
        c: &mut Catalog,
        target: &Value,
        kind: &str,
        id: u128,
        payload: Value,
        time: &str,
        project: Value,
    ) {
        insert(
            c,
            Table::Evidence,
            json!({"id":uid(id),"target_type":kind,"target_id":target["id"],"project_id":project,
        "schema_version":1,"evidence_kind":"source-facts","frozen_payload":payload,"payload_hash":canonical_hash(&payload).unwrap(),
        "reason":"Actual governed allocation","actor_id":uid(90),"request_id":format!("fixture-{id}"),"created_at":time}),
        );
    }
    fn fixture(replacement: bool) -> (Catalog, Value) {
        let mut c = Catalog::default();
        for (n, net, tax, day) in [(1, 10, 1, "2026-10-01"), (2, 1, 0, "2026-11-08")] {
            let original = json!({"id":uid(n+50),"row_version":1});
            insert(
                &mut c,
                Table::Cost,
                json!({"id":uid(n),"project_id":uid(10),"row_version":1,"record_status":"confirmed",
            "source_type":"expense-record","source_id":uid(n+50),"currency":"CNY","occurred_on":day,
            "source_basis":{"sourceRowVersion":1,"sourcePayload":original},
            "amount_excluding_tax":money(net,2),"tax_cost_amount":money(tax,2),"amount_including_tax":money(net+tax,2),
            "created_at":"2026-11-08T00:00:00Z","updated_at":"2026-11-08T00:00:00Z"}),
            );
        }
        batch(&mut c, 100, None, "2026-11-09T00:00:00Z", [1, 1]);
        if replacement {
            for table in [Table::AllocationBasis, Table::AllocationResult] {
                for row in c.rows.get_mut(&table).unwrap() {
                    row["status"] = json!("superseded");
                    row["row_version"] = json!(2);
                    row["updated_at"] = json!("2026-11-09T01:00:00Z");
                }
            }
            for s in c.rows.get_mut(&Table::AllocationSource).unwrap() {
                s["is_current"] = json!(false);
            }
            batch(&mut c, 200, Some(100), "2026-11-09T01:00:00Z", [2, 1]);
        }
        let id = if replacement { 201 } else { 101 };
        let r = c
            .find(Table::AllocationResult, Uuid::from_u128(id))
            .unwrap()
            .clone();
        (c, r)
    }
    fn batch(c: &mut Catalog, id: u128, previous: Option<u128>, time: &str, weights: [i128; 2]) {
        let mut frozen = Vec::new();
        for cost in c.all(Table::Cost).to_vec() {
            let original = &cost["source_basis"]["sourcePayload"];
            let hash = canonical_hash(original).unwrap();
            let source = json!({"sourceType":cost["source_type"],"sourceId":cost["source_id"],"sourceRowVersion":1,
            "sourcePayload":original,
            "currency":"CNY","occurredOn":cost["occurred_on"],"amountExcludingTax":cost["amount_excluding_tax"],
            "taxCostAmount":cost["tax_cost_amount"],"amountIncludingTax":cost["amount_including_tax"],
            "governanceVersionProof":{"costRecordId":cost["id"],"sourceType":cost["source_type"],"sourceId":cost["source_id"],
                "capturedVersion":1,"capturedPayloadHash":hash,"previousCertifiedVersion":1,"previousPayloadHash":hash,
                "currentVersion":1,"currentPayloadHash":hash,"sourcePayload":original,"reason":"unchanged"}});
            let payload = json!({"cost":cost,"source":source});
            insert(
                c,
                Table::AllocationSource,
                json!({"basis_id":uid(id),"cost_record_id":cost["id"],"cost_row_version":1,
            "source_type":cost["source_type"],"source_id":cost["source_id"],"source_row_version":1,"currency":"CNY",
            "amount_excluding_tax":cost["amount_excluding_tax"],"tax_cost_amount":cost["tax_cost_amount"],"amount_including_tax":cost["amount_including_tax"],
            "source_payload":payload,"source_payload_hash":canonical_hash(&payload).unwrap(),"is_current":true,"created_at":time}),
            );
            frozen.push(payload);
        }
        use sha2::{Digest, Sha256};
        let ids = [
            Uuid::from_u128(1).to_string(),
            Uuid::from_u128(2).to_string(),
        ]
        .join("|");
        let scope_hash = Sha256::digest(ids.as_bytes())
            .iter()
            .map(|b| format!("{b:02x}"))
            .collect::<String>();
        let basis = json!({"id":uid(id),"row_version":1,"status":"active","governance_schema_version":1,"currency":"CNY",
        "allocation_algorithm":"largest-remainder-cents-v1","replacement_operation_id":uid(id+50),"replacement_reason":previous.map(|_|"Actual correction"),
        "supersedes_id":previous.map(Uuid::from_u128),"governance_evidence_id":uid(id+10),"created_at":time,"updated_at":time,"effective_at":time,"created_by":uid(90),
        "measurement_basis":"including-tax","source_amount_excluding_tax":"0.11","source_tax_cost_amount":"0.01","source_amount_including_tax":"0.12","measurement_amount":"0.12",
        "source_cost_scope_key":format!("cost-scope:{scope_hash}")});
        let items = json!([{"projectId":uid(10),"allocationWeight":money(weights[0],6)},{"projectId":uid(20),"allocationWeight":money(weights[1],6)}]);
        let policy = json!({"id":"selected-measurement-first","version":2,"measurementBasis":"including-tax",
        "grossComponents":"gross-cap-net-tax-complement","tieBreak":"project-uuid-bytes-ascending","secondaryQuota":"bounded-largest-deficit"});
        let transitions = frozen
            .iter()
            .map(|s| s["source"]["governanceVersionProof"].clone())
            .collect::<Vec<_>>();
        let payload = json!({"sources":frozen,"sourceVersionTransitions":transitions,"measurementBasis":"including-tax","totals":["0.11","0.01","0.12"],"currency":"CNY",
        "projectShares":items,"algorithm":"largest-remainder-cents-v1","predecessorBasisId":basis["supersedes_id"],"allocationPolicy":policy});
        proof(
            c,
            &basis,
            "SharedCostAllocationBasis",
            id + 10,
            payload,
            time,
            Value::Null,
        );
        insert(c, Table::AllocationBasis, basis);
        let shares = [
            AllocationShare {
                project: *Uuid::from_u128(10).as_bytes(),
                weight: weights[0],
            },
            AllocationShare {
                project: *Uuid::from_u128(20).as_bytes(),
                weight: weights[1],
            },
        ];
        for (i, a) in allocate_source_layers([Some(11), Some(1), Some(12)], &shares, 2)
            .unwrap()
            .iter()
            .enumerate()
        {
            let result = json!({"id":uid(id+i as u128+1),"basis_id":uid(id),"project_id":json!(Uuid::from_bytes(a.project)),"row_version":1,"status":"active","governance_schema_version":1,
            "currency":"CNY","replacement_operation_id":uid(id+50),"supersedes_id":previous.map(|p|Uuid::from_u128(p+i as u128+1)),"governance_evidence_id":uid(id+20+i as u128),
            "created_at":time,"updated_at":time,"effective_at":time,"created_by":uid(90),"allocation_weight":money(weights[i],6),
            "allocated_amount_excluding_tax":a.layers[0].map(|n|money(n,2)),"allocated_tax_cost_amount":a.layers[1].map(|n|money(n,2)),"allocated_amount_including_tax":a.layers[2].map(|n|money(n,2)),
            "allocated_amount":money(a.amount,2),"allocation_ratio":money(a.ratio,6),"residual_minor_units":a.residual});
            let payload = json!({"basisId":uid(id),"basisEvidenceId":uid(id+10),"allocation":items[i],"allocationPolicy":policy,"sourceVersionTransitions":transitions,
            "layers":a.layers.map(|v|v.map(|n|money(n,2))),"amount":money(a.amount,2),"ratio":money(a.ratio,6),"residualMinorUnits":a.residual,"predecessorResultId":result["supersedes_id"]});
            proof(
                c,
                &result,
                "SharedCostAllocationResult",
                id + 20 + i as u128,
                payload,
                time,
                result["project_id"].clone(),
            );
            insert(c, Table::AllocationResult, result);
        }
    }

    fn mutate(c: &mut Catalog, table: Table, id: u128, f: impl FnOnce(&mut Value)) {
        f(c.rows
            .get_mut(&table)
            .unwrap()
            .iter_mut()
            .find(|r| r["id"] == uid(id))
            .unwrap());
    }
    fn actual_source_day(c: &mut Catalog, id: u128, day: &str) {
        mutate(c, Table::Cost, id, |r| r["occurred_on"] = json!(day));
        for s in c.rows.get_mut(&Table::AllocationSource).unwrap() {
            if s["cost_record_id"] == uid(id) {
                s["source_payload"]["cost"]["occurred_on"] = json!(day);
                s["source_payload"]["source"]["occurredOn"] = json!(day);
                s["source_payload_hash"] = json!(canonical_hash(&s["source_payload"]).unwrap());
            }
        }
        let snapshots = c.all(Table::AllocationSource).to_vec();
        for e in c.rows.get_mut(&Table::Evidence).unwrap() {
            if e["target_type"] == "SharedCostAllocationBasis" {
                e["frozen_payload"]["sources"] = json!(
                    snapshots
                        .iter()
                        .filter(|s| s["basis_id"] == e["target_id"])
                        .map(|s| s["source_payload"].clone())
                        .collect::<Vec<_>>()
                );
                e["payload_hash"] = json!(canonical_hash(&e["frozen_payload"]).unwrap());
            }
        }
    }

    fn window() -> OperatingBusinessWindow {
        OperatingBusinessWindow {
            business_cutoff: cutoff(),
            knowledge_cutoff: now(),
            source_window_start: None,
            source_window_end: Some(cutoff()),
            period_key: None,
            business_timezone: "Asia/Hong_Kong".into(),
        }
    }
    fn future_fixture(replacement: bool) -> (Catalog, Value) {
        let (mut c, r) = fixture(replacement);
        actual_source_day(&mut c, 2, "2026-11-09");
        (c, r)
    }
    fn classify(c: &Catalog, r: &Value) -> Result<RestatementAllocationWindow, Error> {
        restatement_allocation_window(c, r, &window())
    }
    fn restatement_hash(c: &Catalog) -> String {
        let intent = OperatingPreparationIntent::Restatement {
            scope: CreateOperatingRestatementRequestScope::Live,
            restates_snapshot: ExpectedRef {
                kind: "OperatingSnapshot".into(),
                id: Uuid::from_u128(900),
                expected_version: 1,
                payload_hash: "a".repeat(64),
            },
            period_end_snapshot: None,
            correction_source_refs: vec![],
        };
        super::super::preparation::input_hash(
            Uuid::from_u128(10),
            &intent,
            &window(),
            &json!({"id":uid(10),"row_version":1}),
            c,
            &[],
        )
        .unwrap()
    }

    #[test]
    fn restatement_keeps_legal_in_window_create_and_replacement() {
        for replacement in [false, true] {
            let (c, r) = fixture(replacement);
            assert_eq!(
                classify(&c, &r).unwrap(),
                RestatementAllocationWindow::InWindow
            );
            assert_eq!(
                r["effective_at"],
                if replacement {
                    "2026-11-09T01:00:00Z"
                } else {
                    "2026-11-09T00:00:00Z"
                }
            );
        }
    }

    #[test]
    fn in_window_restatement_does_not_gain_first_period_policy_requirement() {
        let (mut c, r) = fixture(false);
        for e in c.rows.get_mut(&Table::Evidence).unwrap() {
            e["frozen_payload"]
                .as_object_mut()
                .unwrap()
                .remove("allocationPolicy");
            e["payload_hash"] = json!(canonical_hash(&e["frozen_payload"]).unwrap());
        }
        assert!(late_allocation::qualify(&c, &r, cutoff(), now()).is_err());
        assert_eq!(
            classify(&c, &r).unwrap(),
            RestatementAllocationWindow::InWindow
        );
    }

    #[test]
    fn proven_future_mixed_batch_is_excluded_whole_without_mutating_sources() {
        for replacement in [false, true] {
            let (c, r) = future_fixture(replacement);
            let before = c.members().unwrap();
            assert_eq!(
                classify(&c, &r).unwrap(),
                RestatementAllocationWindow::FutureBusiness
            );
            assert_eq!(c.members().unwrap(), before);
            assert_eq!(
                c.all(Table::AllocationResult).len(),
                if replacement { 4 } else { 2 }
            );
            assert_eq!(
                c.all(Table::AllocationSource).len(),
                if replacement { 4 } else { 2 }
            );
        }
    }

    #[test]
    fn future_does_not_hide_a_later_missing_source_in_either_row_order() {
        for reverse in [false, true] {
            let (mut c, r) = future_fixture(false);
            c.rows
                .get_mut(&Table::Cost)
                .unwrap()
                .retain(|cost| cost["id"] != uid(1));
            if reverse {
                c.rows.get_mut(&Table::AllocationSource).unwrap().reverse();
            }
            assert!(classify(&c, &r).is_err());
        }
    }

    #[test]
    fn future_does_not_hide_bad_date_in_either_row_order() {
        for reverse in [false, true] {
            let (mut c, r) = future_fixture(false);
            mutate(&mut c, Table::Cost, 1, |v| v["occurred_on"] = Value::Null);
            if reverse {
                c.rows.get_mut(&Table::AllocationSource).unwrap().reverse();
            }
            assert!(classify(&c, &r).is_err());
        }
    }

    #[test]
    fn empty_missing_basis_and_missing_frozen_member_never_mean_future() {
        let (mut empty, r) = future_fixture(false);
        empty
            .rows
            .get_mut(&Table::AllocationSource)
            .unwrap()
            .clear();
        assert!(classify(&empty, &r).is_err());
        let (mut no_basis, r) = future_fixture(false);
        no_basis.rows.remove(&Table::AllocationBasis);
        assert!(classify(&no_basis, &r).is_err());
        let (mut missing, r) = future_fixture(false);
        // Retain the future source, but lose an earlier physical member that is
        // still declared by the frozen source set. Complete qualification fails.
        missing
            .rows
            .get_mut(&Table::AllocationSource)
            .unwrap()
            .retain(|s| s["cost_record_id"] == uid(2));
        assert!(classify(&missing, &r).is_err());
    }

    #[test]
    fn future_requires_complete_peer_and_ancestor_identity() {
        let (mut no_peer, r) = future_fixture(false);
        no_peer
            .rows
            .get_mut(&Table::AllocationResult)
            .unwrap()
            .retain(|p| p["id"] == r["id"]);
        assert!(classify(&no_peer, &r).is_err());
        let (mut no_parent, r) = future_fixture(true);
        no_parent
            .rows
            .get_mut(&Table::AllocationBasis)
            .unwrap()
            .retain(|p| p["id"] != uid(100));
        assert!(classify(&no_parent, &r).is_err());
        let (mut wrong_parent, r) = future_fixture(true);
        mutate(&mut wrong_parent, Table::AllocationResult, 201, |p| {
            p["supersedes_id"] = uid(102)
        });
        assert!(classify(&wrong_parent, &r).is_err());
    }

    #[test]
    fn future_requires_real_evidence_versions_money_and_currency() {
        for defect in 0..5 {
            let (mut c, r) = future_fixture(false);
            match defect {
                0 => {
                    c.rows.get_mut(&Table::Evidence).unwrap().remove(0);
                }
                1 => mutate(&mut c, Table::Evidence, 110, |p| {
                    p["payload_hash"] = json!("b".repeat(64))
                }),
                2 => mutate(&mut c, Table::Cost, 2, |p| p["row_version"] = json!(2)),
                3 => mutate(&mut c, Table::AllocationResult, 102, |p| {
                    p["allocated_tax_cost_amount"] = json!("100.00")
                }),
                _ => mutate(&mut c, Table::AllocationResult, 102, |p| {
                    p["currency"] = json!("USD")
                }),
            }
            assert!(classify(&c, &r).is_err(), "defect {defect}");
        }
    }

    #[test]
    fn future_gate_uses_each_actual_knowledge_window_without_get_cache() {
        let (c, r) = future_fixture(false);
        let mut before_birth = window();
        before_birth.knowledge_cutoff = instant(&json!("2026-11-08T23:59:59Z")).unwrap();
        assert!(restatement_allocation_window(&c, &r, &before_birth).is_err());
        assert_eq!(
            classify(&c, &r).unwrap(),
            RestatementAllocationWindow::FutureBusiness
        );
        // A later locked observation must still inspect current data, rather
        // than reuse the success of the previous coherent GET.
        let mut after_get = c.clone();
        mutate(&mut after_get, Table::Cost, 2, |p| {
            p["row_version"] = json!(2)
        });
        assert!(classify(&after_get, &r).is_err());
    }

    #[test]
    fn eligible_proof_cannot_authorize_a_future_scan_disagreement() {
        let (c, r) = fixture(false);
        let actual = late_allocation::qualify(&c, &r, cutoff(), now()).unwrap();
        assert!(matches!(&actual, Qualification::Eligible(_)));
        assert!(confirmed_future_allocation(actual).is_err());
    }

    #[test]
    fn actual_restatement_input_hash_binds_supported_versions_current_and_payload() {
        let (original, r) = future_fixture(false);
        let before_hash = restatement_hash(&original);
        let before_result = sources::reference(Table::AllocationResult, &r).unwrap();
        for change in 0..5 {
            let mut c = original.clone();
            match change {
                0 => mutate(&mut c, Table::AllocationBasis, 100, |p| {
                    p["row_version"] = json!(2);
                    p["updated_at"] = json!("2026-11-09T02:00:00Z");
                    p["status"] = json!("superseded");
                }),
                1 => mutate(&mut c, Table::AllocationResult, 101, |p| {
                    p["row_version"] = json!(2);
                    p["updated_at"] = json!("2026-11-09T02:00:00Z");
                    p["is_included_in_project_cost"] = json!(true);
                }),
                2 => {
                    c.rows.get_mut(&Table::AllocationSource).unwrap()[0]["is_current"] =
                        json!(false)
                }
                3 => mutate(&mut c, Table::Cost, 2, |p| {
                    p["row_version"] = json!(2);
                    p["record_status"] = json!("included");
                    p["updated_at"] = json!("2026-11-09T02:00:00Z");
                }),
                _ => {
                    let mut proof = c.all(Table::Evidence)[0].clone();
                    proof["id"] = uid(999);
                    proof["request_id"] = json!("new-real-append");
                    insert(&mut c, Table::Evidence, proof);
                }
            }
            assert_ne!(restatement_hash(&c), before_hash, "change {change}");
            if change == 1 {
                assert_ne!(
                    sources::reference(
                        Table::AllocationResult,
                        c.find(Table::AllocationResult, Uuid::from_u128(101))
                            .unwrap()
                    )
                    .unwrap(),
                    before_result
                );
            }
        }
        let mut payload_change = original.clone();
        let member = &mut payload_change
            .rows
            .get_mut(&Table::AllocationSource)
            .unwrap()[0];
        member["source_payload"]["source"]["currency"] = json!("USD");
        member["source_payload_hash"] = json!(canonical_hash(&member["source_payload"]).unwrap());
        assert_ne!(restatement_hash(&payload_change), before_hash);
        assert!(classify(&payload_change, &r).is_err());
    }

    #[test]
    fn real_dispatch_excludes_future_source_when_f_clock_is_equal_or_before_cutoff() {
        for business_cutoff in [
            NaiveDate::from_ymd_opt(2026, 11, 9).unwrap(),
            NaiveDate::from_ymd_opt(2026, 11, 10).unwrap(),
        ] {
            let (mut c, r) = fixture(false);
            // Lawful synthetic future-dated expense source; retain F's original
            // real production clock. Neither result nor source dates are moved
            // backwards to turn future business into late in-window business.
            actual_source_day(&mut c, 2, "2026-11-11");
            let original_result = r.clone();
            let mut w = window();
            w.business_cutoff = business_cutoff;
            w.source_window_end = Some(business_cutoff);
            w.knowledge_cutoff = instant(&json!("2026-11-12T00:00:00Z")).unwrap();
            assert!(sources::business_day(&r["effective_at"]).unwrap() <= w.business_cutoff);
            let dispatched = allocation_window_for_timing(
                &c,
                Table::AllocationResult,
                &r,
                &w,
                Timing::Restatement,
            )
            .unwrap();
            assert_eq!(
                dispatched.as_ref().unwrap(),
                &RestatementAllocationWindow::FutureBusiness
            );
            // This is the same actual reason helper used by source_rows, and
            // the same dispatch/result used before build's old effective gate.
            assert_eq!(
                restatement_window_reason(&dispatched, false),
                Some("outside-business-cutoff")
            );
            assert_eq!(r, original_result);
            assert_eq!(c.all(Table::AllocationSource).len(), 2);
            assert_eq!(c.all(Table::AllocationResult).len(), 2);
        }
    }

    #[test]
    fn real_dispatch_blocks_missing_source_before_the_f_clock_gate() {
        let (mut c, r) = fixture(false);
        actual_source_day(&mut c, 2, "2026-11-11");
        c.rows
            .get_mut(&Table::Cost)
            .unwrap()
            .retain(|cost| cost["id"] != uid(1));
        let mut w = window();
        w.business_cutoff = NaiveDate::from_ymd_opt(2026, 11, 10).unwrap();
        w.knowledge_cutoff = instant(&json!("2026-11-12T00:00:00Z")).unwrap();
        for reverse in [false, true] {
            if reverse {
                c.rows.get_mut(&Table::AllocationSource).unwrap().reverse();
            }
            let dispatched = allocation_window_for_timing(
                &c,
                Table::AllocationResult,
                &r,
                &w,
                Timing::Restatement,
            )
            .unwrap();
            assert!(dispatched.is_err());
            assert_eq!(restatement_window_reason(&dispatched, false), None);
        }
    }

    #[test]
    fn shared_dispatch_leaves_realtime_first_period_and_other_source_kinds_unchanged() {
        let (c, r) = fixture(false);
        for timing in [Timing::Realtime, Timing::FirstPeriod(now())] {
            assert!(
                allocation_window_for_timing(&c, Table::AllocationResult, &r, &window(), timing)
                    .is_none()
            );
        }
        assert!(
            allocation_window_for_timing(&c, Table::Cost, &r, &window(), Timing::Restatement)
                .is_none()
        );
        let dispatched = allocation_window_for_timing(
            &c,
            Table::AllocationResult,
            &r,
            &window(),
            Timing::Restatement,
        )
        .unwrap();
        assert_eq!(
            dispatched.as_ref().unwrap(),
            &RestatementAllocationWindow::InWindow
        );
        assert_eq!(restatement_window_reason(&dispatched, false), None);
        assert_eq!(
            restatement_window_reason(&dispatched, true),
            Some("late-produced-allocation-full-in-window")
        );
    }
}
