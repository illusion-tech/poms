//! Original discussion target resolution, nullable association checks and
//! immutable thread snapshots. Conversion only changes list aggregation.

use std::{
    collections::{BTreeMap, HashMap, HashSet},
    error::Error as StdError,
    fmt,
    sync::OnceLock,
};

use axum::http::StatusCode;
use icu_collator::{
    Collator, CollatorPreferences,
    options::{AlternateHandling, CaseLevel, CollatorOptions, Strength},
    preferences::{CollationCaseFirst, CollationNumericOrdering},
};
use serde_json::{Value, json};
use sqlx::Connection;
use uuid::Uuid;

use super::{
    model::{Create, Query},
    store::{self, Comment, Target, Thread},
};
use crate::{
    auth::{
        model::{ResolvedSession, clock_now},
        store::flush_managed_session,
    },
    compat::{json::Field, scalars::js_iso_string},
    database::{Database, DbError},
    error::ApiError,
    projects::model::{Wire, trim_js},
};

#[derive(Debug)]
pub enum Error {
    BadRequest(String),
    NotFound(String),
    Database(DbError),
    Internal,
}

impl fmt::Display for Error {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("business discussion operation failed")
    }
}
impl StdError for Error {}
impl From<DbError> for Error {
    fn from(value: DbError) -> Self {
        Self::Database(value)
    }
}
impl Error {
    pub fn into_api_error(self) -> ApiError {
        match self {
            Self::BadRequest(message) => ApiError::message(StatusCode::BAD_REQUEST, message),
            Self::NotFound(message) => ApiError::message(StatusCode::NOT_FOUND, message),
            Self::Database(_) | Self::Internal => ApiError::internal(),
        }
    }
}

#[derive(Clone, Debug)]
pub struct Service {
    database: Database,
}

struct RelatedContact {
    id: Uuid,
    name: String,
}

