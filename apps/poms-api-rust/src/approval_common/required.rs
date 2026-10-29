//! Original ChangeSetPersister CREATE-only required validation. This happens
//! per INSERT group after BEGIN/before INSERT, not during repository create,
//! on UPDATE, or at an HTTP/Zod boundary.
use super::{
    CommonFailure, Text,
    js::{Data, Value, get},
    schema::Table,
};

/// Node 24 util.inspect string quoting for mapped scalar entity properties.
/// Lone UTF-16 surrogates escape, while valid pairs retain the original scalar.
pub fn inspect_text(value: &Text) -> String {
    let units = value.as_code_units();
    let quote = if units.contains(&0x27) {
        if !units.contains(&0x22) {
            '"'
        } else if !units.contains(&0x60) && !units.windows(2).any(|pair| pair == [0x24, 0x7b]) {
            '`'
        } else {
            '\''
        }
    } else {
        '\''
    };
    let mut output = String::new();
    output.push(quote);
    let mut index = 0;
    while index < units.len() {
        let unit = units[index];
        match unit {
            0x5c => output.push_str("\\\\"),
            value if value == quote as u16 => {
                output.push('\\');
                output.push(quote);
            }
            0x08 => output.push_str("\\b"),
            0x09 => output.push_str("\\t"),
            0x0a => output.push_str("\\n"),
            0x0c => output.push_str("\\f"),
            0x0d => output.push_str("\\r"),
            0x00..=0x1f | 0x7f..=0x9f => output.push_str(&format!("\\x{unit:02X}")),
            0xd800..=0xdbff
                if units
                    .get(index + 1)
                    .is_some_and(|next| (0xdc00..=0xdfff).contains(next)) =>
            {
                let low = units[index + 1];
                let scalar =
                    0x10000 + ((u32::from(unit) - 0xd800) << 10) + (u32::from(low) - 0xdc00);
                if let Some(character) = char::from_u32(scalar) {
                    output.push(character);
                }
                index += 1;
            }
            0xd800..=0xdfff => output.push_str(&format!("\\u{unit:04x}")),
            _ => {
                if let Some(character) = char::from_u32(u32::from(unit)) {
                    output.push(character);
                }
            }
        }
        index += 1;
    }
    output.push(quote);
    output
}
fn inspect_value(value: &Value) -> String {
    match value {
        Value::Undefined => "undefined".into(),
        Value::Null => "null".into(),
        Value::Bool(value) => value.to_string(),
        Value::Text(value) => inspect_text(value),
        Value::Date(Some(value)) => value.0.to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        Value::Date(None) => "Invalid Date".into(),
        Value::Number(value) if *value == 0.0 && value.is_sign_negative() => "-0".into(),
        Value::Number(value) => ryu_js::Buffer::new().format(*value).into(),
        Value::Array(values) => format!(
            "[ {} ]",
            values
                .iter()
                .map(inspect_value)
                .collect::<Vec<_>>()
                .join(", ")
        ),
        Value::Object(values) => inspect_properties(
            values
                .iter()
                .filter(|(_, value)| !matches!(value, Value::Undefined))
                .map(|(key, value)| (key.as_str(), value))
                .collect(),
        ),
    }
}
fn inspect_properties(properties: Vec<(&str, &Value)>) -> String {
    if properties.is_empty() {
        return "{}".into();
    }
    let values: Vec<_> = properties
        .into_iter()
        .map(|(key, value)| format!("{key}: {}", inspect_value(value)))
        .collect();
    let inline = format!("{{ {} }}", values.join(", "));
    if inline.encode_utf16().count() <= 80 && !inline.contains('\n') {
        inline
    } else {
        format!("{{\n  {}\n}}", values.join(",\n  "))
    }
}
pub fn validate(table: Table, data: &Data) -> Result<(), CommonFailure> {
    // The seven frozen tables have no autoincrement/generated/embedded/to-many
    // mapped properties. defaultRaw also covers their onCreate timestamp/PK
    // defaults. Nullable/default/version properties are not required here.
    for column in table.columns() {
        if !column.nullable
            && column.default.is_none()
            && !column.default_raw
            && get(data, column.property).nullish()
        {
            let entity_name = if table == Table::Confirmation {
                "confirmation-record"
            } else {
                table.class_name()
            };
            let properties = table
                .columns()
                .iter()
                .filter_map(|column| {
                    data.get(column.property)
                        .filter(|value| !matches!(value, Value::Undefined))
                        .map(|value| (column.property, value))
                })
                .collect();
            let inspected = inspect_properties(properties);
            return Err(CommonFailure::unexpected(format!(
                "Value for {entity_name}.{} is required, '{}' found\nentity: {} {inspected}",
                column.property,
                get(data, column.property).js_text().to_utf8_lossy(),
                table.class_name()
            )));
        }
    }
    Ok(())
}
