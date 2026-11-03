//! The four existing read projections consumed by attachment handover operations.
//! Authorization, missing-row errors and request-local flushes belong to the
//! attachment service. These reads add no status gate, write or transaction.

use crate::{attachment_storage::StorageFailure, database::Database};
use sqlx::Row;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HandoverFact {
    pub id: String,
    pub project_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProjectFact {
    pub id: String,
    pub source_lead_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ContractSource {
    pub id: String,
    pub contract_no: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FollowUpSource {
    pub id: String,
}

#[derive(Clone)]
pub struct HandoverFacts {
    database: Database,
}

impl HandoverFacts {
    /// Retains the existing pool; construction does not acquire a connection.
    pub fn new(database: Database) -> Self {
        Self { database }
    }

    pub async fn find_handover(&self, id: &str) -> Result<Option<HandoverFact>, StorageFailure> {
        let id = id.to_owned();
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    sqlx::query(
                        "SELECT id::text AS id, project_id::text AS project_id \
                         FROM poms.project_handover WHERE id=$1::text::uuid LIMIT 1",
                    )
                    .bind(id)
                    .fetch_optional(connection)
                    .await?
                    .map(|row| {
                        Ok(HandoverFact {
                            id: row.try_get("id")?,
                            project_id: row.try_get("project_id")?,
                        })
                    })
                    .transpose()
                })
            })
            .await
            .map_err(|error| StorageFailure::unexpected(error.to_string()))
    }

    pub async fn find_project(&self, id: &str) -> Result<Option<ProjectFact>, StorageFailure> {
        let id = id.to_owned();
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    sqlx::query(
                        "SELECT id::text AS id, source_lead_id::text AS source_lead_id \
                         FROM poms.project WHERE id=$1::text::uuid LIMIT 1",
                    )
                    .bind(id)
                    .fetch_optional(connection)
                    .await?
                    .map(|row| {
                        Ok(ProjectFact {
                            id: row.try_get("id")?,
                            source_lead_id: row.try_get("source_lead_id")?,
                        })
                    })
                    .transpose()
                })
            })
            .await
            .map_err(|error| StorageFailure::unexpected(error.to_string()))
    }

    pub async fn find_contracts_by_project(
        &self,
        project_id: &str,
    ) -> Result<Vec<ContractSource>, StorageFailure> {
        let project_id = project_id.to_owned();
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    sqlx::query(
                        "SELECT id::text AS id, contract_no FROM poms.contract \
                         WHERE project_id=$1::text::uuid ORDER BY created_at DESC",
                    )
                    .bind(project_id)
                    .fetch_all(connection)
                    .await?
                    .into_iter()
                    .map(|row| {
                        Ok(ContractSource {
                            id: row.try_get("id")?,
                            contract_no: row.try_get("contract_no")?,
                        })
                    })
                    .collect()
                })
            })
            .await
            .map_err(|error| StorageFailure::unexpected(error.to_string()))
    }

    pub async fn find_followups_for_sources(
        &self,
        project_id: &str,
        source_lead_id: Option<&str>,
    ) -> Result<Vec<FollowUpSource>, StorageFailure> {
        let project_id = project_id.to_owned();
        // Match the original truthy sourceLeadId branch without changing UUID
        // validation: nonempty inputs still go through PostgreSQL's UUID cast.
        let source_lead_id = source_lead_id
            .filter(|value| !value.is_empty())
            .map(str::to_owned);
        self.database
            .with_connection(move |connection| {
                Box::pin(async move {
                    let sql: &'static str = if source_lead_id.is_some() {
                        "SELECT id::text AS id FROM poms.sales_follow_up_record \
                         WHERE project_id=$1::text::uuid OR lead_id=$2::text::uuid \
                         ORDER BY occurred_at DESC, created_at DESC"
                    } else {
                        "SELECT id::text AS id FROM poms.sales_follow_up_record \
                         WHERE project_id=$1::text::uuid \
                         ORDER BY occurred_at DESC, created_at DESC"
                    };
                    let mut query = sqlx::query(sql).bind(project_id);
                    if let Some(lead_id) = source_lead_id {
                        query = query.bind(lead_id);
                    }
                    query
                        .fetch_all(connection)
                        .await?
                        .into_iter()
                        .map(|row| {
                            Ok(FollowUpSource {
                                id: row.try_get("id")?,
                            })
                        })
                        .collect()
                })
            })
            .await
            .map_err(|error| StorageFailure::unexpected(error.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::HandoverFacts;
    use crate::{config::DatabaseConfig, database::Database};
    use std::{error::Error, time::Duration};

    fn lazy_config() -> DatabaseConfig {
        DatabaseConfig {
            host: "127.0.0.1".into(),
            port: 1,
            username: "facts_no_network".into(),
            password: "explicit-non-credential".into(),
            database: "facts_no_network".into(),
            url: None,
            connect: false,
            max_connections: 1,
            acquire_timeout: Duration::from_secs(1),
            query_timeout: Duration::from_secs(1),
            statement_timeout: Duration::from_secs(1),
        }
    }

    #[tokio::test]
    async fn constructing_and_cloning_facts_never_acquires_a_connection()
    -> Result<(), Box<dyn Error>> {
        let database = Database::new(&lazy_config()).await?;
        let facts = HandoverFacts::new(database.clone());
        let cloned = facts.clone();
        assert_eq!(database.pool().size(), 0);
        assert_eq!(database.pool().num_idle(), 0);
        drop(cloned);
        drop(facts);
        database.close(Duration::from_secs(1)).await?;
        Ok(())
    }

    #[tokio::test]
    async fn an_unavailable_pool_is_not_missing_or_empty_facts() -> Result<(), Box<dyn Error>> {
        let database = Database::new(&lazy_config()).await?;
        database.close(Duration::from_secs(1)).await?;
        let facts = HandoverFacts::new(database);
        let id = "83000000-0000-4000-8000-000000000001";
        let outcomes = [
            facts.find_handover(id).await.map(|_| ()),
            facts.find_project(id).await.map(|_| ()),
            facts.find_contracts_by_project(id).await.map(|_| ()),
            facts.find_followups_for_sources(id, None).await.map(|_| ()),
            facts
                .find_followups_for_sources(id, Some(id))
                .await
                .map(|_| ()),
        ];
        for outcome in outcomes {
            let Err(failure) = outcome else {
                return Err(
                    "closed pool must fail instead of returning missing or empty facts".into(),
                );
            };
            assert!(failure.status.is_none());
            assert_eq!(failure.message.to_utf8_lossy(), "database is unavailable");
        }
        Ok(())
    }
}
