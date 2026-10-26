#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::collections::HashMap;

use base64::{Engine as _, engine::general_purpose};
use poms_api_rust::auth::crypto::{
    CryptoErrorKind, SecretCipher, SecretCipherOptions, bcryptjs_password_bytes,
    create_opaque_token, hash_token, verify_bcryptjs, verify_csrf_hash,
};
use serde_json::{Value, json};

fn golden() -> Value {
    serde_json::from_str(include_str!("../../../tools/rust-r1c/crypto-golden.json"))
        .expect("crypto golden")
}

fn units(value: &Value) -> Vec<u16> {
    value
        .as_array()
        .expect("units")
        .iter()
        .map(|unit| unit.as_u64().expect("u16") as u16)
        .collect()
}

#[test]
fn actual_bcryptjs_matches_raw_bytes_and_compatibility_errors() {
    for case in golden()["bcryptResults"].as_array().expect("cases") {
        let password = units(&case["passwordUnits"]);
        let hash = case["hash"].as_str().expect("hash");
        let actual = verify_bcryptjs(&password, hash);
        if let Some(expected) = case["expected"]["value"].as_bool() {
            assert_eq!(
                actual.expect("valid hash operation"),
                expected,
                "{}",
                case["name"]
            );
            if case["rawVerify"] == true {
                assert_eq!(
                    bcrypt::verify(bcryptjs_password_bytes(&password).as_slice(), hash)
                        .expect("crate raw bytes"),
                    expected,
                    "raw crate: {}",
                    case["name"]
                );
            }
        } else {
            assert_eq!(
                actual.expect_err("same invalid hash classification").kind(),
                CryptoErrorKind::InvalidCredentialHash,
                "{}",
                case["name"]
            );
        }
    }
}

fn assert_decrypt(cipher: &SecretCipher, ciphertext: &str, expected: &Value, name: &Value) {
    let actual = cipher.decrypt(ciphertext);
    if let Some(value) = expected["value"].as_str() {
        assert_eq!(actual.expect("decrypt"), value, "{name}");
    } else {
        let error = actual.expect_err("unreadable");
        assert_eq!(error.kind(), CryptoErrorKind::SecretUnreadable, "{name}");
        assert_eq!(
            error.to_string(),
            expected["error"]["message"]
                .as_str()
                .or_else(|| expected["error"]["body"]["message"].as_str())
                .expect("recorded original message"),
            "{name}"
        );
        assert_eq!(expected["error"]["status"], 400);
    }
}

#[test]
fn original_node_ciphertext_and_permissive_decoder_match() {
    let fixture = golden();
    for group in ["encryptions", "decryptions"] {
        for case in fixture[group].as_array().expect("cases") {
            let cipher = SecretCipher::from_key_source(
                &units(&case["keyUnits"]),
                case["options"]["unreadableMessage"].as_str(),
            );
            assert_decrypt(
                &cipher,
                case["ciphertext"].as_str().expect("ciphertext"),
                &case["expected"],
                &case["name"],
            );
        }
    }
}

#[test]
fn key_selection_snapshot_matches_original_env_options() {
    for case in golden()["optionResults"].as_array().expect("options") {
        let env: HashMap<String, String> =
            serde_json::from_value(case["env"].clone()).expect("synthetic env");
        let keys: Option<Vec<&str>> = case["options"]["envKeys"]
            .as_array()
            .map(|values| values.iter().map(|v| v.as_str().expect("key")).collect());
        let default: Option<Vec<u16>> = case["options"]["defaultValue"]
            .as_str()
            .map(|value| value.encode_utf16().collect());
        let options = SecretCipherOptions {
            env_keys: keys.as_deref(),
            default_value: default.as_deref(),
            unreadable_message: None,
        };
        let cipher = SecretCipher::from_env(&env, options);
        assert_decrypt(
            &cipher,
            case["ciphertext"].as_str().expect("ciphertext"),
            &case["expected"],
            &case["name"],
        );
    }
}

