// Generate the complete current shared client without historical acceptance
// source pins. Keep every staging run and preserve hand-maintained Nx metadata.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';
import { resolveJava, resolveJar, normalizeBytes } from '../openapi/shared-api-client.mjs';
import { repairGeneratedModels } from '../openapi/repair-generated-models.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [mode, staging] = process.argv.slice(2);
if (!['--write', '--check'].includes(mode) || !staging || process.argv.length !== 4) throw new Error('Usage: generate-business-client.mjs --write|--check <new staging directory>');
const base = fs.realpathSync(path.join(root, 'apps/poms-api-rust/target/delivery-dependencies'));
const directory = path.resolve(root, staging);
if (!directory.startsWith(base + path.sep) || fs.existsSync(directory)) throw new Error('Use a new staging directory inside delivery-dependencies');
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'tools/openapi/shared-api-client-baseline.json'), 'utf8'));
const java = resolveJava({ executable: 'C:/Program Files/Java/jdk-17/bin/java.exe' });
const jar = resolveJar(root, baseline, { jar: 'tmp/rust-r4def/public-generator/7.20.0.jar' });
const spec = JSON.parse(fs.readFileSync(path.join(root, 'libs/shared/api-spec/openapi.json'), 'utf8'));
fs.mkdirSync(directory);
const output = path.join(directory, 'client');
const generated = spawnSync(java.executable, ['-jar', jar, 'generate', '-c', 'tools/openapi/typescript-angular.config.json', '-o', output, '--type-mappings', 'set=Array,Set=Array', '--skip-validate-spec'], { cwd: root, windowsHide: true, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
fs.writeFileSync(path.join(directory, 'stdout.log'), generated.stdout ?? '');
fs.writeFileSync(path.join(directory, 'stderr.log'), generated.stderr ?? '');
if (generated.error || generated.status !== 0) throw new Error('Client generation failed; inspect retained logs');
repairGeneratedModels(output, spec);
const client = fs.realpathSync(path.join(root, 'libs/shared/api-client'));
if (!client.startsWith(fs.realpathSync(root) + path.sep)) throw new Error('Client output is outside the worktree');
const tracked = new Set(execFileSync('git', ['ls-files', '-z', '--', 'libs/shared/api-client'], { cwd: root, windowsHide: true, encoding: 'utf8' }).split('\0'));
const changed = [];
function copy(relative) {
  const target = path.resolve(client, relative);
  if (!target.startsWith(client + path.sep)) throw new Error('Invalid generated path');
  const source = path.join(output, relative);
  const bytes = normalizeBytes(fs.readFileSync(source)).bytes;
  if (fs.existsSync(target)) {
    if (fs.lstatSync(target).isSymbolicLink()) throw new Error('Preserve client symlink: ' + relative);
    if (fs.readFileSync(target).equals(bytes)) return;
    if (!tracked.has('libs/shared/api-client/' + relative.split(path.sep).join('/'))) throw new Error('Preserve existing untracked client input: ' + relative);
  }
  changed.push(relative);
  if (mode === '--write') { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes); }
}
function walk(relative = '') {
  for (const entry of fs.readdirSync(path.join(output, relative), { withFileTypes: true })) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) walk(child);
    else if (entry.isFile() && (child.endsWith('.ts') || child === path.join('.openapi-generator', 'FILES') || child === path.join('.openapi-generator', 'VERSION'))) copy(child);
  }
}
walk();
console.log(JSON.stringify({ mode, staging, java: java.version, generator: baseline.generator.version, changed }));
if (mode === '--check' && changed.length) process.exitCode = 1;
