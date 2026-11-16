use super::model::{
    self, Calculation, CreateCalculation, CreateRule, Recalculate, Request, TierDefinition,
};
use crate::{
    approval_common::CommonSession,
    auth::{
        audit::insert_security_event,
        projection::{self, ProjectionInput, ProjectionUser, StringField},
    },
    contract_support::{Actor, Error, GlobalAuditWrite, audit_global, new_uuid},
    project_lifecycle::facts::{self, id, instant, next_version, text, version},
    project_operating_common::ResourceKeys,
    shared::generated::SensitiveFieldPackageKey,
};
use rust_decimal::Decimal;
use serde_json::{Value, json};
use sqlx::Connection;
use uuid::Uuid;

pub async fn execute(
    session: &mut CommonSession<'_, '_>,
    operation: &str,
    keys: &ResourceKeys,
    request: &Request,
    actor: &Actor,
) -> Result<Value, Error> {
    if !session.connection.is_in_transaction() {
        return Err(Error::Internal);
    }
    match (operation, request) {
        ("CommissionController_listRuleVersions", Request::None) => {
            let rows: Vec<Value> = sqlx::query_scalar("SELECT to_jsonb(r) FROM poms.commission_rule_version r ORDER BY rule_code,version DESC")
                .fetch_all(&mut *session.connection).await?;
            Ok(json!(rows.iter().map(rule_summary).collect::<Vec<_>>()))
        }
        ("CommissionController_createRuleVersion", Request::CreateRule(input)) => {
            create_rule(session, input, actor).await
        }
        (
            "CommissionController_activateRuleVersion" | "CommissionController_stopRuleVersion",
            Request::None,
        ) => change_rule_status(session, operation, keys.id()?, actor).await,
        ("CommissionController_listCalculations", Request::None) => {
            let project = keys.project_id()?;
            facts::project(session, project, false).await?;
            let rows: Vec<Value> = sqlx::query_scalar("SELECT to_jsonb(c)||jsonb_build_object('recognized_revenue_tax_exclusive',c.recognized_revenue_tax_exclusive::text,'recognized_cost_tax_exclusive',c.recognized_cost_tax_exclusive::text,'contribution_margin',c.contribution_margin::text,'contribution_margin_rate',c.contribution_margin_rate::text,'commission_pool',c.commission_pool::text) FROM poms.commission_calculation c WHERE project_id=$1 ORDER BY version DESC")
                .bind(project).fetch_all(&mut *session.connection).await?;
            let mut result = Vec::with_capacity(rows.len());
            for row in rows {
                result.push(calculation_summary(session, &row, actor).await?);
            }
            Ok(json!(result))
        }
        ("CommissionController_createCalculation", Request::CreateCalculation(input)) => {
            create_calculation(session, keys.project_id()?, input, actor).await
        }
        ("CommissionController_approveCalculation", Request::ConfirmCalculation(input)) => {
            approve_calculation(session, keys.id()?, input.expected_version, actor).await
        }
        ("CommissionController_recalculateCalculation", Request::Recalculate(input)) => {
            recalculate(session, keys.id()?, input, actor).await
        }
        _ => Err(Error::Internal),
    }
}

fn rule_summary(row: &Value) -> Value {
    json!({"id":row["id"],"ruleCode":row["rule_code"],"version":row["version"],"status":row["status"],"tierDefinitionJson":row["tier_definition_json"],"effectiveFrom":instant(&row["effective_from"]),"createdAt":instant(&row["created_at"]),"updatedAt":instant(&row["updated_at"])})
}

async fn rule(session: &mut CommonSession<'_, '_>, rule_id: Uuid) -> Result<Value, Error> {
    sqlx::query_scalar(
        "SELECT to_jsonb(r) FROM poms.commission_rule_version r WHERE id=$1 FOR SHARE",
    )
    .bind(rule_id)
    .fetch_optional(&mut *session.connection)
    .await?
    .ok_or_else(|| Error::NotFound("提成规则版本不存在。".into()))
}

async fn rule_code_lock(session: &mut CommonSession<'_, '_>, code: &str) -> Result<(), Error> {
    // Serializes activation even when no active row exists yet.
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended('commission-rule:'||$1,0))")
        .bind(code)
        .execute(&mut *session.connection)
        .await?;
    Ok(())
}

