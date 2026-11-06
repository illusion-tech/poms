//! Exact monetary allocation. No transport, database, float or transaction API.
use std::collections::{BTreeSet, BinaryHeap};

pub const MAX_MONEY: i128 = 999_999_999_999_999_999;
pub const ALGORITHM: &str = "largest-remainder-cents-v1";
pub const POLICY_ID: &str = "selected-measurement-first";
pub const POLICY_VERSION: u8 = 2;

pub fn decimal(value: &str, scale: u32, maximum: i128) -> Result<i128, &'static str> {
    let mut parts = value.split('.');
    let whole = parts.next().unwrap_or_default();
    let fraction = parts.next();
    if whole.is_empty()
        || !whole.bytes().all(|b| b.is_ascii_digit())
        || parts.next().is_some()
        || fraction.is_some_and(|v| {
            v.is_empty() || v.len() > scale as usize || !v.bytes().all(|b| b.is_ascii_digit())
        })
    {
        return Err("Invalid exact decimal");
    }
    let factor = 10_i128.pow(scale);
    let integer = whole
        .parse::<i128>()
        .map_err(|_| "Decimal capacity exceeded")?;
    let fraction = match fraction {
        None => 0,
        Some(v) => v
            .parse::<i128>()
            .map_err(|_| "Invalid decimal fraction")?
            .checked_mul(10_i128.pow(scale - v.len() as u32))
            .ok_or("Decimal capacity exceeded")?,
    };
    let result = integer
        .checked_mul(factor)
        .and_then(|v| v.checked_add(fraction))
        .ok_or("Decimal capacity exceeded")?;
    if result > maximum {
        return Err("Decimal capacity exceeded");
    }
    Ok(result)
}

pub fn signed_money(value: &str) -> Result<i128, &'static str> {
    match value.strip_prefix('-') {
        Some(rest) => decimal(rest, 2, MAX_MONEY).map(|v| -v),
        None => decimal(value, 2, MAX_MONEY),
    }
}

pub fn format_scaled(value: i128, scale: u32) -> String {
    let sign = if value < 0 { "-" } else { "" };
    let magnitude = value.unsigned_abs();
    let factor = 10_u128.pow(scale);
    format!(
        "{sign}{}.{:0width$}",
        magnitude / factor,
        magnitude % factor,
        width = scale as usize
    )
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Share {
    pub project: [u8; 16],
    pub weight: i128,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Allocation {
    pub project: [u8; 16],
    pub amount: i128,
    pub residual: i16,
    pub ratio: i128,
}

/// Sort before calculation and compare remainders as exact integers. Client
/// request order cannot determine who receives a residual cent.
pub fn allocate(total: i128, shares: &[Share]) -> Result<Vec<Allocation>, &'static str> {
    if !(0..=MAX_MONEY).contains(&total) || shares.is_empty() {
        return Err("Invalid allocation total or project set");
    }
    let mut ordered = shares.to_vec();
    ordered.sort_by_key(|s| s.project);
    let mut identities = BTreeSet::new();
    let mut weight_total = 0_i128;
    for share in &ordered {
        if !identities.insert(share.project) || share.weight < 0 || share.weight > MAX_MONEY {
            return Err("Invalid allocation weight or duplicate project");
        }
        weight_total = weight_total
            .checked_add(share.weight)
            .ok_or("Weight capacity exceeded")?;
    }
    if weight_total == 0 {
        return Err("At least one positive allocation weight is required");
    }
    let mut output = Vec::new();
    let mut remainders = Vec::new();
    let mut assigned = 0_i128;
    for (index, share) in ordered.iter().enumerate() {
        let numerator = total
            .checked_mul(share.weight)
            .ok_or("Allocation capacity exceeded")?;
        let amount = numerator / weight_total;
        assigned = assigned
            .checked_add(amount)
            .ok_or("Allocation capacity exceeded")?;
        let ratio_numerator = share
            .weight
            .checked_mul(1_000_000)
            .ok_or("Ratio capacity exceeded")?;
        // Ratio is explanatory, rounded HALF_UP independently; it is never an
        // input to the allocation or expected-amount calculation.
        let quotient = ratio_numerator / weight_total;
        let remainder = ratio_numerator % weight_total;
        let ratio = quotient + i128::from(remainder >= weight_total - remainder);
        output.push(Allocation {
            project: share.project,
            amount,
            residual: 0,
            ratio,
        });
        remainders.push((index, numerator % weight_total, share.project));
    }
    remainders.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.2.cmp(&b.2)));
    let leftover = usize::try_from(total - assigned).map_err(|_| "Allocation capacity exceeded")?;
    if leftover >= output.len() && leftover != 0 {
        return Err("Invalid allocation residual");
    }
    for (index, _, _) in remainders.into_iter().take(leftover) {
        output[index].amount += 1;
        output[index].residual = 1;
    }
    Ok(output)
}

