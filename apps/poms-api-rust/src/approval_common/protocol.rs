//! Bounded transport only. This protocol is shared with l-protocol.mjs and
//! never turns a probe-admission failure into a product HttpException.

use super::{CommonFailure, JsField, Text};
use crate::auth::js_json::JsObject;
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::{collections::BTreeSet, fmt};

pub const VERSION: u8 = 1;
pub const MAX_LINE_BYTES: usize = 1024 * 1024;
pub const MAX_STEPS: usize = 128;
pub const OPERATIONS: &[&str] = &[
    "tx.begin",
    "tx.commit",
    "tx.rollback",
    "session.flush",
    "session.clear",
    "managed.assign",
    "summary.create",
    "summary.definition.find",
    "summary.definition.create",
    "summary.definition.save",
    "summary.snapshot.findById",
    "summary.snapshot.findActiveByTarget",
    "summary.snapshot.findByTarget",
    "summary.snapshot.create",
    "summary.snapshot.save",
    "summary.projection.findBySnapshot",
    "summary.projection.create",
    "summary.projection.saveAll",
    "confirmation.create",
    "confirmation.confirm",
    "confirmation.close",
    "confirmation.progress",
    "confirmation.latest",
    "approval.get",
    "approval.latest",
    "approval.openTodos",
    "approval.project",
    "todo.project",
    "approval.resolve",
];

#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum OnError {
    #[default]
    Stop,
    Continue,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CaseRequest {
    pub version: f64,
    pub run_id: String,
    pub case_id: String,
    pub steps: Vec<Step>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Step {
    pub op: String,
    #[serde(default)]
    pub input: JsField<Box<RawValue>>,
    #[serde(default, rename = "as")]
    pub binding: JsField<String>,
    #[serde(default, rename = "onError")]
    pub on_error: OnError,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProbeRejected(pub &'static str);

impl fmt::Display for ProbeRejected {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.0)
    }
}

impl std::error::Error for ProbeRejected {}

fn forbidden(value: &str) -> bool {
    matches!(value, "__proto__" | "prototype" | "constructor")
}

fn binding_valid(value: &str) -> bool {
    let mut bytes = value.bytes();
    value.len() <= 64
        && bytes.next().is_some_and(|byte| byte.is_ascii_alphabetic())
        && bytes.all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
        && !forbidden(value)
}

pub fn reference_parts(value: &str) -> Result<Vec<String>, ProbeRejected> {
    let parts: Vec<_> = value.split('.').collect();
    if parts.len() > 16
        || !parts.first().is_some_and(|part| binding_valid(part))
        || parts.iter().any(|part| {
            part.is_empty()
                || forbidden(part)
                || !part
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
        })
    {
        return Err(ProbeRejected("Invalid reference path"));
    }
    Ok(parts.into_iter().map(String::from).collect())
}

fn inspect_tree(raw: &RawValue, depth: usize, budget: &mut usize) -> Result<(), ProbeRejected> {
    *budget += 1;
    if depth > 32 || *budget > 20000 {
        return Err(ProbeRejected("Probe value exceeds bounded shape"));
    }
    match raw.get().as_bytes().first() {
        Some(b'[') => {
            let entries: Vec<&RawValue> = serde_json::from_str(raw.get())
                .map_err(|_| ProbeRejected("Probe line must be JSON"))?;
            for entry in entries {
                inspect_tree(entry, depth + 1, budget)?;
            }
        }
        Some(b'{') => {
            let object =
                JsObject::parse(raw.get()).map_err(|_| ProbeRejected("Probe line must be JSON"))?;
            let entries: Vec<_> = object.entries().collect();
            if entries.iter().any(|(key, _)| {
                key.eq_ascii("__proto__")
                    || key.eq_ascii("prototype")
                    || key.eq_ascii("constructor")
            }) {
                return Err(ProbeRejected("Probe value has a forbidden key"));
            }
            if let Some(reference) = object.get("$ref") {
                if entries.len() != 1 {
                    return Err(ProbeRejected("Invalid reference marker"));
                }
                let value: Text = serde_json::from_str(reference.get())
                    .map_err(|_| ProbeRejected("Invalid reference marker"))?;
                reference_parts(&value.to_utf8_lossy())?;
            } else if let Some(date) = object.get("$date") {
                if entries.len() != 1 || serde_json::from_str::<Text>(date.get()).is_err() {
                    return Err(ProbeRejected("Invalid Date marker"));
                }
            } else {
                for (_, value) in entries {
                    inspect_tree(value, depth + 1, budget)?;
                }
            }
        }
        _ => {}
    }
    Ok(())
}

pub fn parse_case_line(line: &str) -> Result<CaseRequest, ProbeRejected> {
    if line.len() > MAX_LINE_BYTES {
        return Err(ProbeRejected("Probe line exceeds bound"));
    }
    let input: CaseRequest = serde_json::from_str(line)
        .map_err(|_| ProbeRejected("Probe line must be JSON with a valid case shape"))?;
    if input.version != f64::from(VERSION)
        || uuid::Uuid::parse_str(&input.run_id)
            .ok()
            .is_none_or(|id| id.to_string() != input.run_id)
        || input.case_id.is_empty()
        || input.case_id.len() > 96
        || !input.case_id.as_bytes()[0].is_ascii_alphanumeric()
        || !input
            .case_id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'.' | b'-'))
    {
        return Err(ProbeRejected("Probe case identity/version rejected"));
    }
    if input.steps.is_empty() || input.steps.len() > MAX_STEPS {
        return Err(ProbeRejected("Probe steps exceed bound"));
    }
    let mut names = BTreeSet::new();
    for step in &input.steps {
        if !OPERATIONS.contains(&step.op.as_str()) {
            return Err(ProbeRejected("Unknown probe operation"));
        }
        match &step.binding {
            JsField::Null => return Err(ProbeRejected("Probe binding rejected or repeated")),
            JsField::Value(name) if !binding_valid(name) || !names.insert(name.clone()) => {
                return Err(ProbeRejected("Probe binding rejected or repeated"));
            }
            _ => {}
        }
        if let JsField::Value(raw) = &step.input {
            inspect_tree(raw, 0, &mut 0)?;
        }
    }
    Ok(input)
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StepObservation {
    pub index: usize,
    pub op: String,
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub defined: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<Box<RawValue>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<CommonFailure>,
}

