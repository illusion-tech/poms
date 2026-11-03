//! Root-run JSONL internal-service driver for the new L1 Rust database only.
//! Root performs sealed intent/ownership admission before sending a case and
//! independently validates returned committed-create receipts before adoption.
use poms_api_rust::{
    approval_common::{
        self as common, ApprovalCommonService, ApprovalDecision, CommonFailure, CommonSession,
        CommonState, DecisionContext, DomainDecisionOutcome, EntityHandle, ServiceValue, Text,
        js::{Data, Value, get},
        protocol::{self, CaseRequest, OnError, Step, StepObservation},
        receipt::{CreateReceipt, TraceContext},
        schema::Table,
        session::{ApprovalDomainHandler, DomainDecisionFuture},
    },
    config::Config,
    database::Database,
};
use serde::Serialize;
use sqlx::{Connection, PgConnection, Row};
use std::{
    collections::BTreeMap,
    io::{self, BufRead, Read, Write},
    time::Duration,
};

fn rejected(message: &str) -> CommonFailure {
    CommonFailure::unexpected(format!("Probe rejected: {message}"))
}
fn data(value: Value) -> Result<Data, CommonFailure> {
    if let Value::Object(value) = value {
        Ok(value)
    } else {
        Err(rejected("operation input is not an object"))
    }
}
fn raw_input(step: &Step) -> Result<Value, CommonFailure> {
    match &step.input {
        common::JsField::Undefined => Ok(Value::Undefined),
        common::JsField::Null => Ok(Value::Null),
        common::JsField::Value(value) => Value::parse(value.get()),
    }
}
fn resolve(
    value: Value,
    bindings: &BTreeMap<String, ServiceValue>,
    state: &CommonState,
) -> Result<Value, CommonFailure> {
    Ok(match value {
        Value::Array(values) => Value::Array(
            values
                .into_iter()
                .map(|value| resolve(value, bindings, state))
                .collect::<Result<_, _>>()?,
        ),
        Value::Object(values) if values.contains_key("$ref") => {
            let reference = get(&values, "$ref")
                .as_text()
                .ok_or_else(|| rejected("reference is not text"))?
                .to_utf8_lossy();
            let parts =
                protocol::reference_parts(&reference).map_err(|_| rejected("reference path"))?;
            let binding = bindings
                .get(&parts[0])
                .ok_or_else(|| rejected("reference is not bound"))?;
            let mut value = binding.snapshot(state)?;
            for part in &parts[1..] {
                value = match value {
                    Value::Object(data) => data
                        .get(part)
                        .cloned()
                        .ok_or_else(|| rejected("reference property absent"))?,
                    Value::Array(values) => part
                        .parse::<usize>()
                        .ok()
                        .and_then(|index| values.get(index).cloned())
                        .ok_or_else(|| rejected("reference index absent"))?,
                    _ => return Err(rejected("reference property absent")),
                };
            }
            value
        }
        Value::Object(values) if values.contains_key("$date") => {
            let text = get(&values, "$date")
                .as_text()
                .ok_or_else(|| rejected("Date marker is not text"))?
                .to_utf8_lossy();
            Value::Date(
                poms_api_rust::compat::scalars::parse_legacy_timestamp_utc(&text)
                    .ok()
                    .map(common::Timestamp::from_database),
            )
        }
        Value::Object(values) => Value::Object(
            values
                .into_iter()
                .map(|(key, value)| resolve(value, bindings, state).map(|value| (key, value)))
                .collect::<Result<_, _>>()?,
        ),
        value => value,
    })
}
fn handle(
    raw: &Value,
    key: &str,
    bindings: &BTreeMap<String, ServiceValue>,
) -> Result<EntityHandle, CommonFailure> {
    let input = if let Value::Object(value) = raw {
        value
    } else {
        return Err(rejected("entity input is not an object"));
    };
    let entity = if let Value::Object(value) = get(input, key) {
        value
    } else {
        return Err(rejected("entity must be a live binding"));
    };
    let reference = get(entity, "$ref")
        .as_text()
        .ok_or_else(|| rejected("entity must be a live binding"))?
        .to_utf8_lossy();
    if reference.contains('.') {
        return Err(rejected("entity binding cannot be a copied property"));
    }
    match bindings.get(&reference) {
        Some(ServiceValue::Entity(handle)) => Ok(*handle),
        _ => Err(rejected("entity binding is absent or not a native row")),
    }
}
fn opt_entity(value: Option<EntityHandle>) -> ServiceValue {
    value
        .map(ServiceValue::Entity)
        .unwrap_or(ServiceValue::Value(Value::Null))
}

