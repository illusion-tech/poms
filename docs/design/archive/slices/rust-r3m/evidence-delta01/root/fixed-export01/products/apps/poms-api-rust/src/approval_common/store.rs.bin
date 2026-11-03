//! Bounded common/domain UoW. The seven-table base was calibrated by Native
//! alpha03; contract decision ordering additionally follows Native L first04.
//! Commission snapshot groups follow actual Native commnative01's initial,
//! replacement and retention traces. That witness does not certify new batches
//! or concurrent snapshot writers.
//! Identifiers come only from the original-schema mapping, never request input.
use super::{
    CommonFailure,
    js::{Data, Value, get},
    model::Timestamp,
    schema::{Column, Table},
    session::{CommonFlushParticipant, CommonSession, EntityHandle, TrackedEntity},
};
use chrono::{DateTime, Utc};
use sqlx::{Connection, Postgres, QueryBuilder, Row};

pub fn entity(
    state: &super::CommonState,
    handle: EntityHandle,
) -> Result<&TrackedEntity, CommonFailure> {
    state
        .entities
        .get(handle.0)
        .filter(|row| row.managed)
        .ok_or_else(|| CommonFailure::unexpected("Internal entity is detached"))
}
pub fn data(state: &super::CommonState, handle: EntityHandle) -> Result<Data, CommonFailure> {
    Ok(entity(state, handle)?.data.clone())
}
/// EM.clear removes identity management, not properties of an existing JS
/// object held by a caller. Reading a binding must not reattach that object.
pub(crate) fn binding_data(
    state: &super::CommonState,
    handle: EntityHandle,
) -> Result<Data, CommonFailure> {
    state
        .entities
        .get(handle.0)
        .map(|row| row.data.clone())
        .ok_or_else(|| CommonFailure::unexpected("Internal entity binding is absent"))
}
pub fn assign(
    state: &mut super::CommonState,
    handle: EntityHandle,
    changes: Data,
) -> Result<(), CommonFailure> {
    let row = state
        .entities
        .get_mut(handle.0)
        .filter(|row| row.managed)
        .ok_or_else(|| CommonFailure::unexpected("Internal entity is detached"))?;
    if row.table.read_only() {
        return Err(CommonFailure::unexpected("L domain facts are read-only"));
    }
    if changes.keys().any(|key| {
        key == "id"
            || !row
                .table
                .columns()
                .iter()
                .any(|column| column.property == key)
    }) {
        return Err(CommonFailure::unexpected(
            "Internal assignment rejects identity or unmapped fields",
        ));
    }
    row.data.extend(changes);
    Ok(())
}
pub fn create(state: &mut super::CommonState, table: Table, mut input: Data) -> EntityHandle {
    input.retain(|key, _| table.columns().iter().any(|column| column.property == key));
    for column in table.columns() {
        if matches!(column.property, "createdAt" | "updatedAt")
            && get(&input, column.property).nullish()
        {
            input.insert(column.property.into(), Value::Date(Some(Timestamp::now())));
        } else if matches!(get(&input, column.property), Value::Undefined)
            && let Some(value) = column.default
        {
            input.insert(
                column.property.into(),
                if column.cast == "boolean" {
                    Value::Bool(value == "true")
                } else if column.cast == "jsonb" {
                    Value::parse(value).unwrap_or(Value::Null)
                } else if column.cast == "integer" {
                    Value::Number(value.parse().unwrap_or(0.0))
                } else {
                    Value::text(value)
                },
            );
        }
    }
    let handle = EntityHandle(state.entities.len());
    state.entities.push(TrackedEntity {
        table,
        data: input,
        original: None,
        queued: true,
        managed: true,
    });
    state.persist_order.push(handle);
    handle
}
/// Original nativeInsertMany addParams fallback is a parameter-stage rule,
/// separate from entity initialization. It must not mutate a live null field.
pub fn insert_parameter(column: &Column, value: &Value) -> Value {
    if column.nullable && matches!(value, Value::Null) {
        value.clone()
    } else if value.nullish() {
        column.default.map_or(Value::Undefined, |value| {
            if column.cast == "boolean" {
                Value::Bool(value == "true")
            } else if column.cast == "jsonb" {
                Value::parse(value).unwrap_or(Value::Null)
            } else if column.cast == "integer" {
                Value::Number(value.parse().unwrap_or(0.0))
            } else {
                Value::text(value)
            }
        })
    } else {
        value.clone()
    }
}
pub fn persist(state: &mut super::CommonState, handle: EntityHandle) -> Result<(), CommonFailure> {
    state
        .entities
        .get_mut(handle.0)
        .filter(|row| row.managed)
        .ok_or_else(|| CommonFailure::unexpected("Internal entity is detached"))?
        .queued = true;
    if !state.persist_order.contains(&handle) {
        state.persist_order.push(handle);
    }
    Ok(())
}
fn same_id(a: &Value, b: &Value) -> bool {
    match (a.as_text(), b.as_text()) {
        (Some(a), Some(b)) => match (
            uuid::Uuid::parse_str(&a.to_utf8_lossy()),
            uuid::Uuid::parse_str(&b.to_utf8_lossy()),
        ) {
            (Ok(a), Ok(b)) => a == b,
            _ => a == b,
        },
        _ => false,
    }
}
fn manage(state: &mut super::CommonState, table: Table, fresh: Data) -> EntityHandle {
    if let Some((index, row)) = state.entities.iter_mut().enumerate().find(|(_, row)| {
        row.managed && row.table == table && same_id(get(&row.data, "id"), get(&fresh, "id"))
    }) {
        if let Some(original) = &mut row.original {
            for column in table.columns() {
                let value = get(&fresh, column.property);
                let clean = get(&row.data, column.property) == get(original, column.property);
                if (column.version || clean)
                    && (!matches!(value, Value::Null) || get(&row.data, column.property).nullish())
                {
                    row.data.insert(column.property.into(), value.clone());
                    original.insert(column.property.into(), value.clone());
                }
            }
        }
        return EntityHandle(index);
    }
    let handle = EntityHandle(state.entities.len());
    state.entities.push(TrackedEntity {
        table,
        data: fresh.clone(),
        original: Some(fresh),
        queued: false,
        managed: true,
    });
    handle
}
fn column(table: Table, name: &str) -> Result<&'static Column, CommonFailure> {
    table
        .columns()
        .iter()
        .find(|column| column.property == name)
        .ok_or_else(|| CommonFailure::unexpected("Unmapped internal query field"))
}
fn push_value(
    builder: &mut QueryBuilder<Postgres>,
    value: &Value,
    column: &Column,
) -> Result<(), CommonFailure> {
    if matches!(value, Value::Date(None)) {
        return Err(CommonFailure::unexpected("Invalid time value"));
    }
    let value = if value.nullish() {
        None
    } else {
        Some(match value {
            Value::Date(Some(value)) => {
                value.0.to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
            }
            _ => value.js_text().to_utf8_lossy(),
        })
    };
    builder.push_bind(value).push("::").push(column.cast);
    Ok(())
}
fn read_row(row: &sqlx::postgres::PgRow, table: Table) -> Result<Data, CommonFailure> {
    let mut data = Data::new();
    for column in table.columns() {
        let value = if column.cast == "timestamptz" {
            row.try_get::<Option<DateTime<Utc>>, _>(column.property)?
                .map(|value| Value::Date(Some(Timestamp::from_database(value))))
                .unwrap_or(Value::Null)
        } else {
            match row.try_get::<Option<String>, _>(column.property)? {
                None => Value::Null,
                Some(value) if column.cast == "integer" => Value::Number(
                    value
                        .parse()
                        .map_err(|_| CommonFailure::unexpected("Invalid database integer"))?,
                ),
                Some(value) if column.cast == "boolean" => Value::Bool(value == "true"),
                Some(value) if column.cast == "jsonb" => Value::parse(&value)?,
                Some(value) => Value::text(value),
            }
        };
        data.insert(column.property.into(), value);
    }
    Ok(data)
}
pub async fn find(
    session: &mut CommonSession<'_, '_>,
    table: Table,
    filters: &[(&str, Vec<Value>)],
    order: &[(&str, bool)],
    one: bool,
) -> Result<Vec<EntityHandle>, CommonFailure> {
    if one
        && filters.len() == 1
        && filters[0].0 == "id"
        && filters[0].1.len() == 1
        && let Some((index, _)) = session.state.entities.iter().enumerate().find(|(_, row)| {
            row.managed
                && row.table == table
                && row.original.is_some()
                && same_id(get(&row.data, "id"), &filters[0].1[0])
        })
    {
        return Ok(vec![EntityHandle(index)]);
    }
    // Original AUTO only queues a read-triggered flush for newly persisted meta.
    if session
        .state
        .entities
        .iter()
        .any(|row| row.managed && row.table == table && row.original.is_none() && row.queued)
    {
        flush(session).await?;
    }
    let mut builder = QueryBuilder::<Postgres>::new("SELECT ");
    for (index, column) in table.columns().iter().enumerate() {
        if index > 0 {
            builder.push(",");
        }
        builder.push("\"").push(column.sql).push("\"");
        if column.cast != "timestamptz" {
            builder.push("::text");
        }
        builder.push(" AS \"").push(column.property).push("\"");
    }
    builder
        .push(" FROM poms.\"")
        .push(table.name())
        .push("\" WHERE true");
    for (name, values) in filters {
        let col = column(table, name)?;
        builder.push(" AND \"").push(col.sql).push("\"");
        if values.len() == 1 {
            builder.push(" = ");
            push_value(&mut builder, &values[0], col)?;
        } else {
            builder.push(" IN (");
            for (index, value) in values.iter().enumerate() {
                if index > 0 {
                    builder.push(",");
                }
                push_value(&mut builder, value, col)?;
            }
            builder.push(")");
        }
    }
    if !order.is_empty() {
        builder.push(" ORDER BY ");
        for (index, (name, descending)) in order.iter().enumerate() {
            if index > 0 {
                builder.push(",");
            }
            builder
                .push("\"")
                .push(column(table, name)?.sql)
                .push(if *descending { "\" DESC" } else { "\" ASC" });
        }
    }
    if one {
        builder.push(" LIMIT 1");
    }
    let rows = builder.build().fetch_all(&mut *session.connection).await?;
    rows.iter()
        .map(|row| read_row(row, table).map(|data| manage(session.state, table, data)))
        .collect()
}
fn dirty_columns(row: &TrackedEntity) -> Vec<&'static Column> {
    match &row.original {
        None => Vec::new(),
        Some(original) => row
            .table
            .columns()
            .iter()
            .filter(|column| {
                column.property != "id"
                    && !column.version
                    && get(&row.data, column.property) != get(original, column.property)
            })
            .collect(),
    }
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum FlushGroup {
    Table(Table),
    Participant,
}

