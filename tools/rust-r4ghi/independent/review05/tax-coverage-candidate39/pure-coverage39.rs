// Exact candidate H coverage function under a minimal synthetic typed frame.
// This does not compile the whole application or certify source authority/PG/HTTP.
#[derive(Debug)] enum Error { Fixture }
struct SourceRef { kind: String, id: u128, row_version: i32, payload_hash: String }
struct Amount { value: Option<i128> }
struct Triple { tax: Amount }
struct Cost { amounts: Triple, tax_treatment_refs: Vec<SourceRef> }
struct Tax { tax_treatment_ref: SourceRef }
struct OperatingSourceContext { costs: Vec<Cost>, tax_treatments: Vec<Tax> }
fn amount(value: &Amount, field: &str) -> Result<Option<i128>,Error> {
    if field != "source.cost.tax" { return Err(Error::Fixture); } Ok(value.value)
}
pub(crate) fn tax_assessment_missing(context: &OperatingSourceContext) -> Result<bool, Error> {
    for cost in &context.costs {
        if amount(&cost.amounts.tax, "source.cost.tax")?.is_some_and(|tax| tax == 0) {
            continue;
        }
        let covered = cost.tax_treatment_refs.iter().any(|reference| {
            reference.kind == "AccountingTaxTreatmentSnapshot"
                && context.tax_treatments.iter().any(|tax| {
                    let actual = &tax.tax_treatment_ref;
                    reference.kind == actual.kind
                        && reference.id == actual.id
                        && reference.row_version == actual.row_version
                        && reference.payload_hash == actual.payload_hash
                })
        });
        if !covered {
            return Ok(true);
        }
    }
    Ok(false)
}

#[cfg(test)] mod tests {
 use super::*;
 fn reference(id:u128)->SourceRef { SourceRef{kind:"AccountingTaxTreatmentSnapshot".into(),id,row_version:1,payload_hash:"a".repeat(64)} }
 fn cost(value:Option<i128>,refs:Vec<SourceRef>)->Cost {Cost{amounts:Triple{tax:Amount{value}},tax_treatment_refs:refs}}
 fn context(costs:Vec<Cost>,tax_ids:&[u128])->OperatingSourceContext {OperatingSourceContext{costs,tax_treatments:tax_ids.iter().map(|id|Tax{tax_treatment_ref:reference(*id)}).collect()}}
 #[test] fn actual_old_empty_list_predicate_misses_partial_coverage(){
  let c=context(vec![cost(Some(65000),vec![]),cost(Some(13000),vec![reference(2)])],&[2]);
  let old_missing=c.tax_treatments.is_empty() && c.costs.iter().any(|v|v.amounts.tax.value.is_none_or(|v|v!=0));
  assert!(!old_missing);assert!(tax_assessment_missing(&c).unwrap());
 }
 #[test] fn all_taxed_costs_have_distinct_exact_assessments(){assert!(!tax_assessment_missing(&context(vec![cost(Some(65000),vec![reference(1)]),cost(Some(13000),vec![reference(2)])],&[1,2])).unwrap());}
 #[test] fn same_id_stale_version_is_not_coverage(){let mut r=reference(1);r.row_version=2;assert!(tax_assessment_missing(&context(vec![cost(Some(65000),vec![r])],&[1])).unwrap());}
 #[test] fn same_id_wrong_hash_is_not_coverage(){let mut r=reference(1);r.payload_hash="b".repeat(64);assert!(tax_assessment_missing(&context(vec![cost(Some(65000),vec![r])],&[1])).unwrap());}
 #[test] fn same_id_wrong_kind_is_not_coverage(){let mut r=reference(1);r.kind="CostGovernanceEvidence".into();assert!(tax_assessment_missing(&context(vec![cost(Some(65000),vec![r])],&[1])).unwrap());}
 #[test] fn unknown_tax_with_unrelated_assessment_stays_unknown(){assert!(tax_assessment_missing(&context(vec![cost(None,vec![])],&[2])).unwrap());}
 #[test] fn known_zero_needs_no_assessment(){assert!(!tax_assessment_missing(&context(vec![cost(Some(0),vec![])],&[])).unwrap());}
 #[test] fn excluded_cost_is_not_removed_from_the_complete_tax_scope(){assert!(tax_assessment_missing(&context(vec![cost(Some(65000),vec![])],&[2])).unwrap());}
 #[test] fn nonzero_share_without_local_share_ref_remains_unknown(){assert!(tax_assessment_missing(&context(vec![cost(Some(6500),vec![])],&[2])).unwrap());}
 #[test] fn zero_labor_share_can_coexist_with_a_real_direct_cost_assessment(){assert!(!tax_assessment_missing(&context(vec![cost(Some(0),vec![]),cost(Some(13000),vec![reference(2)])],&[2])).unwrap());}
}
