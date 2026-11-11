// Finite diagnostic only: parses the eight frozen modules, never imports them.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { builtinModules } = require('node:module');
const { createHash } = require('node:crypto');
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const I = 'E:/projects/worktrees/poms-r4i-lifecycle/poms';
const D = I + '/tools/rust-r4ghi/I/independent-tax118-open-reference-audit01';
const linuxR = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const linuxI = '/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms';
const tsFile = require.resolve('typescript', { paths: [R] });
const ts = require(tsFile);
assert.equal(ts.version, '6.0.3');
const sha = b => createHash('sha256').update(b).digest('hex');
function read(file, expected) {
  const st = fs.lstatSync(file);
  assert(st.isFile() && !st.isSymbolicLink());
  assert.equal(path.resolve(fs.realpathSync(file)), path.resolve(file));
  const bytes = fs.readFileSync(file);
  if (expected) assert.equal(sha(bytes), expected, file);
  const displayedFile = file.split(path.sep).join('/').replace(R, linuxR).replace(I, linuxI);
  return { bytes, pin: { file: displayedFile, bytes: bytes.length, rawBytesSha256: sha(bytes) } };
}
function put(name, data) {
  const file = D + '/' + name;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
  return read(file).pin;
}
const definitions = [
  ['invocation-proof.mjs', '5c827ab7dae81d83377baf89e2c784f6523fb7fcf6bb733fa23ca483de980311'],
  ['retained-tax-proof.mjs', '0e3278fcc4a04b0b952736f0666f7477ed8d0eb6e0193e89b3a1b3b2fc73bd9c'],
  ['run-tax15-once.mjs', 'e0a4a9a8fb1f06a974a5f854e18fd5edeb987c2ffdeda79499b8161fc388df30'],
  ['tax15-facts.mjs', 'a3cbe4b3ad7186a07dcd5f3bc65b2ef2a5e9fb678ba2daadf260dfcda3c360ea'],
  ['tax15-once-effects.mjs', '23cd16985eb2ba9f4adc321a73d31e8c510f453d62765a0040f8eba78d9045b2'],
  ['tax15-once-ledger.mjs', 'ca5833c6bd9a31755d99914685a333af6e3c190f4c920ef12b17e76c8d2edd1d'],
  ['tax15-once-wire.mjs', 'a28a79bd8c110e3767ec5c63a9775884d38ed1523b8a0afb394353d33bcfb65f'],
  ['tax15-prepare.mjs', 'e811b348e4e8e0c673d663b1166e7b05848e0ad0e918b81450847d78c5e8b0cb']
];
const roots = definitions.map(([name]) => R + '/tools/rust-r4ghi/tax15-invocation118/' + name);
const archiveRoot = R + '/tools/rust-r4ghi/tax15-invocation118/tests/sealed-code01/products';
const sources = new Map(roots.map((file, i) => {
  const archived = read(archiveRoot + '/' + definitions[i][0], definitions[i][1]);
  return [path.resolve(file), { bytes: archived.bytes, archivePin: archived.pin,
    pin: { file: linuxR + '/tools/rust-r4ghi/tax15-invocation118/' + definitions[i][0],
      bytes: archived.bytes.length, rawBytesSha256: definitions[i][1] } }];
}));
const nodeGlobals = new Set(Object.getOwnPropertyNames(globalThis));
for (const name of ['require', '__dirname', '__filename', 'module', 'exports']) nodeGlobals.delete(name);
const builtins = new Set(builtinModules.map(name => name.replace(/^node:/, '')));

