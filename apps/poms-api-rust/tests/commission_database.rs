//! Opt-in functional SQL/HTTP regression against a dedicated migrated test DB.
//! Creates only its own fixture rows; failures and data are retained for review.
use axum::{
    Router,
    body::{Body, to_bytes},
    http::{Request, StatusCode, header},
};
use poms_api_rust::{
    auth::{cookie::AuthCookieService, http::AuthHttpState, service::AuthService},
    config::Config,
    database::Database,
    http::{self, AppState},
    shared::generated::PermissionKey,
};
use serde_json::{Value, json};
use sqlx::{
    PgPool,
    postgres::{PgConnectOptions, PgPoolOptions},
};
use std::{
    collections::HashMap,
    error::Error,
    fs,
    sync::Arc,
    time::{Duration, Instant},
};
use tower::ServiceExt;
use uuid::Uuid;
type Result<T = ()> = std::result::Result<T, Box<dyn Error>>;

struct Client {
    app: Router,
    cookie: String,
    csrf: String,
}
impl Client {
    async fn call(&self, method: &str, path: &str, body: Value) -> Result<(StatusCode, Value)> {
        let raw = body.to_string();
        let response = self
            .app
            .clone()
            .oneshot(
                Request::builder()
                    .method(method)
                    .uri(path)
                    .header(header::CONTENT_TYPE, "application/json")
                    .header(header::CONTENT_LENGTH, raw.len())
                    .header(header::COOKIE, &self.cookie)
                    .header("x-csrf-token", &self.csrf)
                    .body(Body::from(raw))?,
            )
            .await?;
        let status = response.status();
        let bytes = to_bytes(response.into_body(), 1024 * 1024).await?;
        Ok((status, serde_json::from_slice(&bytes)?))
    }
    async fn ok(&self, method: &str, path: &str, body: Value) -> Result<Value> {
        let (status, value) = self.call(method, path, body).await?;
        assert_eq!(status, StatusCode::OK, "{method} {path}: {value}");
        Ok(value)
    }
}

async fn uuid(pool: &PgPool) -> Result<Uuid> {
    Ok(sqlx::query_scalar("SELECT gen_random_uuid()")
        .fetch_one(pool)
        .await?)
}
fn row_id(row: &Value) -> Result<Uuid> {
    Ok(row["id"].as_str().ok_or("missing response ID")?.parse()?)
}

async fn project_fixture(pool: &PgPool, owner: Uuid, frozen: bool) -> Result<Uuid> {
    let project = uuid(pool).await?;
    let contract = uuid(pool).await?;
    sqlx::query("INSERT INTO poms.project(id,project_no,project_name,status,current_stage,owner_user_id) VALUES($1,$2,'commission SQL fixture','active','execution',$3)")
        .bind(project).bind(format!("CS-{project}")).bind(owner).execute(pool).await?;
    sqlx::query(
        "INSERT INTO poms.contract(id,project_id,contract_no,status) VALUES($1,$2,$3,'active')",
    )
    .bind(contract)
    .bind(project)
    .bind(format!("CS-{contract}"))
    .execute(pool)
    .await?;
    sqlx::query("INSERT INTO poms.receipt_record(project_id,contract_id,receipt_amount,receipt_date,source_type,status) VALUES($1,$2,100000,now(),'manual','confirmed')")
        .bind(project).bind(contract).execute(pool).await?;
    sqlx::query("INSERT INTO poms.payment_record(project_id,contract_id,amount_excluding_tax,payment_date,cost_category,source_type,status) VALUES($1,$2,70000.01,now(),'procurement','manual','confirmed')")
        .bind(project).bind(contract).execute(pool).await?;
    if frozen {
        // Valid persisted legacy frozen input; this test does not certify the
        // handover/freeze producer or manufacture a producer_version=1 payload.
        sqlx::query("INSERT INTO poms.commission_role_assignment(project_id,version,status,participants_json,frozen_at,frozen_by) VALUES($1,1,'frozen',$2,now(),$3)")
            .bind(project).bind(json!([{"userId":owner,"roleType":"sales-owner","weight":1}])).bind(owner).execute(pool).await?;
    }
    Ok(project)
}

struct Fixture {
    pool: PgPool,
    database: Database,
    client: Client,
    user: Uuid,
    role: Uuid,
}

async fn fixture(named_user: Option<&str>, permissions: &[PermissionKey]) -> Result<Fixture> {
    assert_eq!(
        std::env::var("POMS_COMMISSION_SQL_TEST").as_deref(),
        Ok("1")
    );
    let password = fs::read_to_string(std::env::var("POMS_COMMISSION_PASSWORD_FILE")?)?;
    let pool = PgPoolOptions::new()
        .max_connections(4)
        .after_connect(|connection, _| {
            Box::pin(async move {
                sqlx::query("SET TIME ZONE 'Etc/GMT-8'")
                    .execute(connection)
                    .await?;
                Ok(())
            })
        })
        .connect_with(
            PgConnectOptions::new()
                .host("127.0.0.1")
                .port(25477)
                .username("poms_commission_test")
                .password(password.trim())
                .database("poms_commission_delivery"),
        )
        .await?;
    let actual: String = sqlx::query_scalar("SELECT current_database()")
        .fetch_one(&pool)
        .await?;
    assert_eq!(actual, "poms_commission_delivery");
    let config = Config::from_map(&HashMap::from([
        ("DB_CONNECT".into(), "1".into()),
        ("DB_HOST".into(), "127.0.0.1".into()),
        ("DB_PORT".into(), "25477".into()),
        ("DB_DATABASE".into(), actual),
        ("DB_USER".into(), "poms_commission_test".into()),
        ("DB_PASSWORD".into(), password.trim().into()),
    ]))?;
    let database = Database::new(&config.database).await?;
    let existing: Option<Uuid> = if let Some(name) = named_user {
        sqlx::query_scalar("SELECT id FROM poms.platform_user WHERE username=$1")
            .bind(name)
            .fetch_optional(&pool)
            .await?
    } else {
        None
    };
    let user = match existing {
        Some(id) => id,
        None => uuid(&pool).await?,
    };
    let role = uuid(&pool).await?;
    let username = named_user
        .map(str::to_owned)
        .unwrap_or_else(|| format!("cs-{user}"));
    println!("commission fixture user/project namespace: {user}");
    sqlx::query("INSERT INTO poms.platform_user(id,username,display_name) VALUES($1,$2,'Commission SQL test') ON CONFLICT(id) DO NOTHING")
        .bind(user).bind(&username).execute(&pool).await?;
    sqlx::query("INSERT INTO poms.local_credential(user_id,password_hash) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING")
        .bind(user)
        .bind(bcrypt::hash("commission-test-only", 4)?)
        .execute(&pool)
        .await?;
    sqlx::query("INSERT INTO poms.role(id,role_key,name) VALUES($1,$2,'Commission SQL test')")
        .bind(role)
        .bind(format!("cs-{role}"))
        .execute(&pool)
        .await?;
    sqlx::query("INSERT INTO poms.user_role_assignment(user_id,role_id) VALUES($1,$2)")
        .bind(user)
        .bind(role)
        .execute(&pool)
        .await?;
    let mut permissions = permissions.to_vec();
    // These owned commission scenarios now invoke the real G receipt producer.
    // Financial-read and management-approval grants remain independent.
    if permissions.contains(&PermissionKey::CommissionCalculationsManage)
        && !permissions.contains(&PermissionKey::ContractFinanceManage)
    {
        permissions.push(PermissionKey::ContractFinanceManage);
    }
    for permission in &permissions {
        sqlx::query(
            "INSERT INTO poms.role_permission_assignment(role_id,permission_key) VALUES($1,$2)",
        )
        .bind(role)
        .bind(permission.as_str())
        .execute(&pool)
        .await?;
    }
    let auth = AuthHttpState {
        service: Arc::new(AuthService::new(database.clone(), config.auth.clone())),
        cookies: AuthCookieService::from_auth_config(&config.auth),
    };
    let password_path = std::path::PathBuf::from(std::env::var("POMS_COMMISSION_PASSWORD_FILE")?);
    let storage_root = password_path
        .parent()
        .ok_or("owned test directory")?
        .join("r4-native-attachments")
        .join(user.to_string());
    let storage_settings =
        poms_api_rust::attachment_storage::AttachmentRuntimeSettings::from_map(&HashMap::from([(
            "POMS_ATTACHMENT_LOCAL_ROOT".into(),
            storage_root.to_string_lossy().into_owned(),
        )]));
    let app = http::router_with_runtime_settings(
        AppState {
            database: database.clone(),
            started_at: Instant::now(),
        },
        &[],
        auth,
        poms_api_rust::provider_support::ProviderSettings::default(),
        storage_settings,
    );
    let anonymous_csrf = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/auth/csrf-token")
                .body(Body::empty())?,
        )
        .await?;
    assert_eq!(anonymous_csrf.status(), StatusCode::OK);
    let anonymous_cookie = anonymous_csrf
        .headers()
        .get_all(header::SET_COOKIE)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .find(|value| value.starts_with("poms_csrf="))
        .and_then(|value| value.split(';').next())
        .ok_or("missing anonymous CSRF cookie")?;
    let anonymous_token = anonymous_cookie
        .strip_prefix("poms_csrf=")
        .ok_or("CSRF token")?;
    let login_body = json!({"username":username,"password":"commission-test-only"}).to_string();
    let login = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/sessions")
                .header(header::CONTENT_TYPE, "application/json")
                .header(header::CONTENT_LENGTH, login_body.len())
                .header(header::COOKIE, anonymous_cookie)
                .header("x-csrf-token", anonymous_token)
                .body(Body::from(login_body))?,
        )
        .await?;
    assert_eq!(login.status(), StatusCode::OK);
    let cookies = login
        .headers()
        .get_all(header::SET_COOKIE)
        .iter()
        .map(|v| {
            v.to_str()
                .map(|s| s.split(';').next().unwrap_or("").to_owned())
        })
        .collect::<std::result::Result<Vec<_>, _>>()?;
    let csrf = cookies
        .iter()
        .find_map(|v| v.strip_prefix("poms_csrf="))
        .ok_or("missing CSRF cookie")?
        .to_owned();
    let client = Client {
        app,
        cookie: cookies.join("; "),
        csrf,
    };
    Ok(Fixture {
        pool,
        database,
        client,
        user,
        role,
    })
}

