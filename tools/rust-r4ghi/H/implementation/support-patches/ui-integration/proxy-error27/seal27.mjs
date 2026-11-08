import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { spawnSync } from 'node:child_process'; import { createHash } from 'node:crypto'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', cwd = 'E:/projects/worktrees/poms-r4h-signals/poms', sha = value => createHash('sha256').update(value).digest('hex');
const products = JSON.parse(fs.readFileSync(here + '/products27.json'));
for (const product of products) {
  if (product.beforeSHA256) assert.equal(sha(fs.readFileSync(root + '/' + product.file)), product.beforeSHA256); else assert(!fs.existsSync(root + '/' + product.file));
  product.afterSHA256 = sha(fs.readFileSync(here + '/' + product.candidate));
}
fs.writeFileSync(here + '/products27-final.json', JSON.stringify(products, null, 2) + '\n', { flag: 'wx' });
const execute = args => { const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', windowsHide: true }); assert.ifError(r.error); assert.equal(r.status, 0, r.stdout + r.stderr); return { command: [process.execPath, ...args], status: r.status, stdout: r.stdout, stderr: r.stderr }; };
const pure = execute(['--test', here + '/cookie-scope27.test.mjs']), syntax = products.map(p => execute(['--check', here + '/' + p.candidate]));
fs.writeFileSync(here + '/validation27.json', JSON.stringify({ node: process.version, pure, syntax, businessPGAccess: false, HTTPExecuted: false, BrowserLaunched: false, RootWritten: false }, null, 2) + '\n', { flag: 'wx' });
const files = ['README27.md', 'build27.mjs', 'seal27.mjs', 'products27.json', 'products27-final.json', 'inspect27.mjs', 'diagnostic27.json', 'cookie-metadata27.mjs', 'cookie-metadata27.json', 'cookie-source27-actual03-metadata-only.json', 'actual-scope-proof27-readonly.json', 'cookie-scope27.test.mjs', 'validation27.json', ...products.map(p => p.candidate)];
const manifest = { kind: 'H-UI03-exact-cookie-path-diagnosis-and-real-scope-seeding27', products, files: files.map(file => ({ file, rawBytesSha256: sha(fs.readFileSync(here + '/' + file)) })),
  actualDiagnosis: { totalGET: 54, actualAuthAndCSRFUpstream200: 24, preForwardDuplicateCookieRejections: 30, ownFreshProfilesReadOnlyCookieMetadata: 6, realLoginHeaderScopesVerified: 4, businessPOSTPUTObserved: 0, duplicateCookie: 'poms_csrf Path=/ plus /api' },
  validation: { node: process.version, purePassed: 8, pureFailed: 0, syntaxChecked: 7 }, backendSemanticsChanged: false, duplicateGuardWeakened: false, LinuxOrBrowserBusinessCasesChanged: false,
  actualCookieScopeMetadataMandatoryInNewPlan: true, old03Or20Rewritten: false, CookieValuesSelectedFromSQLiteOrEmitted: false, CookieSQLiteReadOnly: true, businessPGAccessByAuthor: false,
  HTTPExecutedByAuthor: false, BrowserLaunchedByAuthor: false, RootWritten: false, actualDOMSuccessCertified: false, G3Certified: false, G4Certified: false };
fs.writeFileSync(here + '/manifest27.json', JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ manifestSHA256: sha(fs.readFileSync(here + '/manifest27.json')), products, validation: manifest.validation }));
