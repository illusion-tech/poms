use std::{collections::BTreeMap, error, fmt};

use rust_decimal::Decimal;
use serde_json::{Value, json};
use sqlx::Connection;
use uuid::Uuid;

use super::{model::CreateRequest, store};
use crate::{
    auth::{
        model::{ResolvedSession, clock_now},
        store::flush_managed_session,
    },
    compat::scalars::js_iso_string,
    database::{Database, DbError},
    project_bid_commercial::store as bids,
    project_technical_cost::{
        service::{allowed, decimal_input, decimal_text, owner_label, presigning},
        store as costs,
    },
    projects::{
        model::{Wire, js},
        store as projects,
    },
};

#[derive(Debug)]
pub enum Error {
    NotFound(String),
    BadRequest(String),
    Conflict(String),
    Database(DbError),
    Internal,
}
impl From<DbError> for Error {
    fn from(value: DbError) -> Self {
        Self::Database(value)
    }
}
impl From<sqlx::Error> for Error {
    fn from(_: sqlx::Error) -> Self {
        Self::Internal
    }
}
impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("project pricing margin operation failed")
    }
}
impl error::Error for Error {}

#[derive(Clone)]
pub struct Service {
    database: Database,
}

fn amount(value: &str, field: &str) -> Result<Decimal, Error> {
    decimal_input(value, field, 2, false).map_err(Error::BadRequest)
}
fn random_uuid() -> Result<Uuid, Error> {
    let mut bytes = [0_u8; 16];
    getrandom::fill(&mut bytes).map_err(|_| Error::Internal)?;
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    Ok(Uuid::from_bytes(bytes))
}

fn references(input: &CreateRequest, current: Option<&bids::Row>) -> Result<(), Error> {
    if input.pricing_path == "bid" {
        let Some(id) = input.bid_commercial_process_id.as_ref() else {
            return Err(Error::BadRequest(
                "bid pricingPath requires bidCommercialProcessId".into(),
            ));
        };
        let Some(current) = current.filter(|row| Uuid::parse_str(id).ok() == Some(row.id)) else {
            return Err(Error::BadRequest(
                "bidCommercialProcessId must match the current effective bid commercial process"
                    .into(),
            ));
        };
        if matches!(
            current.result_status.as_str(),
            "lost" | "cancelled" | "not-applicable"
        ) {
            return Err(Error::BadRequest(
                "current bid commercial process result cannot support bid pricing review".into(),
            ));
        }
    }
    if input.pricing_path == "direct-commercial"
        && let Some(id) = input.bid_commercial_process_id.as_ref()
    {
        let Some(current) = current.filter(|row| Uuid::parse_str(id).ok() == Some(row.id)) else {
            return Err(Error::BadRequest(
                "bidCommercialProcessId must match the current effective bid commercial process"
                    .into(),
            ));
        };
        if !matches!(
            current.bid_mode.as_str(),
            "direct-commercial" | "not-required"
        ) {
            return Err(Error::BadRequest("direct-commercial pricingPath can only reference a direct-commercial or not-required process".into()));
        }
    }
    if matches!(
        input.decision.as_str(),
        "released" | "conditional-release" | "escalation-required"
    ) && (input.commercial_release_baseline_id.is_none()
        || input.approval_scenario_key.is_none()
        || input.summary_package_key.is_none()
        || input.summary_snapshot_id.is_none()
        || input.projection_level.is_none()
        || input.export_policy.is_none())
    {
        return Err(Error::BadRequest("released, conditional-release and escalation-required decisions require commercial baseline and approval summary references".into()));
    }
    if input.decision == "rejected" && input.commercial_release_baseline_id.is_some() {
        return Err(Error::BadRequest(
            "rejected decision must not reference a commercial release baseline".into(),
        ));
    }
    Ok(())
}

fn cost_reference(
    input_id: &str,
    currency: &crate::auth::js_json::JsString,
    current: Option<(Uuid, &str)>,
) -> Result<(), Error> {
    let Some((_, current_currency)) =
        current.filter(|(id, _)| Uuid::parse_str(input_id).ok() == Some(*id))
    else {
        return Err(Error::BadRequest(
            "technicalCostPackageId must match the current effective technical cost package".into(),
        ));
    };
    if *currency != js(current_currency) {
        return Err(Error::BadRequest(format!(
            "currencyCode must equal technical cost package currencyCode {current_currency}"
        )));
    }
    Ok(())
}

