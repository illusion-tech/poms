//! Existing bcryptjs/Node wire semantics. No environment, database or credential writes.

use std::{collections::HashMap, error::Error, fmt};

use base64::{Engine as _, alphabet, engine::general_purpose};
use openssl::symm::{Cipher, Crypter, Mode};
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;
use zeroize::Zeroizing;

const DEFAULT_KEY_SOURCE: &str = "poms-dev-secret-change-in-production";
const DEFAULT_UNREADABLE: &str = "Secret value is not readable.";
const BCRYPT_ALPHABET: &[u8] = b"./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CryptoErrorKind {
    EntropyUnavailable,
    InvalidCredentialHash,
    SecretUnreadable,
}

pub struct CryptoError {
    kind: CryptoErrorKind,
    message: Option<String>,
}

impl CryptoError {
    pub const fn kind(&self) -> CryptoErrorKind {
        self.kind
    }

    fn invalid_hash() -> Self {
        Self {
            kind: CryptoErrorKind::InvalidCredentialHash,
            message: None,
        }
    }
}

impl fmt::Debug for CryptoError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("CryptoError")
            .field("kind", &self.kind)
            .finish_non_exhaustive()
    }
}

impl fmt::Display for CryptoError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self.kind {
            CryptoErrorKind::EntropyUnavailable => "secure entropy unavailable",
            CryptoErrorKind::InvalidCredentialHash => "credential hash is not readable",
            CryptoErrorKind::SecretUnreadable => {
                self.message.as_deref().unwrap_or(DEFAULT_UNREADABLE)
            }
        })
    }
}

impl Error for CryptoError {}

/// bcryptjs encodes paired surrogates as UTF-8 and unpaired code units as WTF-8.
/// This differs from Node Buffer's replacement of unpaired surrogates.
pub struct PasswordBytes(Zeroizing<Vec<u8>>);

impl PasswordBytes {
    pub fn as_slice(&self) -> &[u8] {
        &self.0
    }
}

impl fmt::Debug for PasswordBytes {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("PasswordBytes([redacted])")
    }
}

pub fn bcryptjs_password_bytes(input: &[u16]) -> PasswordBytes {
    let mut out = Zeroizing::new(Vec::with_capacity(input.len().saturating_mul(3)));
    let mut at = 0;
    while at < input.len() {
        let first = u32::from(input[at]);
        at += 1;
        let value = if (0xd800..=0xdbff).contains(&first)
            && input
                .get(at)
                .is_some_and(|next| (0xdc00..=0xdfff).contains(next))
        {
            let second = u32::from(input[at]);
            at += 1;
            0x10000 + ((first & 0x3ff) << 10) + (second & 0x3ff)
        } else {
            first
        };
        if value < 0x80 {
            out.push(value as u8);
        } else if value < 0x800 {
            out.extend_from_slice(&[(0xc0 | (value >> 6)) as u8, (0x80 | (value & 0x3f)) as u8]);
        } else if value < 0x10000 {
            out.extend_from_slice(&[
                (0xe0 | (value >> 12)) as u8,
                (0x80 | ((value >> 6) & 0x3f)) as u8,
                (0x80 | (value & 0x3f)) as u8,
            ]);
        } else {
            out.extend_from_slice(&[
                (0xf0 | (value >> 18)) as u8,
                (0x80 | ((value >> 12) & 0x3f)) as u8,
                (0x80 | ((value >> 6) & 0x3f)) as u8,
                (0x80 | (value & 0x3f)) as u8,
            ]);
        }
    }
    PasswordBytes(out)
}

// The original bcryptjs salt decoder stops at bad c1/c2/c3 but not bad c4.
// Only decoded length is needed for malformed salts: their canonical output
// cannot equal the supplied malformed hash, so the original result is false.
fn bcrypt_salt_length(input: &[u16]) -> usize {
    let code = |unit: u16| {
        BCRYPT_ALPHABET
            .iter()
            .position(|byte| u16::from(*byte) == unit)
    };
    let mut at = 0;
    let mut len = 0;
    while at + 1 < input.len() && len < 16 {
        let c1 = code(input[at]);
        let c2 = code(input[at + 1]);
        at += 2;
        if c1.is_none() || c2.is_none() {
            break;
        }
        len += 1;
        if len >= 16 || at >= input.len() {
            break;
        }
        let c3 = code(input[at]);
        at += 1;
        if c3.is_none() {
            break;
        }
        len += 1;
        if len >= 16 || at >= input.len() {
            break;
        }
        at += 1;
        len += 1;
    }
    len
}

