//! Actual R3 current facts, read through the caller's project-locked connection.
use serde_json::{Value, json};
use sqlx::PgConnection;
use uuid::Uuid;

use super::{
    store,
    terms::{id, optional_text, uuid},
};
use crate::contract_support::{Error, canonical_hash, money, ratio, ratio_string};

pub(super) struct Sources {
    pub facts: Value,
    pub blockers: Vec<String>,
    pub cost: Option<Uuid>,
    pub bid: Option<Uuid>,
    pub pricing: Option<Uuid>,
}
fn nullable_id(value: &Value, key: &str) -> Result<Option<Uuid>, Error> {
    value.get(key).and_then(Value::as_str).map(uuid).transpose()
}
fn identity(row: &Value) -> Value {
    if row.is_null() {
        return Value::Null;
    }
    json!({"id":row["id"],"version":row["version"],"rowVersion":row["row_version"]})
}
fn applicable_bid_mode(row: &Value) -> bool {
    matches!(
        row["bid_mode"].as_str(),
        Some(
            "public-tender"
                | "invitation"
                | "comparison"
                | "commercial-negotiation"
                | "competitive-negotiation"
        )
    )
}
fn lossless_ratio(value: &str) -> Result<String, Error> {
    let normalized = if value.contains('.') {
        value.trim_end_matches('0').trim_end_matches('.')
    } else {
        value
    };
    ratio(normalized).map(ratio_string)
}
fn normalized_dates(mut row: Value) -> Value {
    for key in ["generated_at", "created_at", "updated_at", "due_at"] {
        if row.get(key).is_some_and(|v| !v.is_null()) {
            row[key] = store::iso(&row[key]);
        }
    }
    row
}
pub(super) async fn collect(
    c: &mut PgConnection,
    baseline: &Value,
    contract: Uuid,
    currency: &str,
) -> Result<Sources, Error> {
    let project = id(baseline, "project_id")?;
    let cost:Value=sqlx::query_scalar("SELECT to_jsonb(t) FROM poms.project_technical_cost_package t WHERE project_id=$1 AND is_current AND status='effective'")
        .bind(project).fetch_optional(&mut *c).await?.unwrap_or(Value::Null);
    let bid:Value=sqlx::query_scalar("SELECT to_jsonb(t) FROM poms.project_bid_commercial_process t WHERE project_id=$1 AND is_current AND status='effective'")
        .bind(project).fetch_optional(&mut *c).await?.unwrap_or(Value::Null);
    let pricing:Value=sqlx::query_scalar("SELECT to_jsonb(t)||jsonb_build_object('quote_amount_tax_inclusive',quote_amount_tax_inclusive::text,'quote_amount_tax_exclusive',quote_amount_tax_exclusive::text,'tax_rate',tax_rate::text) FROM poms.project_pricing_margin_review t WHERE project_id=$1 AND is_current AND status='effective'")
        .bind(project).fetch_optional(&mut *c).await?.unwrap_or(Value::Null);
    let mut blockers = Vec::new();
    let project_status: Option<String> =
        sqlx::query_scalar("SELECT status FROM poms.project WHERE id=$1")
            .bind(project)
            .fetch_optional(&mut *c)
            .await?;
    if project_status.as_deref() == Some("closed") {
        blockers.push("项目已关闭，不能生成新的签约准备。".into());
    }
    if baseline["is_current"] != true
        || !matches!(
            baseline["baseline_status"].as_str(),
            Some("draft" | "effective")
        )
    {
        blockers.push("商业来源基线已被替代。".into());
    }
    let cost_id = nullable_id(&cost, "id")?;
    let bid_id = nullable_id(&bid, "id")?;
    let pricing_id = nullable_id(&pricing, "id")?;
    if cost.is_null() {
        blockers.push("缺少当前技术与成本事实。".into());
    } else {
        if cost["allow_next_stage"] != true
            || cost["blocker_count"].as_i64().unwrap_or(1) > 0
            || cost["tax_review_status"] == "pending"
        {
            blockers.push("当前技术、税务或成本前置事项尚未放行。".into());
        }
        if cost["currency_code"].as_str() != Some(currency) {
            blockers.push("技术成本币种与合同不一致。".into());
        }
    }
    if !bid.is_null()
        && (bid["blocker_count"].as_i64().unwrap_or(1) > 0
            || matches!(bid["decision"].as_str(), Some("pending" | "no-bid"))
            || matches!(bid["result_status"].as_str(), Some("lost" | "cancelled")))
    {
        blockers.push("当前竞标决策、材料或结果不能支持签约。".into());
    }
    let mut conditions = Vec::<Value>::new();
    let mut summary = Value::Null;
    let mut bid_qualified = false;
    if pricing.is_null() {
        blockers.push("缺少当前报价与毛利放行事实。".into());
    } else {
        if !matches!(
            pricing["decision"].as_str(),
            Some("released" | "conditional-release")
        ) || pricing["ready_for_contracting"] != true
            || pricing["blocker_count"].as_i64().unwrap_or(1) > 0
        {
            blockers.push("当前报价尚未完成真实放行。".into());
        }
        if nullable_id(&pricing, "technical_cost_package_id")? != cost_id {
            blockers.push("报价引用的成本版本已不是当前版本。".into());
        }
        let referenced_bid = nullable_id(&pricing, "bid_commercial_process_id")?;
        if pricing["pricing_path"] == "bid" {
            bid_qualified = referenced_bid.is_some()
                && referenced_bid == bid_id
                && bid["decision"] == "participate"
                && bid["result_status"] == "won"
                && applicable_bid_mode(&bid);
            if !bid_qualified {
                blockers.push("投标路径必须引用当前已参与且中标的真实竞标结果。".into());
            }
        } else if pricing["pricing_path"] == "direct-commercial" {
            // Direct commercial substitution is evidenced by its real mode,
            // corresponding decision and eligible current direct pricing below.
            // A pending direct result is not a pending applicable bid, nor won.
            bid_qualified = ((bid["bid_mode"] == "not-required"
                && bid["decision"] == "not-required")
                || (bid["bid_mode"] == "direct-commercial" && bid["decision"] == "participate"))
                && !matches!(bid["result_status"].as_str(), Some("lost" | "cancelled"));
            if !bid_qualified {
                blockers.push("直接商务路径缺少明确已成立的当前商务替代事实。".into());
            }
        } else {
            blockers.push("报价没有受支持的竞标或直接商务路径。".into());
        }
        if let Some(referenced) = referenced_bid
            && (Some(referenced) != bid_id
                || (pricing["pricing_path"] == "direct-commercial"
                    && !matches!(
                        bid["bid_mode"].as_str(),
                        Some("direct-commercial" | "not-required")
                    )))
        {
            blockers.push("报价与当前商务路径引用不一致。".into());
        }
        if nullable_id(&pricing, "commercial_release_baseline_id")? != Some(id(baseline, "id")?) {
            blockers.push("当前报价未引用本商业来源基线。".into());
        }
        if pricing["currency_code"].as_str() != Some(currency)
            || baseline["currency_code"].as_str() != Some(currency)
        {
            blockers.push("商业来源币种与合同不一致。".into());
        }
        // These are PROJECT source amounts, never a contract's independent amount.
        for (source, target) in [
            ("quote_amount_tax_inclusive", "amount_tax_inclusive"),
            ("quote_amount_tax_exclusive", "amount_tax_exclusive"),
        ] {
            let same = optional_text(&pricing, source)
                .zip(optional_text(baseline, target))
                .is_some_and(|(a, b)| matches!((money(&a),money(&b)),(Ok(x),Ok(y)) if x==y));
            if !same {
                blockers.push("项目报价金额与商业来源基线不一致。".into());
            }
        }
        let same_tax = optional_text(&pricing, "tax_rate")
            .zip(optional_text(baseline, "tax_rate"))
            .is_some_and(
                |(a, b)| matches!((lossless_ratio(&a),lossless_ratio(&b)),(Ok(x),Ok(y)) if x==y),
            );
        if !same_tax {
            blockers.push("报价税率无法与四位商业来源无损对齐。".into());
        }
        conditions=sqlx::query_scalar("SELECT to_jsonb(t) FROM poms.project_pricing_margin_condition_item t WHERE review_id=$1 ORDER BY sort_order,id")
            .bind(id(&pricing,"id")?).fetch_all(&mut *c).await?;
        if conditions.iter().any(|row| {
            row["required_for_contracting"] == true
                && !matches!(row["condition_status"].as_str(), Some("closed" | "waived"))
        }) {
            blockers.push("报价仍有未收口的必备条件。".into());
        }
        if let Some(summary_id) = nullable_id(&pricing, "summary_snapshot_id")? {
            summary=sqlx::query_scalar("SELECT jsonb_build_object('id',id) FROM poms.approval_summary_snapshot WHERE id=$1").bind(summary_id).fetch_optional(&mut *c).await?.unwrap_or(Value::Null);
        }
        // This existing FK is lineage for the persisted R3 pricing fact. A
        // generic summary's status, target kind or display context is not a
        // quotation approval and must not add a second authorization gate.
        if summary.is_null() {
            blockers.push("报价事实缺少已存在的摘要来源记录。".into());
        }
    }
    let reference = store::reference(baseline, contract)?;
    let bid_applicability = if applicable_bid_mode(&bid) {
        "applicable"
    } else if matches!(
        bid["bid_mode"].as_str(),
        Some("direct-commercial" | "not-required")
    ) {
        "not-applicable"
    } else {
        "unknown"
    };
    let substitution =
        (pricing["pricing_path"] == "direct-commercial" && bid_qualified && blockers.is_empty())
            .then_some("current-direct-pricing");
    let facts = json!({
        "baseline":{"id":baseline["id"],"projectSourceHash":canonical_hash(&store::baseline_source(baseline))?,"referenceTermsHash":canonical_hash(&reference)?},
        "cost":identity(&cost),"bid":identity(&bid),"pricing":identity(&pricing),
        "bidApplicability":bid_applicability,"substitution":substitution,
        "bidQualification":{"pricingPath":pricing["pricing_path"],"bidMode":bid["bid_mode"],"decision":bid["decision"],"resultStatus":bid["result_status"],"blockerCount":bid["blocker_count"],"referencedProcessId":pricing["bid_commercial_process_id"],"pathQualified":bid_qualified},
        "pricingConditionsHash":canonical_hash(&json!(conditions.into_iter().map(normalized_dates).collect::<Vec<_>>()))?,
        // Keep the real referenced identity in the preparation/audit lineage.
        // Mutable summary metadata is not a pricing qualification or freshness
        // predicate; hashing it here would indirectly restore the removed gate.
        "summary":{"id":summary["id"]}
    });
    Ok(Sources {
        facts,
        blockers,
        cost: cost_id,
        bid: bid_id,
        pricing: pricing_id,
    })
}
pub(super) async fn fresh(
    c: &mut PgConnection,
    baseline: &Value,
    contract: Uuid,
    currency: &str,
    expected: &Value,
) -> Result<(), Error> {
    let actual = collect(c, baseline, contract, currency).await?;
    if !actual.blockers.is_empty() || actual.facts != *expected {
        return Err(Error::CodedConflict {
            code: "source_changed",
            message: "Contract preparation sources changed; recreate readiness and review".into(),
        });
    }
    Ok(())
}