pub type Layers = [Option<i128>; 3];

fn validate_layers(source: Layers) -> Result<(), &'static str> {
    if source
        .iter()
        .flatten()
        .any(|value| !(0..=MAX_MONEY).contains(value))
    {
        return Err("Invalid source money capacity");
    }
    if let Some(gross) = source[2]
        && source[..2].iter().flatten().any(|value| *value > gross)
    {
        return Err("Known source component exceeds gross");
    }
    if let [Some(net), Some(tax), Some(gross)] = source
        && net.checked_add(tax) != Some(gross)
    {
        return Err("Source monetary layers are inconsistent");
    }
    Ok(())
}

pub fn total_layers(sources: &[Layers]) -> Result<Layers, &'static str> {
    if sources.is_empty() {
        return Err("A real source set is required");
    }
    let mut result = [Some(0_i128); 3];
    for source in sources {
        validate_layers(*source)?;
        for index in 0..3 {
            result[index] = match (result[index], source[index]) {
                (Some(a), Some(b)) => Some(
                    a.checked_add(b)
                        .filter(|v| *v <= MAX_MONEY)
                        .ok_or("Source total capacity exceeded")?,
                ),
                _ => None,
            };
        }
    }
    Ok(result)
}

#[derive(Debug, PartialEq, Eq)]
pub struct LayerAllocation {
    pub project: [u8; 16],
    pub layers: Layers,
    pub amount: i128,
    pub ratio: i128,
    pub residual: i16,
}

#[derive(PartialEq, Eq, PartialOrd, Ord)]
struct QuotaCandidate {
    whole_deficit: i128,
    remainder: i128,
    tie: [u8; 16],
    index: usize,
}

