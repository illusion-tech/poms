// Finite AST/name diagnostic for measured current code02 work bytes, not a runner.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { builtinModules } = require('node:module');
const { createHash } = require('node:crypto');
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const I = 'E:/projects/worktrees/poms-r4i-lifecycle/poms';
const LR = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const LI = '/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms';
const D = I + '/tools/rust-r4ghi/I/independent-tax118-new8-reference-audit02';
const tsFile = require.resolve('typescript', { paths: [R] });
const ts = require(tsFile);
const sha = b => createHash('sha256').update(b).digest('hex');
assert.equal(ts.version, '6.0.3');
function read(file, expected) {
  const st = fs.lstatSync(file); assert(st.isFile() && !st.isSymbolicLink());
  assert.equal(path.resolve(fs.realpathSync(file)), path.resolve(file));
  const b = fs.readFileSync(file); if (expected) assert.equal(sha(b), expected, file);
  return { b, pin: { file: file.split(path.sep).join('/').replace(R, LR).replace(I, LI), bytes: b.length, rawBytesSha256: sha(b) } };
}
function put(name, data) {
  const file = D + '/' + name;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' }); return read(file).pin;
}
const measured = [
  ['invocation-proof.mjs', 'a5b50ba102c4def8ebf0594a4cfa5ff207ee9a0e3452875385a5806659e0bfb8'],
  ['retained-tax-proof.mjs', '618a267c67b4ad58ebe45aa5c37934e858cadd37c77eacbc3794424061226a0f'],
  ['run-tax15-once.mjs', '0f5fed8fabce7d65f3a4854da0f1ce751889c296933cff7ebc73ede0e7af0667'],
  ['tax15-facts.mjs', '414f63921406a1cea3b23ec57fdd1db401d469ed3c3fc0e126102d8b16022f18'],
  ['tax15-once-effects.mjs', '23cd16985eb2ba9f4adc321a73d31e8c510f453d62765a0040f8eba78d9045b2'],
  ['tax15-once-ledger.mjs', 'ca5833c6bd9a31755d99914685a333af6e3c190f4c920ef12b17e76c8d2edd1d'],
  ['tax15-once-wire.mjs', 'a28a79bd8c110e3767ec5c63a9775884d38ed1523b8a0afb394353d33bcfb65f'],
  ['tax15-prepare.mjs', 'e811b348e4e8e0c673d663b1166e7b05848e0ad0e918b81450847d78c5e8b0cb']
];
const files = measured.map(([name]) => R + '/tools/rust-r4ghi/tax15-invocation118/' + name);
const sources = new Map(files.map((f, i) => [path.resolve(f), read(f, measured[i][1])]));
const globals = new Set(Object.getOwnPropertyNames(globalThis));
for (const key of ['require', '__dirname', '__filename', 'module', 'exports']) globals.delete(key);
const builtins = new Set(builtinModules.map(s => s.replace(/^node:/, '')));
function run(kind = 'actual') {
  const options = { allowJs: true, checkJs: true, noEmit: true, noResolve: true,
    target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, types: [], skipLibCheck: true };
  const host = ts.createCompilerHost(options), get = host.getSourceFile.bind(host);
  host.getSourceFile = (file, version, ...rest) => {
    const item = sources.get(path.resolve(file));
    if (!item) return get(file, version, ...rest);
    let text = item.b.toString();
    if (file.endsWith('tax15-facts.mjs') && kind === 'free-name-negative') text += '\nvoid __new8_unbound_probe118;\n';
    if (file.endsWith('tax15-facts.mjs') && kind === 'DOM-negative') text += '\nvoid document;\n';
    return ts.createSourceFile(file, text, version, true, ts.ScriptKind.JS);
  };
  const program = ts.createProgram(files, options, host), checker = program.getTypeChecker();
  const diagnostics = ts.getPreEmitDiagnostics(program).filter(d => d.file && sources.has(path.resolve(d.file.fileName)));
  const record = d => {
    const pos = d.file.getLineAndCharacterOfPosition(d.start ?? 0);
    return { file: path.basename(d.file.fileName), line: pos.line + 1, column: pos.character + 1,
      code: d.code, message: ts.flattenDiagnosticMessageText(d.messageText, ' ') };
  };
  const valueOrDeclarationIssues = diagnostics.filter(d => [2304, 2552, 18004, 2448, 2454].includes(d.code)).map(record);
  const environmentNoise = [], unclassifiedNodeNameDiagnostics = [], histogram = {};
  for (const d of diagnostics) {
    histogram[d.code] = (histogram[d.code] ?? 0) + 1;
    if (d.code !== 2591) continue;
    const item = record(d), name = item.message.match(/Cannot find name '([^']+)'/)?.[1];
    if (name && (globals.has(name) || name.startsWith('node:') && builtins.has(name.slice(5)))) environmentNoise.push(item);
    else unclassifiedNodeNameDiagnostics.push(item);
  }
  const ambientGlobalsUsed = new Set(), missingNodeGlobals = [];
  for (const file of files) {
    const sf = program.getSourceFile(file);
    function walk(node) {
      if (ts.isIdentifier(node)) {
        const parent = node.parent;
        const property = ts.isPropertyAccessExpression(parent) && parent.name === node ||
          (ts.isPropertyAssignment(parent) || ts.isMethodDeclaration(parent) || ts.isPropertyDeclaration(parent)) && parent.name === node;
        if (!property) {
          const symbol = checker.getSymbolAtLocation(node), declarations = symbol?.declarations ?? [];
          if (symbol && symbol.flags & ts.SymbolFlags.Value && declarations.length && declarations.every(d => program.isSourceFileDefaultLibrary(d.getSourceFile()))) {
            ambientGlobalsUsed.add(node.text);
            if (!globals.has(node.text)) {
              const pos = sf.getLineAndCharacterOfPosition(node.getStart());
              missingNodeGlobals.push({ file: path.basename(file), line: pos.line + 1, name: node.text });
            }
          }
        }
      }
      ts.forEachChild(node, walk);
    }
    walk(sf);
  }
  return { valueOrDeclarationIssues, environmentNoise, unclassifiedNodeNameDiagnostics,
    ambientGlobalsUsed: [...ambientGlobalsUsed].sort(), missingNodeGlobals,
    otherTypeDiagnosticsNotCertified: true, diagnosticCodeHistogram: histogram, totalDiagnosticCount: diagnostics.length };
}
const actual = run(), freeNegative = run('free-name-negative'), DOMNegative = run('DOM-negative');
assert.deepEqual(actual.valueOrDeclarationIssues, []);
assert.deepEqual(actual.unclassifiedNodeNameDiagnostics, []);
assert.deepEqual(actual.missingNodeGlobals, []);
assert.equal(actual.environmentNoise.length, 54);
assert.equal(freeNegative.valueOrDeclarationIssues.length, 1);
assert(freeNegative.valueOrDeclarationIssues[0].message.includes('__new8_unbound_probe118'));
assert(DOMNegative.missingNodeGlobals.some(x => x.name === 'document'));
function namedImport(name, binding) {
  const item = sources.get(path.resolve(R + '/tools/rust-r4ghi/tax15-invocation118/' + name));
  const sf = ts.createSourceFile(name, item.b.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const results = sf.statements.filter(ts.isImportDeclaration).flatMap(n => {
    const b = n.importClause?.namedBindings;
    return b && ts.isNamedImports(b) ? b.elements.filter(e => e.name.text === binding).map(e => ({
      module: n.moduleSpecifier.text, local: e.name.text, imported: e.propertyName?.text ?? e.name.text,
      line: sf.getLineAndCharacterOfPosition(e.getStart()).line + 1
    })) : [];
  });
  assert.equal(results.length, 1); return results[0];
}
const fixedBindings = { sha: namedImport('retained-tax-proof.mjs', 'sha'), TAX13_OPERATION: namedImport('tax15-facts.mjs', 'TAX13_OPERATION') };
assert.equal(fixedBindings.sha.module, '../business/pure.mjs');
assert.equal(fixedBindings.TAX13_OPERATION.module, '../business/tax13-facts.mjs');
for (const [file, item] of sources) assert.deepEqual(read(file, item.pin.rawBytesSha256).pin, item.pin);
const capture = put('source-capture-new-eight118.json', { kind: 'measured-current-new-eight-source-capture',
  sourcePins: [...sources.values()].map(s => s.pin),
  sources: [...sources.values()].map(s => ({ original: s.pin, rawBase64: s.b.toString('base64') })) });
const checks = put('new8-reference-checks118.json', { kind: 'finite-measured-current-eight-source-reference-checks',
  tool: { name: 'typescript', version: ts.version, file: read(tsFile).pin, nodeVersion: process.version },
  sourcePins: [...sources.values()].map(s => s.pin), sourceCapture: capture, fixedBindings, actual,
  negativeControls: { deliberatelyUnboundName: freeNegative, DOMGlobalAbsentInNode: DOMNegative },
  beforeAfterSourcePinsStable: true, projectSourcesParsed: 8, runtimeProjectModulesImported: 0,
  RootOrPrivateWritten: false, actualContextCalls: 0, nativeCalls: 0, SQLHTTP: false,
  scope: 'Current measured bytes only. No old b3d pin is used as the new source identity. This is not a full typecheck, control-flow implementation review, seal, mode G2 or actual acceptance.' });
console.log(JSON.stringify({ checks, capture, sourceLeaves: 8, referenceIssues: actual.valueOrDeclarationIssues.length,
  NodeEnvironmentNoise: actual.environmentNoise.length, unclassifiedNodeNames: 0, NodeGlobalMismatches: 0,
  beforeAfterSourcePinsStable: true, runtimeProjectModulesImported: 0 }));
