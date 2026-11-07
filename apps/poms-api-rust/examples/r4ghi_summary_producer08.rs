//! Test-only trusted internal producer for the R4 isolated acceptance namespace.
//! Creates actual common definition/snapshot/projection rows. It never creates
//! a quotation approval, changes R3 decisions or pretends to store raw terms.
use std::{
    fs,
    path::{Path, PathBuf},
    process::ExitCode,
    time::Duration,
};

use poms_api_rust::{
    approval_common::{
        ApprovalCommonService, CommonSession, CommonState, js::Value, receipt::TraceContext,
        schema::Table, service::object, store,
    },
    config::Config,
    contract_support::{canonical_hash, lock_project, money, new_uuid, ratio},
    database::Database,
};
use serde::Deserialize;
use serde_json::{Value as Json, json};
use sqlx::{Connection, Row};
use uuid::Uuid;

const NAMESPACE: &str = "poms-r4ghi";
const BASE: &str = "aaa4b16ac66092f0cb1dc6646a02cf14e80823ee";
const PRIVATE_ROOT: &str = "/home/wangzishi/.local/share/poms-r4ghi/private";
const SCENARIO: &str = "pricing-margin-review";
const PROJECTION: &str = "pricing-facts";
const EXPORT: &str = "internal-only";
type Result<T> = std::result::Result<T, &'static str>;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct FieldValues {
    quote_version: String,
    quote_amount_tax_inclusive: String,
    quote_amount_tax_exclusive: String,
    tax_rate: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Request {
    run_id: Uuid,
    case_id: String,
    actor_id: Uuid,
    expected_instance_id: Uuid,
    project_id: Uuid,
    cost_package_id: Uuid,
    baseline_id: Uuid,
    field_values: FieldValues,
}

fn private_file(path: &Path) -> Result<PathBuf> {
    let metadata = fs::symlink_metadata(path).map_err(|_| "private_file_metadata")?;
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return Err("private_file_type");
    }
    let absolute = path.canonicalize().map_err(|_| "private_file_path")?;
    if !absolute.starts_with(Path::new(PRIVATE_ROOT)) {
        return Err("private_file_scope");
    }
    Ok(absolute)
}

fn text_id(id: Uuid) -> Value {
    Value::text(id.to_string())
}
fn entity_id(
    state: &CommonState,
    handle: poms_api_rust::approval_common::EntityHandle,
) -> Result<Uuid> {
    let data = store::data(state, handle).map_err(|_| "entity_read")?;
    data.get("id")
        .and_then(Value::as_text)
        .and_then(|value| Uuid::parse_str(&value.to_utf8_lossy()).ok())
        .ok_or("entity_identity")
}

