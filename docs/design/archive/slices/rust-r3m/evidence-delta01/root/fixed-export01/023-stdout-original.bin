use super::domain::OriginalApprovalDomain;
use crate::{
    approval_common::{
        ApprovalCommonService, ApprovalDecision, ApprovalRecord, CommonFailure, CommonSession,
        TodoItem,
        js::{Data, Value, decode, get},
        projection::{self, SuppliedFacts},
        schema::Table,
        store,
    },
    database::Database,
};
use axum::http::StatusCode;
use serde::Serialize;

#[derive(Clone)]
pub struct ApprovalService {
    common: ApprovalCommonService,
}

pub(crate) fn as_value<T: Serialize>(value: &T) -> Result<Value, CommonFailure> {
    // Transport encoding only: this is not response DTO/schema validation.
    Value::parse(
        &serde_json::to_string(value)
            .map_err(|_| CommonFailure::unexpected("Approval projection serialization failed"))?,
    )
}

fn text(data: &Data, key: &str) -> Option<crate::approval_common::Text> {
    get(data, key).as_text().cloned()
}
fn lookup<'a>(rows: &'a [Data], id: &Value) -> Option<&'a Data> {
    rows.iter().find(|row| get(row, "id") == id)
}
fn facts(
    contract: Option<&Data>,
    payout: Option<&Data>,
    adjustment: Option<&Data>,
    project: Option<&Data>,
    lead: Option<&Data>,
    customer: Option<&Data>,
) -> SuppliedFacts {
    SuppliedFacts {
        contract: contract.map(|row| projection::ContractFact {
            contract_no: text(row, "contractNo"),
            status: text(row, "status"),
        }),
        payout: payout.map(|row| projection::PayoutFact {
            stage_type: get(row, "stageType").js_text(),
            status: text(row, "status"),
        }),
        adjustment: adjustment.map(|row| projection::AdjustmentFact {
            adjustment_type: get(row, "adjustmentType").js_text(),
            status: text(row, "status"),
        }),
        project_name: project.and_then(|row| text(row, "projectName")),
        lead_name: lead.and_then(|row| text(row, "leadName")),
        customer_display_name: customer.and_then(|row| text(row, "displayName")),
    }
}

async fn many(
    session: &mut CommonSession<'_, '_>,
    table: Table,
    ids: Vec<Value>,
) -> Result<Vec<Data>, CommonFailure> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let handles = store::find(session, table, &[("id", ids)], &[], false).await?;
    handles
        .into_iter()
        .map(|handle| store::data(session.state, handle))
        .collect()
}
async fn one(
    session: &mut CommonSession<'_, '_>,
    table: Table,
    id: Value,
) -> Result<Option<Data>, CommonFailure> {
    let rows = store::find(session, table, &[("id", vec![id])], &[], true).await?;
    rows.first()
        .map(|handle| store::data(session.state, *handle))
        .transpose()
}
fn ids(todos: &[Data], field: &str, value: &str, id_field: &str) -> Vec<Value> {
    let mut ids = Vec::new();
    for todo in todos {
        if get(todo, field) == &Value::text(value) {
            let id = get(todo, id_field).clone();
            if !ids.contains(&id) {
                ids.push(id);
            }
        }
    }
    ids
}

impl ApprovalService {
    pub fn new(database: Database) -> Self {
        Self {
            common: ApprovalCommonService::new(database),
        }
    }
    pub(crate) fn database(&self) -> &Database {
        self.common.database()
    }

