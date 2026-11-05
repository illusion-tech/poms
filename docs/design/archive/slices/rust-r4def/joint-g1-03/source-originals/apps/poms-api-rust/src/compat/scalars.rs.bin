//! Pure scalar adapters. Decimal text, stored Decimal and the old JS Number
//! projection are distinct. These functions do not implement business totals,
//! transaction logic, service-specific HTTP errors or an entire JS runtime.

use std::{error::Error, fmt};

use chrono::{DateTime, Datelike, Duration, NaiveDate, TimeZone, Timelike, Utc};
use chrono_tz::Asia::Hong_Kong;
use serde::{Deserialize, Deserializer, Serialize, Serializer, de};
use uuid::Uuid;

use super::json::Field;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScalarError {
    NonFiniteNumber,
    NonPositiveNumber,
    NegativeNumber,
    InvalidPrecision,
    InvalidDate,
    UnsupportedDateRange,
    InvalidUtf16Boundary,
    InvalidUuid,
    InvalidExternalId,
}

impl fmt::Display for ScalarError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::NonFiniteNumber => "value must be a finite number",
            Self::NonPositiveNumber => "value must be greater than zero",
            Self::NegativeNumber => "value must be nonnegative",
            Self::InvalidPrecision => "toFixed() digits argument must be between 0 and 100",
            Self::InvalidDate => "Invalid time value",
            Self::UnsupportedDateRange => "date is outside the supported chrono range",
            Self::InvalidUtf16Boundary => "date text ends inside a UTF-16 surrogate pair",
            Self::InvalidUuid => "value must be a canonical UUID string",
            Self::InvalidExternalId => "external identifier is empty or too long",
        })
    }
}

impl Error for ScalarError {}

#[derive(Debug, Clone, Copy)]
pub enum NumberInput<'a> {
    Text(&'a str),
    Number(f64),
}

/// Matches Number(string|number), including NaN/Infinity. Finite/positive
/// checks are separate because the original helpers have different policies.
pub fn legacy_number(value: NumberInput<'_>) -> f64 {
    let NumberInput::Text(text) = value else {
        return match value {
            NumberInput::Number(number) => number,
            NumberInput::Text(_) => f64::NAN,
        };
    };
    let text = trim_js(text);
    if text.is_empty() {
        return 0.0;
    }
    match text {
        "Infinity" | "+Infinity" => return f64::INFINITY,
        "-Infinity" => return f64::NEG_INFINITY,
        _ => {}
    }
    for (prefix, radix, width) in [
        ("0x", 16, 4),
        ("0X", 16, 4),
        ("0o", 8, 3),
        ("0O", 8, 3),
        ("0b", 2, 1),
        ("0B", 2, 1),
    ] {
        if let Some(digits) = text.strip_prefix(prefix) {
            return radix_integer(digits, radix, width);
        }
    }
    if !decimal_number_syntax(text) {
        return f64::NAN;
    }
    text.parse().unwrap_or(f64::NAN)
}

fn decimal_number_syntax(text: &str) -> bool {
    let bytes = text.as_bytes();
    let mut index = usize::from(matches!(bytes.first(), Some(b'+' | b'-')));
    let mut digits = 0;
    while bytes.get(index).is_some_and(u8::is_ascii_digit) {
        digits += 1;
        index += 1;
    }
    if bytes.get(index) == Some(&b'.') {
        index += 1;
        while bytes.get(index).is_some_and(u8::is_ascii_digit) {
            digits += 1;
            index += 1;
        }
    }
    if digits == 0 {
        return false;
    }
    if matches!(bytes.get(index), Some(b'e' | b'E')) {
        index += 1;
        if matches!(bytes.get(index), Some(b'+' | b'-')) {
            index += 1;
        }
        let start = index;
        while bytes.get(index).is_some_and(u8::is_ascii_digit) {
            index += 1;
        }
        if start == index {
            return false;
        }
    }
    index == bytes.len()
}

