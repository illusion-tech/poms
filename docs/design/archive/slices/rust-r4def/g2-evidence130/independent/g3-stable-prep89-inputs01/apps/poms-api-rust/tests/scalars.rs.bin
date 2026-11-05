#![allow(clippy::unwrap_used, clippy::expect_used)]

use poms_api_rust::compat::{json::Field, scalars::*};
use serde_json::{Value, json};

fn legacy() -> Value {
    serde_json::from_str(include_str!(
        "../../../tools/rust-r0f/data-compat/golden.json"
    ))
    .unwrap()
}
fn supplement() -> Value {
    serde_json::from_str(include_str!(
        "../../../tools/rust-r1b/scalar-compat-golden.json"
    ))
    .unwrap()
}

fn number_input(value: &Value) -> NumberInput<'_> {
    if let Some(text) = value.as_str() {
        NumberInput::Text(text)
    } else if value["$type"] == "number" && value["value"] == "-0" {
        NumberInput::Number(-0.0)
    } else {
        NumberInput::Number(value.as_f64().expect("fixture numeric input"))
    }
}

fn presence<'a, T>(value: &'a Value, convert: impl Fn(&'a Value) -> T) -> Field<T> {
    if value["$type"] == "undefined" {
        Field::Missing
    } else if value.is_null() {
        Field::Null
    } else {
        Field::Value(convert(value))
    }
}

fn date_input(value: &Value) -> DateInput<'_> {
    if let Some(text) = value.as_str() {
        DateInput::Text(text)
    } else {
        match parse_legacy_timestamp_utc(value["value"].as_str().unwrap()) {
            Ok(date) => DateInput::Instant(date),
            Err(_) => DateInput::InvalidDate,
        }
    }
}

fn assert_text(actual: Result<String, ScalarError>, observed: &Value, label: &str) {
    if observed["outcome"] == "throw" {
        assert!(actual.is_err(), "{label}: expected error");
    } else {
        assert_eq!(
            actual.unwrap(),
            observed["value"].as_str().unwrap(),
            "{label}"
        );
    }
}

fn assert_optional(actual: Result<Option<String>, ScalarError>, observed: &Value, label: &str) {
    if observed["outcome"] == "throw" {
        assert!(actual.is_err(), "{label}: expected error");
    } else {
        assert_eq!(
            serde_json::to_value(actual.unwrap()).unwrap(),
            observed["value"],
            "{label}"
        );
    }
}

fn assert_float(actual: Result<f64, ScalarError>, observed: &Value, label: &str) {
    if observed["outcome"] == "throw" {
        assert!(
            actual.is_err(),
            "{label}: expected scalar rejection (service exception wrapper is outside R1B)"
        );
        return;
    }
    let actual = actual.unwrap();
    let expected = &observed["value"];
    if expected["$type"] == "number" {
        match expected["value"].as_str().unwrap() {
            "-0" => assert_eq!(actual.to_bits(), (-0.0_f64).to_bits(), "{label}"),
            "NaN" => assert!(actual.is_nan(), "{label}"),
            "Infinity" => assert_eq!(actual, f64::INFINITY, "{label}"),
            "-Infinity" => assert_eq!(actual, f64::NEG_INFINITY, "{label}"),
            _ => panic!("unsupported oracle numeric tag"),
        }
    } else {
        assert_eq!(actual, expected.as_f64().unwrap(), "{label}");
    }
}

#[test]
fn native_number_oracle_covers_rounding_adjacent_bits_specials_and_precision() {
    let golden = supplement();
    for case in golden["numberResults"].as_array().unwrap() {
        let number =
            f64::from_bits(u64::from_str_radix(case["bits"].as_str().unwrap(), 16).unwrap());
        assert_eq!(
            js_number_string(number),
            case["string"].as_str().unwrap(),
            "{}",
            case["id"]
        );
        for fixed in case["fixed"].as_array().unwrap() {
            let digits = u8::try_from(fixed["digits"].as_u64().unwrap()).unwrap();
            if digits > 100 {
                assert_eq!(
                    js_to_fixed(number, digits),
                    Err(ScalarError::InvalidPrecision)
                );
            }
            assert_text(
                js_to_fixed(number, digits),
                &fixed["result"],
                case["id"].as_str().unwrap(),
            );
        }
    }
    for case in golden["numberStringResults"].as_array().unwrap() {
        let actual = legacy_number(NumberInput::Text(case["input"].as_str().unwrap()));
        let expected =
            f64::from_bits(u64::from_str_radix(case["bits"].as_str().unwrap(), 16).unwrap());
        if expected.is_nan() {
            assert!(actual.is_nan());
        } else {
            assert_eq!(actual.to_bits(), expected.to_bits(), "{}", case["input"]);
        }
        assert_eq!(js_number_string(actual), case["string"].as_str().unwrap());
    }
}

