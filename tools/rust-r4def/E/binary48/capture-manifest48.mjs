// Public-source AST inspection only. Never instantiate harness or read private.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const own = path.dirname(fileURLToPath(import.meta.url));
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const require = createRequire(root + '/package.json'), ts = require('typescript');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const pin = (file, base = own) => { const bytes = fs.readFileSync(path.join(base, file)); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; };
const originalName = 'api-harness32-original.mjs.bin', candidateName = 'api-harness-binary48-candidate.mjs';
const original = fs.readFileSync(path.join(own, originalName), 'utf8'), candidate = fs.readFileSync(path.join(own, candidateName), 'utf8');
const rootFile = 'tools/rust-r4def/api-harness32.mjs';
if (pin(rootFile, root).rawBytesSha256 !== pin(originalName).rawBytesSha256 || pin(originalName).rawBytesSha256 !== '870d3d5a2c73c973ea21aa2aa1566245cad6a6c8e1deb881cbb78c2596381b73') throw Error('Root pre-import source changed');
const parse = text => ts.createSourceFile('api-harness.mjs', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const a = parse(original), b = parse(candidate);
const harness = tree => tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === 'createApiHarness');
const oldHarness = harness(a), newHarness = harness(b);
if (!oldHarness || !newHarness) throw Error('Real harness export missing');
const functions = node => new Map(node.body.statements.filter(ts.isFunctionDeclaration).map(n => [n.name.text, n]));
const oldFunctions = functions(oldHarness), newFunctions = functions(newHarness);
for (const [name, node] of oldFunctions) if (node.getText(a) !== newFunctions.get(name)?.getText(b)) throw Error('Existing Root function changed:' + name);
for (const node of oldHarness.body.statements.filter(ts.isVariableStatement)) if (!newHarness.body.statements.some(n => ts.isVariableStatement(n) && n.getText(b) === node.getText(a))) throw Error('Existing Root closure declaration changed');
const binary = newFunctions.get('binaryRequest');
if (!binary || binary.parameters.map(p => p.name.getText(b)).join(',') !== 'operationId,id,bodyBytes,actor,meta') throw Error('Driver callback signature mismatch');
const returnKeys = node => node.body.statements.filter(ts.isReturnStatement).at(-1)?.expression?.properties?.map(p => p.name.getText(p.getSourceFile()));
const oldReturn = returnKeys(oldHarness), newReturn = returnKeys(newHarness);
if (newReturn.filter(k => k !== 'binaryRequest').join(',') !== oldReturn.join(',') || !newReturn.includes('binaryRequest')) throw Error('Existing harness return contract changed');
const methodsDeclaration = binary.body.statements.find(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(b) === 'binaryMethods'));
const methods = Object.fromEntries(methodsDeclaration.declarationList.declarations.find(d => d.name.getText(b) === 'binaryMethods').initializer.properties.map(p => [p.name.getText(b), p.initializer.text]));
const specFile = 'libs/shared/api-spec/openapi.json', spec = JSON.parse(fs.readFileSync(path.join(root, specFile), 'utf8'));
const index = new Map(Object.entries(spec.paths).flatMap(([template, entries]) => Object.entries(entries).filter(([, op]) => op.operationId).map(([method, op]) => [op.operationId, { method: method.toUpperCase(), template, op }])));
const operations = Object.entries(methods).map(([operationId, method]) => {
  const value = index.get(operationId); if (!value || value.method !== method) throw Error('Binary actual operation/method mismatch');
  if (method === 'PUT' && !value.op.requestBody?.content?.['application/octet-stream']) throw Error('Actual PUT binary content missing');
  return { operationId, method, path: value.template, declaredRequestContentTypes: Object.keys(value.op.requestBody?.content ?? {}) };
});
if (operations.length !== 3) throw Error('Binary callback grew beyond attachment47 scope');
const findAll = (node, predicate) => { const result = []; function walk(n) { if (predicate(n)) result.push(n); ts.forEachChild(n, walk); } walk(node); return result; };
const publicWrite = findAll(binary, n => ts.isCallExpression(n) && n.expression.getText(b) === 'fs.writeFileSync' && n.arguments[0].getText(b) === "out + '/' + receiptName");
if (publicWrite.length !== 1) throw Error('Expected one public index writer');
const publicObject = publicWrite[0].arguments[1].left?.arguments?.[0];
if (!publicObject || !ts.isObjectLiteralExpression(publicObject)) throw Error('Public index object inspection failed');
const publicFields = publicObject.properties.map(p => p.name.getText(b));
for (const forbidden of ['headers', 'requestBody', 'responseBody', 'cookies', 'csrfToken', 'password', 'error', 'message', 'stack']) if (publicFields.includes(forbidden)) throw Error('Sensitive/raw public index field');
const products = [originalName, candidateName, 'README.md', 'capture-manifest48.mjs'].map(file => pin(file));
const inputs = [rootFile, specFile, 'tools/rust-r4def/api-runtime31.mjs'].map(file => pin(file, root));
const eRepo = path.resolve(own, '../../../..');
const driverFile = 'tools/rust-r4def/E/attachments47/request-driver47.mjs';
const driver = pin(driverFile, eRepo);
const output = {
  kind: 'Root-api-harness-binary48-controlled-candidate', createdAt: new Date().toISOString(),
  preImportRoot: inputs[0], products, publicReadOnlyInputs: inputs, consumerDriver: driver,
  staticChecks: { nodeSyntax: 'passed node --check', ASTTypeScriptVersion: ts.version, oldNestedFunctionsUnchanged: [...oldFunctions.keys()], oldClosureDeclarationsUnchanged: true, oldReturnKeysPreserved: oldReturn, binarySignature: 'binaryRequest(operationId,id,bodyBytes,actor,meta={})', existingFreshLoginCookieResetPreserved: original.includes('actor.cookies = {};') && candidate.includes('actor.cookies = {};'), originalJSONCsrfTestLogicUnchanged: true, publicFields, parameterAndMethodAuthority: operations },
  newBehavior: { actualStatusReturned: 'response.status, no expected-status synthesis', actualHeaders: 'selected actual non-auth values, no fallback Content-Type', binaryOriginals: 'new namespace private only, wx/0600, body stream originals with partial/failure label', publicIndex: 'metadata/status plus hash/count/private original references; no payload/header/token values', sequence: 'same private state.sequence reserved before network; same actorState/persist', cookieAndCSRF: 'same live jar and omit/wrong policy; no caller token/header injection', bodyBoundary: 'WHATWG Fetch delivered body, no raw transport capture claim' },
  execution: { createApiHarnessInvoked: false, privateStateRead: false, networkCalled: false, HTTPReceiptCreated: false, expectedContentTypeFabricated: false, SQLOrEnvironmentChanged: false, G3Certified: false, G4Certified: false },
  targetImportPath: rootFile, RootImportRequired: 'Assert preImportRoot SHA before replacing with candidate; preserve original artifact, then Root actual binary/cookie/CSRF/ZIP acceptance',
};
if (pin(rootFile, root).rawBytesSha256 !== inputs[0].rawBytesSha256) throw Error('Root source changed during static capture');
fs.writeFileSync(path.join(own, 'manifest48.json'), JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ manifest: pin('manifest48.json'), candidate: products.find(p => p.file === candidateName), rootPreImport: inputs[0], privateRead: false, networkCalled: false }));
