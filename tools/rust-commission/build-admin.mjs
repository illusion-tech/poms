// Build the actual Angular application with the installed CLI, without Nx or a
// package-manager subprocess. Every run keeps its own output and compiler logs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = fs.realpathSync(path.join(root, 'apps/poms-api-rust/target/delivery-dependencies'));
const destination = path.resolve(root, process.argv[2] ?? '');
if (process.argv.length !== 3 || !destination.startsWith(base + path.sep) || fs.existsSync(destination)) throw new Error('Use a new output directory inside delivery-dependencies');
const project = JSON.parse(fs.readFileSync(path.join(root, 'apps/poms-admin/project.json'), 'utf8'));
const options = { ...project.targets.build.options, ...project.targets.build.configurations.production };
options.outputPath = path.relative(root, path.join(destination, 'dist')).split(path.sep).join('/');
options.deleteOutputPath = false;
fs.mkdirSync(destination);
const workspace = JSON.stringify({ version: 1, cli: { analytics: false, packageManager: 'npm', cache: { enabled: false } }, projects: { 'poms-admin': { projectType: 'application', root: 'apps/poms-admin', sourceRoot: project.sourceRoot, architect: { build: { builder: project.targets.build.executor, options } } } } }, null, 2);
fs.writeFileSync(path.join(destination, 'angular.json'), workspace);
const workspaceFile = path.join(root, 'angular.json');
// The CLI requires asset inputs inside its real workspace. Never replace an
// existing configuration; retain this invocation's temporary file with its logs.
fs.writeFileSync(workspaceFile, workspace, { flag: 'wx' });
let result;
try {
  result = spawnSync(process.execPath, [path.join(root, 'node_modules/@angular/cli/bin/ng.js'), 'build', 'poms-admin'], { cwd: root, env: { ...process.env, NG_CLI_ANALYTICS: 'false', NG_BUILD_MAX_WORKERS: '2' }, windowsHide: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} finally {
  if (fs.readFileSync(workspaceFile, 'utf8') !== workspace) throw new Error('Angular workspace configuration changed during build; preserved for review');
  fs.renameSync(workspaceFile, path.join(destination, 'used-angular.json'));
}
fs.writeFileSync(path.join(destination, 'stdout.log'), result.stdout ?? '');
fs.writeFileSync(path.join(destination, 'stderr.log'), result.stderr ?? '');
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
