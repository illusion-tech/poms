use std::{collections::BTreeMap, error, fmt};

use serde_json::{Value, json};
use sqlx::Connection;
use uuid::Uuid;

use super::{model::CreateRequest, store};
use crate::{
    auth::{
        model::{ResolvedSession, clock_now},
        store::flush_managed_session,
    },
    compat::scalars::{NumberInput, js_iso_string, js_to_fixed, legacy_number},
    database::{Database, DbError},
    project_bid_commercial::store as bids,
    project_technical_cost::{
        service::{allowed, owner_label, presigning},
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
    Database(DbError),
    Internal,
}
impl From<DbError> for Error {
    fn from(value: DbError) -> Self {
        Self::Database(value)
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

fn number(value: &str, field: &str) -> Result<f64, Error> {
    let value = legacy_number(NumberInput::Text(value));
    if !value.is_finite() || value < 0.0 {
        return Err(Error::BadRequest(format!(
            "{field} must be a non-negative decimal"
        )));
    }
    Ok(value)
}
fn money(value: f64) -> Result<String, Error> {
    js_to_fixed(value, 2).map_err(|_| Error::Internal)
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
        let Some(current) = current.filter(|row| row.id.to_string() == *id) else {
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
        let Some(current) = current.filter(|row| row.id.to_string() == *id) else {
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

fn amounts(input: &CreateRequest) -> Result<(), Error> {
    let inclusive = number(&input.quote_amount_tax_inclusive, "quoteAmountTaxInclusive")?;
    let exclusive = number(&input.quote_amount_tax_exclusive, "quoteAmountTaxExclusive")?;
    number(&input.tax_rate, "taxRate")?;
    if inclusive + 0.0001 < exclusive {
        return Err(Error::BadRequest(
            "quoteAmountTaxInclusive must be greater than or equal to quoteAmountTaxExclusive"
                .into(),
        ));
    }
    if let Some(value) = input.gross_margin_rate.as_ref()
        && !legacy_number(NumberInput::Text(value)).is_finite()
    {
        return Err(Error::BadRequest(
            "grossMarginRate must be a decimal".into(),
        ));
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
        let (project,previous,input)=self.database.with_connection(move|connection|Box::pin(async move{
            let Some(project)=projects::find(connection,&id).await? else{return Ok(Err(Error::NotFound(format!("Project {id} not found"))));};
            if project.status=="closed" || !presigning(&project.current_stage){
                return Ok(Err(Error::BadRequest(format!("Project {id} cannot record pricing margin review in stage {}",project.current_stage))));
            }
            let cost=costs::current(connection,&id).await?;
            let Some(cost)=cost.filter(|cost|cost.id.to_string()==input.technical_cost_package_id) else{
                return Ok(Err(Error::BadRequest("technicalCostPackageId must match the current effective technical cost package".into())));
            };
            if input.currency_code!=js(&cost.currency_code){
                return Ok(Err(Error::BadRequest(format!("currencyCode must equal technical cost package currencyCode {}",cost.currency_code))));
            }
            let bid=bids::current(connection,&id).await?;
            if let Err(error)=references(&input,bid.as_ref()){return Ok(Err(error));}
            if let Err(error)=amounts(&input){return Ok(Err(error));}
            let previous=store::current(connection,&id).await?;
            Ok(Ok((project,previous,input)))
        })).await??;
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
            version: previous
                .as_ref()
                .map_or(1, |row| i64::from(row.version) + 1),
            is_current: true,
            supersedes_id: previous.as_ref().map(|row| row.id),
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
            quote_amount_tax_inclusive: money(number(
                &input.quote_amount_tax_inclusive,
                "quoteAmountTaxInclusive",
            )?)?,
            quote_amount_tax_exclusive: money(number(
                &input.quote_amount_tax_exclusive,
                "quoteAmountTaxExclusive",
            )?)?,
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
        let persisted = record.clone();
        let pending = session.pending_flush.clone();
        let actor = session.user.user_id;
        let record = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<store::Row, sqlx::Error> = async {
                        // Existing current makes this INSERT fail before old UPDATE,
                        // preserving the confirmed Native existing-baseline-drift.
                        let current = store::insert(&mut transaction, &persisted).await?;
                        store::insert_conditions(&mut transaction, persisted.id, &input).await?;
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        if let Some(previous) = previous.as_ref() {
                            store::supersede(&mut transaction, previous, actor, clock_now())
                                .await?;
                        }
                        Ok(current)
                    }
                    .await;
                    match result {
                        Ok(current) => {
                            transaction.commit().await?;
                            Ok(current)
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?;
        Ok(Wire::object(store::summary(&record), &original))
    }
}