#[tokio::test]
#[ignore = "requires explicit dedicated commission DB initialized from application migrations"]
async fn rule_calculation_http_sql_lifecycle_conflicts_concurrency_and_rollback() -> Result {
    let Fixture {
        pool,
        database,
        client,
        user,
        role,
    } = fixture(
        None,
        &[
            PermissionKey::CommissionRuleVersionsManage,
            PermissionKey::CommissionCalculationsManage,
            PermissionKey::OperatingFinanceSensitiveRead,
            PermissionKey::CommissionAmountSensitiveRead,
        ],
    )
    .await?;
    let code = format!("CS-{user}");
    let rule_body = json!({"ruleCode":code,"version":1,"tierDefinitionJson":{"tiers":[
        {"minMarginRate":0.3,"maxMarginRate":null,"commissionRate":0.2},
        {"minMarginRate":0,"maxMarginRate":0.3,"commissionRate":0.1}]}});
    let rule = client
        .ok("POST", "/api/commission-rule-versions", rule_body.clone())
        .await?;
    let rule_id = row_id(&rule)?;
    assert_eq!(rule["status"], "draft");
    assert_eq!(
        client
            .call("POST", "/api/commission-rule-versions", rule_body.clone())
            .await?
            .0,
        StatusCode::CONFLICT
    );
    client
        .ok(
            "POST",
            &format!("/api/commission-rule-versions/{rule_id}:activate"),
            json!({}),
        )
        .await?;
    let project = payout_inputs(&client, &pool, user, "0.10", "0.20")
        .await?
        .project;
    let path = format!("/api/projects/{project}/commission-calculations");
    let input = json!({"ruleVersionId":rule_id,"recognizedRevenueTaxExclusive":"100000.00","recognizedCostTaxExclusive":"70000.00"});
    let calculation = client.ok("POST", &path, input.clone()).await?;
    let calculation_id = row_id(&calculation)?;
    assert_eq!(calculation["commissionPoolProjection"]["value"], "6000.00");
    assert_eq!(calculation["rowVersion"], 1);
    let mut excessive = input.clone();
    excessive["recognizedRevenueTaxExclusive"] = json!("100000.01");
    assert_eq!(
        client.call("POST", &path, excessive).await?.0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    let missing = project_fixture(&pool, user, false).await?;
    assert_eq!(
        client
            .call(
                "POST",
                &format!("/api/projects/{missing}/commission-calculations"),
                input.clone()
            )
            .await?
            .0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    let approve = format!("/api/commission-calculations/{calculation_id}:approve");
    assert_eq!(
        client
            .call("POST", &approve, json!({"expectedVersion":999}))
            .await?
            .0,
        StatusCode::CONFLICT
    );
    let effective = client
        .ok("POST", &approve, json!({"expectedVersion":1}))
        .await?;
    assert_eq!(effective["status"], "effective");
    assert_eq!(effective["rowVersion"], 2);

    // Force a real PostgreSQL audit insert failure after supersession, new
    // calculation and adjustment SQL have executed. All must roll back together.
    let fault = format!("commission_abort_{}", user.simple());
    let sql = format!(
        "CREATE FUNCTION poms.{fault}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event_type='CommissionController_recalculateCalculation' AND NEW.after_snapshot->>'reason'='force-test-rollback' AND NEW.after_snapshot->'calculation'->>'project_id'='{project}' THEN RAISE EXCEPTION 'owned commission rollback test'; END IF; RETURN NEW; END $$; CREATE TRIGGER {fault} BEFORE INSERT ON poms.audit_log FOR EACH ROW EXECUTE FUNCTION poms.{fault}();"
    );
    // The only interpolated identifiers/literals are server-generated UUIDs;
    // request text never enters this fixture DDL.
    sqlx::raw_sql(sqlx::AssertSqlSafe(sql))
        .execute(&pool)
        .await?;
    let recalculate = format!("/api/commission-calculations/{calculation_id}:recalculate");
    assert_eq!(client.call("POST",&recalculate,json!({"reason":"force-test-rollback","expectedVersion":2,"recognizedCostTaxExclusive":"50000.00"})).await?.0,StatusCode::INTERNAL_SERVER_ERROR);
    let current: (i64,i64) = sqlx::query_as("SELECT count(*),count(*) FILTER(WHERE is_current AND status='effective' AND row_version=2) FROM poms.commission_calculation WHERE project_id=$1")
        .bind(project).fetch_one(&pool).await?;
    assert_eq!(current, (1, 1));
    let adjustments: i64 =
        sqlx::query_scalar("SELECT count(*) FROM poms.commission_adjustment WHERE project_id=$1")
            .bind(project)
            .fetch_one(&pool)
            .await?;
    assert_eq!(adjustments, 0);
    let (left,right) = tokio::join!(
        client.call("POST",&recalculate,json!({"reason":"concurrent A","expectedVersion":2,"recognizedCostTaxExclusive":"65000.00"})),
        client.call("POST",&recalculate,json!({"reason":"concurrent B","expectedVersion":2,"recognizedCostTaxExclusive":"60000.00"})));
    let mut statuses = [left?.0.as_u16(), right?.0.as_u16()];
    statuses.sort();
    assert_eq!(statuses, [200, 409]);
    let current: (i64,i64) = sqlx::query_as("SELECT count(*),count(*) FILTER(WHERE is_current) FROM poms.commission_calculation WHERE project_id=$1")
        .bind(project).fetch_one(&pool).await?;
    assert_eq!(current, (2, 1));
    let adjustments: i64 = sqlx::query_scalar("SELECT count(*) FROM poms.commission_adjustment WHERE project_id=$1 AND status='executed' AND related_calculation_id=$2 AND executed_by=$3")
        .bind(project).bind(calculation_id).bind(user).fetch_one(&pool).await?;
    assert_eq!(adjustments, 1);

    let boundary_project = payout_inputs(&client, &pool, user, "0.10", "0.20")
        .await?
        .project;
    let boundary = client.ok("POST",&format!("/api/projects/{boundary_project}/commission-calculations"),
        json!({"ruleVersionId":rule_id,"recognizedRevenueTaxExclusive":"100000.00","recognizedCostTaxExclusive":"70000.01"})).await?;
    assert_eq!(
        boundary["contributionMarginRateProjection"]["value"],
        "0.3000"
    );
    assert_eq!(boundary["commissionPoolProjection"]["value"], "3000.00");
    let mut second_body = rule_body.clone();
    second_body["version"] = json!(2);
    let second = client
        .ok("POST", "/api/commission-rule-versions", second_body)
        .await?;
    let second_id = row_id(&second)?;
    client
        .ok(
            "POST",
            &format!("/api/commission-rule-versions/{second_id}:activate"),
            json!({}),
        )
        .await?;
    let active: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM poms.commission_rule_version WHERE rule_code=$1 AND status='active'",
    )
    .bind(&code)
    .fetch_one(&pool)
    .await?;
    assert_eq!(active, 1);
    assert_eq!(
        client.call("POST", &path, input.clone()).await?.0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    client
        .ok(
            "POST",
            &format!("/api/commission-rule-versions/{second_id}:stop"),
            json!({}),
        )
        .await?;
    assert_eq!(
        client
            .call(
                "POST",
                &format!("/api/commission-rule-versions/{second_id}:stop"),
                json!({})
            )
            .await?
            .0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    let rules = client
        .ok("GET", "/api/commission-rule-versions", json!({}))
        .await?;
    assert_eq!(
        rules
            .as_array()
            .ok_or("rule list")?
            .iter()
            .filter(|v| v["ruleCode"] == code)
            .count(),
        2
    );

    for key in [
        PermissionKey::OperatingFinanceSensitiveRead,
        PermissionKey::CommissionAmountSensitiveRead,
    ] {
        sqlx::query("UPDATE poms.role_permission_assignment SET status='revoked',revoked_at=now() WHERE role_id=$1 AND permission_key=$2")
            .bind(role).bind(key.as_str()).execute(&pool).await?;
    }
    let hidden = client.ok("GET", &path, json!({})).await?;
    let first = hidden
        .as_array()
        .ok_or("calculation list")?
        .first()
        .ok_or("missing calculation")?;
    assert_eq!(first["commissionPoolProjection"]["mode"], "masked");
    assert!(first["commissionPoolProjection"]["value"].is_null());
    assert_eq!(
        first["recognizedRevenueTaxExclusiveProjection"]["mode"],
        "masked"
    );
    sqlx::query("UPDATE poms.role_permission_assignment SET status='revoked',revoked_at=now() WHERE role_id=$1 AND permission_key=$2")
        .bind(role).bind(PermissionKey::CommissionCalculationsManage.as_str()).execute(&pool).await?;
    assert_eq!(
        client.call("GET", &path, json!({})).await?.0,
        StatusCode::FORBIDDEN
    );
    database.close(Duration::from_secs(2)).await?;
    pool.close().await;
    Ok(())
}

async fn approve_adjustment(
    owner: &Client,
    finance: &Client,
    pool: &PgPool,
    project: Uuid,
    body: Value,
) -> Result<Uuid> {
    let row = owner
        .ok(
            "POST",
            &format!("/api/projects/{project}/commission-adjustments"),
            body,
        )
        .await?;
    let adjustment = row_id(&row)?;
    assert_eq!(row["status"], "draft");
    assert_eq!(
        owner
            .call(
                "POST",
                &format!("/api/commission-adjustments/{adjustment}:execute"),
                json!({"expectedVersion":1})
            )
            .await?
            .0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    let pending = owner
        .ok(
            "POST",
            &format!("/api/commission-adjustments/{adjustment}:submitApproval"),
            json!({"expectedVersion":1}),
        )
        .await?;
    assert_eq!(pending["status"], "pending-approval");
    assert_eq!(pending["rowVersion"], 2);
    assert_eq!(
        owner
            .call(
                "POST",
                &format!("/api/commission-adjustments/{adjustment}:submitApproval"),
                json!({"expectedVersion":2})
            )
            .await?
            .0,
        StatusCode::CONFLICT
    );
    let approval: Uuid = sqlx::query_scalar("SELECT id FROM poms.approval_record WHERE target_object_id=$1 AND current_status='pending'")
        .bind(adjustment).fetch_one(pool).await?;
    let path = format!("/api/approval-records/{approval}:approve");
    assert_eq!(
        owner
            .call("POST", &path, json!({"expectedVersion":1}))
            .await?
            .0,
        StatusCode::FORBIDDEN
    );
    finance
        .ok("POST", &path, json!({"expectedVersion":1}))
        .await?;
    let state: (String, i32) =
        sqlx::query_as("SELECT status,row_version FROM poms.commission_adjustment WHERE id=$1")
            .bind(adjustment)
            .fetch_one(pool)
            .await?;
    assert_eq!(state, ("approved".into(), 3));
    let completed: i64 = sqlx::query_scalar("SELECT count(*) FROM poms.todo_item WHERE source_id=$1 AND status='completed' AND summary IS NULL")
        .bind(approval).fetch_one(pool).await?;
    assert_eq!(completed, 1);
    Ok(adjustment)
}

#[tokio::test]
#[ignore = "requires explicit dedicated commission DB initialized from application migrations"]
async fn adjustment_real_approval_execution_and_cumulative_clawback() -> Result {
    let Fixture {
        pool,
        database,
        client,
        user,
        role: _,
    } = fixture(
        None,
        &[
            PermissionKey::CommissionRuleVersionsManage,
            PermissionKey::CommissionCalculationsManage,
            PermissionKey::CommissionAdjustmentsManage,
            PermissionKey::ProjectWrite,
            PermissionKey::CommissionAmountSensitiveRead,
            PermissionKey::OperatingFinanceSensitiveRead,
        ],
    )
    .await?;
    let finance = fixture(
        Some("finance_mgr"),
        &[
            PermissionKey::CommissionAdjustmentsManage,
            PermissionKey::ProjectWrite,
        ],
    )
    .await?;
    let rule = client.ok("POST","/api/commission-rule-versions",json!({"ruleCode":format!("AD-{user}"),"version":1,"tierDefinitionJson":{"tiers":[{"minMarginRate":0,"maxMarginRate":null,"commissionRate":0.2}]}})).await?;
    let rule_id = row_id(&rule)?;
    client
        .ok(
            "POST",
            &format!("/api/commission-rule-versions/{rule_id}:activate"),
            json!({}),
        )
        .await?;
    let project = payout_inputs(&client, &pool, user, "0.10", "0.20")
        .await?
        .project;
    sqlx::query("INSERT INTO poms.acceptance_record(project_id,acceptance_type,acceptance_result,status,scope_summary,evidence_summary,confirmed_at) VALUES($1,'stage-outcome','accepted','confirmed','owned legacy stage scope','explicit owned legacy evidence',now())").bind(project).execute(&pool).await?;
    let calculation = client.ok("POST",&format!("/api/projects/{project}/commission-calculations"),json!({"ruleVersionId":rule_id,"recognizedRevenueTaxExclusive":"100000","recognizedCostTaxExclusive":"70000"})).await?;
    let calculation_id = row_id(&calculation)?;
    client
        .ok(
            "POST",
            &format!("/api/commission-calculations/{calculation_id}:approve"),
            json!({"expectedVersion":1}),
        )
        .await?;
    let mut payouts = Vec::new();
    for stage in ["first", "second", "final", "retention"] {
        // Persisted primary payout input: producer APIs are a later slice.
        let payout: Uuid = sqlx::query_scalar("INSERT INTO poms.commission_payout(project_id,calculation_id,stage_type,payout_kind,selected_tier,theoretical_cap_amount,approved_amount,paid_record_amount,status,approved_at,handled_at) VALUES($1,$2,$3,'primary','basic',100,100,100,'paid',now(),now()) RETURNING id")
            .bind(project).bind(calculation_id).bind(stage).fetch_one(&pool).await?;
        payouts.push(payout);
    }
    let create_path = format!("/api/projects/{project}/commission-adjustments");
    let no_amount =
        json!({"adjustmentType":"clawback","relatedPayoutId":payouts[0],"reason":"missing amount"});
    assert_eq!(
        client.call("POST", &create_path, no_amount).await?.0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    let mismatched = json!({"adjustmentType":"clawback","relatedPayoutId":payouts[0],"relatedCalculationId":rule_id,"amount":"1","reason":"wrong calculation"});
    assert_eq!(
        client.call("POST", &create_path, mismatched).await?.0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    let first = approve_adjustment(&client,&finance.client,&pool,project,json!({"adjustmentType":"clawback","relatedPayoutId":payouts[0],"amount":"60","reason":"first clawback"})).await?;
    let execute_path = format!("/api/commission-adjustments/{first}:execute");
    let (a, b) = tokio::join!(
        client.call("POST", &execute_path, json!({"expectedVersion":3})),
        client.call("POST", &execute_path, json!({"expectedVersion":3}))
    );
    let mut statuses = [a?.0.as_u16(), b?.0.as_u16()];
    statuses.sort();
    assert_eq!(statuses, [200, 409]);
    let excess = approve_adjustment(&client,&finance.client,&pool,project,json!({"adjustmentType":"clawback","relatedPayoutId":payouts[0],"amount":"50","reason":"exceeds remaining amount"})).await?;
    assert_eq!(
        client
            .call(
                "POST",
                &format!("/api/commission-adjustments/{excess}:execute"),
                json!({"expectedVersion":3})
            )
            .await?
            .0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    let amount: String = sqlx::query_scalar("SELECT SUM(amount)::text FROM poms.commission_adjustment WHERE related_payout_id=$1 AND status='executed' AND adjustment_type='clawback'")
        .bind(payouts[0]).fetch_one(&pool).await?;
    assert_eq!(amount, "60.00");
    let last = approve_adjustment(&client,&finance.client,&pool,project,json!({"adjustmentType":"clawback","relatedPayoutId":payouts[0],"amount":"40","reason":"remaining clawback"})).await?;
    client
        .ok(
            "POST",
            &format!("/api/commission-adjustments/{last}:execute"),
            json!({"expectedVersion":3}),
        )
        .await?;
    let status: String =
        sqlx::query_scalar("SELECT status FROM poms.commission_payout WHERE id=$1")
            .bind(payouts[0])
            .fetch_one(&pool)
            .await?;
    assert_eq!(status, "reversed");
    let supplement = approve_adjustment(&client,&finance.client,&pool,project,json!({"adjustmentType":"supplement","relatedPayoutId":payouts[1],"amount":"25","reason":"approved supplement"})).await?;
    let result = client
        .ok(
            "POST",
            &format!("/api/commission-adjustments/{supplement}:execute"),
            json!({"expectedVersion":3}),
        )
        .await?;
    assert_eq!(result["status"], "executed");
    assert_eq!(result["rowVersion"], 4);
    assert_eq!(
        client
            .call(
                "POST",
                &format!("/api/commission-adjustments/{supplement}:execute"),
                json!({"expectedVersion":3})
            )
            .await?
            .0,
        StatusCode::CONFLICT
    );
    let compensating: Vec<(Uuid,String,String)> = sqlx::query_as("SELECT id,paid_record_amount::text,status FROM poms.commission_payout WHERE source_payout_id=$1 AND payout_kind='supplement'")
        .bind(payouts[1]).fetch_all(&pool).await?;
    assert_eq!(compensating.len(), 1);
    assert_eq!(compensating[0].1, "25.00");
    assert_eq!(compensating[0].2, "paid");
    assert_eq!(client.call("POST",&create_path,json!({"adjustmentType":"reverse-payout","relatedPayoutId":compensating[0].0,"reason":"cannot adjust compensating payout"})).await?.0,StatusCode::UNPROCESSABLE_ENTITY);
    let orphan = client.ok("POST",&create_path,json!({"adjustmentType":"reverse-payout","relatedPayoutId":payouts[2],"reason":"negative fixture: missing approval record"})).await?;
    let orphan_id = row_id(&orphan)?;
    sqlx::query("UPDATE poms.commission_adjustment SET status='approved',row_version=row_version+1 WHERE id=$1").bind(orphan_id).execute(&pool).await?;
    assert_eq!(
        client
            .call(
                "POST",
                &format!("/api/commission-adjustments/{orphan_id}:execute"),
                json!({"expectedVersion":2})
            )
            .await?
            .0,
        StatusCode::CONFLICT
    );
    let unchanged: String =
        sqlx::query_scalar("SELECT status FROM poms.commission_payout WHERE id=$1")
            .bind(payouts[2])
            .fetch_one(&pool)
            .await?;
    assert_eq!(unchanged, "paid");
    for kind in ["suspend-payout", "reverse-payout"] {
        let adjustment = approve_adjustment(
            &client,
            &finance.client,
            &pool,
            project,
            json!({"adjustmentType":kind,"relatedPayoutId":payouts[2],"reason":kind}),
        )
        .await?;
        client
            .ok(
                "POST",
                &format!("/api/commission-adjustments/{adjustment}:execute"),
                json!({"expectedVersion":3}),
            )
            .await?;
    }
    let status: String =
        sqlx::query_scalar("SELECT status FROM poms.commission_payout WHERE id=$1")
            .bind(payouts[2])
            .fetch_one(&pool)
            .await?;
    assert_eq!(status, "reversed");
    // A deliberately incomplete historical input must remain unknown rather
    // than granting a fresh cash allowance through SUM's null-skipping rule.
    sqlx::query("INSERT INTO poms.commission_adjustment(project_id,adjustment_type,related_payout_id,related_calculation_id,amount,reason,status) VALUES($1,'clawback',$2,$3,NULL,'negative fixture: unknown historical clawback','executed')")
        .bind(project).bind(payouts[3]).bind(calculation_id).execute(&pool).await?;
    let unknown = approve_adjustment(&client,&finance.client,&pool,project,json!({"adjustmentType":"clawback","relatedPayoutId":payouts[3],"amount":"1","reason":"must preserve unknown historical balance"})).await?;
    assert_eq!(
        client
            .call(
                "POST",
                &format!("/api/commission-adjustments/{unknown}:execute"),
                json!({"expectedVersion":3})
            )
            .await?
            .0,
        StatusCode::CONFLICT
    );
    let other = project_fixture(&pool, user, false).await?;
    assert_eq!(client.call("POST",&format!("/api/projects/{other}/commission-adjustments"),json!({"adjustmentType":"supplement","relatedPayoutId":payouts[1],"amount":"1","reason":"cross project"})).await?.0,StatusCode::NOT_FOUND);
    let list = client.ok("GET", &create_path, json!({})).await?;
    assert!(
        list.as_array()
            .ok_or("adjustment list")?
            .iter()
            .any(|row| row["id"] == supplement.to_string())
    );
    database.close(Duration::from_secs(2)).await?;
    pool.close().await;
    finance.database.close(Duration::from_secs(2)).await?;
    finance.pool.close().await;
    Ok(())
}

struct PayoutInputs {
    project: Uuid,
    contract: Uuid,
    term: Uuid,
    freeze: Uuid,
    review: Uuid,
    summary: Uuid,
}

async fn payout_inputs(
    client: &Client,
    pool: &PgPool,
    owner: Uuid,
    retention: &str,
    down: &str,
) -> Result<PayoutInputs> {
    payout_inputs_custom(client, pool, owner, retention, down, "100000", -30).await
}

async fn payout_inputs_custom(
    client: &Client,
    pool: &PgPool,
    owner: Uuid,
    retention: &str,
    down: &str,
    amount: &str,
    due_days: i32,
) -> Result<PayoutInputs> {
    payout_inputs_received(
        client, pool, owner, retention, down, amount, due_days, amount,
    )
    .await
}

#[allow(clippy::too_many_arguments)]
async fn payout_inputs_received(
    client: &Client,
    pool: &PgPool,
    owner: Uuid,
    retention: &str,
    down: &str,
    amount: &str,
    due_days: i32,
    receipt_net: &str,
) -> Result<PayoutInputs> {
    let project = project_fixture(pool, owner, false).await?;
    let contract: Uuid = sqlx::query_scalar("SELECT id FROM poms.contract WHERE project_id=$1")
        .bind(project)
        .fetch_one(pool)
        .await?;
    sqlx::query(
        "UPDATE poms.receipt_record SET receipt_amount=$1::text::numeric WHERE project_id=$2",
    )
    .bind(amount)
    .bind(project)
    .execute(pool)
    .await?;
    let term: Uuid=sqlx::query_scalar("INSERT INTO poms.contract_term_snapshot(contract_id,snapshot_status,amount_tax_inclusive,amount_tax_exclusive,tax_rate,down_payment_rate,retention_rate,retention_due_date,currency_code) VALUES($1,'active',ROUND($4::text::numeric*1.13,2),$4::text::numeric,0.13,$2::text::numeric,$3::text::numeric,current_date+$5,'CNY') RETURNING id")
        .bind(contract).bind(down).bind(retention).bind(amount).bind(due_days).fetch_one(pool).await?;
    sqlx::query("UPDATE poms.contract SET current_snapshot_id=$1 WHERE id=$2")
        .bind(term)
        .bind(contract)
        .execute(pool)
        .await?;
    let existing_org:Option<Uuid>=sqlx::query_scalar("SELECT m.org_unit_id FROM poms.user_org_membership m JOIN poms.org_unit o ON o.id=m.org_unit_id AND o.is_active WHERE m.user_id=$1 AND m.status='active' AND m.membership_type='primary' ORDER BY m.created_at,m.id LIMIT 1").bind(owner).fetch_optional(pool).await?;
    let org = if let Some(org) = existing_org {
        org
    } else {
        let org = uuid(pool).await?;
        sqlx::query("INSERT INTO poms.org_unit(id,name,code,is_active) VALUES($1,$2,$3,true)")
            .bind(org)
            .bind(format!("Commission finance {org}"))
            .bind(format!("cs-{org}"))
            .execute(pool)
            .await?;
        sqlx::query("INSERT INTO poms.user_org_membership(user_id,org_unit_id,membership_type,status) VALUES($1,$2,'primary','active')").bind(owner).bind(org).execute(pool).await?;
        org
    };
    sqlx::query("UPDATE poms.project SET owner_org_id=$1 WHERE id=$2")
        .bind(org)
        .bind(project)
        .execute(pool)
        .await?;
    // Known, persisted legacy activated terms; not a fabricated R4A producer.
    let declared = json!({"inputKind":"owned-legacy-activated-terms","contractId":contract,"amountTaxExclusive":amount,"taxRate":"0.13","currencyCode":"CNY"});
    let declared_hash = poms_api_rust::contract_support::canonical_hash(&declared)
        .map_err(|_| "legacy declared terms hash")?;
    sqlx::query("UPDATE poms.contract_term_snapshot SET payload_hash=$1,effective_at=clock_timestamp() WHERE id=$2").bind(declared_hash).bind(term).execute(pool).await?;
    let receipt: Uuid = sqlx::query_scalar(
        "SELECT id FROM poms.receipt_record WHERE project_id=$1 ORDER BY id LIMIT 1",
    )
    .bind(project)
    .fetch_one(pool)
    .await?;
    confirm_net_receipt(
        client,
        pool,
        project,
        contract,
        term,
        receipt_net,
        "manual",
        Some(receipt),
    )
    .await?;
    let package: Uuid=sqlx::query_scalar("INSERT INTO poms.approval_summary_package_definition(approval_scenario_key,summary_package_key,projection_level,export_policy,field_rule_version) VALUES($1,$1,'commission-controlled','internal-only','explicit-legacy-test-input') RETURNING id")
        .bind(format!("payout-sql-{project}")).fetch_one(pool).await?;
    let handover_id = uuid(pool).await?;
    let binding_id = uuid(pool).await?;
    let mut summaries = Vec::new();
    for (target_type, target) in [
        ("contract", contract),
        ("project-handover", handover_id),
        ("commission-gate-binding", binding_id),
    ] {
        let summary: Uuid=sqlx::query_scalar("INSERT INTO poms.approval_summary_snapshot(target_type,target_id,approval_scenario_key,summary_package_id,summary_package_key,projection_level,export_policy,business_status_at_snapshot) VALUES($4,$1,$2,$3,$2,'commission-controlled','internal-only','confirmed') RETURNING id")
            .bind(target).bind(format!("payout-sql-{project}")).bind(package).bind(target_type).fetch_one(pool).await?;
        summaries.push(summary);
    }
    let handover: Uuid=sqlx::query_scalar("INSERT INTO poms.project_handover(id,project_id,contract_summary_snapshot_id,effective_handover_baseline_snapshot_id,summary_snapshot_id,status,is_current,confirmed_at,confirmed_by) VALUES($6,$1,$2,$3,$4,'confirmed',true,now(),$5) RETURNING id")
        .bind(project).bind(summaries[0]).bind(term).bind(summaries[1]).bind(owner).bind(handover_id).fetch_one(pool).await?;
    let freeze: Uuid=sqlx::query_scalar("INSERT INTO poms.commission_role_assignment(project_id,version,status,participants_json,frozen_at,frozen_by,source_handover_id,contract_summary_snapshot_id,handover_summary_snapshot_id,effective_handover_baseline_snapshot_id) VALUES($1,1,'frozen',$2,now(),$3,$4,$5,$6,$7) RETURNING id")
        .bind(project).bind(json!([{"userId":owner,"roleType":"sales-owner","weight":1}])).bind(owner).bind(handover).bind(summaries[0]).bind(summaries[1]).bind(term).fetch_one(pool).await?;
    let snapshot: Uuid=sqlx::query_scalar("INSERT INTO poms.project_operating_snapshot(project_id,snapshot_mode,tax_impact_summary,current_action_level,referenced_baseline_version) VALUES($1,'realtime','explicit test tax basis','prompt','legacy-test-1') RETURNING id")
        .bind(project).fetch_one(pool).await?;
    let maturity: Uuid=sqlx::query_scalar("INSERT INTO poms.data_maturity_evaluation_result(project_id,referenced_snapshot_id,data_maturity_level,cost_action_recommendation) VALUES($1,$2,'mature','prompt') RETURNING id")
        .bind(project).bind(snapshot).fetch_one(pool).await?;
    let signal: Uuid=sqlx::query_scalar("INSERT INTO poms.operating_signal_evaluation_result(project_id,referenced_snapshot_id,data_maturity_evaluation_id,variance_source_summary,tax_impact_summary,referenced_baseline_version,referenced_snapshot_version) VALUES($1,$2,$3,'explicit test source','explicit test tax basis','legacy-test-1','legacy-test-1') RETURNING id")
        .bind(project).bind(snapshot).bind(maturity).fetch_one(pool).await?;
    let binding: Uuid=sqlx::query_scalar("INSERT INTO poms.operating_signal_gate_binding(id,project_id,signal_evaluation_id,binding_action,gate_stage_type,baseline_selection_source,tax_impact_summary,tax_impact_pending_amount,tax_pending_knowledge,data_maturity_level,cost_action_recommendation,current_action_level,referenced_baseline_version,referenced_snapshot_version) VALUES($3,$1,$2,'prompt','final','original','explicit test tax basis',0,'known','mature','prompt','prompt','legacy-test-1','legacy-test-1') RETURNING id")
        .bind(project).bind(signal).bind(binding_id).fetch_one(pool).await?;
    let review: Uuid=sqlx::query_scalar("INSERT INTO poms.commission_gate_review_record(binding_id,gate_review_decision,summary_package_key,summary_snapshot_id,projection_level,export_policy,handled_by) VALUES($1,'allow',$2,$3,'commission-controlled','internal-only',$4) RETURNING id")
        .bind(binding).bind(format!("payout-sql-{project}")).bind(summaries[2]).bind(owner).fetch_one(pool).await?;
    Ok(PayoutInputs {
        project,
        contract,
        term,
        freeze,
        review,
        summary: summaries[2],
    })
}

async fn calculated(client: &Client, project: Uuid, user: Uuid) -> Result<Uuid> {
    calculated_amount(client, project, user, "100000").await
}

async fn calculated_amount(
    client: &Client,
    project: Uuid,
    user: Uuid,
    amount: &str,
) -> Result<Uuid> {
    calculated_values(client, project, user, amount, "70000").await
}

async fn calculated_values(
    client: &Client,
    project: Uuid,
    user: Uuid,
    amount: &str,
    cost: &str,
) -> Result<Uuid> {
    let rule=client.ok("POST","/api/commission-rule-versions",json!({"ruleCode":format!("PAY-{user}-{project}").chars().take(64).collect::<String>(),"version":1,"tierDefinitionJson":{"tiers":[{"minMarginRate":0,"maxMarginRate":null,"commissionRate":0.2}]}})).await?;
    let rule_id = row_id(&rule)?;
    client
        .ok(
            "POST",
            &format!("/api/commission-rule-versions/{rule_id}:activate"),
            json!({}),
        )
        .await?;
    let calculation=client.ok("POST",&format!("/api/projects/{project}/commission-calculations"),json!({"ruleVersionId":rule_id,"recognizedRevenueTaxExclusive":amount,"recognizedCostTaxExclusive":cost})).await?;
    let id = row_id(&calculation)?;
    client
        .ok(
            "POST",
            &format!("/api/commission-calculations/{id}:approve"),
            json!({"expectedVersion":1}),
        )
        .await?;
    Ok(id)
}

async fn payout_draft(
    client: &Client,
    project: Uuid,
    calculation: Uuid,
    stage: &str,
) -> Result<Value> {
    client
        .ok(
            "POST",
            &format!("/api/projects/{project}/commission-payouts"),
            json!({"calculationId":calculation,"stageType":stage}),
        )
        .await
}
async fn payout_approve(
    owner: &Client,
    finance: &Client,
    pool: &PgPool,
    payout: Uuid,
    stage: &str,
    references: Value,
    generic: bool,
) -> Result<Value> {
    let mut input = references;
    input["payoutStage"] = json!(stage);
    input["expectedVersion"] = json!(1);
    owner
        .ok(
            "POST",
            &format!("/api/commission-payouts/{payout}:submitApproval"),
            input,
        )
        .await?;
    assert_eq!(
        owner
            .call(
                "POST",
                &format!("/api/commission-payouts/{payout}:approve"),
                json!({"expectedVersion":2})
            )
            .await?
            .0,
        StatusCode::FORBIDDEN
    );
    if generic {
        let approval: Uuid=sqlx::query_scalar("SELECT id FROM poms.approval_record WHERE target_object_id=$1 AND current_status='pending'").bind(payout).fetch_one(pool).await?;
        finance
            .ok(
                "POST",
                &format!("/api/approval-records/{approval}:approve"),
                json!({"expectedVersion":1}),
            )
            .await?;
        let row: Value=sqlx::query_scalar("SELECT to_jsonb(p)||jsonb_build_object('approved_amount',approved_amount::text) FROM poms.commission_payout p WHERE id=$1").bind(payout).fetch_one(pool).await?;
        assert_eq!(row["status"], "approved");
        Ok(row)
    } else {
        finance
            .ok(
                "POST",
                &format!("/api/commission-payouts/{payout}:approve"),
                json!({"expectedVersion":2}),
            )
            .await
    }
}

async fn payout_audit_fault(
    pool: &PgPool,
    target: Uuid,
    name: &'static str,
    event: &'static str,
    predicate: &'static str,
) -> Result {
    let function = format!("payout_{name}_{}", target.simple());
    // Only a server-generated UUID and static test constants enter fixture DDL.
    let sql = format!(
        "CREATE FUNCTION poms.{function}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.target_id='{target}' AND NEW.event_type='{event}' AND ({predicate}) THEN RAISE EXCEPTION 'owned payout rollback test'; END IF; RETURN NEW; END $$; CREATE TRIGGER {function} BEFORE INSERT ON poms.audit_log FOR EACH ROW EXECUTE FUNCTION poms.{function}();"
    );
    sqlx::raw_sql(sqlx::AssertSqlSafe(sql))
        .execute(pool)
        .await?;
    Ok(())
}

#[tokio::test]
#[ignore = "requires explicit dedicated commission DB initialized from application migrations"]
async fn payout_first_second_final_retention_and_actual_approvals() -> Result {
    let Fixture {
        pool,
        database,
        client,
        user,
        role: _,
    } = fixture(
        None,
        &[
            PermissionKey::CommissionRuleVersionsManage,
            PermissionKey::CommissionCalculationsManage,
            PermissionKey::CommissionPayoutsManage,
            PermissionKey::CommissionAmountSensitiveRead,
            PermissionKey::ProjectWrite,
        ],
    )
    .await?;
    let finance = fixture(
        Some("finance_mgr"),
        &[
            PermissionKey::CommissionPayoutsManage,
            PermissionKey::ProjectWrite,
            PermissionKey::CommissionAmountSensitiveRead,
        ],
    )
    .await?;
    let inputs = payout_inputs(&client, &pool, user, "0.10", "0.20").await?;
    let project = inputs.project;
    let calculation = calculated(&client, project, user).await?;
    let first = payout_draft(&client, project, calculation, "first").await?;
    assert_eq!(first["theoreticalCapAmountProjection"]["value"], "1200.00");
    let first_id = row_id(&first)?;
    payout_approve(
        &client,
        &finance.client,
        &pool,
        first_id,
        "first",
        json!({}),
        false,
    )
    .await?;
    assert_eq!(
        client
            .call(
                "POST",
                &format!("/api/commission-payouts/{first_id}:registerPayout"),
                json!({"payoutStage":"first","paidRecordAmount":"1200.01","expectedVersion":3})
            )
            .await?
            .0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    let path = format!("/api/commission-payouts/{first_id}:registerPayout");
    let (a, b) = tokio::join!(
        client.call(
            "POST",
            &path,
            json!({"payoutStage":"first","paidRecordAmount":"1200","expectedVersion":3})
        ),
        client.call(
            "POST",
            &path,
            json!({"payoutStage":"first","paidRecordAmount":"1200","expectedVersion":3})
        )
    );
    let mut statuses = [a?.0.as_u16(), b?.0.as_u16()];
    statuses.sort();
    assert_eq!(statuses, [200, 409]);
    assert_eq!(
        client
            .call(
                "POST",
                &format!("/api/projects/{project}/commission-payouts"),
                json!({"calculationId":calculation,"stageType":"second"})
            )
            .await?
            .0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    sqlx::query("INSERT INTO poms.acceptance_record(project_id,acceptance_type,acceptance_result,status,scope_summary,evidence_summary,confirmed_at,confirmed_by) VALUES($1,'stage-acceptance','accepted','confirmed','owned stage scope','owned legacy evidence reference',now(),$2)").bind(project).bind(user).execute(&pool).await?;
    let second = payout_draft(&client, project, calculation, "second").await?;
    assert_eq!(second["theoreticalCapAmountProjection"]["value"], "3000.00");
    let second_id = row_id(&second)?;
    payout_approve(
        &client,
        &finance.client,
        &pool,
        second_id,
        "second",
        json!({}),
        true,
    )
    .await?;
    client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{second_id}:registerPayout"),
            json!({"payoutStage":"second","paidRecordAmount":"3000","expectedVersion":3}),
        )
        .await?;
    let final_payout = payout_draft(&client, project, calculation, "final").await?;
    assert_eq!(
        final_payout["theoreticalCapAmountProjection"]["value"],
        "1200.00"
    );
    let final_id = row_id(&final_payout)?;
    payout_approve(&client,&finance.client,&pool,final_id,"final",json!({"gateReviewRecordId":inputs.review,"summarySnapshotId":inputs.summary,"freezeVersionId":inputs.freeze}),false).await?;
    let original_snapshot: Uuid=sqlx::query_scalar("SELECT id FROM poms.commission_final_settlement_snapshot WHERE project_id=$1 AND is_current").bind(project).fetch_one(&pool).await?;
    payout_audit_fault(
        &pool,
        final_id,
        "final",
        "CommissionController_registerPayout",
        "NEW.after_snapshot->'payout'->>'paid_record_amount'='1100.00'",
    )
    .await?;
    assert_eq!(
        client
            .call(
                "POST",
                &format!("/api/commission-payouts/{final_id}:registerPayout"),
                json!({"payoutStage":"final","paidRecordAmount":"1100","expectedVersion":3})
            )
            .await?
            .0,
        StatusCode::INTERNAL_SERVER_ERROR
    );
    let unchanged_snapshot: Uuid=sqlx::query_scalar("SELECT id FROM poms.commission_final_settlement_snapshot WHERE project_id=$1 AND is_current").bind(project).fetch_one(&pool).await?;
    assert_eq!(original_snapshot, unchanged_snapshot);
    let unchanged: (String,i32,Option<String>)=sqlx::query_as("SELECT status,row_version,paid_record_amount::text FROM poms.commission_payout WHERE id=$1").bind(final_id).fetch_one(&pool).await?;
    assert_eq!(unchanged, ("approved".into(), 3, None));
    client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{final_id}:registerPayout"),
            json!({"payoutStage":"final","paidRecordAmount":"1200","expectedVersion":3}),
        )
        .await?;
    let state: String=sqlx::query_scalar("SELECT final_settlement_status FROM poms.commission_final_settlement_snapshot WHERE project_id=$1 AND is_current").bind(project).fetch_one(&pool).await?;
    assert_eq!(state, "pending-retention-settlement");
    let retention = payout_draft(&client, project, calculation, "retention").await?;
    assert_eq!(
        retention["theoreticalCapAmountProjection"]["value"],
        "600.00"
    );
    let retention_id = row_id(&retention)?;
    assert_eq!(client.call("POST",&format!("/api/commission-payouts/{retention_id}:submitApproval"),json!({"payoutStage":"retention","expectedVersion":1,"gateReviewRecordId":inputs.review,"summarySnapshotId":inputs.summary,"retentionReceiptRecordId":inputs.summary,"departureExceptionDecisionId":inputs.summary})).await?.0,StatusCode::CONFLICT);
    let receipt = confirm_net_receipt(
        &client,
        &pool,
        project,
        inputs.contract,
        inputs.term,
        "10000",
        "retention",
        None,
    )
    .await?;
    let departure: Uuid=sqlx::query_scalar("INSERT INTO poms.commission_departure_exception_decision(project_id,freeze_version_id,version,departure_scenario_code,decision_code,decision_summary,summary_package_key,summary_snapshot_id,projection_level,export_policy) VALUES($1,$2,1,'not-applicable','continue','explicit legacy responsibility decision',$3,$4,'commission-controlled','internal-only') RETURNING id")
        .bind(project).bind(inputs.freeze).bind(format!("payout-sql-{project}")).bind(inputs.summary).fetch_one(&pool).await?;
    payout_approve(&client,&finance.client,&pool,retention_id,"retention",json!({"gateReviewRecordId":inputs.review,"summarySnapshotId":inputs.summary,"freezeVersionId":inputs.freeze,"retentionReceiptRecordId":receipt,"departureExceptionDecisionId":departure}),true).await?;
    sqlx::query("UPDATE poms.contract SET current_snapshot_id=NULL WHERE id=$1")
        .bind(inputs.contract)
        .execute(&pool)
        .await?;
    assert_eq!(client.call("POST",&format!("/api/commission-payouts/{retention_id}:registerPayout"),json!({"payoutStage":"retention","paidRecordAmount":"600","summarySnapshotId":inputs.summary,"expectedVersion":3})).await?.0,StatusCode::CONFLICT);
    let unchanged: String =
        sqlx::query_scalar("SELECT status FROM poms.commission_payout WHERE id=$1")
            .bind(retention_id)
            .fetch_one(&pool)
            .await?;
    assert_eq!(unchanged, "approved");
    sqlx::query("UPDATE poms.contract SET current_snapshot_id=$1 WHERE id=$2")
        .bind(inputs.term)
        .bind(inputs.contract)
        .execute(&pool)
        .await?;
    client.ok("POST",&format!("/api/commission-payouts/{retention_id}:registerPayout"),json!({"payoutStage":"retention","paidRecordAmount":"600","summarySnapshotId":inputs.summary,"expectedVersion":3})).await?;
    let (state,paid): (String,String)=sqlx::query_as("SELECT s.final_settlement_status,(SELECT SUM(paid_record_amount)::text FROM poms.commission_payout WHERE project_id=$1 AND status='paid') FROM poms.commission_final_settlement_snapshot s WHERE project_id=$1 AND is_current").bind(project).fetch_one(&pool).await?;
    assert_eq!(state, "settled-all");
    assert_eq!(paid, "6000.00");
    let list = client
        .ok(
            "GET",
            &format!("/api/projects/{project}/commission-payouts"),
            json!({}),
        )
        .await?;
    assert_eq!(list.as_array().ok_or("payout list")?.len(), 4);
    database.close(Duration::from_secs(2)).await?;
    pool.close().await;
    finance.database.close(Duration::from_secs(2)).await?;
    finance.pool.close().await;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
async fn confirm_net_receipt(
    client: &Client,
    pool: &PgPool,
    project: Uuid,
    contract: Uuid,
    term: Uuid,
    net: &str,
    source_type: &str,
    existing: Option<Uuid>,
) -> Result<Uuid> {
    let gross:String=sqlx::query_scalar("SELECT ROUND($1::text::numeric*(1+tax_rate),2)::text FROM poms.contract_term_snapshot WHERE id=$2").bind(net).bind(term).fetch_one(pool).await?;
    let receipt = if let Some(receipt) = existing {
        // Prepare this new fixture's pending input before any producer runs.
        sqlx::query("UPDATE poms.receipt_record SET receipt_amount=$1::text::numeric,receipt_date=clock_timestamp(),source_type=$2,status='pending-confirmation',confirmed_at=NULL,confirmed_by=NULL WHERE id=$3").bind(&gross).bind(source_type).bind(receipt).execute(pool).await?;
        receipt
    } else {
        sqlx::query_scalar("INSERT INTO poms.receipt_record(project_id,contract_id,receipt_amount,receipt_date,source_type,status) VALUES($1,$2,$3::text::numeric,clock_timestamp(),$4,'pending-confirmation') RETURNING id").bind(project).bind(contract).bind(&gross).bind(source_type).fetch_one(pool).await?
    };
    let reference = {
        let mut connection = pool.acquire().await?;
        let mut state = poms_api_rust::approval_common::CommonState::default();
        let mut session =
            poms_api_rust::approval_common::CommonSession::borrow(&mut connection, &mut state);
        poms_api_rust::project_operating::sources::source_reference_with_session(
            &mut session,
            "ContractTermSnapshot",
            term,
        )
        .await
        .map_err(|e| format!("actual term source reference: {e:?}"))?
    };
    let reference = serde_json::to_value(reference)?;
    let expected = json!({"kind":reference["kind"],"id":reference["id"],"expectedVersion":reference["rowVersion"],"payloadHash":reference["payloadHash"]});
    let contract_version: i32 =
        sqlx::query_scalar("SELECT row_version FROM poms.contract WHERE id=$1")
            .bind(contract)
            .fetch_one(pool)
            .await?;
    client.ok("POST",&format!("/api/receipt-records/{receipt}:confirm"),json!({"inputVersion":"server-derived-v1","expectedVersion":1,"expectedContractVersion":contract_version,"mode":"confirm","basis":{"termSnapshotRef":expected,"currencyBasisRef":expected,"evidenceRefs":[],"selectionPolicy":"receipt-date-effective-terms","reason":"owned functional receipt input"}})).await?;
    let actual:(String,i32)=sqlx::query_as("SELECT amount_excluding_tax::text,producer_version::integer FROM poms.receipt_accounting_basis WHERE receipt_id=$1").bind(receipt).fetch_one(pool).await?;
    assert_eq!(
        actual.0.parse::<rust_decimal::Decimal>()?,
        net.parse::<rust_decimal::Decimal>()?
    );
    assert_eq!(actual.1, 1, "basis must come from the actual G API");
    Ok(receipt)
}

#[tokio::test]
#[ignore = "requires explicit dedicated commission DB initialized from application migrations"]
async fn payout_project_balance_recalculation_and_nested_approval_rollback() -> Result {
    let Fixture {
        pool,
        database,
        client,
        user,
        role: _,
    } = fixture(
        None,
        &[
            PermissionKey::CommissionRuleVersionsManage,
            PermissionKey::CommissionCalculationsManage,
            PermissionKey::CommissionPayoutsManage,
            PermissionKey::CommissionAdjustmentsManage,
            PermissionKey::CommissionAmountSensitiveRead,
            PermissionKey::ProjectWrite,
        ],
    )
    .await?;
    let finance = fixture(
        Some("finance_mgr"),
        &[
            PermissionKey::CommissionPayoutsManage,
            PermissionKey::CommissionAdjustmentsManage,
            PermissionKey::ProjectWrite,
            PermissionKey::CommissionAmountSensitiveRead,
        ],
    )
    .await?;
    let inputs = payout_inputs(&client, &pool, user, "0.10", "0.20").await?;
    let project = inputs.project;
    let calculation = calculated(&client, project, user).await?;
    let first = payout_draft(&client, project, calculation, "first").await?;
    let first_id = row_id(&first)?;
    client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{first_id}:submitApproval"),
            json!({"payoutStage":"first","expectedVersion":1}),
        )
        .await?;
    let approval: Uuid=sqlx::query_scalar("SELECT id FROM poms.approval_record WHERE target_object_id=$1 AND current_status='pending'").bind(first_id).fetch_one(&pool).await?;
    payout_audit_fault(
        &pool,
        first_id,
        "approve",
        "CommissionController_approvePayout",
        "NEW.after_snapshot->>'approved_amount'='800.00'",
    )
    .await?;
    assert_eq!(
        finance
            .client
            .call(
                "POST",
                &format!("/api/commission-payouts/{first_id}:approve"),
                json!({"approvedAmount":"800","expectedVersion":2})
            )
            .await?
            .0,
        StatusCode::INTERNAL_SERVER_ERROR
    );
    let unchanged: (String, i32, Option<String>) = sqlx::query_as(
        "SELECT status,row_version,approved_amount::text FROM poms.commission_payout WHERE id=$1",
    )
    .bind(first_id)
    .fetch_one(&pool)
    .await?;
    assert_eq!(unchanged, ("pending-approval".into(), 2, None));
    let approval_status: String =
        sqlx::query_scalar("SELECT current_status FROM poms.approval_record WHERE id=$1")
            .bind(approval)
            .fetch_one(&pool)
            .await?;
    assert_eq!(approval_status, "pending");
    let todo_status: String =
        sqlx::query_scalar("SELECT status FROM poms.todo_item WHERE source_id=$1")
            .bind(approval)
            .fetch_one(&pool)
            .await?;
    assert_eq!(todo_status, "open");
    let approved = finance
        .client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{first_id}:approve"),
            json!({"approvedAmount":"1000","expectedVersion":2}),
        )
        .await?;
    assert_eq!(approved["approvedAmountProjection"]["value"], "1000.00");
    payout_audit_fault(
        &pool,
        first_id,
        "register",
        "CommissionController_registerPayout",
        "NEW.after_snapshot->'payout'->>'paid_record_amount'='900.00'",
    )
    .await?;
    let path = format!("/api/commission-payouts/{first_id}:registerPayout");
    assert_eq!(
        client
            .call(
                "POST",
                &path,
                json!({"payoutStage":"first","paidRecordAmount":"900","expectedVersion":3})
            )
            .await?
            .0,
        StatusCode::INTERNAL_SERVER_ERROR
    );
    let unchanged: (String,i32,Option<String>)=sqlx::query_as("SELECT status,row_version,paid_record_amount::text FROM poms.commission_payout WHERE id=$1").bind(first_id).fetch_one(&pool).await?;
    assert_eq!(unchanged, ("approved".into(), 3, None));
    client
        .ok(
            "POST",
            &path,
            json!({"payoutStage":"first","paidRecordAmount":"1000","expectedVersion":3}),
        )
        .await?;
    let pause=approve_adjustment(&client,&finance.client,&pool,project,json!({"adjustmentType":"suspend-payout","relatedPayoutId":first_id,"reason":"paid pause must not free cash allowance"})).await?;
    client
        .ok(
            "POST",
            &format!("/api/commission-adjustments/{pause}:execute"),
            json!({"expectedVersion":3}),
        )
        .await?;
    sqlx::query("INSERT INTO poms.acceptance_record(project_id,acceptance_type,acceptance_result,status,scope_summary,evidence_summary,confirmed_at) VALUES($1,'stage-outcome','accepted','confirmed','owned stage scope','owned evidence reference',now())").bind(project).execute(&pool).await?;
    let obsolete = payout_draft(&client, project, calculation, "second").await?;
    let obsolete_id = row_id(&obsolete)?;
    assert_eq!(
        obsolete["theoreticalCapAmountProjection"]["value"],
        "3200.00"
    );
    client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{obsolete_id}:submitApproval"),
            json!({"payoutStage":"second","expectedVersion":1}),
        )
        .await?;
    let next=client.ok("POST",&format!("/api/commission-calculations/{calculation}:recalculate"),json!({"reason":"new cost basis","recognizedCostTaxExclusive":"60000","expectedVersion":2})).await?;
    let next_id = row_id(&next)?;
    client
        .ok(
            "POST",
            &format!("/api/commission-calculations/{next_id}:approve"),
            json!({"expectedVersion":1}),
        )
        .await?;
    assert_eq!(
        finance
            .client
            .call(
                "POST",
                &format!("/api/commission-payouts/{obsolete_id}:approve"),
                json!({"expectedVersion":2})
            )
            .await?
            .0,
        StatusCode::CONFLICT
    );
    let next_payout = payout_draft(&client, project, next_id, "first").await?;
    let next_payout_id = row_id(&next_payout)?;
    assert_eq!(
        next_payout["theoreticalCapAmountProjection"]["value"],
        "600.00"
    );
    client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{next_payout_id}:submitApproval"),
            json!({"payoutStage":"first","expectedVersion":1}),
        )
        .await?;
    let next_approval: Uuid=sqlx::query_scalar("SELECT id FROM poms.approval_record WHERE target_object_id=$1 AND current_status='pending'").bind(next_payout_id).fetch_one(&pool).await?;
    let direct = format!("/api/commission-payouts/{next_payout_id}:approve");
    let generic = format!("/api/approval-records/{next_approval}:approve");
    let (a, b) = tokio::time::timeout(Duration::from_secs(10), async {
        tokio::join!(
            finance.client.call(
                "POST",
                &direct,
                json!({"approvedAmount":"500","expectedVersion":2})
            ),
            finance
                .client
                .call("POST", &generic, json!({"expectedVersion":1}))
        )
    })
    .await?;
    let responses = [a?, b?];
    let statuses = responses.each_ref().map(|response| response.0.as_u16());
    assert_eq!(statuses.iter().filter(|s| **s == 200).count(), 1);
    assert!(
        statuses.iter().all(|s| matches!(s, 200 | 400 | 409)),
        "{responses:?}"
    );
    let amount: String =
        sqlx::query_scalar("SELECT approved_amount::text FROM poms.commission_payout WHERE id=$1")
            .bind(next_payout_id)
            .fetch_one(&pool)
            .await?;
    assert!(amount == "500.00" || amount == "600.00");
    client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{next_payout_id}:registerPayout"),
            json!({"payoutStage":"first","paidRecordAmount":amount,"expectedVersion":3}),
        )
        .await?;
    let within_limit: bool=sqlx::query_scalar("SELECT SUM(paid_record_amount)<=1600 FROM poms.commission_payout WHERE project_id=$1 AND status IN ('paid','suspended')").bind(project).fetch_one(&pool).await?;
    assert!(within_limit);
    database.close(Duration::from_secs(2)).await?;
    pool.close().await;
    finance.database.close(Duration::from_secs(2)).await?;
    finance.pool.close().await;
    Ok(())
}

#[tokio::test]
#[ignore = "requires explicit dedicated commission DB initialized from application migrations"]
async fn payout_zero_retention_low_down_payment_and_future_due_date() -> Result {
    let Fixture {
        pool,
        database,
        client,
        user,
        role: _,
    } = fixture(
        None,
        &[
            PermissionKey::CommissionRuleVersionsManage,
            PermissionKey::CommissionCalculationsManage,
            PermissionKey::CommissionPayoutsManage,
            PermissionKey::CommissionAmountSensitiveRead,
            PermissionKey::ProjectWrite,
        ],
    )
    .await?;
    let finance = fixture(
        Some("finance_mgr"),
        &[
            PermissionKey::CommissionPayoutsManage,
            PermissionKey::ProjectWrite,
            PermissionKey::CommissionAmountSensitiveRead,
        ],
    )
    .await?;
    let zero = payout_inputs(&client, &pool, user, "0", "0.20").await?;
    let calculation = calculated(&client, zero.project, user).await?;
    let payout = payout_draft(&client, zero.project, calculation, "final").await?;
    assert_eq!(payout["theoreticalCapAmountProjection"]["value"], "6000.00");
    let payout_id = row_id(&payout)?;
    payout_approve(
        &client,
        &finance.client,
        &pool,
        payout_id,
        "final",
        json!({}),
        true,
    )
    .await?;
    client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{payout_id}:registerPayout"),
            json!({"payoutStage":"final","paidRecordAmount":"6000","expectedVersion":3}),
        )
        .await?;
    let state: String=sqlx::query_scalar("SELECT final_settlement_status FROM poms.commission_final_settlement_snapshot WHERE project_id=$1 AND is_current").bind(zero.project).fetch_one(&pool).await?;
    assert_eq!(state, "settled-all");
    assert_eq!(
        client
            .call(
                "POST",
                &format!("/api/projects/{}/commission-payouts", zero.project),
                json!({"calculationId":calculation,"stageType":"retention"})
            )
            .await?
            .0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    let low = payout_inputs(&client, &pool, user, "0.10", "0.10").await?;
    let calculation = calculated(&client, low.project, user).await?;
    let payout = payout_draft(&client, low.project, calculation, "first").await?;
    assert_eq!(payout["theoreticalCapAmountProjection"]["value"], "600.00");
    let payout_id = row_id(&payout)?;
    payout_approve(
        &client,
        &finance.client,
        &pool,
        payout_id,
        "first",
        json!({}),
        false,
    )
    .await?;
    client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{payout_id}:registerPayout"),
            json!({"payoutStage":"first","paidRecordAmount":"600","expectedVersion":3}),
        )
        .await?;
    let next=client.ok("POST",&format!("/api/commission-calculations/{calculation}:recalculate"),json!({"reason":"same pool, explicit higher low-down-payment tier","expectedVersion":2})).await?;
    let next_id = row_id(&next)?;
    client
        .ok(
            "POST",
            &format!("/api/commission-calculations/{next_id}:approve"),
            json!({"expectedVersion":1}),
        )
        .await?;
    assert_eq!(
        client
            .call(
                "POST",
                &format!("/api/projects/{}/commission-payouts", low.project),
                json!({"calculationId":next_id,"stageType":"first","selectedTier":"mid"})
            )
            .await?
            .0,
        StatusCode::UNPROCESSABLE_ENTITY,
        "a tier selection does not replace management approval"
    );
    let future = payout_inputs_custom(&client, &pool, user, "0.10", "0.20", "100000", 30).await?;
    let calculation = calculated(&client, future.project, user).await?;
    let payout = payout_draft(&client, future.project, calculation, "final").await?;
    let payout_id = row_id(&payout)?;
    payout_approve(
        &client,
        &finance.client,
        &pool,
        payout_id,
        "final",
        json!({}),
        false,
    )
    .await?;
    client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{payout_id}:registerPayout"),
            json!({"payoutStage":"final","paidRecordAmount":"5400","expectedVersion":3}),
        )
        .await?;
    let retention = payout_draft(&client, future.project, calculation, "retention").await?;
    let retention_id = row_id(&retention)?;
    let receipt = confirm_net_receipt(
        &client,
        &pool,
        future.project,
        future.contract,
        future.term,
        "10000",
        "retention",
        None,
    )
    .await?;
    let decision: Uuid=sqlx::query_scalar("INSERT INTO poms.commission_departure_exception_decision(project_id,freeze_version_id,version,departure_scenario_code,decision_code,decision_summary,summary_package_key,summary_snapshot_id,projection_level,export_policy) VALUES($1,$2,1,'not-applicable','continue','explicit future-date test input',$3,$4,'commission-controlled','internal-only') RETURNING id")
        .bind(future.project).bind(future.freeze).bind(format!("payout-sql-{}",future.project)).bind(future.summary).fetch_one(&pool).await?;
    assert_eq!(client.call("POST",&format!("/api/commission-payouts/{retention_id}:submitApproval"),json!({"payoutStage":"retention","expectedVersion":1,"gateReviewRecordId":future.review,"summarySnapshotId":future.summary,"retentionReceiptRecordId":receipt,"departureExceptionDecisionId":decision})).await?.0,StatusCode::UNPROCESSABLE_ENTITY);
    let draft: (String, i32) =
        sqlx::query_as("SELECT status,row_version FROM poms.commission_payout WHERE id=$1")
            .bind(retention_id)
            .fetch_one(&pool)
            .await?;
    assert_eq!(draft, ("draft".into(), 1));
    database.close(Duration::from_secs(2)).await?;
    pool.close().await;
    finance.database.close(Duration::from_secs(2)).await?;
    finance.pool.close().await;
    Ok(())
}

#[tokio::test]
#[ignore = "requires explicit dedicated commission DB initialized from application migrations"]
async fn payout_large_decimal_amount_survives_both_approval_routes() -> Result {
    let Fixture {
        pool,
        database,
        client,
        user,
        role: _,
    } = fixture(
        None,
        &[
            PermissionKey::CommissionRuleVersionsManage,
            PermissionKey::CommissionCalculationsManage,
            PermissionKey::CommissionPayoutsManage,
            PermissionKey::CommissionAmountSensitiveRead,
            PermissionKey::ProjectWrite,
        ],
    )
    .await?;
    let finance = fixture(
        Some("finance_mgr"),
        &[
            PermissionKey::CommissionPayoutsManage,
            PermissionKey::ProjectWrite,
            PermissionKey::CommissionAmountSensitiveRead,
        ],
    )
    .await?;
    for generic in [false, true] {
        let inputs = payout_inputs_custom(
            &client,
            &pool,
            user,
            "0.10",
            "0.20",
            "7654321098765432.10",
            -30,
        )
        .await?;
        let calculation =
            calculated_amount(&client, inputs.project, user, "7654321098765432.10").await?;
        let payout = payout_draft(&client, inputs.project, calculation, "first").await?;
        assert_eq!(
            payout["theoreticalCapAmountProjection"]["value"],
            "306172843947817.28"
        );
        let payout_id = row_id(&payout)?;
        let expected = if generic {
            payout_approve(
                &client,
                &finance.client,
                &pool,
                payout_id,
                "first",
                json!({}),
                true,
            )
            .await?;
            "306172843947817.28"
        } else {
            client
                .ok(
                    "POST",
                    &format!("/api/commission-payouts/{payout_id}:submitApproval"),
                    json!({"payoutStage":"first","expectedVersion":1}),
                )
                .await?;
            let approved = finance
                .client
                .ok(
                    "POST",
                    &format!("/api/commission-payouts/{payout_id}:approve"),
                    json!({"approvedAmount":"306172843947817.27","expectedVersion":2}),
                )
                .await?;
            assert_eq!(
                approved["approvedAmountProjection"]["value"],
                "306172843947817.27"
            );
            "306172843947817.27"
        };
        let amount: String = sqlx::query_scalar(
            "SELECT approved_amount::text FROM poms.commission_payout WHERE id=$1",
        )
        .bind(payout_id)
        .fetch_one(&pool)
        .await?;
        assert_eq!(amount, expected);
        let paid = client
            .ok(
                "POST",
                &format!("/api/commission-payouts/{payout_id}:registerPayout"),
                json!({"payoutStage":"first","paidRecordAmount":expected,"expectedVersion":3}),
            )
            .await?;
        assert_eq!(paid["paidRecordAmountProjection"]["value"], expected);
    }
    database.close(Duration::from_secs(2)).await?;
    pool.close().await;
    finance.database.close(Duration::from_secs(2)).await?;
    finance.pool.close().await;
    Ok(())
}

#[tokio::test]
#[ignore = "requires explicit dedicated commission DB initialized from application migrations"]
async fn payout_zero_final_confirmation_and_prior_retention_after_recalculation() -> Result {
    let Fixture {
        pool,
        database,
        client,
        user,
        role: _,
    } = fixture(
        None,
        &[
            PermissionKey::CommissionRuleVersionsManage,
            PermissionKey::CommissionCalculationsManage,
            PermissionKey::CommissionPayoutsManage,
            PermissionKey::CommissionAmountSensitiveRead,
            PermissionKey::ProjectWrite,
        ],
    )
    .await?;
    let finance = fixture(
        Some("finance_mgr"),
        &[
            PermissionKey::CommissionPayoutsManage,
            PermissionKey::ProjectWrite,
            PermissionKey::CommissionAmountSensitiveRead,
        ],
    )
    .await?;
    let inputs = payout_inputs(&client, &pool, user, "0.20", "0.20").await?;
    let project = inputs.project;
    let calculation = calculated(&client, project, user).await?;
    for (stage, tier, amount) in [
        ("first", "basic", "1200"),
        ("second", "premium", "3600"),
        ("final", "basic", "0"),
    ] {
        if stage == "second" {
            sqlx::query("INSERT INTO poms.acceptance_record(project_id,acceptance_type,acceptance_result,status,scope_summary,evidence_summary,confirmed_at) VALUES($1,'stage-outcome','accepted','confirmed','owned stage scope','owned evidence',now())").bind(project).execute(&pool).await?;
        }
        let payout = client
            .ok(
                "POST",
                &format!("/api/projects/{project}/commission-payouts"),
                json!({"calculationId":calculation,"stageType":stage,"selectedTier":tier}),
            )
            .await?;
        let payout_id = row_id(&payout)?;
        payout_approve(
            &client,
            &finance.client,
            &pool,
            payout_id,
            stage,
            json!({}),
            false,
        )
        .await?;
        client
            .ok(
                "POST",
                &format!("/api/commission-payouts/{payout_id}:registerPayout"),
                json!({"payoutStage":stage,"paidRecordAmount":amount,"expectedVersion":3}),
            )
            .await?;
    }
    let state: String=sqlx::query_scalar("SELECT final_settlement_status FROM poms.commission_final_settlement_snapshot WHERE project_id=$1 AND is_current").bind(project).fetch_one(&pool).await?;
    assert_eq!(state, "pending-retention-settlement");
    let receipt = confirm_net_receipt(
        &client,
        &pool,
        project,
        inputs.contract,
        inputs.term,
        "20000",
        "retention",
        None,
    )
    .await?;
    let decision: Uuid=sqlx::query_scalar("INSERT INTO poms.commission_departure_exception_decision(project_id,freeze_version_id,version,departure_scenario_code,decision_code,decision_summary,summary_package_key,summary_snapshot_id,projection_level,export_policy) VALUES($1,$2,1,'not-applicable','continue','explicit legacy settlement input',$3,$4,'commission-controlled','internal-only') RETURNING id")
        .bind(project).bind(inputs.freeze).bind(format!("payout-sql-{project}")).bind(inputs.summary).fetch_one(&pool).await?;
    let references = json!({"gateReviewRecordId":inputs.review,"summarySnapshotId":inputs.summary,"retentionReceiptRecordId":receipt,"departureExceptionDecisionId":decision});
    let payout = payout_draft(&client, project, calculation, "retention").await?;
    let id = row_id(&payout)?;
    payout_approve(
        &client,
        &finance.client,
        &pool,
        id,
        "retention",
        references.clone(),
        false,
    )
    .await?;
    client.ok("POST",&format!("/api/commission-payouts/{id}:registerPayout"),json!({"payoutStage":"retention","paidRecordAmount":"1200","summarySnapshotId":inputs.summary,"expectedVersion":3})).await?;
    let next=client.ok("POST",&format!("/api/commission-calculations/{calculation}:recalculate"),json!({"reason":"higher current entitlement after prior retention payment","recognizedCostTaxExclusive":"60000","expectedVersion":2})).await?;
    let next_id = row_id(&next)?;
    client
        .ok(
            "POST",
            &format!("/api/commission-calculations/{next_id}:approve"),
            json!({"expectedVersion":1}),
        )
        .await?;
    let final_payout = payout_draft(&client, project, next_id, "final").await?;
    assert_eq!(
        final_payout["theoreticalCapAmountProjection"]["value"],
        "1600.00"
    );
    let id = row_id(&final_payout)?;
    payout_approve(
        &client,
        &finance.client,
        &pool,
        id,
        "final",
        json!({}),
        true,
    )
    .await?;
    client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{id}:registerPayout"),
            json!({"payoutStage":"final","paidRecordAmount":"1600","expectedVersion":3}),
        )
        .await?;
    let retention = payout_draft(&client, project, next_id, "retention").await?;
    assert_eq!(
        retention["theoreticalCapAmountProjection"]["value"],
        "400.00"
    );
    let id = row_id(&retention)?;
    payout_approve(
        &client,
        &finance.client,
        &pool,
        id,
        "retention",
        references,
        true,
    )
    .await?;
    client.ok("POST",&format!("/api/commission-payouts/{id}:registerPayout"),json!({"payoutStage":"retention","paidRecordAmount":"400","summarySnapshotId":inputs.summary,"expectedVersion":3})).await?;
    let total: String=sqlx::query_scalar("SELECT SUM(paid_record_amount)::text FROM poms.commission_payout WHERE project_id=$1 AND status='paid'").bind(project).fetch_one(&pool).await?;
    assert_eq!(total, "8000.00");
    database.close(Duration::from_secs(2)).await?;
    pool.close().await;
    finance.database.close(Duration::from_secs(2)).await?;
    finance.pool.close().await;
    Ok(())
}

