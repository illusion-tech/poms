use std::{collections::HashMap, error::Error, sync::Arc, time::Duration};

use axum::{
    body::{Body, to_bytes},
    http::{Request, StatusCode},
    middleware,
};
use poms_api_rust::{
    auth::{
        cookie::AuthCookieService,
        http::{AuthHttpState, body_parser},
        service::AuthService,
    },
    compat::permissions::RawPermission,
    config::Config,
    database::Database,
    navigation::{
        NavigationItem, all_navigation, filter_navigation, http, navigation_for_user,
        navigation_snapshot, snapshot_for_tree,
    },
};
use serde_json::Value;
use tower::ServiceExt;

fn golden() -> Result<Value, serde_json::Error> {
    serde_json::from_str(include_str!(
        "../../../tools/rust-r2a/navigation-golden.json"
    ))
}

#[test]
fn every_actual_ts_oracle_case_is_consumed_without_mutating_the_tree() -> Result<(), Box<dyn Error>>
{
    let golden = golden()?;
    let cases = golden["cases"]
        .as_array()
        .ok_or("missing original TS cases")?;
    assert_eq!(cases.len(), 50);
    for case in cases {
        let name = case["name"].as_str().ok_or("missing case name")?;
        let tree: Vec<NavigationItem> = if case["tree"] == "ssot" {
            all_navigation().to_vec()
        } else {
            serde_json::from_value(case["tree"].clone())?
        };
        let before = serde_json::to_value(&tree)?;
        match case["kind"].as_str() {
            Some("filtered") => {
                let values: Vec<String> = serde_json::from_value(case["permissions"].clone())?;
                let permissions = values
                    .into_iter()
                    .map(RawPermission::new)
                    .collect::<Vec<_>>();
                let result = filter_navigation(&tree, &permissions);
                assert_eq!(
                    serde_json::to_value(result)?,
                    case["observed"]["navigation"],
                    "{name}"
                );
                if case["tree"] == "ssot" {
                    assert_eq!(
                        serde_json::to_value(navigation_for_user(&permissions))?,
                        case["observed"]["navigation"],
                        "{name}: embedded authority"
                    );
                }
            }
            Some("full-and-snapshot") => {
                assert_eq!(before, case["observed"]["fullTree"], "{name}: full tree");
                assert_eq!(
                    serde_json::to_value(snapshot_for_tree(&tree)?)?,
                    case["observed"]["snapshot"],
                    "{name}: exact Node stringify hash"
                );
            }
            _ => return Err("unconsumed original case kind".into()),
        }
        assert_eq!(
            serde_json::to_value(tree)?,
            before,
            "{name}: immutable authority"
        );
    }
    Ok(())
}

#[test]
fn original_authority_keeps_all_thirteen_fields_and_exact_unfiltered_snapshot()
-> Result<(), Box<dyn Error>> {
    let expected = golden()?;
    assert_eq!(
        serde_json::to_value(all_navigation())?,
        expected["original"]["fullTree"]
    );
    assert_eq!(
        serde_json::to_value(navigation_snapshot()?)?,
        expected["original"]["snapshot"]
    );
    fn fields(items: &[NavigationItem]) -> Result<(), Box<dyn Error>> {
        for item in items {
            let wire = serde_json::to_value(item)?;
            assert_eq!(
                wire.as_object().ok_or("non-object navigation item")?.len(),
                13
            );
            assert!(wire.get("requiredPermissions").is_some());
            assert!(wire.get("children").is_some());
            assert!(wire.get("meta").is_some());
            if let Some(children) = &item.children {
                fields(children)?;
            }
        }
        Ok(())
    }
    fields(all_navigation())
}

#[test]
fn recursive_openapi_and_effective_security_are_the_complete_spec_metadata()
-> Result<(), Box<dyn Error>> {
    let complete: Value =
        serde_json::from_str(include_str!("../../../libs/shared/api-spec/openapi.json"))?;
    let subset = http::openapi();
    let paths = subset["paths"]
        .as_object()
        .ok_or("missing navigation paths")?;
    assert_eq!(paths.len(), 3);
    for (path, methods) in paths {
        for (method, operation) in methods.as_object().ok_or("missing method map")? {
            assert_eq!(operation, &complete["paths"][path][method]);
            let effective = operation.get("security").or_else(|| subset.get("security"));
            let original = complete["paths"][path][method]
                .get("security")
                .or_else(|| complete.get("security"));
            assert_eq!(effective, original);
            assert!(
                operation.get("requestBody").is_none(),
                "No new body DTO for {path}"
            );
        }
    }
    for (name, schema) in subset["components"]["schemas"]
        .as_object()
        .ok_or("missing recursive schemas")?
    {
        assert_eq!(schema, &complete["components"]["schemas"][name]);
    }
    assert_eq!(
        subset["components"]["securitySchemes"],
        complete["components"]["securitySchemes"]
    );
    Ok(())
}

async fn closed_pool_application() -> Result<axum::Router, Box<dyn Error>> {
    let config = Config::from_map(&HashMap::from([
        ("DB_CONNECT".into(), "".into()),
        ("DB_HOST".into(), "127.0.0.1".into()),
        ("DB_PORT".into(), "1".into()),
        ("DB_DATABASE".into(), "poms_r2a_rust".into()),
        ("DB_USER".into(), "poms_r2a_app".into()),
        ("DB_PASSWORD".into(), "public-unused".into()),
    ]))?;
    let database = Database::new(&config.database).await?;
    database.close(Duration::from_secs(1)).await?;
    let state = AuthHttpState {
        service: Arc::new(AuthService::new(database, config.auth.clone())),
        cookies: AuthCookieService::from_auth_config(&config.auth),
    };
    Ok(http::router(state).layer(middleware::from_fn(body_parser)))
}

#[tokio::test]
async fn every_navigation_method_really_uses_the_session_guard_before_any_database_io()
-> Result<(), Box<dyn Error>> {
    for (method, path, body) in [
        ("GET", "/api/me/navigation?ignored=true", ""),
        ("GET", "/api/platform/navigation", ""),
        (
            "POST",
            "/api/platform/navigation:sync",
            "{\"ignored\":true}",
        ),
        ("POST", "/api/platform/navigation:sync", "[]"),
    ] {
        let response = closed_pool_application()
            .await?
            .oneshot(
                Request::builder()
                    .method(method)
                    .uri(path)
                    .header("content-type", "application/json")
                    .header("content-length", body.len())
                    .body(Body::from(body))?,
            )
            .await?;
        assert_eq!(
            response.status(),
            StatusCode::UNAUTHORIZED,
            "{method} {path}"
        );
        assert!(response.headers().get("set-cookie").is_none());
        let json: Value = serde_json::from_slice(&to_bytes(response.into_body(), 4096).await?)?;
        assert_eq!(
            json,
            serde_json::json!({"statusCode":401,"code":"session_missing","message":"Authentication required"})
        );
    }
    Ok(())
}

#[tokio::test]
async fn shared_parser_rejects_malformed_body_before_the_navigation_guard()
-> Result<(), Box<dyn Error>> {
    let response = closed_pool_application()
        .await?
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/platform/navigation:sync")
                .header("content-type", "application/json")
                .header("content-length", 7)
                .body(Body::from("{broken"))?,
        )
        .await?;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert!(response.headers().get("set-cookie").is_none());
    Ok(())
}
