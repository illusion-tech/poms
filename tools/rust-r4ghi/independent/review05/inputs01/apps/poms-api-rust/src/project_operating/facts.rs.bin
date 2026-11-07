//! Exact primary arithmetic for the collector. H independently replays it.
use crate::{contract_support::Error, project_operating_common::model::OperatingMoneyCents};
use serde_json::{Value, json};

pub(crate) fn unknown(reason: &str) -> Value {
    json!({"knowledge":"unknown","value":null,"unknownReasonCode":reason,"basisRefs":[],"zeroProof":null})
}
pub(crate) fn known(value: OperatingMoneyCents, basis: Vec<Value>, zero: &str) -> Value {
    json!({"knowledge":"known","value":value.decimal_string(),"unknownReasonCode":null,"basisRefs":basis,"zeroProof":if value.cents()==0{Some(zero)}else{None}})
}
pub(crate) fn source_amount(row: &Value, key: &str, basis: Value) -> Result<Value, Error> {
    match row[key].as_str() {
        Some(s) => Ok(known(
            OperatingMoneyCents::parse_exact(s, key)?,
            vec![basis],
            "source-basis-value",
        )),
        None => Ok(unknown("source-monetary-layer-missing")),
    }
}
pub(crate) fn triple(
    row: &Value,
    fields: [&str; 3],
    currency: Option<&str>,
    basis: Value,
) -> Result<Value, Error> {
    let net = source_amount(row, fields[0], basis.clone())?;
    let tax = source_amount(row, fields[1], basis.clone())?;
    let gross = source_amount(row, fields[2], basis)?;
    if let (Some(n), Some(t), Some(g)) = (cents(&net)?, cents(&tax)?, cents(&gross)?) {
        if n.checked_add(t)?.cents() != g.cents() {
            return Err(super::store::conflict(
                "operating_source_monetary_layers_inconsistent",
            ));
        }
        if n.cents() < 0 || t.cents() < 0 || g.cents() < 0 {
            return Err(super::store::conflict("operating_source_negative_amount"));
        }
    }
    Ok(json!({"currency":currency,"net":net,"tax":tax,"gross":gross}))
}
pub(crate) fn empty_triple(currency: Option<&str>, closed: bool) -> Result<Value, Error> {
    let value = if closed && currency.is_some() {
        known(
            OperatingMoneyCents::from_cents(0, "emptyScope")?,
            vec![],
            "exhaustive-classified-scope-zero",
        )
    } else {
        unknown("scope-not-closed")
    };
    Ok(json!({"currency":currency,"net":value,"tax":value,"gross":value}))
}
pub(crate) fn sum_triples<'a>(
    values: impl IntoIterator<Item = &'a Value>,
    currency: Option<&str>,
    closed: bool,
) -> Result<Value, Error> {
    let values = values.into_iter().collect::<Vec<_>>();
    if currency.is_none() {
        let u = unknown("currency-unproven-or-multiple");
        return Ok(json!({"currency":null,"net":u,"tax":u,"gross":u}));
    }
    if values.is_empty() {
        return empty_triple(currency, closed);
    }
    let mut out = json!({"currency":currency});
    for layer in ["net", "tax", "gross"] {
        out[layer] = sum_amounts(values.iter().map(|v| &v[layer]), layer)?;
    }
    Ok(out)
}
pub(crate) fn sum_amounts<'a>(
    values: impl IntoIterator<Item = &'a Value>,
    field: &str,
) -> Result<Value, Error> {
    let mut sum = OperatingMoneyCents::from_cents(0, field)?;
    let mut refs = Vec::new();
    for amount in values {
        let Some(value) = cents(amount)? else {
            return Ok(unknown("aggregate-member-unknown"));
        };
        sum = sum.checked_add(value)?;
        if let Some(basis) = amount["basisRefs"].as_array() {
            refs.extend(basis.iter().cloned());
        }
    }
    refs.sort_by_key(Value::to_string);
    refs.dedup();
    Ok(known(sum, refs, "sum-known-members-zero"))
}
pub(crate) fn cents(value: &Value) -> Result<Option<OperatingMoneyCents>, Error> {
    if value["knowledge"] == "unknown" {
        if !value["value"].is_null() {
            return Err(Error::Internal);
        }
        return Ok(None);
    }
    value["value"]
        .as_str()
        .map(|s| OperatingMoneyCents::parse_exact(s, "contextAmount"))
        .transpose()
}
pub(crate) fn difference(a: &Value, b: &Value, _field: &str) -> Result<Value, Error> {
    match (cents(a)?, cents(b)?) {
        (Some(a), Some(b)) => Ok(known(a.checked_sub(b)?, vec![], "sum-known-members-zero")),
        _ => Ok(unknown("difference-input-unknown")),
    }
}
pub(crate) fn ratio(numerator: &Value, denominator: &Value) -> Result<Value, Error> {
    let (Some(n), Some(d)) = (cents(numerator)?, cents(denominator)?) else {
        return Ok(json!({"knowledge":"unknown","value":null,"reasonCode":"missing-evidence"}));
    };
    if d.cents() == 0 {
        return Ok(json!({"knowledge":"unknown","value":null,"reasonCode":"zero-denominator"}));
    }
    let scaled = n
        .cents()
        .checked_mul(1_000_000)
        .ok_or_else(|| Error::Unprocessable("operating_money_capacity_exceeded".into()))?;
    let quotient = scaled / d.cents();
    let remainder = scaled % d.cents();
    let round = remainder.abs().checked_mul(2).ok_or(Error::Internal)? >= d.cents().abs();
    let value = quotient
        .checked_add(if round {
            if (n.cents() < 0) ^ (d.cents() < 0) {
                -1
            } else {
                1
            }
        } else {
            0
        })
        .ok_or(Error::Internal)?;
    let text = format!(
        "{}{}.{:06}",
        if value < 0 { "-" } else { "" },
        value.abs() / 1_000_000,
        value.abs() % 1_000_000
    );
    Ok(json!({"knowledge":"known","value":text,"reasonCode":null}))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn signed_ratio_keeps_negative_and_exact_boundary() {
        let n = known(
            OperatingMoneyCents::from_cents(-100, "n").unwrap(),
            vec![],
            "source-basis-value",
        );
        let d = known(
            OperatingMoneyCents::from_cents(100, "d").unwrap(),
            vec![],
            "source-basis-value",
        );
        assert_eq!(ratio(&n, &d).unwrap()["value"], "-1.000000");
    }
    #[test]
    fn unknown_never_becomes_zero() {
        assert!(cents(&unknown("missing")).unwrap().is_none());
    }
    #[test]
    fn bounded_maximums_may_have_zero_difference() {
        let a = known(
            OperatingMoneyCents::parse_exact("9999999999999999.99", "max").unwrap(),
            vec![],
            "source-basis-value",
        );
        assert_eq!(difference(&a, &a, "margin").unwrap()["value"], "0.00");
    }
}
