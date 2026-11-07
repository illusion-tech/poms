"""Reference-schema probe only. Never imports or starts the product."""
import copy
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

root = Path(__file__).resolve().parent
public = json.loads((root / 'inputs02/Root/tools/rust-r4ghi/joint-g1/effective-v2/public-contracts.schema.json.bin').read_bytes())
counterexamples = json.loads((root / 'counterexamples01.json').read_bytes())
validator = Draft202012Validator({'components': public['components'], '$ref': '#/components/schemas/CreateProjectCompletionRecordRequest'}, format_checker=FormatChecker())
invalid = counterexamples['completionNotKeyword']['request']
valid = copy.deepcopy(invalid)
valid.pop('completionConditions')
errors = [{'instancePath': list(e.path), 'schemaPath': list(e.schema_path), 'message': e.message} for e in validator.iter_errors(invalid)]
result = {
    'kind': 'independent-reference-schema-counterexample-check',
    'validCompletedRequestAccepted': validator.is_valid(valid),
    'completedWithConditionsRejected': not validator.is_valid(invalid),
    'errors': errors,
    'qualification': 'Runs the frozen JSON Schema only. Rust candidate, HTTP, product, SQL and G3 acceptance were not run.'
}
with (root / 'reference-check01.json').open('x', encoding='utf8', newline='\n') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
    f.write('\n')
print(json.dumps(result, ensure_ascii=False, indent=2))