/// Native computeChangeSets appends explicitly persisted objects first, then
/// the remaining identity-map objects grouped by their first registered meta.
/// Auth was loaded before L's objects and occupies that first implicit slot.
fn computation_order(state: &super::CommonState) -> (Vec<EntityHandle>, Vec<EntityHandle>) {
    let mut explicit = Vec::new();
    for handle in &state.persist_order {
        if state
            .entities
            .get(handle.0)
            .is_some_and(|row| row.managed && row.queued)
            && !explicit.contains(handle)
        {
            explicit.push(*handle);
        }
    }
    // Accommodate older callers which supply tracked entities directly.
    for (index, row) in state.entities.iter().enumerate() {
        let handle = EntityHandle(index);
        if row.managed && row.queued && !explicit.contains(&handle) {
            explicit.push(handle);
        }
    }
    let mut tables = Vec::new();
    for row in &state.entities {
        if row.managed && row.original.is_some() && !tables.contains(&row.table) {
            tables.push(row.table);
        }
    }
    let mut implicit = Vec::new();
    for table in tables {
        for (index, row) in state.entities.iter().enumerate() {
            let handle = EntityHandle(index);
            if row.managed
                && row.original.is_some()
                && row.table == table
                && !explicit.contains(&handle)
            {
                implicit.push(handle);
            }
        }
    }
    (explicit, implicit)
}

