import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
const root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', priv = '/home/wangzishi/.local/share/poms-r4ghi/private', dir = priv + '/native-reference92/source12-native01';
const sha = b => createHash('sha256').update(b).digest('hex'), pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
assert.equal(process.platform, 'linux'); assert(!fs.existsSync(priv + '/business/g2-business12/main01/driver.lock'));
const stateFile = priv + '/business/g2-business12/main01/state.json', stateBytes = fs.readFileSync(stateFile), state = JSON.parse(stateBytes);
assert(!state.activeFault && !state.blockedObservation); assert.equal(state.sequence, 6371);
const recovery = pin(priv + '/business/g2-business12/main01/006371-creator28-origin-metadata-recovered.json'); assert.equal(recovery.rawBytesSha256, 'f3e7f192aecfd5a1403ae7756735960f23cccd5597649d50d2e2e7b1cf1e2f14');
const proof = JSON.parse(fs.readFileSync(recovery.file)), observed = JSON.parse(fs.readFileSync(proof.currentSnapshot.file));
assert.equal(pin(proof.currentSnapshot.file).rawBytesSha256, proof.currentSnapshot.rawBytesSha256);
const require = createRequire(root + '/package.json'), ts = require('typescript');
const fixture = 'apps/poms-api/src/app/core/platform/dev-platform.fixtures.ts', fixtureBytes = fs.readFileSync(root + '/' + fixture);
const ast = ts.createSourceFile(fixture, fixtureBytes.toString(), ts.ScriptTarget.Latest, true), declarations = [];
function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'DEV_USERS') declarations.push(node); ts.forEachChild(node, visit); } visit(ast);
assert.equal(declarations.length, 1); const array = declarations[0].initializer; assert(ts.isArrayLiteralExpression(array));
const first = array.elements[0]; assert(ts.isObjectLiteralExpression(first));
const fields = Object.fromEntries(first.properties.filter(ts.isPropertyAssignment).map(p => [p.name.getText(ast).replace(/^['"]|['"]$/g, ''), p.initializer]));
for (const key of ['id', 'username', 'password']) assert(ts.isStringLiteral(fields[key]));
const credentials = { username: fields.username.text, password: fields.password.text };
const table = observed.databases.poms_r4ghi_native.tables.platform_user, rows = fs.readFileSync(table.file, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
assert.equal(pin(table.file).rawBytesSha256, table.rawBytesSha256);
const matches = rows.filter(r => JSON.parse(r.raw).username === credentials.username); assert.equal(matches.length, 1);
const user = JSON.parse(matches[0].raw); assert(user.is_active); assert.equal(user.id, fields.id.text);
const plan = JSON.parse(fs.readFileSync(root + '/tools/rust-r4ghi/I/implementation/native-modern-reference92/plan-template92.json'));
plan.phaseRun = 'source12-native01'; plan.processNonce = randomBytes(32).toString('hex');
const frozenFile = dir + '/rust-state-before-native.json'; fs.writeFileSync(frozenFile, stateBytes, { flag: 'wx', mode: 0o600 });
const boundary = { kind: 'Root-explicit-closed-driver-boundary-before-Native-only-reference', sourceStage: 'Source12/API135/M97', lastCompletedPhase: recovery,
  currentRustState: { file: frozenFile, rawBytesSha256: sha(stateBytes) }, activeDriver: false, activeFault: false, blockedObservation: false,
  UI04StillFailed: true, remainingRustAcceptanceWillResumeAfterNativeConservation: true, allRustAcceptanceComplete: false, noConcurrentRustHTTP: true, productChange: false };
const boundaryFile = dir + '/rust-boundary-closed.json'; fs.writeFileSync(boundaryFile, JSON.stringify(boundary, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
plan.rustBoundary.frozenState = pin(frozenFile); plan.rustBoundary.finishedReceipt = pin(boundaryFile);
plan.env = pin(dir + '/native.env'); assert.equal(plan.env.rawBytesSha256, '445bb80545fbe2a24ea0d5e7b94bbebbdf827558283f5611c3037b8a69ad0d90');
const credentialFile = dir + '/http-credentials.json'; fs.writeFileSync(credentialFile, JSON.stringify(credentials) + '\n', { flag: 'wx', mode: 0o600 });
plan.credentials = pin(credentialFile); plan.expectedNativeUserId = user.id; plan.nativeCredentialSource = pin(root + '/' + fixture);
plan.node = pin('/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node');
const helperNames = fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(f => /\.(mjs|json)$/.test(f));
const sourceFiles = [...state.sourcePins.map(p => p.file), ...helperNames.map(f => 'tools/rust-r4ghi/business/' + f), fixture,
  'apps/poms-api/src/seeders/database.seeder.ts', 'tools/rust-r4ghi/I/implementation/native-modern-reference92/inventory92.json',
  'tools/rust-r4ghi/prepare-native-plan113.mjs', 'tools/rust-r4ghi/start-native114.mjs', 'tools/rust-r4ghi/stop-native115.mjs'];
plan.sourcePins = [...new Set(sourceFiles)].sort().map(file => ({ file, rawBytesSha256: pin(root + '/' + file).rawBytesSha256 }));
const planFile = dir + '/plan.json'; fs.writeFileSync(planFile, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ plan: pin(planFile), nativeUserId: user.id, credentialFieldSource: 'DEV_USERS[0].username/password; same id/username active S0 row', credentialValuesPrinted: false,
  borrowedUserSHA256: matches[0].sha256, borrowedUserXmin: matches[0].xmin, sourcePins: plan.sourcePins.length, helperFiles: helperNames.length, SQL: false, HTTP: false, processStarted: false }));