pub(super) async fn authorize_attachments(
    c: &mut PgConnection,
    project: Uuid,
    contract: Uuid,
    input: &Value,
    actor: &crate::contract_support::Actor,
) -> Result<Vec<Uuid>, Error> {
    let mut ids = std::collections::BTreeSet::new();
    for value in input.as_array().map(Vec::as_slice).unwrap_or(&[]) {
        let key = uuid(
            value
                .as_str()
                .ok_or_else(|| Error::BadRequest("Invalid attachment UUID".into()))?,
        )?;
        ids.insert(key);
    }
    let permissions = &actor.session.user.permissions;
    let has = |key: &str| permissions.iter().any(|p| p.as_str() == key);
    if !ids.is_empty() && !has("project:read") {
        return Err(Error::Forbidden(
            "Missing project read permission for attachments".into(),
        ));
    }
    for key in &ids {
        let row: Value = sqlx::query_scalar(
            "SELECT to_jsonb(a) FROM poms.attachment a WHERE id=$1 AND status='active' FOR SHARE",
        )
        .bind(key)
        .fetch_optional(&mut *c)
        .await?
        .ok_or_else(|| Error::NotFound("Active attachment not found".into()))?;
        if matches!(
            row["security_level"].as_str(),
            Some("confidential" | "restricted")
        ) && ![
            "contract:finance:sensitive:read",
            "operating:finance:sensitive:read",
            "commission:amount:sensitive:read",
            "platform:roles:manage",
        ]
        .iter()
        .any(|p| has(p))
        {
            return Err(Error::Forbidden(
                "Attachment security level is not authorized".into(),
            ));
        }
        let links:Vec<Uuid>=sqlx::query_scalar("SELECT id FROM poms.attachment_link WHERE attachment_id=$1 AND status='active' AND ((target_type='project' AND target_id=$2) OR (target_type='contract' AND target_id=$3)) ORDER BY id FOR SHARE")
            .bind(key).bind(project).bind(contract).fetch_all(&mut *c).await?;
        if links.is_empty() {
            return Err(Error::NotFound(
                "Attachment is not linked to this project or contract".into(),
            ));
        }
    }
    Ok(ids.into_iter().collect())
}