async fn tail_fixture() -> Result<Fixture> {
    fixture(
        None,
        &[
            PermissionKey::CommissionAssignmentsManage,
            PermissionKey::CommissionRuleVersionsManage,
            PermissionKey::CommissionCalculationsManage,
            PermissionKey::CommissionPayoutsManage,
            PermissionKey::CommissionAdjustmentsManage,
            PermissionKey::CommissionAmountSensitiveRead,
            PermissionKey::OperatingFinanceSensitiveRead,
            PermissionKey::ProjectWrite,
        ],
    )
    .await
}
async fn close_fixture(f: Fixture) -> Result {
    f.database.close(Duration::from_secs(2)).await?;
    f.pool.close().await;
    Ok(())
}
async fn tail_finance() -> Result<Fixture> {
    fixture(
        Some("finance_mgr"),
        &[
            PermissionKey::CommissionPayoutsManage,
            PermissionKey::CommissionAmountSensitiveRead,
            PermissionKey::ProjectWrite,
        ],
    )
    .await
}
async fn freeze_summary(pool: &PgPool, freeze: Uuid) -> Result<Uuid> {
    Ok(sqlx::query_scalar(
        "SELECT handover_summary_snapshot_id FROM poms.commission_role_assignment WHERE id=$1",
    )
    .bind(freeze)
    .fetch_one(pool)
    .await?)
}
async fn departure_decision(
    client: &Client,
    project: Uuid,
    freeze: Uuid,
    summary: Uuid,
    requirement: Option<&str>,
) -> Result<Value> {
    let (status,row)=client.call("POST",&format!("/api/projects/{project}/commission-departure-exception-decisions"),json!({"freezeVersionId":freeze,"summarySnapshotId":summary,"departureScenarioCode":"not-applicable","decisionCode":"continue","decisionSummary":"责任结论已记录","confirmationRequirementSummary":requirement})).await?;
    assert_eq!(status, StatusCode::CREATED, "{row}");
    Ok(row)
}

