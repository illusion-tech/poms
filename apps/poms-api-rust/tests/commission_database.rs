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
    for permission in permissions {
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
    let app = http::router_with_auth(
        AppState {
            database: database.clone(),
            started_at: Instant::now(),
        },
        &[],
        auth,
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
    let project = project_fixture(&pool, user, true).await?;
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

    let boundary_project = project_fixture(&pool, user, true).await?;
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
    let project = project_fixture(&pool, user, true).await?;
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
