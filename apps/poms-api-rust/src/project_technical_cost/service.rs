use std::{collections::BTreeMap, error, fmt};

use serde_json::{Value, json};
use sqlx::Connection;
use uuid::Uuid;

use super::{model::CreateRequest, store};
use crate::{
    auth::{
        js_json::JsString,
        model::{ResolvedSession, clock_now},
        store::flush_managed_session,
    },
    compat::scalars::{NumberInput, js_iso_string, js_to_fixed, legacy_number},
    database::{Database, DbError},
    projects::{
        model::{Wire, js},
        store as projects,
    },
};

#[derive(Debug)]
pub enum Error {
    NotFound(String),
    BadRequest(String),
    BadRequestJs(JsString),
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
        f.write_str("project technical cost operation failed")
    }
}
impl error::Error for Error {}

#[derive(Clone)]
pub struct Service {
    database: Database,
}

pub fn presigning(stage: &str) -> bool {
    matches!(
        stage,
        "assessment" | "scope-confirmation" | "commercial-closure" | "contracting"
    )
}

pub fn owner_label(name: Option<String>, org: Option<String>, fallback: &str) -> String {
    if let (Some(name), Some(org)) = (&name, &org)
        && !name.is_empty()
        && !org.is_empty()
    {
        return format!("{name} / {org}");
    }
    name.or(org).unwrap_or_else(|| fallback.to_owned())
}

pub fn allowed(
    project: &projects::ProjectRow,
    session: &ResolvedSession,
    view: &str,
    create: &str,
) -> Vec<String> {
    let mut actions = vec![view.to_owned()];
    if project.status != "closed"
        && !matches!(
            project.current_stage.as_str(),
            "closed-lost" | "closed-terminated"
        )
        && presigning(&project.current_stage)
        && session
            .user
            .permissions
            .iter()
            .any(|p| p.as_str() == "project:write")
    {
        actions.push(create.to_owned());
    }
    actions
}

pub fn number(value: &str, field: &str) -> Result<f64, Error> {
    let value = legacy_number(NumberInput::Text(value));
    if !value.is_finite() || value < 0.0 {
        return Err(Error::BadRequest(format!(
            "{field} must be a non-negative decimal"
        )));
    }
    Ok(value)
}

pub fn money(value: f64) -> Result<String, Error> {
    js_to_fixed(value, 2).map_err(|_| Error::Internal)
}

fn random_uuid() -> Result<Uuid, Error> {
    let mut bytes = [0_u8; 16];
    getrandom::fill(&mut bytes).map_err(|_| Error::Internal)?;
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    Ok(Uuid::from_bytes(bytes))
}

fn validate_amounts(input: &CreateRequest) -> Result<(), Error> {
    for (index, item) in input.cost_items.iter().enumerate() {
        if item.currency_code != input.currency_code {
            return Err(currency_mismatch(index, &input.currency_code));
        }
        let excluding = number(
            &item.amount_excluding_tax,
            &format!("costItems[{index}].amountExcludingTax"),
        )?;
        let tax = number(
            &item.tax_cost_amount,
            &format!("costItems[{index}].taxCostAmount"),
        )?;
        let including = number(
            &item.amount_including_tax,
            &format!("costItems[{index}].amountIncludingTax"),
        )?;
        if (including - (excluding + tax)).abs() > 0.0001 {
            return Err(Error::BadRequest(format!(
                "costItems[{index}].amountIncludingTax must equal amountExcludingTax + taxCostAmount"
            )));
        }
    }
    Ok(())
}