struct UnsupportedHandler;
impl ApprovalDomainHandler for UnsupportedHandler {
    fn apply<'a>(
        &'a self,
        context: &'a DecisionContext,
        _connection: &'a mut PgConnection,
    ) -> DomainDecisionFuture<'a> {
        Box::pin(async move {
            if common::transition::original_combination_supported(
                &context.record.approval_type,
                &context.record.target_object_type,
            ) {
                return Err(rejected(
                    "supported domain is Rust-unimplemented, not originally unsupported",
                ));
            }
            Err(CommonFailure::http(
                axum::http::StatusCode::BAD_REQUEST,
                Text::from("ApprovalRecord ")
                    .concat(&context.record.id)
                    .concat(&Text::from(
                        " is not supported by the current approval slice",
                    )),
            ))
        })
    }
}
struct OwnedWitnessHandler {
    witness_id: String,
    marker: String,
    fail_after: bool,
}
impl ApprovalDomainHandler for OwnedWitnessHandler {
    fn apply<'a>(
        &'a self,
        context: &'a DecisionContext,
        connection: &'a mut PgConnection,
    ) -> DomainDecisionFuture<'a> {
        Box::pin(async move {
            let result=sqlx::query("UPDATE poms.approval_record SET decision_comment=$1 WHERE id=$2::uuid AND target_object_type='project' AND decision_comment=$3 RETURNING id")
            .bind(format!("{}:written",self.marker)).bind(&self.witness_id).bind(&self.marker).fetch_optional(connection).await?;
            if result.is_none() {
                return Err(rejected("owned callback witness identity did not match"));
            }
            if self.fail_after {
                return Err(CommonFailure::unexpected(
                    "controlled owned callback failure",
                ));
            }
            Ok(DomainDecisionOutcome {
                target_id: context.record.target_object_id.clone(),
                target_type: context.record.target_object_type.clone(),
                business_status_after: Text::from("owned-callback-applied"),
                snapshot_id: None,
            })
        })
    }
}