impl StepObservation {
    pub fn undefined(index: usize, op: &str) -> Self {
        Self {
            index,
            op: op.into(),
            ok: true,
            defined: Some(false),
            value: None,
            error: None,
        }
    }

    pub fn value<T: Serialize>(index: usize, op: &str, value: &T) -> Result<Self, ProbeRejected> {
        Ok(Self {
            index,
            op: op.into(),
            ok: true,
            defined: Some(true),
            value: Some(
                serde_json::value::to_raw_value(value)
                    .map_err(|_| ProbeRejected("Probe result serialization failed"))?,
            ),
            error: None,
        })
    }

    pub fn failure(index: usize, op: &str, error: CommonFailure) -> Self {
        Self {
            index,
            op: op.into(),
            ok: false,
            defined: None,
            value: None,
            error: Some(error),
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CaseObservation {
    pub version: u8,
    pub run_id: String,
    pub case_id: String,
    pub execution: &'static str,
    pub steps: Vec<StepObservation>,
}

#[cfg(test)]
mod tests {
    use super::{OPERATIONS, parse_case_line};
    use crate::approval_common::JsField;

    #[test]
    fn input_surrogates_are_not_decoded_through_serde_string() {
        let case = parse_case_line(r#"{"version":1,"runId":"00000000-0000-4000-8000-000000000081","caseId":"raw","steps":[{"op":"confirmation.create","input":{"title":"\ud800"}}]}"#)
            .unwrap_or_else(|_| panic!("raw input"));
        assert!(
            matches!(&case.steps[0].input, JsField::Value(raw) if raw.get().contains("\\ud800"))
        );
        assert_eq!(OPERATIONS.len(), 29);
    }

    #[test]
    fn unsafe_reference_is_a_probe_rejection() {
        assert!(parse_case_line(r#"{"version":1,"runId":"00000000-0000-4000-8000-000000000081","caseId":"raw","steps":[{"op":"summary.create","input":{"$ref":"x.__proto__"}}]}"#).is_err());
    }
}
