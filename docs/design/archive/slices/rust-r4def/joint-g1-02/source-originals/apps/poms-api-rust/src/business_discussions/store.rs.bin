//! Discussion-owned SQL only. Shared business-object lookups use their owners'
//! borrowed-connection bridges; no status qualification is added here.

use std::collections::HashMap;

use chrono::{DateTime, Utc};
use sqlx::{PgConnection, Postgres, QueryBuilder, Row, postgres::PgRow};
use uuid::Uuid;

#[derive(Clone, Debug)]
pub(crate) struct Target {
    pub target_object_type: String,
    pub target_object_id: Uuid,
    pub customer_id: Option<Uuid>,
    pub lead_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
    pub target_title: String,
    pub source_lead_id: Option<Uuid>,
}

#[derive(Clone, Debug)]
pub(crate) struct Thread {
    pub id: Uuid,
    pub target_object_type: String,
    pub target_object_id: Uuid,
    pub customer_id: Option<Uuid>,
    pub lead_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
    pub target_title: String,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

#[derive(Clone, Debug)]
pub(crate) struct Comment {
    pub id: Uuid,
    pub thread_id: Uuid,
    pub discussion_type: String,
    pub body: String,
    pub related_contact_id: Option<Uuid>,
    pub related_competitor_record_id: Option<Uuid>,
    pub related_follow_up_record_id: Option<Uuid>,
    pub is_pinned: bool,
    pub is_key_conclusion: bool,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

fn thread(row: PgRow) -> Result<Thread, sqlx::Error> {
    Ok(Thread {
        id: row.try_get("id")?,
        target_object_type: row.try_get("target_object_type")?,
        target_object_id: row.try_get("target_object_id")?,
        customer_id: row.try_get("customer_id")?,
        lead_id: row.try_get("lead_id")?,
        project_id: row.try_get("project_id")?,
        target_title: row.try_get("target_title")?,
        created_at: row.try_get("created_at")?,
        created_by: row.try_get("created_by")?,
    })
}

fn comment(row: PgRow) -> Result<Comment, sqlx::Error> {
    Ok(Comment {
        id: row.try_get("id")?,
        thread_id: row.try_get("thread_id")?,
        discussion_type: row.try_get("discussion_type")?,
        body: row.try_get("body")?,
        related_contact_id: row.try_get("related_contact_id")?,
        related_competitor_record_id: row.try_get("related_competitor_record_id")?,
        related_follow_up_record_id: row.try_get("related_follow_up_record_id")?,
        is_pinned: row.try_get("is_pinned")?,
        is_key_conclusion: row.try_get("is_key_conclusion")?,
        created_at: row.try_get("created_at")?,
        created_by: row.try_get("created_by")?,
    })
}

pub(crate) async fn find_thread(
    connection: &mut PgConnection,
    target_type: &str,
    target_id: Uuid,
) -> Result<Option<Thread>, sqlx::Error> {
    sqlx::query("SELECT * FROM poms.business_discussion_thread WHERE target_object_type=$1 AND target_object_id=$2 LIMIT 1")
        .bind(target_type).bind(target_id).fetch_optional(connection).await?.map(thread).transpose()
}

pub(crate) async fn threads(
    connection: &mut PgConnection,
    targets: &[Target],
) -> Result<Vec<Thread>, sqlx::Error> {
    if targets.is_empty() {
        return Ok(Vec::new());
    }
    let mut query =
        QueryBuilder::<Postgres>::new("SELECT * FROM poms.business_discussion_thread WHERE ");
    for (index, target) in targets.iter().enumerate() {
        if index > 0 {
            query.push(" OR ");
        }
        query
            .push("(target_object_type=")
            .push_bind(&target.target_object_type)
            .push(" AND target_object_id=")
            .push_bind(target.target_object_id)
            .push(")");
    }
    query
        .build()
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(thread)
        .collect()
}

pub(crate) async fn comments(
    connection: &mut PgConnection,
    ids: &[Uuid],
) -> Result<Vec<Comment>, sqlx::Error> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    // No flag or UUID tiebreaker. Database precision orders before the source's
    // later stable sort of JS millisecond ISO strings.
    sqlx::query("SELECT * FROM poms.business_discussion_comment WHERE thread_id=ANY($1) ORDER BY created_at ASC")
        .bind(ids).fetch_all(connection).await?.into_iter().map(comment).collect()
}

pub(crate) async fn insert_or_get_thread(
    connection: &mut PgConnection,
    value: &Thread,
) -> Result<Thread, sqlx::Error> {
    // Two first comments may both have observed no thread. The unique target
    // key resolves that race without losing either comment or rewriting the
    // winning thread's original title/anchor snapshot.
    let inserted = sqlx::query("INSERT INTO poms.business_discussion_thread (id,target_object_type,target_object_id,customer_id,lead_id,project_id,target_title,created_at,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (target_object_type,target_object_id) DO NOTHING RETURNING *")
        .bind(value.id).bind(&value.target_object_type).bind(value.target_object_id)
        .bind(value.customer_id).bind(value.lead_id).bind(value.project_id).bind(&value.target_title)
        .bind(value.created_at).bind(value.created_by).fetch_optional(&mut *connection).await?;
    if let Some(row) = inserted {
        return thread(row);
    }
    // A new statement observes the committed winner after ON CONFLICT waits
    // for it. No no-op UPDATE is used to overwrite historical thread fields.
    find_thread(
        connection,
        &value.target_object_type,
        value.target_object_id,
    )
    .await?
    .ok_or_else(|| {
        sqlx::Error::Protocol("discussion thread unavailable after target conflict".into())
    })
}

pub(crate) async fn insert_comment(
    connection: &mut PgConnection,
    value: &Comment,
) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO poms.business_discussion_comment (id,thread_id,discussion_type,body,related_contact_id,related_competitor_record_id,related_follow_up_record_id,is_pinned,is_key_conclusion,created_at,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)")
        .bind(value.id).bind(value.thread_id).bind(&value.discussion_type).bind(&value.body)
        .bind(value.related_contact_id).bind(value.related_competitor_record_id).bind(value.related_follow_up_record_id)
        .bind(value.is_pinned).bind(value.is_key_conclusion).bind(value.created_at).bind(value.created_by)
        .execute(connection).await?;
    Ok(())
}

pub(crate) async fn user_names(
    connection: &mut PgConnection,
    ids: &[Uuid],
) -> Result<HashMap<Uuid, String>, sqlx::Error> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }
    sqlx::query("SELECT id,display_name FROM poms.platform_user WHERE id=ANY($1)")
        .bind(ids)
        .fetch_all(connection)
        .await?
        .into_iter()
        .map(|row| Ok((row.try_get("id")?, row.try_get("display_name")?)))
        .collect()
}