#[tokio::test]
#[ignore = "requires explicit dedicated commission DB initialized from application migrations"]
async fn r5_tail_dispute_replacement_concurrency_and_atomic_rollback() -> Result {
    let f = tail_fixture().await?;
    let inputs = payout_inputs(&f.client, &f.pool, f.user, "0.10", "0.20").await?;
    // The real G confirmation setup already supplies a full owner relation.
    let assignment_path = format!("/api/commission-role-assignments/{}", inputs.freeze);
    assert_eq!(
        f.client.ok("GET", &assignment_path, json!({})).await?["allowedActions"],
        json!(["submit-commission-freeze-dispute"])
    );
    let calc = calculated(&f.client, inputs.project, f.user).await?;
    let draft = payout_draft(&f.client, inputs.project, calc, "first").await?;
    let bad = json!({"freezeVersionId":inputs.freeze,"disputeReason":"核实权重","affectedAssignmentIds":[uuid(&f.pool).await?],"recalculationImpactMode":"controlled-review","expectedVersion":1});
    assert_eq!(
        f.client
            .call("POST", "/api/commission-freeze-disputes", bad)
            .await?
            .0,
        StatusCode::BAD_REQUEST
    );
    let body = json!({"freezeVersionId":inputs.freeze,"disputeReason":"核实权重","affectedAssignmentIds":[f.user],"recalculationImpactMode":"controlled-review","expectedVersion":1});
    let (a, b) = tokio::join!(
        f.client
            .call("POST", "/api/commission-freeze-disputes", body.clone()),
        f.client
            .call("POST", "/api/commission-freeze-disputes", body)
    );
    let (a, b) = (a?, b?);
    assert_eq!(
        [a.0, b.0].iter().filter(|s| **s == StatusCode::OK).count(),
        1
    );
    assert_eq!(
        [a.0, b.0]
            .iter()
            .filter(|s| **s == StatusCode::CONFLICT)
            .count(),
        1
    );
    let result = if a.0 == StatusCode::OK { a.1 } else { b.1 };
    let dispute: Uuid = result["disputeRecordId"]
        .as_str()
        .ok_or("dispute ID")?
        .parse()?;
    let detail = f
        .client
        .ok(
            "GET",
            &format!("/api/commission-freeze-disputes/{dispute}"),
            json!({}),
        )
        .await?;
    assert_eq!(detail["arbitrationStatus"], "pending");
    assert_eq!(
        f.client.ok("GET", &assignment_path, json!({})).await?["allowedActions"],
        json!([])
    );
    assert_eq!(
        detail["allowedActions"],
        json!(["arbitrate-commission-freeze-dispute"])
    );
    assert!(
        detail["impactAssessmentSummary"]
            .as_str()
            .ok_or("impact")?
            .contains("effective-calculation-present")
    );
    assert_eq!(
        f.client
            .call(
                "POST",
                &format!("/api/projects/{}/commission-payouts", inputs.project),
                json!({"calculationId":calc,"stageType":"second","selectedTier":"basic"})
            )
            .await?
            .0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    let path = format!("/api/commission-freeze-disputes/{dispute}:arbitrate");
    let mut body = json!({"arbitrationDecision":"adjust-weights","replacementAssignmentPayload":{"participants":[{"userId":f.user,"displayName":"request cannot rename a user","roleType":"sales-owner","weight":1}]},"recalculationImpactMode":"controlled-review","expectedVersion":1,"comment":"rollback"});
    payout_audit_fault(
        &f.pool,
        dispute,
        "dispute",
        "CommissionFreezeDisputeController_arbitrateCommissionFreezeDispute",
        "NEW.after_snapshot->>'comment'='rollback'",
    )
    .await?;
    assert_eq!(
        f.client.call("POST", &path, body.clone()).await?.0,
        StatusCode::INTERNAL_SERVER_ERROR
    );
    let unchanged:(String,i32,i64,i64)=sqlx::query_as("SELECT status,row_version,(SELECT count(*) FROM poms.commission_role_assignment WHERE project_id=$2),(SELECT count(*) FROM poms.commission_freeze_change_request WHERE dispute_record_id=$1) FROM poms.commission_freeze_dispute_record WHERE id=$1")
        .bind(dispute).bind(inputs.project).fetch_one(&f.pool).await?;
    assert_eq!(unchanged, ("submitted".into(), 1, 1, 0));
    body["comment"] = json!("approved test correction");
    let (a, b) = tokio::join!(
        f.client.call("POST", &path, body.clone()),
        f.client.call("POST", &path, body)
    );
    let (a, b) = (a?, b?);
    assert_eq!(
        [a.0, b.0].iter().filter(|s| **s == StatusCode::OK).count(),
        1
    );
    assert_eq!(
        [a.0, b.0]
            .iter()
            .filter(|s| **s == StatusCode::CONFLICT)
            .count(),
        1
    );
    let result = if a.0 == StatusCode::OK { a.1 } else { b.1 };
    let replacement: Uuid = result["replacementFreezeVersionId"]
        .as_str()
        .ok_or("replacement ID")?
        .parse()?;
    let change: Uuid = result["changeRequestId"]
        .as_str()
        .ok_or("change ID")?
        .parse()?;
    let changed = f
        .client
        .ok(
            "GET",
            &format!("/api/commission-freeze-change-requests/{change}"),
            json!({}),
        )
        .await?;
    assert_eq!(
        changed["replacementFreezeVersionId"],
        replacement.to_string()
    );
    assert_eq!(changed["status"], "effective");
    let qualification:(i32,Option<Uuid>,String)=sqlx::query_as("SELECT producer_version::integer,freeze_payload_id,participants_json->0->>'displayName' FROM poms.commission_role_assignment WHERE id=$1").bind(replacement).fetch_one(&f.pool).await?;
    assert_eq!(qualification, (0, None, "Commission SQL test".into()));
    let original: (bool, String) =
        sqlx::query_as("SELECT is_current,status FROM poms.commission_role_assignment WHERE id=$1")
            .bind(inputs.freeze)
            .fetch_one(&f.pool)
            .await?;
    assert_eq!(original, (false, "superseded".into()));
    let original_payout: String =
        sqlx::query_scalar("SELECT status FROM poms.commission_payout WHERE id=$1")
            .bind(row_id(&draft)?)
            .fetch_one(&f.pool)
            .await?;
    assert_eq!(original_payout, "draft");
    let other = payout_inputs(&f.client, &f.pool, f.user, "0.10", "0.20").await?;
    assert_eq!(f.client.call("POST",&format!("/api/projects/{}/commission-departure-exception-decisions",other.project),json!({"freezeVersionId":replacement,"summarySnapshotId":freeze_summary(&f.pool,replacement).await?,"departureScenarioCode":"none","decisionCode":"continue","decisionSummary":"invalid cross project"})).await?.0,StatusCode::BAD_REQUEST);
    close_fixture(f).await
}

#[tokio::test]
#[ignore = "requires explicit dedicated commission DB initialized from application migrations"]
async fn r5_tail_departure_versions_and_live_settlement_queries() -> Result {
    let f = tail_fixture().await?;
    let finance = tail_finance().await?;
    let i = payout_inputs_custom(&f.client, &f.pool, f.user, "0.10", "0.20", "100000", 30).await?;
    let final_path = format!("/api/projects/{}/commission-final-settlement", i.project);
    let rule_path = format!("/api/projects/{}/commission-rule-explanation", i.project);
    assert_eq!(
        f.client.call("GET", &final_path, json!({})).await?.0,
        StatusCode::NOT_FOUND
    );
    let calc = calculated(&f.client, i.project, f.user).await?;
    let payout = row_id(&payout_draft(&f.client, i.project, calc, "final").await?)?;
    payout_approve(&f.client,&finance.client,&f.pool,payout,"final",json!({"gateReviewRecordId":i.review,"summarySnapshotId":i.summary,"freezeVersionId":i.freeze}),false).await?;
    let unpaid = f.client.ok("GET", &final_path, json!({})).await?;
    assert_eq!(
        unpaid["nonRetentionSettlementStatus"],
        "pending-non-retention"
    );
    f.client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{payout}:registerPayout"),
            json!({"payoutStage":"final","paidRecordAmount":"5400","expectedVersion":3}),
        )
        .await?;
    let pending = f.client.ok("GET", &final_path, json!({})).await?;
    assert_eq!(
        pending["finalSettlementStatus"],
        "pending-retention-settlement"
    );
    assert_eq!(pending["retentionDueStatus"], "pending");
    let summary = freeze_summary(&f.pool, i.freeze).await?;
    let first = departure_decision(&f.client, i.project, i.freeze, summary, None).await?;
    assert_eq!(first["version"], 1);
    let receipt = confirm_net_receipt(
        &f.client,
        &f.pool,
        i.project,
        i.contract,
        i.term,
        "10000",
        "retention",
        None,
    )
    .await?;
    assert_eq!(
        f.client.ok("GET", &rule_path, json!({})).await?["blockingReasonCode"],
        "retention-due-pending"
    );
    // Change only this owned upstream test input. GET must read it without a
    // settlement mutation or a new payout approval.
    sqlx::query(
        "UPDATE poms.contract_term_snapshot SET retention_due_date=current_date-1 WHERE id=$1",
    )
    .bind(i.term)
    .execute(&f.pool)
    .await?;
    let before: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM poms.commission_final_settlement_snapshot WHERE project_id=$1",
    )
    .bind(i.project)
    .fetch_one(&f.pool)
    .await?;
    let ready = f.client.ok("GET", &final_path, json!({})).await?;
    assert_eq!(ready["retentionDueStatus"], "due");
    assert_eq!(ready["retentionSettlementStatus"], "ready-retention");
    let after: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM poms.commission_final_settlement_snapshot WHERE project_id=$1",
    )
    .bind(i.project)
    .fetch_one(&f.pool)
    .await?;
    assert_eq!(before, after, "GET must not create settlement snapshots");
    let second = departure_decision(
        &f.client,
        i.project,
        i.freeze,
        summary,
        Some("责任承接尚未确认"),
    )
    .await?;
    assert_eq!(second["version"], 2);
    assert_eq!(
        f.client.ok("GET", &rule_path, json!({})).await?["blockingReasonCode"],
        "departure-confirmation-pending"
    );
    let first_status: String = sqlx::query_scalar(
        "SELECT status FROM poms.commission_departure_exception_decision WHERE id=$1",
    )
    .bind(row_id(&first)?)
    .fetch_one(&f.pool)
    .await?;
    assert_eq!(first_status, "superseded");
    let third = departure_decision(&f.client, i.project, i.freeze, summary, None).await?;
    assert_eq!(third["version"], 3);
    let (a, b) = tokio::join!(
        departure_decision(&f.client, i.project, i.freeze, summary, None),
        departure_decision(&f.client, i.project, i.freeze, summary, None)
    );
    let mut versions = [
        a?["version"].as_i64().ok_or("version")?,
        b?["version"].as_i64().ok_or("version")?,
    ];
    versions.sort();
    assert_eq!(versions, [4, 5]);
    let current:i64=sqlx::query_scalar("SELECT count(*) FROM poms.commission_departure_exception_decision WHERE project_id=$1 AND is_current").bind(i.project).fetch_one(&f.pool).await?;
    assert_eq!(current, 1);
    sqlx::query("UPDATE poms.receipt_record SET status='draft' WHERE id=$1")
        .bind(receipt)
        .execute(&f.pool)
        .await?;
    assert_eq!(
        f.client.ok("GET", &rule_path, json!({})).await?["blockingReasonCode"],
        "retention-receipt-pending"
    );
    sqlx::query("UPDATE poms.receipt_record SET status='confirmed' WHERE id=$1")
        .bind(receipt)
        .execute(&f.pool)
        .await?;
    let d=f.client.ok("POST","/api/commission-freeze-disputes",json!({"freezeVersionId":i.freeze,"disputeReason":"查询必须反映当前争议","affectedAssignmentIds":[f.user],"recalculationImpactMode":"review"})).await?;
    assert_eq!(
        f.client.ok("GET", &rule_path, json!({})).await?["blockingReasonCode"],
        "freeze-dispute-pending"
    );
    let closed=f.client.ok("POST",&format!("/api/commission-freeze-disputes/{}:arbitrate",d["disputeRecordId"].as_str().ok_or("dispute")?),json!({"arbitrationDecision":"no-change","recalculationImpactMode":"review","expectedVersion":1})).await?;
    assert!(closed["replacementFreezeVersionId"].is_null());
    assert_eq!(
        f.client.ok("GET", &final_path, json!({})).await?["retentionSettlementStatus"],
        "ready-retention"
    );
    sqlx::query("UPDATE poms.operating_signal_gate_binding SET tax_impact_pending_amount=NULL,tax_pending_knowledge='unknown' WHERE id=(SELECT binding_id FROM poms.commission_gate_review_record WHERE id=$1)").bind(i.review).execute(&f.pool).await?;
    departure_decision(&f.client, i.project, i.freeze, summary, None).await?;
    let unknown = f.client.ok("GET", &final_path, json!({})).await?;
    assert!(unknown["taxImpactPendingAmountProjection"]["value"].is_null());
    let stored_unknown:bool=sqlx::query_scalar("SELECT tax_impact_pending_amount IS NULL FROM poms.commission_final_settlement_snapshot WHERE project_id=$1 AND is_current").bind(i.project).fetch_one(&f.pool).await?;
    assert!(
        stored_unknown,
        "a real settlement write must preserve UNKNOWN"
    );
    let mut rollback = f.pool.begin().await?;
    let rejected=sqlx::query("ALTER TABLE poms.commission_final_settlement_snapshot ALTER COLUMN tax_impact_pending_amount SET NOT NULL, ALTER COLUMN tax_impact_pending_amount SET DEFAULT 0").execute(&mut *rollback).await;
    assert!(
        rejected
            .as_ref()
            .err()
            .and_then(|e| e.as_database_error())
            .is_some_and(|e| e.code().as_deref() == Some("23502")),
        "down migration must refuse existing unknown values"
    );
    rollback.rollback().await?;
    for permission in [
        PermissionKey::CommissionAmountSensitiveRead,
        PermissionKey::OperatingFinanceSensitiveRead,
    ] {
        sqlx::query("UPDATE poms.role_permission_assignment SET status='revoked',revoked_at=now() WHERE role_id=$1 AND permission_key=$2").bind(f.role).bind(permission.as_str()).execute(&f.pool).await?;
    }
    let hidden = f.client.ok("GET", &rule_path, json!({})).await?;
    assert_eq!(hidden["nextActionSummaryProjection"]["mode"], "masked");
    assert_eq!(hidden["taxImpactSummaryProjection"]["mode"], "masked");
    assert!(!hidden.to_string().contains("explicit test tax basis"));
    close_fixture(finance).await?;
    close_fixture(f).await
}

