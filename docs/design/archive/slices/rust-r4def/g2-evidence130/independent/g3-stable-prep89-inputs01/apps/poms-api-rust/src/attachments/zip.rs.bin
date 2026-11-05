//! The original hand-written ZIP32/store algorithm. No compression or ZIP defaults.
use crate::attachments::model::{Wire, js, trim_js};
use crate::{
    attachment_storage::StorageFailure,
    auth::js_json::{JsObject, JsString, decode_string},
    compat::scalars::js_number_string,
};
use chrono::{DateTime, Datelike, Timelike, Utc};
use serde_json::value::RawValue;

pub(crate) struct Entry {
    pub name: JsString,
    pub data: Vec<u8>,
}

pub(crate) fn package_file_name(handover_id: &str) -> String {
    format!("project-handover-{handover_id}-attachments.zip")
}

pub(crate) fn sanitize_entry_name(name: &JsString) -> JsString {
    let mut units = Vec::new();
    let mut replaced = false;
    for &unit in name.as_code_units() {
        if matches!(
            unit,
            0x005c | 0x002f | 0x003a | 0x002a | 0x003f | 0x0022 | 0x003c | 0x003e | 0x007c
        ) {
            if !replaced {
                units.push(0x005f);
            }
            replaced = true;
        } else {
            units.push(unit);
            replaced = false;
        }
    }
    let trimmed = trim_js(JsString::from_code_units(units));
    let units = trimmed.as_code_units();
    if units.is_empty() {
        js("attachment.bin")
    } else {
        JsString::from_code_units(units[..units.len().min(180)].to_vec())
    }
}

pub(crate) fn entry_name(display_name: &JsString, index: usize) -> JsString {
    let mut units = format!("{:03}-", index + 1)
        .encode_utf16()
        .collect::<Vec<_>>();
    units.extend_from_slice(sanitize_entry_name(display_name).as_code_units());
    if !display_name.as_code_units().contains(&0x002e) {
        units.extend(".bin".encode_utf16());
    }
    JsString::from_code_units(units)
}

pub(crate) fn crc32(bytes: &[u8]) -> u32 {
    let mut crc = 0xffff_ffff_u32;
    for &byte in bytes {
        crc ^= u32::from(byte);
        for _ in 0..8 {
            crc = if crc & 1 != 0 {
                (crc >> 1) ^ 0xedb8_8320
            } else {
                crc >> 1
            };
        }
    }
    crc ^ 0xffff_ffff
}

pub(crate) fn dos_date_time(date: DateTime<Utc>) -> (i64, i64) {
    let year = i64::from(date.year().max(1980));
    let time = (i64::from(date.hour()) << 11)
        | (i64::from(date.minute()) << 5)
        | i64::from(date.second() / 2);
    let day = ((year - 1980) << 9) | (i64::from(date.month()) << 5) | i64::from(date.day());
    (time, day)
}

fn range_error(value: u64, bits: u32) -> StorageFailure {
    let maximum = if bits == 16 { "65535" } else { "4294967295" };
    StorageFailure::unexpected(format!(
        "The value of \"value\" is out of range. It must be >= 0 and <= {maximum}. Received {value}"
    ))
}
fn u16_at(bytes: &mut [u8], offset: usize, value: u64) -> Result<(), StorageFailure> {
    let value = u16::try_from(value).map_err(|_| range_error(value, 16))?;
    bytes[offset..offset + 2].copy_from_slice(&value.to_le_bytes());
    Ok(())
}
fn u32_at(bytes: &mut [u8], offset: usize, value: u64) -> Result<(), StorageFailure> {
    let value = u32::try_from(value).map_err(|_| range_error(value, 32))?;
    bytes[offset..offset + 4].copy_from_slice(&value.to_le_bytes());
    Ok(())
}