async fn produce(database: &Database, input: &Request) -> Result<Json> {
    let package = format!("r4ghipf-{}-{}", input.run_id.simple(), input.case_id);
    let mut connection = database.pool().acquire().await.map_err(|_| "acquire")?;
    let mut transaction = connection.begin().await.map_err(|_| "begin")?;
    let mut state = CommonState::default();
    state.trace.context = TraceContext {
        run_id: input.run_id.to_string(),
        case_id: input.case_id.clone(),
        index: 0,
        op: "r4ghi.summary.actual-internal-producer08".into(),
    };
    state.trace.begin(true);
    let service = ApprovalCommonService::new(database.clone());
    let result: Result<Json>=async {
        let c=&mut *transaction;
        let guard=sqlx::query("SELECT current_database() AS db,current_user::text AS role,current_schema()::text AS schema,current_setting('port') AS port,current_setting('server_version_num') AS version,current_setting('poms.r0e_isolated',true) AS isolated")
            .fetch_one(&mut *c).await.map_err(|_|"database_identity_query")?;
        if guard.try_get::<String,_>("db").map_err(|_|"database_identity")?!="poms_r4ghi_rust"
            || guard.try_get::<String,_>("role").map_err(|_|"database_identity")?!="poms_r4ghi_rust_app"
            || guard.try_get::<String,_>("port").map_err(|_|"database_identity")?!="15432"
            || guard.try_get::<String,_>("version").map_err(|_|"database_identity")?!="150012"
            || guard.try_get::<Option<String>,_>("schema").map_err(|_|"database_identity")?.as_deref()!=Some("poms")
            || guard.try_get::<Option<String>,_>("isolated").map_err(|_|"database_identity")?.as_deref()!=Some("on") {return Err("database_identity_mismatch");}
        let markers=sqlx::query("SELECT instance_id,namespace,source_base FROM r4ghi_control.marker")
            .fetch_all(&mut *c).await.map_err(|_|"marker_query")?;
        if markers.len()!=1 {return Err("marker_count");}
        if markers[0].try_get::<Uuid,_>("instance_id").map_err(|_|"marker_identity")?!=input.expected_instance_id
            || markers[0].try_get::<String,_>("namespace").map_err(|_|"marker_identity")?!=NAMESPACE
            || markers[0].try_get::<String,_>("source_base").map_err(|_|"marker_identity")?!=BASE {return Err("marker_mismatch");}
        let privileged: bool=sqlx::query_scalar("SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname=current_user")
            .fetch_one(&mut *c).await.map_err(|_|"role_query")?;
        if privileged {return Err("privileged_role_forbidden");}
        let active:Option<bool>=sqlx::query_scalar("SELECT is_active FROM poms.platform_user WHERE id=$1 FOR SHARE")
            .bind(input.actor_id).fetch_optional(&mut *c).await.map_err(|_|"actor_query")?;
        if active!=Some(true) {return Err("actor_missing_or_inactive");}
        // This is the trusted internal caller identified by Root's separate real
        // HTTP login evidence. No fabricated ResolvedSession or token is built.
        lock_project(&mut *c,input.project_id).await.map_err(|_|"project_lock")?;
        let project=sqlx::query("SELECT id,customer_id,status,current_stage,row_version FROM poms.project WHERE id=$1")
            .bind(input.project_id).fetch_one(&mut *c).await.map_err(|_|"project_source")?;
        let cost=sqlx::query("SELECT id,project_id,version,row_version,currency_code FROM poms.project_technical_cost_package WHERE id=$1 AND project_id=$2 FOR SHARE")
            .bind(input.cost_package_id).bind(input.project_id).fetch_optional(&mut *c).await.map_err(|_|"cost_source")?.ok_or("cost_scope")?;
        let baseline=sqlx::query("SELECT id,project_id,baseline_code,baseline_status,currency_code,amount_tax_inclusive::text AS inclusive,amount_tax_exclusive::text AS exclusive,tax_rate::text AS tax FROM poms.commercial_release_baseline WHERE id=$1 AND project_id=$2 FOR SHARE")
            .bind(input.baseline_id).bind(input.project_id).fetch_optional(&mut *c).await.map_err(|_|"baseline_source")?.ok_or("baseline_scope")?;
        let inclusive:String=baseline.try_get("inclusive").map_err(|_|"baseline_amount")?;
        let exclusive:String=baseline.try_get("exclusive").map_err(|_|"baseline_amount")?;
        let tax:String=baseline.try_get("tax").map_err(|_|"baseline_amount")?;
        if money(&inclusive).map_err(|_|"baseline_amount")?!=money(&input.field_values.quote_amount_tax_inclusive).map_err(|_|"input_amount")?
            || money(&exclusive).map_err(|_|"baseline_amount")?!=money(&input.field_values.quote_amount_tax_exclusive).map_err(|_|"input_amount")?
            || ratio(&tax).map_err(|_|"baseline_ratio")?!=ratio(&input.field_values.tax_rate).map_err(|_|"input_ratio")? {return Err("material_values_mismatch");}
        let materials=json!({
            "project":{"id":input.project_id,"customerId":project.try_get::<Option<Uuid>,_>("customer_id").map_err(|_|"project_source")?,
                "status":project.try_get::<String,_>("status").map_err(|_|"project_source")?,"currentStage":project.try_get::<String,_>("current_stage").map_err(|_|"project_source")?,
                "rowVersion":project.try_get::<i32,_>("row_version").map_err(|_|"project_source")?},
            "cost":{"id":input.cost_package_id,"version":cost.try_get::<i32,_>("version").map_err(|_|"cost_source")?,"rowVersion":cost.try_get::<i32,_>("row_version").map_err(|_|"cost_source")?,
                "currencyCode":cost.try_get::<String,_>("currency_code").map_err(|_|"cost_source")?},
            "baseline":{"id":input.baseline_id,"baselineCode":baseline.try_get::<String,_>("baseline_code").map_err(|_|"baseline_source")?,
                "status":baseline.try_get::<String,_>("baseline_status").map_err(|_|"baseline_source")?,"currencyCode":baseline.try_get::<String,_>("currency_code").map_err(|_|"baseline_source")?,
                "amountTaxInclusive":inclusive,"amountTaxExclusive":exclusive,"taxRate":tax},
            "candidateQuoteVersion":input.field_values.quote_version
        });
        let material_hash=canonical_hash(&materials).map_err(|_|"material_hash")?;
        let business_status=materials["project"]["status"].as_str().ok_or("project_status")?.to_owned();
        let existing:i64=sqlx::query_scalar("SELECT count(*) FROM poms.approval_summary_package_definition WHERE approval_scenario_key=$1 AND summary_package_key=$2")
            .bind(SCENARIO).bind(&package).fetch_one(&mut *c).await.map_err(|_|"definition_before")?;
        let existing_snapshots:i64=sqlx::query_scalar("SELECT count(*) FROM poms.approval_summary_snapshot WHERE target_type='project' AND target_id=$1 AND approval_scenario_key=$2 AND projection_level=$3 AND status='active'")
            .bind(input.project_id).bind(SCENARIO).bind(PROJECTION).fetch_one(&mut *c).await.map_err(|_|"snapshot_before")?;
        if existing!=0 || existing_snapshots!=0 {return Err("producer_scope_already_present");}
        let definition_id=new_uuid().map_err(|_|"definition_uuid")?;
        let existing_id:i64=sqlx::query_scalar("SELECT count(*) FROM poms.approval_summary_package_definition WHERE id=$1")
            .bind(definition_id).fetch_one(&mut *c).await.map_err(|_|"definition_id_before")?;
        if existing_id!=0 {return Err("definition_identity_exists");}
        let mut session=CommonSession::borrow(c,&mut state);
        let definition=service.repository_create(session.state,Table::Definition,object([
            ("id",text_id(definition_id)),("approvalScenarioKey",Value::text(SCENARIO)),("summaryPackageKey",Value::text(package.clone())),
            ("projectionLevel",Value::text(PROJECTION)),("exportPolicy",Value::text(EXPORT)),("fieldRuleVersion",Value::text("r4ghi-fact-v1")),
            ("status",Value::text("active")),("createdBy",text_id(input.actor_id)),("updatedBy",text_id(input.actor_id)),
        ]));
        service.repository_save(&mut session,Table::Definition,&[definition]).await.map_err(|_|"definition_service_save")?;
        let fields=["projectId","technicalCostPackageId","commercialReleaseBaselineId","quoteVersion","quoteAmountTaxInclusive","quoteAmountTaxExclusive","taxRate"];
        let projections=fields.iter().enumerate().map(|(index,key)|Value::Object(object([
            ("fieldKey",Value::text(*key)),("visibilityLevel",Value::text("full")),("maskingMode",Value::text("none")),
            ("exportPolicy",Value::text(EXPORT)),("fieldOrder",Value::Number(index as f64)),
            ("channelScopeSummary",Value::text(format!("Internal factual references; materialDigest={material_hash}; not an approval"))),
        ]))).collect();
        let snapshot=service.create_summary_snapshot_with_session(&mut session,object([
            ("targetType",Value::text("project")),("targetId",text_id(input.project_id)),("approvalScenarioKey",Value::text(SCENARIO)),
            ("summaryPackageKey",Value::text(package.clone())),("projectionLevel",Value::text(PROJECTION)),("exportPolicy",Value::text(EXPORT)),
            ("businessStatusAtSnapshot",Value::text(business_status)),("createdBy",text_id(input.actor_id)),("fieldProjections",Value::Array(projections)),
        ])).await.map_err(|_|"snapshot_service_create")?;
        let snapshot_id=entity_id(session.state,snapshot)?;
        let handles=service.projections(&mut session,text_id(snapshot_id)).await.map_err(|_|"projection_readback")?;
        let projection_ids=handles.into_iter().map(|handle|entity_id(session.state,handle)).collect::<Result<Vec<_>>>()?;
        if projection_ids.len()!=fields.len() {return Err("projection_count");}
        Ok(json!({"definitionId":definition_id,"summarySnapshotId":snapshot_id,"projectionIds":projection_ids,
            "approvalScenarioKey":SCENARIO,"summaryPackageKey":package,"projectionLevel":PROJECTION,"exportPolicy":EXPORT,
            "materialReferences":{"projectId":input.project_id,"costPackageId":input.cost_package_id,"baselineId":input.baseline_id,"materialHash":material_hash},
            "beforeAbsence":{"definitionNaturalKey":true,"definitionId":true,"activeTargetScenarioProjection":true},
            "trustedInternalActorId":input.actor_id,"createsApproval":false,"rawMaterialsStoredInSummary":false,"ownershipCertified":false}))
    }.await;
    match result {
        Err(error) => {
            if transaction.rollback().await.is_err() {
                state.trace.incomplete = true;
                return Err("rollback_unknown");
            }
            state.trace.rolled_back();
            Err(error)
        }
        Ok(mut output) => {
            if transaction.commit().await.is_err() {
                state.trace.unknown_commit();
                return Err("commit_unknown_reconcile_before_retry");
            }
            state.trace.commit_succeeded();
            output["outerCommitAcknowledged"] = json!(true);
            output["createTrace"] = serde_json::to_value(state.trace.take_committed())
                .map_err(|_| "trace_encoding_after_commit")?;
            output["traceIncomplete"] = json!(state.trace.incomplete);
            Ok(output)
        }
    }
}