async fn rule_audit(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    operation: &str,
    rule_id: Uuid,
    before: Option<Value>,
    after: Value,
) -> Result<(), Error> {
    audit_global(
        session,
        actor,
        GlobalAuditWrite {
            operation_id: operation.into(),
            target_type: "commission-rule-version".into(),
            target_id: rule_id,
            before,
            after: Some(after),
            reason: None,
            metadata: json!({}),
        },
    )
    .await
}

async fn create_rule(
    session: &mut CommonSession<'_, '_>,
    input: &CreateRule,
    actor: &Actor,
) -> Result<Value, Error> {
    rule_code_lock(session, &input.rule_code).await?;
    let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.commission_rule_version WHERE rule_code=$1 AND version=$2)")
        .bind(&input.rule_code).bind(input.version).fetch_one(&mut *session.connection).await?;
    if exists {
        return Err(Error::Conflict("该规则代码和版本已存在。".into()));
    }
    let rule_id = new_uuid()?;
    let tiers = serde_json::to_value(&input.tier_definition_json).map_err(|_| Error::Internal)?;
    let row: Value = sqlx::query_scalar("INSERT INTO poms.commission_rule_version AS r(id,rule_code,version,status,tier_definition_json,first_stage_cap_rule_json,second_stage_cap_rule_json,retention_rule_json,low_down_payment_rule_json,exception_rule_json,effective_from,created_by,updated_by) VALUES($1,$2,$3,'draft',$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING to_jsonb(r)")
        .bind(rule_id).bind(&input.rule_code).bind(input.version).bind(tiers)
        .bind(input.first_stage_cap_rule_json.as_ref().map(|v| json!(v))).bind(input.second_stage_cap_rule_json.as_ref().map(|v| json!(v)))
        .bind(input.retention_rule_json.as_ref().map(|v| json!(v))).bind(input.low_down_payment_rule_json.as_ref().map(|v| json!(v))).bind(input.exception_rule_json.as_ref().map(|v| json!(v)))
        .bind(input.effective_from).bind(actor.id).fetch_one(&mut *session.connection).await?;
    let result = rule_summary(&row);
    rule_audit(
        session,
        actor,
        "CommissionController_createRuleVersion",
        rule_id,
        None,
        result.clone(),
    )
    .await?;
    Ok(result)
}

async fn change_rule_status(
    session: &mut CommonSession<'_, '_>,
    operation: &str,
    rule_id: Uuid,
    actor: &Actor,
) -> Result<Value, Error> {
    // Resolve code without a row lock, then acquire all locks in code/row order.
    let code: String =
        sqlx::query_scalar("SELECT rule_code FROM poms.commission_rule_version WHERE id=$1")
            .bind(rule_id)
            .fetch_optional(&mut *session.connection)
            .await?
            .ok_or_else(|| Error::NotFound("提成规则版本不存在。".into()))?;
    rule_code_lock(session, &code).await?;
    let row: Value = sqlx::query_scalar(
        "SELECT to_jsonb(r) FROM poms.commission_rule_version r WHERE id=$1 FOR UPDATE",
    )
    .bind(rule_id)
    .fetch_one(&mut *session.connection)
    .await?;
    next_version(version(&row)?)?;
    let activate = operation == "CommissionController_activateRuleVersion";
    let expected = if activate { "draft" } else { "active" };
    if row["status"] != expected {
        return Err(Error::Unprocessable(format!(
            "仅{expected}状态的提成规则可执行本操作。"
        )));
    }
    let now = crate::auth::model::clock_now();
    if activate {
        // Audit the automatically stopped version as well as the new activation.
        let stopped: Vec<Value> = sqlx::query_scalar("UPDATE poms.commission_rule_version AS r SET status='stopped',row_version=row_version+1,updated_at=$1,updated_by=$2 WHERE rule_code=$3 AND status='active' AND id<>$4 RETURNING to_jsonb(r)")
            .bind(now).bind(actor.id).bind(&code).bind(rule_id).fetch_all(&mut *session.connection).await?;
        for previous in stopped {
            rule_audit(
                session,
                actor,
                "CommissionController_stopRuleVersion",
                id(&previous, "id")?,
                Some(json!({"status":"active"})),
                rule_summary(&previous),
            )
            .await?;
        }
    }
    let changed: Value = sqlx::query_scalar("UPDATE poms.commission_rule_version AS r SET status=$1,effective_from=CASE WHEN $2 THEN COALESCE(effective_from,$3) ELSE effective_from END,row_version=row_version+1,updated_at=$3,updated_by=$4 WHERE id=$5 RETURNING to_jsonb(r)")
        .bind(if activate {"active"} else {"stopped"}).bind(activate).bind(now).bind(actor.id).bind(rule_id)
        .fetch_one(&mut *session.connection).await?;
    let result = rule_summary(&changed);
    rule_audit(
        session,
        actor,
        operation,
        rule_id,
        Some(rule_summary(&row)),
        result.clone(),
    )
    .await?;
    Ok(result)
}