fn amounts(input: &CreateRequest) -> Result<(), Error> {
    let inclusive = amount(&input.quote_amount_tax_inclusive, "quoteAmountTaxInclusive")?;
    let exclusive = amount(&input.quote_amount_tax_exclusive, "quoteAmountTaxExclusive")?;
    decimal_input(&input.tax_rate, "taxRate", 8, false).map_err(Error::BadRequest)?;
    if inclusive < exclusive {
        return Err(Error::BadRequest(
            "quoteAmountTaxInclusive must be greater than or equal to quoteAmountTaxExclusive"
                .into(),
        ));
    }
    if let Some(value) = input.gross_margin_rate.as_ref() {
        decimal_input(value, "grossMarginRate", 8, true).map_err(Error::BadRequest)?;
    }
    Ok(())
}

fn prerequisites(cost: Option<&costs::Row>, bid: Option<&bids::Row>) -> Vec<String> {
    let mut reasons = Vec::new();
    if let Some(cost) = cost {
        if !cost.allow_next_stage {
            reasons.push("当前技术与成本版本包尚未允许进入报价评审。".into());
        }
        if cost.tax_review_status == "pending" {
            reasons.push("当前技术与成本版本包的税务成本仍待复核。".into());
        }
    } else {
        reasons.push("尚未形成可引用的技术与成本版本包。".into());
    }
    if bid.is_some_and(|bid| matches!(bid.result_status.as_str(), "lost" | "cancelled")) {
        reasons.push("当前竞标 / 商务过程结果不能直接支撑报价评审。".into());
    }
    reasons
}

fn blocking(
    review: &store::Row,
    conditions: &[store::ConditionRow],
    cost: Option<&costs::Row>,
) -> Vec<String> {
    let mut reasons = Vec::new();
    if cost.is_none() {
        reasons.push("报价评审引用的技术与成本版本包已不可用。".into());
    }
    match review.decision.as_str() {
        "pending" => reasons.push("报价与毛利评审尚未形成放行结论。".into()),
        "rejected" => {
            reasons.push("报价与毛利评审已被否决，需要回到技术、成本或商务条件重新收口。".into())
        }
        "escalation-required" => {
            reasons.push("当前报价与毛利评审需要升级审批，暂不能进入签约就绪。".into())
        }
        _ => {}
    }
    for item in conditions {
        if item.required_for_contracting && item.condition_status == "open" {
            reasons.push(format!("{}：{}", item.label, item.condition_summary));
        }
    }
    reasons
}