async fn dispatch(
    service: &ApprovalCommonService,
    session: &mut CommonSession<'_, '_>,
    step: &Step,
    raw: Value,
    bindings: &BTreeMap<String, ServiceValue>,
    run_id: &str,
) -> Result<ServiceValue, CommonFailure> {
    let input = resolve(raw.clone(), bindings, session.state)?;
    if step.op == "session.flush" {
        common::store::flush(session).await?;
        return Ok(ServiceValue::Undefined);
    }
    if step.op == "session.clear" {
        session.state.clear();
        return Ok(ServiceValue::Undefined);
    }
    let input = data(input)?;
    let value = match step.op.as_str() {
        "managed.assign" => {
            let entity = handle(&raw, "entity", bindings)?;
            let changes = data(get(&input, "changes").clone())?;
            common::store::assign(session.state, entity, changes)?;
            ServiceValue::Entity(entity)
        }
        "summary.create" => ServiceValue::Entity(
            service
                .create_summary_snapshot_with_session(session, input)
                .await?,
        ),
        "summary.definition.find" => opt_entity(
            service
                .definition(
                    session,
                    get(&input, "approvalScenarioKey").clone(),
                    get(&input, "summaryPackageKey").clone(),
                )
                .await?,
        ),
        "summary.snapshot.findById" => opt_entity(
            service
                .snapshot_by_id(session, get(&input, "id").clone())
                .await?,
        ),
        "summary.snapshot.findActiveByTarget" => {
            opt_entity(service.active_snapshot(session, &input).await?)
        }
        "summary.snapshot.findByTarget" => ServiceValue::Entities(
            service
                .snapshots_by_target(
                    session,
                    get(&input, "targetType").clone(),
                    get(&input, "targetId").clone(),
                )
                .await?,
        ),
        "summary.projection.findBySnapshot" => ServiceValue::Entities(
            service
                .projections(session, get(&input, "id").clone())
                .await?,
        ),
        "summary.definition.create" | "summary.snapshot.create" | "summary.projection.create" => {
            let table = if step.op == "summary.definition.create" {
                Table::Definition
            } else if step.op == "summary.snapshot.create" {
                Table::Snapshot
            } else {
                Table::Projection
            };
            ServiceValue::Entity(service.repository_create(session.state, table, input))
        }
        "summary.definition.save" | "summary.snapshot.save" => {
            let table = if step.op == "summary.definition.save" {
                Table::Definition
            } else {
                Table::Snapshot
            };
            let entity = handle(&raw, "entity", bindings)?;
            service.repository_save(session, table, &[entity]).await?;
            ServiceValue::Undefined
        }
        "summary.projection.saveAll" => {
            let original = data(raw)?;
            let entities = if let Value::Array(values) = get(&original, "entities") {
                values
            } else {
                return Err(rejected("saveAll entities must be an array"));
            };
            let handles = entities
                .iter()
                .map(|entity| {
                    handle(
                        &Value::Object(common::service::object([("entity", entity.clone())])),
                        "entity",
                        bindings,
                    )
                })
                .collect::<Result<Vec<_>, _>>()?;
            service
                .repository_save(session, Table::Projection, &handles)
                .await?;
            ServiceValue::Undefined
        }
        "confirmation.create" => ServiceValue::Value(
            service
                .create_confirmation_record_with_session(
                    session,
                    get(&input, "actorId").clone(),
                    data(get(&input, "input").clone())?,
                )
                .await?,
        ),
        "confirmation.confirm" => ServiceValue::Value(
            service
                .confirm_participant_with_session(
                    session,
                    get(&input, "id").clone(),
                    get(&input, "actorId").clone(),
                    if matches!(get(&input, "input"), Value::Undefined) {
                        Data::new()
                    } else {
                        data(get(&input, "input").clone())?
                    },
                )
                .await?,
        ),
        "confirmation.close" => ServiceValue::Value(
            service
                .close_confirmation_record_with_session(
                    session,
                    get(&input, "id").clone(),
                    get(&input, "actorId").clone(),
                    data(get(&input, "input").clone())?,
                )
                .await?,
        ),
        "confirmation.progress" => ServiceValue::Value(
            service
                .find_confirmation_progress_by_id(session, get(&input, "id").clone())
                .await?,
        ),
        "confirmation.latest" => ServiceValue::Value(
            service
                .find_latest_confirmation_progress_by_target(session, input)
                .await?,
        ),
        "approval.get" => opt_entity(
            service
                .approval_record(session, get(&input, "id").clone())
                .await?,
        ),
        "approval.latest" => opt_entity(service.latest_approval_record(session, &input).await?),
        "approval.openTodos" => ServiceValue::Entities(
            service
                .open_todos(session, get(&input, "actorId").clone())
                .await?,
        ),
        "approval.project" => {
            let record = common::js::decode(get(&input, "record"))?;
            let facts = if get(&input, "facts").nullish() {
                common::projection::SuppliedFacts::default()
            } else {
                common::js::decode(get(&input, "facts"))?
            };
            ServiceValue::Value(Value::parse(
                &serde_json::to_string(&common::projection::approval(&record, &facts))
                    .map_err(|_| rejected("projection serialization"))?,
            )?)
        }
        "todo.project" => {
            let todo = common::js::decode(get(&input, "todo"))?;
            let record = if get(&input, "record").nullish() {
                None
            } else {
                Some(common::js::decode(get(&input, "record"))?)
            };
            let facts = if get(&input, "facts").nullish() {
                common::projection::SuppliedFacts::default()
            } else {
                common::js::decode(get(&input, "facts"))?
            };
            ServiceValue::Value(Value::parse(
                &serde_json::to_string(&common::projection::todo(&todo, record.as_ref(), &facts))
                    .map_err(|_| rejected("projection serialization"))?,
            )?)
        }
        "approval.resolve" => {
            let callback = data(get(&input, "callback").clone())?;
            let decision = match get(&input, "decision").as_text() {
                Some(value) if value.eq_ascii("approved") => ApprovalDecision::Approved,
                Some(value) if value.eq_ascii("rejected") => ApprovalDecision::Rejected,
                _ => return Err(rejected("approval decision")),
            };
            let command = data(get(&input, "input").clone())?;
            if get(&callback, "kind") == &Value::text("unsupported") {
                ServiceValue::Value(
                    service
                        .resolve_decision_with(
                            session,
                            get(&input, "id").clone(),
                            get(&input, "actorId").clone(),
                            decision,
                            command,
                            &UnsupportedHandler,
                        )
                        .await?,
                )
            } else if get(&callback, "kind") == &Value::text("owned-witness") {
                let witness_id = get(&callback, "witnessId")
                    .as_text()
                    .ok_or_else(|| rejected("witness ID"))?
                    .to_utf8_lossy();
                if uuid::Uuid::parse_str(&witness_id).is_err() {
                    return Err(rejected("witness ID"));
                }
                let marker = get(&callback, "marker")
                    .as_text()
                    .ok_or_else(|| rejected("witness marker"))?
                    .to_utf8_lossy();
                if !marker.starts_with(&format!("r2l1:{run_id}:")) {
                    return Err(rejected("witness marker outside current run"));
                }
                let handler = OwnedWitnessHandler {
                    witness_id,
                    marker,
                    fail_after: matches!(get(&callback, "failAfterWrite"), Value::Bool(true)),
                };
                ServiceValue::Value(
                    service
                        .resolve_decision_with(
                            session,
                            get(&input, "id").clone(),
                            get(&input, "actorId").clone(),
                            decision,
                            command,
                            &handler,
                        )
                        .await?,
                )
            } else {
                return Err(rejected("mandatory explicit callback"));
            }
        }
        _ => return Err(rejected("operation must be handled by case interpreter")),
    };
    Ok(value)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StepTiming {
    index: usize,
    started_at: common::Timestamp,
    finished_at: common::Timestamp,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Report {
    version: u8,
    run_id: String,
    case_id: String,
    execution: &'static str,
    steps: Vec<StepObservation>,
    step_timings: Vec<StepTiming>,
    created: Vec<CreateReceipt>,
    receipt_incomplete: bool,
    finally_rolled_back_caller_transaction: bool,
}
struct Execution<'a> {
    request: &'a CaseRequest,
    bindings: BTreeMap<String, ServiceValue>,
    state: CommonState,
    report: Report,
    stop: bool,
}
impl Execution<'_> {
    fn start_step(&mut self, index: usize) -> common::Timestamp {
        self.state.trace.context = TraceContext {
            run_id: self.request.run_id.clone(),
            case_id: self.request.case_id.clone(),
            index,
            op: self.request.steps[index].op.clone(),
        };
        common::Timestamp::now()
    }
    fn finish_step(&mut self, index: usize, started_at: common::Timestamp) {
        self.report.step_timings.push(StepTiming {
            index,
            started_at,
            finished_at: common::Timestamp::now(),
        });
    }
    async fn step(
        &mut self,
        service: &ApprovalCommonService,
        connection: &mut PgConnection,
        index: usize,
    ) -> Result<(), CommonFailure> {
        let started_at = self.start_step(index);
        let step = &self.request.steps[index];
        let raw = raw_input(step)?;
        let result = {
            let mut session = CommonSession::borrow(connection, &mut self.state);
            dispatch(
                service,
                &mut session,
                step,
                raw,
                &self.bindings,
                &self.request.run_id,
            )
            .await
        };
        match result {
            Ok(value) => {
                let snapshot = value.snapshot(&self.state)?;
                let observation = if matches!(snapshot, Value::Undefined) {
                    StepObservation::undefined(index, &step.op)
                } else {
                    StepObservation::value(index, &step.op, &snapshot)
                        .map_err(|_| rejected("result serialization"))?
                };
                if let common::JsField::Value(binding) = &step.binding {
                    self.bindings.insert(binding.clone(), value);
                }
                self.report.steps.push(observation);
            }
            Err(error) => {
                if step.op == "managed.assign"
                    || error.message.to_utf8_lossy().starts_with("Probe rejected:")
                {
                    self.report.execution = "probe-rejected";
                    self.stop = true;
                }
                self.report
                    .steps
                    .push(StepObservation::failure(index, &step.op, error));
                if matches!(step.on_error, OnError::Stop) {
                    self.stop = true;
                }
            }
        }
        self.report
            .created
            .extend(self.state.trace.take_committed());
        self.report.receipt_incomplete |= self.state.trace.incomplete;
        self.finish_step(index, started_at);
        Ok(())
    }
    fn undefined(&mut self, index: usize) {
        self.report.steps.push(StepObservation::undefined(
            index,
            &self.request.steps[index].op,
        ));
    }
}
async fn run_case(
    service: &ApprovalCommonService,
    request: CaseRequest,
) -> Result<Report, CommonFailure> {
    let mut connection = service.database().pool().acquire().await?;
    let mut execution = Execution {
        request: &request,
        bindings: BTreeMap::new(),
        state: CommonState::default(),
        report: Report {
            version: 1,
            run_id: request.run_id.clone(),
            case_id: request.case_id.clone(),
            execution: "observed",
            steps: Vec::new(),
            step_timings: Vec::new(),
            created: Vec::new(),
            receipt_incomplete: false,
            finally_rolled_back_caller_transaction: false,
        },
        stop: false,
    };
    let mut index = 0;
    while index < request.steps.len() && !execution.stop {
        if request.steps[index].op == "tx.begin" {
            let started_at = execution.start_step(index);
            let mut transaction = Some(connection.begin().await?);
            execution.state.trace.begin(true);
            execution.undefined(index);
            execution.finish_step(index, started_at);
            index += 1;
            while index < request.steps.len() && !execution.stop {
                match request.steps[index].op.as_str() {
                    "tx.begin" => return Err(rejected("caller transaction already active")),
                    "tx.commit" => {
                        let started_at = execution.start_step(index);
                        let flush = {
                            let tx = transaction
                                .as_mut()
                                .ok_or_else(|| rejected("caller transaction absent"))?;
                            let mut session = CommonSession::borrow(tx, &mut execution.state);
                            common::store::flush(&mut session).await
                        };
                        let tx = transaction
                            .take()
                            .ok_or_else(|| rejected("caller transaction absent"))?;
                        match flush {
                            Ok(()) => match tx.commit().await {
                                Ok(()) => {
                                    execution.state.trace.commit_succeeded();
                                    execution.undefined(index);
                                }
                                Err(error) => {
                                    execution.state.trace.unknown_commit();
                                    execution.report.steps.push(StepObservation::failure(
                                        index,
                                        "tx.commit",
                                        error.into(),
                                    ));
                                    execution.stop = true;
                                }
                            },
                            Err(error) => {
                                let _ = tx.rollback().await;
                                execution.state.trace.rolled_back();
                                execution.report.steps.push(StepObservation::failure(
                                    index,
                                    "tx.commit",
                                    error,
                                ));
                                execution.stop = true;
                            }
                        }
                        execution.finish_step(index, started_at);
                        index += 1;
                        break;
                    }
                    "tx.rollback" => {
                        let started_at = execution.start_step(index);
                        transaction
                            .take()
                            .ok_or_else(|| rejected("caller transaction absent"))?
                            .rollback()
                            .await?;
                        execution.state.trace.rolled_back();
                        execution.undefined(index);
                        execution.finish_step(index, started_at);
                        index += 1;
                        break;
                    }
                    _ => {
                        let tx = transaction
                            .as_mut()
                            .ok_or_else(|| rejected("caller transaction absent"))?;
                        execution.step(service, tx, index).await?;
                        index += 1;
                    }
                }
            }
            if let Some(tx) = transaction {
                tx.rollback().await?;
                execution.state.trace.rolled_back();
                execution.report.finally_rolled_back_caller_transaction = true;
            }
            execution
                .report
                .created
                .extend(execution.state.trace.take_committed());
        } else if matches!(
            request.steps[index].op.as_str(),
            "tx.commit" | "tx.rollback"
        ) {
            return Err(rejected("caller transaction absent"));
        } else {
            execution.step(service, &mut connection, index).await?;
            index += 1;
        }
    }
    execution.report.receipt_incomplete |= execution.state.trace.incomplete;
    Ok(execution.report)
}