impl Service {
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    pub async fn list(&self, input: Query) -> Result<Wire, Error> {
        let mut targets = Vec::new();
        if let Some(id) = input.customer_id.as_deref() {
            targets.push(self.require_target("customer", id).await?);
        }
        if let Some(id) = input.lead_id.as_deref() {
            targets.push(self.require_target("lead", id).await?);
        }
        if let Some(id) = input.project_id.as_deref() {
            let project = self.require_target("project", id).await?;
            let source_lead_id = project.source_lead_id;
            targets.push(project);
            if let Some(id) = source_lead_id {
                // A dangling source reference is skipped, as in the source.
                if let Some(source) = self.target("lead", &id.to_string()).await? {
                    targets.push(source);
                }
            }
        }
        assert_target_customers(&targets)?;
        let mut seen = HashSet::new();
        targets.retain(|target| {
            seen.insert((target.target_object_type.clone(), target.target_object_id))
        });
        let (threads, comments, contacts, users) = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let threads = store::threads(connection, &targets).await?;
                    let thread_ids = threads.iter().map(|thread| thread.id).collect::<Vec<_>>();
                    let comments = store::comments(connection, &thread_ids).await?;
                    let contact_ids = unique_ids(
                        comments
                            .iter()
                            .filter_map(|comment| comment.related_contact_id),
                    );
                    let user_ids =
                        unique_ids(comments.iter().filter_map(|comment| comment.created_by));
                    let mut contacts = HashMap::new();
                    for id in contact_ids {
                        if let Some(contact) = crate::opportunity_context::store::contact_by_id(
                            connection,
                            &id.to_string(),
                        )
                        .await?
                        {
                            contacts.insert(contact.id, contact.name);
                        }
                    }
                    let users = store::user_names(connection, &user_ids).await?;
                    Ok((threads, comments, contacts, users))
                })
            })
            .await?;
        let threads = threads
            .into_iter()
            .map(|thread| (thread.id, thread))
            .collect::<HashMap<_, _>>();
        let mut values = comments
            .iter()
            .map(|comment| {
                let thread = threads.get(&comment.thread_id).ok_or_else(|| {
                    Error::NotFound(format!(
                        "BusinessDiscussionThread {} not found",
                        comment.thread_id
                    ))
                })?;
                summary(comment, thread, &contacts, &users)
            })
            .collect::<Result<Vec<_>, Error>>()?;
        let collator = collator()?.as_borrowed();
        // Stable sort keeps the repository's full timestamp order within one
        // JS millisecond, without inventing a UUID tie.
        values.sort_by(|left, right| {
            collator.compare(
                left["createdAt"].as_str().unwrap_or_default(),
                right["createdAt"].as_str().unwrap_or_default(),
            )
        });
        Ok(Wire::value(Value::Array(values)))
    }

    pub async fn create(&self, input: Create, session: &ResolvedSession) -> Result<Wire, Error> {
        let target = self
            .require_target(&input.target_object_type, &input.target_object_id)
            .await?;
        let (contact, competitor, follow_up) = tokio::try_join!(
            self.related_contact(input.related_contact_id.as_ref(), &target),
            self.related_competitor(input.related_competitor_record_id.as_ref(), &target),
            self.related_follow_up(input.related_follow_up_record_id.as_ref(), &target),
        )?;
        let target_id = target.target_object_id;
        let target_type = target.target_object_type.clone();
        let existing_thread = self
            .database
            .with_connection(move |connection| {
                Box::pin(
                    async move { store::find_thread(connection, &target_type, target_id).await },
                )
            })
            .await?;
        let is_new = existing_thread.is_none();
        let thread = match existing_thread {
            Some(value) => value,
            None => Thread {
                id: random_uuid()?,
                target_object_type: target.target_object_type,
                target_object_id: target.target_object_id,
                customer_id: target.customer_id,
                lead_id: target.lead_id,
                project_id: target.project_id,
                target_title: target.target_title,
                created_at: clock_now(),
                created_by: Some(session.user.user_id),
            },
        };
        let original_body = trim_js(input.body);
        let comment = Comment {
            id: random_uuid()?,
            thread_id: thread.id,
            discussion_type: input.discussion_type,
            body: original_body.to_utf8_lossy(),
            related_contact_id: contact.as_ref().map(|value| value.id),
            related_competitor_record_id: competitor,
            related_follow_up_record_id: follow_up,
            is_pinned: input.is_pinned.unwrap_or(false),
            is_key_conclusion: input.is_key_conclusion.unwrap_or(false),
            created_at: clock_now(),
            created_by: Some(session.user.user_id),
        };
        let pending = session.pending_flush.clone();
        let (thread, comment) = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let mut transaction = connection.begin().await?;
                    let result: Result<(Thread, Comment), sqlx::Error> = async {
                        let thread = if is_new {
                            store::insert_or_get_thread(&mut transaction, &thread).await?
                        } else {
                            thread
                        };
                        let mut comment = comment;
                        comment.thread_id = thread.id;
                        store::insert_comment(&mut transaction, &comment).await?;
                        if let Some(pending) = pending.as_ref() {
                            flush_managed_session(&mut transaction, pending).await?;
                        }
                        Ok((thread, comment))
                    }
                    .await;
                    match result {
                        Ok(value) => {
                            transaction.commit().await?;
                            Ok(value)
                        }
                        Err(error) => {
                            transaction.rollback().await?;
                            Err(error)
                        }
                    }
                })
            })
            .await?;
        let operator = session.user.user_id;
        let users = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move { store::user_names(connection, &[operator]).await })
            })
            .await?;
        let contacts = contact
            .into_iter()
            .map(|value| (value.id, value.name))
            .collect();
        Ok(Wire::object(
            summary(&comment, &thread, &contacts, &users)?,
            &BTreeMap::from([("body".to_owned(), original_body)]),
        ))
    }

    async fn target(&self, kind: &str, id: &str) -> Result<Option<Target>, Error> {
        let id = id.to_owned();
        let kind = kind.to_owned();
        Ok(self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    match kind.as_str() {
                        "customer" => Ok(crate::customers::store::find_customer(connection, &id)
                            .await?
                            .map(|row| Target {
                                target_object_type: kind,
                                target_object_id: row.id,
                                customer_id: Some(row.id),
                                lead_id: None,
                                project_id: None,
                                target_title: row.display_name,
                                source_lead_id: None,
                            })),
                        "lead" => {
                            Ok(crate::leads::store::by_id(connection, &id)
                                .await?
                                .map(|row| Target {
                                    target_object_type: kind,
                                    target_object_id: row.id,
                                    customer_id: Some(row.customer_id),
                                    lead_id: Some(row.id),
                                    project_id: None,
                                    target_title: row.lead_name,
                                    source_lead_id: None,
                                }))
                        }
                        "project" => {
                            Ok(crate::projects::store::find(connection, &id)
                                .await?
                                .map(|row| Target {
                                    target_object_type: kind,
                                    target_object_id: row.id,
                                    customer_id: row.customer_id,
                                    lead_id: None,
                                    project_id: Some(row.id),
                                    target_title: row.project_name,
                                    source_lead_id: row.source_lead_id,
                                }))
                        }
                        _ => Ok(None),
                    }
                })
            })
            .await?)
    }

    async fn require_target(&self, kind: &str, id: &str) -> Result<Target, Error> {
        let type_name = match kind {
            "customer" => "Customer",
            "lead" => "Lead",
            "project" => "Project",
            _ => {
                return Err(Error::BadRequest(format!(
                    "Unsupported discussion target: {kind}"
                )));
            }
        };
        self.target(kind, id)
            .await?
            .ok_or_else(|| Error::NotFound(format!("{type_name} {id} not found")))
    }

    async fn related_contact(
        &self,
        id: Field<&String>,
        target: &Target,
    ) -> Result<Option<RelatedContact>, Error> {
        let Field::Value(id) = id else {
            return Ok(None);
        };
        let key = id.clone();
        let contact = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    crate::opportunity_context::store::contact_by_id(connection, &key).await
                })
            })
            .await?
            .ok_or_else(|| Error::NotFound(format!("CustomerContact {id} not found")))?;
        assert_customer("CustomerContact", id, contact.customer_id, target)?;
        Ok(Some(RelatedContact {
            id: contact.id,
            name: contact.name,
        }))
    }

    async fn related_competitor(
        &self,
        id: Field<&String>,
        target: &Target,
    ) -> Result<Option<Uuid>, Error> {
        let Field::Value(id) = id else {
            return Ok(None);
        };
        let key = id.clone();
        let record = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    crate::sales_intelligence::store::competitor_by_id(connection, &key).await
                })
            })
            .await?
            .ok_or_else(|| {
                Error::NotFound(format!("CompetitorIntelligenceRecord {id} not found"))
            })?;
        assert_opportunity(
            "CompetitorIntelligenceRecord",
            id,
            record.customer_id,
            record.lead_id,
            record.project_id,
            target,
        )?;
        Ok(Some(record.id))
    }

    async fn related_follow_up(
        &self,
        id: Field<&String>,
        target: &Target,
    ) -> Result<Option<Uuid>, Error> {
        let Field::Value(id) = id else {
            return Ok(None);
        };
        let key = id.clone();
        let record = self
            .database
            .with_connection(move |connection| {
                Box::pin(async move {
                    crate::opportunity_context::store::follow_up_by_id(connection, &key).await
                })
            })
            .await?
            .ok_or_else(|| Error::NotFound(format!("SalesFollowUpRecord {id} not found")))?;
        assert_opportunity(
            "SalesFollowUpRecord",
            id,
            record.customer_id,
            record.lead_id,
            record.project_id,
            target,
        )?;
        Ok(Some(record.id))
    }
}