    pub async fn get_record_with_session(
        &self,
        session: &mut CommonSession<'_, '_>,
        id: Value,
    ) -> Result<Value, CommonFailure> {
        let handle = self
            .common
            .approval_record(session, id.clone())
            .await?
            .ok_or_else(|| {
                CommonFailure::http(
                    StatusCode::NOT_FOUND,
                    crate::approval_common::Text::from("ApprovalRecord ")
                        .concat(&id.js_text())
                        .concat(&" not found".into()),
                )
            })?;
        let row = store::data(session.state, handle)?;
        let target = get(&row, "targetObjectId").clone();
        let kind = get(&row, "targetObjectType");
        let contract = if kind == &Value::text("contract") {
            one(session, Table::Contract, target.clone()).await?
        } else {
            None
        };
        let payout = if kind == &Value::text("commission-payout") {
            one(session, Table::Payout, target.clone()).await?
        } else {
            None
        };
        let adjustment = if kind == &Value::text("commission-adjustment") {
            one(session, Table::Adjustment, target).await?
        } else {
            None
        };
        let record: ApprovalRecord = decode(&Value::Object(row))?;
        as_value(&projection::approval(
            &record,
            &facts(
                contract.as_ref(),
                payout.as_ref(),
                adjustment.as_ref(),
                None,
                None,
                None,
            ),
        ))
    }

    pub async fn get_my_todos_with_session(
        &self,
        session: &mut CommonSession<'_, '_>,
        actor: Value,
    ) -> Result<Value, CommonFailure> {
        let handles = self.common.open_todos(session, actor).await?;
        if handles.is_empty() {
            return Ok(Value::Array(Vec::new()));
        }
        let todos: Vec<Data> = handles
            .into_iter()
            .map(|handle| store::data(session.state, handle))
            .collect::<Result<_, _>>()?;
        // A borrowed PgConnection serializes statements without adding a read
        // transaction. The original seven independently queried fact sets stay
        // distinct; each SELECT observes the current PostgreSQL statement view.
        let approvals = many(
            session,
            Table::Approval,
            ids(&todos, "sourceType", "approval-record", "sourceId"),
        )
        .await?;
        let contracts = many(
            session,
            Table::Contract,
            ids(&todos, "targetObjectType", "contract", "targetObjectId"),
        )
        .await?;
        let payouts = many(
            session,
            Table::Payout,
            ids(
                &todos,
                "targetObjectType",
                "commission-payout",
                "targetObjectId",
            ),
        )
        .await?;
        let adjustments = many(
            session,
            Table::Adjustment,
            ids(
                &todos,
                "targetObjectType",
                "commission-adjustment",
                "targetObjectId",
            ),
        )
        .await?;
        let projects = many(
            session,
            Table::Project,
            ids(&todos, "targetObjectType", "project", "targetObjectId"),
        )
        .await?;
        let leads = many(
            session,
            Table::Lead,
            ids(&todos, "targetObjectType", "lead", "targetObjectId"),
        )
        .await?;
        let customers = many(
            session,
            Table::Customer,
            ids(&todos, "targetObjectType", "customer", "targetObjectId"),
        )
        .await?;
        let mut output = Vec::with_capacity(todos.len());
        for row in todos {
            let target = get(&row, "targetObjectId");
            let record: Option<ApprovalRecord> = lookup(&approvals, get(&row, "sourceId"))
                .map(|row| decode(&Value::Object(row.clone())))
                .transpose()?;
            let supplied = facts(
                lookup(&contracts, target),
                lookup(&payouts, target),
                lookup(&adjustments, target),
                lookup(&projects, target),
                lookup(&leads, target),
                lookup(&customers, target),
            );
            let todo: TodoItem = decode(&Value::Object(row))?;
            output.push(as_value(&projection::todo(
                &todo,
                record.as_ref(),
                &supplied,
            ))?);
        }
        Ok(Value::Array(output))
    }

    pub async fn approve_with_session(
        &self,
        session: &mut CommonSession<'_, '_>,
        id: Value,
        actor: Value,
        input: Data,
    ) -> Result<Value, CommonFailure> {
        self.common
            .resolve_public_decision_with(
                session,
                id,
                actor,
                ApprovalDecision::Approved,
                input,
                &OriginalApprovalDomain,
            )
            .await
    }
    pub async fn reject_with_session(
        &self,
        session: &mut CommonSession<'_, '_>,
        id: Value,
        actor: Value,
        input: Data,
    ) -> Result<Value, CommonFailure> {
        self.common
            .resolve_public_decision_with(
                session,
                id,
                actor,
                ApprovalDecision::Rejected,
                input,
                &OriginalApprovalDomain,
            )
            .await
    }
}
