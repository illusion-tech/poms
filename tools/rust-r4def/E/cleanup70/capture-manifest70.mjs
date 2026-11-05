// Public/static artifact capture only. No private rows, runtime, DB or cleanup.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { initialPlan70, normalizeCatalog70, analyzePotentialSchema70 } from './core70.mjs';
const own = path.dirname(fileURLToPath(import.meta.url)), root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const pin = (file, base = own) => { const bytes = fs.readFileSync(path.join(base, file)); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; };
const authority = JSON.parse(fs.readFileSync(own + '/authority70.json', 'utf8')), checks = JSON.parse(fs.readFileSync(own + '/checks/receipt70.json', 'utf8'));
assert.equal(checks.pureTestsPassed, 10); assert.equal(checks.pureTestsFailed, 0); assert(checks.commands.every(c => c.exitCode === 0));
for (const c of checks.commands) for (const stream of Object.values(c.streams)) assert.equal(pin(stream.file).rawBytesSha256, stream.rawBytesSha256);
const require = createRequire(root + '/package.json'), ts = require('typescript'), source = fs.readFileSync(own + '/core70.mjs', 'utf8'), ast = ts.createSourceFile('core70.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS); assert.equal(ast.parseDiagnostics.length, 0);
const imports = ast.statements.filter(ts.isImportDeclaration).map(n => n.moduleSpecifier.text); assert.deepEqual(imports, ['node:assert/strict', 'node:crypto', 'node:path']);
const calls = [];
function walk(node) { if (ts.isCallExpression(node)) { const expr = node.expression, pureRegexExec = ts.isPropertyAccessExpression(expr) && ts.isRegularExpressionLiteral(expr.expression) && expr.name.text === 'exec'; if (!pureRegexExec) calls.push(expr.getText(ast)); } ts.forEachChild(node, walk); } walk(ast);
assert(!calls.some(c => /(?:^|\.)(fetch|connect|query|kill|unlink|rm|rmdir|spawn|exec|execFile|readFile|writeFile|readFileSync|writeFileSync)$/.test(c)), 'Pure core contains an external effect');
const catalog = JSON.parse(fs.readFileSync(root + '/tmp/rust-r4def/root/catalog25/rust-catalog.json', 'utf8')); assert.equal(normalizeCatalog70(catalog).structuralHash, authority.structuralHash); const schema = analyzePotentialSchema70(catalog, authority); assert.deepEqual(schema.afterWhitelistedPointerCutsCrossTableSCCs, []);
for (const p of authority.publicSourcePins) assert.equal(pin(p.file, root).rawBytesSha256, p.rawBytesSha256, 'Frozen public authority source drift');
const names = ['core70.mjs', 'core70.test.mjs', 'README.md', 'readback70.sql', 'authority70.json', 'static-schema70.json', 'capture-authority70.mjs', 'validate70.mjs', 'capture-manifest70.mjs', 'checks/receipt70.json', ...checks.commands.flatMap(c => Object.values(c.streams).map(s => s.file))];
const products = names.map(file => pin(file));
const manifest = {
    kind: 'E-owned-only-teardown70-pure-planner-and-assertion-candidate', createdAt: new Date().toISOString(), products, publicSourcePins: authority.publicSourcePins,
    authority: { tables: 120, baselineRowsPerDatabase: 532, actualValidatedFKs: 294, immutableUpdateTriggers: 5, structuralHash: authority.structuralHash, actualBorrowedOriginals: authority.borrowedOriginals, cyclePolicies: authority.cyclePolicies },
    staticPotentialSchema: schema, initial: initialPlan70(),
    staticAndPureValidation: { nodeSyntaxCommands: 5, NodeVersion: checks.nodeVersion, pureTestsPassed: 10, pureTestsFailed: 0, ASTPureImportsOnly: imports, externalEffectCallsInCore: false, privateBaselineOrLatestRowsRead: false, actualFOrDRowGraphSolved: false, exactPublic65bBorrowedFieldsVerified: true, independentNumbersPreservedWithoutFloatRounding: true },
    executableArtifacts: 'None. privateStatement70 only returns structured SQL+bindings for Root review/execution.',
    actualExecution: { DBConnected: false, SQLExecuted: false, ownedRowsDeleted: 0, borrowedOriginalsRestored: 0, objectsCopiedOrUnlinked: 0, processesOrContainerStopped: 0, volumeOrPrivateRemoved: false, actualDoubleNoOpVerified: false, G3Certified: false, G4Certified: false },
    requiredRootActualWork: ['finish all real acceptance and restore test gates/ACL', 'stop only exact owned API PIDs/ports and seal actual latest120-table ledger', 'inject real original532 and latest raw strings/FKs/catalog/guards', 'review complete exactPK delete/pointer/3borrowed plan; unknown SCC stops', 'same outer SQL transaction; actual per-op RETURNING guard; inside-Tx baseline equality then COMMIT ACK', 'two distinct full read-only120table532seed/catalog/ACL/trigger no-ops', 'hash-preserve each exact new-namespace object then literal unlink and fresh empty inventory', 'stop same-ID owned PG15 only after all proof; retain volume/private/evidence'],
    changedProductFiles: [], changedRootFiles: [], oldPackagesChanged: false, authoredNamespace: 'tools/rust-r4def/E/cleanup70/**', committed: false,
};
fs.writeFileSync(own + '/manifest70.json', JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ manifest: pin('manifest70.json'), core: products[0], pureTests: 10, actualDBExecuted: false, actualBusinessRowGraphRead: false }));
