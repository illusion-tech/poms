//! Business text must round-trip through the UTF-8 database without replacement.
use crate::auth::js_json::JsString;
use serde_json::{Value, json};

pub fn storable_text_error(value: &JsString, path: Vec<Value>) -> Option<Value> {
    let message = if value.as_code_units().contains(&0) {
        "Text must not contain a NUL character"
    } else if char::decode_utf16(value.as_code_units().iter().copied()).any(|unit| unit.is_err()) {
        "Text must contain valid Unicode characters"
    } else {
        return None;
    };
    Some(json!({"code":"custom","path":path,"message":message}))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepted_text_round_trips_without_surrogate_replacement() {
        assert!(
            storable_text_error(
                &JsString::from_code_units(vec![0x4e2d, 0xd83d, 0xde00]),
                vec![]
            )
            .is_none()
        );
        for units in [vec![0], vec![0xd800], vec![0xdc00]] {
            assert!(
                storable_text_error(&JsString::from_code_units(units), vec![json!("body")])
                    .is_some()
            );
        }
    }
}