#[tokio::test]
#[ignore = "requires explicit dedicated commission DB initialized from application migrations"]
async fn management_release_uses_net_receipts_separate_permission_and_real_finance_approval()
-> Result {
    let owner = fixture(
        None,
        &[
            PermissionKey::CommissionRuleVersionsManage,
            PermissionKey::CommissionCalculationsManage,
            PermissionKey::CommissionPayoutsManage,
            PermissionKey::CommissionAdjustmentsManage,
            PermissionKey::CommissionAmountSensitiveRead,
            PermissionKey::ProjectWrite,
        ],
    )
    .await?;
    let finance = fixture(
        Some("finance_mgr"),
        &[
            PermissionKey::CommissionPayoutsManage,
            PermissionKey::CommissionAdjustmentsManage,
            PermissionKey::CommissionAmountSensitiveRead,
            PermissionKey::ProjectWrite,
        ],
    )
    .await?;
    let manager = fixture(
        None,
        &[
            PermissionKey::CommissionLowDownPaymentApprove,
            PermissionKey::ExceptionApprovalOpinionSensitiveRead,
            PermissionKey::ProjectWrite,
        ],
    )
    .await?;
    let i = payout_inputs_received(
        &owner.client,
        &owner.pool,
        owner.user,
        "0.10",
        "0.10",
        "100000",
        -30,
        "19999.99",
    )
    .await?;
    let contract: Uuid = sqlx::query_scalar("SELECT id FROM poms.contract WHERE project_id=$1")
        .bind(i.project)
        .fetch_one(&owner.pool)
        .await?;
    let term: Uuid =
        sqlx::query_scalar("SELECT current_snapshot_id FROM poms.contract WHERE id=$1")
            .bind(contract)
            .fetch_one(&owner.pool)
            .await?;
    let path = format!(
        "/api/projects/{}/commission-low-down-payment-releases",
        i.project
    );
    let mut request = json!({"freezeVersionId":i.freeze,"expectedFreezeVersion":1,"contractIds":[contract],"decision":"raise-first-cap","conditionsConfirmed":true,"reason":"management confirmed project conditions"});
    // Gross receipts already exceed 20%; actual net income is still one cent short.
    assert_eq!(
        manager.client.call("POST", &path, request.clone()).await?.0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    assert_eq!(
        finance.client.call("POST", &path, request.clone()).await?.0,
        StatusCode::FORBIDDEN
    );
    confirm_net_receipt(
        &owner.client,
        &owner.pool,
        i.project,
        contract,
        term,
        "0.01",
        "manual",
        None,
    )
    .await?;
    let calculation =
        calculated_values(&owner.client, i.project, owner.user, "10000", "7000").await?;
    let draft = owner
        .client
        .ok(
            "POST",
            &format!("/api/projects/{}/commission-payouts", i.project),
            json!({"calculationId":calculation,"stageType":"first","selectedTier":"premium"}),
        )
        .await?;
    let payout = row_id(&draft)?;
    assert_eq!(draft["theoreticalCapAmountProjection"]["value"], "60.00");
    request["conditionsConfirmed"] = json!(false);
    assert_eq!(
        manager.client.call("POST", &path, request.clone()).await?.0,
        StatusCode::BAD_REQUEST
    );
    request["conditionsConfirmed"] = json!(true);
    request["contractIds"] = json!([uuid(&owner.pool).await?]);
    assert_eq!(
        manager.client.call("POST", &path, request.clone()).await?.0,
        StatusCode::BAD_REQUEST
    );
    request["contractIds"] = json!([contract]);
    let (a, b) = tokio::join!(
        manager.client.call("POST", &path, request.clone()),
        manager.client.call("POST", &path, request.clone())
    );
    let replies = [a?, b?];
    let mut codes = replies.each_ref().map(|r| r.0.as_u16());
    codes.sort();
    assert_eq!(codes, [201, 409], "{replies:?}");
    let release = &replies
        .iter()
        .find(|r| r.0 == StatusCode::CREATED)
        .ok_or("missing management decision")?
        .1;
    assert_eq!(release["approvedBy"], manager.user.to_string());
    assert_eq!(release["reasonProjection"]["value"], request["reason"]);
    assert_eq!(release["currentApplicable"], true);
    let release_id = row_id(release)?;
    let immutable = sqlx::query(
        "UPDATE poms.commission_low_down_payment_release SET reason='changed' WHERE id=$1",
    )
    .bind(release_id)
    .execute(&owner.pool)
    .await;
    let Err(immutable) = immutable else {
        return Err("management approval history unexpectedly changed".into());
    };
    assert_eq!(
        immutable
            .as_database_error()
            .and_then(|e| e.code())
            .as_deref(),
        Some("23514")
    );
    assert_eq!(
        finance.client.call("GET", &path, json!({})).await?.0,
        StatusCode::FORBIDDEN
    );
    let masked = manager.client.ok("GET", &path, json!({})).await?;
    assert!(
        masked["currentContext"]["contracts"][0]["amountTaxExclusiveProjection"]["value"].is_null()
    );
    let submitted = owner
        .client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{payout}:submitApproval"),
            json!({"payoutStage":"first","expectedVersion":1}),
        )
        .await?;
    assert_eq!(
        submitted["theoreticalCapAmountProjection"]["value"],
        "90.00"
    );
    assert_eq!(
        manager
            .client
            .call(
                "POST",
                &format!("/api/commission-payouts/{payout}:approve"),
                json!({"expectedVersion":2})
            )
            .await?
            .0,
        StatusCode::FORBIDDEN
    );
    finance
        .client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{payout}:approve"),
            json!({"expectedVersion":2}),
        )
        .await?;
    owner
        .client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{payout}:registerPayout"),
            json!({"payoutStage":"first","paidRecordAmount":"90","expectedVersion":3}),
        )
        .await?;
    request["decision"] = json!("release-standard");
    let extra = confirm_net_receipt(
        &owner.client,
        &owner.pool,
        i.project,
        contract,
        term,
        "29999.99",
        "manual",
        None,
    )
    .await?;
    assert_eq!(
        manager.client.call("POST", &path, request.clone()).await?.0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    confirm_net_receipt(
        &owner.client,
        &owner.pool,
        i.project,
        contract,
        term,
        "0.01",
        "manual",
        None,
    )
    .await?;
    let unlocked = manager.client.call("POST", &path, request.clone()).await?;
    assert_eq!(unlocked.0, StatusCode::CREATED, "{:?}", unlocked.1);
    let supplement=approve_adjustment(&owner.client,&finance.client,&owner.pool,i.project,json!({"adjustmentType":"supplement","relatedPayoutId":payout,"amount":"90","reason":"management release plus actual finance approval"})).await?;
    owner
        .client
        .ok(
            "POST",
            &format!("/api/commission-adjustments/{supplement}:execute"),
            json!({"expectedVersion":3}),
        )
        .await?;
    let total:String=sqlx::query_scalar("SELECT SUM(paid_record_amount)::text FROM poms.commission_payout WHERE project_id=$1 AND status='paid'").bind(i.project).fetch_one(&owner.pool).await?;
    assert_eq!(total, "180.00");
    let excess=owner.client.ok("POST",&format!("/api/projects/{}/commission-adjustments",i.project),json!({"adjustmentType":"supplement","relatedPayoutId":payout,"amount":"0.01","reason":"negative cap case"})).await?;
    let excess = row_id(&excess)?;
    owner
        .client
        .ok(
            "POST",
            &format!("/api/commission-adjustments/{excess}:submitApproval"),
            json!({"expectedVersion":1}),
        )
        .await?;
    let excess_approval:Uuid=sqlx::query_scalar("SELECT id FROM poms.approval_record WHERE target_object_id=$1 AND current_status='pending'").bind(excess).fetch_one(&owner.pool).await?;
    assert_eq!(
        finance
            .client
            .call(
                "POST",
                &format!("/api/approval-records/{excess_approval}:approve"),
                json!({"expectedVersion":1})
            )
            .await?
            .0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    // Controlled receipt-withdrawal fault: retained G basis must not keep a
    // management decision applicable after the actual receipt stops qualifying.
    sqlx::query("UPDATE poms.receipt_record SET status='pending-confirmation' WHERE id=$1")
        .bind(extra)
        .execute(&owner.pool)
        .await?;
    let history = manager.client.ok("GET", &path, json!({})).await?;
    assert_eq!(
        history["records"]
            .as_array()
            .ok_or("release history")?
            .iter()
            .find(|r| r["decision"] == "release-standard")
            .ok_or("unlock history")?["currentApplicable"],
        false
    );
    close_fixture(manager).await?;
    close_fixture(finance).await?;
    close_fixture(owner).await
}

// Explicit legacy inputs with complete FK-bound membership. This exercises the
// payout consumer, not upstream readiness/handover producer certification.
async fn captured_multi_contract_input(f: &Fixture, i: &PayoutInputs) -> Result<(Uuid, Uuid)> {
    let project = i.project;
    let second:Uuid=sqlx::query_scalar("INSERT INTO poms.contract(project_id,contract_no,status) VALUES($1,$2,'active') RETURNING id").bind(project).bind(format!("CS-second-{project}")).fetch_one(&f.pool).await?;
    let declared = json!({"inputKind":"owned-legacy-multi-contract-set","projectId":project,"anchorNet":"60000.00","secondNet":"40000.00"});
    let hash = poms_api_rust::contract_support::canonical_hash(&declared)
        .map_err(|_| "legacy set hash")?;
    let second_term:Uuid=sqlx::query_scalar("INSERT INTO poms.contract_term_snapshot(contract_id,snapshot_status,amount_tax_inclusive,amount_tax_exclusive,tax_rate,down_payment_rate,retention_rate,retention_due_date,currency_code,payload_hash,effective_at) VALUES($1,'active',45200,40000,0.13,0.20,0.20,current_date-30,'CNY',$2,clock_timestamp()) RETURNING id").bind(second).bind(&hash).fetch_one(&f.pool).await?;
    sqlx::query("UPDATE poms.contract SET current_snapshot_id=$1 WHERE id=$2")
        .bind(second_term)
        .bind(second)
        .execute(&f.pool)
        .await?;
    let baseline:Uuid=sqlx::query_scalar("INSERT INTO poms.commercial_release_baseline(project_id,baseline_code) VALUES($1,$2) RETURNING id").bind(project).bind(format!("legacy-{project}")).fetch_one(&f.pool).await?;
    let cost:Uuid=sqlx::query_scalar("INSERT INTO poms.project_technical_cost_package(project_id,version,technical_feasibility_decision,technical_conclusion_summary,currency_code,total_estimated_amount_excluding_tax,total_tax_cost_amount,total_estimated_amount_including_tax,tax_assumption_summary,tax_review_status,effective_at) VALUES($1,1,'feasible','explicit legacy input','CNY',7000,910,7910,'13%','confirmed',now()) RETURNING id").bind(project).fetch_one(&f.pool).await?;
    let pricing:Uuid=sqlx::query_scalar("INSERT INTO poms.project_pricing_margin_review(project_id,version,technical_cost_package_id,pricing_path,quote_version,currency_code,quote_amount_tax_inclusive,quote_amount_tax_exclusive,tax_rate,tax_condition_summary,payment_terms_summary,gross_margin_band,gross_margin_summary,decision,decision_summary,effective_at) VALUES($1,1,$2,'direct','legacy-1','CNY',113000,100000,0.13,'legacy','legacy','normal','legacy','pass','legacy',now()) RETURNING id").bind(project).bind(cost).fetch_one(&f.pool).await?;
    let basis:Uuid=sqlx::query_scalar("INSERT INTO poms.project_handover_basis_snapshot(project_id,version,source_payload,source_hash,payload_hash,status,generated_by) VALUES($1,1,$2,$3,$3,'active',$4) RETURNING id").bind(project).bind(&declared).bind(&hash).bind(f.user).fetch_one(&f.pool).await?;
    let members:Vec<(Uuid,Uuid)>=sqlx::query_as("SELECT id,current_snapshot_id FROM poms.contract WHERE project_id=$1 AND status='active' ORDER BY id").bind(project).fetch_all(&f.pool).await?;
    for (contract, term) in members {
        let diff:Uuid=sqlx::query_scalar("INSERT INTO poms.commercial_baseline_diff_result(baseline_id,project_id,contract_id,diff_level,review_status) VALUES($1,$2,$3,'none','reviewed') RETURNING id").bind(baseline).bind(project).bind(contract).fetch_one(&f.pool).await?;
        let readiness:Uuid=sqlx::query_scalar("INSERT INTO poms.contract_readiness_package(project_id,contract_id,source_baseline_id,latest_diff_result_id,package_status,guard_decision) VALUES($1,$2,$3,$4,'ready','allow') RETURNING id").bind(project).bind(contract).bind(baseline).bind(diff).fetch_one(&f.pool).await?;
        let preparation:Uuid=sqlx::query_scalar("INSERT INTO poms.contract_term_preparation(project_id,contract_id,source_readiness_id,source_baseline_id,source_diff_result_id,source_cost_package_id,source_pricing_review_id,version,status,contract_row_version_at_preparation,currency_code,amount_tax_inclusive,amount_tax_exclusive,tax_rate,down_payment_rate,retention_rate,retention_due_date,payment_terms,receivable_plan_seeds,source_facts,contract_core_hash,payload_hash,prepared_by) SELECT $1,$2,$3,$4,$5,$6,$7,1,'prepared',1,t.currency_code,t.amount_tax_inclusive,t.amount_tax_exclusive,t.tax_rate,t.down_payment_rate,t.retention_rate,t.retention_due_date,'legacy',jsonb_build_array(jsonb_build_object('nodeKey','all','plannedAmount',t.amount_tax_inclusive::text)),$8,$9,$9,$10 FROM poms.contract_term_snapshot t WHERE id=$11 RETURNING id").bind(project).bind(contract).bind(readiness).bind(baseline).bind(diff).bind(cost).bind(pricing).bind(&declared).bind(&hash).bind(f.user).bind(term).fetch_one(&f.pool).await?;
        sqlx::query("UPDATE poms.contract_term_snapshot SET source_preparation_id=$1 WHERE id=$2")
            .bind(preparation)
            .bind(term)
            .execute(&f.pool)
            .await?;
        sqlx::query("UPDATE poms.contract_term_preparation SET status='activated',activated_snapshot_id=$1,activated_at=now(),activated_by=$2 WHERE id=$3").bind(term).bind(f.user).bind(preparation).execute(&f.pool).await?;
        let plan:Uuid=sqlx::query_scalar("INSERT INTO poms.receivable_plan_version(project_id,contract_id,snapshot_id,source_preparation_id,source_readiness_id,version,status,currency_code,amount_tax_inclusive,payload_hash,initialized_by) SELECT $1,$2,$3,$4,$5,1,'active',currency_code,amount_tax_inclusive,$6,$7 FROM poms.contract_term_snapshot WHERE id=$3 RETURNING id").bind(project).bind(contract).bind(term).bind(preparation).bind(readiness).bind(&hash).bind(f.user).fetch_one(&f.pool).await?;
        sqlx::query("INSERT INTO poms.project_handover_contract_basis(basis_snapshot_id,project_id,contract_id,term_snapshot_id,readiness_package_id,preparation_id,plan_version_id,source_payload_hash,currency_code,signed_amount,amount_tax_inclusive,amount_tax_exclusive,is_compatibility_anchor) SELECT $1,$2,$3,$4,$5,$6,$7,$8,currency_code,amount_tax_inclusive,amount_tax_inclusive,amount_tax_exclusive,$9 FROM poms.contract_term_snapshot WHERE id=$4").bind(basis).bind(project).bind(contract).bind(term).bind(readiness).bind(preparation).bind(plan).bind(&hash).bind(contract!=second).execute(&f.pool).await?;
    }
    let handover: Uuid = sqlx::query_scalar(
        "SELECT source_handover_id FROM poms.commission_role_assignment WHERE id=$1",
    )
    .bind(i.freeze)
    .fetch_one(&f.pool)
    .await?;
    sqlx::query("UPDATE poms.project_handover SET basis_snapshot_id=$1 WHERE id=$2")
        .bind(basis)
        .bind(handover)
        .execute(&f.pool)
        .await?;
    sqlx::query("INSERT INTO poms.project_receipt_judgment_freeze(project_id,receipt_judgment_mode,source_type,source_id,source_handover_id,source_handover_summary_snapshot_id,basis_snapshot_id,frozen_by) SELECT $1,'contract-separate','project-handover',$2,$2,summary_snapshot_id,$3,$4 FROM poms.project_handover WHERE id=$2").bind(project).bind(handover).bind(basis).bind(f.user).execute(&f.pool).await?;
    Ok((second, second_term))
}

#[tokio::test]
#[ignore = "requires explicit dedicated commission DB initialized from application migrations"]
async fn multi_contract_cash_stays_with_approved_contract_and_unknown_history_is_retained() -> Result
{
    let f = fixture(
        None,
        &[
            PermissionKey::CommissionRuleVersionsManage,
            PermissionKey::CommissionCalculationsManage,
            PermissionKey::CommissionPayoutsManage,
            PermissionKey::CommissionAdjustmentsManage,
            PermissionKey::CommissionAmountSensitiveRead,
            PermissionKey::ProjectWrite,
        ],
    )
    .await?;
    let finance = fixture(
        Some("finance_mgr"),
        &[
            PermissionKey::CommissionPayoutsManage,
            PermissionKey::CommissionAdjustmentsManage,
            PermissionKey::CommissionAmountSensitiveRead,
            PermissionKey::ProjectWrite,
        ],
    )
    .await?;
    let i = payout_inputs_received(
        &f.client, &f.pool, f.user, "0.10", "0.20", "60000", -30, "12000",
    )
    .await?;
    let first: Uuid = sqlx::query_scalar("SELECT id FROM poms.contract WHERE project_id=$1")
        .bind(i.project)
        .fetch_one(&f.pool)
        .await?;
    let (second, second_term) = captured_multi_contract_input(&f, &i).await?;
    let calculation = calculated_values(&f.client, i.project, f.user, "10000", "7000").await?;
    let draft = payout_draft(&f.client, i.project, calculation, "first").await?;
    assert_eq!(draft["theoreticalCapAmountProjection"]["value"], "72.00");
    let payout = row_id(&draft)?;
    payout_approve(
        &f.client,
        &finance.client,
        &f.pool,
        payout,
        "first",
        json!({}),
        true,
    )
    .await?;
    confirm_net_receipt(
        &f.client,
        &f.pool,
        i.project,
        second,
        second_term,
        "8000",
        "manual",
        None,
    )
    .await?;
    let original_receipt:Uuid=sqlx::query_scalar("UPDATE poms.receipt_record SET status='pending-confirmation' WHERE project_id=$1 AND contract_id=$2 RETURNING id").bind(i.project).bind(first).fetch_one(&f.pool).await?;
    assert_eq!(
        f.client
            .call(
                "POST",
                &format!("/api/commission-payouts/{payout}:registerPayout"),
                json!({"payoutStage":"first","paidRecordAmount":"48","expectedVersion":3})
            )
            .await?
            .0,
        StatusCode::UNPROCESSABLE_ENTITY,
        "an approval for contract A cannot pay contract B"
    );
    sqlx::query("UPDATE poms.receipt_record SET status='confirmed' WHERE id=$1")
        .bind(original_receipt)
        .execute(&f.pool)
        .await?;
    f.client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{payout}:registerPayout"),
            json!({"payoutStage":"first","paidRecordAmount":"72","expectedVersion":3}),
        )
        .await?;
    let paid: Value = sqlx::query_scalar(
        "SELECT paid_contract_allocations FROM poms.commission_payout WHERE id=$1",
    )
    .bind(payout)
    .fetch_one(&f.pool)
    .await?;
    assert_eq!(
        paid.as_array()
            .ok_or("paid packet")?
            .iter()
            .find(|r| r["contractId"] == first.to_string())
            .ok_or("first allocation")?["amount"],
        "72.00"
    );
    let recalculated=f.client.ok("POST",&format!("/api/commission-calculations/{calculation}:recalculate"),json!({"reason":"same pool, next independent contract installment","expectedVersion":2})).await?;
    let calculation = row_id(&recalculated)?;
    f.client
        .ok(
            "POST",
            &format!("/api/commission-calculations/{calculation}:approve"),
            json!({"expectedVersion":1}),
        )
        .await?;
    // Controlled loss of historical evidence must remain UNKNOWN.
    sqlx::query("UPDATE poms.commission_payout SET paid_contract_allocations=NULL WHERE id=$1")
        .bind(payout)
        .execute(&f.pool)
        .await?;
    let create = format!("/api/projects/{}/commission-payouts", i.project);
    assert_eq!(
        f.client
            .call(
                "POST",
                &create,
                json!({"calculationId":calculation,"stageType":"first"})
            )
            .await?
            .0,
        StatusCode::CONFLICT
    );
    sqlx::query("UPDATE poms.commission_payout SET paid_contract_allocations=$1 WHERE id=$2")
        .bind(paid)
        .bind(payout)
        .execute(&f.pool)
        .await?;
    let next = payout_draft(&f.client, i.project, calculation, "first").await?;
    assert_eq!(next["theoreticalCapAmountProjection"]["value"], "48.00");
    let next_id = row_id(&next)?;
    payout_approve(
        &f.client,
        &finance.client,
        &f.pool,
        next_id,
        "first",
        json!({}),
        false,
    )
    .await?;
    f.client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{next_id}:registerPayout"),
            json!({"payoutStage":"first","paidRecordAmount":"48","expectedVersion":3}),
        )
        .await?;
    let amounts:Vec<(Uuid,String)>=sqlx::query_as("SELECT (a->>'contractId')::uuid,SUM((a->>'amount')::numeric)::text FROM poms.commission_payout p CROSS JOIN LATERAL jsonb_array_elements(p.paid_contract_allocations) a WHERE project_id=$1 AND status='paid' GROUP BY a->>'contractId' ORDER BY a->>'contractId'").bind(i.project).fetch_all(&f.pool).await?;
    assert!(amounts.contains(&(first, "72.00".into())));
    assert!(amounts.contains(&(second, "48.00".into())));
    let return_second=approve_adjustment(&f.client,&finance.client,&f.pool,i.project,json!({"adjustmentType":"clawback","relatedPayoutId":next_id,"amount":"48","reason":"return second installment before supplement"})).await?;
    f.client
        .ok(
            "POST",
            &format!("/api/commission-adjustments/{return_second}:execute"),
            json!({"expectedVersion":3}),
        )
        .await?;
    // Use the still-paid first record as the supplement's primary anchor. Its
    // actual finance approval must capture only contract B's remaining share.
    let supplement=approve_adjustment(&f.client,&finance.client,&f.pool,i.project,json!({"adjustmentType":"supplement","relatedPayoutId":payout,"amount":"48","reason":"explicit contract B supplement"})).await?;
    let allocation: Value = sqlx::query_scalar(
        "SELECT approved_contract_allocations FROM poms.commission_adjustment WHERE id=$1",
    )
    .bind(supplement)
    .fetch_one(&f.pool)
    .await?;
    assert_eq!(
        allocation
            .as_array()
            .ok_or("supplement allocation")?
            .iter()
            .find(|r| r["contractId"] == second.to_string())
            .ok_or("second approval")?["amount"],
        "48.00"
    );
    sqlx::query("UPDATE poms.receipt_record SET status='pending-confirmation' WHERE project_id=$1 AND contract_id=$2").bind(i.project).bind(second).execute(&f.pool).await?;
    let return_first=approve_adjustment(&f.client,&finance.client,&f.pool,i.project,json!({"adjustmentType":"clawback","relatedPayoutId":payout,"amount":"48","reason":"contract A now has available balance"})).await?;
    f.client
        .ok(
            "POST",
            &format!("/api/commission-adjustments/{return_first}:execute"),
            json!({"expectedVersion":3}),
        )
        .await?;
    assert_eq!(
        f.client
            .call(
                "POST",
                &format!("/api/commission-adjustments/{supplement}:execute"),
                json!({"expectedVersion":3})
            )
            .await?
            .0,
        StatusCode::UNPROCESSABLE_ENTITY,
        "contract B approval cannot move to contract A's newly available 48"
    );
    sqlx::query(
        "UPDATE poms.receipt_record SET status='confirmed' WHERE project_id=$1 AND contract_id=$2",
    )
    .bind(i.project)
    .bind(second)
    .execute(&f.pool)
    .await?;
    f.client
        .ok(
            "POST",
            &format!("/api/commission-adjustments/{supplement}:execute"),
            json!({"expectedVersion":3}),
        )
        .await?;
    let actual:Value=sqlx::query_scalar("SELECT paid_contract_allocations FROM poms.commission_payout WHERE source_payout_id=$1 AND payout_kind='supplement'").bind(payout).fetch_one(&f.pool).await?;
    assert_eq!(actual, allocation);
    sqlx::query("INSERT INTO poms.contract(project_id,contract_no,status) VALUES($1,$2,'active')")
        .bind(i.project)
        .bind(format!("CS-added-after-freeze-{}", i.project))
        .execute(&f.pool)
        .await?;
    assert_eq!(
        f.client
            .call(
                "POST",
                &create,
                json!({"calculationId":calculation,"stageType":"first"})
            )
            .await?
            .0,
        StatusCode::CONFLICT
    );
    close_fixture(finance).await?;
    close_fixture(f).await
}

#[tokio::test]
#[ignore = "requires explicit dedicated commission DB initialized from application migrations"]
async fn r5_tail_adjustment_refresh_and_settlement_rollback() -> Result {
    let f = tail_fixture().await?;
    let finance = tail_finance().await?;
    let i = payout_inputs(&f.client, &f.pool, f.user, "0", "0.20").await?;
    sqlx::query("UPDATE poms.operating_signal_gate_binding SET tax_impact_pending_amount=NULL,tax_pending_knowledge='unknown' WHERE id=(SELECT binding_id FROM poms.commission_gate_review_record WHERE id=$1)").bind(i.review).execute(&f.pool).await?;
    let calc = calculated(&f.client, i.project, f.user).await?;
    let payout = row_id(&payout_draft(&f.client, i.project, calc, "final").await?)?;
    payout_approve(&f.client,&finance.client,&f.pool,payout,"final",json!({"gateReviewRecordId":i.review,"summarySnapshotId":i.summary,"freezeVersionId":i.freeze}),true).await?;
    f.client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{payout}:registerPayout"),
            json!({"payoutStage":"final","paidRecordAmount":"6000","expectedVersion":3}),
        )
        .await?;
    let original:Uuid=sqlx::query_scalar("SELECT id FROM poms.commission_final_settlement_snapshot WHERE project_id=$1 AND is_current").bind(i.project).fetch_one(&f.pool).await?;
    let path = format!("/api/projects/{}/commission-final-settlement", i.project);
    assert_eq!(
        f.client.ok("GET", &path, json!({})).await?["finalSettlementStatus"],
        "settled-all"
    );
    let fail=approve_adjustment(&f.client,&finance.client,&f.pool,i.project,json!({"adjustmentType":"clawback","relatedPayoutId":payout,"relatedCalculationId":calc,"amount":"100","reason":"rollback fixture"})).await?;
    payout_audit_fault(
        &f.pool,
        fail,
        "settlement_adjustment",
        "CommissionController_executeAdjustment",
        "true",
    )
    .await?;
    assert_eq!(
        f.client
            .call(
                "POST",
                &format!("/api/commission-adjustments/{fail}:execute"),
                json!({"expectedVersion":3})
            )
            .await?
            .0,
        StatusCode::INTERNAL_SERVER_ERROR
    );
    let unchanged:Uuid=sqlx::query_scalar("SELECT id FROM poms.commission_final_settlement_snapshot WHERE project_id=$1 AND is_current").bind(i.project).fetch_one(&f.pool).await?;
    assert_eq!(unchanged, original);
    let state:(String,String)=sqlx::query_as("SELECT a.status,p.status FROM poms.commission_adjustment a JOIN poms.commission_payout p ON p.id=a.related_payout_id WHERE a.id=$1").bind(fail).fetch_one(&f.pool).await?;
    assert_eq!(state, ("approved".into(), "paid".into()));
    let adjustment=approve_adjustment(&f.client,&finance.client,&f.pool,i.project,json!({"adjustmentType":"clawback","relatedPayoutId":payout,"relatedCalculationId":calc,"amount":"200","reason":"approved cash correction"})).await?;
    f.client
        .ok(
            "POST",
            &format!("/api/commission-adjustments/{adjustment}:execute"),
            json!({"expectedVersion":3}),
        )
        .await?;
    let pending = f.client.ok("GET", &path, json!({})).await?;
    assert_eq!(pending["finalSettlementStatus"], "pending-final-settlement");
    assert_eq!(
        pending["nonRetentionSettlementStatus"],
        "pending-non-retention"
    );
    let persisted:(Uuid,String)=sqlx::query_as("SELECT id,final_settlement_status FROM poms.commission_final_settlement_snapshot WHERE project_id=$1 AND is_current").bind(i.project).fetch_one(&f.pool).await?;
    assert_ne!(persisted.0, original);
    assert_eq!(persisted.1, "pending-final-settlement");
    assert_eq!(
        f.client
            .ok(
                "GET",
                &format!("/api/projects/{}/commission-rule-explanation", i.project),
                json!({})
            )
            .await?["currentStageStatus"],
        "pending-final-settlement"
    );
    close_fixture(finance).await?;
    close_fixture(f).await
}

fn native_success<'a>(
    client: &'a Client,
    method: &'a str,
    path: &'a str,
    input: Value,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<Value>> + 'a>> {
    // Keep the router future outside the long scenario's test-thread stack.
    Box::pin(async move {
        let (status, value) = client.call(method, path, input).await?;
        assert!(
            matches!(status, StatusCode::OK | StatusCode::CREATED),
            "{method} {path}: {status} {value}"
        );
        Ok(value)
    })
}

#[tokio::test]
#[ignore = "requires explicit dedicated commission DB initialized from application migrations"]
async fn r4_native_business_delivery_chain() -> Result {
    Box::pin(native_business_delivery_chain(NativeChain::Normal)).await
}

#[tokio::test]
#[ignore = "requires explicit dedicated commission DB initialized from application migrations"]
async fn r4_native_conditional_completion_and_archive_chain() -> Result {
    Box::pin(native_business_delivery_chain(NativeChain::Conditional)).await
}