fn assert_target_customers(targets: &[Target]) -> Result<(), Error> {
    if targets
        .iter()
        .filter_map(|target| target.customer_id)
        .collect::<HashSet<_>>()
        .len()
        > 1
    {
        return Err(Error::BadRequest(
            "Discussion query anchors must belong to the same customer".to_owned(),
        ));
    }
    Ok(())
}

fn assert_customer(kind: &str, id: &str, customer_id: Uuid, target: &Target) -> Result<(), Error> {
    if let Some(expected) = target.customer_id
        && customer_id != expected
    {
        return Err(Error::BadRequest(format!(
            "{kind} {id} does not belong to customer {expected}"
        )));
    }
    Ok(())
}

fn assert_opportunity(
    kind: &str,
    id: &str,
    customer_id: Uuid,
    lead_id: Option<Uuid>,
    project_id: Option<Uuid>,
    target: &Target,
) -> Result<(), Error> {
    assert_customer(kind, id, customer_id, target)?;
    if let (Some(expected), Some(actual)) = (target.project_id, project_id)
        && expected != actual
    {
        return Err(Error::BadRequest(format!(
            "{kind} {id} does not belong to project {expected}"
        )));
    }
    if let (Some(expected), Some(actual)) = (target.lead_id, lead_id)
        && expected != actual
    {
        return Err(Error::BadRequest(format!(
            "{kind} {id} does not belong to lead {expected}"
        )));
    }
    Ok(())
}

fn unique_ids(ids: impl Iterator<Item = Uuid>) -> Vec<Uuid> {
    let mut seen = HashSet::new();
    ids.filter(|id| seen.insert(*id)).collect()
}