/// Bounds are derived only from another known layer rounded at these weights.
/// For a gross cap, floor(net quota) <= floor(gross quota) <= gross share.
/// For a component lower bound, it exceeds floor(gross quota) by at most one.
/// Thus at most n residual corrections are needed, even for MAX18,2 money.
fn bounded_layer(
    total: i128,
    ordered: &[Share],
    lower: Option<&[i128]>,
    upper: Option<&[i128]>,
) -> Result<Vec<i128>, &'static str> {
    if lower.is_some_and(|v| v.len() != ordered.len())
        || upper.is_some_and(|v| v.len() != ordered.len())
    {
        return Err("Derived monetary bound identity mismatch");
    }
    let denominator = ordered.iter().try_fold(0_i128, |sum, share| {
        sum.checked_add(share.weight)
            .ok_or("Weight capacity exceeded")
    })?;
    if denominator <= 0 {
        return Err("At least one positive allocation weight is required");
    }
    let mut quotas = Vec::with_capacity(ordered.len());
    let mut values = Vec::with_capacity(ordered.len());
    let mut bounds = Vec::with_capacity(ordered.len());
    let (mut assigned, mut minimum, mut maximum) = (0_i128, 0_i128, 0_i128);
    for (index, share) in ordered.iter().enumerate() {
        let low = lower.map_or(0, |v| v[index]);
        let high = upper.map_or(total, |v| v[index]);
        if low < 0 || low > high || high > MAX_MONEY {
            return Err("Invalid derived monetary bounds");
        }
        let numerator = total
            .checked_mul(share.weight)
            .ok_or("Allocation capacity exceeded")?;
        let quota = (numerator / denominator, numerator % denominator);
        let value = quota.0.clamp(low, high);
        minimum = minimum.checked_add(low).ok_or("Bound capacity exceeded")?;
        maximum = maximum.checked_add(high).ok_or("Bound capacity exceeded")?;
        assigned = assigned
            .checked_add(value)
            .ok_or("Allocation capacity exceeded")?;
        quotas.push(quota);
        bounds.push((low, high));
        values.push(value);
    }
    if minimum > total || maximum < total {
        return Err("Derived monetary bounds are infeasible");
    }
    let delta = total - assigned;
    let corrections = usize::try_from(delta.unsigned_abs())
        .map_err(|_| "Derived monetary residual capacity exceeded")?;
    if corrections > ordered.len() {
        return Err("Derived monetary bounds violate the quota domain");
    }
    let increasing = delta > 0;
    let candidate = |index: usize, value: i128| {
        let (whole, remainder) = quotas[index];
        QuotaCandidate {
            // Exact lexicographic (whole deficit, fractional remainder); no
            // multiplication of an already allocated amount by total weight.
            whole_deficit: if increasing {
                whole - value
            } else {
                value - whole
            },
            remainder: if increasing { remainder } else { -remainder },
            tie: if increasing {
                ordered[index].project.map(|byte| u8::MAX - byte)
            } else {
                ordered[index].project
            },
            index,
        }
    };
    let eligible = |index: usize, value: i128| {
        if increasing {
            value < bounds[index].1
        } else {
            value > bounds[index].0
        }
    };
    let mut heap = BinaryHeap::new();
    for (index, value) in values.iter().copied().enumerate() {
        if eligible(index, value) {
            heap.push(candidate(index, value));
        }
    }
    for _ in 0..corrections {
        // Feasibility is maintained after each cent: remaining capacity is
        // always >= remaining target. No valid derived input exhausts this heap.
        let next = heap
            .pop()
            .ok_or("Derived monetary capacity invariant failed")?;
        let value = &mut values[next.index];
        *value = if increasing { *value + 1 } else { *value - 1 };
        if eligible(next.index, *value) {
            heap.push(candidate(next.index, *value));
        }
    }
    Ok(values)
}

