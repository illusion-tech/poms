// Root-only byte integration. Never alters an author's owned sources.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const groups = [
  { owner: 'G', repo: 'E:/projects/worktrees/poms-r4g-operating/poms', dirs: ['apps/poms-api-rust/src/project_operating', 'tools/rust-r4ghi/G/implementation'], files: ['apps/poms-admin/src/app/features/project/project-operating-authoring.ts', 'apps/poms-admin/src/app/features/project/project-operating-authoring.spec.ts'] },
  { owner: 'H', repo: 'E:/projects/worktrees/poms-r4h-signals/poms', dirs: ['apps/poms-api-rust/src/project_operating_signals', 'tools/rust-r4ghi/H/implementation'], files: ['apps/poms-admin/src/app/features/project/project-operating-review.ts', 'apps/poms-admin/src/app/features/project/project-operating-review.spec.ts'] },
  { owner: 'I', repo: 'E:/projects/worktrees/poms-r4i-lifecycle/poms', dirs: ['apps/poms-api-rust/src/commission_assignment', 'apps/poms-api-rust/src/project_lifecycle', 'apps/poms-api-rust/src/lifecycle_evidence', 'tools/rust-r4ghi/I/implementation'], files: ['apps/poms-admin/src/app/features/project/project-lifecycle-authoring.ts', 'apps/poms-admin/src/app/features/project/project-lifecycle-authoring.spec.ts', 'apps/poms-admin/src/app/features/commission/project-role-assignment-authoring.ts', 'apps/poms-admin/src/app/features/commission/project-role-assignment-authoring.spec.ts'] },
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const args = process.argv.slice(2);
assert(args.every(arg => arg === '--support-only' || /^--owner=[GHI]$/.test(arg)));
const selectedOwner = args.find(arg => arg.startsWith('--owner='))?.slice(-1);
const supportOnly = args.includes('--support-only');
const cache = root + '/tmp/rust-r4ghi/root/author-integration';
fs.mkdirSync(cache, { recursive: true });
const progress = cache + '/current-file-map.json';
const prior = fs.existsSync(progress) ? JSON.parse(fs.readFileSync(progress, 'utf8')) : {};
const inputs = [];
function walk(repo, directory) {
  const files = [];
  for (const item of fs.readdirSync(repo + '/' + directory, { withFileTypes: true })) {
    const file = directory + '/' + item.name;
    if (['node_modules', '__pycache__', 'dist', '.angular', 'target', 'jest-cache'].includes(item.name)) continue;
    if (item.isDirectory()) files.push(...walk(repo, file));
    else if (item.isFile() && !file.endsWith('.pyc')) files.push(file);
  }
  return files;
}
for (const group of groups) {
  if (selectedOwner && group.owner !== selectedOwner) continue;
  const files = [...group.dirs.filter(dir => !supportOnly || dir.startsWith('tools/')).flatMap(dir => walk(group.repo, dir)), ...(supportOnly ? [] : group.files.filter(file => fs.existsSync(group.repo + '/' + file)))];
  for (const file of [...new Set(files)]) {
    assert(!file.split('/').includes('..'));
    const bytes = fs.readFileSync(group.repo + '/' + file), hash = sha(bytes), destination = path.resolve(root, file);
    assert(destination.toLowerCase().startsWith(path.resolve(root).toLowerCase() + path.sep));
    if (fs.existsSync(destination)) {
      const current = sha(fs.readFileSync(destination));
      assert(current === hash || current === prior[file]?.sha256, 'Root has a divergent integration edit: ' + file);
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes);
    prior[file] = { owner: group.owner, sourceRoot: group.repo, sha256: hash };
    inputs.push({ file, ...prior[file] });
    fs.writeFileSync(progress, JSON.stringify(prior, null, 2) + '\n');
  }
}
const stable = inputs.every(item => sha(fs.readFileSync(item.sourceRoot + '/' + item.file)) === item.sha256 && sha(fs.readFileSync(root + '/' + item.file)) === item.sha256);
const receipt = { kind: 'actual-author-product-byte-integration', capturedAt: new Date().toISOString(), sourceStable: stable, inputs, productAcceptancePassed: false };
const out = cache + '/' + Date.now() + '.json';
fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ files: inputs.length, sourceStable: stable, productAcceptancePassed: false, receipt: out }));
assert(stable, 'Author sources changed during copy; resynchronize before compilation');
