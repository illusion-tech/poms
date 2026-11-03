//! SOURCE-only controlled example. Root may add a Cargo example target pointing
//! here after review. It calls the real ApprovalService; it adds no product API.
//! Root seals ownership/intents and independently certifies PG outer commits.
use poms_api_rust::{
    approval::ApprovalService,
    approval_common::{
        CommonFailure, CommonSession, CommonState, EntityHandle,
        js::{Data, Value, get},
        receipt::TraceContext,
        schema::Table,
        store,
    },
    config::Config,
    database::Database,
};
use serde::{Deserialize, Serialize};
use sqlx::{Connection, PgConnection, Row};
use std::{
    collections::BTreeMap,
    io::{self, Read, Write},
    time::Duration,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Request {
    run_id: uuid::Uuid,
    case_id: String,
    index: usize,
    approval_id: uuid::Uuid,
    dirty_todo_id: uuid::Uuid,
    actor_id: uuid::Uuid,
    initiator_id: uuid::Uuid,
    project_id: uuid::Uuid,
    dirty_summary: String,
    outer: Outer,
    continue_after_service_error: bool,
    marker: String,
}
#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "kebab-case")]
enum Outer {
    Commit,
    Rollback,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Observation {
    kind: &'static str,
    run_id: String,
    case_id: String,
    connection_identity: Value,
    stages: Vec<Value>,
    service_result: Option<Value>,
    inner_database_snapshot: Option<Value>,
    service_error: Option<CommonFailure>,
    outer_error: Option<CommonFailure>,
    outer_actual_action: String,
    cached_reread: Option<Value>,
    after_clear_reread: Option<Value>,
    trace_diagnostics: Vec<poms_api_rust::approval_common::receipt::CreateReceipt>,
    trace_incomplete: bool,
    ownership_admitted: bool,
    result: &'static str,
}
fn rejected(message: &str) -> CommonFailure {
    CommonFailure::unexpected(format!("Shared UoW probe rejected: {message}"))
}
fn object(values: impl IntoIterator<Item = (&'static str, Value)>) -> Value {
    Value::Object(
        values
            .into_iter()
            .map(|(key, value)| (key.into(), value))
            .collect(),
    )
}
fn typed(value: &Value) -> Value {
    let kind = match value {
        Value::Undefined => return object([("kind", Value::text("undefined"))]),
        Value::Null => "null",
        Value::Bool(_) => "boolean",
        Value::Number(_) => "number",
        Value::Text(_) => "string",
        Value::Date(_) => "date",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    };
    let value = match value {
        Value::Array(values) => Value::Array(values.iter().map(typed).collect()),
        Value::Object(values) => Value::Object(
            values
                .iter()
                .map(|(key, value)| (key.clone(), typed(value)))
                .collect(),
        ),
        _ => value.clone(),
    };
    object([("kind", Value::text(kind)), ("value", value)])
}
fn snapshot(state: &CommonState, handle: EntityHandle) -> Result<Value, CommonFailure> {
    // EM.clear detaches a binding; it does not erase the caller-held values.
    let row = state
        .entities
        .get(handle.0)
        .ok_or_else(|| rejected("binding vanished"))?;
    let properties = Value::Object(
        row.table
            .columns()
            .iter()
            .map(|column| {
                (
                    column.property.into(),
                    typed(get(&row.data, column.property)),
                )
            })
            .collect(),
    );
    let original = row
        .original
        .as_ref()
        .map(|data| {
            Value::Object(
                data.iter()
                    .map(|(key, value)| (key.clone(), typed(value)))
                    .collect(),
            )
        })
        .unwrap_or(Value::Null);
    Ok(object([
        ("table", Value::text(row.table.name())),
        ("id", get(&row.data, "id").clone()),
        ("managed", Value::Bool(row.managed)),
        ("queued", Value::Bool(row.queued)),
        ("properties", properties),
        ("original", original),
        (
            "originalOwnKeys",
            Value::Array(
                row.original
                    .as_ref()
                    .map(|data| data.keys().map(|key| Value::text(key.as_str())).collect())
                    .unwrap_or_default(),
            ),
        ),
    ]))
}
#[derive(Clone, Copy)]
struct Held {
    approval: EntityHandle,
    todo_a: EntityHandle,
    todo_b: EntityHandle,
    payout: EntityHandle,
    returned_snapshot: Option<EntityHandle>,
}
fn held(state: &CommonState, handles: Held) -> Result<Value, CommonFailure> {
    Ok(object([
        ("approval", snapshot(state, handles.approval)?),
        ("todoA", snapshot(state, handles.todo_a)?),
        ("todoB", snapshot(state, handles.todo_b)?),
        ("payout", snapshot(state, handles.payout)?),
        (
            "returnedSnapshot",
            handles
                .returned_snapshot
                .map(|handle| snapshot(state, handle))
                .transpose()?
                .unwrap_or(Value::Null),
        ),
    ]))
}
fn stage(
    observation: &mut Observation,
    state: &CommonState,
    handles: Held,
    name: &str,
) -> Result<(), CommonFailure> {
    let managed = state
        .entities
        .iter()
        .enumerate()
        .filter(|(_, row)| row.managed)
        .map(|(index, _)| snapshot(state, EntityHandle(index)))
        .collect::<Result<Vec<_>, _>>()?;
    let entry = object([
        ("name", Value::text(name)),
        (
            "at",
            Value::Date(Some(poms_api_rust::approval_common::Timestamp::now())),
        ),
        ("managed", Value::Array(managed)),
        ("held", held(state, handles)?),
    ]);
    observation.stages.push(entry.clone());
    // Root retains this JSONL stdout in its current private bounded-owner log.
    // Preserve completed stages even if a later DB/closeout step fails.
    let line = object([
        ("kind", Value::text("private-uow-stage")),
        ("caseId", Value::text(observation.case_id.as_str())),
        ("stage", entry),
    ]);
    let mut stdout = io::stdout().lock();
    writeln!(stdout, "{}", line.json()).map_err(|_| rejected("private stage stdout"))?;
    stdout
        .flush()
        .map_err(|_| rejected("private stage stdout flush"))?;
    Ok(())
}
async fn one(
    connection: &mut PgConnection,
    state: &mut CommonState,
    table: Table,
    id: Value,
) -> Result<EntityHandle, CommonFailure> {
    store::find(
        &mut CommonSession::borrow(connection, state),
        table,
        &[("id", vec![id])],
        &[],
        true,
    )
    .await?
    .first()
    .copied()
    .ok_or_else(|| rejected("owned requested entity is absent"))
}
async fn optional_snapshot(
    connection: &mut PgConnection,
    state: &mut CommonState,
    id: Value,
) -> Result<Value, CommonFailure> {
    let handle = store::find(
        &mut CommonSession::borrow(connection, state),
        Table::FinalSettlement,
        &[("id", vec![id])],
        &[],
        true,
    )
    .await?
    .first()
    .copied();
    handle
        .map(|handle| snapshot(state, handle))
        .transpose()
        .map(|value| value.unwrap_or(Value::Null))
}
async fn preflight(database: &Database, input: &Request) -> Result<(), CommonFailure> {
    if input.marker != "04aadee8-4ec6-4a3b-9d27-ee8d51721029"
        || input.case_id.is_empty()
        || input.case_id.len() > 80
        || !input.case_id.as_bytes()[0].is_ascii_lowercase()
        || input.index > 200000
        || !input.case_id.bytes().all(|value| {
            value.is_ascii_lowercase() || value.is_ascii_digit() || b"_.-".contains(&value)
        })
        || input.dirty_summary.encode_utf16().count() > 500
    {
        return Err(rejected("case envelope"));
    }
    let row = sqlx::query("select current_database() as database,current_user::text as username,session_user::text as session_user,current_setting('server_version_num') as version,current_setting('port') as port,current_setting('poms.r0e_isolated',true) as isolated,pg_get_userbyid(d.datdba) as database_owner,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolbypassrls,r.rolreplication,(select count(*)::int from pg_auth_members m where m.member=r.oid) as memberships,has_schema_privilege(current_user,'poms','CREATE') as schema_create,has_schema_privilege(current_user,'public','CREATE') as public_create,has_database_privilege(current_user,current_database(),'CREATE') as database_create,has_schema_privilege(current_user,'r2l_control','USAGE') as marker_access from pg_roles r join pg_database d on d.datname=current_database() where r.rolname=current_user")
        .fetch_one(database.pool()).await?;
    for (field, expected) in [
        ("database", "poms_r2l_rust"),
        ("username", "poms_r2l_app"),
        ("session_user", "poms_r2l_app"),
        ("version", "150012"),
        ("port", "15432"),
        ("database_owner", "poms_r0e_owner"),
    ] {
        if row.try_get::<String, _>(field)? != expected {
            return Err(rejected("cluster identity"));
        }
    }
    if row.try_get::<Option<String>, _>("isolated")?.as_deref() != Some("on")
        || row.try_get::<i32, _>("memberships")? != 0
    {
        return Err(rejected("cluster isolation"));
    }
    for field in [
        "rolsuper",
        "rolcreatedb",
        "rolcreaterole",
        "rolbypassrls",
        "rolreplication",
        "schema_create",
        "public_create",
        "database_create",
        "marker_access",
    ] {
        if row.try_get::<bool, _>(field)? {
            return Err(rejected("runtime role privilege"));
        }
    }
    // Root independently verifies the owner-only marker. The app role cannot
    // read it, so this probe does not pretend to have directly read that row.
    let project = sqlx::query(
        "select project_no,created_by::text as created_by from poms.project where id=$1",
    )
    .bind(input.project_id)
    .fetch_one(database.pool())
    .await?;
    let expected_initiator = input.initiator_id.to_string();
    if !project
        .try_get::<String, _>("project_no")?
        .contains(&input.run_id.to_string())
        || project
            .try_get::<Option<String>, _>("created_by")?
            .as_deref()
            != Some(expected_initiator.as_str())
    {
        return Err(rejected("Root sealed fresh project identity"));
    }
    Ok(())
}
async fn run(database: &Database, input: &Request) -> Result<Observation, CommonFailure> {
    let service = ApprovalService::new(database.clone());
    let mut connection = database.pool().acquire().await?;
    // This is validation-code instrumentation on the very same connection
    // later lent to ApprovalService, never a product debug endpoint or a PID
    // inferred from a NAT/client-port match.
    let pid = sqlx::query("select pg_backend_pid() as pid,backend_start::text as backend_start from pg_stat_activity where pid=pg_backend_pid()")
        .fetch_one(&mut *connection).await?;
    let connection_identity = object([
        (
            "kind",
            Value::text("controlled-example-actual-same-borrowed-connection-PG-identity"),
        ),
        (
            "backendPid",
            Value::Number(f64::from(pid.try_get::<i32, _>("pid")?)),
        ),
        (
            "backendStart",
            Value::text(pid.try_get::<String, _>("backend_start")?),
        ),
    ]);
    {
        let line = object([
            ("kind", Value::text("private-uow-connection")),
            ("runId", Value::text(input.run_id.to_string())),
            ("caseId", Value::text(input.case_id.as_str())),
            ("connection", connection_identity.clone()),
        ]);
        let mut stdout = io::stdout().lock();
        writeln!(stdout, "{}", line.json()).map_err(|_| rejected("private connection stdout"))?;
        stdout
            .flush()
            .map_err(|_| rejected("private connection stdout flush"))?;
    }
    let mut state = CommonState::default();
    state.trace.context = TraceContext {
        run_id: input.run_id.to_string(),
        case_id: input.case_id.clone(),
        index: input.index,
        op: "l.internal-uow".into(),
    };
    let mut observation = Observation {
        kind: "private-actual-Rust-caller-owned-positive-L-UoW",
        run_id: input.run_id.to_string(),
        case_id: input.case_id.clone(),
        connection_identity,
        stages: Vec::new(),
        service_result: None,
        inner_database_snapshot: None,
        service_error: None,
        outer_error: None,
        outer_actual_action: String::new(),
        cached_reread: None,
        after_clear_reread: None,
        trace_diagnostics: Vec::new(),
        trace_incomplete: false,
        ownership_admitted: false,
        result: "pending",
    };
    let mut tx = connection.begin().await?;
    state.trace.begin(true);
    let approval = one(
        &mut tx,
        &mut state,
        Table::Approval,
        Value::text(input.approval_id.to_string()),
    )
    .await?;
    let record = store::data(&state, approval)?;
    if get(&record, "currentStatus") != &Value::text("pending")
        || get(&record, "currentApproverUserId") != &Value::text(input.actor_id.to_string())
        || get(&record, "projectId") != &Value::text(input.project_id.to_string())
        || get(&record, "targetObjectType") != &Value::text("commission-payout")
    {
        return Err(rejected("actual pending approval scope"));
    }
    let payout = one(
        &mut tx,
        &mut state,
        Table::Payout,
        get(&record, "targetObjectId").clone(),
    )
    .await?;
    let payout_row = store::data(&state, payout)?;
    if ![Value::text("final"), Value::text("retention")].contains(get(&payout_row, "stageType")) {
        return Err(rejected("snapshot-writing payout stage"));
    }
    let todo_a = store::find(
        &mut CommonSession::borrow(&mut tx, &mut state),
        Table::Todo,
        &[
            ("sourceType", vec![Value::text("approval-record")]),
            ("sourceId", vec![Value::text(input.approval_id.to_string())]),
            (
                "assigneeUserId",
                vec![Value::text(input.actor_id.to_string())],
            ),
            (
                "status",
                vec![Value::text("open"), Value::text("processing")],
            ),
        ],
        &[],
        true,
    )
    .await?
    .first()
    .copied()
    .ok_or_else(|| rejected("actual open approval Todo"))?;
    let todo_b = one(
        &mut tx,
        &mut state,
        Table::Todo,
        Value::text(input.dirty_todo_id.to_string()),
    )
    .await?;
    if todo_a == todo_b
        || get(&store::data(&state, todo_b)?, "projectId")
            != &Value::text(input.project_id.to_string())
    {
        return Err(rejected("second owned Todo scope"));
    }
    let mut handles = Held {
        approval,
        todo_a,
        todo_b,
        payout,
        returned_snapshot: None,
    };
    stage(&mut observation, &state, handles, "parent-loaded")?;
    store::assign(
        &mut state,
        todo_b,
        BTreeMap::from([("summary".into(), Value::text(input.dirty_summary.as_str()))]),
    )?;
    stage(
        &mut observation,
        &state,
        handles,
        "parent-second-Todo-dirty",
    )?;
    let command: Data = BTreeMap::from([
        ("expectedVersion".into(), get(&record, "rowVersion").clone()),
        (
            "comment".into(),
            Value::text("L caller-owned same-metadata UoW"),
        ),
    ]);
    let mut returned_snapshot_id = None;
    match service
        .approve_with_session(
            &mut CommonSession::borrow(&mut tx, &mut state),
            Value::text(input.approval_id.to_string()),
            Value::text(input.actor_id.to_string()),
            command,
        )
        .await
    {
        Ok(result) => {
            if let Value::Object(data) = &result {
                let id = get(data, "snapshotId");
                if !id.nullish() {
                    returned_snapshot_id = Some(id.clone());
                }
            }
            observation.service_result = Some(typed(&result));
        }
        Err(error) => observation.service_error = Some(error),
    }
    stage(
        &mut observation,
        &state,
        handles,
        "after-original-service-child",
    )?;
    if let Some(id) = &returned_snapshot_id {
        // Validation-only read of the actually materialized row on the same
        // outer transaction. It is not an independent ownership certificate.
        let materialized = sqlx::query("select to_jsonb(t)::text as row_json,t.xmin::text as source_xmin,pg_current_xact_id()::text as outer_xid8 from poms.commission_final_settlement_snapshot t where id=$1::uuid")
            .bind(id.js_text().to_utf8_lossy()).fetch_one(&mut *tx).await?;
        observation.inner_database_snapshot = Some(object([
            (
                "kind",
                Value::text("same-caller-outer-transaction-materialized-snapshot-read"),
            ),
            ("snapshotId", id.clone()),
            (
                "rowJson",
                Value::text(materialized.try_get::<String, _>("row_json")?),
            ),
            (
                "sourceXmin",
                Value::text(materialized.try_get::<String, _>("source_xmin")?),
            ),
            (
                "outerXid8",
                Value::text(materialized.try_get::<String, _>("outer_xid8")?),
            ),
            ("outerCommitObserved", Value::Bool(false)),
        ]));
    }
    if observation.service_error.is_some() && !input.continue_after_service_error {
        tx.rollback().await?;
        state.trace.rolled_back();
        observation.outer_actual_action = "rollback-after-service-error".into();
    } else if matches!(input.outer, Outer::Commit) {
        match store::flush(&mut CommonSession::borrow(&mut tx, &mut state)).await {
            Ok(()) => match tx.commit().await {
                Ok(()) => {
                    state.trace.commit_succeeded();
                    observation.outer_actual_action = "commit".into();
                }
                Err(error) => {
                    state.trace.unknown_commit();
                    observation.outer_error = Some(error.into());
                    observation.outer_actual_action = "commit-outcome-unknown".into();
                }
            },
            Err(error) => {
                tx.rollback().await?;
                state.trace.rolled_back();
                observation.outer_error = Some(error);
                observation.outer_actual_action = "rollback-after-flush-error".into();
            }
        }
    } else {
        tx.rollback().await?;
        state.trace.rolled_back();
        observation.outer_actual_action = "rollback".into();
    }
    stage(
        &mut observation,
        &state,
        handles,
        "after-outer-action-held-bindings",
    )?;
    let cached_approval = one(
        &mut connection,
        &mut state,
        Table::Approval,
        Value::text(input.approval_id.to_string()),
    )
    .await?;
    let cached_todo = one(
        &mut connection,
        &mut state,
        Table::Todo,
        Value::text(input.dirty_todo_id.to_string()),
    )
    .await?;
    let mut cached = BTreeMap::from([
        ("approval".into(), snapshot(&state, cached_approval)?),
        ("todoB".into(), snapshot(&state, cached_todo)?),
    ]);
    if let Some(id) = &returned_snapshot_id {
        handles.returned_snapshot = store::find(
            &mut CommonSession::borrow(&mut connection, &mut state),
            Table::FinalSettlement,
            &[("id", vec![id.clone()])],
            &[],
            true,
        )
        .await?
        .first()
        .copied();
        cached.insert(
            "returnedSnapshot".into(),
            handles
                .returned_snapshot
                .map(|handle| snapshot(&state, handle))
                .transpose()?
                .unwrap_or(Value::Null),
        );
    }
    observation.cached_reread = Some(Value::Object(cached));
    stage(&mut observation, &state, handles, "after-cached-reread")?;
    state.clear();
    let fresh_approval = one(
        &mut connection,
        &mut state,
        Table::Approval,
        Value::text(input.approval_id.to_string()),
    )
    .await?;
    let fresh_todo = one(
        &mut connection,
        &mut state,
        Table::Todo,
        Value::text(input.dirty_todo_id.to_string()),
    )
    .await?;
    let mut fresh = BTreeMap::from([
        ("approval".into(), snapshot(&state, fresh_approval)?),
        ("todoB".into(), snapshot(&state, fresh_todo)?),
    ]);
    if let Some(id) = &returned_snapshot_id {
        fresh.insert(
            "returnedSnapshot".into(),
            optional_snapshot(&mut connection, &mut state, id.clone()).await?,
        );
    }
    observation.after_clear_reread = Some(Value::Object(fresh));
    stage(
        &mut observation,
        &state,
        handles,
        "after-clear-reread-with-held-bindings",
    )?;
    observation.trace_diagnostics = state.trace.take_committed();
    observation.trace_incomplete = state.trace.incomplete;
    observation.result = if observation.outer_error.is_some() {
        "partial"
    } else {
        "observed"
    };
    Ok(observation)
}
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    if std::env::args_os().count() != 1
        || std::env::var("POMS_ENV_FILE").unwrap_or_default()
            != "/home/wangzishi/.local/share/poms-r2l/private/rust.env"
    {
        return Err("Probe requires stdin only and the new L Rust private environment".into());
    }
    let mut bytes = Vec::new();
    io::stdin().take(32769).read_to_end(&mut bytes)?;
    if bytes.is_empty() || bytes.len() > 32768 {
        return Err("Probe input limit".into());
    }
    let request: Request = serde_json::from_slice(&bytes)?;
    let config = Config::load().map_err(|_| "Probe config rejected")?;
    let config_db = &config.database;
    if !config_db.connect
        || config_db.host != "127.0.0.1"
        || config_db.port != 19432
        || config_db.database != "poms_r2l_rust"
        || config_db.username != "poms_r2l_app"
        || config_db.url.is_some()
    {
        return Err("Probe database rejected before I/O".into());
    }
    let database = Database::new(config_db).await?;
    let outcome = async {
        preflight(&database, &request).await?;
        run(&database, &request).await
    }
    .await;
    let close = database.close(Duration::from_secs(5)).await;
    let mut stdout = io::stdout().lock();
    match outcome {
        Ok(observation) => writeln!(stdout, "{}", serde_json::to_string(&observation)?)?,
        Err(error) => writeln!(stdout, "{}", serde_json::to_string(&error)?)?,
    }
    stdout.flush()?;
    close?;
    Ok(())
}