impl Service {
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    pub async fn list(&self, project_id: &str) -> Result<Wire, Error> {
        let id = project_id.to_owned();
        let rows = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let Some(project) = projects::find(connection, &id).await? else {
                        return Ok(None);
                    };
                    Ok(Some(
                        store::list(connection, &project.id.to_string()).await?,
                    ))
                })
            })
            .await?
            .ok_or_else(|| Error::NotFound(format!("Project {project_id} not found")))?;
        Ok(Wire::value(Value::Array(
            rows.iter().map(store::summary).collect(),
        )))
    }

    pub async fn workspace(
        &self,
        project_id: &str,
        session: &ResolvedSession,
    ) -> Result<Wire, Error> {
        let id = project_id.to_owned();
        let data = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let Some(project) = projects::find(connection, &id).await? else {
                        return Ok(None);
                    };
                    let users = projects::user_names(
                        connection,
                        &project.owner_user_id.into_iter().collect::<Vec<_>>(),
                    )
                    .await?;
                    let orgs = projects::org_names(
                        connection,
                        &project.owner_org_id.into_iter().collect::<Vec<_>>(),
                    )
                    .await?;
                    let review = store::current(connection, &project.id.to_string()).await?;
                    // These are the original first-batch current reads, even if a
                    // review later selects its stored historical references instead.
                    let current_cost = costs::current(connection, &project.id.to_string()).await?;
                    let current_bid = bids::current(connection, &project.id.to_string()).await?;
                    let (conditions, cost, bid) = if let Some(review) = review.as_ref() {
                        let conditions = store::conditions(connection, review.id).await?;
                        let cost =
                            costs::by_id(connection, review.technical_cost_package_id).await?;
                        let bid = if let Some(id) = review.bid_commercial_process_id {
                            bids::by_id(connection, id).await?
                        } else {
                            None
                        };
                        (conditions, cost, bid)
                    } else {
                        (Vec::new(), current_cost, current_bid)
                    };
                    let name = project.owner_user_id.and_then(|id| users.get(&id).cloned());
                    let org = project.owner_org_id.and_then(|id| orgs.get(&id).cloned());
                    Ok(Some((project, review, conditions, cost, bid, name, org)))
                })
            })
            .await?
            .ok_or_else(|| Error::NotFound(format!("Project {project_id} not found")))?;
        let (project, review, conditions, cost, bid, name, org) = data;
        let actions = allowed(
            &project,
            session,
            "view-pricing-margin-workspace",
            "create-pricing-margin-review",
        );
        let (reasons, next, ready, fallback) = if let Some(review) = review.as_ref() {
            let reasons = blocking(review, &conditions, cost.as_ref());
            let next = if !reasons.is_empty() {
                "先处理报价结论、升级审批或条件放行阻断，再进入签约就绪。"
            } else if review.ready_for_contracting {
                "可以将当前商业放行基线和摘要快照带入签约就绪。"
            } else {
                "确认商业放行基线、审批摘要和签约承接关系后再进入签约就绪。"
            };
            (
                reasons,
                next,
                review.ready_for_contracting,
                review.owner_role.as_deref().unwrap_or("销售 / 财务"),
            )
        } else {
            let mut reasons = prerequisites(cost.as_ref(), bid.as_ref());
            let next = if !reasons.is_empty() {
                "先补齐技术成本、税务复核或商务路径依据，再发起报价与毛利评审。"
            } else {
                "基于当前技术成本和商务路径，形成报价、税务条件、回款条件与毛利评审结论。"
            };
            if reasons.is_empty() {
                reasons.push("尚未形成报价与毛利评审记录。".into());
            }
            (reasons, next, false, "销售 / 财务")
        };
        let owner = owner_label(name, org, fallback);
        Ok(Wire::value(json!({
            "projectId":project.id,"currentStage":project.current_stage,"status":project.status,
            "currentReview":review.as_ref().map(store::summary),"technicalCostPackage":cost.as_ref().map(costs::summary),
            "bidCommercialProcess":bid.as_ref().map(bids::summary),
            "conditionItems":conditions.into_iter().map(|item|item.view).collect::<Vec<_>>(),
            "blockingReasons":reasons,"nextStep":next,"readyForContracting":ready,"ownerLabel":owner,"allowedActions":actions,
            "generatedAt":js_iso_string(clock_now()).map_err(|_|Error::Internal)?,
        })))
    }

    pub async fn create(
        &self,
        project_id: &str,
        input: CreateRequest,
        session: &ResolvedSession,
    ) -> Result<Wire, Error> {
        let id = project_id.to_owned();
        let (project, input) = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let Some(project) = projects::find(connection, &id).await? else {
                        return Ok(Err(Error::NotFound(format!("Project {id} not found"))));
                    };
                    if project.status == "closed" || !presigning(&project.current_stage) {
                        return Ok(Err(Error::BadRequest(format!(
                            "Project {id} cannot record pricing margin review in stage {}",
                            project.current_stage
                        ))));
                    }
                    let cost = costs::current(connection, &id).await?;
                    if let Err(error) = cost_reference(
                        &input.technical_cost_package_id,
                        &input.currency_code,
                        cost.as_ref()
                            .map(|cost| (cost.id, cost.currency_code.as_str())),
                    ) {
                        return Ok(Err(error));
                    }
                    let bid = bids::current(connection, &id).await?;
                    if let Err(error) = references(&input, bid.as_ref()) {
                        return Ok(Err(error));
                    }
                    if let Err(error) = amounts(&input) {
                        return Ok(Err(error));
                    }
                    Ok(Ok((project, input)))
                })
            })
            .await??;
        let id = random_uuid()?;
        let blockers = input
            .condition_items
            .iter()
            .filter(|item| item.required_for_contracting && item.condition_status == "open")
            .count()
            + usize::from(matches!(
                input.decision.as_str(),
                "pending" | "rejected" | "escalation-required"
            ));
        let ready =
            matches!(input.decision.as_str(), "released" | "conditional-release") && blockers == 0;
        let uuid = |value: &str| Uuid::parse_str(value).map_err(|_| Error::Internal);
        let record = store::NewReview {
            id,
            project_id: project.id,
            version: 1,
            is_current: true,
            supersedes_id: None,
            status: "effective".into(),
            technical_cost_package_id: uuid(&input.technical_cost_package_id)?,
            bid_commercial_process_id: input
                .bid_commercial_process_id
                .as_deref()
                .map(uuid)
                .transpose()?,
            commercial_release_baseline_id: input
                .commercial_release_baseline_id
                .as_deref()
                .map(uuid)
                .transpose()?,
            pricing_path: input.pricing_path.clone(),
            quote_version: input.quote_version.to_utf8_lossy(),
            currency_code: input.currency_code.to_utf8_lossy(),
            quote_amount_tax_inclusive: decimal_text(
                amount(&input.quote_amount_tax_inclusive, "quoteAmountTaxInclusive")?,
                2,
            ),
            quote_amount_tax_exclusive: decimal_text(
                amount(&input.quote_amount_tax_exclusive, "quoteAmountTaxExclusive")?,
                2,
            ),
            tax_rate: input.tax_rate.clone(),
            tax_condition_summary: input.tax_condition_summary.to_utf8_lossy(),
            payment_terms_summary: input.payment_terms_summary.to_utf8_lossy(),
            gross_margin_rate: input.gross_margin_rate.clone(),
            gross_margin_band: input.gross_margin_band.clone(),
            gross_margin_summary: input.gross_margin_summary.to_utf8_lossy(),
            decision: input.decision.clone(),
            decision_summary: input.decision_summary.to_utf8_lossy(),
            approval_scenario_key: input
                .approval_scenario_key
                .as_ref()
                .map(|v| v.to_utf8_lossy()),
            summary_package_key: input
                .summary_package_key
                .as_ref()
                .map(|v| v.to_utf8_lossy()),
            summary_snapshot_id: input.summary_snapshot_id.as_deref().map(uuid).transpose()?,
            projection_level: input.projection_level.as_ref().map(|v| v.to_utf8_lossy()),
            export_policy: input.export_policy.as_ref().map(|v| v.to_utf8_lossy()),
            ready_for_contracting: ready,
            owner_role: input.owner_role.as_ref().map(|v| v.to_utf8_lossy()),
            blocker_count: blockers as i32,
            effective_at: clock_now(),
            created_at: clock_now(),
            created_by: Some(session.user.user_id),
            updated_at: clock_now(),
            updated_by: Some(session.user.user_id),
            row_version: 1,
        };
        let mut original = BTreeMap::from([
            ("projectId".into(), js(project_id)),
            (
                "technicalCostPackageId".into(),
                js(&input.technical_cost_package_id),
            ),
            ("quoteVersion".into(), input.quote_version.clone()),
            ("currencyCode".into(), input.currency_code.clone()),
            (
                "taxConditionSummary".into(),
                input.tax_condition_summary.clone(),
            ),
            (
                "paymentTermsSummary".into(),
                input.payment_terms_summary.clone(),
            ),
            (
                "grossMarginSummary".into(),
                input.gross_margin_summary.clone(),
            ),
            ("decisionSummary".into(), input.decision_summary.clone()),
        ]);
        for (key, value) in [
            ("approvalScenarioKey", input.approval_scenario_key.as_ref()),
            ("summaryPackageKey", input.summary_package_key.as_ref()),
            ("projectionLevel", input.projection_level.as_ref()),
            ("exportPolicy", input.export_policy.as_ref()),
            ("ownerRole", input.owner_role.as_ref()),
        ] {
            if let Some(value) = value {
                original.insert(key.to_owned(), value.clone());
            }
        }
        for (key, value) in [
            (
                "bidCommercialProcessId",
                input.bid_commercial_process_id.as_deref(),
            ),
            (
                "commercialReleaseBaselineId",
                input.commercial_release_baseline_id.as_deref(),
            ),
            ("summarySnapshotId", input.summary_snapshot_id.as_deref()),
        ] {
            if let Some(value) = value {
                original.insert(key.to_owned(), js(value));
            }
        }
        // INSERT RETURNING hydrates numeric scale. The original POST mapper
        // still sees these request strings until a subsequent repository read.
        original.insert("taxRate".to_owned(), js(&input.tax_rate));
        if let Some(value) = input.gross_margin_rate.as_deref() {
            original.insert("grossMarginRate".to_owned(), js(value));
        }
        let mut persisted = record;
        let project_key = project_id.to_owned();
        let pending = session.pending_flush.clone();
        let actor = session.user.user_id;
        let record = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<store::Row, Error> = async {
                        let project=costs::lock_project(&mut transaction,&project_key).await?
                            .ok_or_else(||Error::NotFound(format!("Project {project_key} not found")))?;
                        if project.status=="closed" || !presigning(&project.current_stage) {
                            return Err(Error::BadRequest(format!("Project {project_key} cannot record pricing margin review in stage {}",project.current_stage)));
                        }
                        let cost=costs::current(&mut transaction,&project_key).await?;
                        cost_reference(&input.technical_cost_package_id,&input.currency_code,cost.as_ref().map(|cost|(cost.id,cost.currency_code.as_str())))?;
                        let bid=bids::current(&mut transaction,&project_key).await?;
                        references(&input,bid.as_ref())?;
                        let previous=store::current(&mut transaction,&project_key).await?;
                        persisted.version=store::next_version(&mut transaction,project.id).await?;
                        persisted.supersedes_id=previous.as_ref().map(|row|row.id);
                        let effective_at=clock_now();
                        persisted.effective_at=effective_at;persisted.created_at=effective_at;persisted.updated_at=effective_at;
                        if let Some(previous)=previous.as_ref()
                            && !store::supersede(&mut transaction,previous,actor,effective_at).await? {
                            return Err(Error::Conflict("Current pricing margin review changed; reload and retry".into()));
                        }
                        let current = store::insert(&mut transaction, &persisted).await?;
                        store::insert_conditions(&mut transaction, persisted.id, &input).await?;
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        Ok(current)
                    }
                    .await;
                    match result {
                        Ok(current) => {
                            transaction.commit().await?;
                            Ok(Ok(current))
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Ok(Err(error))
                        }
                    }
                })
            })
            .await??;
        Ok(Wire::object(store::summary(&record), &original))
    }
}

