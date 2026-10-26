//! Real PG15 audit acceptance; invoked only by the marker-verifying wrapper.
use std::{collections::HashMap, time::Duration};

use poms_api_rust::{
    auth::{
        projection::{self, ProjectionInput},
        service::AuthService,
    },
    config::Config,
    database::Database,
};
use serde_json::json;
use sqlx::Row;
#[path = "support/r1c_guard.rs"]
mod r1c_guard;

#[tokio::test]
#[ignore = "requires check.sh db and dedicated marked PG15"]
async fn projection_appends_one_batch_event_and_propagates_real_insert_failure()
-> Result<(), Box<dyn std::error::Error>> {
    let database_config = r1c_guard::target_config().await?;
    let config = Config::from_map(&HashMap::new())?;
    let database = Database::new(&database_config).await?;
    let mut run = [0_u8; 16];
    getrandom::fill(&mut run)?;
    let run_id = uuid::Uuid::from_bytes(run).to_string();
    let request_path = format!("/synthetic/r1c-projection/{run_id}");
    let service = AuthService::new(database.clone(), config.auth);
    let input: ProjectionInput = serde_json::from_value(json!({
        "fieldPackageKey": "contract-finance",
        "fields": [{"key":"a","rawValue":"SYNTHETIC-SECRET"},{"key":"b","rawValue":"SYNTHETIC-SECRET-2"}],
        "user":null,"targetType":"synthetic","targetId":run_id,
        "requestContext":{"path":request_path}
    }))?;
    let test_database = database.clone();
    let test_path = request_path.clone();
    let result = tokio::spawn(async move {
        let projected = projection::project_fields(&service, &input)
            .await
            .map_err(|error| format!("{error:?}"))?;
        assert!(projected.values().all(|value| value.value.is_none()));
        let rows = sqlx::query(
            "SELECT event_type,severity,method,details FROM poms.security_event WHERE path=$1",
        )
        .bind(&test_path)
        .fetch_all(test_database.pool())
        .await?;
        assert_eq!(rows.len(), 1);
        assert_eq!(
            rows[0].try_get::<&str, _>("event_type")?,
            "sensitive_field.masked"
        );
        assert_eq!(rows[0].try_get::<&str, _>("method")?, "QUERY");
        let details: serde_json::Value = rows[0].try_get("details")?;
        assert_eq!(details["hiddenFieldCount"], 2);
        assert!(!details.to_string().contains("SYNTHETIC-SECRET"));
        // A real varchar length violation fails the independent audit INSERT;
        // the projection service must not return a successful hidden result.
        let mut invalid = input.clone();
        invalid.request_context.path = "x".repeat(4096);
        assert!(
            projection::project_fields(&service, &invalid)
                .await
                .is_err()
        );
        Ok::<_, Box<dyn std::error::Error + Send + Sync>>(())
    })
    .await;
    // Remove only this run's event, including after an assertion panic.
    sqlx::query("DELETE FROM poms.security_event WHERE path=$1")
        .bind(&request_path)
        .execute(database.pool())
        .await?;
    database.close(Duration::from_secs(5)).await?;
    result?.map_err(|error| error.to_string().into())
}
