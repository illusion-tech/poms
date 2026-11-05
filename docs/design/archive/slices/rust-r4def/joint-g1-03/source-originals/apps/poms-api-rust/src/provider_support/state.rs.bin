use std::{error::Error, fmt, sync::Arc};

use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use openssl::{hash::MessageDigest, pkey::PKey, sign::Signer};
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;
use zeroize::Zeroizing;

use super::ProviderSettings;
use crate::auth::crypto::node_base64;

#[derive(Clone, Copy, Debug)]
pub struct SupportError;

impl fmt::Display for SupportError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("Identity provider state signing failed.")
    }
}

impl Error for SupportError {}

#[derive(Clone)]
pub struct StateSigner {
    key: Arc<Zeroizing<[u8; 32]>>,
}

impl fmt::Debug for StateSigner {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("StateSigner([redacted])")
    }
}

impl StateSigner {
    pub fn new(settings: &ProviderSettings) -> Self {
        // State uses nullish selection. An explicitly empty key must win.
        let source = settings
            .get("IDENTITY_PROVIDER_STATE_KEY")
            .or_else(|| settings.get("IDENTITY_PROVIDER_SECRET_KEY"))
            .or_else(|| settings.get("JWT_SECRET"))
            .unwrap_or("poms-dev-secret-change-in-production");
        Self {
            key: Arc::new(Zeroizing::new(Sha256::digest(source.as_bytes()).into())),
        }
    }

    pub fn sign(&self, encoded_payload: &str) -> Result<String, SupportError> {
        let key = PKey::hmac(self.key.as_ref().as_ref()).map_err(|_| SupportError)?;
        let mut signer = Signer::new(MessageDigest::sha256(), &key).map_err(|_| SupportError)?;
        signer
            .update(encoded_payload.as_bytes())
            .map_err(|_| SupportError)?;
        Ok(URL_SAFE_NO_PAD.encode(signer.sign_to_vec().map_err(|_| SupportError)?))
    }

    pub fn verify_signature(
        &self,
        encoded_payload: &str,
        signature: &str,
    ) -> Result<bool, SupportError> {
        let expected = node_base64(&self.sign(encoded_payload)?);
        let actual = node_base64(signature);
        Ok(actual.len() == expected.len() && bool::from(actual.ct_eq(&expected)))
    }
}
