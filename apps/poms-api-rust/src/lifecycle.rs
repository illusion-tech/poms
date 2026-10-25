//! HTTP shutdown has one deadline, including connection-pool closure.
use crate::{database::Database, logging};
use axum::Router;
use serde_json::json;
use std::{future::Future, time::Duration};
use tokio::{net::TcpListener, sync::watch, time::Instant};

#[derive(Debug, PartialEq, Eq)]
pub enum ShutdownError {
    ServerStopped,
    DeadlineExceeded,
    DatabaseCloseFailed,
}

pub async fn serve(
    listener: TcpListener,
    router: Router,
    database: Database,
    shutdown_timeout: Duration,
    shutdown: impl Future<Output = ()> + Send + 'static,
) -> Result<(), ShutdownError> {
    let (stop, mut stopped) = watch::channel(false);
    let mut server = tokio::spawn(async move {
        axum::serve(listener, router)
            .with_graceful_shutdown(async move {
                let _ = stopped.changed().await;
            })
            .await
    });

    tokio::select! {
        _ = shutdown => {},
        _ = &mut server => {
            let _ = database.close(shutdown_timeout).await;
            return Err(ShutdownError::ServerStopped);
        }
    }
    logging::event("shutdown_started", json!({}));
    let deadline = Instant::now() + shutdown_timeout;
    let _ = stop.send(true);
    let result = tokio::time::timeout_at(deadline, &mut server).await;
    let server_ok = matches!(result, Ok(Ok(Ok(()))));
    if !server_ok {
        // The binary exits after this error. Tokio tears down any remaining
        // per-connection tasks; this is not reported as a graceful completion.
        server.abort();
    }
    let remaining = deadline.saturating_duration_since(Instant::now());
    let closed = database.close(remaining).await.is_ok();
    if !server_ok {
        return Err(ShutdownError::DeadlineExceeded);
    }
    if !closed {
        return Err(ShutdownError::DatabaseCloseFailed);
    }
    logging::event("shutdown_complete", json!({}));
    Ok(())
}

#[cfg(unix)]
pub fn shutdown_signal() -> std::io::Result<impl Future<Output = ()> + Send> {
    use tokio::signal::unix::{SignalKind, signal};
    let mut terminate = signal(SignalKind::terminate())?;
    let mut interrupt = signal(SignalKind::interrupt())?;
    Ok(async move {
        tokio::select! {
            _ = terminate.recv() => {},
            _ = interrupt.recv() => {},
        }
    })
}

#[cfg(not(unix))]
pub fn shutdown_signal() -> std::io::Result<impl Future<Output = ()> + Send> {
    Ok(async {
        let _ = tokio::signal::ctrl_c().await;
    })
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;
    use crate::config::Config;
    use axum::routing::get;
    use std::{collections::HashMap, sync::Arc};
    use tokio::{
        io::{AsyncReadExt, AsyncWriteExt},
        net::TcpStream,
        sync::{Notify, oneshot},
    };

    async fn in_flight(deadline: Duration, release_before_deadline: bool) {
        let config = Config::from_map(&HashMap::new()).unwrap();
        let database = Database::new(&config.database).await.unwrap();
        let pool = database.pool().clone();
        let entered = Arc::new(Notify::new());
        let release = Arc::new(Notify::new());
        let handler_entered = entered.clone();
        let handler_release = release.clone();
        let router = Router::new().route(
            "/blocked",
            get(move || {
                let entered = handler_entered.clone();
                let release = handler_release.clone();
                async move {
                    entered.notify_one();
                    release.notified().await;
                    "finished"
                }
            }),
        );
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let (stop, stopped) = oneshot::channel();
        let server = tokio::spawn(serve(listener, router, database, deadline, async {
            let _ = stopped.await;
        }));
        let mut client = TcpStream::connect(address).await.unwrap();
        client
            .write_all(b"GET /blocked HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
            .await
            .unwrap();
        tokio::time::timeout(Duration::from_secs(2), entered.notified())
            .await
            .unwrap();
        let started = Instant::now();
        stop.send(()).unwrap();
        if release_before_deadline {
            // Ensure a signal does not abort an already executing handler.
            tokio::time::sleep(Duration::from_millis(30)).await;
            assert!(!server.is_finished());
            release.notify_one();
            assert_eq!(server.await.unwrap(), Ok(()));
            let mut body = String::new();
            client.read_to_string(&mut body).await.unwrap();
            assert!(body.starts_with("HTTP/1.1 200"));
            assert!(body.ends_with("finished"));
        } else {
            assert_eq!(server.await.unwrap(), Err(ShutdownError::DeadlineExceeded));
            assert!(started.elapsed() < deadline + Duration::from_secs(1));
            // Test-only handler cleanup; the binary tears down its runtime on failure.
            release.notify_one();
        }
        assert!(pool.is_closed());
        assert!(TcpStream::connect(address).await.is_err());
    }

    #[tokio::test]
    async fn graceful_shutdown_drains_in_flight_request() {
        in_flight(Duration::from_secs(2), true).await;
    }

    #[tokio::test]
    async fn hung_request_exits_at_shutdown_deadline() {
        in_flight(Duration::from_millis(80), false).await;
    }
}
