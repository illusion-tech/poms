"""Additive closed-module inspection seam only; retain existing export gates."""
from pathlib import Path
import hashlib,json,difflib
ROOT=Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
OUT=Path(__file__).resolve().parent
path='tools/rust-r1b/export-shared.mjs'
data=(ROOT/path).read_bytes();expected='c6cf0836f7f497745b2e86009fbf93cffc8f96d883c4de78368e3f9b024c0be6'
if hashlib.sha256(data).hexdigest()!=expected:raise RuntimeError('Root exporter changed; do not replace it')
(OUT/'export-shared.base.mjs.bin').write_bytes(data)
old=data.decode('utf-8-sig').replace('\r\n','\n')
new=old.replace("import { Script } from 'node:vm';", "import { Script } from 'node:vm';\nimport { analyzeRegisteredGraph } from './registered-module-graph.mjs';")
new=new.replace("export const SHARED_PATH = 'libs/shared/contracts/src/lib/shared-contracts.ts';", "export const SHARED_PATH = 'libs/shared/contracts/src/lib/shared-contracts.ts';\nexport const CANONICAL_SHARED_PATH = 'libs/shared/contracts/src/lib/rust-r4ghi-contracts.generated.ts';\nexport const MODULE_REGISTRY_PATH = 'tools/rust-r1b/current-module-registry.json';")
new=new.replace("const SOURCE_PATHS = ['.gitattributes', 'libs/shared/contracts/src/index.ts', SHARED_PATH, SPEC_PATH, ENTITY_PATH, SERVICE_PATH, R0_PATH];", "const SOURCE_PATHS = ['.gitattributes', 'libs/shared/contracts/src/index.ts', SHARED_PATH, CANONICAL_SHARED_PATH, MODULE_REGISTRY_PATH, SPEC_PATH, ENTITY_PATH, SERVICE_PATH, R0_PATH];")
new=new.replace("SOURCE_SCOPE = ['.gitattributes', ':(glob)libs/shared/contracts/src/**/*.ts', SPEC_PATH, ENTITY_PATH, SERVICE_PATH, R0_PATH]", "SOURCE_SCOPE = ['.gitattributes', ':(glob)libs/shared/contracts/src/**/*.ts', MODULE_REGISTRY_PATH, SPEC_PATH, ENTITY_PATH, SERVICE_PATH, R0_PATH]")
index=new.index('export function main(')
new=new[:index]+'''// This is an inspection seam, not a replacement of compareR0/buildManifest.
// Root must freeze the exact source reference and independently approve the
// closed registry before use; no CLI/source override disables the original gate.
export function inspectRegisteredModules({ root = ROOT } = {}) {
    assertSourceGuard(root);
    const registry = JSON.parse(read(root, MODULE_REGISTRY_PATH));
    assert.equal(registry.reviewStatus, 'Root-reviewed-module-registry', 'Module registration needs independent review');
    assert.equal(registry.sourceHead, SOURCE_HEAD, 'Module registry and reviewed Git source must match');
    return analyzeRegisteredGraph(root, registry);
}

'''+new[index:]
new=new.replace("export function main(args = process.argv.slice(2), root = ROOT) {\n", "export function main(args = process.argv.slice(2), root = ROOT) {\n    if (args.length === 1 && args[0] === '--inspect-registered-modules') {\n        const result = inspectRegisteredModules({ root });\n        console.log(JSON.stringify(result, null, 2));\n        return result;\n    }\n")
candidate=OUT/'export-shared.inspection-seam.candidate.mjs';candidate.write_text(new,encoding='utf-8',newline='\n')
patch=OUT/'export-shared-inspection-seam06.patch';patch.write_text(''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/'+path,tofile='b/'+path,n=4)),encoding='utf-8',newline='\n')
files=[candidate,patch,OUT/'registered-module-graph.candidate.mjs',OUT/'closed-module-registry06.candidate.json',OUT/'closed-module-analysis06.json',OUT/'diagnosis06.json']
result={'kind':'R1B-closed-module-inspection-proposal06','rootBaseSha256':expected,'files':[{'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files],'rootProductModified':False,'implemented':'A closed three-module AST/hash/runtime oracle inspection seam, not an incomplete replacement of the full legacy manifest builder.','fullExporterStatus':'--write/--check still deliberately use the original buildManifest/compareR0 and remain blocked on explicit historical migrations/additions/cross-module nominal alias registration. No whole check pass claimed.','sourceGuard':'Working/index/untracked guard retained; source scope expanded to include exact registry, new canonical module explicitly becomes a manifest source. No guard=false, unreviewed dirty override or automatic HEAD/sourceHead advance.','rootRequired':['Review closed module function/declaration pins and exact graph','Freeze new SOURCE_HEAD and matching registry.sourceHead only through Root governance after committing actual reviewed source inputs','Register immutable R0 historical replacements/migrations/additions and nominal source alias maps; never rewrite R0 or merge unrelated same-value enums','Integrate module observations into full data/family renderer and original static evaluator; retain independent actual TS/Zod comparisons','Run old/new exporter negative controls and actual whole --check/--write, then exact generated manifest/Rust/tests diff']}
manifest=OUT/'integration-proposal06.json';manifest.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'manifest':str(manifest),'sha256':hashlib.sha256(manifest.read_bytes()).hexdigest(),'patchSha256':hashlib.sha256(patch.read_bytes()).hexdigest()}))
