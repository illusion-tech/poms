use super::{
    contract_scope::{self, Term},
    model,
};
use crate::{
    approval_common::CommonSession,
    contract_support::Error,
    project_lifecycle::facts::id,
    shared::generated::{
        CommissionPayoutStage as Stage, CommissionPayoutTier as Tier,
        ProjectReceiptJudgmentMode as Mode,
    },
};
use rust_decimal::{Decimal, RoundingStrategy};
use serde_json::Value;
use std::{collections::BTreeSet, str::FromStr};
use uuid::Uuid;

pub(super) struct Source {
    pub freeze: Value,
    pub binding: Option<Value>,
    pub review: Option<Value>,
    pub terms: Vec<Term>,
    pub mode: Mode,
    pub raised: BTreeSet<Uuid>,
    pub released: BTreeSet<Uuid>,
}

pub(super) fn money(row: &Value, field: &str) -> Result<Decimal, Error> {
    row[field]
        .as_str()
        .ok_or_else(|| Error::Conflict(format!("{field}金额未知，不能按零处理。")))
        .and_then(|raw| {
            model::amount(raw).map_err(|_| Error::Conflict(format!("{field}不是有效金额。")))
        })
}
pub(super) fn fraction(row: &Value, field: &str) -> Result<Decimal, Error> {
    let value = row[field]
        .as_str()
        .and_then(|s| Decimal::from_str(s).ok())
        .filter(|v| *v >= Decimal::ZERO && *v <= Decimal::ONE)
        .ok_or_else(|| Error::Conflict(format!("合同{field}比例未明确。")))?;
    Ok(value)
}
pub(super) fn rounded(value: Decimal) -> Decimal {
    value.round_dp_with_strategy(2, RoundingStrategy::MidpointAwayFromZero)
}
pub(super) fn blocked(value: &Value, key: &str, review_blocks: bool) -> bool {
    value[key].as_str().is_some_and(|s| {
        let s = s.trim().to_ascii_lowercase();
        s == "block"
            || s.starts_with("block-")
            || (review_blocks && (s == "review" || s.starts_with("review-")))
    })
}

pub(super) async fn source(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    stage: Stage,
) -> Result<Source, Error> {
    load_source(session, project, stage, true).await
}

pub(super) async fn settlement_source(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
) -> Result<Source, Error> {
    load_source(session, project, Stage::Final, false).await
}

