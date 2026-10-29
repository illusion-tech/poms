use poms_api_rust::{config::Config, database::Database, http, lifecycle, logging};
use serde_json::json;
use std::{process::ExitCode, sync::Arc, time::Instant};
use tokio::net::TcpListener;

fn main() -> ExitCode {
    match poms_api_rust::process_runtime::run(run()) {
        Ok(result) => result,
        Err(_) => {
            logging::event("startup_failed", json!({"stage": "runtime"}));
            ExitCode::FAILURE
        }
    }
}

async fn run() -> ExitCode {
    let started_at = Instant::now();
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.as_slice() == ["--openapi"] {
        match serde_json::to_string_pretty(&http::openapi()) {
            Ok(document) => {
                println!("{document}");
                return ExitCode::SUCCESS;
            }
            Err(_) => return ExitCode::FAILURE,
        }
    }
    if !args.is_empty() {
        logging::event("startup_failed", json!({"stage": "arguments"}));
        return ExitCode::from(11);
    }
    let config = match Config::load() {
        Ok(config) => config,
        Err(error) => {
            // ConfigError contains a static field name/category, never its value.
            logging::event(
                "startup_failed",
                json!({"stage": "config", "reason": error.to_string()}),
            );
            return ExitCode::from(11);
        }
    };
    let shutdown = match lifecycle::shutdown_signal() {
        Ok(shutdown) => shutdown,
        Err(_) => {
            logging::event("startup_failed", json!({"stage": "signals"}));
            return ExitCode::FAILURE;
        }
    };
    let mut shutdown = Box::pin(shutdown);
    let initialized = tokio::select! {
        biased;
        _ = &mut shutdown => {
            // Drop the in-progress connect future before any socket is exposed.
            // Process/runtime teardown closes the unfinished connection attempt.
            logging::event("startup_cancelled", json!({"stage": "database"}));
            return ExitCode::SUCCESS;
        }
        result = Database::new(&config.database) => result,
    };
    let database = match initialized {
        Ok(database) => database,
        Err(error) => {
            logging::event(
                "startup_failed",
                json!({"stage": "database", "kind": format!("{:?}", error.kind()), "sqlstate": error.sqlstate()}),
            );
            return ExitCode::FAILURE;
        }
    };
    let bound = tokio::select! {
        biased;
        _ = &mut shutdown => {
            logging::event("startup_cancelled", json!({"stage": "bind"}));
            return if database.close(config.shutdown_timeout).await.is_ok() {
                ExitCode::SUCCESS
            } else {
                ExitCode::FAILURE
            };
        }
        result = TcpListener::bind((config.host.as_str(), config.port)) => result,
    };
    let listener = match bound {
        Ok(listener) => listener,
        Err(error) => {
            logging::event(
                "startup_failed",
                json!({"stage": "bind", "kind": format!("{:?}", error.kind())}),
            );
            let _ = database.close(config.shutdown_timeout).await;
            return ExitCode::FAILURE;
        }
    };
    let address = listener
        .local_addr()
        .map(|a| a.to_string())
        .unwrap_or_default();
    let auth = poms_api_rust::auth::http::AuthHttpState {
        cookies: poms_api_rust::auth::cookie::AuthCookieService::from_auth_config(&config.auth),
        service: Arc::new(poms_api_rust::auth::service::AuthService::new(
            database.clone(),
            config.auth.clone(),
        )),
    };
    let router = http::router_with_runtime_settings(
        http::AppState {
            database: database.clone(),
            started_at,
        },
        &config.cors_origins,
        auth,
        config.providers.clone(),
        config.attachment_storage.clone(),
    );
    logging::event(
        "listening",
        json!({"address": address, "environment": config.environment}),
    );
    match lifecycle::serve(
        listener,
        router,
        database,
        config.shutdown_timeout,
        shutdown,
    )
    .await
    {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            logging::event("shutdown_failed", json!({"reason": format!("{error:?}")}));
            ExitCode::FAILURE
        }
    }
}