async fn projection_packet(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    row: &Value,
    package: SensitiveFieldPackageKey,
    fields: &[(&str, &str)],
) -> Result<Value, Error> {
    let input = ProjectionInput {
        field_package_key: package,
        fields: fields
            .iter()
            .map(|(key, column)| StringField {
                key: (*key).into(),
                raw_value: row[*column].as_str().map(str::to_owned),
                display_text_when_full: None,
                masked_display_text: None,
                denied_display_text: None,
            })
            .collect(),
        user: Some(ProjectionUser {
            sub: actor.id,
            username: actor.session.user.username.clone(),
            permissions: actor
                .session
                .user
                .permissions
                .iter()
                .map(|p| p.as_str().to_owned())
                .collect(),
        }),
        target_type: "CommissionCalculation".into(),
        target_id: text(row, "id")?.into(),
        request_context: actor.request_context.clone(),
        mode_when_unauthorized: None,
        masked_display_text: None,
        denied_display_text: None,
    };
    let plan = projection::plan(&input).map_err(|_| Error::Internal)?;
    if let Some(event) = plan.event {
        insert_security_event(session.connection, &event).await?;
    }
    serde_json::to_value(plan.fields).map_err(|_| Error::Internal)
}

async fn calculation_summary(
    session: &mut CommonSession<'_, '_>,
    row: &Value,
    actor: &Actor,
) -> Result<Value, Error> {
    let finance = projection_packet(
        session,
        actor,
        row,
        SensitiveFieldPackageKey::OperatingFinance,
        &[
            (
                "recognizedRevenueTaxExclusiveProjection",
                "recognized_revenue_tax_exclusive",
            ),
            (
                "recognizedCostTaxExclusiveProjection",
                "recognized_cost_tax_exclusive",
            ),
            ("contributionMarginProjection", "contribution_margin"),
            (
                "contributionMarginRateProjection",
                "contribution_margin_rate",
            ),
        ],
    )
    .await?;
    let compensation = projection_packet(
        session,
        actor,
        row,
        SensitiveFieldPackageKey::CommissionCompensation,
        &[("commissionPoolProjection", "commission_pool")],
    )
    .await?;
    Ok(
        json!({"id":row["id"],"projectId":row["project_id"],"ruleVersionId":row["rule_version_id"],"version":row["version"],"rowVersion":row["row_version"],"isCurrent":row["is_current"],"status":row["status"],"recognizedRevenueTaxExclusiveProjection":finance["recognizedRevenueTaxExclusiveProjection"],"recognizedCostTaxExclusiveProjection":finance["recognizedCostTaxExclusiveProjection"],"contributionMarginProjection":finance["contributionMarginProjection"],"contributionMarginRateProjection":finance["contributionMarginRateProjection"],"commissionPoolProjection":compensation["commissionPoolProjection"],"recalculatedFromId":row["recalculated_from_id"],"approvedAt":instant(&row["approved_at"]),"createdAt":instant(&row["created_at"]),"updatedAt":instant(&row["updated_at"])}),
    )
}

async fn calculation_row(
    session: &mut CommonSession<'_, '_>,
    calculation_id: Uuid,
) -> Result<Value, Error> {
    sqlx::query_scalar("SELECT to_jsonb(c)||jsonb_build_object('recognized_revenue_tax_exclusive',c.recognized_revenue_tax_exclusive::text,'recognized_cost_tax_exclusive',c.recognized_cost_tax_exclusive::text,'contribution_margin',c.contribution_margin::text,'contribution_margin_rate',c.contribution_margin_rate::text,'commission_pool',c.commission_pool::text) FROM poms.commission_calculation c WHERE id=$1 FOR UPDATE")
        .bind(calculation_id).fetch_optional(&mut *session.connection).await?
        .ok_or_else(|| Error::NotFound("提成计算不存在。".into()))
}