async fn load_source(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    stage: Stage,
    enforce_eligibility: bool,
) -> Result<Source, Error> {
    if enforce_eligibility {
        let p = crate::project_lifecycle::facts::project(session, project, false).await?;
        if !matches!(
            p["current_stage"].as_str(),
            Some("execution" | "acceptance" | "completed" | "conditional-completed")
        ) || matches!(p["status"].as_str(), Some("blocked" | "closed"))
        {
            return Err(Error::Unprocessable(
                "尚未进入实际实施阶段或项目存在经营阻断。".into(),
            ));
        }
    }
    let freeze: Value = sqlx::query_scalar("SELECT to_jsonb(a) FROM poms.commission_role_assignment a WHERE project_id=$1 AND is_current AND status='frozen' FOR SHARE")
        .bind(project).fetch_optional(&mut *session.connection).await?
        .ok_or_else(||Error::Unprocessable("缺少当前已冻结角色分配。".into()))?;
    let handover = id(&freeze, "source_handover_id")
        .map_err(|_| Error::Conflict("冻结角色缺少实际移交来源。".into()))?;
    let baseline = id(&freeze, "effective_handover_baseline_snapshot_id")
        .map_err(|_| Error::Conflict("冻结角色缺少合同基线来源。".into()))?;
    let valid: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.project_handover WHERE id=$1 AND project_id=$2 AND status='confirmed' AND is_current AND effective_handover_baseline_snapshot_id=$3)")
        .bind(handover).bind(project).bind(baseline).fetch_one(&mut *session.connection).await?;
    if !valid {
        return Err(Error::Conflict("冻结角色与当前已确认移交不一致。".into()));
    }
    let (terms, mode) = contract_scope::load(session, project, &freeze).await?;
    if freeze["producer_version"] == 1 && enforce_eligibility {
        crate::commission_assignment::require_current_frozen(
            session,
            project,
            id(&freeze, "id")?,
            None,
        )
        .await?;
    }
    if !terms.iter().any(|t| t.snapshot == baseline) {
        return Err(Error::Conflict("兼容基线不属于当前冻结合同集合。".into()));
    }
    let selected_stage = if stage == Stage::Retention {
        "final"
    } else {
        stage.as_str()
    };
    let binding: Option<Value> = sqlx::query_scalar("SELECT to_jsonb(b) FROM poms.operating_signal_gate_binding b WHERE project_id=$1 AND gate_stage_type=$2 AND status='active' ORDER BY generated_at DESC,id LIMIT 1 FOR SHARE")
        .bind(project).bind(selected_stage).fetch_optional(&mut *session.connection).await?;
    let review = if let Some(binding) = &binding {
        sqlx::query_scalar("SELECT to_jsonb(r) FROM poms.commission_gate_review_record r WHERE binding_id=$1 AND status='active' ORDER BY handled_at DESC,created_at DESC,id LIMIT 1 FOR SHARE")
            .bind(id(binding,"id")?).fetch_optional(&mut *session.connection).await?
    } else {
        None
    };
    if matches!(stage, Stage::Final | Stage::Retention) && (binding.is_none() || review.is_none()) {
        return Err(Error::Unprocessable(
            "最终发放/质保金缺少当前实际经营评审。".into(),
        ));
    }
    if enforce_eligibility
        && (binding
            .as_ref()
            .is_some_and(|b| blocked(b, "binding_action", stage == Stage::Retention))
            || review
                .as_ref()
                .is_some_and(|r| blocked(r, "gate_review_decision", stage == Stage::Retention)))
    {
        return Err(Error::Unprocessable("当前经营评审不允许本次发放。".into()));
    }
    let open: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.commission_freeze_dispute_record WHERE freeze_version_id=$1 AND status='submitted')")
        .bind(id(&freeze,"id")?).fetch_one(&mut *session.connection).await?;
    if enforce_eligibility && open {
        return Err(Error::Unprocessable("冻结版本仍有未收口争议。".into()));
    }
    let mut source = Source {
        freeze,
        binding,
        review,
        terms,
        mode,
        raised: BTreeSet::new(),
        released: BTreeSet::new(),
    };
    let releases:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(r) FROM poms.commission_low_down_payment_release r WHERE project_id=$1 AND freeze_version_id=$2")
        .bind(project).bind(id(&source.freeze,"id")?).fetch_all(&mut *session.connection).await?;
    for release in releases {
        if !release_applies(&source, &release)? {
            continue;
        }
        for contract in release["contract_ids"].as_array().ok_or(Error::Internal)? {
            let contract = contract
                .as_str()
                .and_then(|v| Uuid::parse_str(v).ok())
                .ok_or(Error::Internal)?;
            if release["decision"] == "release-standard" {
                source.released.insert(contract);
            } else {
                source.raised.insert(contract);
            }
        }
    }
    Ok(source)
}

pub(super) fn release_applies(source: &Source, release: &Value) -> Result<bool, Error> {
    if release["freeze_version_id"] != source.freeze["id"]
        || release["freeze_row_version"] != source.freeze["row_version"]
        || release["source_handover_id"] != source.freeze["source_handover_id"]
        || release["source_contract_scope"] != contract_scope::references(&source.terms)
        || release["criteria"]["receiptJudgmentMode"] != source.mode.as_str()
    {
        return Ok(false);
    }
    let threshold = if release["decision"] == "release-standard" {
        Decimal::new(50, 2)
    } else if release["decision"] == "raise-first-cap" {
        Decimal::new(20, 2)
    } else {
        return Err(Error::Conflict("未知的管理层批准决定。".into()));
    };
    for contract in release["contract_ids"].as_array().ok_or(Error::Internal)? {
        let contract = contract
            .as_str()
            .and_then(|v| Uuid::parse_str(v).ok())
            .ok_or(Error::Internal)?;
        let Some(term) = source.terms.iter().find(|t| t.contract == contract) else {
            return Ok(false);
        };
        if term.down >= Decimal::new(20, 2)
            || !contract_scope::receipt_eligible(&source.terms, source.mode, term, threshold)?
        {
            return Ok(false);
        }
    }
    Ok(true)
}