#[tokio::test]
#[ignore = "requires explicit dedicated commission DB initialized from application migrations"]
async fn r4_native_shared_allocation_and_atomic_restatement_chain() -> Result {
    Box::pin(native_business_delivery_chain(NativeChain::Shared)).await
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum NativeChain {
    Normal,
    Conditional,
    Shared,
}

async fn native_business_delivery_chain(mode: NativeChain) -> Result {
    let conditional = mode == NativeChain::Conditional;
    let shared = mode == NativeChain::Shared;
    let permissions = [
        PermissionKey::CustomerRead,
        PermissionKey::CustomerWrite,
        PermissionKey::ProjectRead,
        PermissionKey::ProjectWrite,
        PermissionKey::NavContractsView,
        PermissionKey::ContractFinanceManage,
        PermissionKey::ContractFinanceSensitiveRead,
        PermissionKey::OperatingFinanceSensitiveRead,
        PermissionKey::LaborCostRateSensitiveRead,
        PermissionKey::CommissionAssignmentsManage,
        PermissionKey::CommissionCalculationsManage,
        PermissionKey::CommissionPayoutsManage,
        PermissionKey::CommissionRuleVersionsManage,
        PermissionKey::CommissionAmountSensitiveRead,
    ];
    let f = fixture(None, &permissions).await?;
    let reviewer = fixture(
        Some("vp_owner"),
        &[
            PermissionKey::ProjectRead,
            PermissionKey::ProjectWrite,
            PermissionKey::NavContractsView,
        ],
    )
    .await?;
    // Login/organization and generic pricing lineage are test configuration.
    // Qualified contract/handover/role states come from the actual APIs.
    let org = uuid(&f.pool).await?;
    sqlx::query("INSERT INTO poms.org_unit(id,name,code,is_active) VALUES($1,$2,$3,true)")
        .bind(org)
        .bind(format!("R4 functional {org}"))
        .bind(format!("r4-{org}"))
        .execute(&f.pool)
        .await?;
    sqlx::query("INSERT INTO poms.user_org_membership(user_id,org_unit_id,membership_type,status) VALUES($1,$2,'primary','active')")
        .bind(f.user).bind(org).execute(&f.pool).await?;
    sqlx::query("UPDATE poms.platform_user SET primary_org_unit_id=$1 WHERE id=$2")
        .bind(org)
        .bind(f.user)
        .execute(&f.pool)
        .await?;
    let customer = native_success(&f.client, "POST", "/api/customers",
        json!({"displayName":format!("R4 native customer {}",f.user),"ownerOrgId":org,"ownerUserId":f.user})).await?;
    let customer = row_id(&customer)?;
    let project = native_success(&f.client, "POST", "/api/projects",
        json!({"projectName":format!("R4 native chain {}",f.user),"customerId":customer,"initialOwnership":"creator"})).await?;
    let project = row_id(&project)?;
    println!("native business project: {project}");
    let contract = native_success(&f.client, "POST", "/api/contracts",
        json!({"projectId":project,"signedAmount":"113000.00","currencyCode":"CNY","signedAt":"2026-11-01T00:00:00.000Z"})).await?;
    let contract = row_id(&contract)?;
    let cost = native_success(&f.client, "POST", &format!("/api/projects/{project}/technical-cost-packages"),
        json!({"technicalFeasibilityDecision":"feasible","technicalConclusionSummary":"Owned native functional input","allowNextStage":true,"currencyCode":"CNY","taxAssumptionSummary":"13 percent","taxReviewStatus":"reviewed","costItems":[{"costCategory":"procurement","costDescription":"Equipment","estimationBasis":"Owned functional quotation","amountExcludingTax":"70000.00","taxCostAmount":"9100.00","amountIncludingTax":"79100.00","currencyCode":"CNY","confidenceLevel":"high","highUncertainty":false}]})).await?;
    let cost = row_id(&cost)?;
    let bid = native_success(&f.client, "POST", &format!("/api/projects/{project}/bid-commercial-processes"),
        json!({"bidMode":"not-required","currentStage":"closed","decision":"not-required","resultStatus":"not-applicable","processSummary":"Direct commercial functional case","decisionSummary":"No bid required"})).await?;
    let bid = row_id(&bid)?;
    let terms = json!({"contractId":contract,"amountTaxInclusive":"113000.00","amountTaxExclusive":"100000.00","taxRate":"0.13","downPaymentRate":"0.20","retentionRate":"0","retentionDueDate":null,"paymentTerms":"20 percent deposit, remaining on delivery","receivablePlanSeeds":[{"nodeKey":"deposit","label":"Deposit","plannedAmount":"22600.00","plannedDate":"2026-11-18","isRetentionNode":false,"sortOrder":0},{"nodeKey":"delivery","label":"Delivery","plannedAmount":"90400.00","plannedDate":"2026-12-18","isRetentionNode":false,"sortOrder":1}]});
    let baseline = native_success(&f.client, "POST", "/api/commercial-release-baselines",
        json!({"projectId":project,"baselineCode":format!("R4-{project}"),"contractTerms":[terms.clone()],"amountTaxInclusive":"113000.00","amountTaxExclusive":"100000.00","taxRate":"0.13","downPaymentRate":"0.20","retentionRate":"0","paymentTerms":"20 percent deposit, remaining on delivery"})).await?;
    let baseline = row_id(&baseline)?;
    // Pricing accepts an existing generic summary as lineage, not approval.
    // Its declared decision is recorded by the actual pricing API below.
    let package = format!("r4-native-{project}");
    let definition:Uuid=sqlx::query_scalar("INSERT INTO poms.approval_summary_package_definition(approval_scenario_key,summary_package_key,projection_level,export_policy,field_rule_version) VALUES($1,$1,'minimum-confirmation','internal-only','functional-configuration') RETURNING id").bind(&package).fetch_one(&f.pool).await?;
    let summary:Uuid=sqlx::query_scalar("INSERT INTO poms.approval_summary_snapshot(target_type,target_id,approval_scenario_key,summary_package_id,summary_package_key,projection_level,export_policy,business_status_at_snapshot) VALUES('project',$1,$2,$3,$2,'minimum-confirmation','internal-only','assessment') RETURNING id").bind(project).bind(&package).bind(definition).fetch_one(&f.pool).await?;
    native_success(&f.client, "POST", &format!("/api/projects/{project}/pricing-margin-reviews"),
        json!({"technicalCostPackageId":cost,"bidCommercialProcessId":bid,"commercialReleaseBaselineId":baseline,"pricingPath":"direct-commercial","quoteVersion":"functional-1","currencyCode":"CNY","quoteAmountTaxInclusive":"113000.00","quoteAmountTaxExclusive":"100000.00","taxRate":"0.13","taxConditionSummary":"13 percent confirmed","paymentTermsSummary":"20 percent deposit, remaining on delivery","grossMarginRate":"0.30","grossMarginBand":"target","grossMarginSummary":"30 percent","decision":"released","decisionSummary":"Owned functional commercial decision","approvalScenarioKey":package,"summaryPackageKey":package,"summarySnapshotId":summary,"projectionLevel":"minimum-confirmation","exportPolicy":"internal-only"})).await?;
    let readiness=native_success(&f.client,"POST","/api/contract-readiness-packages",
        json!({"projectId":project,"contractId":contract,"sourceBaselineId":baseline,"candidateTerms":terms})).await?;
    let readiness = row_id(&readiness)?;
    native_success(
        &f.client,
        "POST",
        &format!("/api/contract-readiness-packages/{readiness}:initializeContractSnapshot"),
        json!({"contractId":contract,"expectedVersion":1}),
    )
    .await?;
    let preparation: Uuid = sqlx::query_scalar(
        "SELECT current_preparation_id FROM poms.contract_readiness_package WHERE id=$1",
    )
    .bind(readiness)
    .fetch_one(&f.pool)
    .await?;
    let before = native_success(
        &f.client,
        "GET",
        &format!("/api/contracts/{contract}"),
        json!({}),
    )
    .await?;
    native_success(
        &f.client,
        "POST",
        &format!("/api/contracts/{contract}:submitReview"),
        json!({"preparationId":preparation,"expectedVersion":before["rowVersion"]}),
    )
    .await?;
    let approval:Uuid=sqlx::query_scalar("SELECT id FROM poms.approval_record WHERE target_object_id=$1 AND current_status='pending'").bind(contract).fetch_one(&f.pool).await?;
    native_success(
        &reviewer.client,
        "POST",
        &format!("/api/approval-records/{approval}:approve"),
        json!({"expectedVersion":1}),
    )
    .await?;
    let approved = native_success(
        &f.client,
        "GET",
        &format!("/api/contracts/{contract}"),
        json!({}),
    )
    .await?;
    native_success(
        &f.client,
        "POST",
        &format!("/api/contracts/{contract}:activate"),
        json!({"expectedVersion":approved["rowVersion"],"approvalRecordId":approval}),
    )
    .await?;
    let active: String = sqlx::query_scalar("SELECT status FROM poms.contract WHERE id=$1")
        .bind(contract)
        .fetch_one(&f.pool)
        .await?;
    assert_eq!(active, "active");
    let prepared = native_success(
        &f.client,
        "GET",
        &format!("/api/contract-readiness-packages/{readiness}"),
        json!({}),
    )
    .await?;
    native_success(
        &f.client,
        "POST",
        &format!("/api/contract-readiness-packages/{readiness}:initializeReceivablePlan"),
        json!({"contractId":contract,"expectedVersion":prepared["rowVersion"]}),
    )
    .await?;

    println!("native contract activated: {contract}");
    let detail = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}/project-handover"),
        json!({}),
    )
    .await?;
    native_success(&f.client,"POST",&format!("/api/projects/{project}/project-handovers"),
        json!({"executionOwnerUserId":f.user,"participants":[{"userId":f.user,"responsibilities":[{"roleKey":"sales-owner","responsibilitySummary":"Sales delivery"},{"roleKey":"business-admin","responsibilitySummary":"Business coordination"},{"roleKey":"technical-support","responsibilitySummary":"Technical support"},{"roleKey":"execution-owner","responsibilitySummary":"Execute delivery"}]}],"financeConfirmationRequired":false,"receiptJudgmentMode":"project-aggregate","expectedProjectVersion":detail["projectRowVersion"],"expectedSourceHash":detail["currentSourcePayloadHash"]})).await?;
    let detail = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}/project-handover"),
        json!({}),
    )
    .await?;
    let handover = detail["handoverId"].as_str().ok_or("handover ID")?;
    let confirmation_version:i32=sqlx::query_scalar("SELECT c.row_version FROM poms.project_handover h JOIN poms.confirmation_record c ON c.id=h.confirmation_record_id WHERE h.id=$1").bind(Uuid::parse_str(handover)?).fetch_one(&f.pool).await?;
    native_success(&f.client,"POST",&format!("/api/project-handovers/{handover}/participant-confirmations"),json!({"summarySnapshotId":detail["summarySnapshotId"],"handoverBasisSnapshotId":detail["handoverBasisSnapshotId"],"expectedConfirmationVersion":confirmation_version})).await?;
    let detail = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}/project-handover"),
        json!({}),
    )
    .await?;
    native_success(&f.client,"POST",&format!("/api/project-handovers/{handover}:confirm"),json!({"participantConfirmations":[{"participantId":f.user,"participantRoleKey":"sales-owner","participantStatus":"confirmed"},{"participantId":f.user,"participantRoleKey":"business-admin","participantStatus":"confirmed"},{"participantId":f.user,"participantRoleKey":"technical-support","participantStatus":"confirmed"},{"participantId":f.user,"participantRoleKey":"execution-owner","participantStatus":"confirmed"}],"receiptJudgmentMode":"project-aggregate","contractSummarySnapshotId":detail["contractSummarySnapshotId"],"expectedVersion":detail["rowVersion"],"handoverBasisSnapshotId":detail["handoverBasisSnapshotId"],"summarySnapshotId":detail["summarySnapshotId"],"sourcePayloadHash":detail["sourcePayloadHash"]})).await?;
    let assignment=native_success(&f.client,"POST",&format!("/api/projects/{project}/commission-role-assignments"),json!({"inputVersion":"server-derived-v1","expectedCurrentAssignmentId":null,"expectedCurrentRowVersion":null,"participants":[{"userId":f.user,"roleType":"sales-owner","responsibilitySummary":"Sales delivery","weight":0.5},{"userId":f.user,"roleType":"execution-owner","responsibilitySummary":"Execute delivery","weight":0.5}]})).await?;
    let assignment_id = row_id(&assignment)?;
    let detail = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}/project-handover"),
        json!({}),
    )
    .await?;
    native_success(&f.client,"POST",&format!("/api/commission-role-assignments/{assignment_id}:freeze"),json!({"inputVersion":"server-derived-v1","sourceHandoverId":handover,"handoverSummarySnapshotId":detail["summarySnapshotId"],"handoverBasisSnapshotId":detail["handoverBasisSnapshotId"],"expectedSourceHash":detail["sourcePayloadHash"],"expectedHandoverVersion":detail["rowVersion"],"expectedVersion":assignment["rowVersion"]})).await?;
    let frozen = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}/commission-role-assignment"),
        json!({}),
    )
    .await?;
    assert_eq!(frozen["sourceQualification"], "verified-producer");
    let handover_stage:Uuid=sqlx::query_scalar("SELECT id FROM poms.project_stage_record WHERE project_id=$1 AND to_stage='handover' ORDER BY sequence_no DESC LIMIT 1").bind(project).fetch_one(&f.pool).await?;
    let project_view = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}"),
        json!({}),
    )
    .await?;
    native_success(&f.client,"POST",&format!("/api/projects/{project}:startExecution"),json!({"inputVersion":"server-derived-v1","handoverStageRecordId":handover_stage,"reason":"Owned actual producer chain","handoverSummarySnapshotId":detail["summarySnapshotId"],"expectedProjectVersion":project_view["rowVersion"],"expectedRoleAssignmentVersion":frozen["rowVersion"],"commissionRoleAssignmentId":assignment_id,"sourceHandoverId":handover,"sourcePayloadHash":detail["sourcePayloadHash"]})).await?;
    let stage: String = sqlx::query_scalar("SELECT current_stage FROM poms.project WHERE id=$1")
        .bind(project)
        .fetch_one(&f.pool)
        .await?;
    assert_eq!(stage, "execution");
    println!("native handover/freeze/execution completed: {project}");

    let business_time = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let receipt = native_success(
        &f.client,
        "POST",
        &format!("/api/contracts/{contract}/receipt-records"),
        json!({"receiptAmount":"113000.00","receiptDate":business_time,"sourceType":"manual"}),
    )
    .await?;
    let receipt = row_id(&receipt)?;
    let term: Uuid =
        sqlx::query_scalar("SELECT current_snapshot_id FROM poms.contract WHERE id=$1")
            .bind(contract)
            .fetch_one(&f.pool)
            .await?;
    let term_ref = native_source_expected(&f.pool, "ContractTermSnapshot", term).await?;
    let current_contract = native_success(
        &f.client,
        "GET",
        &format!("/api/contracts/{contract}"),
        json!({}),
    )
    .await?;
    native_success(&f.client,"POST",&format!("/api/receipt-records/{receipt}:confirm"),json!({"inputVersion":"server-derived-v1","expectedVersion":1,"expectedContractVersion":current_contract["rowVersion"],"mode":"confirm","basis":{"termSnapshotRef":term_ref,"currencyBasisRef":term_ref,"evidenceRefs":[],"selectionPolicy":"receipt-date-effective-terms","reason":"Owned actual receipt producer"}})).await?;
    let net:String=sqlx::query_scalar("SELECT amount_excluding_tax::text FROM poms.receipt_accounting_basis WHERE receipt_id=$1 AND producer_version=1").bind(receipt).fetch_one(&f.pool).await?;
    assert_eq!(net, "100000.00");
    let payable=native_success(&f.client,"POST",&format!("/api/projects/{project}/payable-records"),json!({"contractId":contract,"vendorName":"Owned functional vendor","costCategory":"procurement","payableDescription":"Known zero-tax procurement","currency":"CNY","amountExcludingTax":"70000.00","taxAmount":"0.00","amountIncludingTax":"70000.00","expectedPaymentDate":chrono::Utc::now().date_naive().to_string(),"evidenceSummary":"Owned functional supplier settlement"})).await?;
    let payable = row_id(&payable)?;
    let payment=native_success(&f.client,"POST",&format!("/api/projects/{project}/payment-records"),json!({"contractId":contract,"payableRecordId":payable,"currency":"CNY","amountExcludingTax":"70000.00","taxAmount":"0.00","amountIncludingTax":"70000.00","paymentDate":business_time,"costCategory":"procurement","sourceType":"manual"})).await?;
    let payment_id = row_id(&payment)?;
    native_success(
        &f.client,
        "POST",
        &format!("/api/payment-records/{payment_id}:confirm"),
        json!({"expectedVersion":payment["rowVersion"]}),
    )
    .await?;
    let payment = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}/payment-records"),
        json!({}),
    )
    .await?;
    let payment_version = payment
        .as_array()
        .ok_or("payment list")?
        .iter()
        .find(|row| row["id"] == payment_id.to_string())
        .ok_or("actual payment")?["rowVersion"]
        .clone();
    let actual=native_success(&f.client,"POST",&format!("/api/projects/{project}/actual-cost-records"),json!({"costType":"payment-fact","paymentRecordId":payment_id,"expectedSourceVersion":payment_version,"costDescription":"Owned actual paid cost","evidenceSummary":"Actual confirmed payment"})).await?;
    let actual_id = Uuid::parse_str(
        actual["targetId"]
            .as_str()
            .ok_or("actual cost command targetId")?,
    )?;
    let actual_detail = native_success(
        &f.client,
        "GET",
        &format!("/api/project-actual-cost-records/{actual_id}"),
        json!({}),
    )
    .await?;
    assert_eq!(actual_detail["recordStatus"], "registered");
    let (execution_stage, stage_sequence): (Uuid, i32) = sqlx::query_as("SELECT id,sequence_no FROM poms.project_stage_record WHERE project_id=$1 AND to_stage='execution' ORDER BY sequence_no DESC LIMIT 1").bind(project).fetch_one(&f.pool).await?;
    native_success(&f.client, "POST", &format!("/api/project-actual-cost-records/{actual_id}/stage-attributions"), json!({"stageAttributionMode":"auto","attributedStage":"execution","expectedVersion":actual_detail["rowVersion"],"attributionSummary":"Actual immutable execution milestone","attributionEvidence":{"kind":"source","sourceType":"project-stage-record","sourceId":execution_stage,"sourceVersion":stage_sequence,"businessDate":actual_detail["occurredOn"],"reason":"The payment occurred on the actual execution admission date"}})).await?;
    let payable_detail = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}/payable-records"),
        json!({}),
    )
    .await?;
    let payable_version = payable_detail
        .as_array()
        .ok_or("payable list")?
        .iter()
        .find(|row| row["id"] == payable.to_string())
        .ok_or("actual payable")?["rowVersion"]
        .clone();
    let payable_cost = native_success(&f.client, "POST", &format!("/api/projects/{project}/actual-cost-records"), json!({"costType":"procurement","payableRecordId":payable,"expectedSourceVersion":payable_version,"evidenceSummary":"Paid commitment supports the actual payment without a second cost"})).await?;
    let payable_cost = Uuid::parse_str(
        payable_cost["targetId"]
            .as_str()
            .ok_or("payable cost targetId")?,
    )?;
    if shared {
        Box::pin(native_confirm_cost_stage(
            &f,
            project,
            payable_cost,
            execution_stage,
        ))
        .await?;
    }
    println!("native receipt/payment/cost completed: {project}");
    let preparation = native_success(
        &f.client,
        "GET",
        &format!(
            "/api/projects/{project}/unified-accounting?view=preparation&intent=baseline-activation"
        ),
        json!({}),
    )
    .await?;
    let p = &preparation["preparation"];
    assert!(!p["proposedOriginalCostRef"].is_null(), "{}", preparation);
    let basis = p["sourceRows"]
        .as_array()
        .ok_or("baseline sources")?
        .iter()
        .find(|row| row["sourceRef"]["kind"] == "ProjectHandoverBasisSnapshot")
        .map(|row| expected_from_source(&row["sourceRef"]))
        .unwrap_or(Value::Null);
    native_success(&f.client,"POST","/api/operating-baseline-packages",json!({"inputVersion":"server-derived-v1","projectId":project,"expectedVersion":p["headVersion"],"expectedProjectVersion":p["projectVersion"],"expectedInputHash":p["expectedInputHash"],"assertions":null,"expectedCurrentPackageRef":expected_from_source(&p["selectedBaselinePackageRef"]),"originalAdoptedCostRef":expected_from_source(&p["proposedOriginalCostRef"]),"selectedHandoverBasisRef":basis,"handoverRebaselineRef":null,"approvedChangeRefs":[],"reason":"Adopt actual native handover budget"})).await?;
    let preparation=native_success(&f.client,"GET",&format!("/api/projects/{project}/unified-accounting?view=preparation&intent=snapshot-create&snapshotMode=realtime"),json!({})).await?;
    let p = &preparation["preparation"];
    let cost_row = p["sourceRows"]
        .as_array()
        .ok_or("actual sources")?
        .iter()
        .find(|row| row["sourceRef"]["id"] == actual_id.to_string())
        .ok_or("actual cost source")?;
    let payment_ref = native_source_expected(&f.pool, "PaymentRecord", payment_id).await?;
    let decision = json!({"target":expected_from_source(&cost_row["sourceRef"]),"expectedVersion":if cost_row["currentDecisionRef"].is_null(){json!(0)}else{cost_row["currentDecisionRef"]["rowVersion"].clone()},"decision":"include","recognitionRole":"direct-source","reasonCode":"actual-payment","reasonText":"Confirmed zero-tax payment recorded by the native flow","primaryCostRef":null,"supportingSourceRefs":[payment_ref],"evidenceRefs":[payment_ref]});
    let payable_row = p["sourceRows"]
        .as_array()
        .ok_or("payable sources")?
        .iter()
        .find(|row| row["sourceRef"]["id"] == payable_cost.to_string())
        .ok_or("payable cost source")?;
    let supporting_decision = json!({"target":expected_from_source(&payable_row["sourceRef"]),"expectedVersion":0,"decision":"exclude","recognitionRole":"evidence-only","reasonCode":"duplicate-support","reasonText":"The linked paid commitment supports the actual payment; recognize only the payment","primaryCostRef":expected_from_source(&cost_row["sourceRef"]),"supportingSourceRefs":[payment_ref],"evidenceRefs":[payment_ref]});
    println!(
        "snapshot preparation reasons before classifications: {}",
        p["formalEligibility"]["blockingReasonCodes"]
    );
    let snapshot=native_success(&f.client,"POST","/api/project-operating-snapshots",json!({"inputVersion":"server-derived-v1","projectId":project,"expectedVersion":p["headVersion"],"expectedProjectVersion":p["projectVersion"],"expectedInputHash":p["expectedInputHash"],"assertions":null,"baselinePackageRef":expected_from_source(&p["selectedBaselinePackageRef"]),"snapshotMode":"realtime","periodKey":null,"costDecisions":[supporting_decision,decision]})).await?;
    println!("native operating snapshot: {}", snapshot["snapshotId"]);
    let calculation = calculated(&f.client, project, f.user).await?;
    let first = payout_draft(&f.client, project, calculation, "first").await?;
    assert_eq!(first["theoreticalCapAmountProjection"]["value"], "1200.00");
    let first = row_id(&first)?;
    let finance = fixture(
        Some("finance_mgr"),
        &[PermissionKey::CommissionPayoutsManage],
    )
    .await?;
    payout_approve(
        &f.client,
        &finance.client,
        &f.pool,
        first,
        "first",
        json!({}),
        true,
    )
    .await?;
    f.client
        .ok(
            "POST",
            &format!("/api/commission-payouts/{first}:registerPayout"),
            json!({"payoutStage":"first","paidRecordAmount":"1200.00","expectedVersion":3}),
        )
        .await?;
    println!("native operating and commission first payout completed: {project}");
    close_fixture(finance).await?;

    let snapshot_id = Uuid::parse_str(
        snapshot["snapshotId"]
            .as_str()
            .ok_or("native snapshot ID")?,
    )?;
    let context: Value = sqlx::query_scalar("SELECT frozen_payload FROM poms.operating_source_context WHERE snapshot_id=$1 AND producer_version=1").bind(snapshot_id).fetch_one(&f.pool).await?;
    assert_eq!(context["formalEligibility"]["status"], "eligible");
    assert_eq!(
        context["metrics"]["confirmedReceiptAmounts"]["net"]["value"],
        "100000.00"
    );
    assert_eq!(
        context["metrics"]["includedCostAmounts"]["net"]["value"],
        "70000.00"
    );
    assert_eq!(context["metrics"]["grossMarginNet"]["value"], "30000.00");
    assert_eq!(context["scope"]["unmappedCostCount"], 0);
    assert_eq!(context["scope"]["includedCostCount"], 1);
    assert_eq!(context["scope"]["excludedCostCount"], 1);
    native_success(
        &f.client,
        "GET",
        &format!("/api/project-operating-snapshots/{snapshot_id}"),
        json!({}),
    )
    .await?;
    let signal_id = snapshot["evaluationRefs"]["signalEvaluationId"]
        .as_str()
        .ok_or("native signal ID")?;
    let signal = native_success(
        &f.client,
        "GET",
        &format!("/api/operating-signal-evaluations/{signal_id}"),
        json!({}),
    )
    .await?;
    assert_eq!(signal["signalEvaluationId"], signal_id);
    assert_eq!(signal["projectId"], project.to_string());

    if !conditional {
        Box::pin(native_late_cost_restatement_and_reviews(
            &f,
            project,
            contract,
            snapshot_id,
            execution_stage,
        ))
        .await?;
    }
    if shared {
        Box::pin(native_shared_allocation_and_restatement(
            &f,
            project,
            contract,
            execution_stage,
        ))
        .await?;
    }
    let evidence = native_project_evidence(&f, project, None).await?;
    let project_view = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}"),
        json!({}),
    )
    .await?;
    let before_stage: i64 =
        sqlx::query_scalar("SELECT count(*) FROM poms.project_stage_record WHERE project_id=$1")
            .bind(project)
            .fetch_one(&f.pool)
            .await?;
    let acceptance_input = json!({"inputVersion":"server-derived-v1","expectedProjectVersion":project_view["rowVersion"],"executionStageRecordId":execution_stage,"evidenceRefs":[evidence],"evidenceSummary":"Actual local attachment uploaded and downloaded through native APIs","readinessSummary":"Owned functional delivery ready for final acceptance"});
    let (denied, _) = reviewer
        .client
        .call(
            "POST",
            &format!("/api/projects/{project}:startAcceptance"),
            acceptance_input.clone(),
        )
        .await?;
    assert_eq!(denied, StatusCode::NOT_FOUND); // Conceal projects outside this actor's scope.
    let mut missing_evidence = acceptance_input.clone();
    missing_evidence["evidenceRefs"] = json!([]);
    let (missing, _) = f
        .client
        .call(
            "POST",
            &format!("/api/projects/{project}:startAcceptance"),
            missing_evidence,
        )
        .await?;
    assert_eq!(missing, StatusCode::BAD_REQUEST);
    let unchanged_stage: i64 =
        sqlx::query_scalar("SELECT count(*) FROM poms.project_stage_record WHERE project_id=$1")
            .bind(project)
            .fetch_one(&f.pool)
            .await?;
    assert_eq!(
        before_stage, unchanged_stage,
        "Rejected delivery must not create a stage fact"
    );
    native_success(
        &f.client,
        "POST",
        &format!("/api/projects/{project}:startAcceptance"),
        acceptance_input.clone(),
    )
    .await?;
    let (stale, _) = f
        .client
        .call(
            "POST",
            &format!("/api/projects/{project}:startAcceptance"),
            acceptance_input,
        )
        .await?;
    assert_eq!(stale, StatusCode::CONFLICT);
    let acceptance_stage: Uuid = sqlx::query_scalar("SELECT id FROM poms.project_stage_record WHERE project_id=$1 AND to_stage='acceptance' ORDER BY sequence_no DESC LIMIT 1").bind(project).fetch_one(&f.pool).await?;
    let project_view = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}"),
        json!({}),
    )
    .await?;
    if conditional {
        Box::pin(native_conditional_completion_and_archive(
            &f,
            project,
            acceptance_stage,
            evidence,
        ))
        .await?;
        close_fixture(reviewer).await?;
        return close_fixture(f).await;
    }
    let project_view = if shared {
        native_success(&f.client,"POST",&format!("/api/projects/{project}/acceptance-records"),json!({"inputVersion":"server-derived-v1","expectedProjectVersion":project_view["rowVersion"],"acceptanceStageRecordId":acceptance_stage,"acceptanceType":"stage-acceptance","acceptanceResult":"accepted","scopeSummary":"Actual native stage delivery","evidenceSummary":"Actual uploaded evidence for second payout qualification","evidenceRefs":[evidence]})).await?;
        native_success(
            &f.client,
            "GET",
            &format!("/api/projects/{project}"),
            json!({}),
        )
        .await?
    } else {
        project_view
    };
    let acceptance = native_success(&f.client, "POST", &format!("/api/projects/{project}/acceptance-records"), json!({"inputVersion":"server-derived-v1","expectedProjectVersion":project_view["rowVersion"],"acceptanceStageRecordId":acceptance_stage,"acceptanceType":"final-acceptance","acceptanceResult":"accepted","scopeSummary":"Actual native delivery chain","evidenceSummary":"Owned final acceptance attachment","evidenceRefs":[evidence]})).await?;
    assert_eq!(acceptance["sourceQualification"], "verified-producer");
    let acceptance_id = row_id(&acceptance)?;
    let project_view = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}"),
        json!({}),
    )
    .await?;
    let completion = native_success(&f.client, "POST", &format!("/api/projects/{project}/completion-records"), json!({"inputVersion":"server-derived-v1","expectedProjectVersion":project_view["rowVersion"],"acceptanceRecordId":acceptance_id,"expectedAcceptanceVersion":acceptance["rowVersion"],"completionResult":"completed","completedAt":chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis,true),"completionSummary":"Owned final acceptance completed","evidenceSummary":"Actual native attachment","evidenceRefs":[evidence]})).await?;
    assert_eq!(completion["sourceQualification"], "verified-producer");
    assert_eq!(completion["conditionStatus"], "not-applicable");
    let project_view = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}"),
        json!({}),
    )
    .await?;
    let archive = native_success(&f.client, "POST", &format!("/api/projects/{project}/archive-records"), json!({"inputVersion":"server-derived-v1","expectedProjectVersion":project_view["rowVersion"],"archivedAt":chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis,true),"archiveSummary":"Archive actual completed delivery","evidenceSummary":"Native acceptance and completion records"})).await?;
    assert_eq!(archive["sourceQualification"], "verified-producer");
    assert_eq!(archive["archiveAnchorStage"], "completed");
    let current_stage: String =
        sqlx::query_scalar("SELECT current_stage FROM poms.project WHERE id=$1")
            .bind(project)
            .fetch_one(&f.pool)
            .await?;
    assert_eq!(current_stage, "completed");
    Box::pin(native_archive_mutations(&f, project, &archive)).await?;
    println!("native attachment/acceptance/completion/archive completed: {project}");
    if shared {
        Box::pin(native_followup_payouts(&f, project, calculation)).await?;
    }

    close_fixture(reviewer).await?;
    close_fixture(f).await
}

fn expected_from_source(reference: &Value) -> Value {
    if reference.is_null() {
        return Value::Null;
    }
    json!({"kind":reference["kind"],"id":reference["id"],"expectedVersion":reference["rowVersion"],"payloadHash":reference["payloadHash"]})
}
async fn native_source_expected(pool: &PgPool, kind: &str, id: Uuid) -> Result<Value> {
    let mut connection = pool.acquire().await?;
    let mut state = poms_api_rust::approval_common::CommonState::default();
    let mut session =
        poms_api_rust::approval_common::CommonSession::borrow(&mut connection, &mut state);
    let reference = poms_api_rust::project_operating::sources::source_reference_with_session(
        &mut session,
        kind,
        id,
    )
    .await
    .map_err(|error| format!("actual source reference: {error:?}"))?;
    Ok(expected_from_source(&serde_json::to_value(reference)?))
}