pub fn allocate_layers(
    total: Layers,
    shares: &[Share],
    measurement: usize,
) -> Result<Vec<LayerAllocation>, &'static str> {
    if measurement > 2 || total[measurement].is_none() {
        return Err("Selected source measurement layer is unknown");
    }
    validate_layers(total)?;
    let mut ordered = shares.to_vec();
    ordered.sort_by_key(|share| share.project);
    let selected = allocate(
        total[measurement].ok_or("Missing selected layer")?,
        &ordered,
    )?;
    let primary: Vec<i128> = selected.iter().map(|row| row.amount).collect();
    let mut columns: [Option<Vec<i128>>; 3] = [None, None, None];
    columns[measurement] = Some(primary.clone());
    if measurement == 2 {
        if let Some(net) = total[0] {
            columns[0] = Some(bounded_layer(net, &ordered, None, Some(&primary))?);
        }
        if let Some(tax) = total[1] {
            columns[1] = Some(match &columns[0] {
                Some(net) => primary
                    .iter()
                    .zip(net)
                    .map(|(gross, net)| gross - net)
                    .collect(),
                None => bounded_layer(tax, &ordered, None, Some(&primary))?,
            });
        }
    } else {
        let secondary = 1 - measurement;
        if let Some(value) = total[secondary] {
            columns[secondary] = Some(
                allocate(value, &ordered)?
                    .iter()
                    .map(|row| row.amount)
                    .collect(),
            );
        }
        if let Some(gross) = total[2] {
            columns[2] = Some(match (&columns[0], &columns[1]) {
                (Some(net), Some(tax)) => net
                    .iter()
                    .zip(tax)
                    .map(|(net, tax)| {
                        net.checked_add(*tax)
                            .filter(|v| *v <= MAX_MONEY)
                            .ok_or("Allocation capacity exceeded")
                    })
                    .collect::<Result<_, _>>()?,
                _ => bounded_layer(gross, &ordered, Some(&primary), None)?,
            });
        }
    }
    for (layer, source) in total.iter().enumerate() {
        match (source, &columns[layer]) {
            (None, None) => {}
            (Some(expected), Some(values)) => {
                let sum = values.iter().try_fold(0_i128, |sum, value| {
                    if !(0..=MAX_MONEY).contains(value) {
                        return Err("Invalid allocated monetary layer");
                    }
                    sum.checked_add(*value)
                        .ok_or("Allocation capacity exceeded")
                })?;
                if sum != *expected {
                    return Err("Allocated monetary layer does not conserve");
                }
            }
            _ => return Err("Unknown monetary layer was inferred"),
        }
    }
    let mut output = Vec::new();
    for (index, allocation) in selected.iter().enumerate() {
        let layers =
            std::array::from_fn(|layer| columns[layer].as_ref().map(|values| values[index]));
        validate_layers(layers)?;
        output.push(LayerAllocation {
            project: allocation.project,
            layers,
            amount: allocation.amount,
            ratio: allocation.ratio,
            residual: allocation.residual,
        });
    }
    Ok(output)
}

pub fn sensitive_allowed(labor: bool, operating: bool, labor_permission: bool) -> bool {
    operating && (!labor || labor_permission)
}

pub fn valid_confirmation_state(status: &str, included: bool) -> bool {
    !included && matches!(status, "registered" | "confirmed")
}