fn sort_groups(groups: &[FlushGroup]) -> Vec<FlushGroup> {
    fn visit(
        group: FlushGroup,
        groups: &[FlushGroup],
        seen: &mut Vec<FlushGroup>,
        out: &mut Vec<FlushGroup>,
    ) {
        if seen.contains(&group) {
            return;
        }
        seen.push(group);
        for (child, parent) in [
            (Table::Participant, Table::Confirmation),
            (Table::Snapshot, Table::Definition),
            (Table::Projection, Table::Snapshot),
            (Table::RuleExplanation, Table::FinalSettlement),
        ] {
            if FlushGroup::Table(parent) == group && groups.contains(&FlushGroup::Table(child)) {
                visit(FlushGroup::Table(child), groups, seen, out);
            }
        }
        out.push(group);
    }
    let mut out = Vec::new();
    let mut seen = Vec::new();
    for group in groups {
        visit(*group, groups, &mut seen, &mut out);
    }
    out.reverse();
    out
}

fn prepare_entity(
    state: &mut super::CommonState,
    handle: EntityHandle,
    groups: &mut Vec<FlushGroup>,
) {
    let row = &mut state.entities[handle.0];
    let dirty = !dirty_columns(row).is_empty();
    if dirty
        && row
            .table
            .columns()
            .iter()
            .any(|column| column.property == "updatedAt")
    {
        row.data
            .insert("updatedAt".into(), Value::Date(Some(Timestamp::now())));
    }
    if ((row.original.is_none() && row.queued) || dirty)
        && !groups.contains(&FlushGroup::Table(row.table))
    {
        groups.push(FlushGroup::Table(row.table));
    }
}

