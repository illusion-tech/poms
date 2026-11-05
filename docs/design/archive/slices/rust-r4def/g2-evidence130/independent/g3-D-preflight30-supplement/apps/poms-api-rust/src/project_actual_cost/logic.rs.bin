//! Exact, bounded financial and interval decisions. No database or floating point.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Fault {
    Decimal,
    Capacity,
    ZeroResult,
    AmountSplit,
    Unit,
    Priority,
}
pub const MONEY_MAX: i128 = 999_999_999_999_999_999;

pub fn scaled(value: &str, scale: usize, max: i128, zero: bool) -> Result<i128, Fault> {
    let value = value.trim();
    let mut parts = value.split('.');
    let whole = parts.next().ok_or(Fault::Decimal)?;
    let fraction = parts.next();
    if whole.is_empty()
        || !whole.bytes().all(|c| c.is_ascii_digit())
        || parts.next().is_some()
        || fraction.is_some_and(|s| {
            s.is_empty() || s.len() > scale || !s.bytes().all(|c| c.is_ascii_digit())
        })
    {
        return Err(Fault::Decimal);
    }
    let whole = whole.trim_start_matches('0');
    if whole.len() > 18 {
        return Err(Fault::Capacity);
    }
    let n = if whole.is_empty() {
        0
    } else {
        whole.parse::<i128>().map_err(|_| Fault::Capacity)?
    };
    let f = fraction
        .map_or(Ok(0), |s| {
            s.parse::<i128>()
                .map(|n| n * 10_i128.pow((scale - s.len()) as u32))
        })
        .map_err(|_| Fault::Decimal)?;
    let n = n
        .checked_mul(10_i128.pow(scale as u32))
        .and_then(|n| n.checked_add(f))
        .ok_or(Fault::Capacity)?;
    if n > max || (!zero && n == 0) {
        return Err(Fault::Capacity);
    }
    Ok(n)
}
pub fn format(n: i128, scale: usize) -> String {
    let factor = 10_i128.pow(scale as u32);
    format!("{}.{:0width$}", n / factor, n % factor, width = scale)
}
pub fn money(v: &str, zero: bool) -> Result<String, Fault> {
    scaled(v, 2, MONEY_MAX, zero).map(|n| format(n, 2))
}
/// A stored numeric(15,4) value ending in zeros can be represented exactly in
/// cents. A genuine historical subcent is rejected, never rounded.
pub fn stored_money(v: &str, zero: bool) -> Result<String, Fault> {
    let v = v.trim();
    if let Some((whole, fraction)) = v.split_once('.')
        && fraction.len() > 2
    {
        if !fraction.bytes().all(|c| c.is_ascii_digit())
            || !fraction[2..].bytes().all(|c| c == b'0')
        {
            return Err(Fault::Decimal);
        }
        return money(&format!("{whole}.{}", &fraction[..2]), zero);
    }
    money(v, zero)
}
pub fn split(gross: &str, tax: Option<&str>, net: Option<&str>) -> Result<(), Fault> {
    let g = scaled(gross, 2, MONEY_MAX, false)?;
    let t = tax.map(|v| scaled(v, 2, MONEY_MAX, true)).transpose()?;
    let n = net.map(|v| scaled(v, 2, MONEY_MAX, true)).transpose()?;
    if t.is_some_and(|t| t > g)
        || n.is_some_and(|n| n > g)
        || matches!((t,n), (Some(t),Some(n)) if t+n != g)
    {
        return Err(Fault::AmountSplit);
    }
    Ok(())
}
pub fn labor(
    rate: &str,
    unit: &str,
    hours: Option<&str>,
    days: Option<&str>,
) -> Result<(String, String, String, i128), Fault> {
    let quantity = match (unit, hours, days) {
        ("hour", Some(h), None) => h,
        ("day", None, Some(d)) => d,
        _ => return Err(Fault::Unit),
    };
    let r = scaled(rate, 4, 999_999_999_999_999, false)?;
    let q = scaled(quantity, 2, 9_999_999_999, false)?;
    let product = r.checked_mul(q).ok_or(Fault::Capacity)?;
    let cents = product.checked_add(5000).ok_or(Fault::Capacity)? / 10000;
    if cents == 0 {
        return Err(Fault::ZeroResult);
    }
    if cents > MONEY_MAX {
        return Err(Fault::Capacity);
    }
    Ok((format(cents, 2), format(r, 4), format(q, 2), product))
}
pub fn intersects(a: &str, b: Option<&str>, start: &str, end: &str) -> bool {
    a <= end && b.is_none_or(|b| b >= start)
}
pub fn role_priority(
    start: &str,
    end: &str,
    personal: &[(String, Option<String>)],
) -> Result<(), Fault> {
    if personal
        .iter()
        .any(|(from, to)| intersects(from, to.as_deref(), start, end))
    {
        Err(Fault::Priority)
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exact_capacity_and_lexical_rejection() {
        assert_eq!(
            money("9999999999999999.99", false).as_deref(),
            Ok("9999999999999999.99")
        );
        for v in [
            "0",
            "-1",
            "+1",
            "NaN",
            "Infinity",
            "1e2",
            ".1",
            "1.",
            "1.001",
            "1.200",
            "1,000",
            "10000000000000000",
        ] {
            assert!(money(v, false).is_err(), "{v}");
        }
        assert_eq!(money(" 0001.2 ", false).as_deref(), Ok("1.20"));
    }
    #[test]
    fn legacy_subcent_is_not_silently_rounded() {
        assert_eq!(stored_money("123.4500", false).as_deref(), Ok("123.45"));
        assert!(stored_money("123.4501", false).is_err());
        assert!(stored_money("123.45ä", false).is_err());
    }
    #[test]
    fn split_unknown_is_distinct_from_zero_and_single_components_bounded() {
        assert!(split("10.00", None, None).is_ok());
        assert!(split("10.00", Some("10.01"), None).is_err());
        assert!(split("10.00", None, Some("10.01")).is_err());
        assert!(split("10.00", Some("1.01"), Some("9.00")).is_err());
        assert!(split("10.00", Some("0.00"), Some("10.00")).is_ok());
    }
    #[test]
    fn half_up_is_integer_exact_and_zero_rejected() {
        assert_eq!(
            labor("0.5000", "hour", Some("0.01"), None)
                .map(|v| v.0)
                .as_deref(),
            Ok("0.01")
        );
        assert_eq!(
            labor("0.4999", "hour", Some("0.01"), None),
            Err(Fault::ZeroResult)
        );
        assert_eq!(
            labor("123.4567", "day", None, Some("22.50"))
                .map(|v| v.0)
                .as_deref(),
            Ok("2777.78")
        );
    }
    #[test]
    fn independently_valid_inputs_can_overflow_ledger() {
        assert_eq!(
            labor("99999999999.9999", "day", None, Some("99999999.99")),
            Err(Fault::Capacity)
        );
        assert!(labor("1.00001", "day", None, Some("1")).is_err());
        assert!(labor("1", "day", None, Some("1.001")).is_err());
    }
    #[test]
    fn units_are_not_implicitly_converted_or_mixed() {
        assert_eq!(labor("10", "hour", Some("2"), Some("1")), Err(Fault::Unit));
        assert_eq!(labor("10", "hour", None, Some("1")), Err(Fault::Unit));
        assert!(labor("10", "hour", Some("2"), None).is_ok());
    }
    #[test]
    fn personal_middle_overlap_cannot_use_role_for_whole_month() {
        let p = vec![("2026-11-10".into(), Some("2026-11-20".into()))];
        assert_eq!(
            role_priority("2026-11-01", "2026-11-30", &p),
            Err(Fault::Priority)
        );
        assert!(role_priority("2026-11-01", "2026-11-09", &p).is_ok());
        assert!(role_priority("2026-11-21", "2026-11-30", &p).is_ok());
    }
    #[test]
    fn personal_single_day_and_unbounded_intersections_are_inclusive() {
        assert!(intersects(
            "2026-11-30",
            Some("2026-12-01"),
            "2026-11-01",
            "2026-11-30"
        ));
        assert!(intersects(
            "2026-10-01",
            Some("2026-11-01"),
            "2026-11-01",
            "2026-11-30"
        ));
        assert!(intersects("2026-01-01", None, "2026-11-01", "2026-11-30"));
        assert!(!intersects("2026-12-01", None, "2026-11-01", "2026-11-30"));
    }
    #[test]
    fn multiple_personal_versions_only_leave_true_gap_for_role() {
        let p = vec![
            ("2026-11-02".into(), Some("2026-11-08".into())),
            ("2026-11-21".into(), None),
        ];
        assert!(role_priority("2026-11-09", "2026-11-20", &p).is_ok());
        assert!(role_priority("2026-11-08", "2026-11-21", &p).is_err());
    }
}
