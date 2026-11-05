//! Shared read-only provider projection, original identity crypto and upstream I/O.
//! Business decisions and independent flush boundaries remain in G/H services.

mod settings;
mod state;
mod upstream;

pub use settings::ProviderSettings;
pub use state::{StateSigner, SupportError};
pub use upstream::{
    QueryEncoding, UpstreamError, UpstreamHttpClient, UpstreamRequest, UpstreamResponse,
};

use std::sync::Arc;

use sqlx::Row;
use uuid::Uuid;

use crate::{
    auth::crypto::{SecretCipher, SecretCipherOptions},
    database::{Database, DbError},
};

#[derive(Clone)]
pub struct ProviderRuntimeConfig {
    pub id: Uuid,
    pub provider: String,
    pub client_id: String,
    pub enabled: bool,
    pub encrypted_client_secret: Option<String>,
    pub status: String,
}

impl std::fmt::Debug for ProviderRuntimeConfig {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("ProviderRuntimeConfig")
            .field("id", &self.id)
            .field("enabled", &self.enabled)
            .field("client_id", &"[redacted]")
            .field("encrypted_client_secret", &"[redacted]")
            .finish_non_exhaustive()
    }
}

pub async fn read_provider_runtime_config(
    database: &Database,
    id: &str,
) -> Result<Option<ProviderRuntimeConfig>, DbError> {
    let id = id.to_owned();
    database
        .with_connection(move |connection| {
            Box::pin(async move {
                sqlx::query("SELECT id,provider,client_id,enabled,encrypted_client_secret,status FROM poms.identity_provider_config WHERE id=$1::text::uuid")
                    .bind(id)
                    .fetch_optional(connection)
                    .await?
                    .map(|row| {
                        Ok(ProviderRuntimeConfig {
                            id: row.try_get("id")?,
                            provider: row.try_get("provider")?,
                            client_id: row.try_get("client_id")?,
                            enabled: row.try_get("enabled")?,
                            encrypted_client_secret: row.try_get("encrypted_client_secret")?,
                            status: row.try_get("status")?,
                        })
                    })
                    .transpose()
            })
        })
        .await
}

#[derive(Clone)]
pub struct ProviderSupport {
    pub http: UpstreamHttpClient,
    pub cipher: Arc<SecretCipher>,
    pub state_signer: StateSigner,
    pub settings: Arc<ProviderSettings>,
}

impl ProviderSupport {
    pub fn new(settings: ProviderSettings) -> Self {
        let cipher = Arc::new(SecretCipher::from_env(
            settings.values(),
            SecretCipherOptions {
                env_keys: Some(&["IDENTITY_PROVIDER_SECRET_KEY", "JWT_SECRET"]),
                default_value: None,
                unreadable_message: Some("Identity provider secret is not readable."),
            },
        ));
        let state_signer = StateSigner::new(&settings);
        let settings = Arc::new(settings);
        Self {
            http: UpstreamHttpClient::new(settings.clone()),
            cipher,
            state_signer,
            settings,
        }
    }
}