async fn run() -> Result<Json> {
    let arguments: Vec<_> = std::env::args_os().skip(1).collect();
    if arguments.len() != 1 {
        return Err("private_request_path_required");
    }
    let env_file = std::env::var_os("POMS_ENV_FILE").ok_or("explicit_task_env_required")?;
    private_file(Path::new(&env_file))?;
    let request_path = private_file(Path::new(&arguments[0]))?;
    let input: Request =
        serde_json::from_slice(&fs::read(request_path).map_err(|_| "request_read")?)
            .map_err(|_| "request_shape")?;
    if input.case_id.is_empty()
        || input.case_id.len() > 16
        || !input
            .case_id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
        || input.field_values.quote_version.is_empty()
        || input.field_values.quote_version.len() > 64
    {
        return Err("request_bounds");
    }
    let gate: Json = serde_json::from_slice(&fs::read("/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/docs/design/rust-r4ghi/g1-online01.json").map_err(|_| "actual_g1_read")?).map_err(|_| "actual_g1_shape")?;
    if gate["G1Certified"] != true || gate["G2Authorized"] != true || gate["counts"]["total"] != 32
    {
        return Err("actual_business_g1_required");
    }
    let config = Config::load().map_err(|_| "config")?;
    if config.environment != "test"
        || !config.database.connect
        || config.database.host != "127.0.0.1"
        || config.database.port != 25434
        || config.database.database != "poms_r4ghi_rust"
        || config.database.username != "poms_r4ghi_rust_app"
    {
        return Err("config_namespace_mismatch");
    }
    let database = Database::new(&config.database)
        .await
        .map_err(|_| "database_connect")?;
    let result = produce(&database, &input).await;
    let closed = database.close(Duration::from_secs(10)).await.is_ok();
    result.map(|mut output| {
        output["poolClosed"] = json!(closed);
        output
    })
}

#[tokio::main]
async fn main() -> ExitCode {
    match run().await {
        Ok(output) => {
            println!("{output}");
            ExitCode::SUCCESS
        }
        Err(stage) => {
            eprintln!(
                "{}",
                json!({"ok":false,"stage":stage,"productAccepted":false,"ownershipCertified":false})
            );
            ExitCode::FAILURE
        }
    }
}