fn prepare_flush(
    state: &mut super::CommonState,
    participant: Option<&mut dyn CommonFlushParticipant>,
) -> Vec<FlushGroup> {
    let (explicit, implicit) = computation_order(state);
    let mut groups = Vec::new();
    for handle in explicit {
        prepare_entity(state, handle, &mut groups);
    }
    if let Some(participant) = participant
        && participant.has_pending()
    {
        participant.prepare_flush();
        groups.push(FlushGroup::Participant);
    }
    for handle in implicit {
        prepare_entity(state, handle, &mut groups);
    }
    sort_groups(&groups)
}

fn post_commit_cleanup(state: &mut super::CommonState) {
    for row in &mut state.entities {
        row.queued = false;
    }
    state.persist_order.clear();
}

pub async fn flush(session: &mut CommonSession<'_, '_>) -> Result<(), CommonFailure> {
    // Native onUpdate sampling precedes implicit BEGIN and the SQL group walk.
    let order = prepare_flush(
        session.state,
        session
            .participant
            .as_mut()
            .map(|participant| &mut **participant as &mut dyn CommonFlushParticipant),
    );
    if order.is_empty() {
        post_commit_cleanup(session.state);
        return Ok(());
    }
    let result = if session.connection.is_in_transaction() {
        flush_inner(session, &order).await
    } else {
        let mut tx = session.connection.begin().await?;
        session.state.trace.begin(true);
        let result = {
            let mut borrowed = CommonSession {
                connection: &mut tx,
                state: session.state,
                participant: session.participant.as_mut().map(|participant| {
                    &mut **participant as &mut dyn super::session::CommonFlushParticipant
                }),
            };
            flush_inner(&mut borrowed, &order).await
        };
        match result {
            Ok(()) => match tx.commit().await {
                Ok(()) => {
                    session.state.trace.commit_succeeded();
                    Ok(())
                }
                Err(error) => {
                    session.state.trace.unknown_commit();
                    Err(error.into())
                }
            },
            Err(error) => {
                let rolled = tx.rollback().await;
                session.state.trace.rolled_back();
                if rolled.is_err() {
                    session.state.trace.incomplete = true;
                }
                Err(error)
            }
        }
    };
    // postCommitCleanup clears persist actions even on a failed native flush.
    post_commit_cleanup(session.state);
    result
}
async fn flush_inner(
    session: &mut CommonSession<'_, '_>,
    order: &[FlushGroup],
) -> Result<(), CommonFailure> {
    for group in order {
        if let FlushGroup::Table(table) = group {
            insert_table(session, *table).await?;
        }
    }
    for group in order {
        match group {
            FlushGroup::Table(table) => update_table(session, *table).await?,
            FlushGroup::Participant => {
                if let Some(participant) = session.participant.as_mut() {
                    participant.flush_once(&mut *session.connection).await?;
                }
            }
        }
    }
    Ok(())
}

