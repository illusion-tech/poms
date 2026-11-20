//! Exact operating quantities. Raw commission tokens are checked before f64.
use crate::contract_support::Error;
use serde::{Deserialize, Deserializer, Serialize, Serializer, de, ser};
use std::fmt;

pub const MAX_CENTS: i128 = 999_999_999_999_999_999;

pub fn capacity_error(field: &str) -> Error {
    Error::CodedUnprocessable {
        code: "operating_money_capacity_exceeded",
        message: format!("{field} exceeds the operating monetary capacity"),
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord)]
pub struct OperatingMoneyCents(i128);
impl OperatingMoneyCents {
    pub fn from_cents(value: i128, field: &str) -> Result<Self, Error> {
        if value.checked_abs().is_none_or(|value| value > MAX_CENTS) { return Err(capacity_error(field)); }
        Ok(Self(value))
    }
    pub fn parse_exact(value: &str, field: &str) -> Result<Self, Error> {
        let value = value.trim();
        let (negative, digits) = value.strip_prefix('-').map_or((false, value), |v| (true, v));
        let mut pieces = digits.split('.');
        let whole = pieces.next().unwrap_or_default();
        let fraction = pieces.next();
        if whole.is_empty() || !whole.bytes().all(|v| v.is_ascii_digit()) || pieces.next().is_some()
            || fraction.is_some_and(|v| v.is_empty() || !v.bytes().all(|b| b.is_ascii_digit())) {
            return Err(Error::BadRequest(format!("{field} must be an exact finite decimal")));
        }
        let fraction = fraction.unwrap_or("").trim_end_matches('0');
        if fraction.len() > 2 {
            return Err(Error::CodedUnprocessable { code: "operating_money_precision_unsupported", message: format!("{field} has no exact cent representation") });
        }
        let whole = whole.trim_start_matches('0');
        if whole.len() > 16 { return Err(capacity_error(field)); }
        let integer = if whole.is_empty() { 0 } else { whole.parse::<i128>().map_err(|_| capacity_error(field))? };
        let fractional = match fraction.len() { 0 => 0, 1 => fraction.parse::<i128>().map_err(|_| capacity_error(field))? * 10, _ => fraction.parse::<i128>().map_err(|_| capacity_error(field))? };
        let cents = integer.checked_mul(100).and_then(|v| v.checked_add(fractional)).ok_or_else(|| capacity_error(field))?;
        Self::from_cents(if negative { -cents } else { cents }, field)
    }
    pub fn parse(value: &str, field: &str) -> Result<Self, Error> { Self::parse_exact(value, field) }
    pub const fn cents(self) -> i128 { self.0 }
    pub const fn as_cents(self) -> i128 { self.0 }
    pub fn checked_add(self, other: Self) -> Result<Self, Error> { Self::from_cents(self.0.checked_add(other.0).ok_or_else(|| capacity_error("operating amount"))?, "operating amount") }
    pub fn checked_sub(self, other: Self) -> Result<Self, Error> { Self::from_cents(self.0.checked_sub(other.0).ok_or_else(|| capacity_error("operating amount"))?, "operating amount") }
    pub fn decimal_string(self) -> String { let absolute = self.0.abs(); format!("{}{}.{:02}", if self.0 < 0 { "-" } else { "" }, absolute / 100, absolute % 100) }
}
impl fmt::Display for OperatingMoneyCents { fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result { f.write_str(&self.decimal_string()) } }
impl Serialize for OperatingMoneyCents { fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> { serializer.serialize_str(&self.decimal_string()) } }
impl<'de> Deserialize<'de> for OperatingMoneyCents {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        Self::parse_exact(&String::deserialize(deserializer)?, "stored operating amount").map_err(|_| de::Error::custom("Stored amount must have exact cents within capacity"))
    }
}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(transparent)]
pub struct Sha256(String);
impl Sha256 {
    pub fn as_str(&self) -> &str { &self.0 }
    pub fn into_string(self) -> String { self.0 }
}
impl TryFrom<String> for Sha256 {
    type Error = Error;
    fn try_from(value: String) -> Result<Self, Error> {
        if value.len() != 64 || !value.bytes().all(|v| v.is_ascii_digit() || (b'a'..=b'f').contains(&v)) { return Err(Error::BadRequest("Expected a lowercase SHA-256 digest".into())); }
        Ok(Self(value))
    }
}
impl TryFrom<&str> for Sha256 { type Error = Error; fn try_from(value: &str) -> Result<Self, Error> { Self::try_from(value.to_owned()) } }
impl fmt::Display for Sha256 { fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result { f.write_str(self.as_str()) } }
impl<'de> Deserialize<'de> for Sha256 { fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> { Self::try_from(String::deserialize(deserializer)?).map_err(|_| de::Error::custom("Invalid SHA-256 digest")) } }

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct Millionths(i32);
impl Millionths {
    pub const fn units(self) -> i32 { self.0 }
    pub fn from_units(value: i32) -> Result<Self, Error> { if !(0..=1_000_000).contains(&value) { return Err(Error::BadRequest("Commission weight is outside 0..1".into())); } Ok(Self(value)) }
    pub fn parse_token(raw: &str) -> Result<Self, Error> {
        let fail = || Error::BadRequest("Commission weight must be nonnegative with at most six effective decimals".into());
        let (negative, raw) = raw.strip_prefix('-').map_or((false, raw), |v| (true, v));
        let (base, exponent) = raw.split_once(['e', 'E']).map_or((raw, "0"), |(base, exponent)| (base, exponent));
        let mut pieces = base.split('.');
        let whole = pieces.next().unwrap_or_default();
        let fraction = pieces.next().unwrap_or("");
        let exponent_digits = exponent.strip_prefix(['+', '-']).unwrap_or(exponent);
        if whole.is_empty() || pieces.next().is_some() || !whole.bytes().all(|v| v.is_ascii_digit()) || !fraction.bytes().all(|v| v.is_ascii_digit()) || (base.contains('.') && fraction.is_empty()) || exponent_digits.is_empty() || !exponent_digits.bytes().all(|v| v.is_ascii_digit()) { return Err(fail()); }
        let joined = format!("{whole}{fraction}");
        let significant = joined.trim_start_matches('0');
        if significant.is_empty() { return Self::from_units(0); }
        if negative { return Err(fail()); }
        let exponent = exponent.parse::<i32>().map_err(|_| fail())?;
        let coefficient = significant.trim_end_matches('0');
        if coefficient.len() > 7 { return Err(fail()); }
        let removed = significant.len() - coefficient.len();
        let scale = i64::try_from(fraction.len()).map_err(|_| fail())? - i64::from(exponent) - i64::try_from(removed).map_err(|_| fail())?;
        if !(0..=6).contains(&scale) { return Err(fail()); }
        let coefficient = coefficient.parse::<i32>().map_err(|_| fail())?;
        let multiplier = 10_i32.pow(u32::try_from(6 - scale).map_err(|_| fail())?);
        Self::from_units(coefficient.checked_mul(multiplier).ok_or_else(fail)?)
    }
    fn wire(self) -> String {
        if self.0 == 0 { return "0".into(); }
        if self.0 == 1_000_000 { return "1".into(); }
        format!("0.{:06}", self.0).trim_end_matches('0').to_owned()
    }
}
impl<'de> Deserialize<'de> for Millionths {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let raw = Box::<serde_json::value::RawValue>::deserialize(deserializer)?;
        Self::parse_token(raw.get()).map_err(|_| de::Error::custom("Invalid exact commission weight"))
    }
}
impl Serialize for Millionths {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let raw = serde_json::value::RawValue::from_string(self.wire()).map_err(ser::Error::custom)?;
        raw.serialize(serializer)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exact_cent_boundary_preserves_history_and_refuses_overflow() {
        let max = OperatingMoneyCents::parse_exact("9999999999999999.99", "test").unwrap_or_else(|_| panic!("max"));
        assert_eq!(max.cents(), MAX_CENTS);
        assert!(max.checked_add(OperatingMoneyCents::from_cents(1, "test").unwrap_or_else(|_| panic!("cent"))).is_err());
        assert!(OperatingMoneyCents::parse_exact("1.2340", "history").is_err());
        assert_eq!(OperatingMoneyCents::parse_exact("1.2300", "history").ok().map(OperatingMoneyCents::cents), Some(123));
    }
    #[test]
    fn weight_uses_original_token_before_float_rounding() {
        for raw in ["1e-6", "0.0000010", "0.5000000", "1", "0"] { assert!(serde_json::from_str::<Millionths>(raw).is_ok(), "{raw}"); }
        for raw in ["1e-7", "0.10000000000000001", "1.000001", "-0.1", "\"0.5\""] { assert!(serde_json::from_str::<Millionths>(raw).is_err(), "{raw}"); }
        assert_eq!(serde_json::from_str::<Millionths>("1e-6").ok().map(Millionths::units), Some(1));
    }
}
