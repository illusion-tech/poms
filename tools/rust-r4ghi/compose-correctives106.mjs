import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', i = 'E:/projects/worktrees/poms-r4i-lifecycle/poms';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const definitions = [
  [i + '/tools/rust-r4ghi/I/implementation/support-patches/frozen-participant-parent-lock65-02', 'manifest65-02.json', 'bd9e27b844871a640be652022e32df21502f250e2c50c9e6053518f731a14d55', 'files'],
  [i + '/tools/rust-r4ghi/I/implementation/period-baseline-cutoff90', 'manifest90.json', '6055020da3057f89ef870cb12a53b6bf9ee374bad84aadb2295b9efffe44e923', 'products'],
  [root + '/tools/rust-r4ghi/independent/review05/shared-source-followup58/tax-dependency-proposal83', 'manifest83.json', 'd98dd8bd43e72f2f77edf313dd2fe777442139acd9fd3c6d044ade52d7aecf26', 'files'],
  [root + '/tools/rust-r4ghi/independent/review05/shared-source-followup58/foreign-fiscal-source-proposal84-02', 'manifest84-02.json', 'b125b6b67dbdb6789fca574b819adf25ce869b92ab29c91a21b3ae35cf83b819', 'files'],
];
const packages = definitions.map(([directory, leaf, expected, field]) => {
  const bytes = fs.readFileSync(directory + '/' + leaf); assert.equal(sha(bytes), expected); const manifest = JSON.parse(bytes);
  return { directory, leaf, rawBytesSha256: expected, manifest, entries: manifest[field] };
});
const products = new Map();
for (const item of packages) for (const entry of item.entries) {
  const before = Object.hasOwn(entry, 'beforeSHA256') ? entry.beforeSHA256 : Object.hasOwn(entry, 'rootBeforeSHA256') ? entry.rootBeforeSHA256 : entry.rootBaseBeforeSHA256;
  if (before === null) assert(!fs.existsSync(root + '/' + entry.file)); else assert.equal(sha(fs.readFileSync(root + '/' + entry.file)), before);
  const candidate = fs.readFileSync(item.directory + '/' + entry.candidate); assert.equal(sha(candidate), entry.afterSHA256);
  const old = products.get(entry.file); if (old) assert.equal(entry.file, 'apps/poms-api-rust/src/project_operating/context.rs', 'Only the explicitly reviewed context composition may overlap');
  products.set(entry.file, { file: entry.file, beforeSHA256: before, candidate, inputs: [...(old?.inputs ?? []), { directory: item.directory, manifest: item.leaf, manifestSHA256: item.rawBytesSha256, candidate: entry.candidate, candidateSHA256: entry.afterSHA256 }] });
}
const contextFile = 'apps/poms-api-rust/src/project_operating/context.rs', base = fs.readFileSync(root + '/' + contextFile, 'utf8');
const period = fs.readFileSync(packages[1].directory + '/proposed/' + contextFile, 'utf8');
let first = 0; while (base[first] === period[first] && first < base.length) first++;
let tail = 0; while (base[base.length - 1 - tail] === period[period.length - 1 - tail] && tail < base.length - first) tail++;
assert.equal(base.slice(first, base.length - tail), '', 'The reviewed period change is one insertion');
const insertion = period.slice(first, period.length - tail); assert(insertion.includes('period_baseline::assert_adoption'));
const beforeAnchor = base.slice(first - 200, first), afterAnchor = base.slice(first, first + 200), anchor = beforeAnchor + afterAnchor;
const compose = text => { assert.equal(text.split(anchor).length, 2); return text.replace(anchor, beforeAnchor + insertion + afterAnchor); };
const old84 = fs.readFileSync(root + '/tools/rust-r4ghi/independent/review05/shared-source-followup58/foreign-fiscal-source-proposal84/candidate/' + contextFile, 'utf8');
assert.equal(sha(Buffer.from(compose(old84))), '58f51cc9a71bee01f03d24ab57004881b8f2d276f2d2898d8c0659b9ab98fe18', 'Match the independent H composition of original84 plus90');
products.get(contextFile).candidate = Buffer.from(compose(products.get(contextFile).candidate.toString('utf8')));
const relative = 'tools/rust-r4ghi/corrective-composed106', output = root + '/' + relative; assert(!fs.existsSync(output)); fs.mkdirSync(output, { recursive: true });
const files = [];
for (const product of products.values()) {
  const candidate = 'proposed/' + product.file; fs.mkdirSync(path.dirname(output + '/' + candidate), { recursive: true }); fs.writeFileSync(output + '/' + candidate, product.candidate, { flag: 'wx' });
  files.push({ file: product.file, beforeSHA256: product.beforeSHA256, afterSHA256: sha(product.candidate), candidate, inputs: product.inputs });
}
const manifest = { kind: 'Root-explicit-unapplied-four-corrective-source13-composition106', inputs: packages.map(item => ({ directory: item.directory, manifest: item.leaf, rawBytesSha256: item.rawBytesSha256 })), files,
  contextCombination: 'Exact90 insertion into final84-02; original84+90 independently matches H58f51cc9',
  historicalBaselineSelection: 'user answer pending; safe90 guard only, no implicit historical selection added',
  RootProductWritten: false, RootBusinessHelperGraphChanged: false, SQLExecuted: false, fullCompileExecuted: false, G3Certified: false, G4Certified: false };
fs.writeFileSync(output + '/manifest106.json', JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ manifest: relative + '/manifest106.json', rawBytesSha256: sha(fs.readFileSync(output + '/manifest106.json')), proposedFiles: files.length,
  combinedContextSHA256: files.find(file => file.file === contextFile).afterSHA256, RootProductWritten: false, SQLExecuted: false, G3Certified: false }));
