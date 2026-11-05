import hashlib
import itertools
import json
import pathlib
from datetime import datetime, timezone
from reference45 import MAX_MONEY, POLICY, ROUNDING_FAMILY, allocate, bounded, hamilton

folder = pathlib.Path(__file__).resolve().parent
report_path = folder / 'static-model-checks45.json'
assert not report_path.exists(), 'Preserve earlier model evidence'
known = [11, 1, 12]
shares = [('a', 1), ('b', 1)]
assert allocate(known, shares, 2) == {'a': [6, 0, 6], 'b': [5, 1, 6]}
assert allocate(known, shares, 0) == {'a': [6, 1, 7], 'b': [5, 0, 5]}
assert allocate(known, shares, 1) == {'a': [6, 1, 7], 'b': [5, 0, 5]}
assert allocate(known, [('a', 1), ('b', 2)], 2) == {'a': [4, 0, 4], 'b': [7, 1, 8]}
assert allocate(known, [('a', 1), ('b', 4)], 2) == {'a': [2, 0, 2], 'b': [9, 1, 10]}
assert allocate([MAX_MONEY, 0, MAX_MONEY], shares, 2) == {
    'a': [500_000_000_000_000_000, 0, 500_000_000_000_000_000],
    'b': [499_999_999_999_999_999, 0, 499_999_999_999_999_999],
}
assert allocate([11, None, 12], shares, 2) == {'a': [6, None, 6], 'b': [5, None, 6]}
assert allocate([None, 1, 12], shares, 2) == {'a': [None, 1, 6], 'b': [None, 0, 6]}
assert allocate([11, 1, None], shares, 0) == {'a': [6, 1, None], 'b': [5, 0, None]}
assert allocate([None, None, 1], shares, 2) == {'a': [None, None, 1], 'b': [None, None, 0]}

property_cases = 0
objective_cases = 0
for count in [2, 3]:
    for weights in itertools.product(range(1, 4), repeat=count):
        share = list(zip('abc'[:count], weights))
        for gross in range(10):
            for net in range(gross + 1):
                total = [net, gross - net, gross]
                for primary in range(3):
                    expected = allocate(total, share, primary)
                    assert expected == allocate(total, list(reversed(share)), primary)
                    property_cases += 1
                capacity = hamilton(gross, share)
                actual = bounded(net, share, upper=capacity)
                denominator = sum(weights)
                def objective(values):
                    return sum((values[i] * denominator - net * weights[i]) ** 2 for i in range(count))
                feasible = [values for values in itertools.product(*(range(capacity[key] + 1) for key, _ in share)) if sum(values) == net]
                assert objective(tuple(actual[key] for key, _ in share)) == min(map(objective, feasible))
                objective_cases += 1
        for mask in itertools.product([False, True], repeat=3):
            partial = [v if flag else None for v, flag in zip([7, 2, 9], mask)]
            for primary in range(3):
                if partial[primary] is None:
                    try:
                        allocate(partial, share, primary)
                        raise AssertionError('unknown selected layer must reject')
                    except ValueError:
                        pass
                else:
                    expected = allocate(partial, share, primary)
                    for layer, flag in enumerate(mask):
                        assert all(row[layer] is None for row in expected.values()) if not flag else sum(row[layer] for row in expected.values()) == partial[layer]
                    property_cases += 1

extreme = [('a', 0), ('b', 999_999_999_999_999_999), ('c', 1), ('d', 999_999_999_999_999_998)]
for permutation in itertools.permutations(extreme):
    for primary in range(3):
        answer = allocate([MAX_MONEY - 2, 2, MAX_MONEY], list(permutation), primary)
        assert answer == allocate([MAX_MONEY - 2, 2, MAX_MONEY], extreme, primary)
        assert answer['a'] == [0, 0, 0]
        property_cases += 1

vectors = [
    {'name': 'gross-primary-half-split-correction', 'totalCents': [11, 1, 12], 'weights': [1, 1], 'measurementBasis': 'including-tax', 'expectedCents': [[6, 0, 6], [5, 1, 6]]},
    {'name': 'net-primary-components', 'totalCents': [11, 1, 12], 'weights': [1, 1], 'measurementBasis': 'excluding-tax', 'expectedCents': [[6, 1, 7], [5, 0, 5]]},
    {'name': 'tax-primary-components', 'totalCents': [11, 1, 12], 'weights': [1, 1], 'measurementBasis': 'tax', 'expectedCents': [[6, 1, 7], [5, 0, 5]]},
    {'name': 'gross-only-null-preserved', 'totalCents': [None, None, 1], 'weights': [1, 1], 'measurementBasis': 'including-tax', 'expectedCents': [[None, None, 1], [None, None, 0]]},
    {'name': 'max-18-2-real-acceptance-input', 'net': '9999999999999999.99', 'tax': '0.00', 'gross': '9999999999999999.99', 'weights': ['1.000000', '1.000000'], 'measurementBasis': 'including-tax', 'expectedGross': ['5000000000000000.00', '4999999999999999.99'], 'runtime': 'planned C payable -> E procurement -> F stage/allocation, not-run'},
]
(folder / 'test-inputs45.json').write_text(json.dumps({'uuidOrder': 'a<b, actual runtime uses ascending UUID bytes', 'vectors': vectors, 'policy': POLICY}, indent=2) + '\n', encoding='utf-8')
result = {'kind': 'primary-measurement45-independent-math-proposal-checks', 'capturedAt': datetime.now(timezone.utc).isoformat(),
          'propertyCases': property_cases, 'exhaustiveConstrainedQuotaObjectiveCases': objective_cases, 'failed': 0,
          'knownCounterexample': 'gross primary [6,6], net [6,5], tax [0,1]', 'policy': POLICY, 'roundingFamilyColumnUnchanged': ROUNDING_FAMILY,
          'productionCodeExecuted': False, 'httpExecuted': False, 'databaseExecuted': False, 'productFilesChanged': False,
          'scope': 'pure mathematical reference proposal; not F46 implementation or business runtime acceptance',
          'referenceRawSha256': hashlib.sha256((folder / 'reference45.py').read_bytes()).hexdigest()}
report_path.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