#[test]
fn frozen_service_money_values_use_scalar_policies_without_business_error_wrappers() {
    for case in legacy()["moneyResults"].as_array().unwrap() {
        let input = number_input(&case["input"]["value"]);
        let label = case["id"].as_str().unwrap();
        for (key, actual) in [
            ("commissionAmount", js_to_fixed(legacy_number(input), 2)),
            ("commissionRate", js_to_fixed(legacy_number(input), 4)),
            ("commissionPassthrough", Ok(decimal_text(input).0)),
            (
                "costAmount",
                finite_number(input).and_then(|number| js_to_fixed(number, 4)),
            ),
            (
                "costRate",
                finite_number(input).and_then(|number| js_to_fixed(number, 6)),
            ),
            (
                "financeAmount",
                finite_number(input).and_then(|number| js_to_fixed(number, 2)),
            ),
        ] {
            assert_text(actual, &case[key], label);
        }
        assert_float(
            finite_number(input),
            &case["commissionValidatedNumber"],
            label,
        );
        assert_float(positive_number(input), &case["financePositive"], label);
    }
}

#[test]
fn frozen_decimal_text_preserves_scale_and_only_nullable_helper_collapses_missing() {
    for case in legacy()["nullableDecimalResults"].as_array().unwrap() {
        let actual = nullable_decimal_text(presence(&case["input"]["value"], number_input));
        assert_eq!(
            serde_json::to_value(actual).unwrap(),
            case["result"]["value"]
        );
    }
    let raw = DecimalText("0001.2300".into());
    assert_eq!(serde_json::to_value(&raw).unwrap(), json!("0001.2300"));
    assert_eq!(
        serde_json::from_value::<DecimalText>(json!("0001.2300")).unwrap(),
        raw
    );
    assert!(serde_json::from_value::<DecimalText>(json!(1.23)).is_err());
    assert_eq!(
        nonnegative_number(NumberInput::Number(-0.0))
            .unwrap()
            .to_bits(),
        (-0.0_f64).to_bits()
    );
}

#[test]
fn frozen_date_helpers_preserve_date_string_and_missing_null_boundaries() {
    let golden = legacy();
    for case in golden["dateResults"].as_array().unwrap() {
        let input = presence(&case["input"]["value"], date_input);
        let zone = if case["input"]["timeZone"] == "UTC" {
            BusinessTimeZone::Utc
        } else {
            BusinessTimeZone::HongKong
        };
        let label = case["id"].as_str().unwrap();
        assert_optional(
            business_date_only(input, zone),
            &case["businessDateOnly"],
            label,
        );
        assert_optional(
            business_date_only(input, BusinessTimeZone::HongKong),
            &case["costDate"],
            label,
        );
        assert_optional(nullable_timestamp_utc(input), &case["costTimestamp"], label);
    }
    for case in golden["contractDateResults"].as_array().unwrap() {
        let actual = contract_date_only(presence(&case["input"]["value"], |value| {
            value.as_str().unwrap()
        }))
        .unwrap();
        let encoded = match actual {
            Field::Missing => json!({"$type":"undefined"}),
            Field::Null => Value::Null,
            Field::Value(value) => json!(value),
        };
        assert_eq!(encoded, case["result"]["value"]);
    }
}

