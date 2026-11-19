// Read-only Root source diagnosis and closed-registry candidate. Never calls Git.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { proposeRegistry, analyzeRegisteredGraph, assertModuleText, CLOSED_MODULES } from './registered-module-graph.candidate.mjs';

const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const out = dirname(fileURLToPath(import.meta.url));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const paths = ['tools/rust-r1b/export-shared.mjs', ...CLOSED_MODULES, 'libs/shared/api-spec/openapi.json', 'docs/design/rust-r0-api-operations.json', 'apps/poms-api-rust/src/shared/generated.rs', 'apps/poms-api-rust/src/project_operating_common/model.rs'];
const record = () => paths.map((path) => ({ path, bytes: readFileSync(resolve(root, path)).length, rawSha256: sha(readFileSync(resolve(root, path))) }));
const before = record();
const existing = await import(pathToFileURL(resolve(root, 'tools/rust-r1b/export-shared.mjs')).href);
const shared = readFileSync(resolve(root, existing.SHARED_PATH), 'utf8');
const spec = JSON.parse(readFileSync(resolve(root, existing.SPEC_PATH), 'utf8'));
let oldAnalyzerFailure = null;
try { existing.analyzeShared(shared, spec); } catch (error) { oldAnalyzerFailure = error.message; }
const registry = proposeRegistry(root);
writeFileSync(resolve(out, 'closed-module-registry06.candidate.json'), JSON.stringify(registry, null, 2) + '\n');
const graph = analyzeRegisteredGraph(root, registry);
writeFileSync(resolve(out, 'closed-module-analysis06.json'), JSON.stringify(graph, null, 2) + '\n');
const generatedPath = CLOSED_MODULES[2];
const generatedText = readFileSync(resolve(root, generatedPath), 'utf8');
const generatedPin = registry.closedModules.find((module) => module.path === generatedPath);
const negatives = [
    ['new function/host capability', generatedText + '\nexport function injected(){return require("node:fs");}\n'],
    ['unregistered module', generatedText.replace('from "zod"', 'from "node:fs"').replace("from 'zod'", "from 'node:fs'")],
    ['wire mutation', generatedText.replace('"conditional-completed"', '"invented-stage"')],
    ['unknown top-level construct', generatedText + '\nexport class HiddenAuthority {}\n'],
].map(([name, text]) => {
    let failure = null;
    try { assertModuleText(root, generatedPath, text, generatedPin); } catch (error) { failure = error.message; }
    if (!failure) throw new Error(`Unknown construction accepted: ${name}`);
    return { name, rejected: true, message: failure };
});
const after = record();
const evidence = {
    kind: 'read-only-R1B-source-and-closed-module-diagnosis',
    rootProductModified: false, gitExecuted: false,
    actualOldSourceHead: existing.SOURCE_HEAD,
    oldSourceGuard: 'Not invoked by child: invokes Git. Preserved unchanged; Root must deliberately advance reviewed reference after source freeze.',
    actualOldAnalyzerFailure: oldAnalyzerFailure,
    historicalR0Preserved: graph.historicalR0,
    registeredModules: graph.modules.map((module) => ({ path: module.path, declarations: module.declarations, enumOccurrences: module.enumOccurrences.length, normalizedTextSha256: module.normalizedTextSha256 })),
    currentStageValues: graph.stageValues,
    runtime: { node: graph.nodeVersion, typescript: graph.typescript, zod: graph.zod },
    negativeControls: negatives,
    sourceStable: JSON.stringify(before) === JSON.stringify(after), inputsBefore: before, inputsAfter: after,
    status: 'Pure closed graph analysis/negative controls only; full R1B --check/--write still incomplete and not claimed',
};
writeFileSync(resolve(out, 'diagnosis06.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ sourceStable: evidence.sourceStable, oldAnalyzerFailure, modules: evidence.registeredModules, stageValues: graph.stageValues, negatives: negatives.map(({ name, rejected }) => ({ name, rejected })), outputs: ['closed-module-registry06.candidate.json', 'closed-module-analysis06.json', 'diagnosis06.json'] }, null, 2));
