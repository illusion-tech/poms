use super::{
    CommonFailure, CommonSession, CommonState, Text,
    js::{Data, Value, decode, get},
    model::{ApprovalDecision, DecisionContext, Timestamp},
    schema::Table,
    session::{ApprovalDomainHandler, EntityHandle},
    store,
};
use crate::database::Database;
use axum::http::StatusCode;
use sqlx::Connection;

#[derive(Clone)]
pub struct ApprovalCommonService {
    database: Database,
}
pub type ApprovalSummaryService = ApprovalCommonService;
pub type ConfirmationService = ApprovalCommonService;
#[derive(Clone, Debug)]
pub enum ServiceValue {
    Undefined,
    Value(Value),
    Entity(EntityHandle),
    Entities(Vec<EntityHandle>),
}
impl ServiceValue {
    pub fn snapshot(&self, state: &CommonState) -> Result<Value, CommonFailure> {
        Ok(match self {
            Self::Undefined => Value::Undefined,
            Self::Value(value) => value.clone(),
            Self::Entity(handle) => Value::Object(store::binding_data(state, *handle)?),
            Self::Entities(handles) => Value::Array(
                handles
                    .iter()
                    .map(|handle| store::binding_data(state, *handle).map(Value::Object))
                    .collect::<Result<_, _>>()?,
            ),
        })
    }
}
pub fn object(values: impl IntoIterator<Item = (&'static str, Value)>) -> Data {
    values
        .into_iter()
        .map(|(key, value)| (key.into(), value))
        .collect()
}
fn text_message(parts: &[Value]) -> Text {
    Text::from_code_units(
        parts
            .iter()
            .flat_map(|value| value.js_text().as_code_units().to_vec())
            .collect(),
    )
}
fn http(status: StatusCode, parts: &[Value]) -> CommonFailure {
    CommonFailure::http(status, text_message(parts))
}
fn nullish(value: &Value, default: Value) -> Value {
    if value.nullish() {
        default
    } else {
        value.clone()
    }
}
fn required_object(value: &Value) -> Result<&Data, CommonFailure> {
    if let Value::Object(value) = value {
        Ok(value)
    } else {
        Err(CommonFailure::unexpected("Invalid internal service input"))
    }
}
fn expected(actual: &Value, expected: &Value, resource: &str) -> Result<(), CommonFailure> {
    if matches!(expected, Value::Undefined)
        || matches!((actual,expected),(Value::Number(a),Value::Number(b)) if a==b)
    {
        return Ok(());
    }
    Err(http(
        StatusCode::CONFLICT,
        &[
            Value::text(resource),
            Value::text(" version "),
            expected.clone(),
            Value::text(" does not match current version "),
            actual.clone(),
        ],
    ))
}
fn random_uuid() -> Result<Text, CommonFailure> {
    let mut bytes = [0u8; 16];
    getrandom::fill(&mut bytes).map_err(|_| CommonFailure::unexpected("UUID generation failed"))?;
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    Ok(Text::from(uuid::Uuid::from_bytes(bytes).to_string()))
}
fn result(record: &Data, todos: Vec<Value>, confirmation: bool) -> Value {
    Value::Object(object([
        (
            "targetId",
            get(
                record,
                if confirmation {
                    "targetId"
                } else {
                    "targetObjectId"
                },
            )
            .clone(),
        ),
        (
            "targetType",
            get(
                record,
                if confirmation {
                    "targetType"
                } else {
                    "targetObjectType"
                },
            )
            .clone(),
        ),
        (
            "resultStatus",
            get(
                record,
                if confirmation {
                    "status"
                } else {
                    "currentStatus"
                },
            )
            .clone(),
        ),
        (
            "businessStatusAfter",
            get(
                record,
                if confirmation {
                    "status"
                } else {
                    "currentStatus"
                },
            )
            .clone(),
        ),
        (
            "approvalRecordId",
            if confirmation {
                Value::Null
            } else {
                get(record, "id").clone()
            },
        ),
        (
            "confirmationRecordId",
            if confirmation {
                get(record, "id").clone()
            } else {
                Value::Null
            },
        ),
        ("todoItemIds", Value::Array(todos)),
        ("snapshotId", Value::Null),
    ]))
}
impl ApprovalCommonService {
    pub fn new(database: Database) -> Self {
        Self { database }
    }
    pub fn database(&self) -> &Database {
        &self.database
    }
    pub fn repository_create(
        &self,
        state: &mut CommonState,
        table: Table,
        input: Data,
    ) -> EntityHandle {
        store::create(state, table, input)
    }
    pub async fn repository_save(
        &self,
        session: &mut CommonSession<'_, '_>,
        table: Table,
        handles: &[EntityHandle],
    ) -> Result<(), CommonFailure> {
        if handles.is_empty() {
            return Ok(());
        }
        for handle in handles {
            if store::entity(session.state, *handle)?.table != table {
                return Err(CommonFailure::unexpected(
                    "Internal repository entity mismatch",
                ));
            }
            store::persist(session.state, *handle)?;
        }
        store::flush(session).await
    }
    pub async fn definition(
        &self,
        session: &mut CommonSession<'_, '_>,
        scenario: Value,
        package: Value,
    ) -> Result<Option<EntityHandle>, CommonFailure> {
        Ok(store::find(
            session,
            Table::Definition,
            &[
                ("approvalScenarioKey", vec![scenario]),
                ("summaryPackageKey", vec![package]),
                ("status", vec![Value::text("active")]),
            ],
            &[],
            true,
        )
        .await?
        .first()
        .copied())
    }
    pub async fn snapshot_by_id(
        &self,
        session: &mut CommonSession<'_, '_>,
        id: Value,
    ) -> Result<Option<EntityHandle>, CommonFailure> {
        Ok(
            store::find(session, Table::Snapshot, &[("id", vec![id])], &[], true)
                .await?
                .first()
                .copied(),
        )
    }
    pub async fn snapshots_by_target(
        &self,
        session: &mut CommonSession<'_, '_>,
        target_type: Value,
        target_id: Value,
    ) -> Result<Vec<EntityHandle>, CommonFailure> {
        store::find(
            session,
            Table::Snapshot,
            &[
                ("targetType", vec![target_type]),
                ("targetId", vec![target_id]),
            ],
            &[("generatedAt", true), ("createdAt", true)],
            false,
        )
        .await
    }
    pub async fn active_snapshot(
        &self,
        session: &mut CommonSession<'_, '_>,
        input: &Data,
    ) -> Result<Option<EntityHandle>, CommonFailure> {
        let filters = [
            ("targetType", vec![get(input, "targetType").clone()]),
            ("targetId", vec![get(input, "targetId").clone()]),
            (
                "approvalScenarioKey",
                vec![get(input, "approvalScenarioKey").clone()],
            ),
            (
                "projectionLevel",
                vec![get(input, "projectionLevel").clone()],
            ),
            ("status", vec![Value::text("active")]),
        ];
        Ok(store::find(
            session,
            Table::Snapshot,
            &filters,
            &[("generatedAt", true), ("createdAt", true)],
            true,
        )
        .await?
        .first()
        .copied())
    }
    pub async fn projections(
        &self,
        session: &mut CommonSession<'_, '_>,
        id: Value,
    ) -> Result<Vec<EntityHandle>, CommonFailure> {
        store::find(
            session,
            Table::Projection,
            &[("summarySnapshotId", vec![id])],
            &[("fieldOrder", false), ("createdAt", false)],
            false,
        )
        .await
    }
    pub async fn create_summary_snapshot_with_session(
        &self,
        session: &mut CommonSession<'_, '_>,
        input: Data,
    ) -> Result<EntityHandle, CommonFailure> {
        let fields = if let Value::Array(fields) = get(&input, "fieldProjections") {
            fields
        } else {
            return Err(CommonFailure::unexpected(
                "Invalid internal field projections",
            ));
        };
        if fields.is_empty() {
            return Err(CommonFailure::http(
                StatusCode::BAD_REQUEST,
                "approval summary snapshot requires at least one field projection",
            ));
        }
        let definition = self
            .definition(
                session,
                get(&input, "approvalScenarioKey").clone(),
                get(&input, "summaryPackageKey").clone(),
            )
            .await?
            .ok_or_else(|| {
                CommonFailure::http(
                    StatusCode::NOT_FOUND,
                    "active approval summary package definition not found",
                )
            })?;
        let definition = store::data(session.state, definition)?;
        if get(&definition, "projectionLevel") != get(&input, "projectionLevel")
            || get(&definition, "exportPolicy") != get(&input, "exportPolicy")
        {
            return Err(CommonFailure::http(
                StatusCode::BAD_REQUEST,
                "approval summary projection metadata does not match package definition",
            ));
        }
        let created_by = nullish(get(&input, "createdBy"), Value::Null);
        let snapshot = store::create(
            session.state,
            Table::Snapshot,
            object([
                ("targetType", get(&input, "targetType").clone()),
                ("targetId", get(&input, "targetId").clone()),
                (
                    "approvalScenarioKey",
                    get(&input, "approvalScenarioKey").clone(),
                ),
                ("summaryPackageId", get(&definition, "id").clone()),
                (
                    "summaryPackageKey",
                    get(&definition, "summaryPackageKey").clone(),
                ),
                (
                    "projectionLevel",
                    get(&definition, "projectionLevel").clone(),
                ),
                ("exportPolicy", get(&definition, "exportPolicy").clone()),
                (
                    "businessStatusAtSnapshot",
                    get(&input, "businessStatusAtSnapshot").clone(),
                ),
                (
                    "supersedesId",
                    nullish(get(&input, "supersedesId"), Value::Null),
                ),
                ("createdBy", created_by.clone()),
                ("updatedBy", created_by.clone()),
            ]),
        );
        store::flush(session).await?;
        let snapshot_id = get(&store::data(session.state, snapshot)?, "id").clone();
        for (index, field) in fields.iter().enumerate() {
            let field = required_object(field)?;
            store::create(
                session.state,
                Table::Projection,
                object([
                    ("summarySnapshotId", snapshot_id.clone()),
                    ("fieldKey", get(field, "fieldKey").clone()),
                    ("visibilityLevel", get(field, "visibilityLevel").clone()),
                    ("maskingMode", get(field, "maskingMode").clone()),
                    (
                        "exportPolicy",
                        nullish(
                            get(field, "exportPolicy"),
                            get(&definition, "exportPolicy").clone(),
                        ),
                    ),
                    (
                        "fieldOrder",
                        nullish(get(field, "fieldOrder"), Value::Number(index as f64)),
                    ),
                    (
                        "channelScopeSummary",
                        nullish(get(field, "channelScopeSummary"), Value::Null),
                    ),
                    ("createdBy", created_by.clone()),
                ]),
            );
        }
        store::flush(session).await?;
        Ok(snapshot)
    }
    pub async fn create_confirmation_record_with_session(
        &self,
        session: &mut CommonSession<'_, '_>,
        actor: Value,
        input: Data,
    ) -> Result<Value, CommonFailure> {
        let participants = if let Value::Array(values) = get(&input, "participants") {
            values
        } else {
            return Err(CommonFailure::unexpected("Invalid internal participants"));
        };
        if participants.is_empty() {
            return Err(CommonFailure::http(
                StatusCode::BAD_REQUEST,
                "ConfirmationRecord requires at least one participant",
            ));
        }
        let mut ids = Vec::new();
        for participant in participants {
            let participant = required_object(participant)?;
            let id = get(participant, "participantId").clone();
            if ids.contains(&id) {
                return Err(http(
                    StatusCode::BAD_REQUEST,
                    &[Value::text("Duplicate confirmation participant "), id],
                ));
            }
            ids.push(id);
        }
        self.command(session, Command::Create { actor, input })
            .await
    }
    pub async fn confirm_participant_with_session(
        &self,
        session: &mut CommonSession<'_, '_>,
        id: Value,
        actor: Value,
        input: Data,
    ) -> Result<Value, CommonFailure> {
        self.command(session, Command::Confirm { id, actor, input })
            .await
    }
    pub async fn close_confirmation_record_with_session(
        &self,
        session: &mut CommonSession<'_, '_>,
        id: Value,
        actor: Value,
        input: Data,
    ) -> Result<Value, CommonFailure> {
        self.command(session, Command::Close { id, actor, input })
            .await
    }
    pub async fn resolve_decision_with(
        &self,
        session: &mut CommonSession<'_, '_>,
        id: Value,
        actor: Value,
        decision: ApprovalDecision,
        input: Data,
        handler: &dyn ApprovalDomainHandler,
    ) -> Result<Value, CommonFailure> {
        self.command(
            session,
            Command::Resolve {
                id,
                actor,
                decision,
                input,
                handler,
                public_result: false,
            },
        )
        .await
    }
    /// The production four-operation adapter needs the original CommandResult;
    /// the older internal probe continues receiving its raw record/domain pair.
    pub async fn resolve_public_decision_with(
        &self,
        session: &mut CommonSession<'_, '_>,
        id: Value,
        actor: Value,
        decision: ApprovalDecision,
        input: Data,
        handler: &dyn ApprovalDomainHandler,
    ) -> Result<Value, CommonFailure> {
        self.command(
            session,
            Command::Resolve {
                id,
                actor,
                decision,
                input,
                handler,
                public_result: true,
            },
        )
        .await
    }
    async fn command(
        &self,
        session: &mut CommonSession<'_, '_>,
        command: Command<'_>,
    ) -> Result<Value, CommonFailure> {
        let nested = session.connection.is_in_transaction();
        let mut tx = session.connection.begin().await?;
        let mut child = session.state.clone();
        if nested && child.trace.depth() == 0 {
            child.trace.begin(false);
        }
        child.trace.begin(true);
        let outcome = {
            let mut borrowed = CommonSession {
                connection: &mut tx,
                state: &mut child,
                participant: session.participant.as_mut().map(|participant| {
                    &mut **participant as &mut dyn super::session::CommonFlushParticipant
                }),
            };
            let value = self.execute(&mut borrowed, command).await;
            match value {
                Ok(mut value) => match store::flush(&mut borrowed).await {
                    Ok(()) => {
                        // The new internal callback outcome exposes a raw common row;
                        // carry the actual RETURNING version, not its pre-flush clone.
                        if let Value::Object(output) = &mut value
                            && let Some(Value::Object(record)) = output.get("record")
                        {
                            let id = get(record, "id").clone();
                            if let Some(row) = borrowed.state.entities.iter().find(|row| {
                                row.managed
                                    && row.table == Table::Approval
                                    && get(&row.data, "id") == &id
                            }) {
                                output.insert("record".into(), Value::Object(row.data.clone()));
                            }
                        }
                        Ok(value)
                    }
                    Err(error) => Err(error),
                },
                Err(error) => Err(error),
            }
        };
        match outcome {
            Ok(value) => match tx.commit().await {
                Ok(()) => {
                    child.trace.commit_succeeded();
                    *session.state = child;
                    Ok(value)
                }
                Err(error) => {
                    session.state.trace.incomplete = true;
                    session.state.share_existing_after_failed_fork(&child);
                    Err(error.into())
                }
            },
            Err(error) => {
                if tx.rollback().await.is_err() {
                    session.state.trace.incomplete = true;
                }
                session.state.share_existing_after_failed_fork(&child);
                Err(error)
            }
        }
    }
    async fn execute(
        &self,
        session: &mut CommonSession<'_, '_>,
        command: Command<'_>,
    ) -> Result<Value, CommonFailure> {
        match command {
            Command::Create { actor, input } => {
                let filters = [
                    (
                        "confirmationType",
                        vec![get(&input, "confirmationType").clone()],
                    ),
                    ("targetType", vec![get(&input, "targetType").clone()]),
                    ("targetId", vec![get(&input, "targetId").clone()]),
                    ("status", vec![Value::text("pending")]),
                ];
                if !store::find(session, Table::Confirmation, &filters, &[], true)
                    .await?
                    .is_empty()
                {
                    return Err(http(
                        StatusCode::CONFLICT,
                        &[
                            Value::text("ConfirmationRecord already exists for "),
                            get(&input, "targetType").clone(),
                            Value::text(" "),
                            get(&input, "targetId").clone(),
                        ],
                    ));
                }
                let record_id = Value::Text(random_uuid()?);
                let now = Value::Date(Some(Timestamp::now()));
                let participants = if let Value::Array(values) = get(&input, "participants") {
                    values
                } else {
                    unreachable!()
                };
                let record = store::create(
                    session.state,
                    Table::Confirmation,
                    object([
                        ("id", record_id.clone()),
                        ("confirmationType", get(&input, "confirmationType").clone()),
                        ("businessDomain", get(&input, "businessDomain").clone()),
                        ("targetType", get(&input, "targetType").clone()),
                        ("targetId", get(&input, "targetId").clone()),
                        ("projectId", nullish(get(&input, "projectId"), Value::Null)),
                        ("status", Value::text("pending")),
                        ("requiredCount", Value::Number(participants.len() as f64)),
                        ("confirmedCount", Value::Number(0.0)),
                        (
                            "confirmationComment",
                            nullish(get(&input, "comment"), Value::Null),
                        ),
                        ("submittedAt", now),
                        ("confirmedAt", Value::Null),
                        ("closedAt", Value::Null),
                        ("closedBy", Value::Null),
                        ("closeReason", Value::Null),
                        ("createdBy", actor.clone()),
                        ("updatedBy", actor.clone()),
                    ]),
                );
                let mut todos = Vec::new();
                for participant in participants {
                    let participant = required_object(participant)?;
                    let participant_id = Value::Text(random_uuid()?);
                    store::create(
                        session.state,
                        Table::Participant,
                        object([
                            ("id", participant_id),
                            ("confirmationRecordId", record_id.clone()),
                            ("participantId", get(participant, "participantId").clone()),
                            (
                                "participantRoleKey",
                                get(participant, "participantRoleKey").clone(),
                            ),
                            (
                                "participantDisplayName",
                                nullish(get(participant, "participantDisplayName"), Value::Null),
                            ),
                            ("participantStatus", Value::text("pending")),
                            ("confirmedAt", Value::Null),
                            ("confirmedComment", Value::Null),
                            ("createdBy", actor.clone()),
                            ("updatedBy", actor.clone()),
                        ]),
                    );
                    let todo_id = Value::Text(random_uuid()?);
                    todos.push(todo_id.clone());
                    store::create(
                        session.state,
                        Table::Todo,
                        object([
                            ("id", todo_id),
                            ("sourceType", Value::text("confirmation-record")),
                            ("sourceId", record_id.clone()),
                            ("todoType", Value::text("confirmation")),
                            ("businessDomain", get(&input, "businessDomain").clone()),
                            ("targetObjectType", get(&input, "targetType").clone()),
                            ("targetObjectId", get(&input, "targetId").clone()),
                            ("projectId", nullish(get(&input, "projectId"), Value::Null)),
                            (
                                "title",
                                nullish(
                                    get(participant, "todoTitle"),
                                    get(&input, "title").clone(),
                                ),
                            ),
                            (
                                "summary",
                                nullish(
                                    get(participant, "todoSummary"),
                                    nullish(get(&input, "summary"), Value::Null),
                                ),
                            ),
                            ("assigneeUserId", get(participant, "participantId").clone()),
                            ("status", Value::text("open")),
                            (
                                "priority",
                                nullish(get(&input, "priority"), Value::text("high")),
                            ),
                            ("dueAt", nullish(get(participant, "dueAt"), Value::Null)),
                            ("completedAt", Value::Null),
                        ]),
                    );
                }
                Ok(result(&store::data(session.state, record)?, todos, true))
            }
            Command::Confirm { id, actor, input } => {
                let record = self
                    .confirmation_record(session, &id, &input, false)
                    .await?;
                let participant = store::find(
                    session,
                    Table::Participant,
                    &[
                        ("confirmationRecordId", vec![id.clone()]),
                        ("participantId", vec![actor.clone()]),
                    ],
                    &[],
                    true,
                )
                .await?
                .first()
                .copied()
                .ok_or_else(|| {
                    http(
                        StatusCode::FORBIDDEN,
                        &[
                            Value::text("ConfirmationRecord "),
                            id.clone(),
                            Value::text(" is not assigned to current user"),
                        ],
                    )
                })?;
                let participant_data = store::data(session.state, participant)?;
                if get(&participant_data, "participantStatus") != &Value::text("pending") {
                    return Err(http(
                        StatusCode::CONFLICT,
                        &[
                            Value::text("Confirmation participant "),
                            actor.clone(),
                            Value::text(" is already "),
                            get(&participant_data, "participantStatus").clone(),
                        ],
                    ));
                }
                let todo = store::find(
                    session,
                    Table::Todo,
                    &[
                        ("sourceType", vec![Value::text("confirmation-record")]),
                        ("sourceId", vec![id]),
                        ("assigneeUserId", vec![actor.clone()]),
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
                .copied();
                let now = Value::Date(Some(Timestamp::now()));
                store::assign(
                    session.state,
                    participant,
                    object([
                        ("participantStatus", Value::text("confirmed")),
                        ("confirmedAt", now.clone()),
                        (
                            "confirmedComment",
                            nullish(get(&input, "comment"), Value::Null),
                        ),
                        ("updatedBy", actor.clone()),
                    ]),
                )?;
                let data = store::data(session.state, record)?;
                let count = get(&data, "confirmedCount").as_number().unwrap_or(f64::NAN) + 1.0;
                let mut changes = object([
                    ("confirmedCount", Value::Number(count)),
                    ("updatedBy", actor),
                ]);
                if count >= get(&data, "requiredCount").as_number().unwrap_or(f64::NAN) {
                    changes.insert("status".into(), Value::text("confirmed"));
                    changes.insert("confirmedAt".into(), now.clone());
                }
                store::assign(session.state, record, changes)?;
                let mut todos = Vec::new();
                if let Some(todo) = todo {
                    todos.push(get(&store::data(session.state, todo)?, "id").clone());
                    store::assign(
                        session.state,
                        todo,
                        object([("status", Value::text("completed")), ("completedAt", now)]),
                    )?;
                }
                Ok(result(&store::data(session.state, record)?, todos, true))
            }
            Command::Close { id, actor, input } => {
                let record = self.confirmation_record(session, &id, &input, true).await?;
                let participants = store::find(
                    session,
                    Table::Participant,
                    &[
                        ("confirmationRecordId", vec![id.clone()]),
                        ("participantStatus", vec![Value::text("pending")]),
                    ],
                    &[],
                    false,
                )
                .await?;
                let todos = store::find(
                    session,
                    Table::Todo,
                    &[
                        ("sourceType", vec![Value::text("confirmation-record")]),
                        ("sourceId", vec![id]),
                        (
                            "status",
                            vec![Value::text("open"), Value::text("processing")],
                        ),
                    ],
                    &[],
                    false,
                )
                .await?;
                let now = Value::Date(Some(Timestamp::now()));
                let reason = if get(&input, "comment").truthy() {
                    Value::Text(
                        get(&input, "reason")
                            .js_text()
                            .concat(&Text::from("\n"))
                            .concat(&get(&input, "comment").js_text()),
                    )
                } else {
                    get(&input, "reason").clone()
                };
                store::assign(
                    session.state,
                    record,
                    object([
                        ("status", Value::text("closed")),
                        ("closedAt", now.clone()),
                        ("closedBy", actor.clone()),
                        ("closeReason", reason),
                        ("updatedBy", actor.clone()),
                    ]),
                )?;
                for participant in participants {
                    store::assign(
                        session.state,
                        participant,
                        object([
                            ("participantStatus", Value::text("closed")),
                            ("updatedBy", actor.clone()),
                        ]),
                    )?;
                }
                let mut ids = Vec::new();
                for todo in todos {
                    ids.push(get(&store::data(session.state, todo)?, "id").clone());
                    store::assign(
                        session.state,
                        todo,
                        object([
                            ("status", Value::text("canceled")),
                            ("completedAt", now.clone()),
                        ]),
                    )?;
                }
                Ok(result(&store::data(session.state, record)?, ids, true))
            }
            Command::Resolve {
                id,
                actor,
                decision,
                input,
                handler,
                public_result,
            } => {
                let record = self
                    .approval_record(session, id.clone())
                    .await?
                    .ok_or_else(|| {
                        http(
                            StatusCode::NOT_FOUND,
                            &[
                                Value::text("ApprovalRecord "),
                                id.clone(),
                                Value::text(" not found"),
                            ],
                        )
                    })?;
                let data = store::data(session.state, record)?;
                expected(
                    get(&data, "rowVersion"),
                    get(&input, "expectedVersion"),
                    "approval-record",
                )?;
                if get(&data, "currentStatus") != &Value::text("pending") {
                    return Err(http(
                        StatusCode::BAD_REQUEST,
                        &[
                            Value::text("ApprovalRecord "),
                            id.clone(),
                            Value::text(" cannot be processed in status "),
                            get(&data, "currentStatus").clone(),
                        ],
                    ));
                }
                if get(&data, "currentApproverUserId") != &actor {
                    return Err(http(
                        StatusCode::FORBIDDEN,
                        &[
                            Value::text("ApprovalRecord "),
                            id.clone(),
                            Value::text(" is not assigned to current user"),
                        ],
                    ));
                }
                let todo = store::find(
                    session,
                    Table::Todo,
                    &[
                        ("sourceType", vec![Value::text("approval-record")]),
                        ("sourceId", vec![id]),
                        ("assigneeUserId", vec![actor.clone()]),
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
                .copied();
                let comment = if decision == ApprovalDecision::Rejected {
                    if get(&input, "comment").truthy() {
                        Value::Text(
                            get(&input, "reason")
                                .js_text()
                                .concat(&Text::from("\n"))
                                .concat(&get(&input, "comment").js_text()),
                        )
                    } else {
                        get(&input, "reason").clone()
                    }
                } else {
                    nullish(get(&input, "comment"), Value::Null)
                };
                let status = Value::Text(decision.text());
                store::assign(
                    session.state,
                    record,
                    object([
                        ("currentStatus", status.clone()),
                        ("decision", status),
                        ("decisionComment", comment),
                        ("decidedAt", Value::Date(Some(Timestamp::now()))),
                        ("closedAt", Value::Date(Some(Timestamp::now()))),
                        ("currentApproverUserId", Value::Null),
                    ]),
                )?;
                if let Some(todo) = todo {
                    store::assign(
                        session.state,
                        todo,
                        object([
                            (
                                "status",
                                Value::text(if decision == ApprovalDecision::Approved {
                                    "completed"
                                } else {
                                    "canceled"
                                }),
                            ),
                            ("completedAt", Value::Date(Some(Timestamp::now()))),
                        ]),
                    )?;
                }
                let context = DecisionContext {
                    actor_id: actor.js_text(),
                    decision,
                    record: decode(&Value::Object(store::data(session.state, record)?))?,
                    todo: todo
                        .map(|todo| {
                            store::data(session.state, todo)
                                .and_then(|data| decode(&Value::Object(data)))
                        })
                        .transpose()?,
                };
                let domain = handler.apply_with_session(&context, session).await?;
                if public_result {
                    return Ok(Value::Object(object([
                        ("targetId", Value::Text(domain.target_id)),
                        ("targetType", Value::Text(domain.target_type)),
                        ("resultStatus", Value::Text(decision.text())),
                        (
                            "businessStatusAfter",
                            Value::Text(domain.business_status_after),
                        ),
                        ("approvalRecordId", Value::Text(context.record.id.clone())),
                        ("confirmationRecordId", Value::Null),
                        (
                            "todoItemIds",
                            Value::Array(
                                context
                                    .todo
                                    .as_ref()
                                    .map(|todo| vec![Value::Text(todo.id.clone())])
                                    .unwrap_or_default(),
                            ),
                        ),
                        (
                            "snapshotId",
                            domain.snapshot_id.map(Value::Text).unwrap_or(Value::Null),
                        ),
                    ])));
                }
                Ok(Value::Object(object([
                    ("record", Value::Object(store::data(session.state, record)?)),
                    (
                        "domain",
                        Value::Object(object([
                            ("targetId", Value::Text(domain.target_id)),
                            ("targetType", Value::Text(domain.target_type)),
                            (
                                "businessStatusAfter",
                                Value::Text(domain.business_status_after),
                            ),
                            (
                                "snapshotId",
                                domain.snapshot_id.map(Value::Text).unwrap_or(Value::Null),
                            ),
                        ])),
                    ),
                ])))
            }
        }
    }
    async fn confirmation_record(
        &self,
        session: &mut CommonSession<'_, '_>,
        id: &Value,
        input: &Data,
        closing: bool,
    ) -> Result<EntityHandle, CommonFailure> {
        let handle = store::find(
            session,
            Table::Confirmation,
            &[("id", vec![id.clone()])],
            &[],
            true,
        )
        .await?
        .first()
        .copied()
        .ok_or_else(|| {
            http(
                StatusCode::NOT_FOUND,
                &[
                    Value::text("ConfirmationRecord "),
                    id.clone(),
                    Value::text(" not found"),
                ],
            )
        })?;
        let data = store::data(session.state, handle)?;
        expected(
            get(&data, "rowVersion"),
            get(input, "expectedVersion"),
            "confirmation-record",
        )?;
        if get(&data, "status") != &Value::text("pending") {
            return Err(http(
                StatusCode::BAD_REQUEST,
                &[
                    Value::text("ConfirmationRecord "),
                    id.clone(),
                    Value::text(if closing {
                        " cannot be closed in status "
                    } else {
                        " cannot be confirmed in status "
                    }),
                    get(&data, "status").clone(),
                ],
            ));
        }
        Ok(handle)
    }
    pub async fn find_confirmation_progress_by_id(
        &self,
        session: &mut CommonSession<'_, '_>,
        id: Value,
    ) -> Result<Value, CommonFailure> {
        let handle = store::find(session, Table::Confirmation, &[("id", vec![id])], &[], true)
            .await?
            .first()
            .copied();
        self.progress(session, handle).await
    }
    pub async fn find_latest_confirmation_progress_by_target(
        &self,
        session: &mut CommonSession<'_, '_>,
        input: Data,
    ) -> Result<Value, CommonFailure> {
        let mut filters = vec![
            ("targetType", vec![get(&input, "targetType").clone()]),
            ("targetId", vec![get(&input, "targetId").clone()]),
        ];
        if get(&input, "confirmationType").truthy() {
            filters.push((
                "confirmationType",
                vec![get(&input, "confirmationType").clone()],
            ));
        }
        let handle = store::find(
            session,
            Table::Confirmation,
            &filters,
            &[("submittedAt", true), ("createdAt", true)],
            true,
        )
        .await?
        .first()
        .copied();
        self.progress(session, handle).await
    }
    async fn progress(
        &self,
        session: &mut CommonSession<'_, '_>,
        handle: Option<EntityHandle>,
    ) -> Result<Value, CommonFailure> {
        let Some(handle) = handle else {
            return Ok(Value::Null);
        };
        let record = store::data(session.state, handle)?;
        let participants = store::find(
            session,
            Table::Participant,
            &[("confirmationRecordId", vec![get(&record, "id").clone()])],
            &[("createdAt", false)],
            false,
        )
        .await?;
        let mut output = Data::new();
        for key in [
            "id",
            "confirmationType",
            "businessDomain",
            "targetType",
            "targetId",
            "projectId",
            "status",
            "requiredCount",
            "confirmedCount",
            "submittedAt",
            "confirmedAt",
            "closedAt",
            "rowVersion",
        ] {
            output.insert(key.into(), get(&record, key).clone());
        }
        let mut values = Vec::new();
        for handle in participants {
            let data = store::data(session.state, handle)?;
            let mut participant = Data::new();
            for key in [
                "participantId",
                "participantRoleKey",
                "participantDisplayName",
                "participantStatus",
                "confirmedAt",
                "confirmedComment",
            ] {
                participant.insert(key.into(), get(&data, key).clone());
            }
            values.push(Value::Object(participant));
        }
        output.insert("participants".into(), Value::Array(values));
        Ok(Value::Object(output))
    }
    pub async fn approval_record(
        &self,
        session: &mut CommonSession<'_, '_>,
        id: Value,
    ) -> Result<Option<EntityHandle>, CommonFailure> {
        Ok(
            store::find(session, Table::Approval, &[("id", vec![id])], &[], true)
                .await?
                .first()
                .copied(),
        )
    }
    pub async fn latest_approval_record(
        &self,
        session: &mut CommonSession<'_, '_>,
        input: &Data,
    ) -> Result<Option<EntityHandle>, CommonFailure> {
        Ok(store::find(
            session,
            Table::Approval,
            &[
                ("targetObjectType", vec![get(input, "targetType").clone()]),
                ("targetObjectId", vec![get(input, "targetId").clone()]),
            ],
            &[("submittedAt", true), ("createdAt", true)],
            true,
        )
        .await?
        .first()
        .copied())
    }
    pub async fn open_todos(
        &self,
        session: &mut CommonSession<'_, '_>,
        actor: Value,
    ) -> Result<Vec<EntityHandle>, CommonFailure> {
        store::find(
            session,
            Table::Todo,
            &[
                ("assigneeUserId", vec![actor]),
                (
                    "status",
                    vec![Value::text("open"), Value::text("processing")],
                ),
            ],
            &[("createdAt", false)],
            false,
        )
        .await
    }
}
enum Command<'a> {
    Create {
        actor: Value,
        input: Data,
    },
    Confirm {
        id: Value,
        actor: Value,
        input: Data,
    },
    Close {
        id: Value,
        actor: Value,
        input: Data,
    },
    Resolve {
        id: Value,
        actor: Value,
        decision: ApprovalDecision,
        input: Data,
        handler: &'a dyn ApprovalDomainHandler,
        public_result: bool,
    },
}