pub(crate) fn build(entries: &[Entry], now: DateTime<Utc>) -> Result<Vec<u8>, StorageFailure> {
    let mut local = Vec::new();
    let mut central = Vec::new();
    let (time, date) = dos_date_time(now);
    for entry in entries {
        // Buffer.from(name,'utf8') replaces only unpaired UTF16 units here.
        let name = entry.name.to_utf8_lossy().into_bytes();
        let crc = crc32(&entry.data);
        let mut header = [0_u8; 30];
        u32_at(&mut header, 0, 0x0403_4b50)?;
        u16_at(&mut header, 4, 20)?;
        u16_at(&mut header, 6, 0x0800)?;
        u16_at(&mut header, 8, 0)?;
        u16_at(&mut header, 10, time as u64)?;
        u16_at(&mut header, 12, date as u64)?;
        u32_at(&mut header, 14, u64::from(crc))?;
        u32_at(&mut header, 18, entry.data.len() as u64)?;
        u32_at(&mut header, 22, entry.data.len() as u64)?;
        u16_at(&mut header, 26, name.len() as u64)?;
        u16_at(&mut header, 28, 0)?;
        let offset = local.len();
        local.extend_from_slice(&header);
        local.extend_from_slice(&name);
        local.extend_from_slice(&entry.data);
        let mut header = [0_u8; 46];
        u32_at(&mut header, 0, 0x0201_4b50)?;
        u16_at(&mut header, 4, 20)?;
        u16_at(&mut header, 6, 20)?;
        u16_at(&mut header, 8, 0x0800)?;
        u16_at(&mut header, 10, 0)?;
        u16_at(&mut header, 12, time as u64)?;
        u16_at(&mut header, 14, date as u64)?;
        u32_at(&mut header, 16, u64::from(crc))?;
        u32_at(&mut header, 20, entry.data.len() as u64)?;
        u32_at(&mut header, 24, entry.data.len() as u64)?;
        u16_at(&mut header, 28, name.len() as u64)?;
        u32_at(&mut header, 42, offset as u64)?;
        central.extend_from_slice(&header);
        central.extend_from_slice(&name);
    }
    let mut end = [0_u8; 22];
    u32_at(&mut end, 0, 0x0605_4b50)?;
    u16_at(&mut end, 8, entries.len() as u64)?;
    u16_at(&mut end, 10, entries.len() as u64)?;
    u32_at(&mut end, 12, central.len() as u64)?;
    u32_at(&mut end, 16, local.len() as u64)?;
    local.extend_from_slice(&central);
    local.extend_from_slice(&end);
    Ok(local)
}

/// JSON.stringify(value,null,2), retaining explicit object member order and lone UTF16.
pub(crate) fn pretty_json(value: &Wire) -> Result<Vec<u8>, StorageFailure> {
    fn quote(value: &JsString) -> String {
        let mut output = String::from("\"");
        for character in char::decode_utf16(value.as_code_units().iter().copied()) {
            match character {
                Ok('"') => output.push_str("\\\""),
                Ok('\\') => output.push_str("\\\\"),
                Ok('\u{0008}') => output.push_str("\\b"),
                Ok('\u{000c}') => output.push_str("\\f"),
                Ok('\n') => output.push_str("\\n"),
                Ok('\r') => output.push_str("\\r"),
                Ok('\t') => output.push_str("\\t"),
                Ok(character @ '\u{0000}'..='\u{001f}') => {
                    use std::fmt::Write;
                    let _ = write!(output, "\\u{:04x}", character as u32);
                }
                Ok(character) => output.push(character),
                Err(error) => {
                    use std::fmt::Write;
                    let _ = write!(output, "\\u{:04x}", error.unpaired_surrogate());
                }
            }
        }
        output.push('"');
        output
    }
    fn indent(raw: &RawValue, depth: usize) -> Result<String, StorageFailure> {
        let pad = "  ".repeat(depth);
        let child = "  ".repeat(depth + 1);
        Ok(match raw.get().as_bytes().first() {
            Some(b'{') => {
                let object = JsObject::parse(raw.get()).map_err(|_| StorageFailure::internal())?;
                let values = object
                    .keys()
                    .into_iter()
                    .map(|key| {
                        let raw = object
                            .entries()
                            .find(|(name, _)| *name == key)
                            .map(|(_, raw)| raw)
                            .ok_or_else(StorageFailure::internal)?;
                        Ok(format!(
                            "{child}{}: {}",
                            quote(key),
                            indent(raw, depth + 1)?
                        ))
                    })
                    .collect::<Result<Vec<_>, StorageFailure>>()?;
                if values.is_empty() {
                    "{}".into()
                } else {
                    format!("{{\n{}\n{pad}}}", values.join(",\n"))
                }
            }
            Some(b'[') => {
                let array: Vec<&RawValue> =
                    serde_json::from_str(raw.get()).map_err(|_| StorageFailure::internal())?;
                let values = array
                    .into_iter()
                    .map(|raw| Ok(format!("{child}{}", indent(raw, depth + 1)?)))
                    .collect::<Result<Vec<_>, StorageFailure>>()?;
                if values.is_empty() {
                    "[]".into()
                } else {
                    format!("[\n{}\n{pad}]", values.join(",\n"))
                }
            }
            Some(b'"') => quote(&decode_string(raw.get()).map_err(|_| StorageFailure::internal())?),
            Some(b'-' | b'0'..=b'9') => {
                js_number_string(raw.get().parse().map_err(|_| StorageFailure::internal())?)
            }
            _ => raw.get().into(),
        })
    }
    let raw: &RawValue = serde_json::from_str(&value.0).map_err(|_| StorageFailure::internal())?;
    Ok(indent(raw, 0)?.into_bytes())
}