// Radices 2/8/16 have exact binary digits. Keep 53 significant bits and round
// the remaining integer bits once (nearest, ties to even), as JS Number does.
fn radix_integer(digits: &str, radix: u32, width: u32) -> f64 {
    if digits.is_empty()
        || !digits
            .chars()
            .all(|digit| digit.is_ascii() && digit.is_digit(radix))
    {
        return f64::NAN;
    }
    let mut length = 0_usize;
    let mut mantissa = 0_u64;
    let mut guard = false;
    let mut sticky = false;
    for digit in digits.chars().filter_map(|digit| digit.to_digit(radix)) {
        for shift in (0..width).rev() {
            let bit = digit & (1 << shift) != 0;
            if length == 0 && !bit {
                continue;
            }
            length += 1;
            if length <= 53 {
                mantissa = (mantissa << 1) | u64::from(bit);
            } else if length == 54 {
                guard = bit;
            } else {
                sticky |= bit;
            }
        }
    }
    if length <= 53 {
        return mantissa as f64;
    }
    let mut exponent = length - 1;
    if guard && (sticky || mantissa & 1 != 0) {
        mantissa += 1;
        if mantissa == 1 << 53 {
            mantissa >>= 1;
            exponent += 1;
        }
    }
    if exponent > 1023 {
        return f64::INFINITY;
    }
    f64::from_bits(((exponent as u64 + 1023) << 52) | (mantissa & ((1 << 52) - 1)))
}

pub fn finite_number(value: NumberInput<'_>) -> Result<f64, ScalarError> {
    let number = legacy_number(value);
    if number.is_finite() {
        Ok(number)
    } else {
        Err(ScalarError::NonFiniteNumber)
    }
}

pub fn positive_number(value: NumberInput<'_>) -> Result<f64, ScalarError> {
    let number = finite_number(value)?;
    if number <= 0.0 {
        Err(ScalarError::NonPositiveNumber)
    } else {
        Ok(number)
    }
}

pub fn nonnegative_number(value: NumberInput<'_>) -> Result<f64, ScalarError> {
    let number = finite_number(value)?;
    if number < 0.0 {
        Err(ScalarError::NegativeNumber)
    } else {
        Ok(number)
    }
}

pub fn js_number_string(value: f64) -> String {
    ryu_js::Buffer::new().format(value).to_owned()
}

pub fn js_to_fixed(value: f64, digits: u8) -> Result<String, ScalarError> {
    if digits > 100 {
        return Err(ScalarError::InvalidPrecision);
    }
    Ok(ryu_js::Buffer::new()
        .format_to_fixed(value, digits)
        .to_owned())
}

/// Opaque decimal wire text. No normalization, Number coercion or new rounding.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct DecimalText(pub String);

pub fn decimal_text(value: NumberInput<'_>) -> DecimalText {
    DecimalText(match value {
        NumberInput::Text(text) => text.to_owned(),
        NumberInput::Number(number) => js_number_string(number),
    })
}

pub fn nullable_decimal_text(value: Field<NumberInput<'_>>) -> Option<DecimalText> {
    match value {
        Field::Missing | Field::Null => None,
        Field::Value(value) => Some(decimal_text(value)),
    }
}

#[derive(Debug, Clone, Copy)]
pub enum DateInput<'a> {
    Instant(DateTime<Utc>),
    Text(&'a str),
    InvalidDate,
}

#[derive(Debug, Clone, Copy)]
pub enum BusinessTimeZone {
    HongKong,
    Utc,
}

/// Strings keep the original JS UTF-16 slice; they are not parsed as dates.
/// Isolated surrogate output is outside Rust UTF-8 text and is reported rather
/// than silently replaced. Public date schemas separately require ASCII ISO.
fn date_slice(text: &str) -> Result<String, ScalarError> {
    let units = text.encode_utf16().take(10).collect::<Vec<_>>();
    String::from_utf16(&units).map_err(|_| ScalarError::InvalidUtf16Boundary)
}

