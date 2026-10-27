//! Original zh-CN tree ordering and default-en-US sibling name normalization.
//! Tree text is read from PostgreSQL UTF8. Request name keys retain lone UTF16.

use std::{cmp::Ordering, sync::OnceLock};

use icu_collator::{
    Collator, CollatorPreferences,
    options::{AlternateHandling, CaseLevel, CollatorOptions, Strength},
    preferences::{CollationCaseFirst, CollationNumericOrdering},
};

use crate::{auth::js_json::JsString, roles::collation::NodeData};

pub struct CompareKey<'a> {
    pub display_order: i32,
    pub created_at_millis: i64,
    pub name: &'a str,
    pub id: &'a str,
}

pub struct OrgUnitComparator {
    name: &'static Collator,
    id: &'static Collator,
}

impl OrgUnitComparator {
    pub fn compare(&self, left: CompareKey<'_>, right: CompareKey<'_>) -> Ordering {
        left.display_order
            .cmp(&right.display_order)
            .then_with(|| left.created_at_millis.cmp(&right.created_at_millis))
            .then_with(|| self.name.as_borrowed().compare(left.name, right.name))
            .then_with(|| self.id.as_borrowed().compare(left.id, right.id))
    }
}

fn create_collator(locale: &str) -> Result<Collator, String> {
    let locale: icu_locale_core::Locale = locale.parse().map_err(|_| "invalid fixed locale")?;
    let mut preferences: CollatorPreferences = locale.into();
    preferences.case_first = Some(CollationCaseFirst::False);
    preferences.numeric_ordering = Some(CollationNumericOrdering::False);
    let mut options = CollatorOptions::default();
    options.strength = Some(Strength::Tertiary);
    options.alternate_handling = Some(AlternateHandling::NonIgnorable);
    options.case_level = Some(CaseLevel::Off);
    // The paired original Unihan root/Jamo is required even with zh-CN Baked
    // tailoring: bare Baked differs on supplementary/untailored Han inputs.
    Collator::try_new_unstable(&NodeData, preferences, options)
        .map_err(|_| "invalid fixed organization collation data".to_owned())
}

pub fn comparator() -> Result<OrgUnitComparator, String> {
    static NAME: OnceLock<Result<Collator, String>> = OnceLock::new();
    static ID: OnceLock<Result<Collator, String>> = OnceLock::new();
    Ok(OrgUnitComparator {
        name: NAME
            .get_or_init(|| create_collator("zh-CN"))
            .as_ref()
            .map_err(Clone::clone)?,
        id: ID
            .get_or_init(|| create_collator("en-US"))
            .as_ref()
            .map_err(Clone::clone)?,
    })
}

fn whitespace(unit: u16) -> bool {
    matches!(unit, 0x0009..=0x000d | 0x0020 | 0x00a0 | 0x1680 | 0x2000..=0x200a | 0x2028 | 0x2029 | 0x202f | 0x205f | 0x3000 | 0xfeff)
}

pub fn trimmed_units(units: &[u16]) -> &[u16] {
    let first = units
        .iter()
        .position(|unit| !whitespace(*unit))
        .unwrap_or(units.len());
    let last = units
        .iter()
        .rposition(|unit| !whitespace(*unit))
        .map_or(first, |index| index + 1);
    &units[first..last]
}

