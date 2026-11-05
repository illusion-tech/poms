#![forbid(unsafe_code)]

use icu_collator::provider::{
    Baked as CollatorBaked, CollationData, CollationDiacriticsV1, CollationJamo, CollationJamoV1,
    CollationMetadataV1, CollationReorderingV1, CollationRootV1, CollationSpecialPrimariesV1,
    CollationTailoringV1,
};
use icu_collator::{
    Collator, CollatorPreferences,
    options::{AlternateHandling, CaseLevel, CollatorOptions, Strength},
    preferences::{CollationCaseFirst, CollationNumericOrdering},
};
use icu_normalizer::provider::{
    Baked as NormalizerBaked, NormalizerNfdDataV1, NormalizerNfdTablesV1,
};
use icu_provider::prelude::*;
use std::sync::OnceLock;

pub struct NodeData;

fn collator() -> Result<&'static Collator, String> {
    static COLLATOR: OnceLock<Result<Collator, String>> = OnceLock::new();
    COLLATOR
        .get_or_init(|| {
            let locale: icu_locale_core::Locale = "en-US"
                .parse()
                .map_err(|_| "invalid fixed locale".to_owned())?;
            let mut preferences: CollatorPreferences = locale.into();
            preferences.case_first = Some(CollationCaseFirst::False);
            preferences.numeric_ordering = Some(CollationNumericOrdering::False);
            let mut options = CollatorOptions::default();
            options.strength = Some(Strength::Tertiary);
            options.alternate_handling = Some(AlternateHandling::NonIgnorable);
            options.case_level = Some(CaseLevel::Off);
            Collator::try_new_unstable(&NodeData, preferences, options)
                .map_err(|_| "invalid generated collation data".to_owned())
        })
        .as_ref()
        .map_err(Clone::clone)
}

pub fn sort_permission_keys(keys: &mut [String]) -> Result<(), String> {
    let collator = collator()?.as_borrowed();
    // Rust's stable sort preserves assignment order for canonically equivalent keys.
    keys.sort_by(|left, right| collator.compare(left, right));
    Ok(())
}

impl DataProvider<CollationRootV1> for NodeData {
    fn load(&self, _request: DataRequest) -> Result<DataResponse<CollationRootV1>, DataError> {
        let root: CollationData<'static> = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2b/collation/root.json"
        ))
        .map_err(|_| DataError::custom("invalid generated Unihan root"))?;
        Ok(DataResponse {
            metadata: Default::default(),
            payload: DataPayload::from_owned(root),
        })
    }
}

impl DataProvider<CollationJamoV1> for NodeData {
    fn load(&self, _request: DataRequest) -> Result<DataResponse<CollationJamoV1>, DataError> {
        let jamo: CollationJamo<'static> = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2b/collation/jamo.json"
        ))
        .map_err(|_| DataError::custom("invalid generated Unihan Jamo"))?;
        Ok(DataResponse {
            metadata: Default::default(),
            payload: DataPayload::from_owned(jamo),
        })
    }
}

macro_rules! delegate {
    ($marker:ty, $provider:ident) => {
        impl DataProvider<$marker> for NodeData {
            fn load(&self, request: DataRequest) -> Result<DataResponse<$marker>, DataError> {
                <$provider as DataProvider<$marker>>::load(&$provider, request)
            }
        }
    };
}

delegate!(CollationSpecialPrimariesV1, CollatorBaked);
delegate!(CollationTailoringV1, CollatorBaked);
delegate!(CollationDiacriticsV1, CollatorBaked);
delegate!(CollationMetadataV1, CollatorBaked);
delegate!(CollationReorderingV1, CollatorBaked);
delegate!(NormalizerNfdDataV1, NormalizerBaked);
delegate!(NormalizerNfdTablesV1, NormalizerBaked);

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;
    use sha2::{Digest, Sha256};

    #[test]
    fn fixed_linux_node_order_and_pairwise_comparisons_match() -> Result<(), String> {
        let golden: Value = serde_json::from_str(include_str!(
            "../../../../tools/rust-r2b/collation/golden.json"
        ))
        .map_err(|_| "invalid golden")?;
        let mut all = Vec::new();
        for name in ["keys", "mixed"] {
            let mut values = golden["inputs"][name]
                .as_array()
                .ok_or("input")?
                .iter()
                .map(|item| item.as_str().map(str::to_owned).ok_or("text"))
                .collect::<Result<Vec<_>, _>>()?;
            all.extend(values.clone());
            sort_permission_keys(&mut values)?;
            assert_eq!(serde_json::json!(values), golden["expected"][name]);
        }
        let collator = collator()?.as_borrowed();
        let mut signs = Sha256::new();
        for left in &all {
            for right in &all {
                let actual: u8 = match collator.compare(left, right) {
                    std::cmp::Ordering::Less => 0,
                    std::cmp::Ordering::Equal => 1,
                    std::cmp::Ordering::Greater => 2,
                };
                signs.update([actual]);
            }
        }
        assert_eq!(
            signs
                .finalize()
                .iter()
                .map(|byte| format!("{byte:02x}"))
                .collect::<String>(),
            golden["pairSignsSha256"].as_str().ok_or("pair hash")?
        );
        Ok(())
    }

    #[test]
    fn equivalent_keys_preserve_original_assignment_order() -> Result<(), String> {
        let mut keys = vec!["é".into(), "e\u{301}".into(), "é".into()];
        let original = keys.clone();
        sort_permission_keys(&mut keys)?;
        assert_eq!(keys, original);
        Ok(())
    }
}