function scan({ bindSha = false, bindOperation = false, sentinel = false, domSentinel = false } = {}) {
  const options = { allowJs: true, checkJs: true, noEmit: true, noResolve: true,
    target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, types: [], skipLibCheck: true };
  const host = ts.createCompilerHost(options), originalGet = host.getSourceFile.bind(host);
  host.getSourceFile = (file, version, ...rest) => {
    const item = sources.get(path.resolve(file));
    if (!item) return originalGet(file, version, ...rest);
    let text = item.bytes.toString();
    if (bindSha && file.endsWith('retained-tax-proof.mjs')) {
      const from = 'import { uuid } from "../business/pure.mjs";'; assert(text.includes(from));
      text = text.replace(from, 'import { sha, uuid } from "../business/pure.mjs";');
    }
    if (bindOperation && file.endsWith('tax15-facts.mjs')) {
      assert(text.includes('    centsTax13,'));
      text = text.replace('    centsTax13,', '    TAX13_OPERATION,\n    centsTax13,');
    }
    if (sentinel && file.endsWith('tax15-facts.mjs')) text += '\nvoid __lexical_probe118;\n';
    if (domSentinel && file.endsWith('tax15-facts.mjs')) text += '\nvoid document;\n';
    return ts.createSourceFile(file, text, version, true, ts.ScriptKind.JS);
  };
  const program = ts.createProgram(roots, options, host), checker = program.getTypeChecker();
  const diagnostics = ts.getPreEmitDiagnostics(program).filter(d => d.file && sources.has(path.resolve(d.file.fileName)));
  const record = d => {
    const point = d.file.getLineAndCharacterOfPosition(d.start ?? 0);
    return { file: path.basename(d.file.fileName), line: point.line + 1, column: point.character + 1,
      code: d.code, message: ts.flattenDiagnosticMessageText(d.messageText, ' ') };
  };
  const freeNames = diagnostics.filter(d => [2304, 2552, 18004].includes(d.code)).map(record);
  const nodeEnvironmentNoise = [], unclassifiedNameDiagnostics = [];
  for (const d of diagnostics.filter(d => d.code === 2591)) {
    const item = record(d), name = item.message.match(/Cannot find name '([^']+)'/)?.[1];
    if (name && (nodeGlobals.has(name) || name.startsWith('node:') && builtins.has(name.slice(5)))) nodeEnvironmentNoise.push(item);
    else unclassifiedNameDiagnostics.push(item);
  }
  // Default TS libs include DOM globals. Report any value reference to a lib
  // global absent from actual Node, so a hypothetical `document` cannot hide.
  const ambientGlobals = new Set(), missingNodeGlobals = [];
  function reference(node) {
    const p = node.parent;
    if (ts.isPropertyAccessExpression(p) && p.name === node) return false;
    if ((ts.isPropertyAssignment(p) || ts.isMethodDeclaration(p) || ts.isPropertyDeclaration(p)) && p.name === node) return false;
    return true;
  }
  for (const file of roots) {
    const sf = program.getSourceFile(file);
    function visit(node) {
      if (ts.isIdentifier(node) && reference(node)) {
        const symbol = checker.getSymbolAtLocation(node);
        const declarations = symbol?.declarations ?? [];
        if (declarations.length && declarations.every(d => program.isSourceFileDefaultLibrary(d.getSourceFile()))) {
          const valueSymbol = Boolean(symbol.flags & ts.SymbolFlags.Value);
          if (valueSymbol) {
            ambientGlobals.add(node.text);
            if (!nodeGlobals.has(node.text)) {
              const pos = sf.getLineAndCharacterOfPosition(node.getStart());
              missingNodeGlobals.push({ file: path.basename(file), line: pos.line + 1, name: node.text });
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);
  }
  const histogram = {};
  for (const d of diagnostics) histogram[d.code] = (histogram[d.code] ?? 0) + 1;
  return { freeNames, nodeEnvironmentNoiseCount: nodeEnvironmentNoise.length,
    unclassifiedNameDiagnostics, missingNodeGlobals, actualNodeAmbientGlobalsUsed: [...ambientGlobals].sort(),
    diagnosticCodeHistogram: histogram, totalDiagnosticCount: diagnostics.length };
}

const baseline = scan(), shaOnly = scan({ bindSha: true }), operationOnly = scan({ bindOperation: true });
const both = scan({ bindSha: true, bindOperation: true });
const negative = scan({ bindSha: true, bindOperation: true, sentinel: true });
const domNegative = scan({ bindSha: true, bindOperation: true, domSentinel: true });
assert.equal(baseline.freeNames.length, 2);
assert(baseline.freeNames.some(d => d.file === 'retained-tax-proof.mjs' && d.line === 232 && d.message.includes("'sha'")));
assert(baseline.freeNames.some(d => d.file === 'tax15-facts.mjs' && d.line === 577 && d.message.includes("'TAX13_OPERATION'")));
assert.equal(shaOnly.freeNames.length, 1); assert.equal(operationOnly.freeNames.length, 1);
assert.deepEqual(both.freeNames, []); assert.deepEqual(baseline.missingNodeGlobals, []);
assert.deepEqual(baseline.unclassifiedNameDiagnostics, []);
assert.equal(negative.freeNames.length, 1); assert(negative.freeNames[0].message.includes('__lexical_probe118'));
assert(domNegative.missingNodeGlobals.some(x => x.name === 'document'));
const raw = put('source-capture-eight118.json', { kind: 'immutable-frozen-eight-source-reference-audit-capture',
  sources: [...sources.values()].map(x => ({ recordedExecutionSource: x.pin, frozenReadCopy: x.archivePin,
    bytesIdenticalToRecordedSHA: true, rawBase64: x.bytes.toString('base64') })) });
const result = put('reference-checks118.json', { kind: 'finite-eight-source-lexical-reference-audit',
  tool: { name: 'typescript', version: ts.version, source: read(tsFile).pin, nodeVersion: process.version },
  readMapping: { canonicalRoot: linuxR, explicitWindowsReadRoot: R,
    frozenReadCopyRoot: archiveRoot.replace(R, linuxR),
    reason: 'Current Root source is the author code02 work in progress; the old b3d/f205 audit reads exact old sealed copies, never relabels current work as old code.' },
  recordedExecutionSources: [...sources.values()].map(x => x.pin),
  frozenReadCopies: [...sources.values()].map(x => x.archivePin), sourceCapture: raw,
  options: { allowJs: true, checkJs: true, noEmit: true, noResolve: true, types: [], target: 'ES2023', module: 'ESNext' },
  baseline, probes: { onlyShaImportVirtuallyBound: shaOnly, onlyOperationImportVirtuallyBound: operationOnly,
    bothVirtualImportBindings: both, deliberatelyUnboundNegative: negative, NodeDOMMismatchNegative: domNegative },
  interpretation: 'Only value-reference audit. No full JS typecheck pass is claimed; unresolved import types and dynamic-shape diagnostics remain out of this bounded check. Hypothetical import probes are not a review or execution of Root code02.',
  projectSourcesParsed: 8, runtimeProjectModulesImported: 0, actualContextCalls: 0, SQLHTTP: false,
  RootOrPrivateWritten: false, allVirtualPatchesInLocalCompilerHostOnly: true, globalFSOrCryptoPatched: false });
for (const item of sources.values()) {
  const archiveFile = item.archivePin.file.replace(linuxR, R);
  assert.deepEqual(read(archiveFile, item.archivePin.rawBytesSha256).pin, item.archivePin);
}
console.log(JSON.stringify({ result, sourceCapture: raw, definiteUnboundNames: baseline.freeNames,
  virtualBothBindingsNameDiagnostics: both.freeNames.length, NodeGlobalMismatchCount: baseline.missingNodeGlobals.length,
  unclassifiedNodeNameDiagnostics: baseline.unclassifiedNameDiagnostics.length, runtimeProjectModulesImported: 0 }));