fn summary(
    comment: &Comment,
    thread: &Thread,
    contacts: &HashMap<Uuid, String>,
    users: &HashMap<Uuid, String>,
) -> Result<Value, Error> {
    Ok(json!({
        "id":comment.id,"threadId":comment.thread_id,"targetObjectType":thread.target_object_type,
        "targetObjectId":thread.target_object_id,"targetTitle":thread.target_title,
        "customerId":thread.customer_id,"leadId":thread.lead_id,"projectId":thread.project_id,
        "discussionType":comment.discussion_type,"body":comment.body,
        "relatedContactId":comment.related_contact_id,
        "relatedContactName":comment.related_contact_id.and_then(|id| contacts.get(&id)),
        "relatedCompetitorRecordId":comment.related_competitor_record_id,
        "relatedFollowUpRecordId":comment.related_follow_up_record_id,
        "isPinned":comment.is_pinned,"isKeyConclusion":comment.is_key_conclusion,
        "createdAt":js_iso_string(comment.created_at).map_err(|_| Error::Internal)?,
        "createdBy":comment.created_by,"createdByName":comment.created_by.and_then(|id| users.get(&id)),
    }))
}

fn random_uuid() -> Result<Uuid, Error> {
    let mut bytes = [0_u8; 16];
    getrandom::fill(&mut bytes).map_err(|_| Error::Internal)?;
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    Ok(Uuid::from_bytes(bytes))
}

fn collator() -> Result<&'static Collator, Error> {
    static VALUE: OnceLock<Result<Collator, ()>> = OnceLock::new();
    VALUE
        .get_or_init(|| {
            let locale: icu_locale_core::Locale = "en-US".parse().map_err(|_| ())?;
            let mut preferences: CollatorPreferences = locale.into();
            preferences.case_first = Some(CollationCaseFirst::False);
            preferences.numeric_ordering = Some(CollationNumericOrdering::False);
            let mut options = CollatorOptions::default();
            options.strength = Some(Strength::Tertiary);
            options.alternate_handling = Some(AlternateHandling::NonIgnorable);
            options.case_level = Some(CaseLevel::Off);
            Collator::try_new_unstable(&crate::roles::collation::NodeData, preferences, options)
                .map_err(|_| ())
        })
        .as_ref()
        .map_err(|_| Error::Internal)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn id(value: u128) -> Uuid {
        Uuid::from_u128(value)
    }
    fn target(
        customer_id: Option<Uuid>,
        lead_id: Option<Uuid>,
        project_id: Option<Uuid>,
    ) -> Target {
        Target {
            target_object_type: "project".into(),
            target_object_id: id(1),
            customer_id,
            lead_id,
            project_id,
            target_title: "snapshot".into(),
            source_lead_id: Some(id(9)),
        }
    }

    #[test]
    fn nullable_project_context_does_not_become_a_source_lead_restriction() {
        let project = target(None, None, Some(id(1)));
        assert!(assert_opportunity("Record", "raw", id(2), Some(id(8)), None, &project).is_ok());
        assert!(
            assert_opportunity("Record", "raw", id(2), Some(id(8)), Some(id(3)), &project).is_err()
        );
        let customer = target(Some(id(2)), None, None);
        assert!(
            assert_opportunity("Record", "raw", id(2), Some(id(8)), Some(id(3)), &customer).is_ok()
        );
        assert!(assert_opportunity("Record", "raw", id(4), None, None, &customer).is_err());
    }

    #[test]
    fn query_customer_alignment_allows_unrelated_same_customer_opportunities() {
        assert!(
            assert_target_customers(&[
                target(Some(id(2)), Some(id(3)), None),
                target(Some(id(2)), None, Some(id(4))),
                target(None, None, Some(id(5)))
            ])
            .is_ok()
        );
        assert!(
            assert_target_customers(&[
                target(Some(id(2)), None, None),
                target(Some(id(3)), None, None)
            ])
            .is_err()
        );
    }

    #[test]
    fn comment_projection_keeps_all_nineteen_fields_and_missing_context_null() {
        let at = clock_now();
        let thread = Thread {
            id: id(1),
            target_object_type: "project".into(),
            target_object_id: id(2),
            customer_id: None,
            lead_id: None,
            project_id: Some(id(2)),
            target_title: "old title".into(),
            created_at: at,
            created_by: None,
        };
        let comment = Comment {
            id: id(3),
            thread_id: id(1),
            discussion_type: "general".into(),
            body: "body".into(),
            related_contact_id: Some(id(4)),
            related_competitor_record_id: Some(id(5)),
            related_follow_up_record_id: Some(id(6)),
            is_pinned: true,
            is_key_conclusion: false,
            created_at: at,
            created_by: Some(id(7)),
        };
        let value = summary(&comment, &thread, &HashMap::new(), &HashMap::new())
            .unwrap_or_else(|_| panic!("projection"));
        assert_eq!(value.as_object().map(|value| value.len()), Some(19));
        assert_eq!(value["targetTitle"], "old title");
        assert_eq!(value["relatedContactId"], id(4).to_string());
        assert!(
            value["relatedContactName"].is_null()
                && value["createdByName"].is_null()
                && value["leadId"].is_null()
        );
    }
}