#[cfg(test)]
mod tests {
    use super::*;
    fn share(id: u8, weight: i128) -> Share {
        Share {
            project: [id; 16],
            weight,
        }
    }
    #[test]
    fn cents_conserve_with_uuid_ties_and_input_permutation() {
        let first = allocate(1, &[share(3, 1), share(1, 1), share(2, 1)]).unwrap();
        let second = allocate(1, &[share(2, 1), share(3, 1), share(1, 1)]).unwrap();
        assert_eq!(first, second);
        assert_eq!(
            first.iter().map(|v| v.amount).collect::<Vec<_>>(),
            [1, 0, 0]
        );
    }
    #[test]
    fn conservation_and_quota_hold_for_many_nonuniform_weights() {
        for total in 0..200 {
            for w in 1..20 {
                let shares = [share(3, w), share(1, 1), share(2, w + 1)];
                let values = allocate(total, &shares).unwrap();
                assert_eq!(values.iter().map(|v| v.amount).sum::<i128>(), total);
                for (i, v) in values.iter().enumerate() {
                    let weight = [1, w + 1, w][i];
                    let floor = total * weight / (2 * w + 2);
                    assert!(v.amount == floor || v.amount == floor + 1);
                }
            }
        }
    }
    #[test]
    fn zero_weight_never_receives_money() {
        let v = allocate(5, &[share(1, 0), share(2, 1)]).unwrap();
        assert_eq!((v[0].amount, v[1].amount), (0, 5));
    }
    #[test]
    fn invalid_weight_sets_and_duplicate_id_reject() {
        assert!(allocate(1, &[]).is_err());
        assert!(allocate(1, &[share(1, 0)]).is_err());
        assert!(allocate(1, &[share(1, -1)]).is_err());
        assert!(allocate(1, &[share(1, 1), share(1, 2)]).is_err());
    }
    #[test]
    fn full_capacity_never_goes_through_float_or_rounded_ratio() {
        let v = allocate(MAX_MONEY, &[share(1, MAX_MONEY), share(2, MAX_MONEY - 1)]).unwrap();
        assert_eq!(v.iter().map(|v| v.amount).sum::<i128>(), MAX_MONEY);
        let thirds = allocate(10_000_000_000, &[share(1, 1), share(2, 1), share(3, 1)]).unwrap();
        assert_eq!(thirds[0].amount, 3_333_333_334);
        assert_eq!(thirds[0].ratio, 333_333);
    }
    #[test]
    fn three_layers_preserve_every_project_identity_and_batch_sum() {
        let rows = allocate_layers(
            [Some(1), Some(1), Some(2)],
            &[share(3, 1), share(1, 1), share(2, 1)],
            2,
        )
        .unwrap();
        assert_eq!(rows.iter().map(|r| r.amount).sum::<i128>(), 2);
        assert_eq!(rows[0].layers, [Some(1), Some(0), Some(1)]);
        assert_eq!(rows[1].layers, [Some(0), Some(1), Some(1)]);
        assert_eq!(rows[2].layers, [Some(0), Some(0), Some(0)]);
        for r in rows {
            assert_eq!(
                r.layers[0].unwrap() + r.layers[1].unwrap(),
                r.layers[2].unwrap()
            );
        }
    }
    #[test]
    fn unknown_layers_never_become_zero_or_gross_as_net() {
        assert_eq!(
            total_layers(&[[Some(1), None, None], [None, None, Some(5)]]).unwrap(),
            [None, None, None]
        );
        assert!(allocate_layers([None, None, Some(106)], &[share(1, 1)], 0).is_err());
        assert_eq!(
            allocate_layers([None, None, Some(106)], &[share(1, 1)], 2).unwrap()[0].layers,
            [None, None, Some(106)]
        );
    }
    #[test]
    fn selected_gross_is_primary_instead_of_accumulating_two_component_ties() {
        let shares = [share(2, 1), share(1, 1)];
        let gross = allocate_layers([Some(11), Some(1), Some(12)], &shares, 2).unwrap();
        assert_eq!(gross[0].layers, [Some(6), Some(0), Some(6)]);
        assert_eq!(gross[1].layers, [Some(5), Some(1), Some(6)]);
        assert_eq!((gross[0].residual, gross[1].residual), (0, 0));
        for primary in [0, 1] {
            let rows = allocate_layers([Some(11), Some(1), Some(12)], &shares, primary).unwrap();
            assert_eq!(rows[0].layers, [Some(6), Some(1), Some(7)]);
            assert_eq!(rows[1].layers, [Some(5), Some(0), Some(5)]);
            assert_eq!(rows[0].amount, rows[0].layers[primary].unwrap());
        }
    }
    fn alabama_shares() -> Vec<Share> {
        [1500, 1500, 900, 500, 500, 200]
            .into_iter()
            .enumerate()
            .map(|(index, weight)| share(index as u8 + 1, weight))
            .collect()
    }
    #[test]
    fn gross_capacity_redirects_net_residuals_without_rejecting_valid_input() {
        // Independent apportionment witness: at house size 25 the two 500
        // weights receive 3 each, but at size 26 they receive only 2 each.
        // An independent net result would exceed the selected gross capacities.
        let rows = allocate_layers([Some(25), Some(1), Some(26)], &alabama_shares(), 2).unwrap();
        assert_eq!(
            rows.iter()
                .map(|r| r.layers[2].unwrap())
                .collect::<Vec<_>>(),
            [8, 8, 5, 2, 2, 1]
        );
        assert_eq!(
            rows.iter()
                .map(|r| r.layers[0].unwrap())
                .collect::<Vec<_>>(),
            [8, 7, 5, 2, 2, 1]
        );
        assert_eq!(
            rows.iter()
                .map(|r| r.layers[1].unwrap())
                .collect::<Vec<_>>(),
            [0, 1, 0, 0, 0, 0]
        );
        let mut reversed = alabama_shares();
        reversed.reverse();
        assert_eq!(
            rows,
            allocate_layers([Some(25), Some(1), Some(26)], &reversed, 2).unwrap()
        );
    }
    #[test]
    fn partial_layers_keep_null_and_known_gross_respects_primary_component_lower_bounds() {
        let shares = alabama_shares();
        let rows = allocate_layers([Some(25), None, Some(26)], &shares, 0).unwrap();
        assert_eq!(
            rows.iter()
                .map(|r| r.layers[0].unwrap())
                .collect::<Vec<_>>(),
            [7, 7, 4, 3, 3, 1]
        );
        assert_eq!(
            rows.iter()
                .map(|r| r.layers[2].unwrap())
                .collect::<Vec<_>>(),
            [8, 7, 4, 3, 3, 1]
        );
        assert!(rows.iter().all(|r| r.layers[1].is_none()));
        let tax = allocate_layers([None, Some(25), Some(26)], &shares, 1).unwrap();
        assert_eq!(
            tax.iter().map(|r| r.layers[2].unwrap()).collect::<Vec<_>>(),
            [8, 7, 4, 3, 3, 1]
        );
        assert!(tax.iter().all(|r| r.layers[0].is_none()));
    }
    #[test]
    fn selected_primary_preserves_maximum_money_and_exact_final_cent() {
        let rows = allocate_layers(
            [Some(MAX_MONEY), Some(0), Some(MAX_MONEY)],
            &[share(2, 1), share(1, 1)],
            2,
        )
        .unwrap();
        assert_eq!(format_scaled(rows[0].amount, 2), "5000000000000000.00");
        assert_eq!(format_scaled(rows[1].amount, 2), "4999999999999999.99");
        assert_eq!(rows.iter().map(|r| r.amount).sum::<i128>(), MAX_MONEY);
        assert!(
            rows.iter()
                .all(|r| r.layers[0] == r.layers[2] && r.layers[1] == Some(0))
        );
    }
    #[test]
    fn every_unknown_mask_keeps_unknowns_and_every_known_layer_conserves() {
        for wa in 1..4 {
            for wb in 1..4 {
                for wc in 0..4 {
                    let mut shares = vec![share(1, wa), share(2, wb)];
                    if wc > 0 {
                        shares.push(share(3, wc));
                    }
                    for mask in 0..8 {
                        let total = std::array::from_fn(|layer| {
                            if mask & (1 << layer) == 0 {
                                None
                            } else {
                                Some([7, 2, 9][layer])
                            }
                        });
                        for primary in 0..3 {
                            if total[primary].is_none() {
                                assert!(allocate_layers(total, &shares, primary).is_err());
                                continue;
                            }
                            let rows = allocate_layers(total, &shares, primary).unwrap();
                            for (layer, amount) in total.iter().enumerate() {
                                match amount {
                                    None => assert!(rows.iter().all(|r| r.layers[layer].is_none())),
                                    Some(amount) => assert_eq!(
                                        rows.iter().map(|r| r.layers[layer].unwrap()).sum::<i128>(),
                                        *amount
                                    ),
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    #[test]
    fn finite_domain_conservation_and_constrained_net_match_exhaustive_quota_optimum() {
        let mut domains = 0;
        for wa in 1..4 {
            for wb in 1..4 {
                for wc in 0..4 {
                    let mut shares = vec![share(1, wa), share(2, wb)];
                    if wc > 0 {
                        shares.push(share(3, wc));
                    }
                    let weight_sum = wa + wb + wc;
                    for gross in 0..10 {
                        for net in 0..=gross {
                            let total = [Some(net), Some(gross - net), Some(gross)];
                            let mut reversed = shares.clone();
                            reversed.reverse();
                            for primary in 0..3 {
                                let rows = allocate_layers(total, &shares, primary).unwrap();
                                assert_eq!(
                                    rows,
                                    allocate_layers(total, &reversed, primary).unwrap()
                                );
                                for layer in 0..3 {
                                    assert_eq!(
                                        rows.iter().map(|r| r.layers[layer].unwrap()).sum::<i128>(),
                                        total[layer].unwrap()
                                    );
                                }
                                assert!(
                                    rows.iter()
                                        .all(|r| r.layers[0].unwrap() + r.layers[1].unwrap()
                                            == r.layers[2].unwrap())
                                );
                            }
                            let rows = allocate_layers(total, &shares, 2).unwrap();
                            let objective = |values: &[i128]| {
                                values
                                    .iter()
                                    .zip(&shares)
                                    .map(|(amount, share)| {
                                        (amount * weight_sum - net * share.weight).pow(2)
                                    })
                                    .sum::<i128>()
                            };
                            let actual = rows
                                .iter()
                                .map(|r| r.layers[0].unwrap())
                                .collect::<Vec<_>>();
                            let mut best = i128::MAX;
                            for a in 0..=rows[0].amount {
                                for b in 0..=rows[1].amount {
                                    let remainder = net - a - b;
                                    let candidate = if shares.len() == 2 {
                                        if remainder != 0 {
                                            continue;
                                        }
                                        vec![a, b]
                                    } else {
                                        if remainder < 0 || remainder > rows[2].amount {
                                            continue;
                                        }
                                        vec![a, b, remainder]
                                    };
                                    best = best.min(objective(&candidate));
                                }
                            }
                            assert_eq!(objective(&actual), best);
                            domains += 1;
                        }
                    }
                }
            }
        }
        assert_eq!(domains, 1980);
    }
    #[test]
    fn bounded_layers_preserve_zero_weights_and_reject_inconsistent_partial_facts() {
        let shares = [share(3, 1), share(1, 0), share(2, MAX_MONEY)];
        for primary in 0..3 {
            let rows = allocate_layers(
                [Some(MAX_MONEY - 2), Some(2), Some(MAX_MONEY)],
                &shares,
                primary,
            )
            .unwrap();
            assert_eq!(rows[0].layers, [Some(0), Some(0), Some(0)]);
        }
        assert!(allocate_layers([Some(3), None, Some(2)], &shares, 2).is_err());
        assert!(allocate_layers([None, Some(3), Some(2)], &shares, 1).is_err());
        assert!(allocate_layers([Some(-1), None, Some(2)], &shares, 2).is_err());
    }
    #[test]
    fn inconsistent_layers_and_aggregate_overflow_reject() {
        assert!(total_layers(&[[Some(100), Some(6), Some(105)]]).is_err());
        assert!(total_layers(&[[Some(MAX_MONEY), None, None], [Some(1), None, None]]).is_err());
    }
    #[test]
    fn decimals_reject_implicit_rounding_exponents_nonfinite_and_capacity() {
        for bad in [
            "1.001",
            "1e2",
            "NaN",
            "Infinity",
            "+1",
            "-1",
            ".1",
            "1.",
            "10000000000000000.00",
        ] {
            assert!(decimal(bad, 2, MAX_MONEY).is_err(), "{bad}");
        }
        assert_eq!(decimal("9999999999999999.99", 2, MAX_MONEY), Ok(MAX_MONEY));
        assert_eq!(decimal("1.234567", 6, MAX_MONEY), Ok(1_234_567));
        assert_eq!(format_scaled(-1, 2), "-0.01");
        assert_eq!(signed_money("-0.01"), Ok(-1));
    }
    #[test]
    fn labor_and_mixed_groups_need_both_sensitive_permissions() {
        for (operating, labor) in [(false, false), (true, false), (false, true)] {
            assert!(!sensitive_allowed(true, operating, labor));
        }
        assert!(sensitive_allowed(true, true, true));
        assert!(sensitive_allowed(false, true, false));
    }
    #[test]
    fn inclusion_and_replaced_states_cannot_confirm_through_stage() {
        assert!(valid_confirmation_state("registered", false));
        assert!(valid_confirmation_state("confirmed", false));
        for state in ["draft", "included", "replaced", "voided"] {
            assert!(!valid_confirmation_state(state, false));
        }
        assert!(!valid_confirmation_state("confirmed", true));
    }
}