fn currency_mismatch(index: usize, currency: &JsString) -> Error {
    let prefix = format!("costItems[{index}].currencyCode must equal package currencyCode ");
    let mut units = prefix.encode_utf16().collect::<Vec<_>>();
    units.extend_from_slice(currency.as_code_units());
    match String::from_utf16(&units) {
        Ok(message) => Error::BadRequest(message),
        Err(_) => Error::BadRequestJs(JsString::from_code_units(units)),
    }
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
                    let names = projects::user_names(
                        connection,
                        &project.owner_user_id.into_iter().collect::<Vec<_>>(),
                    )
                    .await?;
                    let orgs = projects::org_names(
                        connection,
                        &project.owner_org_id.into_iter().collect::<Vec<_>>(),
                    )
                    .await?;
                    let current = store::current(connection, &project.id.to_string()).await?;
                    let children = if let Some(current) = current.as_ref() {
                        let scopes = store::scopes(connection, current.id).await?;
                        let risks = store::risks(connection, current.id).await?;
                        let costs = store::costs(connection, current.id).await?;
                        (scopes, risks, costs)
                    } else {
                        (Vec::new(), Vec::new(), Vec::new())
                    };
                    let name = project.owner_user_id.and_then(|id| names.get(&id).cloned());
                    let org = project.owner_org_id.and_then(|id| orgs.get(&id).cloned());
                    Ok(Some((project, current, children, name, org)))
                })
            })
            .await?
            .ok_or_else(|| Error::NotFound(format!("Project {project_id} not found")))?;
        let (project, current, (scope_items, risk_items, cost_items), name, org) = data;
        let actions = allowed(
            &project,
            session,
            "view-technical-cost-workspace",
            "create-technical-cost-package",
        );
        let owner = owner_label(name, org, "技术支持 / 售前");
        let mut reasons = Vec::new();
        let next;
        if let Some(current) = current.as_ref() {
            if !current.allow_next_stage {
                reasons.push("技术与成本版本包尚未允许进入下一阶段。".to_owned());
            }
            for item in &risk_items {
                if item.blocks_next_stage && item.risk_status != "closed" {
                    reasons.push(format!("{}：{}", item.risk_category, item.risk_description));
                }
            }
            if current.tax_review_status == "pending" {
                reasons.push("税务成本假设仍待复核。".to_owned());
            }
            next = if current.allow_next_stage
                && risk_items
                    .iter()
                    .all(|item| !item.blocks_next_stage || item.risk_status == "closed")
            {
                "进入商务收口前，保持当前版本包作为报价和签约前判断依据。"
            } else if current.tax_review_status == "pending" {
                "先完成税务成本复核，再判断是否进入商务收口。"
            } else {
                "先关闭阻塞风险或更新版本包，再进入商务收口。"
            };
        } else {
            reasons.push("尚未形成技术与成本测算版本包。".to_owned());
            next = "补齐技术可行性、范围边界、风险项和成本税务估算。";
        }
        Ok(Wire::value(json!({
            "projectId":project.id,"currentStage":project.current_stage,"status":project.status,
            "currentPackage":current.as_ref().map(store::summary),"scopeItems":scope_items,
            "riskItems":risk_items.into_iter().map(|item|item.view).collect::<Vec<_>>(),"costItems":cost_items,
            "blockingReasons":reasons,"nextStep":next,"ownerLabel":owner,"allowedActions":actions,
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
        let (project, previous, input) = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let Some(project) = projects::find(connection, &id).await? else {
                        return Ok(Err(Error::NotFound(format!("Project {id} not found"))));
                    };
                    if project.status == "closed" || !presigning(&project.current_stage) {
                        return Ok(Err(Error::BadRequest(format!(
                            "Project {id} cannot record technical cost package in stage {}",
                            project.current_stage
                        ))));
                    }
                    if let Err(error) = validate_amounts(&input) {
                        return Ok(Err(error));
                    }
                    let previous = store::current(connection, &id).await?;
                    Ok(Ok((project, previous, input)))
                })
            })
            .await??;
        let mut totals = [0.0; 3];
        for item in &input.cost_items {
            totals[0] += number(&item.amount_excluding_tax, "amountExcludingTax")?;
            totals[1] += number(&item.tax_cost_amount, "taxCostAmount")?;
            totals[2] += number(&item.amount_including_tax, "amountIncludingTax")?;
        }
        let highest = input
            .risk_items
            .iter()
            .map(|item| item.risk_level.clone())
            .max();
        let blockers = input
            .risk_items
            .iter()
            .filter(|item| item.blocks_next_stage && item.risk_status != "closed")
            .count()
            + usize::from(!input.allow_next_stage);
        let effective_at = clock_now();
        let id = random_uuid()?;
        let record = store::NewPackage {
            id,
            project_id: project.id,
            version: previous
                .as_ref()
                .map_or(1, |row| i64::from(row.version) + 1),
            is_current: true,
            supersedes_id: previous.as_ref().map(|row| row.id),
            status: "effective".into(),
            technical_feasibility_decision: input.technical_feasibility_decision.clone(),
            technical_conclusion_summary: input.technical_conclusion_summary.to_utf8_lossy(),
            allow_next_stage: input.allow_next_stage,
            currency_code: input.currency_code.to_utf8_lossy(),
            total_estimated_amount_excluding_tax: money(totals[0])?,
            total_tax_cost_amount: money(totals[1])?,
            total_estimated_amount_including_tax: money(totals[2])?,
            tax_assumption_summary: input.tax_assumption_summary.to_utf8_lossy(),
            tax_review_status: input.tax_review_status.clone(),
            highest_risk_level: highest,
            blocker_count: blockers as i32,
            effective_at,
            created_at: clock_now(),
            created_by: Some(session.user.user_id),
            updated_at: clock_now(),
            updated_by: Some(session.user.user_id),
            row_version: 1,
        };
        let original = BTreeMap::from([
            ("projectId".into(), js(project_id)),
            (
                "technicalConclusionSummary".into(),
                input.technical_conclusion_summary.clone(),
            ),
            ("currencyCode".into(), input.currency_code.clone()),
            (
                "taxAssumptionSummary".into(),
                input.tax_assumption_summary.clone(),
            ),
        ]);
        let persisted = record.clone();
        let pending = session.pending_flush.clone();
        let actor = session.user.user_id;
        let record = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<store::Row, sqlx::Error> = async {
                        // Do not disable the original partial unique or move this
                        // INSERT after supersede: Native second-version is 500.
                        let current = store::insert(&mut transaction, &persisted).await?;
                        store::insert_children(&mut transaction, persisted.id, &input).await?;
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

#[cfg(test)]
mod tests {
    use super::{Error, validate_amounts};
    use crate::{
        error::ApiError,
        project_technical_cost::{model::CreateRequest, validation::validate_create},
    };

    fn mismatch_request(currency_json: &str) -> Result<CreateRequest, ApiError> {
        // Deliberately inconsistent amounts prove that currency preflight still
        // wins before money validation; this goes through the real request DTO.
        let raw = format!(
            r#"{{"technicalFeasibilityDecision":"feasible","technicalConclusionSummary":"ok","allowNextStage":true,"currencyCode":{currency_json},"taxAssumptionSummary":"ok","taxReviewStatus":"reviewed","costItems":[{{"costCategory":"equipment","costDescription":"item","estimationBasis":"quote","amountExcludingTax":"1.00","taxCostAmount":"0.00","amountIncludingTax":"0.00","currencyCode":"USD","confidenceLevel":"high","highUncertainty":false}}]}}"#
        );
        validate_create(Some(&raw))
    }

    #[test]
    fn currency_preflight_retains_isolated_utf16_after_dto_trim() -> Result<(), ApiError> {
        for (input, expected_json) in [
            (
                r#""A\ud800B""#,
                r#""costItems[0].currencyCode must equal package currencyCode A\ud800B""#,
            ),
            (
                r#""A\udc00B""#,
                r#""costItems[0].currencyCode must equal package currencyCode A\udc00B""#,
            ),
            (
                r#"" \tA\ud800B\u3000""#,
                r#""costItems[0].currencyCode must equal package currencyCode A\ud800B""#,
            ),
        ] {
            let request = mismatch_request(input)?;
            match validate_amounts(&request) {
                Err(Error::BadRequestJs(message)) => {
                    assert_eq!(message.json(), expected_json);
                    assert!(!message.as_code_units().contains(&0xfffd));
                }
                other => panic!("expected raw UTF-16 currency error, got {other:?}"),
            }
        }
        Ok(())
    }

    #[test]
    fn currency_preflight_keeps_complete_astral_and_ascii_as_string_errors() -> Result<(), ApiError>
    {
        for (input, expected) in [
            (
                r#""A\ud83d\ude00B""#,
                "costItems[0].currencyCode must equal package currencyCode A😀B",
            ),
            (
                r#""CNY""#,
                "costItems[0].currencyCode must equal package currencyCode CNY",
            ),
        ] {
            let request = mismatch_request(input)?;
            match validate_amounts(&request) {
                Err(Error::BadRequest(message)) => assert_eq!(message, expected),
                other => panic!("expected unchanged string currency error, got {other:?}"),
            }
        }
        // With matching currency, the original ordinary money error is kept.
        let request = mismatch_request(r#""USD""#)?;
        match validate_amounts(&request) {
            Err(Error::BadRequest(message)) => assert_eq!(
                message,
                "costItems[0].amountIncludingTax must equal amountExcludingTax + taxCostAmount"
            ),
            other => panic!("expected unchanged money preflight error, got {other:?}"),
        }
        Ok(())
    }
}
