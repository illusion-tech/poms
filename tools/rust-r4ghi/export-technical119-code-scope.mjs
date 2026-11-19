// Read-only Git/manifest inventory for delivery-scope review; never stages files.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', I = 'E:/projects/worktrees/poms-r4i-lifecycle/poms', H = 'E:/projects/worktrees/poms-r4h-signals/poms';
const P = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
const O = R + '/tmp/rust-r4ghi/root/technical119-code-scope01'; assert(!fs.existsSync(O));
const sha = b => createHash('sha256').update(b).digest('hex');
function load(file, expected) { const b = fs.readFileSync(file); if (expected) assert.equal(sha(b), expected); return { pin: { file, bytes: b.length, rawBytesSha256: sha(b) }, value: JSON.parse(b) }; }
function git(args) { const r = spawnSync('git', args, { cwd: R, windowsHide: true, encoding: 'utf8', maxBuffer: 24 * 1024 * 1024 }); assert.equal(r.status, 0); return r.stdout; }
const core = load(I + '/tools/rust-r4ghi/I/implementation/source15-admission119-code02/sealed-code02/manifest119-code02.json', '37ac7622343defd6a4f2139de0170593e79ecb23ce31b1c331e467c2b0a74994');
const h9 = load(H + '/tools/rust-r4ghi/H/implementation/support-patches/source15-policy-tax-readers-code02/manifest-H15-readers-code02.json', '6e67323c6b25ef8666ca8a860c43c4f265e679c322e6dbf180c2ae7a90f98883');
const inventory = load(P + '/source15-build119-inventory34402-01/inventory-copy.json', '3ac1a8a7ccc0b50c5bb470034e0a313ecd7413c304e910fc5762ee4c99b841f0');
const linux = file => '//wsl.localhost/Debian' + file;
const compiles = load(linux(inventory.value.compilePins.file), inventory.value.compilePins.rawBytesSha256);
const helpers = load(P + '/source15-components119-H9-prepared01/promotion01/actual-helper-pins227.json', '1d88950c22a5f9a7d91ded85ab62d4eae5c58548eb83b36fa39ab5d94285dea1');
const report = { kind: 'Root-readonly-technical119-delivery-source-inventory', head: git(['rev-parse', 'HEAD']).trim(),
  trackedFiles: git(['ls-files', '-z']).split('\0').filter(Boolean),
  porcelainV1Z: git(['status', '--porcelain=v1', '-z', '--untracked-files=all']),
  manifests: { core: core.pin, H9: h9.pin, compiledInventory: compiles.pin, helpers: helpers.pin },
  coreProduction: core.value.production, H9ManifestKeys: Object.keys(h9.value), H9Production: h9.value.production ?? h9.value.products,
  currentCompile528: compiles.value, currentHelper227: helpers.value,
  noGitMutation: true, noSourceMutation: true, noG3G4Conclusion: true };
fs.mkdirSync(O); const file = O + '/inventory.json'; fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ inventory: { file, bytes: fs.statSync(file).size, rawBytesSha256: sha(fs.readFileSync(file)) }, noGitMutation: true }));
