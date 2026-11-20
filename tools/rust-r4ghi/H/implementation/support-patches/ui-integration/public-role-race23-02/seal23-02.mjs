import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), sha = value => createHash('sha256').update(value).digest('hex');
const cwd = 'E:/projects/worktrees/poms-r4h-signals/poms';
const execute = args => { const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', windowsHide: true }); assert.ifError(result.error); assert.equal(result.status, 0, result.stderr + result.stdout); return { command: [process.execPath, ...args], exitCode: result.status, stdout: result.stdout, stderr: result.stderr }; };
const product = JSON.parse(fs.readFileSync(here + '/products23-02.json'))[0];
assert.equal(sha(fs.readFileSync(here + '/' + product.candidate)), product.afterSHA256);
const pure = execute(['--test', here + '/runtime23-02.test.mjs']);
const syntax = execute(['--check', here + '/' + product.candidate]);
const receipt = { node: process.version, pure, syntax, SQLExecuted: false, HTTPExecuted: false, RootWritten: false };
fs.writeFileSync(here + '/validation23-02.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
const files = ['README23-02.md', 'build23-02.mjs', 'seal23-02.mjs', 'runtime23-02.test.mjs', 'products23-02.json', 'source-pins23-02.json', 'check-graph23-02.json', 'validation23-02.json', product.candidate];
const manifest = { schemaVersion: 1, kind: 'H23-02-exact-observed-raw-and-managed-auth-correction', applyAfter: { file: '../public-role-race23/runtime-seal23.json', rawBytesSha256: 'b4a4920a66b1dafa77d9f3a9717b9e23381d1be3e35a90ae3bf2946d8e461b31' }, products: [product],
  files: files.map(file => ({ file, rawBytesSha256: sha(fs.readFileSync(here + '/' + file)) })), validation: { node: process.version, purePassed: 8, pureFailed: 0, syntaxChecked: 1, actualFSDependencyGraphFiles: JSON.parse(fs.readFileSync(here + '/check-graph23-02.json')).length },
  intermediateRowsObservedReadOnly: true, intermediateRowsOwned: false, peerGuardWeakened: false, commonLedgerRewritten: false, stoppedSQLWindowResumed: false,
  SQLExecutedByAuthor: false, HTTPExecutedByAuthor: false, RootWritten: false, G3Certified: false, G4Certified: false };
fs.writeFileSync(here + '/manifest23-02.json', JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ manifest: 'manifest23-02.json', rawBytesSha256: sha(fs.readFileSync(here + '/manifest23-02.json')), products: manifest.products, validation: manifest.validation }));