pub fn contract_date_only(value: Field<&str>) -> Result<Field<String>, ScalarError> {
    match value {
        Field::Missing => Ok(Field::Missing),
        Field::Null => Ok(Field::Null),
        Field::Value(text) => date_slice(text).map(Field::Value),
    }
}

pub fn business_date_only(
    value: Field<DateInput<'_>>,
    zone: BusinessTimeZone,
) -> Result<Option<String>, ScalarError> {
    let value = match value {
        Field::Missing | Field::Null => return Ok(None),
        Field::Value(value) => value,
    };
    let instant = match value {
        DateInput::Text("") => return Ok(None),
        DateInput::Text(text) => return date_slice(text).map(Some),
        DateInput::InvalidDate => return Err(ScalarError::InvalidDate),
        DateInput::Instant(instant) => instant,
    };
    let (year, month, day) = match zone {
        BusinessTimeZone::HongKong => {
            let local = instant.with_timezone(&Hong_Kong);
            (local.year(), local.month(), local.day())
        }
        BusinessTimeZone::Utc => (instant.year(), instant.month(), instant.day()),
    };
    // Intl's en-US Gregorian numeric year is a year-of-era, without padding.
    let year = if year <= 0 { 1 - year } else { year };
    Ok(Some(format!("{year}-{month:02}-{day:02}")))
}

/// Legacy timestamp parsing under the oracle's explicit UTC process contract.
/// Supports ISO/RFC3339, date-only/unpadded date and ISO local time; it is not
/// the public UTC-Z validator nor an implementation of arbitrary Date.parse.
pub fn parse_legacy_timestamp_utc(value: &str) -> Result<DateTime<Utc>, ScalarError> {
    let (date_text, time_text) = value
        .split_once(['T', 't'])
        .map_or((value, None), |(date, time)| (date, Some(time)));
    let date = normalized_legacy_date(date_text, time_text.is_some())?;
    let midnight = date.and_hms_opt(0, 0, 0).ok_or(ScalarError::InvalidDate)?;
    let Some(time) = time_text else {
        return Ok(Utc.from_utc_datetime(&midnight));
    };
    let (clock, offset_minutes) = if let Some(clock) = time.strip_suffix(['Z', 'z']) {
        (clock, 0_i64)
    } else if let Some(index) = time.find(['+', '-']) {
        let (clock, offset) = time.split_at(index);
        let digits = offset[1..].replace(':', "");
        if digits.len() != 4
            || !digits.bytes().all(|byte| byte.is_ascii_digit())
            || !(offset.len() == 5 || offset.len() == 6 && offset.as_bytes()[3] == b':')
        {
            return Err(ScalarError::InvalidDate);
        }
        let hours = digits[..2]
            .parse::<i64>()
            .map_err(|_| ScalarError::InvalidDate)?;
        let minutes = digits[2..]
            .parse::<i64>()
            .map_err(|_| ScalarError::InvalidDate)?;
        if hours > 23 || minutes > 59 {
            return Err(ScalarError::InvalidDate);
        }
        (
            clock,
            (hours * 60 + minutes) * if offset.starts_with('-') { -1 } else { 1 },
        )
    } else {
        (time, 0)
    };
    let parts = clock.split(':').collect::<Vec<_>>();
    if !(2..=3).contains(&parts.len()) {
        return Err(ScalarError::InvalidDate);
    }
    let parse_pair = |text: &str| -> Result<u32, ScalarError> {
        if text.len() != 2 || !text.bytes().all(|byte| byte.is_ascii_digit()) {
            Err(ScalarError::InvalidDate)
        } else {
            text.parse().map_err(|_| ScalarError::InvalidDate)
        }
    };
    let hour = parse_pair(parts[0])?;
    let minute = parse_pair(parts[1])?;
    let (second_text, fraction) = parts
        .get(2)
        .copied()
        .unwrap_or("00")
        .split_once('.')
        .map_or(
            (parts.get(2).copied().unwrap_or("00"), None),
            |(second, fraction)| (second, Some(fraction)),
        );
    let second = parse_pair(second_text)?;
    if hour > 24
        || minute > 59
        || second > 59
        || fraction.is_some_and(|fraction| {
            fraction.is_empty() || !fraction.bytes().all(|byte| byte.is_ascii_digit())
        })
    {
        return Err(ScalarError::InvalidDate);
    }
    if hour == 24
        && (minute != 0
            || second != 0
            || fraction.is_some_and(|fraction| fraction.bytes().any(|byte| byte != b'0')))
    {
        return Err(ScalarError::InvalidDate);
    }
    let fraction = fraction.unwrap_or("").as_bytes();
    let millis = (0..3).fold(0_u32, |value, index| {
        value * 10 + u32::from(fraction.get(index).copied().unwrap_or(b'0') - b'0')
    });
    let elapsed = Duration::milliseconds(i64::from(
        hour * 3_600_000 + minute * 60_000 + second * 1_000 + millis,
    ));
    let datetime = midnight
        .checked_add_signed(elapsed)
        .and_then(|datetime| datetime.checked_sub_signed(Duration::minutes(offset_minutes)))
        .ok_or(ScalarError::UnsupportedDateRange)?;
    Ok(Utc.from_utc_datetime(&datetime))
}