#[cfg(test)]
mod version_reference_tests {
    use super::*;

    #[test]
    fn pricing_accepts_only_the_current_cost_identity_and_currency() {
        let current = Uuid::from_u128(0x01234567_89ab_4cde_8fab_0123456789ab);
        let stale = Uuid::from_u128(0x01234567_89ab_4cde_8fab_0123456789ac);
        assert!(cost_reference(&current.to_string(), &js("CNY"), Some((current, "CNY"))).is_ok());
        assert!(
            cost_reference(
                &current.to_string().to_uppercase(),
                &js("CNY"),
                Some((current, "CNY"))
            )
            .is_ok()
        );
        assert!(matches!(
            cost_reference(&stale.to_string(), &js("CNY"), Some((current, "CNY"))),
            Err(Error::BadRequest(_))
        ));
        assert!(matches!(
            cost_reference(&current.to_string(), &js("CNY"), None),
            Err(Error::BadRequest(_))
        ));
        assert!(matches!(
            cost_reference(&current.to_string(), &js("USD"), Some((current, "CNY"))),
            Err(Error::BadRequest(_))
        ));
    }

    fn quote(inclusive: &str, exclusive: &str, margin: &str) -> CreateRequest {
        let raw=json!({"technicalCostPackageId":"00000000-0000-4000-8000-000000000001","pricingPath":"direct-commercial","quoteVersion":"Q1","currencyCode":"CNY",
            "quoteAmountTaxInclusive":inclusive,"quoteAmountTaxExclusive":exclusive,"taxRate":"0.13","taxConditionSummary":"已记录税务条件","paymentTermsSummary":"按节点回款",
            "grossMarginRate":margin,"grossMarginBand":"target","grossMarginSummary":"调用者给出的毛利判断","decision":"pending","decisionSummary":"待形成结论","conditionItems":[]}).to_string();
        super::super::validation::validate_create(Some(&raw))
            .unwrap_or_else(|_| panic!("valid quote DTO"))
    }