#[test]
fn supplemental_date_oracle_covers_history_extended_years_timeclip_and_24_hour() {
    for case in supplement()["dateResults"].as_array().unwrap() {
        let input = &case["input"];
        let value = match input["kind"].as_str().unwrap() {
            "Missing" => Field::Missing,
            "Null" => Field::Null,
            "String" => Field::Value(DateInput::Text(input["value"].as_str().unwrap())),
            "Date" => Field::Value(
                match parse_legacy_timestamp_utc(input["value"].as_str().unwrap()) {
                    Ok(date) => DateInput::Instant(date),
                    Err(_) => DateInput::InvalidDate,
                },
            ),
            _ => panic!("unknown date oracle tag"),
        };
        let label = input["id"].as_str().unwrap();
        assert_optional(
            business_date_only(value, BusinessTimeZone::HongKong),
            &case["hongKong"],
            label,
        );
        assert_optional(
            business_date_only(value, BusinessTimeZone::Utc),
            &case["utc"],
            label,
        );
        assert_optional(nullable_timestamp_utc(value), &case["timestamp"], label);
    }
    for case in supplement()["wireDateResults"].as_array().unwrap() {
        let value = case["input"].as_str().unwrap();
        assert_eq!(
            valid_wire_date(value),
            case["date"]["success"].as_bool().unwrap(),
            "{value}"
        );
        assert_eq!(
            valid_wire_utc_datetime(value),
            case["utcDatetime"]["success"].as_bool().unwrap(),
            "{value}"
        );
    }
}

#[test]
fn uuid_and_external_id_oracles_preserve_the_original_wire_spelling() {
    let supplemental = supplement();
    for case in supplemental["uuidResults"].as_array().unwrap() {
        let actual = UuidText::parse(case["input"].as_str().unwrap());
        assert_eq!(actual.is_ok(), case["result"]["success"].as_bool().unwrap());
        if let Ok(value) = actual {
            assert_eq!(
                serde_json::to_value(&value).unwrap(),
                case["result"]["data"]
            );
            assert!(value.to_uuid().is_ok());
        }
    }
    for case in supplemental["externalIdResults"].as_array().unwrap() {
        let actual = external_id(case["input"].as_str().unwrap(), 255);
        assert_eq!(actual.is_ok(), case["result"]["success"].as_bool().unwrap());
        if let Ok(value) = actual {
            assert_eq!(serde_json::to_value(value).unwrap(), case["result"]["data"]);
        }
    }
    let mut mapped = 0;
    for case in legacy()["schemaResults"].as_array().unwrap() {
        let schema = case["input"]["schema"].as_str().unwrap();
        let input = &case["input"]["value"];
        let actual = match schema {
            "SanitizedUserSchema" => input
                .as_str()
                .and_then(|text| UuidText::parse(text).ok())
                .map(|value| serde_json::to_value(value).unwrap()),
            "ExternalDepartmentMappingReplacementItemSchema" => input
                .as_str()
                .and_then(|text| external_id(text, 255).ok())
                .map(|value| serde_json::to_value(value).unwrap()),
            _ => continue, // 2 nullable field policies belong to JSON; 3 enum cases to shared generation.
        };
        mapped += 1;
        assert_eq!(
            actual.is_some(),
            case["result"]["success"].as_bool().unwrap()
        );
        if let Some(actual) = actual {
            assert_eq!(actual, case["result"]["data"]);
        }
    }
    assert_eq!(mapped, 8);
}

#[test]
fn frozen_session_timestamp_fields_are_normalized_without_implementing_session_service() {
    for case in legacy()["timestampResults"].as_array().unwrap() {
        let mut failed = false;
        for field in [
            "idleExpiresAt",
            "absoluteExpiresAt",
            "lastSeenAt",
            "revokedAt",
            "updatedAt",
        ] {
            let actual = nullable_timestamp_utc(presence(&case["input"][field], date_input));
            if case["result"]["outcome"] == "throw" {
                failed |= actual.is_err();
            } else {
                let expected = &case["result"]["value"][field];
                let expected = if expected.is_null() {
                    Value::Null
                } else {
                    expected["value"].clone()
                };
                assert_eq!(serde_json::to_value(actual.unwrap()).unwrap(), expected);
            }
        }
        if case["result"]["outcome"] == "throw" {
            assert!(failed);
        }
    }
}

#[test]
fn unsupported_domains_are_explicit_and_non_ascii_validation_never_panics() {
    assert_eq!(
        parse_legacy_timestamp_utc("+275760-09-13T00:00:00Z"),
        Err(ScalarError::UnsupportedDateRange)
    );
    assert_eq!(
        contract_date_only(Field::Value("123456789😀")),
        Err(ScalarError::InvalidUtf16Boundary)
    );
    for input in [
        "😀😀😀😀😀😀😀Z",
        "日期日期日期日期日期日期Z",
        "2026-04-19T😀00:00Z",
        "2026-04-19T00:00:00.Z",
    ] {
        assert!(!valid_wire_utc_datetime(input));
    }
}