async fn calculation_project(
    session: &mut CommonSession<'_, '_>,
    calculation_id: Uuid,
) -> Result<Uuid, Error> {
    sqlx::query_scalar("SELECT project_id FROM poms.commission_calculation WHERE id=$1")
        .bind(calculation_id)
        .fetch_optional(&mut *session.connection)
        .await?
        .ok_or_else(|| Error::NotFound("提成计算不存在。".into()))
}

async fn supported_facts(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    revenue: Decimal,
    cost: Decimal,
) -> Result<(), Error> {
    let active: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM poms.contract WHERE project_id=$1 AND status='active')",
    )
    .bind(project)
    .fetch_one(&mut *session.connection)
    .await?;
    if !active {
        return Err(Error::Unprocessable(
            "缺少已生效合同，无法计算提成。".into(),
        ));
    }
    let receipts: Decimal = sqlx::query_scalar("SELECT COALESCE(SUM(receipt_amount),0) FROM poms.receipt_record WHERE project_id=$1 AND status='confirmed'")
        .bind(project).fetch_one(&mut *session.connection).await?;
    let payments: Decimal = sqlx::query_scalar("SELECT COALESCE(SUM(amount_excluding_tax),0) FROM poms.payment_record WHERE project_id=$1 AND status='confirmed'")
        .bind(project).fetch_one(&mut *session.connection).await?;
    if receipts < revenue || payments < cost {
        return Err(Error::Unprocessable(
            "已确认回款或成本不足以支持本次提成计算口径。".into(),
        ));
    }
    Ok(())
}

async fn frozen_assignment(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
) -> Result<(), Error> {
    let frozen: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM poms.commission_role_assignment WHERE project_id=$1 AND is_current AND status='frozen')")
        .bind(project).fetch_one(&mut *session.connection).await?;
    if !frozen {
        return Err(Error::Unprocessable(
            "缺少当前已冻结的提成角色分配。".into(),
        ));
    }
    Ok(())
}

async fn insert_calculation(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    rule_id: Uuid,
    current: Option<&Value>,
    computed: &Calculation,
    actor: &Actor,
) -> Result<Value, Error> {
    let calculation_id = new_uuid()?;
    let previous_id = current.map(|row| id(row, "id")).transpose()?;
    if let Some(current) = current {
        next_version(version(current)?)?;
        sqlx::query("UPDATE poms.commission_calculation SET is_current=false,status='superseded',row_version=row_version+1,updated_at=$1,updated_by=$2 WHERE id=$3")
            .bind(crate::auth::model::clock_now()).bind(actor.id).bind(previous_id).execute(&mut *session.connection).await?;
    }
    let maximum: i32 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(version),0) FROM poms.commission_calculation WHERE project_id=$1",
    )
    .bind(project)
    .fetch_one(&mut *session.connection)
    .await?;
    sqlx::query("INSERT INTO poms.commission_calculation(id,project_id,rule_version_id,version,is_current,status,recognized_revenue_tax_exclusive,recognized_cost_tax_exclusive,contribution_margin,contribution_margin_rate,commission_pool,recalculated_from_id,created_by,updated_by) VALUES($1,$2,$3,$4,true,'calculated',$5,$6,$7,$8,$9,$10,$11,$11)")
        .bind(calculation_id).bind(project).bind(rule_id).bind(next_version(maximum)?)
        .bind(computed.revenue).bind(computed.cost).bind(computed.margin).bind(computed.margin_rate).bind(computed.pool)
        .bind(previous_id).bind(actor.id).execute(&mut *session.connection).await?;
    calculation_row(session, calculation_id).await
}

async fn create_calculation(
    session: &mut CommonSession<'_, '_>,
    project: Uuid,
    input: &CreateCalculation,
    actor: &Actor,
) -> Result<Value, Error> {
    facts::project(session, project, true).await?;
    let revenue = model::amount(&input.recognized_revenue_tax_exclusive)?;
    let cost = model::amount(&input.recognized_cost_tax_exclusive)?;
    supported_facts(session, project, revenue, cost).await?;
    let selected_rule = rule(session, input.rule_version_id).await?;
    if selected_rule["status"] != "active" {
        return Err(Error::Unprocessable(
            "仅激活规则可用于新的提成计算。".into(),
        ));
    }
    frozen_assignment(session, project).await?;
    let tiers: TierDefinition =
        serde_json::from_value(selected_rule["tier_definition_json"].clone())
            .map_err(|_| Error::Internal)?;
    let computed = model::calculate(revenue, cost, &tiers)?;
    let current: Option<Value> = sqlx::query_scalar("SELECT to_jsonb(c) FROM poms.commission_calculation c WHERE project_id=$1 AND is_current FOR UPDATE")
        .bind(project).fetch_optional(&mut *session.connection).await?;
    let row = insert_calculation(
        session,
        project,
        input.rule_version_id,
        current.as_ref(),
        &computed,
        actor,
    )
    .await?;
    facts::record(
        session,
        actor,
        "CommissionController_createCalculation",
        "commission-calculation",
        id(&row, "id")?,
        project,
        current,
        row.clone(),
    )
    .await?;
    calculation_summary(session, &row, actor).await
}