/// K's HTTP values pass through Node JSON.stringify without indentation.
/// Reuse its ordered/UTF16-aware writer, then remove syntax whitespace only;
/// never collapse whitespace within a string or round-trip through sorted Value.
pub(crate) fn compact_json(value: &Wire) -> Result<Wire, StorageFailure> {
    let formatted = pretty_json(value)?;
    let mut bytes = Vec::with_capacity(formatted.len());
    let mut in_string = false;
    let mut escaped = false;
    for byte in formatted {
        if in_string {
            bytes.push(byte);
            if escaped {
                escaped = false;
            } else if byte == b'\\' {
                escaped = true;
            } else if byte == b'"' {
                in_string = false;
            }
        } else if byte == b'"' {
            in_string = true;
            bytes.push(byte);
        } else if !matches!(byte, b' ' | b'\t' | b'\n' | b'\r') {
            bytes.push(byte);
        }
    }
    Ok(Wire(
        String::from_utf8(bytes).map_err(|_| StorageFailure::internal())?,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::{Engine, engine::general_purpose::STANDARD};
    use serde_json::Value;
    fn golden() -> Value {
        serde_json::from_str(include_str!("../../../../tools/rust-r2k/k-zip-golden.json"))
            .unwrap_or_else(|_| panic!("original K helper extraction"))
    }
    fn text(value: &Value, key: &str) -> JsString {
        let raw = value[key].as_str().unwrap_or("\"\"");
        decode_string(raw).unwrap_or_else(|_| panic!("original raw JSON string"))
    }
    #[test]
    fn original_zip32_bytes_crc_and_utc_dos_time() {
        let golden = golden();
        let now = DateTime::from_timestamp_millis(golden["now"].as_i64().unwrap_or(0))
            .unwrap_or_else(|| panic!("fixed clock"));
        for case in golden["zipCases"].as_array().into_iter().flatten() {
            let entries = case["entries"]
                .as_array()
                .into_iter()
                .flatten()
                .map(|value| Entry {
                    name: text(value, "nameRaw"),
                    data: STANDARD
                        .decode(value["dataBase64"].as_str().unwrap_or(""))
                        .unwrap_or_default(),
                })
                .collect::<Vec<_>>();
            let bytes = build(&entries, now).unwrap_or_else(|_| panic!("original valid ZIP"));
            assert_eq!(STANDARD.encode(bytes), case["expectedBase64"]);
        }
        for case in golden["crcCases"].as_array().into_iter().flatten() {
            assert_eq!(
                u64::from(crc32(
                    &STANDARD
                        .decode(case["dataBase64"].as_str().unwrap_or(""))
                        .unwrap_or_default()
                )),
                case["expected"].as_u64().unwrap_or(0)
            );
        }
        for case in golden["dates"].as_array().into_iter().flatten() {
            let date = DateTime::parse_from_rfc3339(case["iso"].as_str().unwrap_or(""))
                .unwrap_or_else(|_| panic!("fixed date"));
            let (time, day) = dos_date_time(date.with_timezone(&Utc));
            assert_eq!(time, case["expected"]["dosTime"].as_i64().unwrap_or(0));
            assert_eq!(day, case["expected"]["dosDate"].as_i64().unwrap_or(0));
        }
    }
    #[test]
    fn original_archive_filename_utf16_slice_and_raw_extension_test() {
        for case in golden()["filenames"].as_array().into_iter().flatten() {
            let name = text(case, "displayNameRaw");
            assert_eq!(sanitize_entry_name(&name), text(case, "sanitizedRaw"));
            assert_eq!(
                entry_name(&name, case["index"].as_u64().unwrap_or(0) as usize),
                text(case, "expectedRaw")
            );
        }
    }
    #[test]
    fn node_compact_json_preserves_member_order_utf16_and_string_whitespace() {
        let golden: Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2k/k-wire-golden.json"
        ))
        .unwrap_or_else(|_| panic!("Node K wire corpus"));
        for case in golden["cases"].as_array().into_iter().flatten() {
            let input = Wire(case["inputRaw"].as_str().unwrap_or("").into());
            let output = compact_json(&input).unwrap_or_else(|_| panic!("valid Node JSON input"));
            assert_eq!(
                output.0,
                case["expectedRaw"].as_str().unwrap_or(""),
                "{}",
                case["name"]
            );
        }
    }
}
