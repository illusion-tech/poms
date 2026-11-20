// Promote only independently reviewed external files. No current helper/state I/O.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), sha = v => createHash('sha256').update(v).digest('hex');
const pin = (relative, expected) => { const file = R + '/' + relative, raw = fs.readFileSync(file); if (expected) assert.equal(sha(raw), expected); return { file: relative, rawBytesSha256: sha(raw) }; };
const review = pin('tools/rust-r4ghi/independent/review05/period206-review123/review123.json', 'ce16d473c03fc9b1e075ccd513e2a6df5a017060950137e28c87037eefa559b2');
const input = pin('tools/rust-r4ghi/I/implementation/period-driver206-02/manifest206-02.json', '362f18133f57e82ccc057f946231a16459c32c1d335f25aa9a677be251f1e338');
const original = JSON.parse(fs.readFileSync(R + '/tools/rust-r4ghi/I/implementation/period-driver206/manifest206.json'));
const copies = [];
for (const target of original.proposedPromotion) {
  pin(target.source.file, target.source.rawBytesSha256); assert(target.target.startsWith('tools/rust-r4ghi/period-driver206/') && !target.target.includes('..'));
  const file = R + '/' + target.target; assert(!fs.existsSync(file)); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, fs.readFileSync(R + '/' + target.source.file), { flag: 'wx' });
  copies.push(pin(target.target, target.source.rawBytesSha256));
}
const result = { kind: 'actual-external-period206-reviewed-file-promotion224', originalManifest: pin('tools/rust-r4ghi/I/implementation/period-driver206/manifest206.json', '8f0a963745a1e954f731b05c4bf0079312067dc3865adc55e283f77769d1e18d'), finalMetadata: input, independentReview: review,
  copies, runtimeCodeUnchangedFromOriginal206: true, actualRuntimeInputsBound: false, actualPeriodPrepared: false, SQLOrHTTPExecuted: false, source416OrHelper198Changed: false, G3Certified: false, G4Certified: false };
const out = R + '/docs/design/rust-r4ghi/period206-promotion224.json'; fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ promotion: pin('docs/design/rust-r4ghi/period206-promotion224.json'), promotedFiles: copies.length, actualEffectsExecuted: false }));