/// ECMAScript trim().toLocaleLowerCase(), with the frozen Node default en-US.
/// An unpaired surrogate is an uncased context boundary and stays unchanged.
pub fn sibling_name_key(text: &JsString) -> Vec<u16> {
    let mapper = icu_casemap::CaseMapper::new();
    let language = icu_locale_core::langid!("en-US");
    let mut result = Vec::new();
    let mut chunk = String::new();
    let flush = |chunk: &mut String, result: &mut Vec<u16>| {
        result.extend(mapper.lowercase_to_string(chunk, &language).encode_utf16());
        chunk.clear();
    };
    for value in char::decode_utf16(trimmed_units(text.as_code_units()).iter().copied()) {
        match value {
            Ok(value) => chunk.push(value),
            Err(error) => {
                flush(&mut chunk, &mut result);
                result.push(error.unpaired_surrogate());
            }
        }
    }
    flush(&mut chunk, &mut result);
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;
    use sha2::{Digest, Sha256};

    fn golden() -> Value {
        serde_json::from_str(include_str!(
            "../../../../tools/rust-r2c/org-units-collation-golden.json"
        ))
        .unwrap_or_else(|_| panic!("original organization collation oracle"))
    }
    #[test]
    fn finite_original_node_order_and_all_well_formed_pair_signs_match() {
        let golden = golden();
        let comparator = comparator().unwrap_or_else(|_| panic!("fixed collators"));
        let corpus = golden["corpus"]
            .as_array()
            .unwrap_or_else(|| panic!("corpus"))
            .iter()
            .map(|value| value.as_str().unwrap_or_else(|| panic!("text")).to_owned())
            .collect::<Vec<_>>();
        assert_eq!(corpus.len(), 802);
        for (locale, collator) in [("zh-CN", comparator.name), ("en-US", comparator.id)] {
            let collator = collator.as_borrowed();
            let mut sorted = corpus.clone();
            sorted.sort_by(|left, right| collator.compare(left, right));
            assert_eq!(
                serde_json::json!(sorted),
                golden["oracles"][locale]["sorted"],
                "{locale}"
            );
            let mut hash = Sha256::new();
            for left in &corpus {
                for right in &corpus {
                    hash.update([match collator.compare(left, right) {
                        Ordering::Less => 0,
                        Ordering::Equal => 1,
                        Ordering::Greater => 2,
                    }]);
                }
            }
            let hash = hash
                .finalize()
                .iter()
                .map(|byte| format!("{byte:02x}"))
                .collect::<String>();
            assert_eq!(
                Some(hash.as_str()),
                golden["oracles"][locale]["pairSignsSha256"].as_str(),
                "{locale}"
            );
        }
    }
    #[test]
    fn original_contextual_lowercase_and_surrogate_boundaries_match() {
        let golden = golden();
        let cases = golden["casing"]
            .as_array()
            .unwrap_or_else(|| panic!("casing"));
        assert_eq!(cases.len(), 817);
        for (index, case) in cases.iter().enumerate() {
            let input: Vec<u16> = serde_json::from_value(case["inputUnits"].clone())
                .unwrap_or_else(|_| panic!("input units"));
            let expected: Vec<u16> = serde_json::from_value(case["expectedUnits"].clone())
                .unwrap_or_else(|_| panic!("expected units"));
            assert_eq!(
                sibling_name_key(&JsString::from_code_units(input)),
                expected,
                "case {index}"
            );
        }
    }
    #[test]
    fn original_key_priority_and_stable_ties_are_preserved() {
        let comparator = comparator().unwrap_or_else(|_| panic!("fixed collators"));
        let key = |order, time, name, id| CompareKey {
            display_order: order,
            created_at_millis: time,
            name,
            id,
        };
        assert_eq!(
            comparator.compare(key(0, 9, "赵", "z"), key(1, 0, "阿", "a")),
            Ordering::Less
        );
        assert_eq!(
            comparator.compare(key(0, 0, "赵", "z"), key(0, 1, "阿", "a")),
            Ordering::Less
        );
        assert_eq!(
            comparator.compare(key(0, 0, "阿", "z"), key(0, 0, "赵", "a")),
            Ordering::Less
        );
        assert_eq!(
            comparator.compare(key(0, 0, "é", "b"), key(0, 0, "e\u{301}", "a")),
            Ordering::Greater
        );
        let mut equivalent = vec!["é", "e\u{301}", "é"];
        let original = equivalent.clone();
        equivalent
            .sort_by(|left, right| comparator.compare(key(0, 0, left, "a"), key(0, 0, right, "a")));
        assert_eq!(equivalent, original);
    }
}