async fn insert_table(
    session: &mut CommonSession<'_, '_>,
    table: Table,
) -> Result<(), CommonFailure> {
    let indices: Vec<_> = session
        .state
        .entities
        .iter()
        .enumerate()
        .filter(|(_, row)| {
            row.managed && row.table == table && row.original.is_none() && row.queued
        })
        .map(|(index, _)| index)
        .collect();
    if indices.is_empty() {
        return Ok(());
    }
    if table.read_only() {
        return Err(CommonFailure::unexpected("L domain facts are read-only"));
    }
    // Original executeInserts validates every row of this metadata group before
    // issuing its batch INSERT. Earlier groups may already have run in this tx.
    for index in &indices {
        super::required::validate(table, &session.state.entities[*index].data)?;
    }
    let columns: Vec<_> = table
        .columns()
        .iter()
        .filter(|column| {
            !column.version
                && indices.iter().any(|index| {
                    !matches!(
                        get(&session.state.entities[*index].data, column.property),
                        Value::Undefined
                    )
                })
        })
        .collect();
    let mut builder =
        QueryBuilder::<Postgres>::new(format!("INSERT INTO poms.\"{}\" (", table.name()));
    for (index, col) in columns.iter().enumerate() {
        if index > 0 {
            builder.push(",");
        }
        builder.push("\"").push(col.sql).push("\"");
    }
    builder.push(") VALUES ");
    for (index, entry) in indices.iter().enumerate() {
        if index > 0 {
            builder.push(",");
        }
        builder.push("(");
        for (index, col) in columns.iter().enumerate() {
            if index > 0 {
                builder.push(",");
            }
            let value =
                insert_parameter(col, get(&session.state.entities[*entry].data, col.property));
            if matches!(value, Value::Undefined) {
                builder.push("DEFAULT");
            } else {
                push_value(&mut builder, &value, col)?;
            }
        }
        builder.push(")");
    }
    // Both L snapshot writers supply UUIDs before persist. Native commnative01
    // returns only row_version for those INSERTs; the older seven-table probe
    // retains its existing generated-identity protocol.
    let returns_id = !matches!(table, Table::FinalSettlement | Table::RuleExplanation)
        || indices
            .iter()
            .any(|index| get(&session.state.entities[*index].data, "id").nullish());
    builder.push(" RETURNING ");
    if returns_id {
        builder.push("id::text AS id");
    }
    let version = table.columns().iter().find(|column| column.version);
    if version.is_some() {
        if returns_id {
            builder.push(",");
        }
        builder.push("row_version");
    }
    if table == Table::Snapshot {
        builder.push(",generated_at");
    }
    let returned = builder.build().fetch_all(&mut *session.connection).await?;
    for (index, returned) in indices.into_iter().zip(returned) {
        let entity = &mut session.state.entities[index];
        let id: String = if returns_id {
            returned.try_get("id")?
        } else {
            get(&entity.data, "id")
                .as_text()
                .ok_or_else(|| {
                    CommonFailure::unexpected("Snapshot identity is absent before INSERT")
                })?
                .to_utf8_lossy()
        };
        if get(&entity.data, "id").nullish() {
            entity.data.insert("id".into(), Value::text(id.clone()));
        }
        if version.is_some() {
            entity.data.insert(
                "rowVersion".into(),
                Value::Number(f64::from(returned.try_get::<i32, _>("row_version")?)),
            );
        }
        if table == Table::Snapshot && get(&entity.data, "generatedAt").nullish() {
            entity.data.insert(
                "generatedAt".into(),
                Value::Date(Some(Timestamp::from_database(
                    returned.try_get("generated_at")?,
                ))),
            );
        }
        entity.original = Some(entity.data.clone());
        entity.queued = false;
        session.state.trace.inserted(table.name(), &id);
    }
    Ok(())
}
fn optimistic(table: Table) -> CommonFailure {
    CommonFailure::unexpected(format!(
        "The optimistic lock on entity {} failed",
        table.class_name()
    ))
}
async fn update_table(
    session: &mut CommonSession<'_, '_>,
    table: Table,
) -> Result<(), CommonFailure> {
    let indices: Vec<_> = session
        .state
        .entities
        .iter()
        .enumerate()
        .filter(|(_, row)| row.managed && row.table == table && !dirty_columns(row).is_empty())
        .map(|(index, _)| index)
        .collect();
    if indices.is_empty() {
        return Ok(());
    }
    let version = table.columns().iter().find(|column| column.version);
    let idcol = column(table, "id")?;
    if indices.len() > 1 {
        if let Some(version) = version {
            let mut pre = QueryBuilder::<Postgres>::new(format!(
                "SELECT id FROM poms.\"{}\" WHERE ",
                table.name()
            ));
            for (n, index) in indices.iter().enumerate() {
                if n > 0 {
                    pre.push(" OR ");
                }
                let row = &session.state.entities[*index];
                pre.push("(id=");
                push_value(&mut pre, get(&row.data, "id"), idcol)?;
                pre.push(" AND row_version=");
                push_value(&mut pre, get(&row.data, "rowVersion"), version)?;
                pre.push(")");
            }
            pre.push(" ORDER BY id ASC");
            if pre.build().fetch_all(&mut *session.connection).await?.len() != indices.len() {
                return Err(optimistic(table));
            }
        }
        let columns: Vec<_> = table
            .columns()
            .iter()
            .filter(|column| {
                indices.iter().any(|index| {
                    dirty_columns(&session.state.entities[*index])
                        .iter()
                        .any(|dirty| dirty.property == column.property)
                })
            })
            .collect();
        let mut query =
            QueryBuilder::<Postgres>::new(format!("UPDATE poms.\"{}\" SET ", table.name()));
        for (n, column) in columns.iter().enumerate() {
            if n > 0 {
                query.push(",");
            }
            query.push("\"").push(column.sql).push("\"=CASE ");
            for index in &indices {
                let row = &session.state.entities[*index];
                if dirty_columns(row)
                    .iter()
                    .any(|dirty| dirty.property == column.property)
                {
                    query.push(" WHEN id=");
                    push_value(&mut query, get(&row.data, "id"), idcol)?;
                    query.push(" THEN ");
                    push_value(&mut query, get(&row.data, column.property), column)?;
                }
            }
            query.push(" ELSE \"").push(column.sql).push("\" END");
        }
        if version.is_some() {
            query.push(",row_version=row_version+1");
        }
        query.push(" WHERE id IN (");
        for (n, index) in indices.iter().enumerate() {
            if n > 0 {
                query.push(",");
            }
            push_value(
                &mut query,
                get(&session.state.entities[*index].data, "id"),
                idcol,
            )?;
        }
        query.push(") RETURNING id::text AS id");
        if version.is_some() {
            query.push(",row_version");
        }
        let returned = query.build().fetch_all(&mut *session.connection).await?;
        for index in indices {
            let row = &mut session.state.entities[index];
            if version.is_some()
                && let Some(value) = returned.iter().find(|value| {
                    value
                        .try_get::<String, _>("id")
                        .ok()
                        .is_some_and(|id| same_id(&Value::text(id), get(&row.data, "id")))
                })
            {
                row.data.insert(
                    "rowVersion".into(),
                    Value::Number(f64::from(value.try_get::<i32, _>("row_version")?)),
                );
            }
            row.original = Some(row.data.clone());
        }
    } else {
        let index = indices[0];
        let row = &session.state.entities[index];
        let columns = dirty_columns(row);
        let mut query =
            QueryBuilder::<Postgres>::new(format!("UPDATE poms.\"{}\" SET ", table.name()));
        for (n, col) in columns.iter().enumerate() {
            if n > 0 {
                query.push(",");
            }
            query.push("\"").push(col.sql).push("\"=");
            push_value(&mut query, get(&row.data, col.property), col)?;
        }
        if version.is_some() {
            query.push(",row_version=row_version+1");
        }
        query.push(" WHERE id=");
        push_value(&mut query, get(&row.data, "id"), idcol)?;
        if let Some(version) = version {
            query.push(" AND row_version=");
            push_value(&mut query, get(&row.data, "rowVersion"), version)?;
            query.push(" RETURNING row_version");
            let returned = query
                .build()
                .fetch_optional(&mut *session.connection)
                .await?
                .ok_or_else(|| optimistic(table))?;
            session.state.entities[index].data.insert(
                "rowVersion".into(),
                Value::Number(f64::from(returned.try_get::<i32, _>("row_version")?)),
            );
        } else {
            query.build().execute(&mut *session.connection).await?;
        }
        session.state.entities[index].original = Some(session.state.entities[index].data.clone());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::approval_common::{CommonState, service::object, session::CommonFlushFuture};

    struct Pending {
        pending: bool,
        prepared: usize,
    }
    impl CommonFlushParticipant for Pending {
        fn has_pending(&self) -> bool {
            self.pending
        }
        fn prepare_flush(&mut self) {
            self.prepared += 1;
        }
        fn flush_once<'a>(
            &'a mut self,
            _connection: &'a mut sqlx::PgConnection,
        ) -> CommonFlushFuture<'a> {
            Box::pin(async { panic!("Pure ordering test must not execute SQL") })
        }
    }

    #[test]
    fn native_first04_contract_persist_order_overrides_select_order() -> Result<(), CommonFailure> {
        let mut state = CommonState::default();
        // Original SELECTs register approval, todo, then contract.
        let approval = manage(
            &mut state,
            Table::Approval,
            object([("currentStatus", Value::text("pending"))]),
        );
        let todo = manage(
            &mut state,
            Table::Todo,
            object([("status", Value::text("open"))]),
        );
        let contract = manage(
            &mut state,
            Table::Contract,
            object([("status", Value::text("pending-review"))]),
        );
        assign(
            &mut state,
            approval,
            object([("currentStatus", Value::text("rejected"))]),
        )?;
        assign(
            &mut state,
            todo,
            object([("status", Value::text("canceled"))]),
        )?;
        assign(
            &mut state,
            contract,
            object([("status", Value::text("draft"))]),
        )?;
        // Original resolve explicitly persists a different array order.
        for handle in [approval, contract, todo, approval] {
            persist(&mut state, handle)?;
        }
        assert_eq!(computation_order(&state).0, [approval, contract, todo]);
        let mut auth = Pending {
            pending: true,
            prepared: 0,
        };
        assert_eq!(
            prepare_flush(&mut state, Some(&mut auth)),
            [
                FlushGroup::Participant,
                FlushGroup::Table(Table::Todo),
                FlushGroup::Table(Table::Contract),
                FlushGroup::Table(Table::Approval),
            ]
        );
        assert_eq!(auth.prepared, 1);
        // Approve assigns pending-review again: no contract CAS/version bump.
        state.entities[contract.0].data = state.entities[contract.0]
            .original
            .clone()
            .ok_or_else(|| CommonFailure::unexpected("Contract fixture has no original row"))?;
        auth.pending = false;
        assert_eq!(
            prepare_flush(&mut state, Some(&mut auth)),
            [
                FlushGroup::Table(Table::Todo),
                FlushGroup::Table(Table::Approval),
            ]
        );
        assert_eq!(auth.prepared, 1);
        Ok(())
    }

    #[test]
    fn existing_common_dependencies_and_unqueued_new_ghosts_remain_bounded()
    -> Result<(), CommonFailure> {
        let mut state = CommonState::default();
        create(&mut state, Table::Projection, Data::new());
        create(&mut state, Table::Snapshot, Data::new());
        create(&mut state, Table::Definition, Data::new());
        assert_eq!(
            prepare_flush(&mut state, None),
            [
                FlushGroup::Table(Table::Definition),
                FlushGroup::Table(Table::Snapshot),
                FlushGroup::Table(Table::Projection),
            ]
        );
        // postCommitCleanup does not turn failed, child-only new objects into
        // an implicit fresh INSERT on a later unrelated flush.
        post_commit_cleanup(&mut state);
        assert!(prepare_flush(&mut state, None).is_empty());
        Ok(())
    }

    #[test]
    fn native_commnative01_initial_and_middle_flush_groups() -> Result<(), CommonFailure> {
        // Actual first-current CREATEs: FSS before its Rule, then the dirty
        // UPDATE groups in auth/todo/payout/approval order (SQL #1431..1441).
        let mut state = CommonState::default();
        let approval = manage(
            &mut state,
            Table::Approval,
            object([("currentStatus", Value::text("pending"))]),
        );
        let todo = manage(
            &mut state,
            Table::Todo,
            object([("status", Value::text("open"))]),
        );
        let payout = manage(
            &mut state,
            Table::Payout,
            object([("status", Value::text("pending-approval"))]),
        );
        assign(
            &mut state,
            approval,
            object([("currentStatus", Value::text("approved"))]),
        )?;
        assign(
            &mut state,
            todo,
            object([("status", Value::text("completed"))]),
        )?;
        assign(
            &mut state,
            payout,
            object([("status", Value::text("approved"))]),
        )?;
        create(&mut state, Table::FinalSettlement, Data::new());
        create(&mut state, Table::RuleExplanation, Data::new());
        for handle in [approval, payout, todo] {
            persist(&mut state, handle)?;
        }
        let mut auth = Pending {
            pending: true,
            prepared: 0,
        };
        assert_eq!(
            prepare_flush(&mut state, Some(&mut auth)),
            [
                FlushGroup::Participant,
                FlushGroup::Table(Table::Todo),
                FlushGroup::Table(Table::Payout),
                FlushGroup::Table(Table::Approval),
                FlushGroup::Table(Table::FinalSettlement),
                FlushGroup::Table(Table::RuleExplanation),
            ]
        );
        // Replacement's first flush explicitly persists only the superseded
        // FSS. Existing dirty common/payout/auth objects coflush (#1631..1639).
        let mut state = CommonState::default();
        for table in [Table::Approval, Table::Todo, Table::Payout] {
            let key = if table == Table::Approval {
                "currentStatus"
            } else {
                "status"
            };
            let row = manage(&mut state, table, object([(key, Value::text("pending"))]));
            assign(&mut state, row, object([(key, Value::text("changed"))]))?;
        }
        let current = manage(
            &mut state,
            Table::FinalSettlement,
            object([("isCurrent", Value::Bool(true))]),
        );
        assign(
            &mut state,
            current,
            object([("isCurrent", Value::Bool(false))]),
        )?;
        persist(&mut state, current)?;
        assert_eq!(
            prepare_flush(&mut state, Some(&mut auth)),
            [
                FlushGroup::Table(Table::Payout),
                FlushGroup::Table(Table::Todo),
                FlushGroup::Table(Table::Approval),
                FlushGroup::Participant,
                FlushGroup::Table(Table::FinalSettlement),
            ]
        );
        // Second flush has a new FSS and an old Rule UPDATE (#1643/#1645).
        assert_eq!(
            sort_groups(&[
                FlushGroup::Table(Table::FinalSettlement),
                FlushGroup::Table(Table::RuleExplanation)
            ]),
            [
                FlushGroup::Table(Table::FinalSettlement),
                FlushGroup::Table(Table::RuleExplanation),
            ]
        );
        Ok(())
    }
}