pub(super) async fn stage_eligible(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    stage: Stage,
    source: &Source,
) -> Result<(), Error> {
    if stage == Stage::Retention {
        return Ok(());
    }
    if !source
        .terms
        .iter()
        .map(|term| stage_contract_eligible(source, term, stage))
        .collect::<Result<Vec<_>, _>>()?
        .into_iter()
        .any(|v| v)
    {
        return Err(Error::Unprocessable(
            "当前实际回款未达到本阶段发放条件。".into(),
        ));
    }
    if stage == Stage::Second {
        let accepted: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.acceptance_record WHERE project_id=$1 AND status='confirmed' AND acceptance_type IN ('stage-outcome','stage-acceptance') AND acceptance_result='accepted' AND confirmed_at IS NOT NULL AND btrim(evidence_summary)<>'')")
            .bind(project).fetch_one(&mut *session.connection).await?;
        if !accepted {
            return Err(Error::Unprocessable(
                "第二阶段缺少已确认且有证据摘要的阶段验收。".into(),
            ));
        }
    }
    Ok(())
}

pub(super) fn stage_contract_eligible(
    source: &Source,
    term: &Term,
    stage: Stage,
) -> Result<bool, Error> {
    if stage == Stage::Retention {
        return Ok(true);
    }
    if stage == Stage::Final && source.mode == Mode::ProjectAggregate {
        let required = contract_scope::sum(
            source
                .terms
                .iter()
                .map(|t| {
                    t.amount
                        .checked_mul(Decimal::ONE - t.retention)
                        .ok_or(Error::Internal)
                })
                .collect::<Result<Vec<_>, _>>()?,
        )?;
        return Ok(contract_scope::sum(source.terms.iter().map(|t| t.receipts))? >= required);
    }
    let threshold = match stage {
        Stage::First => Decimal::new(20, 2),
        Stage::Second => Decimal::new(80, 2),
        _ => Decimal::ONE - term.retention,
    };
    contract_scope::receipt_eligible(&source.terms, source.mode, term, threshold)
}
pub(super) fn limits(
    pool: Decimal,
    stage: Stage,
    tier: Tier,
    source: &Source,
) -> Result<Vec<(Uuid, Decimal)>, Error> {
    let shares = contract_scope::apportion(
        pool,
        &source
            .terms
            .iter()
            .map(|t| (t.contract, t.amount))
            .collect::<Vec<_>>(),
    )?;
    let mut caps = Vec::new();
    for (contract, share) in shares {
        let term = source
            .terms
            .iter()
            .find(|t| t.contract == contract)
            .ok_or(Error::Internal)?;
        if !stage_contract_eligible(source, term, stage)? {
            caps.push((contract, Decimal::ZERO));
            continue;
        }
        let percent = match stage {
            Stage::First => match tier {
                Tier::Basic => 20,
                Tier::Mid => 25,
                Tier::Premium => 30,
            },
            Stage::Second => match tier {
                Tier::Basic => 70,
                Tier::Mid => 75,
                Tier::Premium => 80,
            },
            _ => 100,
        };
        let mut rate = Decimal::new(percent, 2);
        if stage == Stage::Retention {
            rate = if term.down < Decimal::new(20, 2) && !source.released.contains(&contract) {
                Decimal::ZERO
            } else {
                Decimal::ONE
            };
        } else {
            if term.down < Decimal::new(20, 2) && !source.released.contains(&contract) {
                rate = Decimal::new(
                    if source.raised.contains(&contract) && tier != Tier::Basic {
                        15
                    } else {
                        10
                    },
                    2,
                );
            }
            rate = rate.min(Decimal::ONE - term.retention);
        }
        caps.push((contract, share.checked_mul(rate).ok_or(Error::Internal)?));
    }
    contract_scope::round_distribution(&caps)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn source() -> Source {
        let term = |n, amount, retention, receipts| Term {
            contract: Uuid::from_u128(n),
            snapshot: Uuid::from_u128(n + 10),
            amount: Decimal::new(amount, 0),
            down: Decimal::new(20, 2),
            retention: Decimal::new(retention, 2),
            due: Some("2026-01-01".into()),
            currency: "CNY".into(),
            receipts: Decimal::new(receipts, 0),
            row_version: 1,
            payload_hash: None,
        };
        Source {
            freeze: json!({"id":Uuid::from_u128(100),"row_version":1,"source_handover_id":Uuid::from_u128(101)}),
            binding: None,
            review: None,
            terms: vec![term(1, 60000, 10, 20000), term(2, 40000, 20, 0)],
            mode: Mode::ProjectAggregate,
            raised: BTreeSet::new(),
            released: BTreeSet::new(),
        }
    }

    #[test]
    fn project_pool_shares_obey_frozen_receipt_mode_and_each_contract_retention() {
        let mut s = source();
        let pool = Decimal::new(1000, 0);
        assert_eq!(
            limits(pool, Stage::First, Tier::Basic, &s).unwrap(),
            vec![
                (Uuid::from_u128(1), Decimal::new(120, 0)),
                (Uuid::from_u128(2), Decimal::new(80, 0))
            ]
        );
        s.mode = Mode::ContractSeparate;
        assert_eq!(
            limits(pool, Stage::First, Tier::Basic, &s).unwrap(),
            vec![
                (Uuid::from_u128(1), Decimal::new(120, 0)),
                (Uuid::from_u128(2), Decimal::ZERO)
            ]
        );
        s.terms[0].receipts = Decimal::new(54000, 0);
        s.terms[1].receipts = Decimal::new(32000, 0);
        assert_eq!(
            limits(pool, Stage::Final, Tier::Premium, &s).unwrap(),
            vec![
                (Uuid::from_u128(1), Decimal::new(540, 0)),
                (Uuid::from_u128(2), Decimal::new(320, 0))
            ]
        );
        assert_eq!(
            super::super::cash_allocation::nonretention_limit(pool, &s).unwrap(),
            Decimal::new(860, 0)
        );
    }

    #[test]
    fn low_down_payment_cap_cannot_be_bypassed_by_later_stage_or_tier() {
        let mut s = source();
        let contract = s.terms[0].contract;
        s.mode = Mode::ContractSeparate;
        s.terms[0].down = Decimal::new(10, 2);
        s.terms[0].receipts = Decimal::new(60000, 0);
        for stage in [Stage::First, Stage::Second, Stage::Final] {
            assert_eq!(
                limits(Decimal::new(1000, 0), stage, Tier::Premium, &s).unwrap()[0].1,
                Decimal::new(60, 0)
            );
        }
        s.raised.insert(contract);
        assert_eq!(
            limits(Decimal::new(1000, 0), Stage::Second, Tier::Premium, &s).unwrap()[0].1,
            Decimal::new(90, 0)
        );
        s.released.insert(contract);
        assert_eq!(
            limits(Decimal::new(1000, 0), Stage::Second, Tier::Premium, &s).unwrap()[0].1,
            Decimal::new(480, 0)
        );
        let mut record = json!({"freeze_version_id":s.freeze["id"],"freeze_row_version":1,"source_handover_id":s.freeze["source_handover_id"],"source_contract_scope":contract_scope::references(&s.terms),"contract_ids":[contract],"decision":"release-standard","criteria":{"receiptJudgmentMode":"contract-separate"}});
        assert!(release_applies(&s, &record).unwrap());
        record["criteria"]["receiptJudgmentMode"] = json!("project-aggregate");
        assert!(!release_applies(&s, &record).unwrap());
    }
}
