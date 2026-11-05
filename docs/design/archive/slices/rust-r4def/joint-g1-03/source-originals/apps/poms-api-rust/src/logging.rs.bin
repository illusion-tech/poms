//! Structured events accept only explicitly selected, non-secret fields.
//! Do not pass database errors, configuration Debug, request URLs or headers here.
use serde_json::{Value, json};
use std::io::{self, Write};
use std::time::{SystemTime, UNIX_EPOCH};

pub fn event(name: &str, fields: Value) {
    let timestamp_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let record = json!({"timestampMs": timestamp_ms, "event": name, "fields": fields});
    let mut output = io::stdout().lock();
    // A closed log reader must not panic a request or interfere with shutdown.
    let _ = writeln!(output, "{record}");
}
