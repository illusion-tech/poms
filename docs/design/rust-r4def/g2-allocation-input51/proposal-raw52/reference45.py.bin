"""Pure integer proposal model. No production import, I/O, DB or API producer."""
MAX_MONEY = 999_999_999_999_999_999
ROUNDING_FAMILY = 'largest-remainder-cents-v1'
POLICY = {'id': 'selected-measurement-first', 'version': 2}


def ranked(shares):
    ordered = sorted(shares)
    if not ordered or len({key for key, _ in ordered}) != len(ordered):
        raise ValueError('empty or duplicate project identity')
    if any(weight < 0 for _, weight in ordered) or sum(weight for _, weight in ordered) <= 0:
        raise ValueError('nonnegative weights with positive total required')
    return ordered


def bounded(total, shares, lower=None, upper=None):
    """Exact closest-quota allocation with deterministic residual corrections.

    Called only with bounds derived from another rounded known monetary layer.
    Those bounds change a floor quota by at most one cent, so adjustment work is
    bounded by project count, not the monetary total. Scores use integer/remainder
    pairs rather than total*weight - allocated*sum(weight).
    """
    ordered = ranked(shares)
    keys = [key for key, _ in ordered]
    denominator = sum(weight for _, weight in ordered)
    low = [0 if lower is None else lower[key] for key in keys]
    high = [total if upper is None else upper[key] for key in keys]
    if not 0 <= total <= MAX_MONEY or any(not 0 <= a <= b for a, b in zip(low, high)):
        raise ValueError('invalid monetary bounds')
    if sum(low) > total or sum(high) < total:
        raise ValueError('infeasible monetary bounds')
    quotas = [divmod(total * weight, denominator) for _, weight in ordered]
    values = [min(max(whole, a), b) for (whole, _), a, b in zip(quotas, low, high)]
    delta = total - sum(values)
    if abs(delta) > len(keys):
        raise ValueError('bounds do not belong to the proposed derived-layer domain')
    corrections = 0
    while delta > 0:
        eligible = [i for i in range(len(keys)) if values[i] < high[i]]
        if not eligible:
            raise ValueError('no remaining capacity')
        # Largest remaining exact entitlement, then ascending UUID bytes.
        index = min(eligible, key=lambda i: (-(quotas[i][0] - values[i]), -quotas[i][1], keys[i]))
        values[index] += 1
        delta -= 1
        corrections += 1
    while delta < 0:
        eligible = [i for i in range(len(keys)) if values[i] > low[i]]
        if not eligible:
            raise ValueError('no releasable capacity')
        # Largest exact excess; equal-cost removal uses descending UUID, so
        # the lexicographic allocation preference still favors smaller UUIDs.
        index = max(eligible, key=lambda i: (values[i] - quotas[i][0], -quotas[i][1], keys[i]))
        values[index] -= 1
        delta += 1
        corrections += 1
    assert corrections <= len(keys)
    return dict(zip(keys, values))


def hamilton(total, shares):
    return bounded(total, shares)


def allocate(total, shares, primary):
    """total=[net,tax,gross] exact cents or None; primary in 0/1/2."""
    ordered = ranked(shares)
    if primary not in (0, 1, 2) or total[primary] is None:
        raise ValueError('primary measurement layer must be proven')
    if any(value is not None and not 0 <= value <= MAX_MONEY for value in total):
        raise ValueError('uncertified amount or monetary capacity exceeded')
    net, tax, gross = total
    if gross is not None and any(value is not None and value > gross for value in (net, tax)):
        raise ValueError('known nonnegative component exceeds proven gross')
    if all(value is not None for value in total) and net + tax != gross:
        raise ValueError('known monetary layers do not conserve')
    output = [[None, None, None] for _ in ordered]
    primary_values = hamilton(total[primary], ordered)
    columns = {primary: primary_values}
    if primary == 2:
        if net is not None:
            columns[0] = bounded(net, ordered, upper=primary_values)
        if tax is not None:
            columns[1] = ({key: primary_values[key] - columns[0][key] for key, _ in ordered}
                          if net is not None else bounded(tax, ordered, upper=primary_values))
    else:
        secondary = 1 - primary
        if total[secondary] is not None:
            columns[secondary] = hamilton(total[secondary], ordered)
        if gross is not None:
            columns[2] = ({key: columns[0][key] + columns[1][key] for key, _ in ordered}
                          if net is not None and tax is not None else bounded(gross, ordered, lower=primary_values))
    for row, (key, _) in zip(output, ordered):
        for layer, values in columns.items():
            row[layer] = values[key]
    for layer, value in enumerate(total):
        assert (all(row[layer] is None for row in output) if value is None else sum(row[layer] for row in output) == value)
    for row in output:
        assert all(value is None or 0 <= value <= MAX_MONEY for value in row)
        if all(value is not None for value in row):
            assert row[0] + row[1] == row[2]
    return dict((key, row) for (key, _), row in zip(ordered, output))