async fn preflight(database: &Database) -> Result<(), CommonFailure> {
    let row=sqlx::query("SELECT current_database() AS database,current_user::text AS username,session_user::text AS session_user,current_setting('server_version_num') AS version,current_setting('port') AS port,current_setting('poms.r0e_isolated',true) AS isolated,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolbypassrls,r.rolreplication,has_schema_privilege(current_user,'poms','CREATE') AS schema_create,has_schema_privilege(current_user,'r2l1_control','USAGE') AS marker_access FROM pg_roles r WHERE r.rolname=current_user")
        .fetch_one(database.pool()).await?;
    if row.try_get::<String, _>("database")? != "poms_r2l1_rust"
        || row.try_get::<String, _>("username")? != "poms_r2l1_app"
        || row.try_get::<String, _>("session_user")? != "poms_r2l1_app"
        || row.try_get::<String, _>("version")? != "150012"
        || row.try_get::<String, _>("port")? != "15432"
        || row.try_get::<Option<String>, _>("isolated")?.as_deref() != Some("on")
    {
        return Err(rejected("new L1 cluster identity"));
    }
    for key in [
        "rolsuper",
        "rolcreatedb",
        "rolcreaterole",
        "rolbypassrls",
        "rolreplication",
        "schema_create",
        "marker_access",
    ] {
        if row.try_get::<bool, _>(key)? {
            return Err(rejected("runtime role privileges"));
        }
    }
    Ok(())
}
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    if std::env::args_os().count() != 1 {
        return Err("Probe reads stdin only".into());
    }
    let env_path = std::env::var("POMS_ENV_FILE").unwrap_or_default();
    if !matches!(
        env_path.as_str(),
        "/home/wangzishi/.local/share/poms-r2l1/private/rust.env" | "/r2l1-private/rust.env"
    ) {
        return Err("Probe requires the new L1 Rust environment".into());
    }
    let config = Config::load().map_err(|_| "Probe config rejected")?;
    let db = &config.database;
    if db.host != "127.0.0.1"
        || db.port != 17432
        || db.database != "poms_r2l1_rust"
        || db.username != "poms_r2l1_app"
        || !db.connect
        || db.url.is_some()
    {
        return Err("Probe database rejected before I/O".into());
    }
    let mut service = None;
    let mut stdin = io::BufReader::new(io::stdin());
    loop {
        let mut line = Vec::new();
        let count = (&mut stdin)
            .take((protocol::MAX_LINE_BYTES + 1) as u64)
            .read_until(b'\n', &mut line)?;
        if count == 0 {
            break;
        }
        if line.len() > protocol::MAX_LINE_BYTES {
            return Err("Probe input limit".into());
        }
        let request = match std::str::from_utf8(&line)
            .ok()
            .and_then(|line| protocol::parse_case_line(line).ok())
        {
            Some(value) => value,
            None => {
                writeln!(
                    io::stdout(),
                    "{{\"execution\":\"probe-rejected\",\"reason\":\"invalid case\"}}"
                )?;
                continue;
            }
        };
        if service.is_none() {
            let database = Database::new(&config.database).await?;
            preflight(&database).await?;
            service = Some(ApprovalCommonService::new(database));
        }
        let service = service.as_ref().ok_or("Probe service unavailable")?;
        let output = match run_case(service, request).await {
            Ok(report) => serde_json::to_string(&report)?,
            Err(error) => serde_json::to_string(&error)?,
        };
        let mut stdout = io::stdout().lock();
        writeln!(stdout, "{output}")?;
        stdout.flush()?;
    }
    if let Some(service) = service {
        service.database().close(Duration::from_secs(5)).await?;
    }
    Ok(())
}
