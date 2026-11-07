"""Run an offline isolated pure review; read actual Root files, write only G tools."""
from pathlib import Path
import hashlib
import json
import subprocess
from datetime import datetime, timezone

OUT = Path(__file__).resolve().parent
ROOT = Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
names = ['apps/poms-api-rust/src/project_operating_common/' + name for name in ['scalars.rs', 'schema.rs', 'hash.rs', 'request.rs', 'loader.rs']]
names += ['apps/poms-api-rust/src/contract_support/mod.rs', 'tools/rust-r4ghi/joint-g1/effective-v2/public-contracts.schema.json', 'tools/rust-r4ghi/joint-g1/effective-v2/source-context.schema.json', 'tools/rust-r4ghi/joint-g1/effective-v2/policy-definition.json', 'docs/design/rust-r4ghi/g2-public-delta01.json']
def sources():
    return [{'path': name, 'sha256': hashlib.sha256((ROOT/name).read_bytes()).hexdigest(), 'bytes': (ROOT/name).stat().st_size} for name in names]
before = sources()
started = datetime.now(timezone.utc).isoformat()
command = ['cargo', 'test', '--offline', '--manifest-path', str(OUT/'harness/Cargo.toml'), '--target-dir', str(OUT/'target')]
result = subprocess.run(command, cwd=OUT, capture_output=True, text=True, encoding='utf-8', errors='replace')
log = result.stdout + result.stderr
(OUT/'result03.log').write_text(log, encoding='utf-8')
after = sources()
evidence = {'kind': 'Root-common-non-author-pure-review', 'startedAt': started, 'finishedAt': datetime.now(timezone.utc).isoformat(), 'command': command, 'exitCode': result.returncode, 'sourceStable': before == after, 'inputsBefore': before, 'inputsAfter': after, 'limits': ['Exact actual scalars/schema/hash imported', 'Verbatim actual canonical_hash function excerpt; no alternate algorithm', 'Test-only minimal Error adapter and serialized Value context carrier', 'Typed request model and SQL loader statically reviewed only; no test claim for them', 'No database/HTTP/UI/product integration or G3/G4 certification', 'No Root product edits, dependency installation or service startup']}
(OUT/'result03.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'exitCode': result.returncode, 'sourceStable': before == after, 'evidence': str(OUT/'result03.json'), 'log': str(OUT/'result03.log')}))
print(log[-7000:])
raise SystemExit(result.returncode)