/// Real local object I/O through the production upload/complete/download routes.
/// This test configures an owned directory and does not impersonate S3 or write
/// a prequalified attachment/link directly into the database.
async fn native_project_evidence(
    f: &Fixture,
    project: Uuid,
    condition_context: Option<Value>,
) -> Result<Value> {
    let bytes = format!("Owned R4 native delivery evidence for {project}\n").into_bytes();
    let mut input = json!({"operationType":"create-attachment","targetType":"project","targetId":project,"originalName":"native-delivery.txt","mimeType":"application/octet-stream","sizeBytes":bytes.len(),"category":"acceptance","securityLevel":"internal","relationType":"normal","description":"Owned functional evidence"});
    if let Some(context) = condition_context {
        input["completionConditionContext"] = context;
    }
    let session =
        native_success(&f.client, "POST", "/api/attachment-upload-sessions", input).await?;
    assert_eq!(session["providerType"], "local");
    assert_eq!(session["uploadMode"], "proxy");
    let id = row_id(&session)?;
    let target = native_success(
        &f.client,
        "POST",
        &format!("/api/attachment-upload-sessions/{id}/upload-targets"),
        json!({"expectedVersion":session["rowVersion"]}),
    )
    .await?;
    let object_path = format!("/api/attachment-upload-sessions/{id}/object");
    assert!(
        target["url"] == object_path,
        "Expected the owned local proxy target"
    );
    let response = f
        .client
        .app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(&object_path)
                .header(header::CONTENT_TYPE, "application/octet-stream")
                .header(header::CONTENT_LENGTH, bytes.len())
                .header(header::COOKIE, &f.client.cookie)
                .header("x-csrf-token", &f.client.csrf)
                .body(Body::from(bytes.clone()))?,
        )
        .await?;
    let status = response.status();
    let uploaded: Value =
        serde_json::from_slice(&to_bytes(response.into_body(), 1024 * 1024).await?)?;
    assert_eq!(
        status,
        StatusCode::OK,
        "Owned local proxy upload: {uploaded}"
    );
    assert_eq!(uploaded["status"], "uploaded");
    let attachment = native_success(
        &f.client,
        "POST",
        &format!("/api/attachment-upload-sessions/{id}:complete"),
        json!({"expectedVersion":uploaded["rowVersion"]}),
    )
    .await?;
    let attachment_id = row_id(&attachment)?;
    let download = f
        .client
        .app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/attachments/{attachment_id}/download"))
                .header(header::COOKIE, &f.client.cookie)
                .body(Body::empty())?,
        )
        .await?;
    assert_eq!(download.status(), StatusCode::OK, "Owned evidence download");
    assert_eq!(
        to_bytes(download.into_body(), 1024 * 1024).await?.as_ref(),
        bytes.as_slice()
    );
    let link = attachment["links"]
        .as_array()
        .and_then(|links| {
            links.iter().find(|link| {
                link["targetType"] == "project" && link["targetId"] == project.to_string()
            })
        })
        .ok_or("actual native attachment link")?;
    let link_id = row_id(link)?;
    println!("native evidence attachment completed and downloaded: {attachment_id}");
    Ok(json!({"attachmentLinkId":link_id}))
}

async fn native_archive_mutations(f: &Fixture, project: Uuid, archive: &Value) -> Result {
    let before = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}"),
        json!({}),
    )
    .await?;
    let first_id = row_id(archive)?;
    let replacement = native_success(&f.client, "POST", &format!("/api/project-archive-records/{first_id}:replace"), json!({"inputVersion":"server-derived-v1","expectedVersion":archive["rowVersion"],"archivedAt":chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis,true),"archiveSummary":"Owned corrected archive description","evidenceSummary":"Preserve actual completion anchor","replacementReason":"Correct an owned archive description"})).await?;
    let replacement_id = row_id(&replacement)?;
    assert_ne!(first_id, replacement_id);
    assert_eq!(
        replacement["supersedesArchiveRecordId"],
        first_id.to_string()
    );
    assert_eq!(
        replacement["archiveAnchorSourceId"],
        archive["archiveAnchorSourceId"]
    );
    assert_eq!(replacement["status"], "recorded");
    let (stale, _) = f.client.call("POST", &format!("/api/project-archive-records/{first_id}:void"), json!({"inputVersion":"server-derived-v1","expectedVersion":archive["rowVersion"],"reason":"Stale original archive must remain superseded"})).await?;
    assert_eq!(stale, StatusCode::CONFLICT);
    let void_input = json!({"inputVersion":"server-derived-v1","expectedVersion":replacement["rowVersion"],"reason":"Owned fixture archive withdrawn; preserve the record"});
    let voided = native_success(
        &f.client,
        "POST",
        &format!("/api/project-archive-records/{replacement_id}:void"),
        void_input.clone(),
    )
    .await?;
    assert_eq!(voided["status"], "voided");
    let (duplicate, _) = f
        .client
        .call(
            "POST",
            &format!("/api/project-archive-records/{replacement_id}:void"),
            void_input,
        )
        .await?;
    assert_eq!(duplicate, StatusCode::CONFLICT);
    let records = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}/archive-records"),
        json!({}),
    )
    .await?;
    let records = records.as_array().ok_or("native archive list")?;
    assert_eq!(records.len(), 2);
    assert!(
        records
            .iter()
            .any(|row| row["id"] == first_id.to_string() && row["status"] == "superseded")
    );
    assert!(
        records
            .iter()
            .any(|row| row["id"] == replacement_id.to_string() && row["status"] == "voided")
    );
    let after = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}"),
        json!({}),
    )
    .await?;
    assert_eq!(after["currentStage"], before["currentStage"]);
    assert_eq!(
        after["currentStageRecordId"],
        before["currentStageRecordId"]
    );
    println!("native archive replacement and withdrawal completed: {project}");
    Ok(())
}

async fn native_conditional_completion_and_archive(
    f: &Fixture,
    project: Uuid,
    acceptance_stage: Uuid,
    evidence: Value,
) -> Result {
    let condition_actor = fixture(
        None,
        &[PermissionKey::ProjectRead, PermissionKey::ProjectWrite],
    )
    .await?;
    // An unrelated active organization grants no full project responsibility.
    let org = uuid(&f.pool).await?;
    sqlx::query("INSERT INTO poms.org_unit(id,name,code,is_active) VALUES($1,$2,$3,true)")
        .bind(org)
        .bind(format!("Owned external condition team {org}"))
        .bind(format!("r4-condition-{org}"))
        .execute(&f.pool)
        .await?;
    sqlx::query("INSERT INTO poms.user_org_membership(user_id,org_unit_id,membership_type,status) VALUES($1,$2,'primary','active')").bind(condition_actor.user).bind(org).execute(&f.pool).await?;
    sqlx::query("UPDATE poms.platform_user SET primary_org_unit_id=$1 WHERE id=$2")
        .bind(org)
        .bind(condition_actor.user)
        .execute(&f.pool)
        .await?;
    let project_view = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}"),
        json!({}),
    )
    .await?;
    let acceptance = native_success(&f.client, "POST", &format!("/api/projects/{project}/acceptance-records"), json!({"inputVersion":"server-derived-v1","expectedProjectVersion":project_view["rowVersion"],"acceptanceStageRecordId":acceptance_stage,"acceptanceType":"final-acceptance","acceptanceResult":"conditional","conditionalSummary":"Two actual responsibilities must be closed before archive","scopeSummary":"Owned conditional final acceptance","evidenceSummary":"Actual uploaded final evidence","evidenceRefs":[evidence]})).await?;
    let acceptance_id = row_id(&acceptance)?;
    let project_view = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}"),
        json!({}),
    )
    .await?;
    let due = (chrono::Utc::now() + chrono::Duration::days(1))
        .to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let completion = native_success(&f.client, "POST", &format!("/api/projects/{project}/completion-records"), json!({"inputVersion":"server-derived-v1","expectedProjectVersion":project_view["rowVersion"],"acceptanceRecordId":acceptance_id,"expectedAcceptanceVersion":acceptance["rowVersion"],"completionResult":"conditional-completed","completedAt":chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis,true),"completionSummary":"Parent completion summary must remain private","evidenceSummary":"Parent completion evidence","evidenceRefs":[evidence],"completionConditions":[{"responsibleUserId":condition_actor.user,"dueAt":due,"summary":"External condition owner's own task","evidenceRefs":[evidence]},{"responsibleUserId":f.user,"dueAt":due,"summary":"Project execution owner's separate task","evidenceRefs":[evidence]}]})).await?;
    let completion_id = row_id(&completion)?;
    assert_eq!(completion["conditionStatus"], "pending");
    let conditions = completion["conditions"]
        .as_array()
        .ok_or("native completion conditions")?;
    let own = conditions
        .iter()
        .find(|row| row["responsibleUserId"] == condition_actor.user.to_string())
        .ok_or("actual delegated condition")?;
    let own_id = row_id(own)?;
    let other = conditions
        .iter()
        .find(|row| row["responsibleUserId"] == f.user.to_string())
        .ok_or("actual owner condition")?;
    let other_id = row_id(other)?;
    let project_view = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}"),
        json!({}),
    )
    .await?;
    let archive_body = json!({"inputVersion":"server-derived-v1","expectedProjectVersion":project_view["rowVersion"],"archivedAt":chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis,true),"archiveSummary":"Must wait for both conditions","evidenceSummary":"Owned conditional completion"});
    let (pending_archive, _) = f
        .client
        .call(
            "POST",
            &format!("/api/projects/{project}/archive-records"),
            archive_body,
        )
        .await?;
    assert_eq!(pending_archive, StatusCode::CONFLICT);
    assert_eq!(
        native_success(
            &f.client,
            "GET",
            &format!("/api/projects/{project}/archive-records"),
            json!({})
        )
        .await?,
        json!([])
    );
    for suffix in ["", "/acceptance-records", "/archive-records"] {
        let (status, _) = condition_actor
            .client
            .call(
                "GET",
                &format!("/api/projects/{project}{suffix}"),
                json!({}),
            )
            .await?;
        assert_eq!(
            status,
            StatusCode::NOT_FOUND,
            "Condition owner must not acquire a full project view"
        );
    }
    let tasks = native_success(
        &condition_actor.client,
        "GET",
        &format!("/api/projects/{project}/completion-records"),
        json!({}),
    )
    .await?;
    assert_eq!(tasks["scopeKind"], "own-condition-only");
    let items = tasks["items"].as_array().ok_or("own task list")?;
    assert_eq!(items.len(), 1);
    assert!(items[0].get("acceptanceRecordId").is_none());
    assert!(items[0].get("completionSummary").is_none());
    let own_tasks = items[0]["ownTasks"].as_array().ok_or("own conditions")?;
    assert_eq!(own_tasks.len(), 1);
    assert_eq!(own_tasks[0]["conditionId"], own_id.to_string());
    let closure_path =
        format!("/api/project-completion-records/{completion_id}/conditions/{own_id}:close");
    let initial_close = json!({"inputVersion":"server-derived-v1","expectedCompletionVersion":completion["rowVersion"],"expectedConditionVersion":own["rowVersion"],"closureSummary":"Only this condition's actual owner may close it","evidenceRefs":[evidence]});
    let (substitute, _) = f.client.call("POST", &closure_path, initial_close).await?;
    assert_eq!(substitute, StatusCode::FORBIDDEN);
    let other_close = json!({"inputVersion":"server-derived-v1","expectedCompletionVersion":completion["rowVersion"],"expectedConditionVersion":other["rowVersion"],"closureSummary":"Cross-condition access must fail","evidenceRefs":[evidence]});
    let (cross, _) = condition_actor
        .client
        .call(
            "POST",
            &format!("/api/project-completion-records/{completion_id}/conditions/{other_id}:close"),
            other_close,
        )
        .await?;
    assert_eq!(cross, StatusCode::NOT_FOUND);
    let closure_evidence = Box::pin(native_project_evidence(
        &condition_actor,
        project,
        Some(json!({"completionRecordId":completion_id,"conditionId":own_id})),
    ))
    .await?;
    let close_body = json!({"inputVersion":"server-derived-v1","expectedCompletionVersion":completion["rowVersion"],"expectedConditionVersion":own["rowVersion"],"closureSummary":"Actual owner uploaded and closed the delegated condition","evidenceRefs":[closure_evidence]});
    let closed = native_success(
        &condition_actor.client,
        "POST",
        &closure_path,
        close_body.clone(),
    )
    .await?;
    assert_eq!(closed["scopeKind"], "own-condition-only");
    assert_eq!(closed["conditionStatus"], "closed");
    assert_eq!(closed["completionConditionStatus"], "pending");
    let (replay, _) = condition_actor
        .client
        .call("POST", &closure_path, close_body)
        .await?;
    assert_eq!(replay, StatusCode::CONFLICT);
    let all = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}/completion-records"),
        json!({}),
    )
    .await?;
    let refreshed = all["items"]
        .as_array()
        .and_then(|items| {
            items
                .iter()
                .find(|row| row["id"] == completion_id.to_string())
        })
        .ok_or("refreshed completion")?;
    assert_eq!(refreshed["conditionStatus"], "pending");
    let last = native_success(&f.client,"POST",&format!("/api/project-completion-records/{completion_id}/conditions/{other_id}:close"),json!({"inputVersion":"server-derived-v1","expectedCompletionVersion":refreshed["rowVersion"],"expectedConditionVersion":other["rowVersion"],"closureSummary":"Actual project owner closed the remaining condition","evidenceRefs":[evidence]})).await?;
    assert_eq!(last["completionConditionStatus"], "closed");
    let project_view = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}"),
        json!({}),
    )
    .await?;
    assert_eq!(project_view["currentStage"], "conditional-completed");
    let archive = native_success(&f.client,"POST",&format!("/api/projects/{project}/archive-records"),json!({"inputVersion":"server-derived-v1","expectedProjectVersion":project_view["rowVersion"],"archivedAt":chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis,true),"archiveSummary":"Archive after both actual owners closed their conditions","evidenceSummary":"Actual conditional completion and closures"})).await?;
    assert_eq!(archive["sourceQualification"], "verified-producer");
    assert_eq!(archive["archiveAnchorStage"], "conditional-completed");
    Box::pin(native_archive_mutations(f, project, &archive)).await?;
    println!(
        "native conditional completion, scoped owner closure and archive completed: {project}"
    );
    close_fixture(condition_actor).await
}

async fn native_late_cost_restatement_and_reviews(
    f: &Fixture,
    project: Uuid,
    contract: Uuid,
    original_snapshot: Uuid,
    execution_stage: Uuid,
) -> Result {
    let today = chrono::Utc::now()
        .with_timezone(&chrono_tz::Asia::Hong_Kong)
        .date_naive()
        .to_string();
    let expense = native_success(&f.client,"POST",&format!("/api/projects/{project}/expense-records"),json!({"contractId":contract,"expenseCategory":"travel","expenseDescription":"Actual late reported travel cost","expenseDate":today,"currency":"CNY","amountIncludingTax":"1000.00","taxAmount":"0.00","amountExcludingTax":"1000.00","sourceType":"manual","evidenceSummary":"Owned reported expense after the first operating snapshot"})).await?;
    let expense_id = row_id(&expense)?;
    native_success(
        &f.client,
        "POST",
        &format!("/api/expense-records/{expense_id}:confirm"),
        json!({"expectedVersion":expense["rowVersion"]}),
    )
    .await?;
    let expense = native_success(
        &f.client,
        "GET",
        &format!("/api/expense-records/{expense_id}"),
        json!({}),
    )
    .await?;
    let cost = native_success(&f.client,"POST",&format!("/api/projects/{project}/actual-cost-records"),json!({"costType":"expense","expenseRecordId":expense_id,"expectedSourceVersion":expense["rowVersion"],"evidenceSummary":"Actual confirmed expense"})).await?;
    let cost_id = Uuid::parse_str(cost["targetId"].as_str().ok_or("late cost target")?)?;
    let cost = native_success(
        &f.client,
        "GET",
        &format!("/api/project-actual-cost-records/{cost_id}"),
        json!({}),
    )
    .await?;
    let stage_sequence: i32 = sqlx::query_scalar(
        "SELECT sequence_no FROM poms.project_stage_record WHERE id=$1 AND project_id=$2",
    )
    .bind(execution_stage)
    .bind(project)
    .fetch_one(&f.pool)
    .await?;
    native_success(&f.client,"POST",&format!("/api/project-actual-cost-records/{cost_id}/stage-attributions"),json!({"stageAttributionMode":"auto","attributedStage":"execution","expectedVersion":cost["rowVersion"],"attributionSummary":"Actual execution date expense","attributionEvidence":{"kind":"source","sourceType":"project-stage-record","sourceId":execution_stage,"sourceVersion":stage_sequence,"businessDate":cost["occurredOn"],"reason":"The expense occurred on the actual execution entry date"}})).await?;
    let prepared = native_success(&f.client,"GET",&format!("/api/projects/{project}/unified-accounting?view=preparation&intent=restatement&restatesSnapshotId={original_snapshot}"),json!({})).await?;
    let p = &prepared["preparation"];
    let source = p["sourceRows"]
        .as_array()
        .and_then(|rows| {
            rows.iter()
                .find(|row| row["sourceRef"]["id"] == cost_id.to_string())
        })
        .ok_or("new expense cost source")?;
    let expense_ref = native_source_expected(&f.pool, "ExpenseRecord", expense_id).await?;
    let decision = json!({"target":expected_from_source(&source["sourceRef"]),"expectedVersion":0,"decision":"include","recognitionRole":"direct-source","reasonCode":"actual-expense","reasonText":"Recognize a real subsequently reported expense without rewriting the original snapshot","primaryCostRef":null,"supportingSourceRefs":[expense_ref],"evidenceRefs":[expense_ref]});
    let targets = p["proposedAffectedTargets"]
        .as_array()
        .ok_or("actual affected targets")?;
    let primary = targets
        .iter()
        .find(|target| {
            target["projectId"] == project.to_string()
                && target["restatesSnapshotRef"]["id"] == original_snapshot.to_string()
        })
        .ok_or("actual live restatement root")?;
    let others = targets
        .iter()
        .filter(|target| {
            target["projectId"] != primary["projectId"]
                || target["restatesSnapshotRef"]["id"] != primary["restatesSnapshotRef"]["id"]
        })
        .cloned()
        .collect::<Vec<_>>();
    let request = json!({"inputVersion":"server-derived-v1","projectId":project,"scope":"live","expectedVersion":p["headVersion"],"expectedProjectVersion":p["projectVersion"],"expectedInputHash":p["expectedInputHash"],"assertions":null,"periodEndSnapshotRef":null,"restatesSnapshotRef":primary["restatesSnapshotRef"],"restatementReason":"Actual late expense","restatementSummary":"Add a confirmed 1000 expense and preserve the previous snapshot","costDecisions":[decision],"laborCorrections":[],"allocationCorrections":[],"stageCorrections":[],"taxCorrections":[],"affectedTargets":others,"acknowledgedChangedSourceRefs":[]});
    let restated = native_success(
        &f.client,
        "POST",
        "/api/operating-restatements",
        request.clone(),
    )
    .await?;
    let snapshot_id = Uuid::parse_str(restated["snapshotId"].as_str().ok_or("restated snapshot")?)?;
    assert_ne!(snapshot_id, original_snapshot);
    let old: Value = sqlx::query_scalar(
        "SELECT frozen_payload FROM poms.operating_source_context WHERE snapshot_id=$1",
    )
    .bind(original_snapshot)
    .fetch_one(&f.pool)
    .await?;
    let new: Value = sqlx::query_scalar(
        "SELECT frozen_payload FROM poms.operating_source_context WHERE snapshot_id=$1",
    )
    .bind(snapshot_id)
    .fetch_one(&f.pool)
    .await?;
    assert_eq!(
        old["metrics"]["includedCostAmounts"]["net"]["value"],
        "70000.00"
    );
    assert_eq!(
        new["metrics"]["includedCostAmounts"]["net"]["value"],
        "71000.00"
    );
    assert_eq!(new["metrics"]["grossMarginNet"]["value"], "29000.00");
    let (replay_status, replayed) = f
        .client
        .call("POST", "/api/operating-restatements", request.clone())
        .await?;
    assert_eq!(replay_status, StatusCode::CREATED);
    assert_eq!(
        replayed, restated,
        "Identical committed input must replay the actual receipt"
    );
    let mut changed_request = request;
    changed_request["restatementReason"] =
        json!("A different payload must not reuse the committed request identity");
    let (changed_status, _) = f
        .client
        .call("POST", "/api/operating-restatements", changed_request)
        .await?;
    assert_eq!(changed_status, StatusCode::CONFLICT);
    let signal_id = restated["evaluationRefs"]["signalEvaluationId"]
        .as_str()
        .ok_or("restated signal")?;
    let signal = native_success(
        &f.client,
        "GET",
        &format!("/api/operating-signal-evaluations/{signal_id}"),
        json!({}),
    )
    .await?;
    let issue = signal["reasonItems"]
        .as_array()
        .and_then(|items| {
            items
                .iter()
                .find(|item| item["code"] == "qualitative-materiality-unassessed")
        })
        .ok_or("actual adverse variance qualitative issue")?;
    assert_eq!(issue["evidenceProjection"]["mode"], "full");
    let refs: Value = serde_json::from_str(
        issue["evidenceProjection"]["value"]
            .as_str()
            .ok_or("frozen issue evidence")?,
    )?;
    let evidence = refs
        .as_array()
        .and_then(|refs| refs.first())
        .ok_or("actual issue source reference")?;
    let review = json!({"inputVersion":"server-derived-v1","reviewDecision":"manual-confirmed","resolvedDataMaturityLevel":signal["dataMaturityLevel"],"costActionRecommendation":signal["costActionRecommendation"],"referencedBaselineVersion":signal["referencedBaselineVersion"],"referencedSnapshotVersion":signal["referencedSnapshotVersion"],"expectedVersion":signal["rowVersion"],"expectedSourceHash":signal["evaluationContext"]["sourceHash"],"expectedEvaluationHash":signal["evaluationContext"]["evaluationHash"],"requestKey":uuid(&f.pool).await?,"manualMaterialityReview":{"policyVersion":"r4h-operating-v1","issueCodes":[issue["code"]],"riskDecision":"attention","evidenceRefs":[evidence],"rationale":"The actual 1000 expense exceeds the original budget; retain a qualitative attention decision without altering money"}});
    let mut wrong_source = review.clone();
    wrong_source["expectedSourceHash"] = json!("0".repeat(64));
    let (wrong, _) = f
        .client
        .call(
            "POST",
            &format!("/api/operating-signal-evaluations/{signal_id}:review"),
            wrong_source,
        )
        .await?;
    assert_eq!(wrong, StatusCode::CONFLICT);
    let reviewed = native_success(
        &f.client,
        "POST",
        &format!("/api/operating-signal-evaluations/{signal_id}:review"),
        review.clone(),
    )
    .await?;
    let replayed = native_success(
        &f.client,
        "POST",
        &format!("/api/operating-signal-evaluations/{signal_id}:review"),
        review.clone(),
    )
    .await?;
    assert_eq!(reviewed, replayed);
    let mut conflicting = review;
    conflicting["manualMaterialityReview"]["rationale"] =
        json!("A different request must not reuse a committed request key");
    let (collision, _) = f
        .client
        .call(
            "POST",
            &format!("/api/operating-signal-evaluations/{signal_id}:review"),
            conflicting,
        )
        .await?;
    assert_eq!(collision, StatusCode::CONFLICT);
    let current = native_success(
        &f.client,
        "GET",
        &format!("/api/operating-signal-evaluations/{signal_id}"),
        json!({}),
    )
    .await?;
    assert_eq!(current["riskLevel"], "attention");
    let binding_id: Uuid = sqlx::query_scalar("SELECT id FROM poms.operating_signal_gate_binding WHERE project_id=$1 AND signal_evaluation_id=$2 AND gate_stage_type='first' AND status='active'").bind(project).bind(Uuid::parse_str(signal_id)?).fetch_one(&f.pool).await?;
    let gate_path = format!("/api/commission-gate-bindings/{binding_id}");
    let gate = native_success(&f.client, "GET", &gate_path, json!({})).await?;
    let blocked = gate["reasonItems"]
        .as_array()
        .ok_or("actual gate reasons")?
        .iter()
        .filter(|reason| reason["stageActions"]["first"] == "block")
        .filter_map(|reason| reason["code"].as_str())
        .collect::<std::collections::BTreeSet<_>>();
    let decision = if gate["bindingAction"] == "block" {
        "blocked"
    } else if current["riskLevel"] == "unknown"
        || current["evaluationContext"]["evaluationStatus"] != "complete"
    {
        "review-required"
    } else {
        "confirmed"
    };
    let gate_review = json!({"inputVersion":"server-derived-v1","bindingAction":gate["bindingAction"],"gateReviewDecision":decision,"baselineSelectionSource":gate["baselineSelectionSource"],"summaryPackageKey":"project-operating-commission-gate-v1","summarySnapshotId":gate["summarySnapshotId"],"referencedBaselineVersion":gate["referencedBaselineVersion"],"referencedSnapshotVersion":gate["referencedSnapshotVersion"],"expectedVersion":gate["rowVersion"],"expectedSourceHash":gate["evaluationContext"]["sourceHash"],"expectedEvaluationHash":gate["evaluationContext"]["evaluationHash"],"requestKey":uuid(&f.pool).await?,"reviewAction":"acknowledge","blockingReasonCodes":blocked});
    let acknowledged = native_success(
        &f.client,
        "POST",
        &format!("{gate_path}:review"),
        gate_review.clone(),
    )
    .await?;
    let replayed = native_success(
        &f.client,
        "POST",
        &format!("{gate_path}:review"),
        gate_review,
    )
    .await?;
    assert_eq!(acknowledged, replayed);
    let gate = native_success(&f.client, "GET", &gate_path, json!({})).await?;
    let tighten = json!({"inputVersion":"server-derived-v1","bindingAction":gate["bindingAction"],"gateReviewDecision":"blocked","baselineSelectionSource":gate["baselineSelectionSource"],"summaryPackageKey":"project-operating-commission-gate-v1","summarySnapshotId":gate["summarySnapshotId"],"referencedBaselineVersion":gate["referencedBaselineVersion"],"referencedSnapshotVersion":gate["referencedSnapshotVersion"],"expectedVersion":gate["rowVersion"],"expectedSourceHash":gate["evaluationContext"]["sourceHash"],"expectedEvaluationHash":gate["evaluationContext"]["evaluationHash"],"requestKey":uuid(&f.pool).await?,"reviewAction":"tighten-block","blockingReasonCodes":blocked});
    native_success(&f.client, "POST", &format!("{gate_path}:review"), tighten).await?;
    let final_gate = native_success(&f.client, "GET", &gate_path, json!({})).await?;
    assert_eq!(final_gate["bindingAction"], "block");
    let after: Value = sqlx::query_scalar(
        "SELECT frozen_payload FROM poms.operating_source_context WHERE snapshot_id=$1",
    )
    .bind(snapshot_id)
    .fetch_one(&f.pool)
    .await?;
    assert_eq!(
        new, after,
        "Reviews must not rewrite the immutable monetary context"
    );
    let unfinished_period = chrono::Utc::now()
        .with_timezone(&chrono_tz::Asia::Hong_Kong)
        .format("%Y-%m")
        .to_string();
    let (unfinished, _) = f.client.call("GET",&format!("/api/projects/{project}/unified-accounting?view=preparation&intent=period-close&periodKey={unfinished_period}"),json!({})).await?;
    assert_eq!(
        unfinished,
        StatusCode::BAD_REQUEST,
        "An unfinished real period must not be closed"
    );
    println!(
        "native expense/restatement/qualitative and stage reviews completed: {project}; snapshot {snapshot_id}"
    );
    Ok(())
}

