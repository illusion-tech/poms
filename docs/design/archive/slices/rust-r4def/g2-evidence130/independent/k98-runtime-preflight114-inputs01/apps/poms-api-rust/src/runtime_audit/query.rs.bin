//! Express's simple query parser produces strings/repeated-key arrays. Request
//! validation remains separate and preserves the original schema field order.

use super::model::QueryKind;
use crate::auth::js_json::JsString;

#[derive(Debug, Clone)]
pub(crate) enum QueryValue {
    Text(JsString),
    Number(i64),
}

#[derive(Debug, Clone)]
pub struct ValidatedQuery {
    pub(crate) kind: QueryKind,
    pub(crate) fields: Vec<(&'static str, QueryValue)>,
}

impl ValidatedQuery {
    pub fn kind(&self) -> QueryKind {
        self.kind
    }

    pub(crate) fn text(&self, key: &str) -> Option<String> {
        self.fields.iter().find_map(|(name, value)| {
            if *name != key {
                return None;
            }
            match value {
                QueryValue::Text(text) => Some(text.to_utf8_lossy()),
                QueryValue::Number(_) => None,
            }
        })
    }

    pub(crate) fn limit(&self) -> i64 {
        self.fields
            .iter()
            .find_map(|(key, value)| {
                if *key == "limit"
                    && let QueryValue::Number(number) = value
                {
                    Some(*number)
                } else {
                    None
                }
            })
            .unwrap_or(50)
    }

    #[cfg(test)]
    pub(crate) fn json(&self) -> String {
        format!(
            "{{{}}}",
            self.fields
                .iter()
                .map(|(key, value)| {
                    let value = match value {
                        QueryValue::Text(text) => text.json(),
                        QueryValue::Number(number) => number.to_string(),
                    };
                    format!("\"{key}\":{value}")
                })
                .collect::<Vec<_>>()
                .join(",")
        )
    }
}

pub(crate) fn parse(raw: Option<&str>) -> String {
    let mut fields: Vec<(String, Vec<String>)> = Vec::new();
    // Node's maxKeys counts separators even for empty pairs; url's iterator
    // skips them, so apply the bound before using its percent/plus decoder.
    for pair in raw.unwrap_or("").split('&').take(1000) {
        let Some((key, value)) = url::form_urlencoded::parse(pair.as_bytes()).next() else {
            continue;
        };
        if let Some((_, values)) = fields.iter_mut().find(|(name, _)| name == &key) {
            values.push(value.into_owned());
        } else {
            fields.push((key.into_owned(), vec![value.into_owned()]));
        }
    }
    let fields = fields
        .into_iter()
        .map(|(key, values)| {
            let key = serde_json::to_string(&key).unwrap_or_default();
            let value = if values.len() == 1 {
                serde_json::to_string(&values[0]).unwrap_or_default()
            } else {
                serde_json::to_string(&values).unwrap_or_default()
            };
            format!("{key}:{value}")
        })
        .collect::<Vec<_>>();
    format!("{{{}}}", fields.join(","))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn simple_query_keeps_repeated_keys_and_does_not_apply_bracket_nesting() {
        let actual: serde_json::Value = serde_json::from_str(&parse(Some(
            "eventType=a+b&eventType=c%2Bd&limit[]=2&targetId=%FF&__proto__=x",
        )))
        .unwrap_or_else(|_| panic!("query JSON"));
        assert_eq!(
            actual,
            serde_json::json!({"eventType":["a b","c+d"],"limit[]":"2","targetId":"�","__proto__":"x"})
        );
    }

    #[test]
    fn simple_query_has_the_original_one_thousand_pair_limit() {
        let raw = (0..1001)
            .map(|index| format!("x{index}={index}"))
            .collect::<Vec<_>>()
            .join("&");
        let actual: serde_json::Value =
            serde_json::from_str(&parse(Some(&raw))).unwrap_or_else(|_| panic!("query JSON"));
        assert_eq!(actual.as_object().map(serde_json::Map::len), Some(1000));
        assert!(actual.get("x1000").is_none());
    }

    #[test]
    fn simple_query_matches_the_original_node_parser_corpus() {
        let source: serde_json::Value =
            serde_json::from_str(include_str!("../../../../tools/rust-r2ef/f-behavior.json"))
                .unwrap_or_else(|_| panic!("behavior"));
        for case in source["simpleQueryParserCases"]
            .as_array()
            .unwrap_or_else(|| panic!("query cases"))
        {
            let actual: serde_json::Value = serde_json::from_str(&parse(case["rawQuery"].as_str()))
                .unwrap_or_else(|_| panic!("actual query"));
            let expected: serde_json::Value =
                serde_json::from_str(case["expectedRaw"].as_str().unwrap_or_default())
                    .unwrap_or_else(|_| panic!("expected query"));
            assert_eq!(actual, expected);
        }
    }
}
