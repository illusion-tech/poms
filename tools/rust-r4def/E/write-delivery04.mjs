import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pin = file => { const bytes = fs.readFileSync(path.join(root, file)); return { file, bytes: bytes.length, rawBytesSha256: createHash('sha256').update(bytes).digest('hex') }; };
const check = (ok, message) => { if (!ok) throw Error(message); };
const out = 'tools/rust-r4def/E/delivery04.json';
check(!fs.existsSync(path.join(root, out)), 'delivery04 already exists; preserve it and choose a new candidate');
const previousFile = 'tools/rust-r4def/E/delivery01.json';
const previous = JSON.parse(read(previousFile));
const archiveFile = 'tools/rust-r4def/E/source-originals04/manifest.json';
const archive = JSON.parse(read(archiveFile));
for (const old of archive.sourcePins) {
  check(pin(old.archive).rawBytesSha256 === old.rawBytesSha256, 'Archived source bytes changed');
  check(previous.productFiles.some(p => p.file === old.source && p.rawBytesSha256 === old.rawBytesSha256), 'Archive is not delivery01 producer');
}
const receiptFile = 'tools/rust-r4def/E/evidence/author-checks04/receipt.json';
const receipt = JSON.parse(read(receiptFile));
check(receipt.sourcesUnchangedDuringChecks && receipt.checks.every(c => c.status === 'passed'), 'Final checks04 not passed/stable');
const products = receipt.after.map(p => pin(p.file));
check(products.every(p => receipt.after.some(old => old.file === p.file && old.rawBytesSha256 === p.rawBytesSha256)), 'Source changed after checks04');
const delta = products.filter(p => !previous.productFiles.some(old => old.file === p.file && old.rawBytesSha256 === p.rawBytesSha256));
check(delta.length === 1 && delta[0].file.endsWith('/mod.rs'), 'Correction04 exceeded sole production mod.rs delta');
const test = receipt.checks.find(c => c.id === 'pure-tests');
const result = read(test.stdout).match(/test result: ok\. (\d+) passed; (\d+) failed; (\d+) ignored/);
check(result && Number(result[1]) >= 28 && result[2] === '0', 'No completed production-crate test evidence');
const base = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
check(base === previous.base, 'Unexpected metadata baseline');
const delivery = {
  kind: 'R4E-author-production-delivery04', createdAt: new Date().toISOString(), base,
  childIssue: 108, parentBatch: 106, status: 'Necessary C/E/F source-progress correction ready for Root delta import; runtime/G3/G4 not certified',
  previousDelivery: pin(previousFile), previousProducerArchive: { ...pin(archiveFile), originals: archive.sourcePins.map(p => pin(p.archive)) },
  productFiles: products, productionDelta: delta,
  supportFiles: ['tools/rust-r4def/E/HANDOFF04.md', 'tools/rust-r4def/E/write-delivery04.mjs'].map(pin),
  finalReceipt: pin(receiptFile), rawLogs: receipt.checks.flatMap(c => [pin(c.stdout), pin(c.stderr)]), rootOwnedCompileInputs: receipt.rootOwnedCompileInputs,
  counts: { operations: 11, createVariants: 5, pureTestsPassed: Number(result[1]), pureTestsFailed: Number(result[2]), pureTestsIgnored: Number(result[3]) },
  changes: ['Use formal payable completed terminal, no paid alias', 'Capture exact confirmed_payment_amount_excluding_tax_total on same borrowed connection under Project/Payable locks, same net SUM predicate as C', 'Named payment-progress proof requires strictly increasing certified net total and version plus consistent states, unchanged core economic facts', 'Missing historical aggregate capture fails; immutable basis is not reconstructed'],
  privatePayloadField: { key: 'confirmed_payment_amount_excluding_tax_total', type: 'two-place decimal string', location: 'sourcePayload and immutable source_basis.sourcePayload', source: "SUM(payment_record.amount_excluding_tax) WHERE payable_record_id=$1 AND status='confirmed'", publicDtoChanged: false },
  unchangedProtocols: ['Borrowed CommonSession; one outer transaction/audit/securityevent/flush owner', 'Strict client cost/source CAS', 'E original source_basis immutable', 'Source transition enum names unchanged; F latest certified anchor protocol unchanged', 'All newly registered/confirmed costs not included', 'Existing operating/labor projection with literal-null raw compatibility keys', 'Controlled covered-period historical rate supersession'],
  rootIntegrationRequired: ['C increments/CAS payable rowVersion and updatedAt on EVERY genuine payment confirmation, including partial→partial, duplicates no increment', 'F real payable evidence eligibility uses completed and consumes enriched private source payload/proof', 'Root imports controlled delta with new product pins and reruns real C/E/F source chain and independent review'],
  validation: { rustfmt: 'passed WSL1.99.1', clippy: 'passed actual production crate --lib -- -D warnings', pureTests: 'passed real crate project_actual_cost filter', sourceStableBeforeAfter: true, database: 'not run by author', http: 'not run by author', browser: 'not run by author', concurrency: 'Root-owned, not run by author', independentG3: 'not performed by author', G4: 'not performed by author' },
  previousEvidencePreserved: ['delivery01.json', 'evidence/author-checks01/**', 'evidence/author-checks02/**', 'evidence/author-checks03/**', 'HANDOFF.md', 'frozen G1 documents'],
  commitPerformed: false, pushPerformed: false, GitHubChangedByAuthor: false,
};
fs.writeFileSync(path.join(root, out), JSON.stringify(delivery, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ file: pin(out), products, counts: delivery.counts, productionDeltaCount: delta.length, runtime: 'not run by author' }));