fn normalized_legacy_date(text: &str, padded: bool) -> Result<NaiveDate, ScalarError> {
    let (year_text, tail) = if text.starts_with(['+', '-']) {
        if text.as_bytes().get(7) != Some(&b'-') {
            return Err(ScalarError::InvalidDate);
        }
        let year = text.get(..7).ok_or(ScalarError::InvalidDate)?;
        if !year[1..].bytes().all(|byte| byte.is_ascii_digit()) || year == "-000000" {
            return Err(ScalarError::InvalidDate);
        }
        (year, text.get(8..).ok_or(ScalarError::InvalidDate)?)
    } else {
        let (year, tail) = text.split_once('-').ok_or(ScalarError::InvalidDate)?;
        if year.len() != 4 || !year.bytes().all(|byte| byte.is_ascii_digit()) {
            return Err(ScalarError::InvalidDate);
        }
        (year, tail)
    };
    let (month, day) = tail.split_once('-').ok_or(ScalarError::InvalidDate)?;
    if month.is_empty()
        || day.is_empty()
        || (padded && (month.len() != 2 || day.len() != 2))
        || !month
            .bytes()
            .chain(day.bytes())
            .all(|byte| byte.is_ascii_digit())
    {
        return Err(ScalarError::InvalidDate);
    }
    let year = year_text.parse().map_err(|_| ScalarError::InvalidDate)?;
    let month = month.parse::<u32>().map_err(|_| ScalarError::InvalidDate)?;
    let day = day.parse::<u32>().map_err(|_| ScalarError::InvalidDate)?;
    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return Err(ScalarError::InvalidDate);
    }
    NaiveDate::from_ymd_opt(year, month, 1)
        .and_then(|date| date.checked_add_signed(Duration::days(i64::from(day - 1))))
        .ok_or(ScalarError::UnsupportedDateRange)
}

pub fn nullable_timestamp_utc(value: Field<DateInput<'_>>) -> Result<Option<String>, ScalarError> {
    let instant = match value {
        Field::Missing | Field::Null | Field::Value(DateInput::Text("")) => return Ok(None),
        Field::Value(DateInput::InvalidDate) => return Err(ScalarError::InvalidDate),
        Field::Value(DateInput::Instant(instant)) => instant,
        Field::Value(DateInput::Text(text)) => parse_legacy_timestamp_utc(text)?,
    };
    Ok(Some(js_iso_string(instant)?))
}