async fn native_confirm_cost_stage(
    f: &Fixture,
    project: Uuid,
    cost: Uuid,
    execution: Uuid,
) -> Result<Value> {
    let detail = native_success(
        &f.client,
        "GET",
        &format!("/api/project-actual-cost-records/{cost}"),
        json!({}),
    )
    .await?;
    let sequence: i32 = sqlx::query_scalar(
        "SELECT sequence_no FROM poms.project_stage_record WHERE id=$1 AND project_id=$2",
    )
    .bind(execution)
    .bind(project)
    .fetch_one(&f.pool)
    .await?;
    native_success(&f.client,"POST",&format!("/api/project-actual-cost-records/{cost}/stage-attributions"),json!({"stageAttributionMode":"auto","attributedStage":"execution","expectedVersion":detail["rowVersion"],"attributionSummary":"Actual execution-stage source","attributionEvidence":{"kind":"source","sourceType":"project-stage-record","sourceId":execution,"sourceVersion":sequence,"businessDate":detail["occurredOn"],"reason":"Real source cost occurred on the immutable execution admission date"}})).await?;
    native_success(
        &f.client,
        "GET",
        &format!("/api/project-actual-cost-records/{cost}"),
        json!({}),
    )
    .await
}

async fn native_shared_allocation_and_restatement(
    f: &Fixture,
    project: Uuid,
    contract: Uuid,
    execution: Uuid,
) -> Result {
    let main = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}"),
        json!({}),
    )
    .await?;
    let peer = native_success(&f.client,"POST","/api/projects",json!({"projectName":format!("R4 native allocation peer {}",f.user),"customerId":main["customerId"],"initialOwnership":"creator"})).await?;
    let peer = row_id(&peer)?;
    let original_snapshot: Uuid = sqlx::query_scalar(
        "SELECT current_snapshot_id FROM poms.project_operating_head WHERE project_id=$1",
    )
    .bind(project)
    .fetch_one(&f.pool)
    .await?;
    let original: Value = sqlx::query_scalar(
        "SELECT frozen_payload FROM poms.operating_source_context WHERE snapshot_id=$1",
    )
    .bind(original_snapshot)
    .fetch_one(&f.pool)
    .await?;
    assert_eq!(
        original["metrics"]["includedCostAmounts"]["net"]["value"],
        "71000.00"
    );
    let today = chrono::Utc::now()
        .with_timezone(&chrono_tz::Asia::Hong_Kong)
        .date_naive()
        .to_string();
    let expense = native_success(&f.client,"POST",&format!("/api/projects/{project}/expense-records"),json!({"contractId":contract,"expenseCategory":"travel","expenseDescription":"Actual travel shared by two owned projects","expenseDate":today,"currency":"CNY","amountIncludingTax":"500.00","taxAmount":"0.00","amountExcludingTax":"500.00","sourceType":"manual","evidenceSummary":"Actual shared travel source, allocated by weights one and two"})).await?;
    let expense_id = row_id(&expense)?;
    native_success(
        &f.client,
        "POST",
        &format!("/api/expense-records/{expense_id}:confirm"),
        json!({"expectedVersion":expense["rowVersion"]}),
    )
    .await?;
    let expense = native_success(
        &f.client,
        "GET",
        &format!("/api/expense-records/{expense_id}"),
        json!({}),
    )
    .await?;
    let cost = native_success(&f.client,"POST",&format!("/api/projects/{project}/actual-cost-records"),json!({"costType":"expense","expenseRecordId":expense_id,"expectedSourceVersion":expense["rowVersion"],"evidenceSummary":"Confirmed shared expense, not a direct duplicate cost"})).await?;
    let cost_id = Uuid::parse_str(cost["targetId"].as_str().ok_or("shared source cost")?)?;
    let cost = Box::pin(native_confirm_cost_stage(f, project, cost_id, execution)).await?;
    let basis_request = json!({"basisType":"shared-expense","sourceCostRecordIds":[cost_id],"allocationMethod":"weight","measurementBasis":"excluding-tax","expectedSourceVersions":[{"costRecordId":cost_id,"expectedVersion":cost["rowVersion"]}],"projectShareItems":[{"projectId":project,"allocationWeight":"1","allocationSummary":"Actual source project's weighted share"},{"projectId":peer,"allocationWeight":"2","allocationSummary":"Actual peer project's weighted share"}],"basisSummary":"Real shared expense with conserved cents"});
    let basis = native_success(
        &f.client,
        "POST",
        "/api/shared-cost-allocation-bases",
        basis_request.clone(),
    )
    .await?;
    let basis_id = Uuid::parse_str(basis["basisId"].as_str().ok_or("actual allocation basis")?)?;
    let results = native_success(
        &f.client,
        "GET",
        &format!("/api/shared-cost-allocation-bases/{basis_id}/results"),
        json!({}),
    )
    .await?;
    let results = results.as_array().ok_or("actual allocation results")?;
    assert_eq!(results.len(), 2);
    let own = results
        .iter()
        .find(|row| row["projectId"] == project.to_string())
        .ok_or("own allocation share")?;
    let peer_row = results
        .iter()
        .find(|row| row["projectId"] == peer.to_string())
        .ok_or("peer allocation share")?;
    assert_eq!(own["governanceCertification"], "verified");
    let own_id = row_id(own)?;
    let peer_id = row_id(peer_row)?;
    let shares: Vec<(Uuid,String)> = sqlx::query_as("SELECT project_id,allocated_amount_excluding_tax::text FROM poms.shared_cost_allocation_result WHERE basis_id=$1 ORDER BY project_id").bind(basis_id).fetch_all(&f.pool).await?;
    assert!(shares.contains(&(project, "166.67".into())));
    assert!(shares.contains(&(peer, "333.33".into())));
    let (reserved, _) = f
        .client
        .call("POST", "/api/shared-cost-allocation-bases", basis_request)
        .await?;
    assert_eq!(
        reserved,
        StatusCode::CONFLICT,
        "A source cannot be reserved by a second live batch"
    );
    let basis_ref = native_source_expected(&f.pool, "SharedCostAllocationBasis", basis_id).await?;
    let expense_ref = native_source_expected(&f.pool, "ExpenseRecord", expense_id).await?;
    let prepared = native_success(&f.client,"GET",&format!("/api/projects/{project}/unified-accounting?view=preparation&intent=restatement&restatesSnapshotId={original_snapshot}"),json!({})).await?;
    let p = &prepared["preparation"];
    let rows = p["sourceRows"].as_array().ok_or("shared collection rows")?;
    let source = rows
        .iter()
        .find(|row| row["sourceRef"]["id"] == cost_id.to_string())
        .ok_or("shared source collection member")?;
    let share = rows
        .iter()
        .find(|row| row["sourceRef"]["id"] == own_id.to_string())
        .ok_or("own share collection member")?;
    let allocation_include = json!({"target":expected_from_source(&share["sourceRef"]),"expectedVersion":0,"decision":"include","recognitionRole":"allocation-share","reasonCode":"other-evidenced","reasonText":"Recognize only this project's actual frozen share","primaryCostRef":null,"supportingSourceRefs":[basis_ref],"evidenceRefs":[expense_ref]});
    let source_exclude = json!({"target":expected_from_source(&source["sourceRef"]),"expectedVersion":0,"decision":"exclude","recognitionRole":"direct-source","reasonCode":"shared-source-delegated","reasonText":"The real shared batch carries the source amount; do not count it a second time","primaryCostRef":null,"supportingSourceRefs":[expense_ref],"evidenceRefs":[expense_ref]});
    let targets = p["proposedAffectedTargets"]
        .as_array()
        .ok_or("actual affected allocation roots")?;
    let primary = targets
        .iter()
        .find(|target| {
            target["projectId"] == project.to_string()
                && target["restatesSnapshotRef"]["id"] == original_snapshot.to_string()
        })
        .ok_or("actual allocation restatement root")?;
    let others = targets
        .iter()
        .filter(|target| {
            target["projectId"] != primary["projectId"]
                || target["restatesSnapshotRef"]["id"] != primary["restatesSnapshotRef"]["id"]
        })
        .cloned()
        .collect::<Vec<_>>();
    let request = json!({"inputVersion":"server-derived-v1","projectId":project,"scope":"live","expectedVersion":p["headVersion"],"expectedProjectVersion":p["projectVersion"],"expectedInputHash":p["expectedInputHash"],"assertions":null,"periodEndSnapshotRef":null,"restatesSnapshotRef":primary["restatesSnapshotRef"],"restatementReason":"Consume actual shared allocation","restatementSummary":"Include 166.67 and retain the real 500 source as delegated","costDecisions":[source_exclude,allocation_include],"laborCorrections":[],"allocationCorrections":[],"stageCorrections":[],"taxCorrections":[],"affectedTargets":others,"acknowledgedChangedSourceRefs":[]});
    let mut double_count = request.clone();
    let mut direct = source_exclude.clone();
    direct["decision"] = json!("include");
    direct["reasonCode"] = json!("actual-expense");
    double_count["costDecisions"] = json!([allocation_include, direct]);
    let (duplicate, duplicate_body) = f
        .client
        .call("POST", "/api/operating-restatements", double_count)
        .await?;
    assert_eq!(duplicate, StatusCode::CONFLICT);
    assert_eq!(
        duplicate_body["code"],
        "operating_direct_shared_source_overlap"
    );
    let after_reject: (bool,i64,Uuid) = sqlx::query_as("SELECT r.is_included_in_project_cost,(SELECT count(*) FROM poms.project_cost_inclusion_decision d WHERE d.cost_record_id=$2 OR d.allocation_result_id=$1),(SELECT current_snapshot_id FROM poms.project_operating_head WHERE project_id=$3) FROM poms.shared_cost_allocation_result r WHERE r.id=$1").bind(own_id).bind(cost_id).bind(project).fetch_one(&f.pool).await?;
    assert_eq!(
        after_reject,
        (false, 0, original_snapshot),
        "Rejected direct/shared overlap must roll back earlier share consumption and decisions"
    );
    let captured =
        native_success(&f.client, "POST", "/api/operating-restatements", request).await?;
    let first_snapshot =
        Uuid::parse_str(captured["snapshotId"].as_str().ok_or("shared snapshot")?)?;
    let context: Value = sqlx::query_scalar(
        "SELECT frozen_payload FROM poms.operating_source_context WHERE snapshot_id=$1",
    )
    .bind(first_snapshot)
    .fetch_one(&f.pool)
    .await?;
    assert_eq!(
        context["metrics"]["includedCostAmounts"]["net"]["value"],
        "71166.67"
    );
    let peer_heads: i64 =
        sqlx::query_scalar("SELECT count(*) FROM poms.project_operating_head WHERE project_id=$1")
            .bind(peer)
            .fetch_one(&f.pool)
            .await?;
    assert_eq!(
        peer_heads, 0,
        "An uninitialized peer must not receive an invented operating baseline or snapshot"
    );
    let replacement = json!({"expectedVersion":2,"expectedBasisVersion":1,"replacementReason":"Actual allocation weights corrected for the entire batch","projectShareItems":[{"projectId":project,"allocationWeight":"1"},{"projectId":peer,"allocationWeight":"1"}]});
    let (guarded, guarded_body) = f
        .client
        .call(
            "POST",
            &format!("/api/shared-cost-allocation-results/{own_id}:replace"),
            replacement,
        )
        .await?;
    assert_eq!(
        guarded,
        StatusCode::CONFLICT,
        "Consumed allocation changes require an atomic restatement"
    );
    assert_eq!(guarded_body["code"], "operating_restatement_required");
    let basis_ref = native_source_expected(&f.pool, "SharedCostAllocationBasis", basis_id).await?;
    let cost_ref = native_source_expected(&f.pool, "ProjectActualCostRecord", cost_id).await?;
    let own_ref = native_source_expected(&f.pool, "SharedCostAllocationResult", own_id).await?;
    let peer_ref = native_source_expected(&f.pool, "SharedCostAllocationResult", peer_id).await?;
    let selected = serde_json::to_string(&json!([basis_ref]))?;
    let encoded: String = url::form_urlencoded::byte_serialize(selected.as_bytes()).collect();
    let prepared = native_success(&f.client,"GET",&format!("/api/projects/{project}/unified-accounting?view=preparation&intent=restatement&restatesSnapshotId={first_snapshot}&correctionSourceRefs={encoded}"),json!({})).await?;
    let p = &prepared["preparation"];
    let targets = p["proposedAffectedTargets"]
        .as_array()
        .ok_or("actual batch correction targets")?;
    let primary = targets
        .iter()
        .find(|target| {
            target["projectId"] == project.to_string()
                && target["restatesSnapshotRef"]["id"] == first_snapshot.to_string()
        })
        .ok_or("consumed allocation root")?;
    let others = targets
        .iter()
        .filter(|target| {
            target["projectId"] != primary["projectId"]
                || target["restatesSnapshotRef"]["id"] != primary["restatesSnapshotRef"]["id"]
        })
        .cloned()
        .collect::<Vec<_>>();
    let corrected = native_success(&f.client,"POST","/api/operating-restatements",json!({"inputVersion":"server-derived-v1","projectId":project,"scope":"live","expectedVersion":p["headVersion"],"expectedProjectVersion":p["projectVersion"],"expectedInputHash":p["expectedInputHash"],"assertions":null,"periodEndSnapshotRef":null,"restatesSnapshotRef":primary["restatesSnapshotRef"],"restatementReason":"Correct the complete shared allocation batch","restatementSummary":"Conserve 500 total and change both actual project shares to 250","costDecisions":[],"laborCorrections":[],"allocationCorrections":[{"basisRef":basis_ref,"sourceCostRefs":[cost_ref],"projectShareItems":[{"projectId":project,"allocationWeight":"1","expectedCurrentResultRef":own_ref,"reason":"Correct the source project's real share"},{"projectId":peer,"allocationWeight":"1","expectedCurrentResultRef":peer_ref,"reason":"Correct the peer project's real share"}],"reason":"Both real shares must change together under the source locks"}],"stageCorrections":[],"taxCorrections":[],"affectedTargets":others,"acknowledgedChangedSourceRefs":[]})).await?;
    let corrected_snapshot = Uuid::parse_str(
        corrected["snapshotId"]
            .as_str()
            .ok_or("corrected allocation snapshot")?,
    )?;
    let corrected_context: Value = sqlx::query_scalar(
        "SELECT frozen_payload FROM poms.operating_source_context WHERE snapshot_id=$1",
    )
    .bind(corrected_snapshot)
    .fetch_one(&f.pool)
    .await?;
    assert_eq!(
        corrected_context["metrics"]["includedCostAmounts"]["net"]["value"],
        "71250.00"
    );
    let old_context: Value = sqlx::query_scalar(
        "SELECT frozen_payload FROM poms.operating_source_context WHERE snapshot_id=$1",
    )
    .bind(first_snapshot)
    .fetch_one(&f.pool)
    .await?;
    assert_eq!(
        context, old_context,
        "Whole-batch correction must preserve the immutable old context"
    );
    let batch_rows: Vec<(Uuid,String,String)> = sqlx::query_as("SELECT project_id,status,allocated_amount_excluding_tax::text FROM poms.shared_cost_allocation_result WHERE supersedes_id=ANY($1) ORDER BY project_id").bind(vec![own_id,peer_id]).fetch_all(&f.pool).await?;
    assert_eq!(batch_rows.len(), 2);
    assert!(
        batch_rows
            .iter()
            .all(|(_, status, amount)| status == "active" && amount == "250.00")
    );
    let peer_heads: i64 =
        sqlx::query_scalar("SELECT count(*) FROM poms.project_operating_head WHERE project_id=$1")
            .bind(peer)
            .fetch_one(&f.pool)
            .await?;
    assert_eq!(peer_heads, 0);
    println!(
        "native shared allocation consumption and whole-batch correction completed: {project}; peer {peer}; snapshot {corrected_snapshot}"
    );
    Ok(())
}

async fn native_followup_payouts(f: &Fixture, project: Uuid, original_calculation: Uuid) -> Result {
    let snapshot: Uuid = sqlx::query_scalar(
        "SELECT current_snapshot_id FROM poms.project_operating_head WHERE project_id=$1",
    )
    .bind(project)
    .fetch_one(&f.pool)
    .await?;
    let context: Value = sqlx::query_scalar(
        "SELECT frozen_payload FROM poms.operating_source_context WHERE snapshot_id=$1",
    )
    .bind(snapshot)
    .fetch_one(&f.pool)
    .await?;
    assert_eq!(
        context["metrics"]["includedCostAmounts"]["net"]["value"],
        "71250.00"
    );
    let signal_id: Uuid = sqlx::query_scalar("SELECT signal_evaluation_id FROM poms.operating_signal_gate_binding WHERE project_id=$1 AND gate_stage_type='final' AND status='active'").bind(project).fetch_one(&f.pool).await?;
    let mut signal = native_success(
        &f.client,
        "GET",
        &format!("/api/operating-signal-evaluations/{signal_id}"),
        json!({}),
    )
    .await?;
    if let Some(issue) = signal["reasonItems"].as_array().and_then(|reasons| {
        reasons
            .iter()
            .find(|reason| reason["code"] == "qualitative-materiality-unassessed")
    }) {
        let refs: Value = serde_json::from_str(
            issue["evidenceProjection"]["value"]
                .as_str()
                .ok_or("actual qualitative source evidence")?,
        )?;
        let evidence = refs
            .as_array()
            .and_then(|refs| refs.first())
            .ok_or("actual quantitative variance evidence")?;
        native_success(&f.client,"POST",&format!("/api/operating-signal-evaluations/{signal_id}:review"),json!({"inputVersion":"server-derived-v1","reviewDecision":"manual-confirmed","resolvedDataMaturityLevel":signal["dataMaturityLevel"],"costActionRecommendation":signal["costActionRecommendation"],"referencedBaselineVersion":signal["referencedBaselineVersion"],"referencedSnapshotVersion":signal["referencedSnapshotVersion"],"expectedVersion":signal["rowVersion"],"expectedSourceHash":signal["evaluationContext"]["sourceHash"],"expectedEvaluationHash":signal["evaluationContext"]["evaluationHash"],"requestKey":uuid(&f.pool).await?,"manualMaterialityReview":{"policyVersion":"r4h-operating-v1","issueCodes":[issue["code"]],"riskDecision":"attention","evidenceRefs":[evidence],"rationale":"The actual corrected cost exceeds budget; retain attention without changing the frozen monetary facts"}})).await?;
        signal = native_success(
            &f.client,
            "GET",
            &format!("/api/operating-signal-evaluations/{signal_id}"),
            json!({}),
        )
        .await?;
    }
    let mut final_review = Value::Null;
    for stage in ["second", "final"] {
        let binding: Uuid = sqlx::query_scalar("SELECT id FROM poms.operating_signal_gate_binding WHERE project_id=$1 AND signal_evaluation_id=$2 AND gate_stage_type=$3 AND status='active'").bind(project).bind(signal_id).bind(stage).fetch_one(&f.pool).await?;
        let gate = native_success(
            &f.client,
            "GET",
            &format!("/api/commission-gate-bindings/{binding}"),
            json!({}),
        )
        .await?;
        let blocked = gate["reasonItems"]
            .as_array()
            .ok_or("actual stage reasons")?
            .iter()
            .filter(|reason| reason["stageActions"][stage] == "block")
            .filter_map(|reason| reason["code"].as_str())
            .collect::<std::collections::BTreeSet<_>>();
        let decision = if gate["bindingAction"] == "block" {
            "blocked"
        } else if signal["riskLevel"] == "unknown"
            || signal["evaluationContext"]["evaluationStatus"] != "complete"
        {
            "review-required"
        } else {
            "confirmed"
        };
        let result = native_success(&f.client,"POST",&format!("/api/commission-gate-bindings/{binding}:review"),json!({"inputVersion":"server-derived-v1","bindingAction":gate["bindingAction"],"gateReviewDecision":decision,"baselineSelectionSource":gate["baselineSelectionSource"],"summaryPackageKey":"project-operating-commission-gate-v1","summarySnapshotId":gate["summarySnapshotId"],"referencedBaselineVersion":gate["referencedBaselineVersion"],"referencedSnapshotVersion":gate["referencedSnapshotVersion"],"expectedVersion":gate["rowVersion"],"expectedSourceHash":gate["evaluationContext"]["sourceHash"],"expectedEvaluationHash":gate["evaluationContext"]["evaluationHash"],"requestKey":uuid(&f.pool).await?,"reviewAction":"acknowledge","blockingReasonCodes":blocked})).await?;
        if stage == "final" {
            final_review = result;
        }
    }
    let version: i32 = sqlx::query_scalar(
        "SELECT row_version FROM poms.commission_calculation WHERE id=$1 AND project_id=$2",
    )
    .bind(original_calculation)
    .bind(project)
    .fetch_one(&f.pool)
    .await?;
    let (unsupported, _) = f.client.call("POST",&format!("/api/commission-calculations/{original_calculation}:recalculate"),json!({"reason":"Do not recognize the full shared source a second time","expectedVersion":version,"recognizedRevenueTaxExclusive":"100000.00","recognizedCostTaxExclusive":"71500.00"})).await?;
    assert_eq!(unsupported, StatusCode::UNPROCESSABLE_ENTITY);
    let unchanged: (bool, i32) = sqlx::query_as(
        "SELECT is_current,row_version FROM poms.commission_calculation WHERE id=$1",
    )
    .bind(original_calculation)
    .fetch_one(&f.pool)
    .await?;
    assert_eq!(
        unchanged,
        (true, version),
        "Unsupported recognition must not supersede the existing calculation"
    );
    let recalculated = native_success(&f.client,"POST",&format!("/api/commission-calculations/{original_calculation}:recalculate"),json!({"reason":"Actual corrected operating cost and preserved historical payment","expectedVersion":version,"recognizedRevenueTaxExclusive":context["metrics"]["confirmedReceiptAmounts"]["net"]["value"],"recognizedCostTaxExclusive":context["metrics"]["includedCostAmounts"]["net"]["value"]})).await?;
    let calculation = row_id(&recalculated)?;
    let cost_basis: Value = sqlx::query_scalar("SELECT after_snapshot->'recognizedCostBasis' FROM poms.audit_log WHERE target_id=$1 AND event_type='CommissionController_recalculateCalculation' ORDER BY occurred_at DESC LIMIT 1").bind(calculation.to_string()).fetch_one(&f.pool).await?;
    assert_eq!(cost_basis["kind"], "operating-context");
    assert_eq!(cost_basis["snapshotId"], snapshot.to_string());
    assert_eq!(cost_basis["contextId"], context["contextId"]);
    native_success(
        &f.client,
        "POST",
        &format!("/api/commission-calculations/{calculation}:approve"),
        json!({"expectedVersion":recalculated["rowVersion"]}),
    )
    .await?;
    let finance = fixture(
        Some("finance_mgr"),
        &[PermissionKey::CommissionPayoutsManage],
    )
    .await?;
    let second = native_success(
        &f.client,
        "POST",
        &format!("/api/projects/{project}/commission-payouts"),
        json!({"calculationId":calculation,"stageType":"second","selectedTier":"basic"}),
    )
    .await?;
    assert_eq!(second["theoreticalCapAmountProjection"]["value"], "2825.00");
    let second = row_id(&second)?;
    payout_approve(
        &f.client,
        &finance.client,
        &f.pool,
        second,
        "second",
        json!({}),
        true,
    )
    .await?;
    native_success(
        &f.client,
        "POST",
        &format!("/api/commission-payouts/{second}:registerPayout"),
        json!({"payoutStage":"second","expectedVersion":3,"paidRecordAmount":"2825.00"}),
    )
    .await?;
    let final_payout = native_success(
        &f.client,
        "POST",
        &format!("/api/projects/{project}/commission-payouts"),
        json!({"calculationId":calculation,"stageType":"final","selectedTier":"basic"}),
    )
    .await?;
    assert_eq!(
        final_payout["theoreticalCapAmountProjection"]["value"],
        "1725.00"
    );
    let final_id = row_id(&final_payout)?;
    let freeze: Uuid = sqlx::query_scalar("SELECT id FROM poms.commission_role_assignment WHERE project_id=$1 AND is_current AND status='frozen'").bind(project).fetch_one(&f.pool).await?;
    payout_approve(&f.client,&finance.client,&f.pool,final_id,"final",json!({"freezeVersionId":freeze,"gateReviewRecordId":final_review["gateReviewRecordId"],"summarySnapshotId":final_review["summarySnapshotId"]}),false).await?;
    native_success(
        &f.client,
        "POST",
        &format!("/api/commission-payouts/{final_id}:registerPayout"),
        json!({"payoutStage":"final","expectedVersion":3,"paidRecordAmount":"1725.00"}),
    )
    .await?;
    let settled = native_success(
        &f.client,
        "GET",
        &format!("/api/projects/{project}/commission-final-settlement"),
        json!({}),
    )
    .await?;
    assert_eq!(settled["finalSettlementStatus"], "settled-all");
    let total: String = sqlx::query_scalar("SELECT sum(paid_record_amount)::text FROM poms.commission_payout WHERE project_id=$1 AND status='paid'").bind(project).fetch_one(&f.pool).await?;
    assert_eq!(total, "5750.00");
    let original: String = sqlx::query_scalar("SELECT paid_record_amount::text FROM poms.commission_payout WHERE project_id=$1 AND calculation_id=$2 AND stage_type='first' AND status='paid'").bind(project).bind(original_calculation).fetch_one(&f.pool).await?;
    assert_eq!(
        original, "1200.00",
        "Recalculation must preserve the original actual payment"
    );
    println!(
        "native recalculation/second/final payouts settled: {project}; total 5750.00, original first 1200.00 preserved"
    );
    close_fixture(finance).await
}