fn check_version(row: &Value, expected: Option<i32>) -> Result<(), Error> {
    if expected.is_some_and(|expected| Some(expected) != version(row).ok()) {
        return Err(Error::Conflict("提成计算版本已变化。".into()));
    }
    Ok(())
}

async fn approve_calculation(
    session: &mut CommonSession<'_, '_>,
    calculation_id: Uuid,
    expected: Option<i32>,
    actor: &Actor,
) -> Result<Value, Error> {
    let project = calculation_project(session, calculation_id).await?;
    facts::project(session, project, true).await?;
    let before = calculation_row(session, calculation_id).await?;
    check_version(&before, expected)?;
    next_version(version(&before)?)?;
    if before["status"] != "calculated" || before["is_current"] != true {
        return Err(Error::Unprocessable("仅当前已计算结果可确认生效。".into()));
    }
    sqlx::query("UPDATE poms.commission_calculation SET status='effective',approved_at=$1,approved_by=$2,row_version=row_version+1,updated_at=$1,updated_by=$2 WHERE id=$3")
        .bind(crate::auth::model::clock_now()).bind(actor.id).bind(calculation_id).execute(&mut *session.connection).await?;
    let row = calculation_row(session, calculation_id).await?;
    facts::record(
        session,
        actor,
        "CommissionController_approveCalculation",
        "commission-calculation",
        calculation_id,
        project,
        Some(before),
        row.clone(),
    )
    .await?;
    calculation_summary(session, &row, actor).await
}

async fn recalculate(
    session: &mut CommonSession<'_, '_>,
    calculation_id: Uuid,
    input: &Recalculate,
    actor: &Actor,
) -> Result<Value, Error> {
    let project = calculation_project(session, calculation_id).await?;
    facts::project(session, project, true).await?;
    let before = calculation_row(session, calculation_id).await?;
    check_version(&before, input.expected_version)?;
    if before["status"] != "effective" || before["is_current"] != true {
        return Err(Error::Unprocessable("仅当前已生效结果可重算。".into()));
    }
    let revenue = model::amount(
        input
            .recognized_revenue_tax_exclusive
            .as_deref()
            .unwrap_or(text(&before, "recognized_revenue_tax_exclusive")?),
    )?;
    let cost = model::amount(
        input
            .recognized_cost_tax_exclusive
            .as_deref()
            .unwrap_or(text(&before, "recognized_cost_tax_exclusive")?),
    )?;
    supported_facts(session, project, revenue, cost).await?;
    frozen_assignment(session, project).await?;
    let rule_id = id(&before, "rule_version_id")?;
    let selected_rule = rule(session, rule_id).await?;
    let tiers: TierDefinition =
        serde_json::from_value(selected_rule["tier_definition_json"].clone())
            .map_err(|_| Error::Internal)?;
    let computed = model::calculate(revenue, cost, &tiers)?;
    let row =
        insert_calculation(session, project, rule_id, Some(&before), &computed, actor).await?;
    let previous_pool = model::amount(text(&before, "commission_pool")?)?;
    sqlx::query("INSERT INTO poms.commission_adjustment(id,project_id,adjustment_type,related_calculation_id,amount,reason,status,executed_at,executed_by,created_by,updated_by) VALUES($1,$2,'recalculate',$3,$4,$5,'executed',$6,$7,$7,$7)")
        .bind(new_uuid()?).bind(project).bind(calculation_id).bind((computed.pool-previous_pool).abs()).bind(input.reason.trim())
        .bind(crate::auth::model::clock_now()).bind(actor.id).execute(&mut *session.connection).await?;
    facts::record(
        session,
        actor,
        "CommissionController_recalculateCalculation",
        "commission-calculation",
        id(&row, "id")?,
        project,
        Some(before),
        json!({"calculation":row,"reason":input.reason.trim()}),
    )
    .await?;
    calculation_summary(session, &row, actor).await
}