#[test]
fn original_r0f_thirteen_cipher_witnesses_remain_consumed() {
    let witness: Value = serde_json::from_str(include_str!(
        "../../../tools/rust-r0f-auth-compat/fixtures/auth-compat.v1.json"
    ))
    .expect("R0F");
    let cases: Vec<_> = witness["cases"]
        .as_array()
        .expect("cases")
        .iter()
        .filter(|case| case["group"] == "cipher-v1")
        .collect();
    assert_eq!(cases.len(), 13);
    for case in cases {
        let input = &case["input"];
        let observed = &case["observed"];
        let key = if input.get("envA").is_some() {
            input["envA"]
                .as_str()
                .filter(|value| !value.is_empty())
                .or_else(|| input["envB"].as_str().filter(|value| !value.is_empty()))
                .unwrap_or("public-r0f-fallback-key")
        } else {
            input["keySource"]
                .as_str()
                .or_else(|| input["wrongKey"].as_str())
                .unwrap_or("public-r0f-primary-key")
        };
        let cipher = SecretCipher::from_key_source(
            &key.encode_utf16().collect::<Vec<_>>(),
            input["options"]["unreadableMessage"].as_str(),
        );
        let encrypted = input["ciphertext"]
            .as_str()
            .or_else(|| observed["encrypted"].as_str())
            .expect("ciphertext");
        let expected = if observed.get("decrypt").is_some() {
            observed["decrypt"].clone()
        } else if observed.get("decrypted").is_some() {
            json!({"value":observed["decrypted"]})
        } else {
            observed.clone()
        };
        assert_decrypt(&cipher, encrypted, &expected, &case["id"]);
    }
}

#[test]
fn secure_runtime_tokens_hash_and_csrf_use_existing_wire_rules() {
    for case in golden()["hashes"].as_array().expect("hashes") {
        let text = case["text"].as_str().expect("text");
        let expected = case["hash"].as_str().expect("hash");
        assert_eq!(hash_token(text), expected);
        assert!(verify_csrf_hash(Some(expected), text));
        assert!(!verify_csrf_hash(None, text));
        assert!(!verify_csrf_hash(Some("wrong"), text));
        assert!(!verify_csrf_hash(Some(&expected.to_uppercase()), text));
    }
    for case in golden()["tokens"].as_array().expect("tokens") {
        let bytes: Vec<u8> = case["bytes"]
            .as_array()
            .expect("bytes")
            .iter()
            .map(|n| n.as_u64().expect("byte") as u8)
            .collect();
        assert_eq!(
            general_purpose::URL_SAFE_NO_PAD.encode(bytes),
            case["token"].as_str().expect("token")
        );
    }
    let first = create_opaque_token().expect("system entropy");
    let second = create_opaque_token().expect("system entropy");
    assert_eq!(first.len(), 43);
    assert_eq!(
        general_purpose::URL_SAFE_NO_PAD
            .decode(&first)
            .expect("base64url")
            .len(),
        32
    );
    assert_ne!(first, second);
}

/// This public-synthetic output is independently decrypted by the original TS
/// service via crypto-oracle.mjs --verify-rust <captured-test-log>.
#[test]
fn runtime_encrypt_outputs_for_ts() {
    let mut output = Vec::new();
    for case in golden()["encryptions"].as_array().expect("encryptions") {
        let key = units(&case["keyUnits"]);
        let plaintext = units(&case["plaintextUnits"]);
        let cipher = SecretCipher::from_key_source(&key, None);
        let first = cipher
            .encrypt(&plaintext)
            .expect("secure runtime encryption");
        let second = cipher
            .encrypt(&plaintext)
            .expect("secure runtime encryption");
        assert_ne!(first, second);
        output.push(json!({"name":case["name"],"keyUnits":key,"plaintextUnits":plaintext,"ciphertext":first}));
    }
    println!(
        "R1C_CRYPTO_OUTPUT={}",
        serde_json::to_string(&output).expect("public synthetic output")
    );
}

#[test]
fn secret_and_invalid_hash_debug_never_exposes_input() {
    let source = "public-test-secret-that-must-be-redacted";
    let cipher = SecretCipher::from_key_source(
        &source.encode_utf16().collect::<Vec<_>>(),
        Some("public custom unreadable message"),
    );
    assert!(!format!("{cipher:?}").contains(source));
    let bytes = bcryptjs_password_bytes(&source.encode_utf16().collect::<Vec<_>>());
    assert_eq!(format!("{bytes:?}"), "PasswordBytes([redacted])");
    let error = cipher
        .decrypt("input-must-not-appear-in-error")
        .expect_err("invalid");
    let debug = format!("{error:?}");
    assert!(!debug.contains("public custom"));
    assert!(!debug.contains("input-must"));
    assert_eq!(error.to_string(), "public custom unreadable message");
    let malformed = format!(
        "!{}",
        "sensitive".repeat(7).chars().take(59).collect::<String>()
    );
    let error = verify_bcryptjs(&[65], &malformed).expect_err("invalid 60-unit version");
    assert!(!format!("{error:?}").contains("sensitive"));
}
