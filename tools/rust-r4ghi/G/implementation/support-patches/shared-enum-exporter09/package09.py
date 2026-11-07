"""Render a reviewable Root patch; never write Root or invoke Git."""
from pathlib import Path
import difflib
import hashlib
import json

base = Path(__file__).resolve().parent
root = Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
stage = base / 'root-proposal'
stage.mkdir(exist_ok=True)
legacy_path = root / 'tools/rust-r1b/export-shared.mjs'
legacy = legacy_path.read_text()
assert hashlib.sha256(legacy_path.read_bytes()).hexdigest() == 'c6cf0836f7f497745b2e86009fbf93cffc8f96d883c4de78368e3f9b024c0be6'
needle = 'export function main(args = process.argv.slice(2), root = ROOT) {\n'
assert legacy.count(needle) == 1
patched = legacy.replace(needle, needle + "    if (args[0] === '--s5') return import('./s5/export-s5.mjs').then(({ mainS5 }) => mainS5(args.slice(1), root, { artifacts }));\n")
patched = patched.replace('=== fileURLToPath(import.meta.url)) main();', '=== fileURLToPath(import.meta.url)) await main();')
assert patched != legacy
files = {
    'full-build09.candidate.mjs': 'full-build.mjs',
    'registered-module-graph09.candidate.mjs': 'registered-module-graph.mjs',
    'static-data-oracle09.candidate.mjs': 'static-data-oracle.mjs',
    's5-entry09.candidate.mjs': 'export-s5.mjs',
    's5-review09.candidate.mjs': 'review.mjs',
    'source-access09.candidate.mjs': 'source-access.mjs',
}
changes = [('tools/rust-r1b/export-shared.mjs', legacy, patched)]
for source, name in files.items():
    text = (base / source).read_text()
    for original, destination in files.items():
        text = text.replace('./' + original, './' + destination)
    changes.append(('tools/rust-r1b/s5/' + name, '', text))
for source, name in [
    ('s3-nominal-identity09.json', 'tools/rust-r1b/history/s3-nominal-identity.json'),
    ('s5-registry09.candidate.json', 'tools/rust-r1b/s5-reviewed-registry.json'),
    ('S5-README09.md', 'tools/rust-r1b/s5/README.md'),
]:
    changes.append((name, '', (base / source).read_text()))

probes = (base / 'whole-tests09.mjs').read_text()
for original, destination in files.items():
    probes = probes.replace('./' + original, './' + destination)
probes = probes.replace("const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';", "const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');")
probes = probes.replace('const out = dirname(fileURLToPath(import.meta.url));', "const out = resolve(root, 'tmp/rust-r4ghi/s5-exporter-probes09');\nmkdirSync(out, { recursive: true });")
probes = probes.replace("const registry = JSON.parse(read('s5-registry09.candidate.json'));", "const registry = JSON.parse(readFileSync(resolve(root, 'tools/rust-r1b/s5-reviewed-registry.json'), 'utf8'));")
probes = probes.replace("const identity = JSON.parse(read('s3-nominal-identity09.json'));", "const identity = JSON.parse(readFileSync(resolve(root, 'tools/rust-r1b/history/s3-nominal-identity.json'), 'utf8'));")
probes = probes.replace('buildS5Manifest(root, registry, identity), /Root-reviewed registry/', "buildS5Manifest(root, { ...registry, reviewStatus: 'candidate', sourceHead: null }, identity), /Root-reviewed registry/")
probes = probes.replace('assertPinnedReview(JSON.stringify(registry), JSON.stringify(identity)), /not frozen/', 'assertPinnedReview(JSON.stringify(registry), JSON.stringify(identity), {}), /not frozen/')
changes.append(('tools/rust-r1b/s5/export-s5.probes.mjs', '', probes))
patch = []
manifest = []
for path, before, after in changes:
    destination = stage / path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(after, newline='\n')
    patch.extend(difflib.unified_diff(before.splitlines(keepends=True), after.splitlines(keepends=True), fromfile=('a/' + path if before else '/dev/null'), tofile='b/' + path))
    manifest.append({'path': path, 'baseNormalizedSha256': hashlib.sha256(before.encode()).hexdigest() if before else None,
        'candidateNormalizedSha256': hashlib.sha256(after.encode()).hexdigest(), 'bytes': len(after.encode())})
(base / 'whole-s5-exporter09.patch').write_text(''.join(patch), newline='\n')
(base / 'proposal-files09.json').write_text(json.dumps(manifest, indent=2) + '\n', newline='\n')
review_values = {
    'status': 'unreviewed-exact-candidate-values-not-production-authorization',
    'sourceHead': None,
    'registryNormalizedTextSha256BeforeRootReviewAndHeadUpdate': hashlib.sha256((base / 's5-registry09.candidate.json').read_bytes()).hexdigest(),
    'identityNormalizedTextSha256': hashlib.sha256((base / 's3-nominal-identity09.json').read_bytes()).hexdigest(),
    'snapshotManifestRawSha256': json.loads((base / 'snapshot-build09.json').read_text())['checkpointManifestRawSha256'],
    'generatorNormalizedTextSha256': {item['path']: item['candidateNormalizedSha256'] for item in manifest
        if item['path'] == 'tools/rust-r1b/export-shared.mjs' or item['path'] in [
            'tools/rust-r1b/s5/' + name for name in files.values() if name != 'review.mjs']},
}
# Match the actual guarded generator order exactly, independent of the source
# dictionary's packaging order.
order = ['tools/rust-r1b/export-shared.mjs', 'tools/rust-r1b/s5/export-s5.mjs', 'tools/rust-r1b/s5/full-build.mjs',
    'tools/rust-r1b/s5/registered-module-graph.mjs', 'tools/rust-r1b/s5/static-data-oracle.mjs', 'tools/rust-r1b/s5/source-access.mjs']
review_values['generatorNormalizedTextSha256'] = {path: review_values['generatorNormalizedTextSha256'][path] for path in order}
(base / 'review-values09.candidate.json').write_text(json.dumps(review_values, indent=2) + '\n', newline='\n')
print(json.dumps({'files': len(changes), 'patchBytes': (base / 'whole-s5-exporter09.patch').stat().st_size}, indent=2))