/// CPU-bound; the async service calls this through spawn_blocking. Do not
/// substitute non_truncating_verify or reject input after 72 UTF-8 bytes.
pub fn verify_bcryptjs(password: &[u16], stored_hash: &str) -> Result<bool, CryptoError> {
    let units: Vec<u16> = stored_hash.encode_utf16().collect();
    if units.len() != 60 {
        return Ok(false);
    }
    if units[0] != 36 || units[1] != 50 {
        return Err(CryptoError::invalid_hash());
    }
    let (offset, version) = if units[2] == 36 {
        (3, None)
    } else {
        let version = match units[2] {
            97 => bcrypt::Version::TwoA,
            98 => bcrypt::Version::TwoB,
            121 => bcrypt::Version::TwoY,
            _ => return Err(CryptoError::invalid_hash()),
        };
        if units[3] != 36 {
            return Err(CryptoError::invalid_hash());
        }
        (4, Some(version))
    };
    if units[offset + 2] > 36 {
        return Err(CryptoError::invalid_hash());
    }
    let digit = |value: u16| value.checked_sub(48).filter(|number| *number < 10);
    let rounds = digit(units[offset])
        .zip(digit(units[offset + 1]))
        .map(|(a, b)| u32::from(a * 10 + b));
    if rounds.is_some_and(|value| !(4..=31).contains(&value)) {
        return Err(CryptoError::invalid_hash());
    }
    // compare() passes only the first 29 code units to hash().
    let salt_units = &units[offset + 3..(offset + 25).min(29)];
    if bcrypt_salt_length(salt_units) != 16 {
        return Err(CryptoError::invalid_hash());
    }
    let (Some(rounds), Some(version)) = (rounds, version) else {
        return Ok(false);
    };
    if units[offset + 2] != 36
        || salt_units
            .iter()
            .any(|unit| !BCRYPT_ALPHABET.iter().any(|byte| u16::from(*byte) == *unit))
    {
        return Ok(false);
    }
    let salt_text: String = salt_units
        .iter()
        .filter_map(|unit| char::from_u32(u32::from(*unit)))
        .collect();
    let engine = general_purpose::GeneralPurpose::new(
        &alphabet::BCRYPT,
        general_purpose::GeneralPurposeConfig::new()
            .with_encode_padding(false)
            .with_decode_padding_mode(base64::engine::DecodePaddingMode::Indifferent)
            .with_decode_allow_trailing_bits(true),
    );
    let salt_bytes = engine
        .decode(&salt_text)
        .map_err(|_| CryptoError::invalid_hash())?;
    if engine.encode(&salt_bytes) != salt_text {
        return Ok(false);
    }
    let salt: [u8; 16] = salt_bytes
        .try_into()
        .map_err(|_| CryptoError::invalid_hash())?;
    let bytes = bcryptjs_password_bytes(password);
    let computed = bcrypt::hash_with_salt(bytes.as_slice(), rounds, salt)
        .map_err(|_| CryptoError::invalid_hash())?
        .format_for_version(version);
    Ok(bool::from(
        computed.as_bytes().ct_eq(stored_hash.as_bytes()),
    ))
}

pub fn create_opaque_token() -> Result<String, CryptoError> {
    let mut entropy = Zeroizing::new([0_u8; 32]);
    getrandom::fill(entropy.as_mut()).map_err(|_| CryptoError {
        kind: CryptoErrorKind::EntropyUnavailable,
        message: None,
    })?;
    Ok(general_purpose::URL_SAFE_NO_PAD.encode(entropy.as_ref()))
}

pub fn hash_token(token: &str) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut result = String::with_capacity(64);
    for byte in Sha256::digest(token.as_bytes()) {
        result.push(char::from(HEX[usize::from(byte >> 4)]));
        result.push(char::from(HEX[usize::from(byte & 15)]));
    }
    result
}

pub fn verify_csrf_hash(stored: Option<&str>, supplied: &str) -> bool {
    stored
        .is_some_and(|stored| bool::from(stored.as_bytes().ct_eq(hash_token(supplied).as_bytes())))
}

#[derive(Default)]
pub struct SecretCipherOptions<'a> {
    pub env_keys: Option<&'a [&'a str]>,
    pub default_value: Option<&'a [u16]>,
    pub unreadable_message: Option<&'a str>,
}

pub struct SecretCipher {
    key: Zeroizing<[u8; 32]>,
    unreadable_message: String,
}

impl fmt::Debug for SecretCipher {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("SecretCipher { key: [redacted], message: [redacted] }")
    }
}

impl SecretCipher {
    /// Resolve a caller-supplied snapshot. Never reads process env or .env.
    pub fn from_env(env: &HashMap<String, String>, options: SecretCipherOptions<'_>) -> Self {
        let keys = options
            .env_keys
            .unwrap_or(&["POMS_SECRET_KEY", "JWT_SECRET"]);
        if let Some(value) = keys
            .iter()
            .filter_map(|key| env.get(*key))
            .find(|value| !value.is_empty())
        {
            let units = Zeroizing::new(value.encode_utf16().collect::<Vec<u16>>());
            return Self::from_key_source(&units, options.unreadable_message);
        }
        let fallback: Vec<u16> = DEFAULT_KEY_SOURCE.encode_utf16().collect();
        Self::from_key_source(
            options.default_value.unwrap_or(&fallback),
            options.unreadable_message,
        )
    }

    pub fn from_key_source(source: &[u16], unreadable_message: Option<&str>) -> Self {
        let text = Zeroizing::new(String::from_utf16_lossy(source));
        Self {
            key: Zeroizing::new(Sha256::digest(text.as_bytes()).into()),
            unreadable_message: unreadable_message.unwrap_or(DEFAULT_UNREADABLE).to_owned(),
        }
    }