pub fn js_iso_string(instant: DateTime<Utc>) -> Result<String, ScalarError> {
    let instant = DateTime::<Utc>::from_timestamp_millis(instant.timestamp_millis())
        .ok_or(ScalarError::UnsupportedDateRange)?;
    let year = instant.year();
    let year = if (0..=9999).contains(&year) {
        format!("{year:04}")
    } else {
        format!("{year:+07}")
    };
    Ok(format!(
        "{year}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        instant.month(),
        instant.day(),
        instant.hour(),
        instant.minute(),
        instant.second(),
        instant.timestamp_subsec_millis()
    ))
}

pub fn valid_wire_date(text: &str) -> bool {
    let bytes = text.as_bytes();
    bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes
            .iter()
            .enumerate()
            .all(|(index, byte)| index == 4 || index == 7 || byte.is_ascii_digit())
        && NaiveDate::parse_from_str(text, "%Y-%m-%d").is_ok()
}

pub fn valid_wire_utc_datetime(text: &str) -> bool {
    let bytes = text.as_bytes();
    if bytes.len() < 20
        || !text.ends_with('Z')
        || bytes[10] != b'T'
        || bytes[13] != b':'
        || bytes[16] != b':'
        || !text.get(..10).is_some_and(valid_wire_date)
    {
        return false;
    }
    if ![11, 12, 14, 15, 17, 18]
        .into_iter()
        .all(|index| bytes[index].is_ascii_digit())
        || &bytes[17..19] > b"59".as_slice()
    {
        return false;
    }
    if bytes.len() != 20
        && (bytes[19] != b'.'
            || bytes.len() < 22
            || !bytes[20..bytes.len() - 1].iter().all(u8::is_ascii_digit))
    {
        return false;
    }
    &bytes[11..13] <= b"23".as_slice() && &bytes[14..16] <= b"59".as_slice()
}

/// UUID validation preserves wire spelling. SQLx can use the explicit parsed
/// value; serializing Uuid directly would lowercase valid uppercase input.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UuidText(String);

impl UuidText {
    pub fn parse(text: &str) -> Result<Self, ScalarError> {
        let bytes = text.as_bytes();
        if bytes.len() != 36
            || !bytes.iter().enumerate().all(|(index, byte)| {
                if [8, 13, 18, 23].contains(&index) {
                    *byte == b'-'
                } else {
                    byte.is_ascii_hexdigit()
                }
            })
        {
            return Err(ScalarError::InvalidUuid);
        }
        let parsed = Uuid::parse_str(text).map_err(|_| ScalarError::InvalidUuid)?;
        if !parsed.is_nil()
            && parsed.as_u128() != u128::MAX
            && (!(b'1'..=b'8').contains(&bytes[14])
                || !matches!(bytes[19], b'8' | b'9' | b'a' | b'A' | b'b' | b'B'))
        {
            return Err(ScalarError::InvalidUuid);
        }
        Ok(Self(text.to_owned()))
    }
    pub fn as_str(&self) -> &str {
        &self.0
    }
    pub fn to_uuid(&self) -> Result<Uuid, ScalarError> {
        Uuid::parse_str(&self.0).map_err(|_| ScalarError::InvalidUuid)
    }
}

impl Serialize for UuidText {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.0)
    }
}
impl<'de> Deserialize<'de> for UuidText {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let text = String::deserialize(deserializer)?;
        Self::parse(&text).map_err(de::Error::custom)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct ExternalId(pub String);

/// Applies the selected request schema's trim/min/max policy. Storage/output
/// strings remain opaque. Locked Zod 4.6.1 counts Unicode code points here.
pub fn external_id(text: &str, max_code_points: usize) -> Result<ExternalId, ScalarError> {
    let text = trim_js(text);
    if text.is_empty() || text.chars().count() > max_code_points {
        Err(ScalarError::InvalidExternalId)
    } else {
        Ok(ExternalId(text.to_owned()))
    }
}

fn trim_js(text: &str) -> &str {
    text.trim_matches(|character| matches!(character, '\u{0009}'..='\u{000d}' | '\u{0020}' | '\u{00a0}' | '\u{1680}' | '\u{2000}'..='\u{200a}' | '\u{2028}' | '\u{2029}' | '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}'))
}