    #[test]
    fn pricing_preserves_large_cents_and_signed_caller_margin() {
        let request = quote("9007199254740993.01", "9007199254740993.01", "-0.12500001");
        assert!(amounts(&request).is_ok());
        assert_eq!(
            amount(
                &request.quote_amount_tax_inclusive,
                "quoteAmountTaxInclusive"
            )
            .map(|value| decimal_text(value, 2))
            .ok()
            .as_deref(),
            Some("9007199254740993.01")
        );
        assert_eq!(
            decimal_input(
                request.gross_margin_rate.as_deref().unwrap_or(""),
                "grossMarginRate",
                8,
                true
            )
            .map(|value| decimal_text(value, 8))
            .ok()
            .as_deref(),
            Some("-0.12500001")
        );
        assert!(amounts(&quote("9999999999999999.99", "9999999999999999.99", "0")).is_ok());
    }

    #[test]
    fn pricing_rejects_exact_cent_inversion_and_storage_overflow() {
        assert!(
            matches!(amounts(&quote("9007199254740993.00","9007199254740993.01","0")),Err(Error::BadRequest(message)) if message.contains("greater than or equal"))
        );
        assert!(
            matches!(amounts(&quote("10000000000000000.00","0.00","0")),Err(Error::BadRequest(message)) if message.contains("numeric(18,2)"))
        );
        assert!(
            matches!(amounts(&quote("1.00","1.00","10000000000.00000000")),Err(Error::BadRequest(message)) if message.contains("grossMarginRate"))
        );
    }
}