    fn unreadable(&self) -> CryptoError {
        CryptoError {
            kind: CryptoErrorKind::SecretUnreadable,
            message: Some(self.unreadable_message.clone()),
        }
    }

    pub fn encrypt(&self, plaintext: &[u16]) -> Result<String, CryptoError> {
        let mut iv = [0_u8; 12];
        getrandom::fill(&mut iv).map_err(|_| CryptoError {
            kind: CryptoErrorKind::EntropyUnavailable,
            message: None,
        })?;
        self.encrypt_at_iv(plaintext, &iv)
    }

    fn encrypt_at_iv(&self, plaintext: &[u16], iv: &[u8]) -> Result<String, CryptoError> {
        let text = Zeroizing::new(String::from_utf16_lossy(plaintext));
        let cipher = Cipher::aes_256_gcm();
        let mut context = Crypter::new(cipher, Mode::Encrypt, self.key.as_ref(), Some(iv))
            .map_err(|_| self.unreadable())?;
        let mut ciphertext = vec![0; text.len() + cipher.block_size()];
        let count = context
            .update(text.as_bytes(), &mut ciphertext)
            .map_err(|_| self.unreadable())?;
        let count = count
            + context
                .finalize(&mut ciphertext[count..])
                .map_err(|_| self.unreadable())?;
        ciphertext.truncate(count);
        let mut tag = [0_u8; 16];
        context.get_tag(&mut tag).map_err(|_| self.unreadable())?;
        Ok(format!(
            "v1:{}:{}:{}",
            general_purpose::STANDARD.encode(iv),
            general_purpose::STANDARD.encode(tag),
            general_purpose::STANDARD.encode(ciphertext)
        ))
    }

    pub fn decrypt(&self, ciphertext: &str) -> Result<String, CryptoError> {
        let mut fields = ciphertext.split(':');
        let version = fields.next();
        let iv = fields.next();
        let tag = fields.next();
        let data = fields.next();
        let (Some("v1"), Some(iv), Some(tag), Some(data)) = (version, iv, tag, data) else {
            return Err(self.unreadable());
        };
        if iv.is_empty() || tag.is_empty() || data.is_empty() {
            return Err(self.unreadable());
        }
        let iv = node_base64(iv);
        let tag = node_base64(tag);
        let data = node_base64(data);
        if !(1..=128).contains(&iv.len()) || ![4, 8, 12, 13, 14, 15, 16].contains(&tag.len()) {
            return Err(self.unreadable());
        }
        let cipher = Cipher::aes_256_gcm();
        let mut context = Crypter::new(cipher, Mode::Decrypt, self.key.as_ref(), Some(&iv))
            .map_err(|_| self.unreadable())?;
        context.set_tag(&tag).map_err(|_| self.unreadable())?;
        let mut plaintext = Zeroizing::new(vec![0; data.len() + cipher.block_size()]);
        let count = context
            .update(&data, &mut plaintext)
            .map_err(|_| self.unreadable())?;
        let count = count
            + context
                .finalize(&mut plaintext[count..])
                .map_err(|_| self.unreadable())?;
        plaintext.truncate(count);
        Ok(String::from_utf8_lossy(&plaintext).into_owned())
    }
}

pub(crate) fn node_base64(input: &str) -> Vec<u8> {
    let mut out = Vec::new();
    let mut buffer = 0_u32;
    let mut bits = 0_u32;
    for unit in input.encode_utf16() {
        // Node's base64 string decoder uses the low byte of UTF-16 units.
        let unit = unit & 0xff;
        if unit == 61 {
            break;
        }
        let value = match unit {
            65..=90 => unit - 65,
            97..=122 => unit - 97 + 26,
            48..=57 => unit - 48 + 52,
            43 | 45 => 62,
            47 | 95 => 63,
            _ => continue,
        };
        buffer = (buffer << 6) | u32::from(value);
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buffer >> bits) as u8);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[allow(clippy::unwrap_used, clippy::expect_used)]
    fn deterministic_cipher_vectors_use_private_test_iv_only() {
        let golden: serde_json::Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r1c/crypto-golden.json"
        ))
        .expect("golden");
        for case in golden["encryptions"].as_array().expect("encryptions") {
            let units = |field: &str| {
                case[field]
                    .as_array()
                    .expect("units")
                    .iter()
                    .map(|n| n.as_u64().expect("u16") as u16)
                    .collect::<Vec<_>>()
            };
            let cipher = SecretCipher::from_key_source(&units("keyUnits"), None);
            let iv: Vec<u8> = case["ivBytes"]
                .as_array()
                .expect("iv")
                .iter()
                .map(|n| n.as_u64().expect("byte") as u8)
                .collect();
            assert_eq!(
                cipher
                    .encrypt_at_iv(&units("plaintextUnits"), &iv)
                    .expect("encrypt"),
                case["ciphertext"].as_str().expect("ciphertext"),
                "{}",
                case["name"]
            );
        }
    }
}
